import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Order } from "../types";
import { OrderTotals } from "./order-totals";

/** Đơn tạo trước khi có mã giảm giá: không có couponCode / discount. */
const LEGACY_ORDER: Order = {
  id: "SL-20261001-AAAAAA",
  status: "pending",
  createdAt: "2026-10-01T03:00:00.000Z",
  updatedAt: "2026-10-01T03:00:00.000Z",
  customer: { fullName: "Lê Văn C", phone: "0912345678", address: "1 Trần Phú, Nha Trang" },
  shippingMethod: "standard",
  paymentMethod: "cod",
  items: [],
  subtotal: 300_000,
  shippingFee: 30_000,
  total: 330_000,
};

const ORDER_WITH_COUPON: Order = {
  ...LEGACY_ORDER,
  id: "SL-20261108-BBBBBB",
  subtotal: 600_000,
  couponCode: "GIAM50K",
  discount: 50_000,
  shippingFee: 0,
  total: 550_000,
};

const row = (label: RegExp) => screen.getByText(label).closest("div")!;

describe("<OrderTotals />", () => {
  it("đơn có mã: hiển thị dòng giảm giá kèm mã và số tiền", () => {
    render(<OrderTotals order={ORDER_WITH_COUPON} />);

    const discount = screen.getByTestId("order-discount");
    expect(discount).toHaveTextContent("Giảm giá (GIAM50K)");
    expect(discount).toHaveTextContent(/-50\.000/);
    expect(within(row(/Tạm tính/)).getByText(/600\.000/)).toBeInTheDocument();
    expect(within(row(/Phí giao hàng/)).getByText("Miễn phí")).toBeInTheDocument();
    expect(within(row(/Tổng cộng/)).getByText(/550\.000/)).toBeInTheDocument();
  });

  it("đơn cũ không có thông tin giảm giá: không có dòng giảm giá, số tiền như đã lưu", () => {
    render(<OrderTotals order={LEGACY_ORDER} />);

    expect(screen.queryByTestId("order-discount")).not.toBeInTheDocument();
    expect(within(row(/Tạm tính/)).getByText(/300\.000/)).toBeInTheDocument();
    expect(within(row(/Phí giao hàng/)).getByText(/30\.000/)).toBeInTheDocument();
    expect(within(row(/Tổng cộng/)).getByText(/330\.000/)).toBeInTheDocument();
  });

  it("đơn không dùng mã (giảm 0đ): không có dòng giảm giá", () => {
    render(<OrderTotals order={{ ...LEGACY_ORDER, discount: 0 }} />);

    expect(screen.queryByTestId("order-discount")).not.toBeInTheDocument();
  });

  it("luôn hiển thị tổng tiền đã lưu, không tính lại", () => {
    render(<OrderTotals order={{ ...ORDER_WITH_COUPON, total: 123_456 }} />);

    expect(within(row(/Tổng cộng/)).getByText(/123\.456/)).toBeInTheDocument();
  });
});
