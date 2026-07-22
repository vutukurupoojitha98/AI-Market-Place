"""
Focused backend tests for the three user flows against the resynced Mini India catalog:

FLOW 1: Category filtering (cat_ayurveda=205, cat_snacks=192, cat_spices=183)
        + sort (price_asc / price_desc / rating).
FLOW 2: Mira AI Shopping Assistant streaming + RAG grounding + session history.
FLOW 3: Full checkout (dev-login -> add products -> coupon WELCOME10 ->
        checkout/create -> Stripe URL + order persisted with pending/unpaid).
"""
import os
import re
import json
import uuid
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://miniindia-next.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


# --------- helpers ---------
def _dev_login(email=None):
    email = email or f"testbuyer_{uuid.uuid4().hex[:6]}@miniindia.test"
    s = requests.Session()
    r = s.post(f"{API}/auth/dev-login", json={"email": email, "name": "Test Buyer"}, timeout=15)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return s, r.json()


# ===========================================================================
# FLOW 1 — Catalog: category filtering + sort dropdown
# ===========================================================================
class TestFlow1CategoryAndSort:
    def test_catalog_total_is_980(self):
        r = requests.get(f"{API}/products", params={"limit": 1}, timeout=15)
        assert r.status_code == 200
        assert r.json()["total"] == 980

    def test_categories_are_13(self):
        r = requests.get(f"{API}/categories", timeout=15)
        assert r.status_code == 200
        cats = r.json()
        assert len(cats) == 13
        ids = {c["id"] for c in cats}
        assert {"cat_ayurveda", "cat_snacks", "cat_spices", "cat_grains",
                "cat_grocery", "cat_pooja", "cat_beverages", "cat_sweets",
                "cat_lentils", "cat_fresh", "cat_chocolate", "cat_kitchen",
                "cat_bundles"} == ids

    @pytest.mark.parametrize("category,expected", [
        ("cat_ayurveda", 205),
        ("cat_snacks", 192),
        ("cat_spices", 183),
    ])
    def test_category_filter_exact_counts(self, category, expected):
        r = requests.get(f"{API}/products",
                         params={"category": category, "limit": 20}, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["total"] == expected, f"{category} expected {expected} got {d['total']}"
        # Grid should be non-empty and each item belongs to that category
        assert len(d["items"]) > 0
        for p in d["items"]:
            assert p["category_id"] == category

    def test_sort_price_asc(self):
        r = requests.get(f"{API}/products",
                         params={"category": "cat_spices", "sort": "price_asc", "limit": 40},
                         timeout=15)
        assert r.status_code == 200
        prices = [p["price"] for p in r.json()["items"]]
        assert prices == sorted(prices)

    def test_sort_price_desc(self):
        r = requests.get(f"{API}/products",
                         params={"category": "cat_snacks", "sort": "price_desc", "limit": 40},
                         timeout=15)
        assert r.status_code == 200
        prices = [p["price"] for p in r.json()["items"]]
        assert prices == sorted(prices, reverse=True)

    def test_sort_rating_desc(self):
        r = requests.get(f"{API}/products",
                         params={"category": "cat_ayurveda", "sort": "rating", "limit": 40},
                         timeout=15)
        assert r.status_code == 200
        ratings = [p["rating"] for p in r.json()["items"]]
        assert ratings == sorted(ratings, reverse=True)


# ===========================================================================
# FLOW 2 — Mira AI chat, streaming SSE, RAG grounded on catalog
# ===========================================================================
class TestFlow2MiraChat:
    def _stream(self, session_id, message, timeout=60):
        r = requests.post(f"{API}/chat/stream",
                          json={"session_id": session_id, "message": message},
                          stream=True, timeout=timeout)
        assert r.status_code == 200
        got_delta = False
        got_done = False
        full_text = ""
        for line in r.iter_lines(decode_unicode=True):
            if not line or not line.startswith("data:"):
                continue
            try:
                payload = json.loads(line[5:].strip())
            except Exception:
                continue
            if "delta" in payload:
                got_delta = True
                full_text += payload["delta"]
            if payload.get("done"):
                got_done = True
                break
            if "error" in payload:
                pytest.fail(f"chat error: {payload['error']}")
        assert got_delta, "No delta tokens streamed"
        assert got_done, "Did not receive done event"
        return full_text

    def test_aashirvaad_atta_grounding(self):
        # First verify Aashirvaad atta exists in catalog (RAG source of truth)
        r = requests.get(f"{API}/products", params={"q": "aashirvaad", "limit": 5}, timeout=15)
        assert r.status_code == 200
        assert r.json()["total"] >= 1, "Aashirvaad products missing from catalog"

        session_id = f"flow2_sess_{uuid.uuid4().hex[:8]}"
        reply = self._stream(session_id, "Do you have Aashirvaad atta?")
        assert len(reply) > 20, f"reply too short: {reply}"
        # Case-insensitive: Mira should mention 'aashirvaad' or 'atta'
        low = reply.lower()
        assert "aashirvaad" in low or "atta" in low, \
            f"Reply did not mention Aashirvaad/atta. Got: {reply[:300]}"

    def test_cheapest_basmati_and_session_persistence(self):
        session_id = f"flow2_sess_{uuid.uuid4().hex[:8]}"
        # Message 1
        r1 = self._stream(session_id, "Do you have Aashirvaad atta?")
        # Message 2 in same session
        r2 = self._stream(session_id, "What is the cheapest basmati rice you have?")
        low = r2.lower()
        assert "basmati" in low, f"reply did not mention basmati: {r2[:300]}"
        # Should include a euro price somewhere
        assert re.search(r"€\s*\d", r2) or re.search(r"\d+\.\d{2}", r2), \
            f"no price in cheapest-basmati reply: {r2[:300]}"

        # Verify chat history persistence — 4 msgs (2 user + 2 assistant)
        h = requests.get(f"{API}/chat/history/{session_id}", timeout=15)
        assert h.status_code == 200
        msgs = h.json()
        assert len(msgs) >= 4, f"expected >=4 history msgs, got {len(msgs)}"
        roles = [m["role"] for m in msgs]
        assert roles.count("user") >= 2
        assert roles.count("assistant") >= 2


# ===========================================================================
# FLOW 3 — End-to-end Stripe checkout
# ===========================================================================
class TestFlow3Checkout:
    def test_full_checkout_with_welcome10(self):
        s, user = _dev_login()

        # Pick 2 products so subtotal >= €25 (WELCOME10 requires €20+)
        r = requests.get(f"{API}/products", params={"sort": "price_desc", "limit": 20}, timeout=15)
        assert r.status_code == 200
        items = r.json()["items"]
        # Pick two expensive-ish products
        p1, p2 = items[0], items[1]

        assert s.post(f"{API}/cart/add", json={"product_id": p1["id"], "qty": 1}, timeout=15).status_code == 200
        assert s.post(f"{API}/cart/add", json={"product_id": p2["id"], "qty": 1}, timeout=15).status_code == 200

        cart = s.get(f"{API}/cart", timeout=15).json()
        assert cart["subtotal"] >= 25, f"cart subtotal €{cart['subtotal']} < €25"
        subtotal = cart["subtotal"]

        # Validate WELCOME10 coupon directly
        cv = s.post(f"{API}/coupons/validate",
                    json={"code": "WELCOME10", "subtotal": subtotal}, timeout=15)
        assert cv.status_code == 200
        expected_discount = round(subtotal * 0.10, 2)
        assert abs(cv.json()["discount"] - expected_discount) < 0.01

        # Create checkout
        body = {
            "origin_url": BASE_URL,
            "address": {
                "name": "Test Buyer",
                "line1": "1 Dev Street",
                "city": "Dublin",
                "country": "Ireland",
                "postal_code": "D01AB12",
                "phone": "0871234567",
            },
            "coupon_code": "WELCOME10",
        }
        r = s.post(f"{API}/checkout/create", json=body, timeout=30)
        assert r.status_code == 200, f"checkout failed: {r.status_code} {r.text}"
        data = r.json()
        assert "checkout_url" in data
        assert data["checkout_url"].startswith("https://checkout.stripe.com/") or \
               data["checkout_url"].startswith("https://"), f"unexpected checkout_url: {data['checkout_url']}"
        assert "order_id" in data
        oid = data["order_id"]

        # Verify order was persisted with correct fields
        o = s.get(f"{API}/orders/{oid}", timeout=15)
        assert o.status_code == 200
        order = o.json()
        assert order["status"] == "pending"
        assert order["payment_status"] == "unpaid"
        assert order["coupon_code"] == "WELCOME10"
        # subtotal & discount and shipping math
        assert abs(order["subtotal"] - subtotal) < 0.01
        assert abs(order["discount"] - expected_discount) < 0.01
        expected_shipping = 0.0 if subtotal >= 50 else 4.99
        assert abs(order["shipping"] - expected_shipping) < 0.01
        expected_total = round(max(0, subtotal - expected_discount) + expected_shipping, 2)
        assert abs(order["total"] - expected_total) < 0.01

        # Cart should be cleared
        cart2 = s.get(f"{API}/cart", timeout=15).json()
        assert cart2.get("subtotal", 0) == 0

    def test_checkout_requires_auth(self):
        r = requests.post(f"{API}/checkout/create", json={
            "origin_url": BASE_URL,
            "address": {"name": "x", "line1": "x", "city": "x",
                        "country": "Ireland", "postal_code": "x", "phone": "x"},
        }, timeout=15)
        assert r.status_code == 401

    def test_invalid_coupon_rejected(self):
        r = requests.post(f"{API}/coupons/validate",
                          json={"code": "NOPE_NOT_A_CODE", "subtotal": 50}, timeout=15)
        assert r.status_code == 404
