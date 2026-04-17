"""
LLM service: wraps Gemini (Google) and Groq via LangChain.
Handles AI insight generation: summary, genre classification, sentiment.
Caches responses in memory to avoid repeated API calls.
"""

import json
import logging
import hashlib
from typing import Dict, Optional, List
from functools import lru_cache

from langchain_core.messages import HumanMessage, SystemMessage
from app.config import settings

logger = logging.getLogger(__name__)

# Simple in-memory cache: {hash: result}
_ai_cache: Dict[str, Dict] = {}


def _cache_key(text: str, task: str) -> str:
    """Generate a deterministic cache key."""
    return hashlib.md5(f"{task}:{text[:200]}".encode()).hexdigest()


def _get_llm():
    """
    Build and return the LangChain LLM client.
    Prefers Gemini if key is set, falls back to Groq.
    """
    provider = settings.LLM_PROVIDER.lower()

    if provider == "gemini" and settings.GEMINI_API_KEY:
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(
            model="gemini-1.5-flash",
            google_api_key=settings.GEMINI_API_KEY,
            temperature=0.3,
        ), "gemini-1.5-flash"

    elif settings.GROQ_API_KEY:
        from langchain_groq import ChatGroq
        return ChatGroq(
            model="llama-3.1-8b-instant",
            groq_api_key=settings.GROQ_API_KEY,
            temperature=0.3,
        ), "llama3-8b-8192 (Groq)"

    # Fallback: try Gemini anyway
    if settings.GEMINI_API_KEY:
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(
            model="gemini-1.5-flash",
            google_api_key=settings.GEMINI_API_KEY,
            temperature=0.3,
        ), "gemini-1.5-flash"

    raise ValueError(
        "No LLM API key configured. Set GEMINI_API_KEY or GROQ_API_KEY in .env"
    )


def _invoke_llm(system: str, user: str) -> str:
    """Helper: call LLM and return text response."""
    llm, _ = _get_llm()
    messages = [SystemMessage(content=system), HumanMessage(content=user)]
    response = llm.invoke(messages)
    return response.content.strip()


def generate_book_insights(book: Dict) -> Dict:
    """
    Generate AI insights for a single book.
    Returns dict with summary, genre_classification, sentiment, sentiment_score, key_themes.
    Uses cache to avoid repeated calls.
    """
    text_input = f"""
Title: {book.get('title', 'Unknown')}
Author: {book.get('author', 'Unknown')}
Genre: {book.get('genre', 'Unknown')}
Description: {book.get('description', 'No description available.')}
Rating: {book.get('rating', 'N/A')} / 5
""".strip()

    cache_key = _cache_key(text_input, "insights")
    if cache_key in _ai_cache:
        logger.info(f"Cache hit for insights: {book.get('title')}")
        return _ai_cache[cache_key]

    system_prompt = """You are a literary analyst AI. Analyze the given book information and respond ONLY with a valid JSON object (no markdown, no extra text) with these exact keys:
- "summary": A 2-3 sentence summary of what the book is likely about based on title, genre, and description.
- "genre_classification": The most specific genre label (e.g., "Literary Fiction", "Dark Fantasy", "Historical Romance").
- "sentiment": One of "Positive", "Neutral", "Mixed", or "Dark/Negative" based on tone.
- "sentiment_score": Float from -1.0 (very negative) to 1.0 (very positive).
- "key_themes": Array of 3-5 key themes or topics as strings."""

    try:
        raw = _invoke_llm(system_prompt, text_input)
        # Strip markdown code fences if present
        raw = raw.replace("```json", "").replace("```", "").strip()
        insights = json.loads(raw)

        # Normalize
        result = {
            "summary": insights.get("summary", ""),
            "genre_classification": insights.get("genre_classification", book.get("genre", "")),
            "sentiment": insights.get("sentiment", "Neutral"),
            "sentiment_score": float(insights.get("sentiment_score", 0.0)),
            "key_themes": insights.get("key_themes", []),
        }

        _ai_cache[cache_key] = result
        return result

    except json.JSONDecodeError as e:
        logger.error(f"JSON parse error for insights: {e}. Raw: {raw[:200]}")
        return _fallback_insights(book)
    except Exception as e:
        logger.error(f"LLM insight generation failed: {e}")
        return _fallback_insights(book)


def _fallback_insights(book: Dict) -> Dict:
    """Return minimal insights without LLM on failure."""
    return {
        "summary": f"{book.get('title')} by {book.get('author')}.",
        "genre_classification": book.get("genre", "General Fiction"),
        "sentiment": "Neutral",
        "sentiment_score": 0.0,
        "key_themes": [],
    }


def answer_question_with_context(
    question: str,
    context_chunks: List[Dict],  # Each: {title, author, text, book_id}
) -> str:
    """
    Generate a contextual answer using retrieved book chunks (RAG).
    Returns the answer string.
    """
    cache_key = _cache_key(f"{question}:{str(context_chunks)[:100]}", "qa")
    if cache_key in _ai_cache:
        return _ai_cache[cache_key]

    # Build context string
    context_str = ""
    for i, chunk in enumerate(context_chunks[:5], 1):
        context_str += f"""
[Source {i}] "{chunk['title']}" by {chunk['author']}
---
{chunk['text']}
"""

    system_prompt = """You are a friendly and knowledgeable book assistant.

Answer the user's question naturally, as if you're having a conversation with a reader.
Use the provided information quietly to guide your answer, but never mention "context", "sources", or how you got the information.

Speak in a warm, human tone. If relevant, mention book titles naturally in your response.

If you're not fully sure, say something like:
"I'm not completely certain, but it seems like..." or "From what I can tell..."

Keep the response clear, engaging, and easy to read.
Avoid robotic phrasing."""

    user_prompt = f"""Here’s some background information that may help:
{context_str}

User question: {question}

Give a clear and natural answer."""

    try:
        answer = _invoke_llm(system_prompt, user_prompt)
        _ai_cache[cache_key] = answer
        return answer
    except Exception as e:
        logger.error(f"LLM QA failed: {e}")
        return f"I found relevant information in the books but encountered an error generating the answer. Please try again."


def get_recommendation_reason(source_book: Dict, target_book: Dict) -> str:
    """
    Generate a short recommendation reason using LLM.
    E.g., "If you liked X, you'll like Y because..."
    """
    cache_key = _cache_key(
        f"{source_book.get('title')}:{target_book.get('title')}", "rec"
    )
    if cache_key in _ai_cache:
        return _ai_cache[cache_key]

    system = "You are a book recommendation engine. Give a one-sentence reason why someone who liked one book would like another. Mention book titles only when it feels natural in conversation."
    user = f'If someone liked "{source_book.get("title")}" by {source_book.get("author")}, why would they also enjoy "{target_book.get("title")}" by {target_book.get("author")}? Both are in the {target_book.get("genre", "same")} genre.'

    try:
        reason = _invoke_llm(system, user)
        # Keep it short
        if len(reason) > 200:
            reason = reason[:197] + "..."
        _ai_cache[cache_key] = reason
        return reason
    except Exception:
        return f'Both books share similar themes in {target_book.get("genre", "the same")} genre.'


def get_llm_model_name() -> str:
    """Return the currently configured model name."""
    try:
        _, name = _get_llm()
        return name
    except Exception:
        return "Not configured"
