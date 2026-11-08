import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { MAX_QUANTITY_PER_ITEM, toCartItem } from "@/features/cart/cart-reducer";
import { cartStore } from "@/features/cart/cart-store";
import { getAllProducts, getProductById } from "@/features/catalog/catalog-service";
import { WISHLIST_STORAGE_KEY, wishlistStore } from "@/features/wishlist/wishlist-store";
import { WishlistView } from "./wishlist-view";

const products = getAllProducts();
const p001 = getProductById("p001")!;
const p002 = getProductById("p002")!;
const p004 = getProductById("p004")!; // hết hàng

function seed(productIds: string[]) {
  window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify({ productIds }));
  wishlistStore.reset();
}

function rows() {
  return screen.queryAllByRole("listitem");
}

describe("<WishlistView />", () => {
  beforeEach(() => {
    wishlistStore.reset();
    cartStore.reset();
  });

  it("hiển thị khung chờ thay vì trạng thái trống trước khi đọc dữ liệu trình duyệt", () => {
    seed(["p001"]);

    const html = renderToString(<WishlistView products={products} />);

    expect(html).toContain('aria-busy="true"');
    expect(html).not.toContain("Danh sách yêu thích đang trống");
  });

  it("hiển thị trạng thái trống với liên kết khám phá sản phẩm", () => {
    render(<WishlistView products={products} />);

    expect(screen.getByRole("heading", { name: "Danh sách yêu thích đang trống" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Khám phá sản phẩm" })).toHaveAttribute(
      "href",
      "/products",
    );
  });

  it("liệt kê sản phẩm theo thứ tự thích gần nhất đứng đầu", () => {
    seed(["p002", "p001"]);
    render(<WishlistView products={products} />);

    const [first, second] = rows();
    expect(within(first).getByRole("link", { name: p002.name })).toHaveAttribute(
      "href",
      `/products/${p002.slug}`,
    );
    expect(within(second).getByRole("link", { name: p001.name })).toBeVisible();
  });

  it("dùng giá mới nhất từ catalog chứ không phải giá lúc thích", () => {
    seed(["p001"]);
    const repriced = products.map((product) =>
      product.id === "p001" ? { ...product, price: 1_190_000 } : product,
    );

    render(<WishlistView products={repriced} />);

    expect(screen.getByTestId("price")).toHaveTextContent(/1\.190\.000/);
  });

  it("không hiển thị và loại bỏ mã sản phẩm không còn trong catalog", () => {
    seed(["khong-ton-tai", "p001"]);
    render(<WishlistView products={products} />);

    expect(rows()).toHaveLength(1);
    expect(wishlistStore.getSnapshot().productIds).toEqual(["p001"]);
  });

  it("hiển thị trạng thái trống khi mọi mã đều không còn trong catalog", () => {
    seed(["khong-ton-tai"]);
    render(<WishlistView products={products} />);

    expect(screen.getByRole("heading", { name: "Danh sách yêu thích đang trống" })).toBeVisible();
    expect(wishlistStore.getSnapshot().productIds).toEqual([]);
  });

  it("bỏ thích xóa sản phẩm khỏi trang và khỏi danh sách", async () => {
    seed(["p002", "p001"]);
    const user = userEvent.setup();
    render(<WishlistView products={products} />);

    await user.click(screen.getByRole("button", { name: `Bỏ thích ${p002.name}` }));

    expect(rows()).toHaveLength(1);
    expect(wishlistStore.getSnapshot().productIds).toEqual(["p001"]);
  });

  it("chuyển sang trạng thái trống khi bỏ thích sản phẩm cuối cùng", async () => {
    seed(["p001"]);
    const user = userEvent.setup();
    render(<WishlistView products={products} />);

    await user.click(screen.getByRole("button", { name: `Bỏ thích ${p001.name}` }));

    expect(screen.getByRole("heading", { name: "Danh sách yêu thích đang trống" })).toBeVisible();
  });

  it("thêm 1 sản phẩm vào giỏ và vẫn giữ trong danh sách yêu thích", async () => {
    seed(["p001"]);
    const user = userEvent.setup();
    render(<WishlistView products={products} />);

    await user.click(screen.getByRole("button", { name: /Thêm vào giỏ/ }));

    expect(cartStore.getSnapshot().items).toEqual([
      expect.objectContaining({ productId: "p001", quantity: 1 }),
    ]);
    expect(wishlistStore.getSnapshot().productIds).toEqual(["p001"]);
  });

  it("sản phẩm hết hàng hiển thị 'Hết hàng', không thêm vào giỏ được nhưng vẫn bỏ thích được", async () => {
    seed(["p004"]);
    const user = userEvent.setup();
    render(<WishlistView products={products} />);
    const row = rows()[0];

    expect(within(row).getAllByText("Hết hàng").length).toBeGreaterThan(0);
    const cartButton = within(row).getByRole("button", { name: "Hết hàng" });
    expect(cartButton).toBeDisabled();
    await user.click(cartButton);
    expect(cartStore.getSnapshot().items).toEqual([]);

    await user.click(within(row).getByRole("button", { name: `Bỏ thích ${p004.name}` }));
    expect(wishlistStore.getSnapshot().productIds).toEqual([]);
  });

  it("vô hiệu hóa nút thêm vào giỏ khi giỏ đã có số lượng tối đa của sản phẩm", () => {
    seed(["p001"]);
    act(() =>
      cartStore.dispatch({ type: "add", item: toCartItem(p001), quantity: MAX_QUANTITY_PER_ITEM }),
    );
    render(<WishlistView products={products} />);

    expect(screen.getByRole("button", { name: /Tối đa/ })).toBeDisabled();
  });
});
