import type { ToggleResult, WishlistAction, WishlistState } from "./types";

/** Số sản phẩm tối đa trong danh sách yêu thích. */
export const MAX_WISHLIST_ITEMS = 50;

export const EMPTY_WISHLIST: WishlistState = { productIds: [] };

/** Bỏ mã trùng (giữ lần xuất hiện đầu - mới nhất) và cắt còn MAX_WISHLIST_ITEMS mục mới nhất. */
export function normalizeWishlist(productIds: readonly string[]): WishlistState {
  const unique = [...new Set(productIds)].slice(0, MAX_WISHLIST_ITEMS);
  return { productIds: unique };
}

/** Kết quả nếu bấm nút trái tim của `productId` với state hiện tại. */
export function getToggleResult(state: WishlistState, productId: string): ToggleResult {
  if (state.productIds.includes(productId)) return "removed";
  return state.productIds.length >= MAX_WISHLIST_ITEMS ? "full" : "added";
}

/**
 * Reducer thuần của danh sách yêu thích.
 * Khi không có gì thay đổi, trả lại đúng tham chiếu state cũ để store không ghi/không phát sự kiện.
 */
export function wishlistReducer(state: WishlistState, action: WishlistAction): WishlistState {
  switch (action.type) {
    case "toggle": {
      const result = getToggleResult(state, action.productId);
      if (result === "full") return state;
      if (result === "removed") {
        return { productIds: state.productIds.filter((id) => id !== action.productId) };
      }
      return { productIds: [action.productId, ...state.productIds] };
    }

    case "remove": {
      if (!state.productIds.includes(action.productId)) return state;
      return { productIds: state.productIds.filter((id) => id !== action.productId) };
    }

    case "prune": {
      const known = new Set(action.knownIds);
      const kept = state.productIds.filter((id) => known.has(id));
      return kept.length === state.productIds.length ? state : { productIds: kept };
    }

    case "clear":
      return state.productIds.length === 0 ? state : EMPTY_WISHLIST;
  }
}
