"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { buttonStyles } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { Product } from "@/features/catalog/types";
import { useWishlist } from "@/features/wishlist/use-wishlist";
import { WishlistItemRow } from "./wishlist-item-row";

interface WishlistViewProps {
  /** Catalog hiện tại do Server Component truyền xuống - nguồn giá/tồn kho mới nhất. */
  products: Product[];
}

export function WishlistView({ products }: WishlistViewProps) {
  const { productIds, hydrated, remove, prune } = useWishlist();

  const productsById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );

  // Giữ thứ tự của danh sách yêu thích (mới nhất đứng đầu), bỏ qua mã không còn trong catalog.
  const items = productIds.flatMap((id) => {
    const product = productsById.get(id);
    return product ? [product] : [];
  });

  const hasUnknownIds = items.length !== productIds.length;

  useEffect(() => {
    if (hydrated && hasUnknownIds) prune([...productsById.keys()]);
  }, [hydrated, hasUnknownIds, productsById, prune]);

  if (!hydrated) {
    return <div className="h-64 animate-pulse rounded-2xl bg-slate-200/60" aria-busy />;
  }

  if (items.length === 0) {
    return (
      <div data-testid="wishlist-empty">
        <EmptyState
          emoji="💝"
          title="Danh sách yêu thích đang trống"
          description="Bấm vào biểu tượng trái tim trên sản phẩm để lưu lại và quay lại mua sau."
          action={
            <Link href="/products" className={buttonStyles()}>
              Khám phá sản phẩm
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <section className="rounded-2xl bg-white px-5 shadow-sm ring-1 ring-slate-200">
      <p className="border-b border-slate-100 py-4 text-sm text-slate-600">
        {items.length} sản phẩm
      </p>
      <ul className="divide-y divide-slate-100">
        {items.map((product) => (
          <WishlistItemRow key={product.id} product={product} onRemove={() => remove(product.id)} />
        ))}
      </ul>
    </section>
  );
}
