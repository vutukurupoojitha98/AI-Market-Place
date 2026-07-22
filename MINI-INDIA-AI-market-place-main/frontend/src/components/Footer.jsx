export default function Footer() {
  return (
    <footer className="mt-24 border-t border-border bg-secondary/30" data-testid="site-footer">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="col-span-2 md:col-span-1">
          <div className="mb-3">
            <img src="/logo.png" alt="Mini India" className="h-12 w-auto"/>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Premium Indian street food, grocery & sweets delivered across Ireland. Authentic taste, curated brands, honest pricing.
          </p>
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.2em] font-bold text-muted-foreground mb-3">Shop</div>
          <ul className="space-y-2 text-sm">
            <li><a href="/products" className="hover:text-primary">All Products</a></li>
            <li><a href="/products?category=cat_snacks" className="hover:text-primary">Snacks & Namkeen</a></li>
            <li><a href="/products?category=cat_sweets" className="hover:text-primary">Sweets & Mithai</a></li>
            <li><a href="/products?category=cat_pooja" className="hover:text-primary">Pooja Items</a></li>
          </ul>
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.2em] font-bold text-muted-foreground mb-3">Support</div>
          <ul className="space-y-2 text-sm">
            <li><a href="#" className="hover:text-primary">Shipping</a></li>
            <li><a href="#" className="hover:text-primary">Returns</a></li>
            <li><a href="#" className="hover:text-primary">FAQ</a></li>
            <li><a href="#" className="hover:text-primary">Contact</a></li>
          </ul>
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.2em] font-bold text-muted-foreground mb-3">Company</div>
          <ul className="space-y-2 text-sm">
            <li><a href="#" className="hover:text-primary">About</a></li>
            <li><a href="#" className="hover:text-primary">Careers</a></li>
            <li><a href="#" className="hover:text-primary">Privacy</a></li>
            <li><a href="#" className="hover:text-primary">Terms</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Mini India. All rights reserved. Powered by enterprise architecture.
      </div>
    </footer>
  );
}
