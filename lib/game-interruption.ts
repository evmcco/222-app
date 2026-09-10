export interface FeedGameStatus {
  period?: number;
  type?: { name?: string; completed?: boolean };
}

export function getGameInterruption(status?: FeedGameStatus): { label: string; beforeKickoff: boolean } | null {
  if (status?.type?.completed) return null;
  const name = status?.type?.name;
  if (name !== 'STATUS_DELAYED' && name !== 'STATUS_SUSPENDED') return null;
  return { label: name === 'STATUS_SUSPENDED' ? 'Suspended' : 'Delayed', beforeKickoff: status?.period === 0 };
}
