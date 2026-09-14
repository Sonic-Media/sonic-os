export type SaveCoordinatorState = {
  epoch: number;
  locked: boolean;
  inFlight: Promise<unknown> | null;
};

export function createSaveCoordinatorState(): SaveCoordinatorState {
  return {
    epoch: 0,
    locked: false,
    inFlight: null,
  };
}

/** Marks the start of an explicit save (final/historical). Returns epoch for stale checks. */
export function beginExplicitSave(state: SaveCoordinatorState): number {
  state.epoch += 1;
  state.locked = true;
  return state.epoch;
}

export function endExplicitSave(state: SaveCoordinatorState): void {
  state.locked = false;
}

export function isAutosavePermitted(state: SaveCoordinatorState): boolean {
  return !state.locked;
}

export function shouldApplySaveResult(
  state: SaveCoordinatorState,
  epochAtStart: number
): boolean {
  return epochAtStart === state.epoch;
}

export function trackInFlightSave(
  state: SaveCoordinatorState,
  promise: Promise<unknown>
): void {
  state.inFlight = promise;
}

export function clearInFlightSaveIfCurrent(
  state: SaveCoordinatorState,
  promise: Promise<unknown>
): void {
  if (state.inFlight === promise) {
    state.inFlight = null;
  }
}

export async function awaitInFlightSave(
  state: SaveCoordinatorState
): Promise<void> {
  if (!state.inFlight) {
    return;
  }

  const pending = state.inFlight;
  await pending.catch(() => undefined);
  clearInFlightSaveIfCurrent(state, pending);
}
