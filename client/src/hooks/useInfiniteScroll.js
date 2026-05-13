import { useEffect, useRef, useCallback } from "react";

/**
 * Triggers `onLoadMore` when the sentinel div enters viewport.
 * Returns the ref to attach to your sentinel element.
 */
const useInfiniteScroll = (onLoadMore, hasNextPage, isLoading) => {
  const sentinelRef = useRef(null);

  const handler = useCallback(
    ([entry]) => {
      if (entry.isIntersecting && hasNextPage && !isLoading) onLoadMore();
    },
    [onLoadMore, hasNextPage, isLoading]
  );

  useEffect(() => {
    const obs = new IntersectionObserver(handler, { rootMargin: "200px" });
    const el  = sentinelRef.current;
    if (el) obs.observe(el);
    return () => { if (el) obs.unobserve(el); };
  }, [handler]);

  return sentinelRef;
};

export default useInfiniteScroll;
