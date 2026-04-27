"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { CartItem, Product } from '@/lib/types';

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (itemId: string, size: string) => void;
  updateItemQuantity: (itemId: string, size: string, quantity: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    // Load cart from local storage on component mount
    try {
      const savedCart = localStorage.getItem('kira-cart');
      if (savedCart) {
        setItems(JSON.parse(savedCart));
      }
    } catch (error) {
      console.error("Failed to parse cart from localStorage", error);
      // If parsing fails, start with an empty cart
      setItems([]);
    }
  }, []);

  useEffect(() => {
    // Save cart to local storage whenever it changes
    try {
      localStorage.setItem('kira-cart', JSON.stringify(items));
    } catch (error) {
      console.error("Failed to save cart to localStorage", error);
    }
  }, [items]);

  const addItem = (product: CartItem) => {
    setItems((prevItems) => {
      // Unique identifier is now combination of id and size
      const existingItem = prevItems.find(item => item.id === product.id && item.size === product.size);
      if (existingItem) {
        return prevItems.map(item =>
          item.id === product.id && item.size === product.size
            ? { ...item, quantity: item.quantity + product.quantity }
            : item
        );
      }
      return [...prevItems, { ...product }];
    });
  };

  const removeItem = (itemId: string, size: string) => {
    setItems((prevItems) => prevItems.filter(item => !(item.id === itemId && item.size === size)));
  };

  const updateItemQuantity = (itemId: string, size: string, quantity: number) => {
    setItems((prevItems) =>
      prevItems.map(item =>
        item.id === itemId && item.size === size ? { ...item, quantity } : item
      ).filter(item => item.quantity > 0) // remove if quantity is 0 or less
    );
  };

  const clearCart = () => {
    setItems([]);
    try {
      localStorage.removeItem('kira-cart');
    } catch (error) {
      console.error("Failed to clear cart in localStorage", error);
    }
  };

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateItemQuantity, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
