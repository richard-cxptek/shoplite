import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_WISHLIST_ITEMS } from "@/features/wishlist/wishlist-reducer";
import { WISHLIST_STORAGE_KEY, wishlistStore } from "@/features/wishlist/wishlist-store";
import { WISHLIST_FULL_MESSAGE, WishlistButton } from "./wishlist-button";

const NAME = "Tai nghe không dây SoundMax Pro";

function renderButton(variant?: "icon" | "labeled") {
  render(<WishlistButton productId="p001" productName={NAME} variant={variant} />);
  return screen.getByRole("button", { name: `Yêu thích ${NAME}` });
}

function seedFullWishlist() {
  const ids = Array.from({ length: MAX_WISHLIST_ITEMS }, (_, i) => `x${i + 1}`);
  window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify({ productIds: ids }));
  wishlistStore.reset();
}

describe("<WishlistButton />", () => {
  beforeEach(() => wishlistStore.reset());
  afterEach(() => vi.useRealTimers());

  it("là nút bật/tắt có tên chứa tên sản phẩm, ban đầu chưa thích", () => {
    const button = renderButton();

    expect(button).toHaveAttribute("aria-pressed", "false");
  });

  it("bấm để thích, bấm lần nữa để bỏ thích", async () => {
    const user = userEvent.setup();
    const button = renderButton();

    await user.click(button);
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(wishlistStore.getSnapshot().productIds).toEqual(["p001"]);

    await user.click(button);
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(wishlistStore.getSnapshot().productIds).toEqual([]);
  });

  it("thao tác được bằng bàn phím (Enter và Space)", async () => {
    const user = userEvent.setup();
    const button = renderButton();

    await user.tab();
    expect(button).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(button).toHaveAttribute("aria-pressed", "true");
    await user.keyboard(" ");
    expect(button).toHaveAttribute("aria-pressed", "false");
  });

  it("phản ánh trạng thái đã lưu khi render", () => {
    window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify({ productIds: ["p001"] }));
    wishlistStore.reset();

    expect(renderButton()).toHaveAttribute("aria-pressed", "true");
  });

  it("cập nhật khi danh sách thay đổi từ nơi khác (ví dụ tab khác)", () => {
    const button = renderButton();

    act(() => wishlistStore.dispatch({ type: "toggle", productId: "p001" }));

    expect(button).toHaveAttribute("aria-pressed", "true");
  });

  it("biến thể có chữ hiển thị 'Yêu thích'", () => {
    expect(renderButton("labeled")).toHaveTextContent("Yêu thích");
  });

  it("báo danh sách đầy khi đã có 50 sản phẩm và không thêm sản phẩm mới", async () => {
    seedFullWishlist();
    const user = userEvent.setup();
    const button = renderButton();

    await user.click(button);

    expect(screen.getByRole("status")).toHaveTextContent(WISHLIST_FULL_MESSAGE);
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(wishlistStore.getSnapshot().productIds).toHaveLength(MAX_WISHLIST_ITEMS);
    expect(wishlistStore.getSnapshot().productIds).not.toContain("p001");
  });

  it("thông báo đầy tự ẩn sau vài giây", () => {
    vi.useFakeTimers();
    seedFullWishlist();
    const button = renderButton();

    fireEvent.click(button);
    expect(screen.getByRole("status")).toHaveTextContent(WISHLIST_FULL_MESSAGE);

    act(() => vi.advanceTimersByTime(4000));
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("không hiện thông báo khi thêm sản phẩm thứ 50", async () => {
    const ids = Array.from({ length: MAX_WISHLIST_ITEMS - 1 }, (_, i) => `x${i + 1}`);
    window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify({ productIds: ids }));
    wishlistStore.reset();
    const user = userEvent.setup();
    const button = renderButton();

    await user.click(button);

    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    expect(wishlistStore.getSnapshot().productIds).toHaveLength(MAX_WISHLIST_ITEMS);
  });
});
