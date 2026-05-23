"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { api } from "@/lib/api-client";

interface CartItem {
  id: number;
  product_id: number;
  truck_id?: string | null;
  batch_date?: string | null;
  quantity: number;
  name?: string;
  price_per_unit?: number;
  price_per_box?: number;
  unit_price?: number;
  color?: string;
  variety?: string;
  stem_length?: string;
  packaging_type?: string;
  image_url?: string;
  min_order_quantity?: number;
  arrival_date?: string;
  truck_identifier?: string;
  product_missing?: boolean;
  firestore_doc_id?: string | null;
  line_kind?: "product" | "inventory";
}

interface CartContextType {
  cart: CartItem[];
  loading: boolean;
  addToCart: (product: any, quantity: number) => Promise<void>;
  removeFromCart: (itemId: number) => Promise<void>;
  updateQuantity: (itemId: number, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  getCartTotal: () => number;
  getCartCount: () => number;
  loadCart: (opts?: { silent?: boolean }) => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function readUserId(): number | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("greenflowers_user");
  if (!raw) return null;
  try {
    const u = JSON.parse(raw) as { id?: number; firebaseUid?: string };
    if (!u.firebaseUid) return null;
    const n = typeof u.id === "number" && Number.isFinite(u.id) ? u.id : 0;
    return n;
  } catch {
    return null;
  }
}

function readGuestCart(): CartItem[] {
  try {
    const temp = JSON.parse(localStorage.getItem("temp_cart") || "[]");
    if (!Array.isArray(temp) || temp.length === 0) return [];
    return temp.map((it: any, idx: number) => {
      const p = it.product || it;
      return {
        id: p.id || idx,
        product_id: p.id || p.product_id,
        truck_id: p.truck_id ?? null,
        batch_date: p.batch_date ?? null,
        quantity: it.quantity || 1,
        name: p.name,
        unit_price: p.unit_price ?? p.price_per_unit ?? p.price_per_box ?? p.price ?? 0,
        price_per_unit: p.price_per_unit,
        price_per_box: p.price_per_box,
        image_url: p.image_url,
        firestore_doc_id: p.firestore_doc_id,
        line_kind: p.line_kind,
      } as CartItem;
    });
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const userIdRef = useRef<number | null>(null);
  const [userIdState, setUserIdState] = useState<number | null | "init">("init");

  useEffect(() => {
    const sync = () => {
      const id = readUserId();
      userIdRef.current = id;
      setUserIdState(id);
    };
    sync();
    const onStorage = (e: StorageEvent) => {
      if (e.key === "greenflowers_user") sync();
    };
    const onLogin = () => sync();
    window.addEventListener("storage", onStorage);
    window.addEventListener("greenflowers_login", onLogin);
    window.addEventListener("greenflowers_logout", onLogin);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("greenflowers_login", onLogin);
      window.removeEventListener("greenflowers_logout", onLogin);
    };
  }, []);

  const loadCart = useCallback(async (opts?: { silent?: boolean }) => {
    const uid = userIdRef.current;
    if (uid === null) {
      setCart(readGuestCart());
      return;
    }
    if (!opts?.silent) setLoading(true);
    try {
      const response = await api.getCart(uid);
      if (response && response.success) {
        setCart(response.cart || []);
        localStorage.removeItem("temp_cart");
      } else {
        console.warn("[Cart] loadCart response:", response);
      }
    } catch (error) {
      console.error("[Cart] loadCart error:", error);
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userIdState === "init") return;
    void loadCart();
  }, [userIdState, loadCart]);

  const addToCart = useCallback(async (product: any, quantity: number) => {
    const uid = userIdRef.current;
    const productId = product.id || product.product_id;
    const truckId = product.truck_id || null;
    const unitPrice =
      product.unit_price ?? product.price_per_unit ?? product.price_per_box ?? product.price ?? 0;

    if (uid === null) {
      const tempCart = JSON.parse(localStorage.getItem("temp_cart") || "[]");
      const existing = tempCart.findIndex(
        (it: any) =>
          (it.product?.id || it.id) === productId &&
          (it.product?.truck_id || it.truck_id) === truckId,
      );
      if (existing >= 0) {
        tempCart[existing].quantity = (tempCart[existing].quantity || 0) + quantity;
      } else {
        tempCart.push({ product, quantity });
      }
      localStorage.setItem("temp_cart", JSON.stringify(tempCart));
      setCart(readGuestCart());
      return;
    }

    // Optimistic: add item to state immediately
    const optimistic: CartItem = {
      id: Date.now(),
      product_id: productId,
      truck_id: truckId,
      quantity,
      name: product.name,
      unit_price: unitPrice,
      price_per_unit: product.price_per_unit,
      price_per_box: product.price_per_box,
      image_url: product.image_url,
      variety: product.variety,
      color: product.color,
      stem_length: product.stem_length,
      packaging_type: product.packaging_type,
      firestore_doc_id: product.firestore_doc_id ?? null,
      line_kind:
        product.line_kind === "inventory" ? "inventory" : "product",
    };

    setCart((prev) => {
      const idx = prev.findIndex(
        (it) => it.product_id === productId && (it.truck_id ?? null) === truckId,
      );
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + quantity };
        return copy;
      }
      return [...prev, optimistic];
    });

    try {
      const response = await api.addToCart(
        uid,
        productId,
        quantity,
        truckId,
        unitPrice,
        product.firestore_doc_id
          ? {
              firestoreDocId: String(product.firestore_doc_id),
              lineKind: product.line_kind === "inventory" ? "inventory" : "product",
            }
          : undefined,
      );

      if (response && response.success) {
        await loadCart();
      } else {
        console.error("[Cart] addToCart API error:", response?.error);
        alert("Ошибка: " + (response?.error || "Не удалось добавить товар"));
        await loadCart();
      }
    } catch (error) {
      console.error("[Cart] addToCart exception:", error);
      alert("Ошибка при добавлении в корзину");
      await loadCart();
    }
  }, [loadCart]);

  const removeFromCart = useCallback(async (itemId: number) => {
    const uid = userIdRef.current;
    if (uid === null) {
      const tempCart = JSON.parse(localStorage.getItem("temp_cart") || "[]");
      const filtered = tempCart.filter(
        (it: any) => (it.product?.id || it.id) !== itemId,
      );
      localStorage.setItem("temp_cart", JSON.stringify(filtered));
      setCart(readGuestCart());
      return;
    }

    setCart((prev) => prev.filter((it) => it.id !== itemId));
    try {
      const response = await api.removeFromCart(itemId, uid);
      if (response && response.success) {
        void loadCart({ silent: true });
      }
    } catch (error) {
      console.error("[Cart] removeFromCart error:", error);
      await loadCart({ silent: true });
    }
  }, [loadCart]);

  const updateQuantity = useCallback(async (itemId: number, quantity: number) => {
    const uid = userIdRef.current;
    if (uid === null) {
      const tempCart = JSON.parse(localStorage.getItem("temp_cart") || "[]");
      const idx = tempCart.findIndex(
        (it: any) => (it.product?.id || it.id) === itemId,
      );
      if (idx >= 0) {
        tempCart[idx].quantity = quantity;
        localStorage.setItem("temp_cart", JSON.stringify(tempCart));
        setCart(readGuestCart());
      }
      return;
    }

    setCart((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, quantity } : it)),
    );
    try {
      const response = await api.updateCartItem(itemId, uid, quantity);
      if (response && response.success) {
        void loadCart({ silent: true });
      }
    } catch (error) {
      console.error("[Cart] updateQuantity error:", error);
      await loadCart({ silent: true });
    }
  }, [loadCart]);

  const clearCart = useCallback(async () => {
    const uid = userIdRef.current;
    if (uid === null) {
      localStorage.removeItem("temp_cart");
      setCart([]);
      return;
    }
    setCart([]);
    try {
      await api.clearCart(uid);
    } catch (error) {
      console.error("[Cart] clearCart error:", error);
    }
  }, []);

  const getCartTotal = useCallback(() => {
    return cart.reduce((total, item) => {
      const price = Number(
        item.unit_price ?? item.price_per_unit ?? item.price_per_box ?? 0,
      );
      return total + price * (item.quantity || 0);
    }, 0);
  }, [cart]);

  const getCartCount = useCallback(() => cart.length, [cart]);

  return (
    <CartContext.Provider
      value={{
        cart,
        loading,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getCartTotal,
        getCartCount,
        loadCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
