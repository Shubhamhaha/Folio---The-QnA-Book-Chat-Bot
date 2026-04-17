"""
Book scraper for books.toscrape.com
Uses requests + BeautifulSoup for reliability.
Selenium is available but BS4 is faster for this practice site.
"""

import requests
import asyncio
import aiohttp
from bs4 import BeautifulSoup
from typing import List, Dict, Optional
import logging
import re

logger = logging.getLogger(__name__)

BASE_URL = "https://books.toscrape.com"
RATING_MAP = {"One": 1, "Two": 2, "Three": 3, "Four": 4, "Five": 5}

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )
}


def _parse_rating(word: str) -> float:
    """Convert word rating to numeric (e.g. 'Three' → 3.0)."""
    return float(RATING_MAP.get(word, 0))


def _build_cover_url(relative_url: str) -> str:
    """Resolve relative cover image URL to absolute."""
    cleaned = relative_url.replace("../../", "").replace("../", "")
    return f"{BASE_URL}/{cleaned}"


def scrape_book_detail(book_url: str) -> Optional[str]:
    """
    Fetch the book detail page and extract the full description.
    Returns description text or None.
    """
    try:
        resp = requests.get(book_url, headers=HEADERS, timeout=10)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")
        desc_tag = soup.select_one("article.product_page > p")
        if desc_tag:
            return desc_tag.get_text(strip=True)
    except Exception as e:
        logger.warning(f"Could not fetch detail for {book_url}: {e}")
    return None


def scrape_books_page(page_url: str) -> List[Dict]:
    """
    Scrape one listing page and return a list of raw book dicts.
    Each dict includes title, author, rating, price, cover_image, book_url.
    """
    try:
        resp = requests.get(page_url, headers=HEADERS, timeout=15)
        resp.raise_for_status()
    except Exception as e:
        logger.error(f"Failed to fetch {page_url}: {e}")
        return []

    soup = BeautifulSoup(resp.text, "html.parser")
    books = []

    for article in soup.select("article.product_pod"):
        try:
            # Title
            title_tag = article.select_one("h3 > a")
            title = title_tag["title"] if title_tag else "Unknown"

            # Rating
            rating_tag = article.select_one("p.star-rating")
            rating_word = rating_tag["class"][1] if rating_tag else "Zero"
            rating = _parse_rating(rating_word)

            # Price
            price_tag = article.select_one("p.price_color")
            price = price_tag.get_text(strip=True) if price_tag else "N/A"

            # Cover image
            img_tag = article.select_one("img.thumbnail")
            img_src = img_tag["src"] if img_tag else ""
            cover_image = _build_cover_url(img_src)

            # Book detail URL
            detail_href = title_tag["href"] if title_tag else ""
            # href is like "../../../category/books/xxx_n/index.html"
            # Resolve against base listing URL
            detail_href = re.sub(r"^\.\./", "", detail_href)
            detail_href = re.sub(r"^\.\./", "", detail_href)
            detail_href = re.sub(r"^\.\./", "", detail_href)
            book_url = f"{BASE_URL}/catalogue/{detail_href}"

            books.append(
                {
                    "title": title,
                    "author": "Unknown",  # listing page has no author
                    "rating": rating,
                    "price": price,
                    "cover_image": cover_image,
                    "book_url": book_url,
                    "genre": None,
                    "description": None,
                    "reviews_count": 0,
                }
            )
        except Exception as e:
            logger.warning(f"Error parsing book article: {e}")
            continue

    return books


def scrape_category_page(category_url: str, category_name: str, max_pages: int = 2) -> List[Dict]:
    """
    Scrape multiple pages of a category and enrich with detail page data.
    """
    all_books = []
    page = 1
    current_url = category_url

    while page <= max_pages:
        logger.info(f"Scraping {category_name} page {page}: {current_url}")
        books = scrape_books_page(current_url)

        if not books:
            break

        # Tag genre from category
        for b in books:
            b["genre"] = category_name

        all_books.extend(books)
        page += 1

        # Check for next page
        try:
            resp = requests.get(current_url, headers=HEADERS, timeout=10)
            soup = BeautifulSoup(resp.text, "html.parser")
            next_btn = soup.select_one("li.next > a")
            if next_btn:
                next_href = next_btn["href"]
                base = current_url.rsplit("/", 1)[0]
                current_url = f"{base}/{next_href}"
            else:
                break
        except Exception:
            break

    return all_books


def scrape_books(max_pages: int = 3, genre_filter: Optional[str] = None) -> List[Dict]:
    """
    Main scraping entry point.
    Scrapes books.toscrape.com across categories.

    Args:
        max_pages: Max pages per category.
        genre_filter: If set, only scrape this category.
    Returns:
        List of enriched book dicts.
    """
    logger.info(f"Starting scrape: max_pages={max_pages}, genre={genre_filter}")

    # First get list of categories
    try:
        resp = requests.get(BASE_URL, headers=HEADERS, timeout=15)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")
    except Exception as e:
        logger.error(f"Failed to reach {BASE_URL}: {e}")
        return []

    # Parse category links
    category_links = []
    nav = soup.select("ul.nav-list > li > ul > li > a")
    for a in nav:
        name = a.get_text(strip=True)
        href = a["href"]
        url = f"{BASE_URL}/{href}"
        if genre_filter:
            if genre_filter.lower() in name.lower():
                category_links.append((name, url))
        else:
            category_links.append((name, url))

    # Limit to first 5 categories if no filter (to keep it fast)
    if not genre_filter:
        category_links = category_links[:5]

    all_books = []

    for category_name, category_url in category_links:
        books = scrape_category_page(category_url, category_name, max_pages=max_pages)
        all_books.extend(books)
        logger.info(f"  {category_name}: scraped {len(books)} books")

    # Enrich top books with descriptions from detail pages
    # Limit detail fetches to avoid slow runs (fetch up to 30)
    for i, book in enumerate(all_books[:30]):
        try:
            desc = scrape_book_detail(book["book_url"])
            if desc:
                book["description"] = desc
        except Exception:
            pass

    logger.info(f"Total books scraped: {len(all_books)}")
    return all_books
