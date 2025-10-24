import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";
import { WishlistProvider } from "@/contexts/WishlistContext";
import Index from "./pages/Index";
import Shop from "./pages/Shop";
import ProductDetail from "./pages/ProductDetail";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Auth from "./pages/Auth";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Dashboard from "./pages/admin/Dashboard";
import Products from "./pages/admin/Products";
import Categories from "./pages/admin/Categories";
import Orders from "./pages/admin/Orders";
import Admins from "./pages/admin/Admins";
import PhoneNumbers from "./pages/admin/PhoneNumbers";
import ShopLocations from "./pages/admin/ShopLocations";
import PaymentMethods from "./pages/admin/PaymentMethods";
import Messages from "./pages/admin/Messages";
import SocialLinks from "./pages/admin/SocialLinks";
import Subscribers from "./pages/admin/Subscribers";
import PaymentInstructions from "./pages/PaymentInstructions";
import PurchaseHistory from "./pages/PurchaseHistory";
import Wishlist from "./pages/Wishlist";
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <WishlistProvider>
        <CartProvider>
          <Toaster />
          <Sonner />
          <HashRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/shop" element={<Shop />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/payment-instructions/:orderId" element={<PaymentInstructions />} />
              <Route path="/purchase-history" element={<PurchaseHistory />} />
              <Route path="/wishlist" element={<Wishlist />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/admin" element={<Dashboard />} />
              <Route path="/admin/products" element={<Products />} />
              <Route path="/admin/categories" element={<Categories />} />
              <Route path="/admin/orders" element={<Orders />} />
              <Route path="/admin/admins" element={<Admins />} />
              <Route path="/admin/phone-numbers" element={<PhoneNumbers />} />
              <Route path="/admin/shop-locations" element={<ShopLocations />} />
              <Route path="/admin/payment-methods" element={<PaymentMethods />} />
              <Route path="/admin/social-links" element={<SocialLinks />} />
              <Route path="/admin/subscribers" element={<Subscribers />} />
              <Route path="/admin/messages" element={<Messages />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </HashRouter>
        </CartProvider>
      </WishlistProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
