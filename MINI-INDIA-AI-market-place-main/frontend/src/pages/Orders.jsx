import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Package } from "@phosphor-icons/react";
import api, { fmt } from "@/lib/api";
import { useAuth } from "@/lib/store";

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);

  useEffect(() => { if (user) api.get("/orders").then((r) => setOrders(r.data)); }, [user]);

  if (!user) return <div className="mx-auto max-w-4xl px-4 py-24 text-center">Please sign in.</div>;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8" data-testid="orders-page">
      <h1 className="font-display font-bold text-3xl mb-6">My Orders</h1>
      {orders.length === 0 ? (
        <div className="text-center py-16">
          <Package size={48} className="mx-auto mb-3 text-muted-foreground"/>
          <div className="text-muted-foreground">No orders yet.</div>
          <Link to="/products" className="inline-block mt-4 btn-primary px-6 py-3 rounded-sm font-bold">Start shopping</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <div key={o.id} className="border border-border rounded-sm p-5" data-testid={`order-${o.id}`}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Order #{o.id.slice(-8)}</div>
                  <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</div>
                </div>
                <span className={`text-xs uppercase tracking-widest font-bold px-2 py-0.5 rounded-sm ${
                  o.status === "paid" || o.status === "delivered" ? "bg-primary text-white" :
                  o.status === "shipped" ? "bg-brand-orange text-white" : "bg-secondary"}`}>{o.status}</span>
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                {o.items.slice(0,4).map((it, i) => (
                  <img key={i} src={it.image} className="w-14 h-14 object-cover rounded-sm" alt=""/>
                ))}
              </div>
              <div className="flex justify-between items-center text-sm">
                <div>{o.items.length} items · {o.payment_status}</div>
                <div className="font-bold">{fmt(o.total)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
