import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Trash, ShoppingCart } from "@phosphor-icons/react";
import { toast } from "sonner";
import { fmt } from "@/lib/api";
import { useAuth, useCart } from "@/lib/store";

export default function Cart() {
  const { user, loading } = useAuth();
  const cart = useCart();
  const nav = useNavigate();
  useEffect(() => { if (user) cart.refresh(); }, [user]);

  if (loading) return null;
  if (!user) return (
    <div className="mx-auto max-w-4xl px-4 py-24 text-center">
      <ShoppingCart size={64} className="mx-auto text-muted-foreground mb-4"/>
      <h2 className="font-display font-bold text-2xl mb-2">Please sign in</h2>
      <p className="text-muted-foreground mb-6">Sign in to view your cart.</p>
      <Link to="/login" className="btn-primary px-6 py-3 rounded-sm font-bold">Sign In</Link>
    </div>
  );

  if (cart.items.length === 0) return (
    <div className="mx-auto max-w-4xl px-4 py-24 text-center" data-testid="empty-cart">
      <ShoppingCart size={64} className="mx-auto text-muted-foreground mb-4"/>
      <h2 className="font-display font-bold text-2xl mb-2">Your cart is empty</h2>
      <Link to="/products" className="btn-primary inline-block px-6 py-3 rounded-sm font-bold mt-4">Browse products</Link>
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8" data-testid="cart-page">
      <h1 className="font-display font-bold text-3xl mb-6">Shopping Cart</h1>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
        <div className="space-y-4">
          {cart.items.map((it) => (
            <div key={it.product_id} className="flex gap-4 p-4 border border-border rounded-sm" data-testid={`cart-item-${it.product_id}`}>
              <img src={it.image || "https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8?w=400"} alt=""
                onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8?w=400"; }}
                referrerPolicy="no-referrer"
                className="w-24 h-24 object-cover rounded-sm"/>
              <div className="flex-1 min-w-0">
                <Link to={`/products/${it.product_id}`} className="font-medium hover:text-primary line-clamp-2">{it.title}</Link>
                <div className="text-sm text-muted-foreground mt-1">{fmt(it.price)} each</div>
                <div className="flex items-center gap-2 mt-3">
                  <div className="flex items-center border border-border rounded-sm">
                    <button onClick={() => cart.update(it.product_id, it.qty-1)} className="px-2 py-1 hover:bg-secondary">−</button>
                    <span className="w-8 text-center text-sm">{it.qty}</span>
                    <button onClick={() => cart.update(it.product_id, it.qty+1)} className="px-2 py-1 hover:bg-secondary">+</button>
                  </div>
                  <button onClick={() => cart.remove(it.product_id)} data-testid={`remove-${it.product_id}`}
                    className="p-2 text-muted-foreground hover:text-destructive"><Trash size={16}/></button>
                </div>
              </div>
              <div className="text-right font-bold">{fmt(it.line_total)}</div>
            </div>
          ))}
        </div>
        <div className="border border-border rounded-sm p-6 h-fit sticky top-24">
          <h3 className="font-bold mb-4">Order Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{fmt(cart.subtotal)}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>Shipping</span><span>{cart.subtotal >= 50 ? "FREE" : fmt(4.99)}</span></div>
            <div className="border-t border-border pt-2 mt-2 flex justify-between font-bold text-base"><span>Total</span><span>{fmt(cart.subtotal + (cart.subtotal >= 50 ? 0 : 4.99))}</span></div>
          </div>
          <button onClick={() => nav("/checkout")} data-testid="checkout-btn"
            className="btn-accent w-full mt-6 py-3 rounded-sm font-bold">Proceed to Checkout</button>
          <div className="text-xs text-muted-foreground text-center mt-2">Secure payment via Stripe</div>
        </div>
      </div>
    </div>
  );
}
