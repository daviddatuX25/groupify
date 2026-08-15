export type SavedSessionStatus = 'live' | 'frozen' | 'archived';

export type SavedSession = {
    code: string;
    label: string;
    lastVisitedAt: number;
    status?: SavedSessionStatus;
};

export const SAVED_SESSIONS_EVENT = 'groupify:saved-sessions';

const STORAGE_KEY = 'groupify.saved_sessions.v1';
const MAX_SAVED_SESSIONS = 8;

function isSavedSession(value: unknown): value is SavedSession {
    if (!value || typeof value !== 'object') return false;

    const entry = value as Partial<SavedSession>;

    return (
        typeof entry.code === 'string'
        && /^\d{6}$/.test(entry.code)
        && typeof entry.label === 'string'
        && typeof entry.lastVisitedAt === 'number'
        && Number.isFinite(entry.lastVisitedAt)
        && (entry.status === undefined || ['live', 'frozen', 'archived'].includes(entry.status))
    );
}

function readSavedSessions(): SavedSession[] {
    if (typeof window === 'undefined') return [];

    try {
        const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]');

        if (!Array.isArray(parsed)) return [];

        const unique = new Map<string, SavedSession>();
        parsed
            .filter(isSavedSession)
            .sort((a, b) => b.lastVisitedAt - a.lastVisitedAt)
            .forEach((session) => {
                if (!unique.has(session.code)) unique.set(session.code, session);
            });

        return Array.from(unique.values()).slice(0, MAX_SAVED_SESSIONS);
    } catch {
        return [];
    }
}

function writeSavedSessions(sessions: SavedSession[]) {
    if (typeof window === 'undefined') return;

    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, MAX_SAVED_SESSIONS)));
        window.dispatchEvent(new Event(SAVED_SESSIONS_EVENT));
    } catch {
        // Private browsing and full storage must not block the join flow.
    }
}

export function listSavedSessions(): SavedSession[] {
    return readSavedSessions();
}

export function isSessionSaved(code: string): boolean {
    return readSavedSessions().some((session) => session.code === code);
}

export function saveSession(code: string, status?: SavedSessionStatus): void {
    if (!/^\d{6}$/.test(code)) return;

    const sessions = readSavedSessions().filter((session) => session.code !== code);
    const previous = readSavedSessions().find((session) => session.code === code);

    sessions.unshift({
        code,
        label: previous?.label ?? `Room ${code}`,
        lastVisitedAt: Date.now(),
        ...(status ? { status } : previous?.status ? { status: previous.status } : {}),
    });
    writeSavedSessions(sessions);
}

export function touchSavedSession(code: string, status?: SavedSessionStatus): void {
    if (!isSessionSaved(code)) return;
    saveSession(code, status);
}

export function removeSavedSession(code: string): void {
    writeSavedSessions(readSavedSessions().filter((session) => session.code !== code));
}
