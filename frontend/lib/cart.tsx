import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface CartItem {
  product_id: string;
  product_name: string;
  variant: string | null;
  quantity: number;
  unit_price: number;  // paise
  image: string | null;
  customization: string | null;
}

interface CartCtx {
  items: CartItem[];
  totalItems: number;
  totalPaise: number;
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  removeItem: (product_id: string, variant: string | null) => void;
  updateQty: (product_id: string, variant: string | null, qty: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartCtx | null>(null);

const KEY = 'mailair_cart';

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(KEY);
      if (stored) setItems(JSON.parse(stored));
    } catch {}
  }, []);

  const persist = (next: CartItem[]) => {
    setItems(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  };

  const addItem = (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => {
    setItems(prev => {
      const existing = prev.find(i => i.product_id === item.product_id && i.variant === item.variant);
      let next: CartItem[];
      if (existing) {
        next = prev.map(i =>
          i.product_id === item.product_id && i.variant === item.variant
            ? { ...i, quantity: i.quantity + (item.quantity ?? 1) }
            : i
        );
      } else {
        next = [...prev, { ...item, quantity: item.quantity ?? 1 }];
      }
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const removeItem = (product_id: string, variant: string | null) => {
    persist(items.filter(i => !(i.product_id === product_id && i.variant === variant)));
  };

  const updateQty = (product_id: string, variant: string | null, qty: number) => {
    if (qty <= 0) { removeItem(product_id, variant); return; }
    persist(items.map(i => i.product_id === product_id && i.variant === variant ? { ...i, quantity: qty } : i));
  };

  const clearCart = () => {
    persist([]);
  };

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const totalPaise = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, totalItems, totalPaise, addItem, removeItem, updateQty, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
