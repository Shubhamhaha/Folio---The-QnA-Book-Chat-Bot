"""
Book scraper for books.toscrape.com
Uses requests + BeautifulSoup for reliability.
Selenium is available but BS4 is faster for this practice site.
"""

import requests
from bs4 import BeautifulSoup
from typing import List, Dict, Optional
import logging
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urljoin

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


def _build_cover_url(relative_url: str, base_url: str = BASE_URL) -> str:
    """Resolve relative cover image URL to absolute."""
    return urljoin(base_url.rstrip("/") + "/", relative_url)


def scrape_book_detail(book_url: str) -> Optional[str]:
    """
    Fetch the book detail page and extract the full description.
    Returns description text or None.
    """
    try:
        resp = requests.get(book_url, headers=HEADERS, timeout=(4, 8))
        resp.raise_for_status()
        soup = BeautifulSoup(resp.content, "html.parser")
        desc_tag = soup.select_one("article.product_page > p")
        if desc_tag:
            return desc_tag.get_text(strip=True)
    except Exception as e:
        logger.warning(f"Could not fetch detail for {book_url}: {e}")
    return None


def scrape_books_page(page_url: str, soup: Optional[BeautifulSoup] = None) -> List[Dict]:
    """
    Scrape one listing page and return a list of raw book dicts.
    Each dict includes title, author, rating, price, cover_image, book_url.
    """
    if soup is None:
        try:
            resp = requests.get(page_url, headers=HEADERS, timeout=(4, 8))
            resp.raise_for_status()
            soup = BeautifulSoup(resp.content, "html.parser")
        except Exception as e:
            logger.error("Failed to fetch %s: %s", page_url, e)
            return []
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
            cover_image = _build_cover_url(img_src, page_url)

            # Book detail URL
            detail_href = title_tag["href"] if title_tag else ""
            book_url = urljoin(page_url, detail_href)

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
        try:
            resp = requests.get(current_url, headers=HEADERS, timeout=(4, 8))
            resp.raise_for_status()
            soup = BeautifulSoup(resp.content, "html.parser")
        except Exception as e:
            logger.warning("Failed to fetch %s page %s: %s", category_name, page, e)
            break

        books = scrape_books_page(current_url, soup=soup)

        if not books:
            break

        # Tag genre from category
        for b in books:
            b["genre"] = category_name

        all_books.extend(books)
        page += 1

        # Check for next page
        next_btn = soup.select_one("li.next > a")
        if next_btn:
            current_url = urljoin(current_url, next_btn.get("href", ""))
        else:
            break

    return all_books


def scrape_books(
    max_pages: int = 3,
    genre_filter: Optional[str] = None,
    base_url: str = BASE_URL,
) -> List[Dict]:
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
        resp = requests.get(base_url, headers=HEADERS, timeout=(4, 8))
        resp.raise_for_status()
        soup = BeautifulSoup(resp.content, "html.parser")
    except Exception as e:
        logger.error(f"Failed to reach {BASE_URL}: {e}")
        return []

    # Parse category links
    category_links = []
    nav = soup.select("ul.nav-list > li > ul > li > a")
    for a in nav:
        name = a.get_text(strip=True)
        href = a["href"]
        url = urljoin(base_url.rstrip("/") + "/", href)
        if genre_filter:
            if genre_filter.lower() in name.lower():
                category_links.append((name, url))
        else:
            category_links.append((name, url))

    # Limit to first 5 categories if no filter (to keep it fast)
    if not genre_filter:
        category_links = category_links[:5]

    all_books = []

    # Scrape categories concurrently so one slow category cannot stall all others.
    with ThreadPoolExecutor(max_workers=min(5, max(1, len(category_links)))) as executor:
        futures = {
            executor.submit(scrape_category_page, url, name, max_pages): name
            for name, url in category_links
        }
        for future, category_name in futures.items():
            try:
                books = future.result()
                all_books.extend(books)
                logger.info("  %s: scraped %s books", category_name, len(books))
            except Exception:
                logger.exception("Category scrape failed for %s", category_name)

    # Enrich top books with descriptions from detail pages
    # Limit detail fetches to avoid slow runs (fetch up to 30)
    details = all_books[:30]
    with ThreadPoolExecutor(max_workers=10) as executor:
        descriptions = executor.map(scrape_book_detail, (book["book_url"] for book in details))
        for book, desc in zip(details, descriptions):
            if desc:
                book["description"] = desc

    logger.info(f"Total books scraped: {len(all_books)}")
    return all_books
