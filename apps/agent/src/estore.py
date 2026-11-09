"""Estore product search tool: live catalog search via the Estore backend."""

import os

import httpx
from langchain.tools import tool

def _api_url() -> str:
    # Read at call time: main.py loads .env after importing this module.
    return os.environ.get("ESTORE_API_URL", "http://localhost:8000/api").rstrip("/")


def _store_url() -> str:
    return os.environ.get("ESTORE_STORE_URL", "https://estore-frontend-jade.vercel.app").rstrip("/")


@tool
def search_products(
    query: str,
    max_price: float | None = None,
    min_price: float | None = None,
    limit: int = 6,
):
    """
    Search the live Estore catalog (semantic search over real products).
    Use this for ANY question about products, prices, recommendations or comparisons.
    `query` is a natural-language description of what the customer wants.
    When the customer states a budget, ALWAYS pass max_price (and min_price if given) in USD
    so only affordable products are returned and shown.
    Prices are in USD. Returns real products with name, price, brand, category,
    description, rating, image and a product link. Results are the closest semantic
    matches, so they may NOT satisfy every requirement (budget, features): check each
    product against the customer's requirements before recommending it.
    """
    limit = max(1, min(int(limit), 10))
    try:
        response = httpx.post(
            f"{_api_url()}/semanticSearch",
            json={"query": query, "limit": 12},
            headers={"x-assistant-key": os.environ.get("ESTORE_ASSISTANT_KEY", "")},
            timeout=30,
        )
        response.raise_for_status()
        products = response.json().get("products", [])
    except Exception as exc:  # surface a clean error to the model, never a stack trace
        return {"source": "Estore catalog", "error": f"Product search is unavailable: {type(exc).__name__}", "products": []}

    def in_budget(p):
        price = p.get("price")
        if not isinstance(price, (int, float)):
            return False
        return (max_price is None or price <= max_price) and (min_price is None or price >= min_price)

    matched = [p for p in products if in_budget(p)][:limit]
    # Products that matched the meaning but not the budget: for the model only, not shown as cards.
    excluded = [
        {"name": p.get("name"), "price": p.get("price")}
        for p in products
        if not in_budget(p)
    ][:4]
    products = matched

    return {
        "source": "Estore catalog (live)",
        "budget_filter": {"max_price": max_price, "min_price": min_price},
        "excluded_by_budget": excluded,
        "currency": "USD",
        "products": [
            {
                "id": p.get("_id"),
                "name": p.get("name"),
                "price": p.get("price"),
                "brand": p.get("Brand"),
                "category": p.get("Category"),
                "description": p.get("description"),
                "rating": p.get("averageRating"),
                "ratingCount": p.get("ratingCount"),
                "image": p.get("image"),
                "link": f"{_store_url()}/Product/{p.get('_id')}",
            }
            for p in products
        ],
    }
