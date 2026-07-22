import { Link, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { MagnifyingGlass, ShoppingCart, Heart, User, List, X, SignOut, Package, Storefront, ShieldCheck } from "@phosphor-icons/react";
import { useAuth, useCart } from "@/lib/store";
import api from "@/lib/api";

export default function Navbar() {
  const { user, logout } = useAuth();
  const cart = useCart();
  const nav = useNavigate();
  const loc = useLocation();
  const [q, setQ] = useState("");
  const [suggest, setSuggest] = useState([]);
  const [showS, setShowS] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef();

  useEffect(() => { cart.refresh(); /* eslint-disable-next-line */ }, [user]);
  useEffect(() => { setMobile(false); setMenuOpen(false); }, [loc.pathname]);

  useEffect(() => {
    if (!q || q.length < 2) { setSuggest([]); return; }
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get(`/products/search-suggest?q=${encodeURIComponent(q)}`);
        setSuggest(data.items || []);
      } catch { /* ignore */ }
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const onClick = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const doSearch = (e) => {
    e?.preventDefault();
    if (!q.trim()) return;
    setShowS(false);
    nav(`/products?q=${encodeURIComponent(q)}`);
  };

  return (
    <header className="sticky top-0 z-40 glass" data-testid="site-navbar">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 h-16">
          <Link to="/" className="flex items-center gap-2 shrink-0" data-testid="logo-link">
            <img src="/logo.png" alt="Mini India" className="h-11 sm:h-12 w-auto"/>
          </Link>

          <form onSubmit={doSearch} className="flex-1 max-w-2xl relative">
            <div className="relative">
              <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text" value={q}
                onChange={(e) => { setQ(e.target.value); setShowS(true); }}
                onFocus={() => setShowS(true)}
                onBlur={() => setTimeout(() => setShowS(false), 150)}
                placeholder="Search spices, snacks, sweets, brands…"
                data-testid="search-input"
                className="w-full pl-10 pr-4 py-2.5 rounded-sm bg-white/80 dark:bg-black/30 border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              />
            </div>
            {showS && suggest.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-neutral-900 border border-border rounded-sm shadow-xl overflow-hidden">
                {suggest.map((s) => (
                  <Link key={s.id} to={`/products/${s.id}`} data-testid={`suggest-${s.id}`}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-secondary text-sm">
                    <img src={s.images?.[0]} alt="" className="w-8 h-8 object-cover rounded-sm" />
                    <span className="flex-1 truncate">{s.title}</span>
                    <span className="text-xs text-muted-foreground">€{s.price}</span>
                  </Link>
                ))}
              </div>
            )}
          </form>

          <nav className="hidden md:flex items-center gap-1">
            <Link to="/products" className="px-3 py-2 text-sm hover:text-primary" data-testid="nav-shop">Shop</Link>
            {user && (
              <Link to="/wishlist" className="p-2 hover:text-primary" data-testid="nav-wishlist">
                <Heart size={20} />
              </Link>
            )}
            <Link to="/cart" className="relative p-2 hover:text-primary" data-testid="nav-cart">
              <ShoppingCart size={20} />
              {cart.count > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-brand-orange text-white text-[11px] font-bold flex items-center justify-center">
                  {cart.count}
                </span>
              )}
            </Link>
            {user ? (
              <div className="relative" ref={menuRef}>
                <button onClick={() => setMenuOpen(!menuOpen)} data-testid="user-menu-btn"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-sm hover:bg-secondary">
                  {user.picture ? (
                    <img src={user.picture} alt="" className="w-7 h-7 rounded-full" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-brand-green text-white flex items-center justify-center text-xs font-bold">
                      {user.name?.[0]?.toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm max-w-[100px] truncate">{user.name}</span>
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-neutral-900 border border-border rounded-sm shadow-xl overflow-hidden py-1">
                    <div className="px-3 py-2 border-b border-border">
                      <div className="text-sm font-medium truncate">{user.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                      <div className="text-[10px] uppercase tracking-widest mt-1 text-primary">{user.role}</div>
                    </div>
                    <Link to="/orders" data-testid="menu-orders" className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary"><Package size={16}/>My Orders</Link>
                    {(user.role === "seller" || user.role === "admin") && (
                      <Link to="/seller" data-testid="menu-seller" className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary"><Storefront size={16}/>Seller Portal</Link>
                    )}
                    {user.role === "admin" && (
                      <Link to="/admin" data-testid="menu-admin" className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary"><ShieldCheck size={16}/>Admin Portal</Link>
                    )}
                    <button onClick={() => { logout(); nav("/"); }} data-testid="menu-logout"
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary text-left"><SignOut size={16}/>Sign Out</button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" data-testid="nav-login"
                className="ml-2 btn-primary px-4 py-2 rounded-sm text-sm font-medium">Sign In</Link>
            )}
          </nav>

          <button className="md:hidden p-2" onClick={() => setMobile(!mobile)} data-testid="mobile-menu-btn">
            {mobile ? <X size={22}/> : <List size={22}/>}
          </button>
        </div>

        {mobile && (
          <div className="md:hidden border-t border-border py-2 space-y-1" data-testid="mobile-menu">
            <Link to="/products" className="block px-3 py-2 hover:bg-secondary rounded-sm">Shop</Link>
            <Link to="/cart" className="block px-3 py-2 hover:bg-secondary rounded-sm">Cart ({cart.count})</Link>
            {user && <Link to="/wishlist" className="block px-3 py-2 hover:bg-secondary rounded-sm">Wishlist</Link>}
            {user && <Link to="/orders" className="block px-3 py-2 hover:bg-secondary rounded-sm">My Orders</Link>}
            {(user?.role === "seller" || user?.role === "admin") && <Link to="/seller" className="block px-3 py-2 hover:bg-secondary rounded-sm">Seller</Link>}
            {user?.role === "admin" && <Link to="/admin" className="block px-3 py-2 hover:bg-secondary rounded-sm">Admin</Link>}
            {user ? (
              <button onClick={() => { logout(); nav("/"); }} className="block w-full text-left px-3 py-2 hover:bg-secondary rounded-sm">Sign Out</button>
            ) : (
              <Link to="/login" className="block px-3 py-2 bg-brand-green text-white rounded-sm mx-3">Sign In</Link>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
