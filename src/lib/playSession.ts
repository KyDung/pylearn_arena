export interface PlaySessionReference {
  id: number;
  game_path?: string;
}

export function findPlaySession<T extends PlaySessionReference>(
  sessions: T[],
  sessionId: string | null,
  path: string | null,
): T | null {
  if (sessionId !== null) {
    const id = Number(sessionId);
    return Number.isSafeInteger(id) && id > 0
      ? sessions.find((session) => session.id === id) ?? null
      : null;
  }
  return path ? sessions.find((session) => session.game_path === path) ?? null : null;
}
