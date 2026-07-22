import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/lib/store";

export default function AuthCallback() {
  const nav = useNavigate();
  const { setUser } = useAuth();

  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.slice(1));
    const sid = params.get("session_id");
    if (!sid) { nav("/login"); return; }
    (async () => {
      try {
        const { data } = await api.post("/auth/session", { session_id: sid });
        setUser(data);
        toast.success(`Welcome, ${data.name}!`);
        // Clean URL
        window.history.replaceState({}, "", "/");
        nav("/");
      } catch { toast.error("Sign-in failed"); nav("/login"); }
    })();
  }, []); // eslint-disable-line

  return (
    <div className="mx-auto max-w-md px-4 py-32 text-center">
      <div className="w-12 h-12 mx-auto mb-4 rounded-full border-4 border-primary border-t-transparent animate-spin"/>
      <div className="text-sm text-muted-foreground">Completing sign-in…</div>
    </div>
  );
}
