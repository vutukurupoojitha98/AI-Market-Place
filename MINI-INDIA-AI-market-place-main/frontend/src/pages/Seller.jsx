import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Storefront, Package, ChartLine, Coin } from "@phosphor-icons/react";
import api, { fmt } from "@/lib/api";
import { useAuth } from "@/lib/store";

export default function Seller() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [products, setProducts] = useState([]);
  const [cats, setCats] = useState([]);
  const [form, setForm] = useState(null);

  const load = async () => {
    const [s, p, c] = await Promise.all([
      api.get("/seller/dashboard"), api.get("/seller/products"), api.get("/categories"),
    ]);
    setStats(s.data); setProducts(p.data); setCats(c.data);
  };
  useEffect(() => { if (user) load().catch(() => toast.error("Access denied")); }, [user]);

  if (!user) return <div className="p-16 text-center">Please sign in.</div>;
  if (user.role !== "seller" && user.role !== "admin")
    return <div className="p-16 text-center">Seller access required. Ask an admin to grant seller role.</div>;
  if (!stats) return <div className="p-16 text-center">Loading…</div>;

  const emptyForm = () => ({ title: "", slug: "", description: "", price: 0, mrp: 0,
                             category_id: cats[0]?.id || "", images: [""], stock: 100, tags: [] });
  const save = async (e) => {
    e.preventDefault();
    const payload = { ...form, images: form.images.filter(Boolean), tags: (form.tags?.join?.(",") ? form.tags : String(form.tags||"").split(",").map(t=>t.trim()).filter(Boolean)) };
    try {
      if (form.id) await api.put(`/seller/products/${form.id}`, payload);
      else await api.post("/seller/products", payload);
      toast.success("Saved"); setForm(null); load();
    } catch (e) { toast.error(e.response?.data?.detail || "Save failed"); }
  };
  const del = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    await api.delete(`/seller/products/${id}`); toast.success("Deleted"); load();
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8" data-testid="seller-page">
      <div className="flex items-center gap-3 mb-6">
        <Storefront size={32} className="text-primary" weight="duotone"/>
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Portal</div>
          <h1 className="font-display font-bold text-2xl">Seller Dashboard</h1>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          {icon: Package, label: "Products", value: stats.products},
          {icon: ChartLine, label: "Orders", value: stats.orders_count},
          {icon: Coin, label: "Revenue", value: fmt(stats.revenue)},
          {icon: Storefront, label: "Recent orders", value: stats.orders_recent.length},
        ].map((k, i) => (
          <div key={i} className="border border-border rounded-sm p-5">
            <k.icon size={24} className="text-primary mb-2"/>
            <div className="text-xs uppercase tracking-widest font-bold text-muted-foreground">{k.label}</div>
            <div className="font-display font-black text-2xl mt-1">{k.value}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-bold text-xl">Products</h2>
        <button onClick={() => setForm(emptyForm())} data-testid="new-product-btn"
          className="btn-primary px-4 py-2 rounded-sm text-sm font-bold">+ New Product</button>
      </div>

      <div className="border border-border rounded-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60">
            <tr className="text-left"><th className="p-3">Product</th><th className="p-3">Category</th><th className="p-3">Price</th><th className="p-3">Stock</th><th className="p-3"></th></tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="p-3"><div className="flex items-center gap-2"><img src={p.images?.[0]} className="w-10 h-10 rounded-sm object-cover" alt=""/><span className="line-clamp-1">{p.title}</span></div></td>
                <td className="p-3">{cats.find((c) => c.id === p.category_id)?.name || "—"}</td>
                <td className="p-3">{fmt(p.price)}</td>
                <td className="p-3">{p.stock}</td>
                <td className="p-3 text-right">
                  <button onClick={() => setForm({...p, images: p.images.length ? p.images : [""]})} data-testid={`edit-${p.id}`} className="text-primary hover:underline mr-3">Edit</button>
                  <button onClick={() => del(p.id)} className="text-destructive hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={save} className="bg-white dark:bg-neutral-900 w-full max-w-2xl rounded-sm border border-border p-6 max-h-[90vh] overflow-y-auto" data-testid="product-form">
            <h3 className="font-bold text-lg mb-4">{form.id ? "Edit" : "New"} Product</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[["title","Title","sm:col-span-2"],["slug","Slug"],["category_id","Category"],
                ["price","Price (€)","","number"],["mrp","MRP (€)","","number"],["stock","Stock","","number"],
                ["description","Description","sm:col-span-2","textarea"]].map(([k,l,c,t]) => (
                <div key={k} className={c}>
                  <label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">{l}</label>
                  {k === "category_id" ? (
                    <select value={form[k]} onChange={(e) => setForm({...form, [k]: e.target.value})}
                      className="w-full px-3 py-2 border border-border rounded-sm bg-white dark:bg-neutral-900">
                      {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  ) : t === "textarea" ? (
                    <textarea value={form[k]} onChange={(e) => setForm({...form, [k]: e.target.value})}
                      className="w-full px-3 py-2 border border-border rounded-sm bg-white dark:bg-neutral-900" rows={3}/>
                  ) : (
                    <input type={t||"text"} value={form[k]} onChange={(e) => setForm({...form, [k]: t==="number" ? Number(e.target.value) : e.target.value})}
                      className="w-full px-3 py-2 border border-border rounded-sm bg-white dark:bg-neutral-900"/>
                  )}
                </div>
              ))}
              <div className="sm:col-span-2">
                <label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Image URL</label>
                <input value={form.images[0] || ""} onChange={(e) => setForm({...form, images: [e.target.value]})}
                  placeholder="https://…" className="w-full px-3 py-2 border border-border rounded-sm bg-white dark:bg-neutral-900"/>
              </div>
            </div>
            <div className="flex gap-2 mt-6 justify-end">
              <button type="button" onClick={() => setForm(null)} className="px-4 py-2 border border-border rounded-sm">Cancel</button>
              <button type="submit" data-testid="save-product" className="btn-primary px-4 py-2 rounded-sm font-bold">Save</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
