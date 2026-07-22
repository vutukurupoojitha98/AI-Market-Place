import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api, { fmt } from "@/lib/api";
import { useAuth, useCart } from "@/lib/store";

export default function Checkout() {
  const { user, loading } = useAuth();
  const cart = useCart();
  const nav = useNavigate();
  const [addr, setAddr] = useState({ name: "", line1: "", city: "Dublin", country: "Ireland", postal_code: "", phone: "" });
  const [coupon, setCoupon] = useState("");
  const [discount, setDiscount] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { nav("/login", { state: { from: "/checkout" } }); return; }
    cart.refresh();
    setAddr((a) => ({ ...a, name: user.name || "" }));
    // eslint-disable-next-line
  }, [user, loading]);

  const applyCoupon = async () => {
    if (!coupon.trim()) return;
    try {
      const { data } = await api.post("/coupons/validate", { code: coupon, subtotal: cart.subtotal });
      setDiscount(data.discount);
      toast.success(`Coupon applied: -${fmt(data.discount)}`);
    } catch (e) { toast.error(e.response?.data?.detail || "Invalid coupon"); setDiscount(0); }
  };

  const submit = async (e) => {
    e.preventDefault();
    for (const f of ["name","line1","city","postal_code","phone"]) {
      if (!addr[f]) return toast.error("Fill all address fields");
    }
    setSubmitting(true);
    try {
      const { data } = await api.post("/checkout/create", {
        origin_url: window.location.origin,
        address: addr,
        coupon_code: coupon || null,
      });
      window.location.href = data.checkout_url;
    } catch (e) { toast.error(e.response?.data?.detail || "Checkout failed"); setSubmitting(false); }
  };

  if (loading || !user || cart.items.length === 0)
    return <div className="mx-auto max-w-4xl px-4 py-24 text-center">Loading…</div>;

  const shipping = cart.subtotal >= 50 ? 0 : 4.99;
  const total = Math.max(0, cart.subtotal - discount) + shipping;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8" data-testid="checkout-page">
      <h1 className="font-display font-bold text-3xl mb-6">Checkout</h1>
      <form onSubmit={submit} className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
        <div className="space-y-6">
          <div className="border border-border rounded-sm p-6">
            <h3 className="font-bold mb-4">Shipping Address</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                ["name","Full name"], ["phone","Phone"], ["line1","Address","sm:col-span-2"],
                ["city","City"], ["postal_code","Eircode/Postcode"], ["country","Country","sm:col-span-2"],
              ].map(([k,l,c]) => (
                <div key={k} className={c || ""}>
                  <label className="block text-xs uppercase tracking-widest font-bold text-muted-foreground mb-1">{l}</label>
                  <input value={addr[k]} onChange={(e) => setAddr({...addr, [k]: e.target.value})}
                    data-testid={`addr-${k}`}
                    className="w-full px-3 py-2 border border-border rounded-sm bg-white dark:bg-neutral-900"/>
                </div>
              ))}
            </div>
          </div>
          <div className="border border-border rounded-sm p-6">
            <h3 className="font-bold mb-4">Coupon Code</h3>
            <div className="flex gap-2">
              <input value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                placeholder="e.g. WELCOME10" data-testid="coupon-input"
                className="flex-1 px-3 py-2 border border-border rounded-sm bg-white dark:bg-neutral-900"/>
              <button type="button" onClick={applyCoupon} data-testid="apply-coupon"
                className="px-4 py-2 border border-primary text-primary rounded-sm hover:bg-primary hover:text-white text-sm font-bold">Apply</button>
            </div>
            <div className="text-xs text-muted-foreground mt-2">Try WELCOME10, FREESHIP, SAVE5</div>
          </div>
        </div>

        <div className="border border-border rounded-sm p-6 h-fit sticky top-24">
          <h3 className="font-bold mb-4">Order Summary</h3>
          <div className="space-y-2 max-h-56 overflow-y-auto mb-4 text-sm">
            {cart.items.map((it) => (
              <div key={it.product_id} className="flex gap-2 items-center">
                <img src={it.image} className="w-10 h-10 object-cover rounded-sm" alt=""/>
                <div className="flex-1 min-w-0"><div className="truncate">{it.title}</div><div className="text-muted-foreground text-xs">×{it.qty}</div></div>
                <div className="font-medium">{fmt(it.line_total)}</div>
              </div>
            ))}
          </div>
          <div className="border-t border-border pt-3 space-y-1 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{fmt(cart.subtotal)}</span></div>
            {discount > 0 && <div className="flex justify-between text-primary"><span>Discount</span><span>-{fmt(discount)}</span></div>}
            <div className="flex justify-between"><span>Shipping</span><span>{shipping === 0 ? "FREE" : fmt(shipping)}</span></div>
            <div className="border-t border-border pt-2 mt-2 flex justify-between font-bold text-base"><span>Total</span><span>{fmt(total)}</span></div>
          </div>
          <button type="submit" disabled={submitting} data-testid="pay-btn"
            className="btn-accent w-full mt-6 py-3 rounded-sm font-bold disabled:opacity-50">
            {submitting ? "Redirecting…" : `Pay ${fmt(total)}`}
          </button>
        </div>
      </form>
    </div>
  );
}
