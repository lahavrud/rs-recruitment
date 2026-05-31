import { useTranslation } from "react-i18next";

interface InfiniteScrollFooterProps {
  sentinelRef: (node: HTMLElement | null) => void;
  isFetchingMore: boolean;
}

/**
 * Bottom-of-list sentinel + loading indicator for `useInfiniteList`. The empty
 * div is what the IntersectionObserver watches; the `<p>` only appears while
 * the next page is in flight.
 */
export default function InfiniteScrollFooter({
  sentinelRef,
  isFetchingMore,
}: InfiniteScrollFooterProps) {
  const { t } = useTranslation();
  return (
    <>
      <div ref={sentinelRef} />
      {isFetchingMore && (
        <p className="mt-4 text-center text-xs text-white/30">
          {t("common.loading")}
        </p>
      )}
    </>
  );
}
