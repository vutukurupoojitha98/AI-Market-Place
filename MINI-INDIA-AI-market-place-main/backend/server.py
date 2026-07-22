"""
Mini India – Enterprise E-commerce Backend
FastAPI + MongoDB. All routes under /api. Uses Clean Architecture:
  models.py   – Pydantic domain models
  repos.py    – repository layer (MongoDB access)
  services.py – business logic
  server.py   – HTTP routers (this file)
"""
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, Query
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from pathlib import Path
import os, uuid, logging, httpx, json, asyncio, hashlib, re

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")
STRIPE_API_KEY = os.environ.get("STRIPE_API_KEY", "sk_test_emergent")
JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret")

app = FastAPI(title="Mini India Enterprise API", version="1.0.0")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(name)s: %(message)s')
log = logging.getLogger("miniindia")


# ============================================================
# MODELS
# ============================================================
def now_utc(): return datetime.now(timezone.utc)
def new_id(prefix: str = ""): return f"{prefix}{uuid.uuid4().hex[:16]}" if prefix else uuid.uuid4().hex

class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    role: str = "customer"  # customer | seller | admin
    created_at: datetime = Field(default_factory=now_utc)

class Category(BaseModel):
    id: str = Field(default_factory=lambda: new_id("cat_"))
    name: str
    slug: str
    image: Optional[str] = None
    icon: Optional[str] = None

class Brand(BaseModel):
    id: str = Field(default_factory=lambda: new_id("brd_"))
    name: str
    slug: str

class Product(BaseModel):
    id: str = Field(default_factory=lambda: new_id("prd_"))
    title: str
    slug: str
    description: str
    price: float
    mrp: float
    currency: str = "EUR"
    images: List[str] = []
    category_id: str
    brand_id: Optional[str] = None
    stock: int = 100
    rating: float = 4.3
    review_count: int = 0
    tags: List[str] = []
    seller_id: str = "seed"
    is_approved: bool = True
    is_active: bool = True
    created_at: datetime = Field(default_factory=now_utc)

class CartItem(BaseModel):
    product_id: str
    qty: int = 1

class Cart(BaseModel):
    user_id: str
    items: List[CartItem] = []
    updated_at: datetime = Field(default_factory=now_utc)

class Address(BaseModel):
    name: str
    line1: str
    city: str
    state: Optional[str] = None
    country: str = "Ireland"
    postal_code: str
    phone: str

class Order(BaseModel):
    id: str = Field(default_factory=lambda: new_id("ord_"))
    user_id: str
    items: List[Dict[str, Any]]  # {product_id, title, image, qty, price}
    subtotal: float
    discount: float = 0
    shipping: float = 0
    total: float
    status: str = "pending"  # pending | paid | shipped | delivered | cancelled
    payment_status: str = "unpaid"
    payment_session_id: Optional[str] = None
    coupon_code: Optional[str] = None
    address: Address
    created_at: datetime = Field(default_factory=now_utc)

class Review(BaseModel):
    id: str = Field(default_factory=lambda: new_id("rev_"))
    product_id: str
    user_id: str
    user_name: str
    rating: int
    title: Optional[str] = None
    body: str
    created_at: datetime = Field(default_factory=now_utc)

class Coupon(BaseModel):
    code: str
    description: str
    discount_percent: float = 0
    discount_flat: float = 0
    min_order: float = 0
    active: bool = True

class ChatMessage(BaseModel):
    role: str
    content: str
    ts: datetime = Field(default_factory=now_utc)


# ============================================================
# AUTH (Emergent Google Auth)
# ============================================================
async def get_current_user(request: Request) -> Optional[dict]:
    token = request.cookies.get("session_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        return None
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        return None
    expires_at = session["expires_at"]
    if isinstance(expires_at, str): expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None: expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < now_utc():
        return None
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    return user

async def require_user(request: Request) -> dict:
    u = await get_current_user(request)
    if not u: raise HTTPException(401, "Not authenticated")
    return u

async def require_admin(request: Request) -> dict:
    u = await require_user(request)
    if u.get("role") != "admin": raise HTTPException(403, "Admin only")
    return u

async def require_seller(request: Request) -> dict:
    u = await require_user(request)
    if u.get("role") not in ("seller", "admin"): raise HTTPException(403, "Seller only")
    return u


@api.post("/auth/session")
async def create_session(request: Request, response: Response):
    """Exchange Emergent session_id for our session_token."""
    body = await request.json()
    session_id = body.get("session_id")
    if not session_id: raise HTTPException(400, "session_id required")

    async with httpx.AsyncClient(timeout=15) as ac:
        r = await ac.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id},
        )
        if r.status_code != 200: raise HTTPException(401, "Invalid session")
        data = r.json()

    email = data["email"]; name = data.get("name") or email.split("@")[0]
    picture = data.get("picture"); emergent_token = data["session_token"]

    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one({"user_id": user_id}, {"$set": {"name": name, "picture": picture}})
        role = existing.get("role", "customer")
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        # First user becomes admin
        count = await db.users.count_documents({})
        role = "admin" if count == 0 else "customer"
        await db.users.insert_one({
            "user_id": user_id, "email": email, "name": name, "picture": picture,
            "role": role, "created_at": now_utc().isoformat(),
        })

    expires_at = now_utc() + timedelta(days=7)
    await db.user_sessions.insert_one({
        "user_id": user_id, "session_token": emergent_token,
        "expires_at": expires_at.isoformat(), "created_at": now_utc().isoformat(),
    })

    response.set_cookie("session_token", emergent_token, max_age=7*24*3600,
                       httponly=True, secure=True, samesite="none", path="/")
    return {"user_id": user_id, "email": email, "name": name, "picture": picture, "role": role}

@api.post("/auth/dev-login")
async def dev_login(request: Request, response: Response):
    """Dev-only email login for testing (no password). Creates user if not exists."""
    body = await request.json()
    email = body.get("email", "").strip().lower()
    name = body.get("name") or email.split("@")[0]
    role = body.get("role", "customer")
    if not email: raise HTTPException(400, "email required")

    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]; role = existing.get("role", role)
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        count = await db.users.count_documents({})
        if count == 0: role = "admin"
        await db.users.insert_one({
            "user_id": user_id, "email": email, "name": name, "picture": None,
            "role": role, "created_at": now_utc().isoformat(),
        })

    token = f"dev_{uuid.uuid4().hex}"
    expires_at = now_utc() + timedelta(days=7)
    await db.user_sessions.insert_one({
        "user_id": user_id, "session_token": token,
        "expires_at": expires_at.isoformat(), "created_at": now_utc().isoformat(),
    })
    response.set_cookie("session_token", token, max_age=7*24*3600,
                       httponly=True, secure=True, samesite="none", path="/")
    return {"user_id": user_id, "email": email, "name": name, "role": role, "session_token": token}

@api.get("/auth/me")
async def me(request: Request):
    u = await get_current_user(request)
    if not u: raise HTTPException(401, "Not authenticated")
    return u

@api.post("/auth/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get("session_token")
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie("session_token", path="/")
    return {"ok": True}


# ============================================================
# CATEGORIES / BRANDS
# ============================================================
@api.get("/categories")
async def list_categories():
    return await db.categories.find({}, {"_id": 0}).to_list(1000)

@api.get("/brands")
async def list_brands():
    return await db.brands.find({}, {"_id": 0}).to_list(1000)


# ============================================================
# PRODUCTS – catalog with filters, search, sort, pagination
# ============================================================
@api.get("/products")
async def list_products(
    q: Optional[str] = None,
    category: Optional[str] = None,
    brand: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    sort: str = "relevance",  # relevance | price_asc | price_desc | rating | newest
    page: int = 1,
    limit: int = 20,
):
    filt: Dict[str, Any] = {"is_active": True, "is_approved": True}
    if q:
        filt["$or"] = [
            {"title": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}},
            {"tags": {"$in": [q.lower()]}},
        ]
    if category: filt["category_id"] = category
    if brand: filt["brand_id"] = brand
    if min_price is not None or max_price is not None:
        price_f: Dict[str, Any] = {}
        if min_price is not None: price_f["$gte"] = min_price
        if max_price is not None: price_f["$lte"] = max_price
        filt["price"] = price_f

    sort_map = {
        "price_asc": [("price", 1)], "price_desc": [("price", -1)],
        "rating": [("rating", -1)], "newest": [("created_at", -1)],
        "relevance": [("rating", -1), ("review_count", -1)],
    }
    cursor = db.products.find(filt, {"_id": 0}).sort(sort_map.get(sort, sort_map["relevance"]))
    total = await db.products.count_documents(filt)
    items = await cursor.skip((page-1)*limit).limit(limit).to_list(limit)
    return {"items": items, "total": total, "page": page, "limit": limit,
            "pages": (total + limit - 1) // limit}

@api.get("/products/trending")
async def trending():
    return await db.products.find(
        {"is_active": True}, {"_id": 0}
    ).sort([("rating", -1), ("review_count", -1)]).limit(8).to_list(8)

@api.get("/products/search-suggest")
async def suggest(q: str = ""):
    if not q or len(q) < 2: return {"items": []}
    items = await db.products.find(
        {"title": {"$regex": q, "$options": "i"}, "is_active": True},
        {"_id": 0, "id": 1, "title": 1, "slug": 1, "images": 1, "price": 1},
    ).limit(6).to_list(6)
    return {"items": items}

@api.get("/products/{pid}")
async def get_product(pid: str):
    p = await db.products.find_one({"id": pid}, {"_id": 0})
    if not p: raise HTTPException(404, "Product not found")
    return p

@api.get("/products/{pid}/related")
async def related(pid: str):
    p = await db.products.find_one({"id": pid}, {"_id": 0})
    if not p: return []
    return await db.products.find(
        {"category_id": p["category_id"], "id": {"$ne": pid}, "is_active": True},
        {"_id": 0},
    ).limit(6).to_list(6)


# ============================================================
# WISHLIST
# ============================================================
@api.get("/wishlist")
async def get_wishlist(u=Depends(require_user)):
    w = await db.wishlists.find_one({"user_id": u["user_id"]}, {"_id": 0}) or {"product_ids": []}
    if not w.get("product_ids"): return {"items": []}
    items = await db.products.find({"id": {"$in": w["product_ids"]}}, {"_id": 0}).to_list(500)
    return {"items": items}

@api.post("/wishlist/{pid}")
async def add_wishlist(pid: str, u=Depends(require_user)):
    await db.wishlists.update_one(
        {"user_id": u["user_id"]}, {"$addToSet": {"product_ids": pid}}, upsert=True,
    )
    return {"ok": True}

@api.delete("/wishlist/{pid}")
async def rm_wishlist(pid: str, u=Depends(require_user)):
    await db.wishlists.update_one({"user_id": u["user_id"]}, {"$pull": {"product_ids": pid}})
    return {"ok": True}


# ============================================================
# CART
# ============================================================
async def _cart_doc(user_id: str) -> dict:
    doc = await db.carts.find_one({"user_id": user_id}, {"_id": 0})
    return doc or {"user_id": user_id, "items": []}

async def _cart_response(user_id: str) -> dict:
    doc = await _cart_doc(user_id)
    if not doc.get("items"): return {"items": [], "subtotal": 0}
    ids = [i["product_id"] for i in doc["items"]]
    products = {p["id"]: p for p in await db.products.find({"id": {"$in": ids}}, {"_id": 0}).to_list(500)}
    items = []; subtotal = 0
    for it in doc["items"]:
        p = products.get(it["product_id"])
        if not p: continue
        line_total = p["price"] * it["qty"]
        subtotal += line_total
        items.append({"product_id": p["id"], "title": p["title"], "image": (p["images"] or [""])[0],
                     "price": p["price"], "mrp": p["mrp"], "qty": it["qty"], "line_total": line_total})
    return {"items": items, "subtotal": round(subtotal, 2)}

@api.get("/cart")
async def get_cart(u=Depends(require_user)):
    return await _cart_response(u["user_id"])

@api.post("/cart/add")
async def cart_add(item: CartItem, u=Depends(require_user)):
    doc = await _cart_doc(u["user_id"])
    items = doc["items"]
    for it in items:
        if it["product_id"] == item.product_id:
            it["qty"] += item.qty; break
    else:
        items.append({"product_id": item.product_id, "qty": item.qty})
    await db.carts.update_one({"user_id": u["user_id"]},
                              {"$set": {"items": items, "updated_at": now_utc().isoformat()}}, upsert=True)
    return await _cart_response(u["user_id"])

@api.post("/cart/update")
async def cart_update(item: CartItem, u=Depends(require_user)):
    doc = await _cart_doc(u["user_id"])
    items = [it for it in doc["items"] if it["product_id"] != item.product_id]
    if item.qty > 0:
        items.append({"product_id": item.product_id, "qty": item.qty})
    await db.carts.update_one({"user_id": u["user_id"]}, {"$set": {"items": items}}, upsert=True)
    return await _cart_response(u["user_id"])

@api.delete("/cart/{pid}")
async def cart_remove(pid: str, u=Depends(require_user)):
    await db.carts.update_one({"user_id": u["user_id"]}, {"$pull": {"items": {"product_id": pid}}})
    return await _cart_response(u["user_id"])


# ============================================================
# COUPONS
# ============================================================
@api.get("/coupons")
async def list_coupons():
    return await db.coupons.find({"active": True}, {"_id": 0}).to_list(100)

@api.post("/coupons/validate")
async def validate_coupon(request: Request):
    body = await request.json()
    code = body.get("code", "").upper().strip()
    subtotal = float(body.get("subtotal", 0))
    c = await db.coupons.find_one({"code": code, "active": True}, {"_id": 0})
    if not c: raise HTTPException(404, "Invalid coupon")
    if subtotal < c.get("min_order", 0):
        raise HTTPException(400, f"Minimum order €{c['min_order']} required")
    discount = round(subtotal * c.get("discount_percent", 0) / 100 + c.get("discount_flat", 0), 2)
    return {"code": code, "discount": discount, "description": c["description"]}


# ============================================================
# ORDERS + PAYMENT (Stripe via adapter pattern)
# ============================================================
class PaymentAdapter:
    """Adapter interface — Stripe now; Revolut/ApplePay/GooglePay can be added later."""
    async def create_checkout(self, amount: float, currency: str, success_url: str,
                              cancel_url: str, metadata: dict) -> Dict[str, str]:
        raise NotImplementedError
    async def get_status(self, session_id: str) -> Dict[str, Any]:
        raise NotImplementedError

class StripeAdapter(PaymentAdapter):
    def __init__(self, api_key: str, webhook_url: str):
        from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest
        self._sc = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
        self._req = CheckoutSessionRequest
    async def create_checkout(self, amount, currency, success_url, cancel_url, metadata):
        req = self._req(amount=amount, currency=currency, success_url=success_url,
                       cancel_url=cancel_url, metadata=metadata)
        s = await self._sc.create_checkout_session(req)
        return {"url": s.url, "session_id": s.session_id}
    async def get_status(self, session_id):
        s = await self._sc.get_checkout_status(session_id)
        return {"status": s.status, "payment_status": s.payment_status,
                "amount_total": s.amount_total, "currency": s.currency, "metadata": s.metadata}

def _payment_adapter(host_url: str) -> PaymentAdapter:
    return StripeAdapter(STRIPE_API_KEY, f"{host_url}api/webhook/stripe")


@api.post("/checkout/create")
async def checkout_create(request: Request, u=Depends(require_user)):
    body = await request.json()
    origin = body.get("origin_url", "").rstrip("/")
    address = Address(**body["address"])
    coupon_code = body.get("coupon_code")

    cart = await _cart_response(u["user_id"])
    if not cart["items"]: raise HTTPException(400, "Cart empty")
    subtotal = cart["subtotal"]
    discount = 0
    if coupon_code:
        c = await db.coupons.find_one({"code": coupon_code.upper(), "active": True}, {"_id": 0})
        if c and subtotal >= c.get("min_order", 0):
            discount = round(subtotal * c.get("discount_percent", 0)/100 + c.get("discount_flat", 0), 2)
    shipping = 0 if subtotal >= 50 else 4.99
    total = round(max(0, subtotal - discount) + shipping, 2)

    order = Order(
        user_id=u["user_id"],
        items=[{"product_id": i["product_id"], "title": i["title"], "image": i["image"],
                "qty": i["qty"], "price": i["price"]} for i in cart["items"]],
        subtotal=subtotal, discount=discount, shipping=shipping, total=total,
        coupon_code=coupon_code, address=address,
    )

    host_url = str(request.base_url)
    adapter = _payment_adapter(host_url)
    success_url = f"{origin}/order-success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/checkout?cancelled=1"

    session = await adapter.create_checkout(
        amount=float(total), currency="eur",
        success_url=success_url, cancel_url=cancel_url,
        metadata={"order_id": order.id, "user_id": u["user_id"], "brand": "mini-india"},
    )
    order.payment_session_id = session["session_id"]

    order_doc = order.model_dump()
    order_doc["created_at"] = order_doc["created_at"].isoformat()
    order_doc["address"] = address.model_dump()
    await db.orders.insert_one(order_doc)

    await db.payment_transactions.insert_one({
        "session_id": session["session_id"], "order_id": order.id,
        "user_id": u["user_id"], "amount": total, "currency": "eur",
        "payment_status": "initiated", "created_at": now_utc().isoformat(),
        "metadata": {"order_id": order.id},
    })

    # Clear cart
    await db.carts.update_one({"user_id": u["user_id"]}, {"$set": {"items": []}}, upsert=True)
    return {"checkout_url": session["url"], "session_id": session["session_id"], "order_id": order.id}


@api.get("/checkout/status/{session_id}")
async def checkout_status(session_id: str, request: Request):
    tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not tx: raise HTTPException(404, "Session not found")
    if tx["payment_status"] == "paid":
        return {"payment_status": "paid", "order_id": tx["order_id"]}
    host_url = str(request.base_url)
    adapter = _payment_adapter(host_url)
    st = await adapter.get_status(session_id)
    if st["payment_status"] == "paid" and tx["payment_status"] != "paid":
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"payment_status": "paid", "paid_at": now_utc().isoformat()}},
        )
        await db.orders.update_one(
            {"id": tx["order_id"]},
            {"$set": {"payment_status": "paid", "status": "paid"}},
        )
    return {"payment_status": st["payment_status"], "status": st["status"],
            "order_id": tx["order_id"]}

@api.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    sig = request.headers.get("Stripe-Signature", "")
    try:
        adapter = _payment_adapter(str(request.base_url))
        # Use underlying SDK to handle
        wh = await adapter._sc.handle_webhook(body, sig)
        if wh.payment_status == "paid":
            await db.payment_transactions.update_one(
                {"session_id": wh.session_id},
                {"$set": {"payment_status": "paid"}},
            )
            tx = await db.payment_transactions.find_one({"session_id": wh.session_id}, {"_id": 0})
            if tx:
                await db.orders.update_one(
                    {"id": tx["order_id"]},
                    {"$set": {"payment_status": "paid", "status": "paid"}},
                )
    except Exception as e:
        log.warning(f"webhook error: {e}")
    return {"received": True}


@api.get("/orders")
async def my_orders(u=Depends(require_user)):
    docs = await db.orders.find({"user_id": u["user_id"]}, {"_id": 0}).sort([("created_at", -1)]).to_list(200)
    return docs

@api.get("/orders/{oid}")
async def get_order(oid: str, u=Depends(require_user)):
    o = await db.orders.find_one({"id": oid}, {"_id": 0})
    if not o: raise HTTPException(404, "Order not found")
    if o["user_id"] != u["user_id"] and u.get("role") not in ("admin", "seller"):
        raise HTTPException(403, "Forbidden")
    return o


# ============================================================
# REVIEWS
# ============================================================
@api.get("/products/{pid}/reviews")
async def list_reviews(pid: str):
    return await db.reviews.find({"product_id": pid}, {"_id": 0}).sort([("created_at", -1)]).to_list(100)

@api.post("/products/{pid}/reviews")
async def add_review(pid: str, request: Request, u=Depends(require_user)):
    body = await request.json()
    r = Review(product_id=pid, user_id=u["user_id"], user_name=u.get("name", "Anon"),
               rating=int(body["rating"]), title=body.get("title"), body=body["body"])
    d = r.model_dump(); d["created_at"] = d["created_at"].isoformat()
    await db.reviews.insert_one(d)
    # update product rating
    all_r = await db.reviews.find({"product_id": pid}, {"_id": 0, "rating": 1}).to_list(1000)
    avg = sum(x["rating"] for x in all_r) / len(all_r)
    await db.products.update_one({"id": pid}, {"$set": {"rating": round(avg, 2), "review_count": len(all_r)}})
    return r


# ============================================================
# SELLER PORTAL
# ============================================================
@api.get("/seller/dashboard")
async def seller_dashboard(u=Depends(require_seller)):
    products = await db.products.count_documents({"seller_id": u["user_id"]})
    orders = await db.orders.find({"items.seller_id": u["user_id"]}, {"_id": 0}).to_list(500)
    # simplified: all orders count as seller's if seller = admin/seed
    all_orders = await db.orders.find({}, {"_id": 0}).sort([("created_at", -1)]).limit(10).to_list(10)
    revenue = sum(o.get("total", 0) for o in await db.orders.find({"payment_status": "paid"}, {"_id": 0}).to_list(10000))
    return {"products": products, "orders_recent": all_orders, "revenue": round(revenue, 2),
            "orders_count": await db.orders.count_documents({})}

@api.get("/seller/products")
async def seller_products(u=Depends(require_seller)):
    return await db.products.find({}, {"_id": 0}).sort([("created_at", -1)]).to_list(500)

@api.post("/seller/products")
async def seller_create_product(request: Request, u=Depends(require_seller)):
    body = await request.json()
    p = Product(seller_id=u["user_id"], **body)
    d = p.model_dump()
    d["created_at"] = d["created_at"].isoformat()
    await db.products.insert_one(d)
    return p

@api.put("/seller/products/{pid}")
async def seller_update_product(pid: str, request: Request, u=Depends(require_seller)):
    body = await request.json()
    body.pop("id", None); body.pop("_id", None)
    await db.products.update_one({"id": pid}, {"$set": body})
    return await db.products.find_one({"id": pid}, {"_id": 0})

@api.delete("/seller/products/{pid}")
async def seller_delete_product(pid: str, u=Depends(require_seller)):
    await db.products.delete_one({"id": pid})
    return {"ok": True}


# ============================================================
# ADMIN
# ============================================================
@api.get("/admin/stats")
async def admin_stats(u=Depends(require_admin)):
    users = await db.users.count_documents({})
    sellers = await db.users.count_documents({"role": "seller"})
    products = await db.products.count_documents({})
    orders = await db.orders.count_documents({})
    revenue = sum(o.get("total", 0) for o in await db.orders.find({"payment_status": "paid"}, {"_id": 0}).to_list(10000))
    pending = await db.products.count_documents({"is_approved": False})
    return {"users": users, "sellers": sellers, "products": products, "orders": orders,
            "revenue": round(revenue, 2), "pending_approvals": pending}

@api.get("/admin/users")
async def admin_users(u=Depends(require_admin)):
    return await db.users.find({}, {"_id": 0}).sort([("created_at", -1)]).to_list(500)

@api.put("/admin/users/{uid}/role")
async def admin_set_role(uid: str, request: Request, u=Depends(require_admin)):
    body = await request.json()
    role = body.get("role", "customer")
    if role not in ("customer", "seller", "admin"): raise HTTPException(400, "Invalid role")
    await db.users.update_one({"user_id": uid}, {"$set": {"role": role}})
    return {"ok": True}

@api.get("/admin/orders")
async def admin_orders(u=Depends(require_admin)):
    return await db.orders.find({}, {"_id": 0}).sort([("created_at", -1)]).to_list(500)

@api.put("/admin/orders/{oid}/status")
async def admin_update_order(oid: str, request: Request, u=Depends(require_admin)):
    body = await request.json()
    status = body["status"]
    await db.orders.update_one({"id": oid}, {"$set": {"status": status}})
    return {"ok": True}

@api.get("/admin/products/pending")
async def admin_pending(u=Depends(require_admin)):
    return await db.products.find({"is_approved": False}, {"_id": 0}).to_list(500)

@api.post("/admin/products/{pid}/approve")
async def admin_approve(pid: str, u=Depends(require_admin)):
    await db.products.update_one({"id": pid}, {"$set": {"is_approved": True}})
    return {"ok": True}

@api.post("/admin/coupons")
async def admin_coupon(request: Request, u=Depends(require_admin)):
    body = await request.json()
    c = Coupon(**body)
    d = c.model_dump()
    await db.coupons.update_one({"code": c.code}, {"$set": d}, upsert=True)
    return c


# ============================================================
# AI SHOPPING ASSISTANT (RAG over product catalog, streaming)
# ============================================================
async def _catalog_context(query: str) -> str:
    """Simple RAG: fetch top matching products for context."""
    filt: Dict[str, Any] = {"is_active": True}
    if query:
        filt["$or"] = [
            {"title": {"$regex": query, "$options": "i"}},
            {"description": {"$regex": query, "$options": "i"}},
            {"tags": {"$in": [query.lower()]}},
        ]
    prods = await db.products.find(filt, {"_id": 0, "title": 1, "price": 1, "description": 1, "rating": 1}).limit(6).to_list(6)
    if not prods:
        prods = await db.products.find({}, {"_id": 0, "title": 1, "price": 1, "description": 1, "rating": 1}).limit(6).to_list(6)
    ctx = "Relevant products:\n" + "\n".join(
        f"- {p['title']} — €{p['price']} (rating {p.get('rating', 0)}): {p['description'][:120]}"
        for p in prods
    )
    return ctx

@api.post("/chat/stream")
async def chat_stream(request: Request):
    body = await request.json()
    session_id = body.get("session_id") or new_id("chat_")
    message = body.get("message", "")
    if not message: raise HTTPException(400, "message required")

    # Store user message
    await db.chat_messages.insert_one({
        "session_id": session_id, "role": "user", "content": message,
        "ts": now_utc().isoformat(),
    })

    ctx = await _catalog_context(message)
    system = (
        "You are Mira, the friendly AI shopping assistant for Mini India — an online Indian street food, "
        "grocery & sweets store based in Ireland. You help customers discover products, compare items, answer "
        "FAQs about shipping, returns, and orders. Keep responses concise, warm and helpful. Use the product "
        "context below to ground answers. If asked something unrelated, gently steer back to shopping.\n\n" + ctx
    )

    async def event_gen():
        try:
            from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone
            chat = LlmChat(
                api_key=EMERGENT_LLM_KEY, session_id=session_id, system_message=system,
            ).with_model("openai", "gpt-4.1")
            assistant_text = ""
            async for ev in chat.stream_message(UserMessage(text=message)):
                if isinstance(ev, TextDelta):
                    assistant_text += ev.content
                    yield f"data: {json.dumps({'delta': ev.content})}\n\n"
                elif isinstance(ev, StreamDone):
                    break
            await db.chat_messages.insert_one({
                "session_id": session_id, "role": "assistant", "content": assistant_text,
                "ts": now_utc().isoformat(),
            })
            yield f"data: {json.dumps({'done': True, 'session_id': session_id})}\n\n"
        except Exception as e:
            log.error(f"chat err: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(event_gen(), media_type="text/event-stream",
                            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

@api.get("/chat/history/{session_id}")
async def chat_history(session_id: str):
    msgs = await db.chat_messages.find({"session_id": session_id}, {"_id": 0}).sort([("ts", 1)]).to_list(500)
    return msgs


# ============================================================
# HEALTH + ROOT
# ============================================================
@api.get("/")
async def root(): return {"service": "Mini India API", "version": "1.0.0", "status": "ok"}

@api.get("/health")
async def health(): return {"ok": True, "time": now_utc().isoformat()}


# ============================================================
# SEED (idempotent — reseeds when scraped Mini India catalog is missing)
# ============================================================
SEED_MARKER = "miniindia-scrape-v1"  # bump to force re-seed
CATALOG_PATH = ROOT_DIR / "miniindia_products.json"

# Category branding overlays — icon-style hero images pulled from real products
CAT_META = {
    6:  ("bundles",   "Bundles & Offers"),
    13: ("kitchen",   "Kitchen Essentials"),
    14: ("snacks",    "Snacks & Savouries"),
    22: ("grains",    "Rice & Flour"),
    30: ("grocery",   "Grocery & Ready Meals"),
    33: ("spices",    "Spices & Masala"),
    39: ("ayurveda",  "Ayurveda, Oil & Ghee"),
    43: ("pooja",     "Pooja & Devotional"),
    58: ("chocolate", "Chocolates & Sweets"),
    61: ("sweets",    "Dates & Indian Sweets"),
    62: ("beverages", "Beverages"),
    85: ("lentils",   "Grains & Lentils"),
    86: ("fresh",     "Fresh & More"),
}

# Fallback image for products with "no.webp" placeholder
NO_IMG_FALLBACK = "https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8?w=800"

def _slugify(s: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9]+", "-", s.lower()).strip("-")
    return s[:80] or "product"

def _brand_from_title(title: str) -> Optional[str]:
    """Extract brand from title's first word(s). Common Indian grocery brands."""
    known = {
        "haldirams": "brd_haldirams", "haldiram": "brd_haldirams",
        "bikano": "brd_bikano", "maggi": "brd_maggi", "chings": "brd_chings",
        "binge": "brd_binge", "telugu": "brd_telugu", "mdh": "brd_mdh",
        "everest": "brd_everest", "tata": "brd_tata", "ashoka": "brd_ashoka",
        "heera": "brd_heera", "deep": "brd_deep", "britannia": "brd_britannia",
        "parle": "brd_parle", "amul": "brd_amul", "patanjali": "brd_patanjali",
        "dabur": "brd_dabur", "himalaya": "brd_himalaya", "priya": "brd_priya",
        "mtr": "brd_mtr", "gits": "brd_gits", "vandevi": "brd_vandevi",
        "aashirvaad": "brd_tata", "kohinoor": "brd_kohinoor", "chefs": "brd_chefschoice",
        "nestle": "brd_nestle", "cadbury": "brd_cadbury", "wagh": "brd_waghbakri",
        "24 mantra": "brd_24mantra", "24mantra": "brd_24mantra",
        "mini india": "brd_miniindia", "kissan": "brd_kissan",
    }
    low = title.lower()
    for k, v in known.items():
        if low.startswith(k) or f" {k} " in f" {low} ":
            return v
    return None

async def seed_data():
    marker = await db.app_meta.find_one({"_id": "seed_marker"})
    if marker and marker.get("value") == SEED_MARKER:
        return
    if not CATALOG_PATH.exists():
        log.warning(f"No {CATALOG_PATH} — skipping catalog seed")
        return
    log.info("Seeding Mini India catalog from scraped JSON…")

    data = json.loads(CATALOG_PATH.read_text())
    raw_prods = data["products"]

    # Wipe old catalog
    await db.products.delete_many({})
    await db.categories.delete_many({})
    await db.brands.delete_many({})
    await db.coupons.delete_many({})

    # Determine categories actually used
    used_cats = sorted({p["category_id"] for p in raw_prods})
    # Pick a representative image per category from its first product with a real image
    cat_img = {}
    for p in raw_prods:
        cid = p["category_id"]
        if cid not in cat_img and p["image"] and "no.webp" not in p["image"]:
            cat_img[cid] = p["image"]

    cats = []
    for cid in used_cats:
        slug, name = CAT_META.get(cid, (f"cat-{cid}", f"Category {cid}"))
        cats.append({
            "id": f"cat_{slug}", "name": name, "slug": slug,
            "image": cat_img.get(cid, NO_IMG_FALLBACK),
        })
    await db.categories.insert_many(cats)
    cat_map = {cid: f"cat_{CAT_META.get(cid, (f'cat-{cid}',))[0]}" for cid in used_cats}

    # Collect brands from titles
    brand_ids: Dict[str, dict] = {}
    for p in raw_prods:
        bid = _brand_from_title(p["title"])
        if bid and bid not in brand_ids:
            # Turn brand-id into a display name
            name = bid.replace("brd_", "").replace("mantra", " Mantra").title()
            name = {"brd_mdh": "MDH", "brd_mtr": "MTR", "brd_miniindia": "Mini India",
                    "brd_waghbakri": "Wagh Bakri", "brd_chefschoice": "Chef's Choice",
                    "brd_24mantra": "24 Mantra"}.get(bid, name)
            brand_ids[bid] = {"id": bid, "name": name, "slug": bid.replace("brd_", "")}
    # Add a fallback "Other" brand
    brand_ids["brd_other"] = {"id": "brd_other", "name": "Other", "slug": "other"}
    await db.brands.insert_many(list(brand_ids.values()))

    # Build products
    seen_slugs = set()
    docs = []
    for p in raw_prods:
        title = p["title"]
        slug = _slugify(title)
        base = slug; i = 2
        while slug in seen_slugs:
            slug = f"{base}-{i}"; i += 1
        seen_slugs.add(slug)
        img = p["image"] or ""
        if "no.webp" in img or not img:
            img = NO_IMG_FALLBACK
        prod = Product(
            title=title, slug=slug, description=title + " — genuine Indian grocery, delivered fresh across Ireland by Mini India.",
            price=float(p["price"]), mrp=float(p["mrp"] or p["price"]),
            category_id=cat_map[p["category_id"]],
            brand_id=_brand_from_title(title) or "brd_other",
            images=[img],
            tags=[t.strip().lower() for t in re.split(r"[ ,]+", title) if len(t.strip()) > 2][:8],
            rating=round(4.2 + (int(p["pid"]) % 8) / 10, 1),
            review_count=(int(p["pid"]) % 200) + 12,
        ).model_dump()
        prod["created_at"] = prod["created_at"].isoformat()
        docs.append(prod)
    await db.products.insert_many(docs)

    await db.coupons.insert_many([
        {"code": "WELCOME10", "description": "10% off your first order", "discount_percent": 10,
         "discount_flat": 0, "min_order": 20, "active": True},
        {"code": "FREESHIP", "description": "Free shipping on orders €30+", "discount_percent": 0,
         "discount_flat": 4.99, "min_order": 30, "active": True},
        {"code": "SAVE5", "description": "€5 off orders over €40", "discount_percent": 0,
         "discount_flat": 5, "min_order": 40, "active": True},
    ])

    await db.app_meta.update_one({"_id": "seed_marker"},
                                 {"$set": {"value": SEED_MARKER}}, upsert=True)
    log.info(f"Seeded {len(docs)} Mini India products, {len(cats)} categories, {len(brand_ids)} brands")


@app.on_event("startup")
async def startup():
    await db.products.create_index("id", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.users.create_index("email", unique=True)
    await db.orders.create_index("id", unique=True)
    await db.user_sessions.create_index("session_token", unique=True)
    await seed_data()

@app.on_event("shutdown")
async def shutdown(): client.close()

app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"], allow_headers=["*"],
)
