import { useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ChatWidget from "@/components/ChatWidget";
import Home from "@/pages/Home";
import Products from "@/pages/Products";
import ProductDetail from "@/pages/ProductDetail";
import Cart from "@/pages/Cart";
import Checkout from "@/pages/Checkout";
import OrderSuccess from "@/pages/OrderSuccess";
import Orders from "@/pages/Orders";
import Wishlist from "@/pages/Wishlist";
import Login from "@/pages/Login";
import AuthCallback from "@/pages/AuthCallback";
import Seller from "@/pages/Seller";
import Admin from "@/pages/Admin";
import { useAuth } from "@/lib/store";

function AppRouter() {
  const loc = useLocation();
  // Handle Emergent OAuth callback (session_id in URL fragment) BEFORE any auth check
  if (loc.hash?.includes("session_id=")) return <AuthCallback/>;

  return (
    <Routes>
      <Route path="/" element={<Home/>}/>
      <Route path="/products" element={<Products/>}/>
      <Route path="/products/:id" element={<ProductDetail/>}/>
      <Route path="/cart" element={<Cart/>}/>
      <Route path="/checkout" element={<Checkout/>}/>
      <Route path="/order-success" element={<OrderSuccess/>}/>
      <Route path="/orders" element={<Orders/>}/>
      <Route path="/wishlist" element={<Wishlist/>}/>
      <Route path="/login" element={<Login/>}/>
      <Route path="/seller" element={<Seller/>}/>
      <Route path="/admin" element={<Admin/>}/>
      <Route path="*" element={<div className="p-24 text-center"><h2 className="font-display font-bold text-2xl">404</h2><a href="/" className="text-primary">Go home</a></div>}/>
    </Routes>
  );
}

function App() {
  const { fetchMe } = useAuth();
  useEffect(() => {
    // Skip /auth/me if returning from OAuth callback (AuthCallback will handle it)
    if (window.location.hash?.includes("session_id=")) return;
    fetchMe();
  }, []); // eslint-disable-line

  return (
    <div className="App min-h-screen flex flex-col">
      <BrowserRouter>
        <Navbar/>
        <main className="flex-1">
          <AppRouter/>
        </main>
        <Footer/>
        <ChatWidget/>
      </BrowserRouter>
      <Toaster position="top-right" richColors/>
    </div>
  );
}

export default App;
