/**
 * Danh sách yêu thích chỉ lưu mã sản phẩm (không lưu giá/tồn kho) để luôn
 * hiển thị số liệu mới nhất từ catalog. Phần tử đầu tiên là sản phẩm thích gần nhất.
 */
export interface WishlistState {
  productIds: string[];
}

export type WishlistAction =
  | { type: "toggle"; productId: string }
  | { type: "remove"; productId: string }
  | { type: "prune"; knownIds: readonly string[] }
  | { type: "clear" };

/** Kết quả khi bấm nút trái tim. `full`: danh sách đã đầy nên không thêm được. */
export type ToggleResult = "added" | "removed" | "full";
