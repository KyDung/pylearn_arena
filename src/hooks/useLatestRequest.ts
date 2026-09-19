"use client";

import { useCallback, useEffect, useRef } from "react";

/** Cancel obsolete work on a new request or when the page unmounts. */
export function useLatestRequest() {
  const pending = useRef<AbortController | null>(null);
  const cancel = useCallback(() => pending.current?.abort(), []);
  const start = useCallback(() => {
    pending.current?.abort();
    pending.current = new AbortController();
    return pending.current.signal;
  }, []);
  useEffect(() => cancel, [cancel]);
  return { start, cancel };
}
