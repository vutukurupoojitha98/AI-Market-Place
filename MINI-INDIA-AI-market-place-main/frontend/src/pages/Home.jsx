import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Truck, ShieldCheck, Leaf, Storefront } from "@phosphor-icons/react";
import api from "@/lib/api";
import ProductCard from "@/components/ProductCard";

export default function Home() {
  const [cats, setCats] = useState([]);
  const [trending, setTrending] = useState([]);

  useEffect(() => {
    api.get("/categories").then((r) => setCats(r.data));
    api.get("/products/trending").then((r) => setTrending(r.data));
  }, []);

  return (
    <div data-testid="home-page">
      {/* HERO — asymmetric bento */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
          <div className="lg:col-span-8 relative rounded-sm overflow-hidden bg-brand-green text-white min-h-[400px] lg:min-h-[500px] flex items-end">
            <img src="https://images.unsplash.com/photo-1638378545909-d78bd9b4271c?w=1400"
                 alt="" className="absolute inset-0 w-full h-full object-cover mix-blend-multiply opacity-60" />
            <div className="relative p-8 lg:p-14 max-w-2xl fade-in-up">
              <span className="inline-block text-xs uppercase tracking-[0.3em] font-bold bg-white/20 backdrop-blur px-3 py-1 rounded-sm mb-6">
                Street food · Grocery · Sweets · Ireland
              </span>
              <h1 className="font-display font-black text-4xl sm:text-5xl lg:text-7xl leading-[0.95] mb-4">
                A little slice<br/><span className="text-brand-orange">of India, at home.</span>
              </h1>
              <p className="text-base sm:text-lg opacity-90 mb-8 max-w-xl">
                Hand-picked spices, iconic sweets and everyday essentials from India — delivered fresh across Ireland.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link to="/products" data-testid="hero-shop-btn"
                  className="btn-accent px-6 py-3 rounded-sm font-bold inline-flex items-center gap-2">
                  Shop Now <ArrowRight size={18} weight="bold"/>
                </Link>
                <Link to="/products?category=cat_sweets" data-testid="hero-spices-btn"
                  className="px-6 py-3 rounded-sm font-bold border border-white/40 hover:bg-white/10 inline-flex items-center gap-2">
                  Explore Sweets
                </Link>
              </div>
            </div>
          </div>
          <div className="lg:col-span-4 grid grid-cols-2 lg:grid-cols-1 gap-4 lg:gap-6">
            <div className="relative rounded-sm overflow-hidden bg-white border border-border p-6 min-h-[190px] flex items-center justify-center">
              <img src="/logo.png" alt="Mini India" className="max-h-32 w-auto"/>
            </div>
            <div className="relative rounded-sm overflow-hidden bg-brand-orange text-white p-6 min-h-[190px] flex flex-col justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] opacity-90">Welcome offer</div>
                <div className="font-display font-black text-3xl lg:text-4xl mt-1">10% OFF</div>
                <div className="text-sm opacity-90 mt-1">First order — code WELCOME10</div>
              </div>
              <Link to="/products" className="text-sm font-bold underline underline-offset-4">Redeem →</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trust badges */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mb-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Truck, label: "Fast delivery", sub: "Nationwide 2–3 days" },
            { icon: ShieldCheck, label: "Authentic brands", sub: "100% genuine" },
            { icon: Leaf, label: "Fresh stock", sub: "Rotated weekly" },
            { icon: Storefront, label: "Sellers welcome", sub: "Grow with us" },
          ].map((b, i) => (
            <div key={i} className="p-5 border border-border rounded-sm flex items-start gap-3">
              <b.icon size={28} className="text-primary shrink-0" weight="duotone"/>
              <div>
                <div className="text-sm font-bold">{b.label}</div>
                <div className="text-xs text-muted-foreground">{b.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mb-16">
        <div className="flex items-end justify-between mb-6">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-bold">Categories</div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold mt-1">Shop by aisle</h2>
          </div>
          <Link to="/products" className="text-sm font-medium text-primary hover:underline">View all →</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {cats.map((c) => (
            <Link key={c.id} to={`/products?category=${c.id}`} data-testid={`cat-${c.slug}`}
              className="group relative aspect-square rounded-sm overflow-hidden bg-secondary">
              <img src={c.image} alt={c.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <div className="text-white font-display font-bold text-sm sm:text-base">{c.name}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Trending */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mb-16">
        <div className="flex items-end justify-between mb-6">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-brand-orange font-bold">Trending</div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold mt-1">Best sellers this week</h2>
          </div>
          <Link to="/products?sort=rating" className="text-sm font-medium text-primary hover:underline">See all →</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {trending.map((p, i) => <ProductCard key={p.id} p={p} index={i}/>)}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mb-16">
        <div className="relative rounded-sm overflow-hidden bg-neutral-900 text-white p-8 sm:p-14">
          <div className="max-w-2xl">
            <div className="text-xs uppercase tracking-[0.2em] text-brand-orange font-bold">Sell on Mini India</div>
            <h3 className="font-display text-3xl sm:text-4xl font-bold mt-2 mb-4">
              Reach thousands of Indian households across Ireland.
            </h3>
            <p className="opacity-80 mb-6">
              Join our seller program — enterprise-grade tools, real-time analytics, and dedicated support.
            </p>
            <Link to="/login" data-testid="seller-cta"
              className="btn-accent inline-flex items-center gap-2 px-6 py-3 rounded-sm font-bold">
              Become a seller <ArrowRight size={18} weight="bold"/>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}