/**
 * utils/queueNotifications.ts
 *
 * Browser Notification + Sound utility for the Customer Token Page.
 * Follows the WebSocket snapshot architecture — all triggers are
 * driven by snapshot data, never by manual UI mutations.
 */

const STORAGE_KEY = "queue_notifications_enabled";
const SOUND_FILE = "/sounds/ringtone-you-would-be-glad-to-know.mp3";
const ICON_PATH = "/favicon.ico"; // use the app favicon as notification icon

// ── Permission ─────────────────────────────────────────────────────────────

/** Request browser notification permission. Returns true if granted. */
export async function requestNotificationPermission(): Promise<boolean> {
    if (typeof window === "undefined" || !("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    const result = await Notification.requestPermission();
    return result === "granted";
}

export function notificationPermissionGranted(): boolean {
    if (typeof window === "undefined" || !("Notification" in window)) return false;
    return Notification.permission === "granted";
}

// ── User preference storage ─────────────────────────────────────────────────

export function getNotificationsEnabled(): boolean {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY) === "true";
}

export function setNotificationsEnabled(enabled: boolean): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, enabled ? "true" : "false");
}

// ── Sound ───────────────────────────────────────────────────────────────────

export function playNotificationSound(): void {
    if (typeof window === "undefined") return;
    const audio = new Audio(SOUND_FILE);
    audio.volume = 1.0;
    audio.play().catch(() => { /* silently ignore autoplay block */ });
}

// ── Notification helper ─────────────────────────────────────────────────────

interface NotifyOptions {
    title: string;
    body: string;
    playSound?: boolean;
}

export function sendQueueNotification({ title, body, playSound = true }: NotifyOptions): void {
    if (!getNotificationsEnabled()) return;

    // Browser Notification
    if (notificationPermissionGranted()) {
        try {
            const n = new Notification(title, { body, icon: ICON_PATH, badge: ICON_PATH });
            // Auto-close after 8 seconds
            setTimeout(() => n.close(), 8000);
        } catch {
            /* some browsers throw in sandboxed iframes */
        }
    }

    // Sound
    if (playSound) {
        playNotificationSound();
    }
}

// ── Milestone trigger state ─────────────────────────────────────────────────

export type MilestoneState = {
    five: boolean;
    two: boolean;
    turn: boolean;
};

export function freshMilestoneState(): MilestoneState {
    return { five: false, two: false, turn: false };
}

/**
 * Check snapshot data and fire the correct notification if a milestone
 * is crossed for the first time. Mutates `triggered` in-place.
 *
 * @param myTokenNumber  - the customer's token number
 * @param currentServing - queue's current_serving from snapshot
 * @param triggered      - ref object tracking which milestones already fired
 */
export function checkAndNotifyMilestone(
    myTokenNumber: number,
    currentServing: number,
    triggered: MilestoneState
): void {
    if (!getNotificationsEnabled()) return;

    const remaining = myTokenNumber - currentServing;

    if (remaining <= 0 && !triggered.turn) {
        triggered.turn = true;
        sendQueueNotification({
            title: "🎉 It's Your Turn!",
            body: "Please proceed to the counter now.",
        });
    } else if (remaining <= 2 && remaining > 0 && !triggered.two) {
        triggered.two = true;
        sendQueueNotification({
            title: "Queue Update",
            body: "You are second in line. Please get ready.",
        });
    } else if (remaining <= 5 && remaining > 2 && !triggered.five) {
        triggered.five = true;
        sendQueueNotification({
            title: "Queue Update",
            body: "Only 5 people ahead. Please get ready.",
        });
    }
}
