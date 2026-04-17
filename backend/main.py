"""
Book Intelligence Platform - FastAPI Application
Main entry point with lifespan, CORS, and router registration.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
from app.routers import books   # or wherever your file is

from app.config import settings
from app.utils.database import connect_db, disconnect_db
from app.routers.books import router as books_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle startup and shutdown events."""
    # Startup
    logger.info("🚀 Starting Book Intelligence Platform...")
    await connect_db()
    logger.info("✅ Application ready.")
    yield
    # Shutdown
    logger.info("Shutting down...")
    await disconnect_db()


app = FastAPI(
    title="Book Intelligence Platform",
    description="AI-powered book discovery with RAG and LLM insights",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(books_router)


@app.get("/", tags=["Health"])
async def root():
    return {
        "name": "Book Intelligence Platform",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Check status of all services."""
    from app.utils.database import get_db
    from app.services.rag_service import get_collection_stats
    from app.services.llm_service import get_llm_model_name

    # MongoDB
    mongo_status = "ok"
    try:
        db = get_db()
        await db.command("ping")
    except Exception as e:
        mongo_status = f"error: {e}"

    # ChromaDB
    rag_stats = get_collection_stats()
    chroma_status = rag_stats.get("status", "unknown")

    return {
        "status": "healthy",
        "mongodb": mongo_status,
        "chromadb": chroma_status,
        "llm_provider": settings.LLM_PROVIDER,
        "llm_model": get_llm_model_name(),
    }
