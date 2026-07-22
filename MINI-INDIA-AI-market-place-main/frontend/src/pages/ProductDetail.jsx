import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Star, ShoppingCart, Heart, Truck, ShieldCheck, ArrowClockwise } from "@phosphor-icons/react";
import { toast } from "sonner";
import api, { fmt } from "@/lib/api";
import { useAuth, useCart } from "@/lib/store";
import ProductCard from "@/components/ProductCard";

const FALLBACK = "https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8?w=800";

export default function ProductDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const cart = useCart();
  const [p, setP] = useState(null);
  const [related, setRelated] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [qty, setQty] = useState(1);
  const [img, setImg] = useState(0);
  const [rev, setRev] = useState({ rating: 5, body: "" });

  useEffect(() => {
    setImg(0);
    api.get(`/products/${id}`).then((r) => setP(r.data));
    api.get(`/products/${id}/related`).then((r) => setRelated(r.data));
    api.get(`/products/${id}/reviews`).then((r) => setReviews(r.data));
  }, [id]);

  const add = async () => {
    if (!user) return toast.error("Please sign in first");
    await cart.add(p.id, qty);
    toast.success("Added to cart");
  };
  const buy = async () => {
    if (!user) return toast.error("Please sign in first");
    await cart.add(p.id, qty);
    window.location.href = "/checkout";
  };
  const addWish = async () => {
    if (!user) return toast.error("Please sign in first");
    await api.post(`/wishlist/${p.id}`);
    toast.success("Added to wishlist");
  };
  const submitReview = async (e) => {
    e.preventDefault();
    if (!user) return toast.error("Sign in to review");
    if (!rev.body.trim()) return;
    await api.post(`/products/${id}/reviews`, rev);
    setRev({ rating: 5, body: "" });
    const [pRes, rRes] = await Promise.all([api.get(`/products/${id}`), api.get(`/products/${id}/reviews`)]);
    setP(pRes.data); setReviews(rRes.data);
    toast.success("Review posted!");
  };

  if (!p) return <div className="mx-auto max-w-7xl px-4 py-16"><div className="h-96 shimmer rounded-sm"/></div>;
  const discount = p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8" data-testid="product-detail-page">
      <nav className="text-xs text-muted-foreground mb-4">
        <Link to="/" className="hover:text-primary">Home</Link> / <Link to="/products" className="hover:text-primary">Products</Link> / <span>{p.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-8 lg:gap-12">
        <div>
          <div className="aspect-square rounded-sm overflow-hidden bg-secondary mb-3">
            <img src={p.images[img] || FALLBACK} alt={p.title}
              onError={(e) => { if (e.currentTarget.src !== FALLBACK) e.currentTarget.src = FALLBACK; }}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"/>
          </div>
          {p.images.length > 1 && (
            <div className="flex gap-2">
              {p.images.map((src, i) => (
                <button key={i} onClick={() => setImg(i)} data-testid={`thumb-${i}`}
                  className={`w-20 h-20 rounded-sm overflow-hidden border-2 ${i === img ? "border-primary" : "border-transparent"}`}>
                  <img src={src} className="w-full h-full object-cover" alt=""/>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <h1 className="font-display font-bold text-3xl sm:text-4xl mb-3">{p.title}</h1>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-1 bg-brand-green text-white px-2 py-0.5 rounded-sm text-sm">
              <Star size={14} weight="fill"/> <span className="font-bold">{p.rating}</span>
            </div>
            <span className="text-sm text-muted-foreground">{p.review_count} reviews</span>
          </div>

          <div className="flex items-baseline gap-3 mb-6">
            <span className="font-display font-black text-4xl text-primary">{fmt(p.price, p.currency)}</span>
            {p.mrp > p.price && (
              <>
                <span className="text-lg text-muted-foreground line-through">{fmt(p.mrp, p.currency)}</span>
                <span className="text-sm bg-brand-orange/10 text-brand-orange font-bold px-2 py-0.5 rounded-sm">-{discount}%</span>
              </>
            )}
          </div>

          <p className="text-muted-foreground mb-6 leading-relaxed">{p.description}</p>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center border border-border rounded-sm">
              <button onClick={() => setQty(Math.max(1, qty-1))} data-testid="qty-minus" className="px-3 py-2 hover:bg-secondary">−</button>
              <span className="w-10 text-center text-sm" data-testid="qty-value">{qty}</span>
              <button onClick={() => setQty(qty+1)} data-testid="qty-plus" className="px-3 py-2 hover:bg-secondary">+</button>
            </div>
            <button onClick={add} data-testid="add-to-cart-btn"
              className="btn-primary flex-1 sm:flex-none px-6 py-3 rounded-sm font-bold flex items-center justify-center gap-2">
              <ShoppingCart size={18} weight="bold"/> Add to Cart
            </button>
            <button onClick={buy} data-testid="buy-now-btn"
              className="btn-accent flex-1 sm:flex-none px-6 py-3 rounded-sm font-bold">Buy Now</button>
            <button onClick={addWish} data-testid="wishlist-btn"
              className="p-3 border border-border rounded-sm hover:text-brand-orange hover:border-brand-orange"><Heart size={20}/></button>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-6 border-t border-border text-xs">
            <div className="flex flex-col items-center text-center gap-1"><Truck size={20} className="text-primary"/><span>Fast delivery</span></div>
            <div className="flex flex-col items-center text-center gap-1"><ShieldCheck size={20} className="text-primary"/><span>Authentic guarantee</span></div>
            <div className="flex flex-col items-center text-center gap-1"><ArrowClockwise size={20} className="text-primary"/><span>Easy returns</span></div>
          </div>
        </div>
      </div>

      {/* Reviews */}
      <section className="mt-16" data-testid="reviews-section">
        <h2 className="font-display font-bold text-2xl mb-6">Customer Reviews</h2>
        {user && (
          <form onSubmit={submitReview} className="mb-8 p-5 border border-border rounded-sm">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-medium">Your rating:</span>
              {[1,2,3,4,5].map((n) => (
                <button type="button" key={n} onClick={() => setRev({...rev, rating: n})} data-testid={`rate-${n}`}>
                  <Star size={22} weight={n <= rev.rating ? "fill" : "regular"} className={n <= rev.rating ? "text-brand-orange" : "text-muted-foreground"}/>
                </button>
              ))}
            </div>
            <textarea value={rev.body} onChange={(e) => setRev({...rev, body: e.target.value})}
              placeholder="Share your thoughts..." data-testid="review-body"
              className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-white dark:bg-neutral-900" rows={3}/>
            <button type="submit" data-testid="review-submit" className="mt-2 btn-primary px-4 py-2 rounded-sm text-sm font-bold">Post review</button>
          </form>
        )}
        <div className="space-y-4">
          {reviews.length === 0 && <div className="text-muted-foreground text-sm">No reviews yet.</div>}
          {reviews.map((r) => (
            <div key={r.id} className="p-4 border border-border rounded-sm">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-full bg-brand-green text-white flex items-center justify-center text-xs font-bold">{r.user_name[0]?.toUpperCase()}</div>
                <div className="text-sm font-medium">{r.user_name}</div>
                <div className="flex items-center gap-0.5 ml-2">
                  {[1,2,3,4,5].map((n) => (
                    <Star key={n} size={12} weight={n <= r.rating ? "fill" : "regular"} className="text-brand-orange"/>
                  ))}
                </div>
              </div>
              <p className="text-sm">{r.body}</p>
            </div>
          ))}
        </div>
      </section>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="font-display font-bold text-2xl mb-6">You may also like</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {related.map((r, i) => <ProductCard key={r.id} p={r} index={i}/>)}
          </div>
        </section>
      )}
    </div>
  );
}
