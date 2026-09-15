/** AWS IoT Core closes the connection, if one message is bigger */
export const MAX_IOT_MESSAGE_BYTES = 128 * 1024;

// a connection closed so fast after the start is rejected because of the certificates
const CERTIFICATE_ERROR_MS = 500;
// events within this time before the disconnect are considered as its cause
const RECENT_MS = 5000;
// several short connections in a row indicate a second system with the same account
const SHORT_CONNECTION_MS = 60_000;
const SHORT_CONNECTIONS_WINDOW_MS = 10 * 60_000;
const SHORT_CONNECTIONS_COUNT = 3;

export type MqttPacket = {
    cmd: string;
    topic?: string;
    payload?: string | Buffer;
};

export type DisconnectInfo = {
    /** The adapter closed the connection itself */
    intentional: boolean;
    /** false if a connection attempt failed */
    wasConnected: boolean;
    /** Number of the failed connection attempt (0 if it was connected) */
    attempt: number;
    /** Details for the log */
    text: string;
    /** Probable cause, if it could be detected */
    cause?: string;
};

export function formatDuration(ms: number): string {
    if (ms < 1000) {
        return `${Math.round(ms)} ms`;
    }
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) {
        return `${seconds} s`;
    }
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
        return `${minutes} min ${seconds % 60} s`;
    }
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
        return `${hours} h ${minutes % 60} min`;
    }
    return `${Math.floor(hours / 24)} d ${hours % 24} h`;
}

function formatBytes(bytes: number): string {
    return bytes < 1024 ? `${bytes} bytes` : `${(bytes / 1024).toFixed(1)} KB`;
}

/**
 * Collects information about the cloud connection to explain disconnects.
 * AWS IoT (MQTT 3.1.1) does not send the reason of a disconnect, so the cause is derived from what happened before.
 */
export default class ConnectionDiagnostics {
    private readonly keepaliveMs: number;
    private readonly now: () => number;
    private startedAt = 0;
    private connectedAt = 0;
    private disconnectedAt = 0;
    private lastReceivedAt = 0;
    private lastSent: { topic: string; bytes: number; ts: number } | null = null;
    private lastError: { text: string; ts: number } | null = null;
    private failedAttempts = 0;
    private intentional = false;
    private shortConnections: number[] = [];

    constructor(keepaliveSec: number, now: () => number = Date.now) {
        this.keepaliveMs = keepaliveSec * 1000;
        this.now = now;
    }

    /** A new device connection is started */
    onStart(): void {
        this.startedAt = this.now();
        this.connectedAt = 0;
        this.failedAttempts = 0;
        this.intentional = false;
        this.lastError = null;
    }

    /** The adapter closes the connection itself */
    markIntentionalClose(): void {
        this.intentional = true;
    }

    getFailedAttempts(): number {
        return this.failedAttempts;
    }

    onPacketSend(packet: MqttPacket): void {
        if (packet?.cmd === 'publish' && typeof packet.topic === 'string') {
            const payload = packet.payload ?? '';
            this.lastSent = {
                topic: packet.topic,
                bytes: typeof payload === 'string' ? Buffer.byteLength(payload) : payload.length,
                ts: this.now(),
            };
        }
    }

    onPacketReceive(): void {
        this.lastReceivedAt = this.now();
    }

    onError(text: string): void {
        this.lastError = { text, ts: this.now() };
    }

    /**
     * The connection is established
     *
     * @returns description of the interruption, if the connection was restored after a disconnect
     */
    onConnect(): string | null {
        const now = this.now();
        let restored: string | null = null;
        if (this.disconnectedAt) {
            restored = `after ${formatDuration(now - this.disconnectedAt)}`;
            if (this.failedAttempts) {
                restored += ` and ${this.failedAttempts} failed attempt(s)`;
            }
        }
        this.connectedAt = now;
        this.lastReceivedAt = now;
        this.disconnectedAt = 0;
        this.failedAttempts = 0;
        this.lastError = null;
        return restored;
    }

    /** The connection is closed or a connection attempt failed */
    onClose(): DisconnectInfo {
        const now = this.now();

        if (this.intentional) {
            const wasConnected = !!this.connectedAt;
            this.connectedAt = 0;
            return { intentional: true, wasConnected, attempt: 0, text: 'closed by adapter' };
        }

        const recentError = this.lastError && now - this.lastError.ts <= RECENT_MS ? this.lastError.text : '';

        if (!this.connectedAt) {
            this.failedAttempts++;
            let cause: string | undefined;
            if (this.failedAttempts === 1 && now - this.startedAt < CERTIFICATE_ERROR_MS) {
                cause =
                    'Looks like your connection certificates are invalid. Please renew them via configuration dialog.';
            } else if (recentError) {
                cause = `connection error: ${recentError}`;
            }
            return {
                intentional: false,
                wasConnected: false,
                attempt: this.failedAttempts,
                text: `connection attempt ${this.failedAttempts} failed${recentError ? `: ${recentError}` : ''}`,
                cause,
            };
        }

        const duration = now - this.connectedAt;
        const silence = now - this.lastReceivedAt;
        const lastSent = this.lastSent && this.lastSent.ts >= this.connectedAt ? this.lastSent : null;

        const details = [
            `connected for ${formatDuration(duration)}`,
            `last data received ${formatDuration(silence)} ago`,
        ];
        if (lastSent) {
            details.push(
                `last sent "${lastSent.topic}" (${formatBytes(lastSent.bytes)}) ${formatDuration(now - lastSent.ts)} ago`,
            );
        }
        if (recentError) {
            details.push(`error: ${recentError}`);
        }

        let cause: string | undefined;
        if (lastSent && lastSent.bytes > MAX_IOT_MESSAGE_BYTES && now - lastSent.ts <= RECENT_MS) {
            cause = `the message to "${lastSent.topic}" was too big (${formatBytes(lastSent.bytes)}, max ${formatBytes(MAX_IOT_MESSAGE_BYTES)}). The cloud closes the connection on too big messages.`;
        } else if (recentError) {
            cause = `connection error: ${recentError}`;
        } else if (silence >= this.keepaliveMs * 1.5) {
            cause = `no data received for ${formatDuration(silence)} (keepalive ${this.keepaliveMs / 1000} s). The network connection was interrupted (router, internet connection or firewall).`;
        } else if (duration < SHORT_CONNECTION_MS) {
            this.shortConnections = this.shortConnections.filter(ts => now - ts <= SHORT_CONNECTIONS_WINDOW_MS);
            this.shortConnections.push(now);
            if (this.shortConnections.length >= SHORT_CONNECTIONS_COUNT) {
                cause = `the cloud closed the connection ${this.shortConnections.length} times within ${formatDuration(SHORT_CONNECTIONS_WINDOW_MS)} shortly after connecting. Probably another ioBroker system is connected with the same account at the same time (e.g., an old or a test system).`;
            }
        }
        if (duration >= SHORT_CONNECTION_MS) {
            this.shortConnections = [];
        }

        this.disconnectedAt = now;
        this.connectedAt = 0;
        this.failedAttempts = 0;

        return { intentional: false, wasConnected: true, attempt: 0, text: details.join(', '), cause };
    }
}
