import { Link } from "react-router-dom";
import { Star, ShoppingCart } from "@phosphor-icons/react";
import { fmt } from "@/lib/api";
import { useAuth, useCart } from "@/lib/store";
import { toast } from "sonner";

const FALLBACK = "https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8?w=800";

export default function ProductCard({ p, index = 0 }) {
  const { user } = useAuth();
  const cart = useCart();
  const discount = p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;
  const onAdd = async (e) => {
    e.preventDefault(); e.stopPropagation();
    if (!user) { toast.error("Please sign in to add to cart"); return; }
    await cart.add(p.id, 1);
    toast.success(`${p.title} added to cart`);
  };
  return (
    <Link to={`/products/${p.id}`} data-testid={`product-card-${p.id}`}
      className="product-card group block bg-white dark:bg-neutral-900 rounded-sm overflow-hidden fade-in-up"
      style={{ animationDelay: `${index * 40}ms` }}>
      <div className="relative aspect-square bg-secondary overflow-hidden">
        <img src={p.images?.[0] || FALLBACK} alt={p.title}
          onError={(e) => { if (e.currentTarget.src !== FALLBACK) e.currentTarget.src = FALLBACK; }}
          className="product-image w-full h-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
        {discount > 0 && (
          <span className="absolute top-2 left-2 bg-brand-orange text-white text-[11px] font-bold px-2 py-0.5 rounded-sm">
            -{discount}%
          </span>
        )}
        <button onClick={onAdd} data-testid={`add-cart-${p.id}`}
          className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-200 bg-brand-green text-white p-2 rounded-full shadow-lg hover:bg-brand-orange">
          <ShoppingCart size={16} weight="bold" />
        </button>
      </div>
      <div className="p-3 sm:p-4">
        <h3 className="text-sm font-medium line-clamp-2 min-h-[2.5rem] group-hover:text-primary">{p.title}</h3>
        <div className="flex items-center gap-1 mt-2">
          <Star size={12} weight="fill" className="text-brand-orange" />
          <span className="text-xs font-medium">{p.rating}</span>
          <span className="text-xs text-muted-foreground">({p.review_count})</span>
        </div>
        <div className="flex items-baseline gap-2 mt-2">
          <span className="text-lg font-display font-bold text-primary">{fmt(p.price, p.currency)}</span>
          {p.mrp > p.price && (
            <span className="text-xs text-muted-foreground line-through">{fmt(p.mrp, p.currency)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
