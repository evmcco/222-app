// Serialize refreshes, coalescing requests that arrive in flight into one trailing
// pass. Every caller waits for that pass too, including pull-to-refresh callers.
export function createRefreshQueue(refresh: () => Promise<void>) {
  let pending: Promise<void> | undefined;
  let requested = false;
  return () => {
    requested = true;
    if (!pending) {
      pending = (async () => {
        await Promise.resolve();
        try {
          do {
            requested = false;
            await refresh();
          } while (requested);
        } finally { pending = undefined; }
      })();
    }
    return pending;
  };
}
