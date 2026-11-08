import { useMemo, useSyncExternalStore } from "react";
import { useHydrated } from "@/lib/use-hydrated";
import type { ToggleResult } from "./types";
import { getToggleResult } from "./wishlist-reducer";
import { wishlistStore } from "./wishlist-store";

export function useWishlist() {
  const wishlist = useSyncExternalStore(
    wishlistStore.subscribe,
    wishlistStore.getSnapshot,
    wishlistStore.getServerSnapshot,
  );
  const hydrated = useHydrated();

  return useMemo(
    () => ({
      productIds: wishlist.productIds,
      count: wishlist.productIds.length,
      /** false trong lần render đầu (chưa đọc localStorage) - dùng để hiển thị skeleton. */
      hydrated,
      isLiked: (productId: string) => wishlist.productIds.includes(productId),
      /** Bật/tắt yêu thích; trả về "full" (và không đổi gì) khi danh sách đã đầy. */
      toggle: (productId: string): ToggleResult => {
        const result = getToggleResult(wishlistStore.getSnapshot(), productId);
        wishlistStore.dispatch({ type: "toggle", productId });
        return result;
      },
      remove: (productId: string) => wishlistStore.dispatch({ type: "remove", productId }),
      /** Loại các mã không còn trong catalog. */
      prune: (knownIds: readonly string[]) => wishlistStore.dispatch({ type: "prune", knownIds }),
    }),
    [wishlist, hydrated],
  );
}
