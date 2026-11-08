"use client";

import { useEffect, useRef, useState } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/cn";
import { useWishlist } from "@/features/wishlist/use-wishlist";
import { MAX_WISHLIST_ITEMS } from "@/features/wishlist/wishlist-reducer";

export const WISHLIST_FULL_MESSAGE = `Danh sách yêu thích đã đầy (tối đa ${MAX_WISHLIST_ITEMS} sản phẩm). Hãy bỏ bớt để thêm sản phẩm mới.`;

const MESSAGE_DURATION_MS = 4000;

interface WishlistButtonProps {
  productId: string;
  productName: string;
  /** `icon`: nút tròn trên thẻ sản phẩm; `labeled`: nút có chữ ở trang chi tiết. */
  variant?: "icon" | "labeled";
  className?: string;
}

/** Nút trái tim bật/tắt sản phẩm trong danh sách yêu thích. */
export function WishlistButton({
  productId,
  productName,
  variant = "icon",
  className,
}: WishlistButtonProps) {
  const { isLiked, toggle } = useWishlist();
  const [message, setMessage] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const liked = isLiked(productId);

  function handleClick() {
    const result = toggle(productId);
    clearTimeout(timer.current);
    if (result === "full") {
      setMessage(WISHLIST_FULL_MESSAGE);
      timer.current = setTimeout(() => setMessage(""), MESSAGE_DURATION_MS);
    } else {
      setMessage("");
    }
  }

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={liked}
        aria-label={`Yêu thích ${productName}`}
        data-testid="wishlist-button"
        className={cn(
          "inline-flex items-center justify-center font-semibold transition-colors",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600",
          variant === "icon"
            ? "size-9 rounded-full bg-white/90 shadow-sm ring-1 ring-slate-200 hover:bg-white"
            : "h-12 gap-2 rounded-xl bg-white px-6 text-base ring-1 ring-slate-300 ring-inset hover:bg-slate-50",
          liked ? "text-rose-600" : "text-slate-500 hover:text-rose-600",
        )}
      >
        <Heart className={cn("size-5", liked && "fill-current")} aria-hidden />
        {variant === "labeled" && <span className="text-slate-900">Yêu thích</span>}
      </button>
      {/* Vùng live luôn tồn tại để screen reader đọc được thông báo khi nội dung thay đổi. */}
      <p
        role="status"
        aria-live="polite"
        data-testid="wishlist-message"
        className={cn(
          !message && "sr-only",
          message &&
            (variant === "icon"
              ? "absolute top-full right-0 z-20 mt-1 w-56 rounded-lg bg-slate-900 px-3 py-2 text-xs text-white shadow-lg"
              : "mt-2 text-sm text-amber-700"),
        )}
      >
        {message}
      </p>
    </div>
  );
}
