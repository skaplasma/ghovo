export type Replay = { offset: number; startedAt: number | null; rate?: number };
export const replayTime = (state: Replay, now: number, total: number) =>
  Math.min(Math.max(0, total), Math.max(0, state.offset + (state.startedAt === null ? 0 : Math.max(0, now - state.startedAt) * (state.rate ?? 1))));
export function toggleReplay(state: Replay, now: number, total: number): Replay {
  const elapsed = replayTime(state, now, total);
  if (state.startedAt !== null && elapsed < total) return { ...state, offset: elapsed, startedAt: null };
  return { ...state, offset: elapsed >= total ? 0 : elapsed, startedAt: now };
}
export const stopReplay = (state: Replay, now: number, total: number): Replay => ({ ...state, offset: replayTime(state, now, total), startedAt: null });
export function seekReplay(state: Replay, target: number, now: number, total: number): Replay {
  const offset = Math.min(Math.max(0, total), Math.max(0, Number.isFinite(target) ? target : 0));
  const wasPlaying = state.startedAt !== null && replayTime(state, now, total) < total;
  return { ...state, offset, startedAt: wasPlaying && offset < total ? now : null };
}
export function changeReplayRate(state: Replay, rate: number, now: number, total: number): Replay {
  const offset = replayTime(state, now, total);
  return { ...state, offset, startedAt: state.startedAt !== null && offset < total ? now : null, rate: [0.5, 1, 2, 4].includes(rate) ? rate : 1 };
}
