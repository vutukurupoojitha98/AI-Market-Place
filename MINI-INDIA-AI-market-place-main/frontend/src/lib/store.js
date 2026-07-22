import { create } from "zustand";
import api from "@/lib/api";

export const useAuth = create((set, get) => ({
  user: null, loading: true,
  setUser: (user) => set({ user, loading: false }),
  fetchMe: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get("/auth/me");
      set({ user: data, loading: false });
    } catch { set({ user: null, loading: false }); }
  },
  logout: async () => {
    await api.post("/auth/logout");
    set({ user: null });
  },
}));

export const useCart = create((set, get) => ({
  items: [], subtotal: 0, count: 0,
  refresh: async () => {
    if (!useAuth.getState().user) { set({ items: [], subtotal: 0, count: 0 }); return; }
    try {
      const { data } = await api.get("/cart");
      set({ items: data.items || [], subtotal: data.subtotal || 0,
            count: (data.items || []).reduce((s, i) => s + i.qty, 0) });
    } catch { /* not logged in */ }
  },
  add: async (product_id, qty = 1) => {
    const { data } = await api.post("/cart/add", { product_id, qty });
    set({ items: data.items, subtotal: data.subtotal,
          count: data.items.reduce((s, i) => s + i.qty, 0) });
  },
  update: async (product_id, qty) => {
    const { data } = await api.post("/cart/update", { product_id, qty });
    set({ items: data.items, subtotal: data.subtotal,
          count: data.items.reduce((s, i) => s + i.qty, 0) });
  },
  remove: async (product_id) => {
    const { data } = await api.delete(`/cart/${product_id}`);
    set({ items: data.items, subtotal: data.subtotal,
          count: data.items.reduce((s, i) => s + i.qty, 0) });
  },
}));
