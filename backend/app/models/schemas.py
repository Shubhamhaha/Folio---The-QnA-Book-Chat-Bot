"""
Pydantic models for request/response validation.
"""

from pydantic import BaseModel, Field, HttpUrl
from typing import Optional, List
from datetime import datetime


class BookBase(BaseModel):
    title: str
    author: str
    rating: Optional[float] = None
    reviews_count: Optional[int] = None
    description: Optional[str] = None
    genre: Optional[str] = None
    book_url: Optional[str] = None
    cover_image: Optional[str] = None
    price: Optional[str] = None


class BookCreate(BookBase):
    pass


class AIInsights(BaseModel):
    summary: Optional[str] = None
    genre_classification: Optional[str] = None
    sentiment: Optional[str] = None
    sentiment_score: Optional[float] = None
    key_themes: Optional[List[str]] = []


class BookResponse(BookBase):
    id: str
    ai_insights: Optional[AIInsights] = None
    created_at: Optional[datetime] = None
    embedding_stored: bool = False

    class Config:
        from_attributes = True


class BookListResponse(BaseModel):
    books: List[BookResponse]
    total: int
    page: int
    page_size: int


class ScrapeRequest(BaseModel):
    url: str = "https://books.toscrape.com"
    max_pages: int = Field(default=3, ge=1, le=10)
    genre_filter: Optional[str] = None


class QuestionRequest(BaseModel):
    question: str = Field(..., min_length=3, max_length=500)
    book_id: Optional[str] = None  # If None, search across all books


class SourceCitation(BaseModel):
    book_id: str
    title: str
    author: str
    relevance_score: float
    excerpt: str


class QuestionResponse(BaseModel):
    question: str
    answer: str
    sources: List[SourceCitation]
    model_used: str


class RecommendationResponse(BaseModel):
    book_id: str
    title: str
    author: str
    genre: Optional[str]
    rating: Optional[float]
    cover_image: Optional[str]
    reason: str
    similarity_score: float


class ScrapeResponse(BaseModel):
    message: str
    books_scraped: int
    books_added: int


class HealthResponse(BaseModel):
    status: str
    mongodb: str
    chromadb: str
    llm_provider: str
