import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string | null;
  stock: number;
};

type CartState = {
  vendorId: string | null;
  vendorName: string | null;
  items: CartItem[];
  /** Returns an error if adding would mix items from a different vendor —
   * an order can only ever be fulfilled from one pickup point, same
   * constraint most single-restaurant delivery carts use. */
  addItem: (vendorId: string, vendorName: string, item: CartItem) => { error?: string };
  removeItem: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  clear: () => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      vendorId: null,
      vendorName: null,
      items: [],
      addItem: (vendorId, vendorName, item) => {
        const state = get();
        if (state.vendorId && state.vendorId !== vendorId && state.items.length > 0) {
          return { error: `Your cart has items from ${state.vendorName}. Clear it first to order from a different shop.` };
        }
        const existing = state.items.find((i) => i.productId === item.productId);
        set({
          vendorId,
          vendorName,
          items: existing
            ? state.items.map((i) =>
                i.productId === item.productId ? { ...i, quantity: i.quantity + item.quantity } : i
              )
            : [...state.items, item],
        });
        return {};
      },
      removeItem: (productId) =>
        set((state) => {
          const items = state.items.filter((i) => i.productId !== productId);
          return {
            items,
            vendorId: items.length ? state.vendorId : null,
            vendorName: items.length ? state.vendorName : null,
          };
        }),
      setQuantity: (productId, quantity) =>
        set((state) => ({
          items: state.items.map((i) => (i.productId === productId ? { ...i, quantity } : i)),
        })),
      clear: () => set({ vendorId: null, vendorName: null, items: [] }),
    }),
    { name: "villageride-cart" }
  )
);
