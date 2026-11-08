"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { TicketPercent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { ApiErrorBody } from "@/lib/http";
import { getCartSubtotal } from "@/features/cart/cart-reducer";
import type { CartItem } from "@/features/cart/types";
import { appliedCouponStore, useAppliedCouponStatus } from "../applied-coupon-store";
import { normalizeCouponCode } from "../coupon-rules";
import type { CouponCheckResult } from "../types";

const MESSAGE_ID = "coupon-message";
const EMPTY_CODE_MESSAGE = "Vui lòng nhập mã giảm giá";

interface CouponFieldProps {
  items: CartItem[];
}

/** Ô nhập mã giảm giá ở trang thanh toán. Mã được kiểm tra ở server qua /api/coupons/validate. */
export function CouponField({ items }: CouponFieldProps) {
  const couponStatus = useAppliedCouponStatus(getCartSubtotal({ items }));
  const [value, setValue] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const focusInputAfterRemove = useRef(false);

  const hasCoupon = couponStatus.status !== "none";
  useEffect(() => {
    // Sau khi gỡ mã, đưa con trỏ về ô nhập để khách nhập mã khác ngay
    if (!hasCoupon && focusInputAfterRemove.current) {
      focusInputAfterRemove.current = false;
      inputRef.current?.focus();
    }
  }, [hasCoupon]);

  function removeCoupon() {
    focusInputAfterRemove.current = true;
    appliedCouponStore.clear();
  }

  async function applyCoupon() {
    if (checking) return;
    const couponCode = normalizeCouponCode(value);
    if (couponCode === "") {
      setError(EMPTY_CODE_MESSAGE);
      return;
    }

    setChecking(true);
    try {
      const response = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          couponCode,
          items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
        }),
      });
      if (response.ok) {
        const result = (await response.json()) as CouponCheckResult;
        appliedCouponStore.apply(result.coupon);
        setValue("");
        setError(null);
      } else {
        const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
        setError(
          body?.error.details?.couponCode ??
            body?.error.message ??
            "Không thể kiểm tra mã giảm giá, vui lòng thử lại.",
        );
      }
    } catch {
      setError("Không kết nối được máy chủ, vui lòng thử lại.");
    } finally {
      setChecking(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // Enter trong ô mã chỉ áp dụng mã, không gửi form đặt hàng
    if (event.key === "Enter") {
      event.preventDefault();
      void applyCoupon();
    }
  }

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      {hasCoupon ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm">
            <TicketPercent
              className={cn(
                "size-5",
                couponStatus.status === "active" ? "text-emerald-600" : "text-slate-400",
              )}
              aria-hidden
            />
            <span className="text-slate-600">Mã giảm giá:</span>
            <span
              data-testid="coupon-applied"
              className={cn(
                "font-semibold",
                couponStatus.status === "active" ? "text-emerald-700" : "text-slate-500",
              )}
            >
              {couponStatus.coupon.code}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto"
              onClick={removeCoupon}
              data-testid="coupon-remove"
            >
              Gỡ mã
            </Button>
          </div>
          {couponStatus.status !== "active" && (
            <p
              id={MESSAGE_ID}
              role="alert"
              data-testid="coupon-message"
              className="text-sm text-rose-600"
            >
              {couponStatus.message}
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="couponCode" className="text-sm font-medium text-slate-700">
            Mã giảm giá
          </label>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              id="couponCode"
              name="couponCode"
              data-testid="coupon-input"
              value={value}
              onChange={(event) => {
                setValue(event.target.value);
                setError(null);
              }}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? MESSAGE_ID : undefined}
              onKeyDown={handleKeyDown}
              autoComplete="off"
              placeholder="Nhập mã, ví dụ SHOPLITE10"
              className={cn(
                "h-10 w-full min-w-0 flex-1 rounded-xl border-0 bg-white px-3 text-sm uppercase ring-1 ring-inset placeholder:text-slate-400 placeholder:normal-case focus:ring-2 focus:ring-indigo-600 focus:outline-none",
                error ? "ring-rose-400" : "ring-slate-300",
              )}
            />
            <Button
              variant="secondary"
              onClick={() => void applyCoupon()}
              disabled={checking}
              data-testid="coupon-apply"
            >
              {checking ? "Đang kiểm tra…" : "Áp dụng"}
            </Button>
          </div>
          {error && (
            <p
              id={MESSAGE_ID}
              role="alert"
              data-testid="coupon-message"
              className="text-sm text-rose-600"
            >
              {error}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
