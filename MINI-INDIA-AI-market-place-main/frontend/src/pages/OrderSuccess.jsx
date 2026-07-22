import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle } from "@phosphor-icons/react";
import api from "@/lib/api";

export default function OrderSuccess() {
  const [sp] = useSearchParams();
  const sid = sp.get("session_id");
  const [status, setStatus] = useState("checking");
  const [orderId, setOrderId] = useState(null);

  useEffect(() => {
    if (!sid) { setStatus("error"); return; }
    let attempts = 0;
    const poll = async () => {
      attempts += 1;
      if (attempts > 8) { setStatus("timeout"); return; }
      try {
        const { data } = await api.get(`/checkout/status/${sid}`);
        if (data.payment_status === "paid") {
          setStatus("paid"); setOrderId(data.order_id); return;
        }
        setTimeout(poll, 2000);
      } catch { setTimeout(poll, 2000); }
    };
    poll();
  }, [sid]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center" data-testid="order-success-page">
      {status === "checking" && (<>
        <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-primary border-t-transparent animate-spin"/>
        <h1 className="font-display font-bold text-2xl">Confirming your payment…</h1>
      </>)}
      {status === "paid" && (<>
        <CheckCircle size={80} weight="fill" className="mx-auto text-primary mb-4"/>
        <h1 className="font-display font-bold text-3xl mb-2">Order confirmed!</h1>
        <p className="text-muted-foreground mb-6">Thank you. We'll email you the details shortly.</p>
        <div className="text-xs text-muted-foreground mb-6">Order ID: <span className="font-mono">{orderId}</span></div>
        <div className="flex gap-3 justify-center">
          <Link to="/orders" className="btn-primary px-6 py-3 rounded-sm font-bold">View orders</Link>
          <Link to="/products" className="px-6 py-3 rounded-sm font-bold border border-border">Continue shopping</Link>
        </div>
      </>)}
      {(status === "error" || status === "timeout") && (<>
        <h1 className="font-display font-bold text-2xl">Something went wrong</h1>
        <p className="text-muted-foreground mt-2 mb-6">Please check your orders in a moment.</p>
        <Link to="/orders" className="btn-primary px-6 py-3 rounded-sm font-bold">My Orders</Link>
      </>)}
    </div>
  );
}
