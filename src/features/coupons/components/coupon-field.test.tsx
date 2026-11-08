import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getProductById } from "@/features/catalog/catalog-service";
import { toCartItem } from "@/features/cart/cart-reducer";
import type { CartItem } from "@/features/cart/types";
import { appliedCouponStore } from "../applied-coupon-store";
import { CouponField } from "./coupon-field";

const ITEMS: CartItem[] = [{ ...toCartItem(getProductById("p010")!), quantity: 2 }];

const SHOPLITE10_RESPONSE = {
  coupon: {
    code: "SHOPLITE10",
    type: "percent",
    percent: 10,
    maxDiscount: 100_000,
    minSubtotal: 300_000,
  },
  subtotal: 300_000,
  discount: 30_000,
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("<CouponField />", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    appliedCouponStore.reset();
  });

  it("có ô nhập gắn nhãn 'Mã giảm giá' và nút 'Áp dụng'", () => {
    render(<CouponField items={ITEMS} />);

    expect(screen.getByLabelText("Mã giảm giá")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Áp dụng" })).toBeInTheDocument();
  });

  it("gửi mã đã chuẩn hóa cùng giỏ hàng tới API và hiển thị mã đã áp dụng", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(SHOPLITE10_RESPONSE));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<CouponField items={ITEMS} />);

    await user.type(screen.getByLabelText("Mã giảm giá"), " shoplite10 ");
    await user.click(screen.getByRole("button", { name: "Áp dụng" }));

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/coupons/validate");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({
      couponCode: "SHOPLITE10",
      items: [{ productId: "p010", quantity: 2 }],
    });

    expect(await screen.findByTestId("coupon-applied")).toHaveTextContent("SHOPLITE10");
    expect(screen.queryByLabelText("Mã giảm giá")).not.toBeInTheDocument();
    expect(appliedCouponStore.getSnapshot()?.coupon.code).toBe("SHOPLITE10");
  });

  it("hiển thị 'Đang kiểm tra…' trong lúc chờ API", async () => {
    let resolve!: (response: Response) => void;
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise<Response>((r) => (resolve = r))));
    const user = userEvent.setup();
    render(<CouponField items={ITEMS} />);

    await user.type(screen.getByLabelText("Mã giảm giá"), "SHOPLITE10");
    await user.click(screen.getByRole("button", { name: "Áp dụng" }));

    expect(screen.getByRole("button", { name: "Đang kiểm tra…" })).toBeDisabled();

    resolve(jsonResponse(SHOPLITE10_RESPONSE));
    expect(await screen.findByTestId("coupon-applied")).toBeInTheDocument();
  });

  it("nhấn Enter trong ô mã sẽ áp dụng mã, không gửi form đặt hàng", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(SHOPLITE10_RESPONSE));
    vi.stubGlobal("fetch", fetchMock);
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    const user = userEvent.setup();
    render(
      <form onSubmit={onSubmit}>
        <CouponField items={ITEMS} />
      </form>,
    );

    await user.type(screen.getByLabelText("Mã giảm giá"), "SHOPLITE10{Enter}");

    expect(await screen.findByTestId("coupon-applied")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  describe("thông báo lỗi", () => {
    it.each(["", "   "])(
      "ô trống (%j) → 'Vui lòng nhập mã giảm giá', không gọi API",
      async (input) => {
        const fetchMock = vi.fn();
        vi.stubGlobal("fetch", fetchMock);
        const user = userEvent.setup();
        render(<CouponField items={ITEMS} />);

        if (input) await user.type(screen.getByLabelText("Mã giảm giá"), input);
        await user.click(screen.getByRole("button", { name: "Áp dụng" }));

        expect(screen.getByRole("alert")).toHaveTextContent("Vui lòng nhập mã giảm giá");
        expect(fetchMock).not.toHaveBeenCalled();
      },
    );

    it("hiển thị lý do từ server ngay tại ô mã và không áp dụng mã", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          jsonResponse(
            {
              error: {
                code: "COUPON_NOT_FOUND",
                message: "Mã giảm giá không tồn tại",
                details: { couponCode: "Mã giảm giá không tồn tại" },
              },
            },
            422,
          ),
        ),
      );
      const user = userEvent.setup();
      render(<CouponField items={ITEMS} />);

      await user.type(screen.getByLabelText("Mã giảm giá"), "KHONGCO");
      await user.click(screen.getByRole("button", { name: "Áp dụng" }));

      const message = await screen.findByRole("alert");
      expect(message).toHaveTextContent("Mã giảm giá không tồn tại");
      const input = screen.getByLabelText("Mã giảm giá");
      expect(input).toHaveAttribute("aria-invalid", "true");
      expect(input).toHaveAttribute("aria-describedby", message.id);
      expect(input).toHaveValue("KHONGCO");
      expect(appliedCouponStore.getSnapshot()).toBeNull();
    });

    it("sửa nội dung ô nhập thì xóa thông báo lỗi cũ", async () => {
      vi.stubGlobal("fetch", vi.fn());
      const user = userEvent.setup();
      render(<CouponField items={ITEMS} />);

      await user.click(screen.getByRole("button", { name: "Áp dụng" }));
      expect(screen.getByRole("alert")).toBeInTheDocument();

      await user.type(screen.getByLabelText("Mã giảm giá"), "G");
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.getByLabelText("Mã giảm giá")).toHaveAttribute("aria-invalid", "false");
    });

    it("không kết nối được máy chủ → báo lỗi chung", async () => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
      const user = userEvent.setup();
      render(<CouponField items={ITEMS} />);

      await user.type(screen.getByLabelText("Mã giảm giá"), "SHOPLITE10");
      await user.click(screen.getByRole("button", { name: "Áp dụng" }));

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Không kết nối được máy chủ, vui lòng thử lại.",
      );
    });
  });

  describe("mã đã áp dụng", () => {
    const GIAM50K = {
      code: "GIAM50K",
      type: "fixed",
      amount: 50_000,
      minSubtotal: 500_000,
    } as const;

    it("ẩn ô nhập (mỗi đơn chỉ một mã) và có nút 'Gỡ mã'", () => {
      appliedCouponStore.apply(SHOPLITE10_RESPONSE.coupon as never);
      render(<CouponField items={ITEMS} />);

      expect(screen.queryByLabelText("Mã giảm giá")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Gỡ mã" })).toBeInTheDocument();
    });

    it("gỡ mã → hiện lại ô nhập rỗng và đưa con trỏ vào ô", async () => {
      appliedCouponStore.apply(SHOPLITE10_RESPONSE.coupon as never);
      const user = userEvent.setup();
      render(<CouponField items={ITEMS} />);

      await user.click(screen.getByRole("button", { name: "Gỡ mã" }));

      expect(appliedCouponStore.getSnapshot()).toBeNull();
      const input = screen.getByLabelText("Mã giảm giá");
      expect(input).toHaveValue("");
      expect(input).toHaveFocus();
    });

    it("giỏ chưa đạt tối thiểu → hiện thông báo tạm ngưng kèm số tiền cần mua thêm", () => {
      appliedCouponStore.apply(GIAM50K);
      // Giỏ 300.000đ, GIAM50K cần 500.000đ
      render(<CouponField items={ITEMS} />);

      const message = screen.getByRole("alert");
      expect(message).toHaveTextContent("chưa đạt giá trị tối thiểu");
      expect(message).toHaveTextContent(/Mua thêm 200\.000/);
      expect(screen.getByTestId("coupon-applied")).toHaveTextContent("GIAM50K");
    });
  });
});
