const FAILURE_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;
const BASE_LOCK_MS = 60 * 1000;

/** @type {Map<string, { failures: number, lockedUntil: number, firstFailureAt: number }>} */
const attempts = new Map();

function normalizeUsername(username) {
    return String(username || '').trim().toLowerCase();
}

function getEntry(username) {
    const key = normalizeUsername(username);
    if (!key) return null;
    const now = Date.now();
    let entry = attempts.get(key);
    if (entry && now - entry.firstFailureAt > FAILURE_WINDOW_MS && now >= entry.lockedUntil) {
        attempts.delete(key);
        entry = null;
    }
    return { key, entry, now };
}

function isLocked(username) {
    const state = getEntry(username);
    if (!state || !state.entry) return { locked: false };
    if (state.now < state.entry.lockedUntil) {
        const retryAfterSec = Math.ceil((state.entry.lockedUntil - state.now) / 1000);
        return { locked: true, retryAfterSec };
    }
    return { locked: false };
}

function recordFailure(username) {
    const state = getEntry(username);
    if (!state) return;
    const { key, now } = state;
    let entry = state.entry;
    if (!entry) {
        entry = { failures: 0, lockedUntil: 0, firstFailureAt: now };
    }
    entry.failures += 1;
    if (entry.failures >= MAX_FAILURES) {
        const lockMultiplier = Math.min(entry.failures - MAX_FAILURES + 1, 8);
        entry.lockedUntil = now + BASE_LOCK_MS * lockMultiplier;
    }
    attempts.set(key, entry);
}

function clearFailures(username) {
    const key = normalizeUsername(username);
    if (key) attempts.delete(key);
}

module.exports = {
    isLocked,
    recordFailure,
    clearFailures,
    MAX_FAILURES
};
