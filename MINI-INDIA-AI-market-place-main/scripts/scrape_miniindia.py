"""
Scrape all product listings from miniindia.ie using Playwright.
Handles the JS-based anti-bot challenge automatically.
"""
import re, html, json, time
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = "https://www.miniindia.ie"

CATEGORIES = {
    6:  "Bundles & Offers",
    13: "Kitchen",
    14: "Snacks & Savouries",
    22: "Rice & Flour",
    30: "Grocery & Ready Meals",
    33: "Spices & Masala",
    39: "Ayurveda, Oil & Ghee",
    43: "Pooja & Devotional",
    58: "Chocolates & Sweets",
    61: "Dates & Indian Sweets",
    62: "Beverages",
    85: "Grains & Lentils",
    86: "Fresh & More",
}

def parse_category(html_text, cat_id, cat_name):
    chunks = html_text.split('<div class="product-image-wrapper')
    out = []
    for c in chunks[1:]:
        m_pid = re.search(r'product-details\.php\?pid=(\d+)', c)
        if not m_pid: continue
        m_img = re.search(r'<img[^>]+src="([^"]+)"[^>]*>', c)
        m_title = re.search(r'product-title[^>]*>\s*([^<]+)</h4>', c)
        m_sale = re.search(r'class="saleprice[^"]*"[^>]*>\s*(?:&euro;|€)\s*([\d.]+)', c)
        m_orig = re.search(r'class="orprice[^"]*"[^>]*>\s*(?:&euro;|€)\s*([\d.]+)', c)
        m_disc = re.search(r'dicounticon[^>]*>\s*(\d+)%', c)

        title = html.unescape((m_title.group(1) if m_title else "").strip())
        if not title: continue
        price = float(m_sale.group(1)) if m_sale else None
        if price is None: continue
        img = m_img.group(1) if m_img else ""
        if img.startswith("/"): img = BASE + img
        elif img and not img.startswith("http"): img = BASE + "/" + img
        if "/offerimg1/no.png" in img or "no-image" in img: img = ""
        mrp = float(m_orig.group(1)) if m_orig else price
        disc = int(m_disc.group(1)) if m_disc else 0
        out.append({
            "pid": m_pid.group(1), "title": title, "image": img,
            "price": price, "mrp": mrp, "discount": disc,
            "category_id": cat_id, "category_name": cat_name,
        })
    return out

def main():
    all_products = {}
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, args=["--no-sandbox","--disable-dev-shm-usage"])
        ctx = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
            viewport={"width": 1280, "height": 900},
        )
        # Block images/fonts/media for speed — we just need HTML
        ctx.route("**/*.{png,jpg,jpeg,webp,gif,svg,woff,woff2,ttf,mp4,mp3}", lambda r: r.abort())
        page = ctx.new_page()
        for cat_id, cat_name in CATEGORIES.items():
            url = f"{BASE}/menu.php?catid={cat_id}"
            print(f"→ Fetching {cat_id} ({cat_name})…", end=" ", flush=True)
            try:
                page.goto(url, wait_until="domcontentloaded", timeout=45000)
                # Wait for product list to render (either found or timeout)
                try:
                    page.wait_for_selector(".product-image-wrapper", timeout=10000)
                except:
                    pass
                content = page.content()
            except Exception as e:
                print(f"FAIL: {e}")
                continue
            prods = parse_category(content, cat_id, cat_name)
            new = 0
            for p in prods:
                if p["pid"] not in all_products:
                    all_products[p["pid"]] = p
                    new += 1
            print(f"{len(prods)} products ({new} new; total unique: {len(all_products)})")
            time.sleep(0.5)
        browser.close()

    products = list(all_products.values())
    out_path = Path("/app/backend/miniindia_products.json")
    out_path.write_text(json.dumps({
        "categories": [{"id": k, "name": v} for k, v in CATEGORIES.items()],
        "products": products,
    }, indent=2, ensure_ascii=False))
    print(f"\n✓ Wrote {len(products)} products to {out_path}")

if __name__ == "__main__":
    main()
