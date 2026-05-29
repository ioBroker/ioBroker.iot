import type IotAdapter from '../main';

interface CustomSettings {
    enabled: boolean;
    changesType: 'update' | 'change';
    triggerType: 'both' | 'true' | 'false';
    withAck: 'any' | 'true' | 'false';
    messageFalse?: string;
    messageTrue?: string;
    message?: string;
    delta?: number
    priority: 'high' | 'normal' | 'silence';
    ttlSeconds: number;
}

/**
 * One rule describing when and what to send to the ioBroker Visu App
 * if a watched (foreign) state changes.
 *
 * Example for `javascript.0.alarm` (boolean):
 *   {
 *       id: 'javascript.0.alarm',
 *       title: 'Alarmanlage',
 *       messageTrue: 'Alarmanlage ist aktiviert',
 *       messageFalse: 'Alarmanlage ist deaktiviert',
 *       category: 'alarm',
 *       trigger: 'change',
 *   }
 */
export interface AppNotificationRule {
    /** Foreign state id to watch (e.g. `javascript.0.alarm`). */
    id: string;
    /** Title shown by the app. Defaults to `'ioBroker'`. */
    title?: string;
    /**
     * Message template. Supports placeholders `{id}`, `{value}`, `{val}`,
     * `{oldValue}`, `{title}`. Used when `messageTrue` / `messageFalse`
     * are not applicable (non-boolean states or no specific match).
     */
    message?: string;
    /** Used when the state becomes truthy. Falls back to `message`. */
    messageTrue?: string;
    /** Used when the state becomes falsy. Falls back to `message`. */
    messageFalse?: string;
    /**
     * When to actually fire:
     *  - `'change'`  – only on value change (default)
     *  - `'true'`    – only when the new value is truthy
     *  - `'false'`   – only when the new value is falsy
     *  - `'any'`     – on every ack update (use with care)
     */
    trigger?: 'change' | 'true' | 'false' | 'any';
    /**
     * Free-text grouping tag delivered alongside the message so an Android
     * widget can decide what to render (`alarm`, `door`, `presence`, ...).
     */
    category?: string;
    /** Forward FCM priority to the cloud. */
    priority?: 'high' | 'normal';
    /** Time-to-live in seconds for the FCM message. */
    ttlSeconds?: number;
    /** If `true`, also fire when the state is set with `ack === false`. Default: `false`. */
    includeUnacked?: boolean;
}

/**
 * Payload that ends up being JSON-encoded and forwarded by
 * `IotAdapter.sendMessageToApp()` to `https://app-message.iobroker.in/`.
 * Extra fields (`payload`, `category`, `id`, ...) are passed through to
 * the FCM data section so an Android widget can act on them.
 */
export interface AppNotificationPayload {
    title: string;
    message: string;
    priority?: 'high';
    ttlSeconds?: number;
    /** Structured data for widgets / deep links. */
    payload: {
        id: string;
        value: ioBroker.StateValue;
        oldValue?: ioBroker.StateValue;
        category?: string;
        ack: boolean;
        ts: number;
    };
}

const PLACEHOLDER_RE = /\{(id|value|val|oldValue|title)\}/g;

/**
 * Substitute the supported placeholders in a message / title template.
 */
function applyTemplate(
    template: string,
    ctx: { id: string; value: ioBroker.StateValue; oldValue: ioBroker.StateValue | undefined; title: string },
): string {
    return template.replace(PLACEHOLDER_RE, (_match, key: string) => {
        switch (key) {
            case 'id':
                return ctx.id;
            case 'value':
            case 'val':
                return ctx.value === null || ctx.value === undefined ? '' : String(ctx.value);
            case 'oldValue':
                return ctx.oldValue === null || ctx.oldValue === undefined ? '' : String(ctx.oldValue);
            case 'title':
                return ctx.title;
            default:
                return '';
        }
    });
}

/**
 * Decide which message text matches the new state value, or `null` if the
 * rule does not produce a message for it.
 */
function pickMessage(rule: AppNotificationRule, value: ioBroker.StateValue): string | null {
    const truthy = !!value;
    if (truthy && rule.messageTrue) {
        return rule.messageTrue;
    }
    if (!truthy && rule.messageFalse) {
        return rule.messageFalse;
    }
    return rule.message ?? null;
}

/**
 * Build the JSON payload to send to the app for a given rule + state change.
 * Returns `null` if the rule has no message for this transition (the caller
 * should silently skip).
 */
export function buildAppNotification(
    rule: AppNotificationRule,
    state: ioBroker.State,
    oldValue: ioBroker.StateValue | undefined,
): AppNotificationPayload | null {
    const rawMessage = pickMessage(rule, state.val);
    if (!rawMessage) {
        return null;
    }
    const title = rule.title || 'ioBroker';
    const ctx = { id: rule.id, value: state.val, oldValue, title };

    const payload: AppNotificationPayload = {
        title: applyTemplate(title, ctx),
        message: applyTemplate(rawMessage, ctx),
        payload: {
            id: rule.id,
            value: state.val,
            oldValue,
            category: rule.category,
            ack: state.ack,
            ts: state.ts ?? Date.now(),
        },
    };
    if (rule.priority === 'high') {
        payload.priority = 'high';
    }
    if (rule.ttlSeconds && rule.ttlSeconds > 0) {
        payload.ttlSeconds = Math.min(rule.ttlSeconds, 3_600 * 48);
    }
    return payload;
}

/**
 * Returns `true` if this rule should fire for the given state change.
 */
function shouldFire(
    rule: AppNotificationRule,
    state: ioBroker.State,
    oldValue: ioBroker.StateValue | undefined,
): boolean {
    if (!state.ack && !rule.includeUnacked) {
        return false;
    }
    switch (rule.trigger ?? 'change') {
        case 'any':
            return true;
        case 'true':
            return !!state.val && state.val !== oldValue;
        case 'false':
            return !state.val && state.val !== oldValue;
        case 'change':
        default:
            return state.val !== oldValue;
    }
}

/**
 * Manages a set of {@link AppNotificationRule}s: subscribes to the relevant
 * foreign states, remembers their last value, and dispatches a predefined
 * message (with id + value payload) via the adapter's existing
 * `sendMessageToApp()` whenever a rule matches.
 *
 * Wiring in `main.ts`:
 *
 * ```ts
 * import { AppNotifications } from './lib/appNotifications';
 *
 * // in the constructor / main():
 * this.appNotifications = new AppNotifications(this);
 * await this.appNotifications.setRules(this.config.appNotifications ?? []);
 *
 * // in stateChange:
 * void this.appNotifications?.handleStateChange(id, state);
 *
 * // in unload:
 * await this.appNotifications?.destroy();
 * ```
 */
export class AppNotifications {
    private readonly adapter: IotAdapter;
    private rules: Map<string, AppNotificationRule> = new Map();
    private lastValues: Map<string, ioBroker.StateValue | undefined> = new Map();

    constructor(adapter: IotAdapter) {
        this.adapter = adapter;
    }

    /**
     * Replace the active rule set. Subscribes to new foreign state ids and
     * unsubscribes ones that are no longer referenced. Seeds the
     * last-value cache so the first event after start doesn't spuriously
     * fire as a "change".
     */
    async setRules(rules: AppNotificationRule[]): Promise<void> {
        const next = new Map<string, AppNotificationRule>();
        for (const rule of rules) {
            if (!rule?.id) {
                this.adapter.log.warn('[appNotifications] Skipping rule without id');
                continue;
            }
            if (!rule.message && !rule.messageTrue && !rule.messageFalse) {
                this.adapter.log.warn(`[appNotifications] Rule for "${rule.id}" has no message; skipping`);
                continue;
            }
            next.set(rule.id, rule);
        }

        // unsubscribe removed
        for (const id of this.rules.keys()) {
            if (!next.has(id)) {
                try {
                    await this.adapter.unsubscribeForeignStatesAsync(id);
                } catch (e) {
                    this.adapter.log.warn(`[appNotifications] Cannot unsubscribe "${id}": ${e}`);
                }
                this.lastValues.delete(id);
            }
        }
        // subscribe added & seed cache
        for (const [id] of next) {
            if (!this.rules.has(id)) {
                try {
                    await this.adapter.subscribeForeignStatesAsync(id);
                } catch (e) {
                    this.adapter.log.warn(`[appNotifications] Cannot subscribe to "${id}": ${e}`);
                }
                try {
                    const current = await this.adapter.getForeignStateAsync(id);
                    this.lastValues.set(id, current?.val);
                } catch {
                    this.lastValues.set(id, undefined);
                }
            }
        }

        this.rules = next;
        this.adapter.log.info(`[appNotifications] ${this.rules.size} rule(s) active`);
    }

    /** Currently active rules (copy). */
    getRules(): AppNotificationRule[] {
        return [...this.rules.values()];
    }

    /**
     * Dispatch a single state change. Safe to call for every state the
     * adapter receives — unrelated ids are ignored cheaply.
     */
    async handleStateChange(id: string, state: ioBroker.State | null | undefined): Promise<void> {
        if (!state) {
            return;
        }
        const rule = this.rules.get(id);
        if (!rule) {
            return;
        }
        const oldValue = this.lastValues.get(id);
        if (!shouldFire(rule, state, oldValue)) {
            // keep cache fresh even when we don't notify
            this.lastValues.set(id, state.val);
            return;
        }

        const payload = buildAppNotification(rule, state, oldValue);
        this.lastValues.set(id, state.val);
        if (!payload) {
            return;
        }
        try {
            await this.adapter.sendMessageToApp(JSON.stringify(payload));
            this.adapter.log.debug(
                `[appNotifications] Sent "${payload.message}" for ${id}=${String(state.val)}`,
            );
        } catch (e) {
            this.adapter.log.error(`[appNotifications] Cannot send notification for "${id}": ${e}`);
        }
    }

    /** Unsubscribe everything. Call from the adapter's `unload`. */
    async destroy(): Promise<void> {
        for (const id of this.rules.keys()) {
            try {
                await this.adapter.unsubscribeForeignStatesAsync(id);
            } catch {
                // ignore
            }
        }
        this.rules.clear();
        this.lastValues.clear();
    }
}
