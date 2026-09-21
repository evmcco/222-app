/** Keep the existing scoreboard usable during a staggered backend rollout.
 * Never mix legacy games into a coherent snapshot or use them to derive records.
 */
export function shouldUseLegacyGames(hasSnapshot: boolean, error: string | null): boolean {
  return !hasSnapshot && !!error
    && /could not find the function public\.get_competition_snapshot\b/i.test(error);
}
