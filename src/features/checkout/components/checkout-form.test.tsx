import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getProductById } from "@/features/catalog/catalog-service";
import { toCartItem } from "@/features/cart/cart-reducer";
import { cartStore } from "@/features/cart/cart-store";
import { appliedCouponStore } from "@/features/coupons/applied-coupon-store";
import { CheckoutForm } from "./checkout-form";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));

describe("<CheckoutForm />", () => {
  beforeEach(() => {
    cartStore.reset();
    cartStore.dispatch({ type: "add", item: toCartItem(getProductById("p010")!), quantity: 2 });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    push.mockReset();
    appliedCouponStore.reset();
  });

  async function fillCustomerInfo(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText(/Họ và tên/), "Nguyễn Văn A");
    await user.type(screen.getByLabelText(/Số điện thoại/), "0912345678");
    await user.type(screen.getByLabelText(/Địa chỉ giao hàng/), "12 Nguyễn Huệ, Quận 1, TP.HCM");
  }

  it("hiển thị lỗi validate khi gửi form trống và không gọi API", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<CheckoutForm />);

    await user.click(screen.getByRole("button", { name: "Đặt hàng" }));

    expect(screen.getByTestId("error-fullName")).toBeVisible();
    expect(screen.getByTestId("error-phone")).toHaveTextContent(/Số điện thoại không hợp lệ/);
    expect(screen.getByTestId("error-address")).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("cập nhật phí giao hàng khi đổi phương thức giao hàng", async () => {
    const user = userEvent.setup();
    render(<CheckoutForm />);

    expect(screen.getByTestId("shipping-fee")).toHaveTextContent(/30\.000/);
    await user.click(screen.getByText("Giao hàng nhanh"));
    expect(screen.getByTestId("shipping-fee")).toHaveTextContent(/60\.000/);
  });

  it("gửi đơn hàng, xóa giỏ và chuyển tới trang đơn hàng", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ id: "SL-20261021-ABC123" }), { status: 201 }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<CheckoutForm />);

    await user.type(screen.getByLabelText(/Họ và tên/), "Nguyễn Văn A");
    await user.type(screen.getByLabelText(/Số điện thoại/), "0912345678");
    await user.type(screen.getByLabelText(/Địa chỉ giao hàng/), "12 Nguyễn Huệ, Quận 1, TP.HCM");
    await user.click(screen.getByRole("button", { name: "Đặt hàng" }));

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/orders");
    expect(JSON.parse(init.body)).toMatchObject({
      shippingMethod: "standard",
      paymentMethod: "cod",
      items: [{ productId: "p010", quantity: 2 }],
      customer: { fullName: "Nguyễn Văn A", phone: "0912345678" },
    });
    expect(push).toHaveBeenCalledWith("/orders/SL-20261021-ABC123?placed=1");
    expect(cartStore.getSnapshot().items).toEqual([]);
  });

  it("hiển thị thông báo lỗi từ server", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: { code: "INSUFFICIENT_STOCK", message: "Sản phẩm đã hết hàng" },
          }),
          { status: 409 },
        ),
      ),
    );
    const user = userEvent.setup();
    render(<CheckoutForm />);

    await user.type(screen.getByLabelText(/Họ và tên/), "Nguyễn Văn A");
    await user.type(screen.getByLabelText(/Số điện thoại/), "0912345678");
    await user.type(screen.getByLabelText(/Địa chỉ giao hàng/), "12 Nguyễn Huệ, Quận 1, TP.HCM");
    await user.click(screen.getByRole("button", { name: "Đặt hàng" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Sản phẩm đã hết hàng");
    expect(push).not.toHaveBeenCalled();
  });

  describe("mã giảm giá", () => {
    const SHOPLITE10 = {
      code: "SHOPLITE10",
      type: "percent",
      percent: 10,
      maxDiscount: 100_000,
      minSubtotal: 300_000,
    } as const;

    it("hiển thị dòng giảm giá và tổng tiền mới khi mã đang được áp dụng", () => {
      appliedCouponStore.apply(SHOPLITE10);
      render(<CheckoutForm />);

      // Giỏ: Cáp USB-C 150.000đ x 2 = 300.000đ → giảm 30.000đ, phí ship tiêu chuẩn 30.000đ
      const discountRow = screen.getByTestId("discount-amount");
      expect(discountRow).toHaveTextContent("Giảm giá (SHOPLITE10)");
      expect(discountRow).toHaveTextContent(/-30\.000/);
      expect(screen.getByTestId("checkout-total")).toHaveTextContent(/300\.000/);
    });

    it("không có dòng giảm giá khi chưa áp dụng mã", () => {
      render(<CheckoutForm />);

      expect(screen.queryByTestId("discount-amount")).not.toBeInTheDocument();
      expect(screen.getByTestId("checkout-total")).toHaveTextContent(/330\.000/);
    });

    it("chỉ gửi mã giảm giá lên server, không gửi số tiền nào", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ id: "SL-20261108-ABC123" }), { status: 201 }),
        );
      vi.stubGlobal("fetch", fetchMock);
      appliedCouponStore.apply(SHOPLITE10);
      const user = userEvent.setup();
      render(<CheckoutForm />);

      await fillCustomerInfo(user);
      await user.click(screen.getByRole("button", { name: "Đặt hàng" }));

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.couponCode).toBe("SHOPLITE10");
      for (const key of ["discount", "subtotal", "shippingFee", "total"]) {
        expect(body).not.toHaveProperty(key);
      }
      // Đặt hàng thành công thì mã cũng được gỡ cùng giỏ hàng
      expect(appliedCouponStore.getSnapshot()).toBeNull();
    });

    it("không gửi couponCode khi chưa áp dụng mã", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ id: "SL-20261108-ABC123" }), { status: 201 }),
        );
      vi.stubGlobal("fetch", fetchMock);
      const user = userEvent.setup();
      render(<CheckoutForm />);

      await fillCustomerInfo(user);
      await user.click(screen.getByRole("button", { name: "Đặt hàng" }));

      expect(JSON.parse(fetchMock.mock.calls[0][1].body)).not.toHaveProperty("couponCode");
    });

    it("mã bị server từ chối khi đặt hàng: giữ mã và thông tin, chặn đặt hàng tới khi gỡ mã", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              error: {
                code: "COUPON_EXPIRED",
                message: "Mã giảm giá đã hết hạn",
                details: { couponCode: "Mã giảm giá đã hết hạn" },
              },
            }),
            { status: 422 },
          ),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ id: "SL-20261108-ABC123" }), { status: 201 }),
        );
      vi.stubGlobal("fetch", fetchMock);
      appliedCouponStore.apply(SHOPLITE10);
      const user = userEvent.setup();
      render(<CheckoutForm />);

      await fillCustomerInfo(user);
      await user.click(screen.getByRole("button", { name: "Đặt hàng" }));

      expect(await screen.findByRole("alert")).toHaveTextContent("Mã giảm giá đã hết hạn");
      expect(screen.getByTestId("coupon-applied")).toHaveTextContent("SHOPLITE10");
      expect(screen.getByLabelText(/Họ và tên/)).toHaveValue("Nguyễn Văn A");
      expect(screen.queryByTestId("discount-amount")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Đặt hàng" })).toBeDisabled();
      expect(push).not.toHaveBeenCalled();

      await user.click(screen.getByRole("button", { name: "Gỡ mã" }));
      expect(screen.getByRole("button", { name: "Đặt hàng" })).toBeEnabled();

      await user.click(screen.getByRole("button", { name: "Đặt hàng" }));
      expect(JSON.parse(fetchMock.mock.calls[1][1].body)).not.toHaveProperty("couponCode");
      expect(push).toHaveBeenCalledWith("/orders/SL-20261108-ABC123?placed=1");
    });

    it("giỏ tụt dưới tối thiểu: mã tạm ngưng, khóa đặt hàng; mua thêm thì mã tự có hiệu lực lại", async () => {
      appliedCouponStore.apply({
        code: "GIAM50K",
        type: "fixed",
        amount: 50_000,
        minSubtotal: 500_000,
      });
      cartStore.dispatch({ type: "clear" });
      cartStore.dispatch({ type: "add", item: toCartItem(getProductById("p006")!), quantity: 1 });
      const user = userEvent.setup();
      render(<CheckoutForm />);

      // Chuột SwiftClick 450.000đ + phí ship 30.000đ, chưa giảm
      expect(screen.queryByTestId("discount-amount")).not.toBeInTheDocument();
      expect(screen.getByTestId("checkout-total")).toHaveTextContent(/480\.000/);
      expect(screen.getByRole("alert")).toHaveTextContent(/Mua thêm 50\.000/);
      expect(screen.getByRole("button", { name: "Đặt hàng" })).toBeDisabled();

      // Thêm Cáp USB-C 150.000đ (ví dụ từ tab khác) → 600.000đ, đủ điều kiện
      act(() => {
        cartStore.dispatch({ type: "add", item: toCartItem(getProductById("p010")!), quantity: 1 });
      });
      expect(screen.getByTestId("discount-amount")).toHaveTextContent(/-50\.000/);
      expect(screen.getByTestId("checkout-total")).toHaveTextContent(/550\.000/);
      expect(screen.getByRole("button", { name: "Đặt hàng" })).toBeEnabled();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Gỡ mã" }));
      expect(screen.queryByTestId("discount-amount")).not.toBeInTheDocument();
      expect(screen.getByTestId("checkout-total")).toHaveTextContent(/600\.000/);
    });

    it("đổi phương thức giao hàng không làm thay đổi số tiền giảm", async () => {
      appliedCouponStore.apply(SHOPLITE10);
      const user = userEvent.setup();
      render(<CheckoutForm />);

      await user.click(screen.getByText("Giao hàng nhanh"));

      expect(screen.getByTestId("discount-amount")).toHaveTextContent(/-30\.000/);
      // 300.000 - 30.000 + 60.000
      expect(screen.getByTestId("checkout-total")).toHaveTextContent(/330\.000/);
    });
  });
});
