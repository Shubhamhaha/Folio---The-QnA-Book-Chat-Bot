"""
RAG (Retrieval-Augmented Generation) service.
Handles:
  - Text chunking with overlapping windows
  - Embedding generation via SentenceTransformers
  - ChromaDB vector store operations
  - Similarity search for question answering
"""

import logging
import re
from typing import List, Dict, Optional, Tuple

import chromadb
from chromadb.config import Settings as ChromaSettings
from sentence_transformers import SentenceTransformer

from app.config import settings

logger = logging.getLogger(__name__)

# Singleton instances
_chroma_client: Optional[chromadb.PersistentClient] = None
_collection: Optional[chromadb.Collection] = None
_embedding_model: Optional[SentenceTransformer] = None

COLLECTION_NAME = "book_chunks"
CHUNK_SIZE = 300       # tokens approx (words)
CHUNK_OVERLAP = 50     # overlapping words between chunks


def _get_embedding_model() -> SentenceTransformer:
    """Lazy-load the sentence transformer model."""
    global _embedding_model
    if _embedding_model is None:
        logger.info("Loading SentenceTransformer model (all-MiniLM-L6-v2)...")
        _embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
        logger.info("✅ Embedding model loaded.")
    return _embedding_model


def _get_chroma_collection() -> chromadb.Collection:
    """Lazy-init ChromaDB client and collection."""
    global _chroma_client, _collection

    if _collection is None:
        _chroma_client = chromadb.PersistentClient(
            path=settings.CHROMA_DB_PATH,
            settings=ChromaSettings(anonymized_telemetry=False),
        )
        _collection = _chroma_client.get_or_create_collection(
            name=COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},
        )
        logger.info(f"✅ ChromaDB collection '{COLLECTION_NAME}' ready.")

    return _collection


def chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> List[str]:
    """
    Split text into overlapping word-based chunks.
    This is a sliding window strategy for better context retrieval.
    """
    words = text.split()
    if not words:
        return []

    chunks = []
    start = 0

    while start < len(words):
        end = min(start + chunk_size, len(words))
        chunk = " ".join(words[start:end])
        if chunk.strip():
            chunks.append(chunk)
        if end >= len(words):
            break
        start += chunk_size - overlap  # slide with overlap

    return chunks


def build_book_text(book: Dict) -> str:
    """
    Combine book fields into a rich text document for embedding.
    Includes AI insights if available for richer semantic content.
    """
    parts = []

    if book.get("title"):
        parts.append(f"Title: {book['title']}")
    if book.get("author"):
        parts.append(f"Author: {book['author']}")
    if book.get("genre"):
        parts.append(f"Genre: {book['genre']}")
    if book.get("description"):
        parts.append(f"Description: {book['description']}")

    insights = book.get("ai_insights") or {}
    if insights.get("summary"):
        parts.append(f"Summary: {insights['summary']}")
    if insights.get("genre_classification"):
        parts.append(f"Genre Classification: {insights['genre_classification']}")
    if insights.get("key_themes"):
        themes = ", ".join(insights["key_themes"])
        parts.append(f"Key Themes: {themes}")
    if insights.get("sentiment"):
        parts.append(f"Tone/Sentiment: {insights['sentiment']}")

    return "\n".join(parts)


def store_book_embeddings(book: Dict) -> bool:
    """
    Chunk a book's text and store embeddings in ChromaDB.
    Returns True on success.
    """
    try:
        collection = _get_chroma_collection()
        model = _get_embedding_model()

        book_id = book.get("id") or str(book.get("_id", ""))
        full_text = build_book_text(book)

        if not full_text.strip():
            logger.warning(f"No text to embed for book {book_id}")
            return False

        chunks = chunk_text(full_text)
        if not chunks:
            return False

        # Delete existing chunks for this book (re-indexing)
        try:
            existing = collection.get(where={"book_id": book_id})
            if existing["ids"]:
                collection.delete(ids=existing["ids"])
        except Exception:
            pass

        # Generate embeddings
        embeddings = model.encode(chunks, show_progress_bar=False).tolist()

        # Prepare ChromaDB data
        ids = [f"{book_id}_chunk_{i}" for i in range(len(chunks))]
        metadatas = [
            {
                "book_id": book_id,
                "title": book.get("title", ""),
                "author": book.get("author", ""),
                "genre": book.get("genre", "") or "",
                "chunk_index": i,
            }
            for i in range(len(chunks))
        ]

        collection.add(
            ids=ids,
            embeddings=embeddings,
            documents=chunks,
            metadatas=metadatas,
        )

        logger.info(
            f"Stored {len(chunks)} chunks for '{book.get('title')}' (id={book_id})"
        )
        return True

    except Exception as e:
        logger.error(f"Failed to store embeddings for book {book.get('id')}: {e}")
        return False


def search_similar_chunks(
    query: str,
    n_results: int = 5,
    book_id_filter: Optional[str] = None,
) -> List[Dict]:
    """
    Perform semantic similarity search.
    Returns list of {book_id, title, author, text, score} dicts.

    Args:
        query: User question string.
        n_results: Number of top chunks to return.
        book_id_filter: If set, restrict search to a single book.
    """
    try:
        collection = _get_chroma_collection()
        model = _get_embedding_model()

        # Encode query
        query_embedding = model.encode([query], show_progress_bar=False).tolist()

        # Optional filter
        where_clause = {"book_id": book_id_filter} if book_id_filter else None

        results = collection.query(
            query_embeddings=query_embedding,
            n_results=min(n_results, collection.count() or 1),
            where=where_clause,
            include=["documents", "metadatas", "distances"],
        )

        chunks = []
        if results["ids"] and results["ids"][0]:
            for doc, meta, dist in zip(
                results["documents"][0],
                results["metadatas"][0],
                results["distances"][0],
            ):
                # Convert cosine distance → similarity score
                similarity = 1.0 - dist
                chunks.append(
                    {
                        "book_id": meta.get("book_id", ""),
                        "title": meta.get("title", "Unknown"),
                        "author": meta.get("author", "Unknown"),
                        "text": doc,
                        "score": round(similarity, 4),
                    }
                )

        return chunks

    except Exception as e:
        logger.error(f"Similarity search failed: {e}")
        return []


def get_book_embedding(book_id: str) -> Optional[List[float]]:
    """
    Return the averaged embedding vector for a book (for inter-book similarity).
    """
    try:
        collection = _get_chroma_collection()
        results = collection.get(
            where={"book_id": book_id},
            include=["embeddings"],
        )
        if results["embeddings"]:
            import numpy as np
            avg = np.mean(results["embeddings"], axis=0).tolist()
            return avg
    except Exception as e:
        logger.error(f"Failed to get embedding for {book_id}: {e}")
    return None


def find_similar_books(book_id: str, all_book_ids: List[str], n: int = 5) -> List[Tuple[str, float]]:
    """
    Find the most similar books to a given book using average embeddings.
    Returns list of (book_id, similarity_score) tuples.
    """
    source_emb = get_book_embedding(book_id)
    if not source_emb:
        return []

    import numpy as np

    source_vec = np.array(source_emb)
    similarities = []

    for bid in all_book_ids:
        if bid == book_id:
            continue
        emb = get_book_embedding(bid)
        if not emb:
            continue
        target_vec = np.array(emb)
        # Cosine similarity
        score = float(
            np.dot(source_vec, target_vec)
            / (np.linalg.norm(source_vec) * np.linalg.norm(target_vec) + 1e-10)
        )
        similarities.append((bid, score))

    similarities.sort(key=lambda x: x[1], reverse=True)
    return similarities[:n]


def get_collection_stats() -> Dict:
    """Return stats about the ChromaDB collection."""
    try:
        collection = _get_chroma_collection()
        return {"total_chunks": collection.count(), "status": "ok"}
    except Exception as e:
        return {"total_chunks": 0, "status": str(e)}
