import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  appliedCouponStore,
  getAppliedCouponStatus,
  useAppliedCoupon,
} from "./applied-coupon-store";
import { formatCurrency } from "@/lib/format";
import type { PublicCoupon } from "./types";

const SHOPLITE10: PublicCoupon = {
  code: "SHOPLITE10",
  type: "percent",
  percent: 10,
  maxDiscount: 100_000,
  minSubtotal: 300_000,
};

describe("appliedCouponStore", () => {
  afterEach(() => {
    appliedCouponStore.reset();
  });

  it("mặc định chưa có mã nào được áp dụng", () => {
    expect(appliedCouponStore.getSnapshot()).toBeNull();
  });

  it("áp dụng mã rồi gỡ mã", () => {
    appliedCouponStore.apply(SHOPLITE10);
    expect(appliedCouponStore.getSnapshot()).toEqual({ coupon: SHOPLITE10 });

    appliedCouponStore.clear();
    expect(appliedCouponStore.getSnapshot()).toBeNull();
  });

  it("báo cho listener khi trạng thái thay đổi và ngừng báo sau khi hủy đăng ký", () => {
    const listener = vi.fn();
    const unsubscribe = appliedCouponStore.subscribe(listener);

    appliedCouponStore.apply(SHOPLITE10);
    appliedCouponStore.clear();
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    appliedCouponStore.apply(SHOPLITE10);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("phía server luôn coi như chưa có mã (tránh chia sẻ state giữa các request)", () => {
    appliedCouponStore.apply(SHOPLITE10);
    expect(appliedCouponStore.getServerSnapshot()).toBeNull();
  });

  it("không ghi vào localStorage", () => {
    appliedCouponStore.apply(SHOPLITE10);
    expect(window.localStorage.length).toBe(0);
  });

  it("useAppliedCoupon cập nhật khi áp dụng và gỡ mã", () => {
    const { result } = renderHook(() => useAppliedCoupon());
    expect(result.current).toBeNull();

    act(() => appliedCouponStore.apply(SHOPLITE10));
    expect(result.current?.coupon.code).toBe("SHOPLITE10");

    act(() => appliedCouponStore.clear());
    expect(result.current).toBeNull();
  });
});

describe("getAppliedCouponStatus - bị chặn", () => {
  const NOW = new Date("2026-11-08T10:00:00+07:00");

  afterEach(() => {
    appliedCouponStore.reset();
  });

  it("chưa có mã → none, không giảm", () => {
    expect(getAppliedCouponStatus(null, 500_000, NOW)).toEqual({ status: "none", discount: 0 });
  });

  it("mã hợp lệ → active với số tiền giảm", () => {
    appliedCouponStore.apply(SHOPLITE10);
    expect(getAppliedCouponStatus(appliedCouponStore.getSnapshot(), 300_000, NOW)).toMatchObject({
      status: "active",
      discount: 30_000,
    });
  });

  it("server từ chối mã → blocked bất kể tạm tính, giảm 0đ", () => {
    appliedCouponStore.apply(SHOPLITE10);
    appliedCouponStore.markServerError({
      code: "COUPON_EXPIRED",
      message: "Mã giảm giá đã hết hạn",
    });

    for (const subtotal of [300_000, 1_000_000]) {
      expect(getAppliedCouponStatus(appliedCouponStore.getSnapshot(), subtotal, NOW)).toEqual({
        status: "blocked",
        coupon: SHOPLITE10,
        discount: 0,
        message: "Mã giảm giá đã hết hạn",
      });
    }
  });

  it("trình duyệt phát hiện mã đã hết hạn → blocked", () => {
    appliedCouponStore.apply({ ...SHOPLITE10, expiresOn: "2026-02-28" });
    expect(getAppliedCouponStatus(appliedCouponStore.getSnapshot(), 300_000, NOW)).toMatchObject({
      status: "blocked",
      message: "Mã giảm giá đã hết hạn",
    });
  });

  it("chỉ thoát trạng thái bị chặn bằng cách gỡ mã", () => {
    appliedCouponStore.apply(SHOPLITE10);
    appliedCouponStore.markServerError({
      code: "COUPON_EXPIRED",
      message: "Mã giảm giá đã hết hạn",
    });
    appliedCouponStore.clear();
    expect(getAppliedCouponStatus(appliedCouponStore.getSnapshot(), 300_000, NOW)).toEqual({
      status: "none",
      discount: 0,
    });
  });
});

describe("getAppliedCouponStatus - tạm ngưng", () => {
  const NOW = new Date("2026-11-08T10:00:00+07:00");
  const GIAM50K: PublicCoupon = {
    code: "GIAM50K",
    type: "fixed",
    amount: 50_000,
    minSubtotal: 500_000,
  };

  afterEach(() => {
    appliedCouponStore.reset();
  });

  it("tạm tính tụt dưới tối thiểu 1đ → suspended, giảm 0đ, báo cần mua thêm 1đ", () => {
    appliedCouponStore.apply(GIAM50K);
    const status = getAppliedCouponStatus(appliedCouponStore.getSnapshot(), 499_999, NOW);

    expect(status).toMatchObject({ status: "suspended", coupon: GIAM50K, discount: 0 });
    expect(status.status === "suspended" && status.message).toContain(
      `Mua thêm ${formatCurrency(1)}`,
    );
  });

  it("tự có hiệu lực lại khi tạm tính đạt lại đúng mức tối thiểu", () => {
    appliedCouponStore.apply(GIAM50K);
    const state = appliedCouponStore.getSnapshot();

    expect(getAppliedCouponStatus(state, 499_999, NOW).status).toBe("suspended");
    expect(getAppliedCouponStatus(state, 500_000, NOW)).toEqual({
      status: "active",
      coupon: GIAM50K,
      discount: 50_000,
    });
  });

  it("lỗi từ server được ưu tiên hơn tạm ngưng (bị chặn)", () => {
    appliedCouponStore.apply(GIAM50K);
    appliedCouponStore.markServerError({
      code: "COUPON_MIN_SUBTOTAL_NOT_MET",
      message: "Đơn hàng chưa đạt giá trị tối thiểu",
    });

    expect(getAppliedCouponStatus(appliedCouponStore.getSnapshot(), 499_999, NOW).status).toBe(
      "blocked",
    );
    expect(getAppliedCouponStatus(appliedCouponStore.getSnapshot(), 600_000, NOW).status).toBe(
      "blocked",
    );
  });
});
