import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_WISHLIST_ITEMS } from "./wishlist-reducer";
import { WISHLIST_STORAGE_KEY, wishlistStore } from "./wishlist-store";

function saved(): unknown {
  return JSON.parse(window.localStorage.getItem(WISHLIST_STORAGE_KEY)!);
}

function seed(value: unknown): void {
  window.localStorage.setItem(
    WISHLIST_STORAGE_KEY,
    typeof value === "string" ? value : JSON.stringify(value),
  );
  wishlistStore.reset();
}

/** Mô phỏng sự kiện `storage` mà trình duyệt phát ở các tab khác. */
function fireStorageEvent(key: string | null): void {
  window.dispatchEvent(new StorageEvent("storage", { key }));
}

describe("wishlistStore", () => {
  beforeEach(() => {
    window.localStorage.clear();
    wishlistStore.reset();
  });

  afterEach(() => vi.restoreAllMocks());

  it("lưu danh sách vào localStorage sau mỗi thay đổi (chỉ lưu mã sản phẩm)", () => {
    wishlistStore.dispatch({ type: "toggle", productId: "p001" });
    wishlistStore.dispatch({ type: "toggle", productId: "p002" });

    expect(saved()).toEqual({ productIds: ["p002", "p001"] });
  });

  it("đọc lại danh sách đã lưu khi tải lại trang", () => {
    wishlistStore.dispatch({ type: "toggle", productId: "p001" });
    wishlistStore.reset();

    expect(wishlistStore.getSnapshot().productIds).toEqual(["p001"]);
  });

  it("coi danh sách là rỗng khi dữ liệu không phải JSON hợp lệ", () => {
    seed("{not json");
    expect(wishlistStore.getSnapshot().productIds).toEqual([]);

    wishlistStore.dispatch({ type: "toggle", productId: "p001" });
    expect(saved()).toEqual({ productIds: ["p001"] });
  });

  it.each([
    ["mảng thay vì object", ["p001"]],
    ["thiếu productIds", { items: ["p001"] }],
    ["mã không phải chuỗi", { productIds: ["p001", 42] }],
    ["null", null],
  ])("coi danh sách là rỗng khi dữ liệu sai cấu trúc (%s)", (_name, value) => {
    seed(value);
    expect(wishlistStore.getSnapshot().productIds).toEqual([]);
  });

  it("chuẩn hóa dữ liệu bị trùng và vượt 50 sản phẩm", () => {
    const ids = Array.from({ length: MAX_WISHLIST_ITEMS + 10 }, (_, i) => `x${i + 1}`);
    seed({ productIds: ["x1", ...ids] });

    const { productIds } = wishlistStore.getSnapshot();
    expect(productIds).toHaveLength(MAX_WISHLIST_ITEMS);
    expect(new Set(productIds).size).toBe(MAX_WISHLIST_ITEMS);
    expect(productIds[0]).toBe("x1");
  });

  it("vẫn cập nhật trong phiên khi trình duyệt chặn ghi localStorage", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError");
    });

    expect(() => wishlistStore.dispatch({ type: "toggle", productId: "p001" })).not.toThrow();
    expect(wishlistStore.getSnapshot().productIds).toEqual(["p001"]);
  });

  it("thông báo cho subscriber khi danh sách thay đổi", () => {
    const listener = vi.fn();
    const unsubscribe = wishlistStore.subscribe(listener);

    wishlistStore.dispatch({ type: "toggle", productId: "p001" });

    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("không ghi và không thông báo khi thích thêm lúc danh sách đã đầy", () => {
    const ids = Array.from({ length: MAX_WISHLIST_ITEMS }, (_, i) => `x${i + 1}`);
    seed({ productIds: ids });
    wishlistStore.getSnapshot();
    const listener = vi.fn();
    const unsubscribe = wishlistStore.subscribe(listener);
    const setItem = vi.spyOn(Storage.prototype, "setItem");

    wishlistStore.dispatch({ type: "toggle", productId: "p001" });

    expect(listener).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
    expect(wishlistStore.getSnapshot().productIds).toHaveLength(MAX_WISHLIST_ITEMS);
    unsubscribe();
  });

  it("đồng bộ khi tab khác thay đổi danh sách", () => {
    const listener = vi.fn();
    const unsubscribe = wishlistStore.subscribe(listener);
    expect(wishlistStore.getSnapshot().productIds).toEqual([]);

    window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify({ productIds: ["p003"] }));
    fireStorageEvent(WISHLIST_STORAGE_KEY);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(wishlistStore.getSnapshot().productIds).toEqual(["p003"]);
    unsubscribe();
  });

  it("bỏ qua sự kiện storage của key khác", () => {
    const listener = vi.fn();
    const unsubscribe = wishlistStore.subscribe(listener);

    fireStorageEvent("shoplite:cart");

    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  it("về danh sách rỗng khi tab khác xóa dữ liệu", () => {
    wishlistStore.dispatch({ type: "toggle", productId: "p001" });
    const unsubscribe = wishlistStore.subscribe(() => {});

    window.localStorage.removeItem(WISHLIST_STORAGE_KEY);
    fireStorageEvent(WISHLIST_STORAGE_KEY);
    expect(wishlistStore.getSnapshot().productIds).toEqual([]);

    wishlistStore.dispatch({ type: "toggle", productId: "p002" });
    window.localStorage.clear();
    fireStorageEvent(null);
    expect(wishlistStore.getSnapshot().productIds).toEqual([]);
    unsubscribe();
  });

  it("server snapshot luôn rỗng để không lệch hydrate", () => {
    wishlistStore.dispatch({ type: "toggle", productId: "p001" });
    expect(wishlistStore.getServerSnapshot().productIds).toEqual([]);
  });
});
