import { describe, expect, it } from "vitest";
import type { WishlistState } from "./types";
import {
  EMPTY_WISHLIST,
  getToggleResult,
  MAX_WISHLIST_ITEMS,
  normalizeWishlist,
  wishlistReducer,
} from "./wishlist-reducer";

/** Tạo danh sách gồm `count` mã giả: "x1", "x2", ... */
function fakeIds(count: number): string[] {
  return Array.from({ length: count }, (_, index) => `x${index + 1}`);
}

describe("wishlistReducer", () => {
  it("thêm sản phẩm vào đầu danh sách (mới nhất đứng đầu)", () => {
    const first = wishlistReducer(EMPTY_WISHLIST, { type: "toggle", productId: "p001" });
    const second = wishlistReducer(first, { type: "toggle", productId: "p002" });

    expect(second.productIds).toEqual(["p002", "p001"]);
  });

  it("bấm lần nữa để bỏ sản phẩm khỏi danh sách", () => {
    const state: WishlistState = { productIds: ["p002", "p001"] };

    expect(wishlistReducer(state, { type: "toggle", productId: "p002" }).productIds).toEqual([
      "p001",
    ]);
  });

  it("mỗi sản phẩm chỉ xuất hiện một lần", () => {
    let state = EMPTY_WISHLIST;
    for (let i = 0; i < 3; i++) {
      state = wishlistReducer(state, { type: "toggle", productId: "p001" });
    }

    expect(state.productIds).toEqual(["p001"]);
  });

  it("thêm được sản phẩm thứ 50", () => {
    const state: WishlistState = { productIds: fakeIds(MAX_WISHLIST_ITEMS - 1) };

    expect(getToggleResult(state, "p001")).toBe("added");
    const next = wishlistReducer(state, { type: "toggle", productId: "p001" });
    expect(next.productIds).toHaveLength(MAX_WISHLIST_ITEMS);
    expect(next.productIds[0]).toBe("p001");
  });

  it("không thêm khi danh sách đã đủ 50 sản phẩm và trả lại state cũ", () => {
    const state: WishlistState = { productIds: fakeIds(MAX_WISHLIST_ITEMS) };

    expect(getToggleResult(state, "p001")).toBe("full");
    expect(wishlistReducer(state, { type: "toggle", productId: "p001" })).toBe(state);
  });

  it("vẫn bỏ thích được khi danh sách đã đầy", () => {
    const state: WishlistState = { productIds: fakeIds(MAX_WISHLIST_ITEMS) };

    expect(getToggleResult(state, "x10")).toBe("removed");
    const next = wishlistReducer(state, { type: "toggle", productId: "x10" });
    expect(next.productIds).toHaveLength(MAX_WISHLIST_ITEMS - 1);
    expect(next.productIds).not.toContain("x10");
    expect(getToggleResult(next, "p001")).toBe("added");
  });

  it("remove bỏ sản phẩm; bỏ mã không có trong danh sách thì giữ nguyên state", () => {
    const state: WishlistState = { productIds: ["p002", "p001"] };

    expect(wishlistReducer(state, { type: "remove", productId: "p001" }).productIds).toEqual([
      "p002",
    ]);
    expect(wishlistReducer(state, { type: "remove", productId: "p999" })).toBe(state);
  });

  it("prune loại mã không có trong catalog và giữ thứ tự", () => {
    const state: WishlistState = { productIds: ["p003", "khong-ton-tai", "p001"] };

    expect(
      wishlistReducer(state, { type: "prune", knownIds: ["p001", "p002", "p003"] }).productIds,
    ).toEqual(["p003", "p001"]);
  });

  it("prune trả lại state cũ khi không có mã nào cần loại", () => {
    const state: WishlistState = { productIds: ["p003", "p001"] };

    expect(wishlistReducer(state, { type: "prune", knownIds: ["p001", "p003"] })).toBe(state);
  });

  it("clear làm rỗng danh sách; danh sách đã rỗng thì giữ nguyên state", () => {
    expect(wishlistReducer({ productIds: ["p001"] }, { type: "clear" })).toEqual(EMPTY_WISHLIST);
    expect(wishlistReducer(EMPTY_WISHLIST, { type: "clear" })).toBe(EMPTY_WISHLIST);
  });
});

describe("normalizeWishlist", () => {
  it("bỏ mã trùng, giữ lần xuất hiện đầu tiên", () => {
    expect(normalizeWishlist(["p002", "p001", "p002", "p001"]).productIds).toEqual([
      "p002",
      "p001",
    ]);
  });

  it("cắt còn 50 sản phẩm thêm gần nhất", () => {
    const ids = fakeIds(MAX_WISHLIST_ITEMS + 5);

    const { productIds } = normalizeWishlist(ids);
    expect(productIds).toHaveLength(MAX_WISHLIST_ITEMS);
    expect(productIds[0]).toBe("x1");
    expect(productIds.at(-1)).toBe(`x${MAX_WISHLIST_ITEMS}`);
  });
});
