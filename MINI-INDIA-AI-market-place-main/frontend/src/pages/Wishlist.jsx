import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heart } from "@phosphor-icons/react";
import api from "@/lib/api";
import { useAuth } from "@/lib/store";
import ProductCard from "@/components/ProductCard";

export default function Wishlist() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);

  useEffect(() => { if (user) api.get("/wishlist").then((r) => setItems(r.data.items)); }, [user]);

  if (!user) return <div className="mx-auto max-w-4xl px-4 py-24 text-center">Please sign in.</div>;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8" data-testid="wishlist-page">
      <h1 className="font-display font-bold text-3xl mb-6">My Wishlist</h1>
      {items.length === 0 ? (
        <div className="text-center py-16">
          <Heart size={48} className="mx-auto text-muted-foreground mb-3"/>
          <div className="text-muted-foreground">Your wishlist is empty.</div>
          <Link to="/products" className="inline-block mt-4 btn-primary px-6 py-3 rounded-sm font-bold">Browse</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {items.map((p, i) => <ProductCard key={p.id} p={p} index={i}/>)}
        </div>
      )}
    </div>
  );
}
