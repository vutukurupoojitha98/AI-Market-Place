import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { GoogleLogo, Envelope } from "@phosphor-icons/react";
import api from "@/lib/api";
import { useAuth } from "@/lib/store";

export default function Login() {
  const { fetchMe } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  const googleLogin = () => {
    const redirectUrl = window.location.origin + "/";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const devLogin = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      await api.post("/auth/dev-login", { email: email.trim(), name: name.trim() || email.split("@")[0] });
      await fetchMe();
      toast.success("Signed in!");
      nav(loc.state?.from || "/");
    } catch (e) { toast.error("Login failed"); }
    finally { setLoading(false); }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16" data-testid="login-page">
      <div className="text-center mb-8">
        <img src="/logo.png" alt="Mini India" className="h-16 w-auto mx-auto mb-6"/>
        <h1 className="font-display font-black text-3xl mb-2">Welcome to Mini India</h1>
        <p className="text-muted-foreground text-sm">Sign in to shop and track your orders.</p>
      </div>
      <div className="border border-border rounded-sm p-6 space-y-4">
        <button onClick={googleLogin} data-testid="google-login-btn"
          className="w-full flex items-center justify-center gap-2 py-3 rounded-sm bg-white border border-border hover:bg-secondary font-medium text-neutral-900">
          <GoogleLogo size={20} weight="bold"/> Continue with Google
        </button>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex-1 h-px bg-border"/>OR<div className="flex-1 h-px bg-border"/>
        </div>
        <form onSubmit={devLogin} className="space-y-3">
          <label className="block text-xs uppercase tracking-widest font-bold text-muted-foreground">Email (quick sign-in)</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            data-testid="email-input"
            placeholder="you@example.com"
            className="w-full px-3 py-2.5 border border-border rounded-sm bg-white dark:bg-neutral-900"/>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            data-testid="name-input"
            placeholder="Your name (optional)"
            className="w-full px-3 py-2.5 border border-border rounded-sm bg-white dark:bg-neutral-900"/>
          <button type="submit" disabled={loading} data-testid="email-login-btn"
            className="btn-primary w-full py-3 rounded-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
            <Envelope size={18}/> {loading ? "Signing in…" : "Continue with Email"}
          </button>
        </form>
        <p className="text-xs text-muted-foreground text-center">
          The first user to register becomes the admin.
        </p>
      </div>
    </div>
  );
}
