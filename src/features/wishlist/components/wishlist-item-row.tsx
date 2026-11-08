"use client";

import Link from "next/link";
import { HeartOff } from "lucide-react";
import { PriceTag } from "@/components/ui/price-tag";
import { AddToCartButton } from "@/features/cart/components/add-to-cart-button";
import { ProductImage } from "@/features/catalog/components/product-image";
import { StockBadge } from "@/features/catalog/components/stock-badge";
import type { Product } from "@/features/catalog/types";

interface WishlistItemRowProps {
  /** Dữ liệu mới nhất từ catalog (không phải bản lưu lúc thích). */
  product: Product;
  onRemove: () => void;
}

export function WishlistItemRow({ product, onRemove }: WishlistItemRowProps) {
  return (
    <li className="flex gap-4 py-4" data-testid="wishlist-item">
      {/* Link ảnh ẩn khỏi bàn phím/screen reader để không đọc trùng với link tên sản phẩm */}
      <Link
        href={`/products/${product.slug}`}
        className="w-20 shrink-0 sm:w-24"
        tabIndex={-1}
        aria-hidden
      >
        <ProductImage image={product.image} alt={product.name} size="sm" />
      </Link>
      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <Link
            href={`/products/${product.slug}`}
            className="font-semibold text-slate-900 hover:text-indigo-600"
          >
            {product.name}
          </Link>
          <PriceTag price={product.price} originalPrice={product.originalPrice} />
          <StockBadge product={product} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* AddToCartButton tự vô hiệu hóa khi hết hàng hoặc giỏ đã đạt số lượng tối đa. */}
          <AddToCartButton product={product} size="sm" />
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Bỏ thích ${product.name}`}
            className="inline-flex h-8 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-slate-600 hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
          >
            <HeartOff className="size-4" aria-hidden />
            Bỏ thích
          </button>
        </div>
      </div>
    </li>
  );
}
