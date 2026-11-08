import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { WISHLIST_STORAGE_KEY, wishlistStore } from "@/features/wishlist/wishlist-store";
import { WishlistBadge } from "./wishlist-badge";

function seed(productIds: string[]) {
  window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify({ productIds }));
  wishlistStore.reset();
}

describe("<WishlistBadge />", () => {
  beforeEach(() => wishlistStore.reset());

  it("không hiển thị số khi danh sách rỗng", () => {
    render(<WishlistBadge />);

    const link = screen.getByRole("link", { name: "Danh sách yêu thích" });
    expect(link).toHaveAttribute("href", "/wishlist");
    expect(link).toHaveTextContent("");
  });

  it("hiển thị số lượng và đưa số vào tên truy cập", () => {
    seed(["p001", "p002", "p003"]);
    render(<WishlistBadge />);

    const link = screen.getByRole("link", { name: "Danh sách yêu thích (3 sản phẩm)" });
    expect(link).toHaveTextContent("3");
  });

  it("hiển thị số khi danh sách có đúng 1 sản phẩm", () => {
    seed(["p001"]);
    render(<WishlistBadge />);

    expect(
      screen.getByRole("link", { name: "Danh sách yêu thích (1 sản phẩm)" }),
    ).toHaveTextContent("1");
  });

  it("cập nhật số khi danh sách thay đổi", () => {
    render(<WishlistBadge />);

    act(() => wishlistStore.dispatch({ type: "toggle", productId: "p001" }));
    expect(screen.getByRole("link", { name: "Danh sách yêu thích (1 sản phẩm)" })).toBeVisible();

    act(() => wishlistStore.dispatch({ type: "remove", productId: "p001" }));
    expect(screen.getByRole("link", { name: "Danh sách yêu thích" })).toHaveTextContent("");
  });
});
