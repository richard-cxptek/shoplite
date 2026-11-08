import { expect, test, type Page } from "@playwright/test";

const SOUNDMAX = "Tai nghe không dây SoundMax Pro";
const MICRO = "Micro thu âm PodCast USB"; // hết hàng

function heart(page: Page, productName: string) {
  return page.getByRole("button", { name: `Yêu thích ${productName}`, exact: true });
}

function wishlistLink(page: Page) {
  return page.getByRole("link", { name: /^Danh sách yêu thích/ });
}

test("khách thích sản phẩm, xem lại ở /wishlist, thêm vào giỏ rồi bỏ thích", async ({ page }) => {
  await page.goto("/products?q=soundmax");
  const card = page.getByTestId("product-card").filter({ hasText: SOUNDMAX });
  const cardHeart = card.getByTestId("wishlist-button");

  // Thích từ thẻ sản phẩm
  await expect(cardHeart).toHaveAttribute("aria-pressed", "false");
  await cardHeart.click();
  await expect(cardHeart).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("wishlist-count")).toHaveText("1");
  await expect(page.getByTestId("cart-count")).toHaveCount(0);

  // Giữ nguyên sau khi tải lại trang
  await page.reload();
  await expect(cardHeart).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("wishlist-count")).toHaveText("1");

  // Trang chi tiết dùng chung trạng thái: bỏ thích rồi thích lại
  await card.getByRole("link", { name: SOUNDMAX }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(SOUNDMAX);
  await expect(heart(page, SOUNDMAX)).toHaveAttribute("aria-pressed", "true");
  await heart(page, SOUNDMAX).click();
  await expect(heart(page, SOUNDMAX)).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByTestId("wishlist-count")).toHaveCount(0);
  await heart(page, SOUNDMAX).click();
  await expect(page.getByTestId("wishlist-count")).toHaveText("1");

  // Trang /wishlist: thêm vào giỏ không bỏ khỏi danh sách
  await wishlistLink(page).click();
  await expect(page).toHaveURL(/\/wishlist$/);
  const item = page.getByTestId("wishlist-item");
  await expect(item).toHaveCount(1);
  await expect(item).toContainText(SOUNDMAX);
  await item.getByRole("button", { name: "Thêm vào giỏ" }).click();
  await expect(page.getByTestId("cart-count")).toHaveText("1");
  await expect(item).toHaveCount(1);

  // Bỏ thích sản phẩm cuối cùng -> trạng thái trống
  await item.getByRole("button", { name: `Bỏ thích ${SOUNDMAX}` }).click();
  await expect(page.getByTestId("wishlist-empty")).toBeVisible();
  await expect(page.getByTestId("wishlist-count")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Khám phá sản phẩm" })).toHaveAttribute(
    "href",
    "/products",
  );
});

test("sản phẩm hết hàng vẫn thích được nhưng không thêm vào giỏ được", async ({ page }) => {
  await page.goto("/products/micro-thu-am-podcast-usb");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(MICRO);

  await heart(page, MICRO).click();
  await expect(heart(page, MICRO)).toHaveAttribute("aria-pressed", "true");

  await wishlistLink(page).click();
  const item = page.getByTestId("wishlist-item");
  await expect(item).toContainText("Hết hàng");
  await expect(item.getByRole("button", { name: "Hết hàng" })).toBeDisabled();
  await expect(item.getByRole("button", { name: `Bỏ thích ${MICRO}` })).toBeEnabled();
});

test("báo cho khách khi danh sách yêu thích đã đủ 50 sản phẩm", async ({ page }) => {
  await page.addInitScript(() => {
    const productIds = Array.from({ length: 50 }, (_, i) => `e2e-${i + 1}`);
    window.localStorage.setItem("shoplite:wishlist", JSON.stringify({ productIds }));
  });
  await page.goto("/products?q=soundmax");
  await expect(page.getByTestId("wishlist-count")).toHaveText("50");

  const card = page.getByTestId("product-card").filter({ hasText: SOUNDMAX });
  await card.getByTestId("wishlist-button").click();

  await expect(card.getByTestId("wishlist-message")).toHaveText(
    /Danh sách yêu thích đã đầy \(tối đa 50 sản phẩm\)/,
  );
  await expect(card.getByTestId("wishlist-button")).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByTestId("wishlist-count")).toHaveText("50");
});

test("đồng bộ danh sách yêu thích giữa các tab đang mở", async ({ context }) => {
  const tabA = await context.newPage();
  const tabB = await context.newPage();
  await tabA.goto("/products?q=soundmax");
  await tabB.goto("/products?q=soundmax");
  await expect(heart(tabB, SOUNDMAX)).toHaveAttribute("aria-pressed", "false");

  await heart(tabA, SOUNDMAX).click();

  await expect(tabB.getByTestId("wishlist-count")).toHaveText("1");
  await expect(heart(tabB, SOUNDMAX)).toHaveAttribute("aria-pressed", "true");
});
