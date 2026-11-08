import type { WishlistAction, WishlistState } from "./types";
import { EMPTY_WISHLIST, normalizeWishlist, wishlistReducer } from "./wishlist-reducer";

export const WISHLIST_STORAGE_KEY = "shoplite:wishlist";

type Listener = () => void;

let state: WishlistState | null = null;
const listeners = new Set<Listener>();

function isStoredWishlist(value: unknown): value is WishlistState {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as WishlistState).productIds) &&
    (value as WishlistState).productIds.every((id) => typeof id === "string")
  );
}

function readFromStorage(): WishlistState {
  if (typeof window === "undefined") return EMPTY_WISHLIST;
  try {
    const raw = window.localStorage.getItem(WISHLIST_STORAGE_KEY);
    if (!raw) return EMPTY_WISHLIST;
    const parsed: unknown = JSON.parse(raw);
    return isStoredWishlist(parsed) ? normalizeWishlist(parsed.productIds) : EMPTY_WISHLIST;
  } catch {
    return EMPTY_WISHLIST;
  }
}

function writeToStorage(next: WishlistState): void {
  try {
    window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // localStorage có thể bị chặn (chế độ ẩn danh) - danh sách vẫn hoạt động trong phiên hiện tại.
  }
}

function getState(): WishlistState {
  if (state === null) state = readFromStorage();
  return state;
}

function emit(): void {
  for (const listener of listeners) listener();
}

/** Đồng bộ danh sách yêu thích giữa các tab trình duyệt. */
function handleStorageEvent(event: StorageEvent): void {
  // key === null: localStorage.clear() ở tab khác.
  if (event.key !== WISHLIST_STORAGE_KEY && event.key !== null) return;
  state = readFromStorage();
  emit();
}

/**
 * Store danh sách yêu thích phía client, lưu trong localStorage.
 * Dùng với React qua useSyncExternalStore (xem use-wishlist.ts).
 */
export const wishlistStore = {
  getSnapshot(): WishlistState {
    return getState();
  },

  getServerSnapshot(): WishlistState {
    return EMPTY_WISHLIST;
  },

  subscribe(listener: Listener): () => void {
    if (listeners.size === 0 && typeof window !== "undefined") {
      window.addEventListener("storage", handleStorageEvent);
    }
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0 && typeof window !== "undefined") {
        window.removeEventListener("storage", handleStorageEvent);
      }
    };
  },

  dispatch(action: WishlistAction): void {
    const current = getState();
    const next = wishlistReducer(current, action);
    if (next === current) return;
    state = next;
    writeToStorage(next);
    emit();
  },

  /** Chỉ dùng trong test: buộc đọc lại từ localStorage ở lần truy cập tiếp theo. */
  reset(): void {
    state = null;
  },
};
