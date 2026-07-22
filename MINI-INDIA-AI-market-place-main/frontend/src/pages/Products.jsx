import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Funnel, X } from "@phosphor-icons/react";
import api from "@/lib/api";
import ProductCard from "@/components/ProductCard";

export default function Products() {
  const [sp, setSp] = useSearchParams();
  const [data, setData] = useState({ items: [], total: 0, pages: 1 });
  const [cats, setCats] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const q = sp.get("q") || "";
  const category = sp.get("category") || "";
  const brand = sp.get("brand") || "";
  const sort = sp.get("sort") || "relevance";
  const page = parseInt(sp.get("page") || "1");
  const minP = sp.get("min_price") || "";
  const maxP = sp.get("max_price") || "";

  useEffect(() => {
    api.get("/categories").then((r) => setCats(r.data));
    api.get("/brands").then((r) => setBrands(r.data));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (category) params.set("category", category);
    if (brand) params.set("brand", brand);
    if (sort) params.set("sort", sort);
    if (page) params.set("page", page);
    if (minP) params.set("min_price", minP);
    if (maxP) params.set("max_price", maxP);
    params.set("limit", "20");
    api.get(`/products?${params}`).then((r) => { setData(r.data); setLoading(false); });
  }, [q, category, brand, sort, page, minP, maxP]);

  const update = (k, v) => {
    const p = new URLSearchParams(sp);
    if (v) p.set(k, v); else p.delete(k);
    if (k !== "page") p.delete("page");
    setSp(p);
  };
  const clear = () => setSp(new URLSearchParams());

  const Filters = () => (
    <div className="space-y-6 text-sm">
      <div>
        <div className="text-xs uppercase tracking-[0.2em] font-bold text-muted-foreground mb-2">Category</div>
        <div className="space-y-1">
          <button onClick={() => update("category", "")} className={`block w-full text-left py-1 ${!category ? "text-primary font-bold" : ""}`}>All</button>
          {cats.map((c) => (
            <button key={c.id} onClick={() => update("category", c.id)} data-testid={`filter-cat-${c.slug}`}
              className={`block w-full text-left py-1 hover:text-primary ${category === c.id ? "text-primary font-bold" : ""}`}>{c.name}</button>
          ))}
        </div>
      </div>
      <div>
        <div className="text-xs uppercase tracking-[0.2em] font-bold text-muted-foreground mb-2">Brand</div>
        <div className="space-y-1">
          <button onClick={() => update("brand", "")} className={`block w-full text-left py-1 ${!brand ? "text-primary font-bold" : ""}`}>All</button>
          {brands.map((b) => (
            <button key={b.id} onClick={() => update("brand", b.id)}
              className={`block w-full text-left py-1 hover:text-primary ${brand === b.id ? "text-primary font-bold" : ""}`}>{b.name}</button>
          ))}
        </div>
      </div>
      <div>
        <div className="text-xs uppercase tracking-[0.2em] font-bold text-muted-foreground mb-2">Price (€)</div>
        <div className="flex gap-2">
          <input type="number" value={minP} onChange={(e) => update("min_price", e.target.value)}
            placeholder="Min" data-testid="filter-min-price"
            className="w-full px-2 py-1.5 border border-border rounded-sm bg-white dark:bg-neutral-900"/>
          <input type="number" value={maxP} onChange={(e) => update("max_price", e.target.value)}
            placeholder="Max" data-testid="filter-max-price"
            className="w-full px-2 py-1.5 border border-border rounded-sm bg-white dark:bg-neutral-900"/>
        </div>
      </div>
      <button onClick={clear} className="w-full px-3 py-2 border border-border rounded-sm hover:bg-secondary">Clear filters</button>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8" data-testid="products-page">
      <div className="mb-6">
        <h1 className="font-display font-bold text-3xl sm:text-4xl">
          {q ? `Search: "${q}"` : category ? cats.find((c) => c.id === category)?.name : "All Products"}
        </h1>
        <div className="text-sm text-muted-foreground mt-1">{data.total} products found</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8">
        <aside className="hidden lg:block sticky top-24 self-start">
          <Filters/>
        </aside>

        <div>
          <div className="flex items-center justify-between mb-4 gap-3">
            <button onClick={() => setShowFilters(true)} data-testid="mobile-filters-btn"
              className="lg:hidden flex items-center gap-2 px-3 py-2 border border-border rounded-sm text-sm">
              <Funnel size={16}/> Filters
            </button>
            <div className="ml-auto flex items-center gap-2 text-sm">
              <label className="text-muted-foreground">Sort:</label>
              <select value={sort} onChange={(e) => update("sort", e.target.value)}
                data-testid="sort-select"
                className="px-3 py-2 border border-border rounded-sm bg-white dark:bg-neutral-900">
                <option value="relevance">Relevance</option>
                <option value="price_asc">Price: low to high</option>
                <option value="price_desc">Price: high to low</option>
                <option value="rating">Rating</option>
                <option value="newest">Newest</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-sm shimmer"/>
              ))}
            </div>
          ) : data.items.length === 0 ? (
            <div className="py-24 text-center text-muted-foreground">
              No products match your filters. <button onClick={clear} className="text-primary underline">Clear</button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6" data-testid="products-grid">
                {data.items.map((p, i) => <ProductCard key={p.id} p={p} index={i}/>)}
              </div>
              {data.pages > 1 && (
                <div className="mt-10 flex items-center justify-center gap-2">
                  {Array.from({ length: data.pages }).map((_, i) => (
                    <button key={i} onClick={() => update("page", i+1)}
                      className={`w-9 h-9 rounded-sm text-sm ${page === i+1 ? "bg-brand-green text-white" : "border border-border hover:bg-secondary"}`}>{i+1}</button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="fixed inset-0 z-50 lg:hidden" data-testid="mobile-filters">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowFilters(false)}/>
          <div className="absolute right-0 top-0 bottom-0 w-80 max-w-full bg-white dark:bg-neutral-900 p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="font-bold">Filters</div>
              <button onClick={() => setShowFilters(false)}><X size={20}/></button>
            </div>
            <Filters/>
          </div>
        </div>
      )}
    </div>
  );
}
