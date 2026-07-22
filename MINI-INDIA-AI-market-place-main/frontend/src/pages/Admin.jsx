import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, Users, Package, Coin, ChartBar } from "@phosphor-icons/react";
import api, { fmt } from "@/lib/api";
import { useAuth } from "@/lib/store";

export default function Admin() {
  const { user } = useAuth();
  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [pending, setPending] = useState([]);
  const [couponForm, setCouponForm] = useState({ code: "", description: "", discount_percent: 10, discount_flat: 0, min_order: 0, active: true });

  const load = async () => {
    const [s, u, o, p] = await Promise.all([
      api.get("/admin/stats"), api.get("/admin/users"),
      api.get("/admin/orders"), api.get("/admin/products/pending"),
    ]);
    setStats(s.data); setUsers(u.data); setOrders(o.data); setPending(p.data);
  };
  useEffect(() => { if (user?.role === "admin") load().catch(() => toast.error("Access denied")); }, [user]);

  if (!user) return <div className="p-16 text-center">Please sign in.</div>;
  if (user.role !== "admin") return <div className="p-16 text-center">Admin access required.</div>;
  if (!stats) return <div className="p-16 text-center">Loading…</div>;

  const setRole = async (uid, role) => { await api.put(`/admin/users/${uid}/role`, { role }); toast.success("Updated"); load(); };
  const setOrderStatus = async (oid, status) => { await api.put(`/admin/orders/${oid}/status`, { status }); toast.success("Updated"); load(); };
  const approve = async (pid) => { await api.post(`/admin/products/${pid}/approve`); toast.success("Approved"); load(); };
  const saveCoupon = async (e) => {
    e.preventDefault();
    await api.post("/admin/coupons", couponForm);
    toast.success("Coupon saved");
    setCouponForm({ code: "", description: "", discount_percent: 10, discount_flat: 0, min_order: 0, active: true });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8" data-testid="admin-page">
      <div className="flex items-center gap-3 mb-6">
        <ShieldCheck size={32} className="text-primary" weight="duotone"/>
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Portal</div>
          <h1 className="font-display font-bold text-2xl">Admin Dashboard</h1>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {[
          {icon: Users, label: "Users", value: stats.users},
          {icon: ChartBar, label: "Sellers", value: stats.sellers},
          {icon: Package, label: "Products", value: stats.products},
          {icon: Package, label: "Orders", value: stats.orders},
          {icon: Coin, label: "Revenue", value: fmt(stats.revenue)},
        ].map((k, i) => (
          <div key={i} className="border border-border rounded-sm p-4">
            <k.icon size={22} className="text-primary mb-2"/>
            <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">{k.label}</div>
            <div className="font-display font-black text-xl mt-1">{k.value}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 border-b border-border mb-6">
        {["overview","users","orders","approvals","coupons"].map((t) => (
          <button key={t} onClick={() => setTab(t)} data-testid={`admin-tab-${t}`}
            className={`px-4 py-2 text-sm capitalize border-b-2 -mb-px ${tab === t ? "border-primary text-primary font-bold" : "border-transparent text-muted-foreground"}`}>{t}</button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="border border-border rounded-sm p-5">
            <h3 className="font-bold mb-3">Pending Approvals</h3>
            <div className="text-3xl font-display font-black text-brand-orange">{stats.pending_approvals}</div>
            <div className="text-xs text-muted-foreground">products awaiting review</div>
          </div>
          <div className="border border-border rounded-sm p-5">
            <h3 className="font-bold mb-3">Recent orders</h3>
            <ul className="space-y-2 text-sm">
              {orders.slice(0,5).map((o) => (
                <li key={o.id} className="flex justify-between"><span className="font-mono text-xs">{o.id.slice(-8)}</span><span>{fmt(o.total)}</span><span className="text-xs uppercase">{o.status}</span></li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {tab === "users" && (
        <div className="border border-border rounded-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60"><tr className="text-left"><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Role</th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.user_id} className="border-t border-border">
                  <td className="p-3">{u.name}</td>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3">
                    <select value={u.role} onChange={(e) => setRole(u.user_id, e.target.value)} data-testid={`role-${u.user_id}`}
                      className="px-2 py-1 border border-border rounded-sm bg-white dark:bg-neutral-900">
                      <option value="customer">customer</option><option value="seller">seller</option><option value="admin">admin</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "orders" && (
        <div className="border border-border rounded-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60"><tr className="text-left"><th className="p-3">Order</th><th className="p-3">User</th><th className="p-3">Total</th><th className="p-3">Payment</th><th className="p-3">Status</th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-t border-border">
                  <td className="p-3 font-mono text-xs">{o.id.slice(-8)}</td>
                  <td className="p-3 text-xs">{o.user_id.slice(-8)}</td>
                  <td className="p-3">{fmt(o.total)}</td>
                  <td className="p-3">{o.payment_status}</td>
                  <td className="p-3">
                    <select value={o.status} onChange={(e) => setOrderStatus(o.id, e.target.value)}
                      className="px-2 py-1 border border-border rounded-sm bg-white dark:bg-neutral-900">
                      {["pending","paid","shipped","delivered","cancelled"].map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "approvals" && (
        <div className="space-y-3">
          {pending.length === 0 && <div className="text-muted-foreground">No pending approvals.</div>}
          {pending.map((p) => (
            <div key={p.id} className="border border-border rounded-sm p-4 flex items-center gap-4">
              <img src={p.images?.[0]} className="w-16 h-16 rounded-sm object-cover" alt=""/>
              <div className="flex-1">
                <div className="font-bold">{p.title}</div>
                <div className="text-sm text-muted-foreground">{fmt(p.price)}</div>
              </div>
              <button onClick={() => approve(p.id)} className="btn-primary px-4 py-2 rounded-sm text-sm font-bold">Approve</button>
            </div>
          ))}
        </div>
      )}

      {tab === "coupons" && (
        <form onSubmit={saveCoupon} className="border border-border rounded-sm p-6 max-w-2xl grid grid-cols-2 gap-3">
          {[["code","Code"],["description","Description","col-span-2"],
            ["discount_percent","% Off","","number"],["discount_flat","Flat Off (€)","","number"],
            ["min_order","Min order (€)","col-span-2","number"]].map(([k,l,c,t]) => (
            <div key={k} className={c}>
              <label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">{l}</label>
              <input type={t||"text"} value={couponForm[k]}
                onChange={(e) => setCouponForm({...couponForm, [k]: t === "number" ? Number(e.target.value) : e.target.value})}
                className="w-full px-3 py-2 border border-border rounded-sm bg-white dark:bg-neutral-900"/>
            </div>
          ))}
          <div className="col-span-2">
            <button type="submit" className="btn-primary px-6 py-2 rounded-sm font-bold">Save coupon</button>
          </div>
        </form>
      )}
    </div>
  );
}
