import type IotAdapter from '../main';
import { I18n } from '@iobroker/adapter-core';

/**
 * Per-state custom settings stored under `obj.common.custom['iot.<instance>']`.
 * The shape mirrors `admin/jsonCustom.json` — every field is optional except
 * `enabled`, which is set by the admin when the user toggles the custom on.
 */
export interface CustomSettings {
    enabled: boolean;
    /** Notification title shown by the app. Supports `${name}` / `${value}` placeholders. */
    title?: string;
    /** Message text. Supports `${name}` / `${value}` placeholders. */
    message?: string;
    /** Time-to-live in seconds (cloud-side expiry). */
    expire?: number;
    /** FCM priority. `'high'` triggers immediate delivery. */
    priority?: 'high' | 'normal';
    /** Number of minimal change befor next notification */
    debounceDifference?: number;
    /** Skip when `state.val === oldValue`. */
    reportChanges?: boolean;
    /** Boolean-only: status text used in the message when value is falsy. */
    offStatus?: string;
    /** Boolean-only: status text used in the message when value is truthy. */
    onStatus?: string;
    /** Suppress notifications for truthy values. */
    onlyFalse?: boolean;
    /** Suppress notifications for falsy values. */
    onlyTrue?: boolean;
    /**
     * Comma-separated list of device IDs that should receive the notification.
     * Empty / undefined → broadcast to all devices linked to the account.
     */
    devices?: string;
}

/** Cached entry per managed state. */
interface ManagedRule {
    settings: CustomSettings;
    /** Display name; resolved from `common.name` at registration time. */
    title: string;
    /** Last known value, used for `reportChanges` comparison. */
    lastValue: ioBroker.StateValue | undefined;
    /**
     * Last value for which a notification was actually sent. Used together
     * with {@link CustomSettings.debounceDifference} to suppress small jitter
     * around the same level.
     */
    lastNotifiedValue: ioBroker.StateValue | undefined;
    /** Object type (so we can format boolean states properly). */
    type: ioBroker.CommonType | undefined;
}

/**
 * JSON payload forwarded by {@link IotAdapter.sendMessageToApp} to
 * `https://app-message.iobroker.in/`. The cloud uses `message`, `title`,
 * `priority` and `ttlSeconds` directly; extra fields ride along on the
 * `payload` sub-object so an Android widget can act on them (deep links,
 * categories, recipients, …).
 */
export interface AppNotificationPayload {
    title: string;
    message: string;
    /** FCM priority. `'high'` triggers immediate delivery. */
    priority?: 'high' | 'normal';
    /** Time-to-live in seconds (cloud-side expiry). */
    expire?: number;
    /** Trait sub-payload forwarded to the app for widgets / deep links. */
    payload: {
        /** JSON-stringified array of device IDs (requires Visu App ≥ 1.4.0). */
        devices?: string;
        id?: string;
        ack?: string;
        value?: string;
        oldValue?: string;
        from?: string;
    };
}

/**
 * Manages a set of states that the user has marked for app-notifications
 * via the standard ioBroker custom config (`obj.common.custom[<namespace>]`).
 *
 * Lifecycle:
 *  1. {@link init} – called once on adapter start. Loads every existing
 *     foreign object that has a non-empty `custom[namespace]`, builds a
 *     {@link ManagedRule} cache, primes the `lastValue` from the current
 *     state and subscribes to the foreign state.
 *  2. {@link handleObjectChange} – called from the adapter's object-change
 *     callback. Handles add / update / remove transitions in the cache and
 *     keeps the subscriptions in sync.
 *  3. {@link handleStateChange} – called from the adapter's state-change
 *     callback. Filters according to the user settings and dispatches a
 *     notification through {@link IotAdapter.sendMessageToApp}.
 *  4. {@link destroy} – called from `unload`. Unsubscribes everything.
 *
 * Wiring in `main.ts`:
 * ```ts
 * this.appNotifications = new AppNotifications(this);
 * await this.appNotifications.init();
 *
 * // in objectChange: void this.appNotifications.handleObjectChange(id, obj);
 * // in stateChange:  void this.appNotifications.handleStateChange(id, state);
 * // in unload:       await this.appNotifications.destroy();
 * ```
 */
export class AppNotifications {
    private readonly adapter: IotAdapter;
    private readonly rules: Map<string, ManagedRule> = new Map();

    constructor(adapter: IotAdapter, lang: ioBroker.Languages) {
        this.adapter = adapter;
        I18n.init(`${__dirname}/../`, lang).catch(e => this.adapter.log.error(e));
    }

    /** Returns the custom block for this instance, or `undefined` if not enabled. */
    private extractSettings(
        obj: { [instance: string]: { enabled: boolean; [key: string]: any } } | null | undefined,
    ): CustomSettings | undefined {
        if (!obj) {
            return undefined;
        }
        const custom = obj[this.adapter.namespace];
        if (!custom) {
            return undefined;
        }
        const settings = custom as unknown as CustomSettings;
        return settings.enabled ? settings : undefined;
    }

    /** Derive the display title for an object from `common.name`. */
    private resolveTitle(_settings: CustomSettings, obj: ioBroker.Object): string {
        const name = obj.common?.name;
        if (typeof name === 'object' && name) {
            return name.en || name[Object.keys(name)[0] as keyof typeof name] || obj._id;
        }
        return name || obj._id;
    }

    /**
     * Initial scan executed once at adapter start. Locates every foreign
     * object that has at least one `custom` entry, filters those that belong
     * to this instance with `enabled === true`, primes the cache and
     * subscribes to the corresponding states.
     */
    async init(): Promise<void> {
        let view: ioBroker.GetObjectViewItem<ioBroker.StateObject>[] | undefined;
        try {
            const result = await this.adapter.getObjectViewAsync('system', 'custom', {});
            view = result?.rows as ioBroker.GetObjectViewItem<ioBroker.StateObject>[] | undefined;
        } catch (e) {
            this.adapter.log.warn(`[appNotifications] Cannot enumerate custom objects: ${e as string}`);
            return;
        }
        if (!view?.length) {
            return;
        }

        for (const row of view) {
            const id = row.id;
            const custom = row.value as unknown as
                | { [instance: string]: { enabled: boolean; [key: string]: any } }
                | null
                | undefined;
            const settings = this.extractSettings(custom);
            if (!settings || !custom) {
                continue;
            }
            const obj = await this.adapter.getForeignObjectAsync(id);
            if (obj) {
                await this.registerRule(id, obj, settings);
            }
        }

        this.adapter.log.info(`[appNotifications] Tracking ${this.rules.size} state(s) for app notifications`);
    }

    /**
     * Reconcile the rule cache when an object changes:
     *  - object deleted (or custom block removed) → drop rule, unsubscribe
     *  - custom block added for this instance      → register rule, subscribe
     *  - existing rule was modified                → update settings in place
     */
    async handleObjectChange(id: string, obj: ioBroker.Object | null | undefined): Promise<void> {
        const settings = this.extractSettings(obj?.common?.custom);
        const existing = this.rules.get(id);

        if (existing && (!obj || !settings)) {
            await this.unregisterRule(id);
            return;
        }

        if (!existing && obj && settings) {
            await this.registerRule(id, obj, settings);
            return;
        }

        if (existing && obj && settings) {
            // In-place update. lastValue stays valid; subscription is unchanged.
            existing.settings = settings;
            existing.title = this.resolveTitle(settings, obj);
            existing.type = (obj.common as ioBroker.StateCommon | undefined)?.type;
        }
    }

    private async registerRule(id: string, obj: ioBroker.Object, settings: CustomSettings): Promise<void> {
        try {
            await this.adapter.subscribeForeignStatesAsync(id);
        } catch (e) {
            this.adapter.log.warn(`[appNotifications] Cannot subscribe to ${id}: ${e as string}`);
            return;
        }

        let lastValue: ioBroker.StateValue | undefined;
        try {
            const state = await this.adapter.getForeignStateAsync(id);
            lastValue = state?.val ?? undefined;
        } catch {
            lastValue = undefined;
        }

        this.rules.set(id, {
            settings,
            title: this.resolveTitle(settings, obj),
            lastValue,
            lastNotifiedValue: undefined,
            type: (obj.common as ioBroker.StateCommon | undefined)?.type,
        });
        this.adapter.log.debug(`[appNotifications] Registered "${id}"`);
    }

    private async unregisterRule(id: string): Promise<void> {
        if (!this.rules.has(id)) {
            return;
        }
        try {
            await this.adapter.unsubscribeForeignStatesAsync(id);
        } catch {
            // ignore — adapter may already be unloading
        }
        this.rules.delete(id);
        this.adapter.log.debug(`[appNotifications] Unregistered "${id}"`);
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
        const oldValue = rule.lastValue;
        rule.lastValue = state.val;

        if (!this.shouldFire(rule, state, oldValue)) {
            return;
        }

        const payload = this.buildAppNotification(id, rule, state, oldValue);
        if (!payload) {
            return;
        }
        rule.lastNotifiedValue = state.val;
        try {
            await this.adapter.sendMessageToApp(JSON.stringify(payload));
            this.adapter.log.debug(`[appNotifications] Sent "${payload.message}" for ${id}=${String(state.val)}`);
        } catch (e) {
            this.adapter.log.error(`[appNotifications] Cannot send notification for "${id}": ${e as string}`);
        }
    }

    private shouldFire(rule: ManagedRule, state: ioBroker.State, oldValue: ioBroker.StateValue | undefined): boolean {
        const settings = rule.settings;

        if (settings.reportChanges && state.val === oldValue) {
            return false;
        }

        if (rule.type === 'boolean') {
            if (settings.onlyTrue && !state.val) {
                return false;
            }
            return !(settings.onlyFalse && state.val);
        }

        // Numeric debounce: suppress small jitter around the last notified level.
        const delta = settings.debounceDifference;
        if (delta !== undefined && delta > 0 && typeof state.val === 'number') {
            const last = rule.lastNotifiedValue;
            if (typeof last === 'number' && Math.abs(state.val - last) < delta) {
                return false;
            }
        }

        return true;
    }

    private buildAppNotification(
        id: string,
        rule: ManagedRule,
        state: ioBroker.State,
        oldValue: ioBroker.StateValue | undefined,
    ): AppNotificationPayload | null {
        const message = this.formatMessage(rule, state.val);
        if (!message) {
            return null;
        }

        const titleTemplate = rule.settings.title?.trim();
        const title = titleTemplate ? this.applyTemplate(titleTemplate, rule.title, state.val) : rule.title;

        const result: AppNotificationPayload = {
            title,
            message,
            payload: {
                id,
                value: state.val === null || state.val === undefined ? '' : String(state.val),
                oldValue: oldValue === null || oldValue === undefined ? '' : String(oldValue),
                ack: state.ack ? 'true' : 'false',
            },
        };

        if (rule.settings.priority === 'high' || rule.settings.priority === 'normal') {
            result.priority = rule.settings.priority;
        }

        if (rule.settings.expire !== undefined && rule.settings.expire > 0) {
            // Cloud accepts both `expire` (seconds) and `ttlSeconds`. Use `expire` to match the
            // app message documentation; sendMessageToApp() normalises both to `ttlSeconds`.
            result.expire = Math.min(rule.settings.expire, 3_600 * 48);
        }

        const rawDevices = rule.settings.devices?.trim();
        if (rawDevices) {
            const devs = rawDevices
                .split(',')
                .map(d => d.trim())
                .filter(d => d);
            if (devs.length) {
                // Visu App ≥ 1.4.0 expects payload.devices as a JSON-stringified array.
                result.payload.devices = JSON.stringify(devs);
            }
        }

        return result;
    }

    /**
     * Pick the message text:
     *  - boolean: use `onStatus` / `offStatus` (with `${name}` / `${value}` placeholders),
     *    otherwise fall back to `<name>: ON|OFF`.
     *  - other types: use `message` template (placeholders supported), otherwise fall back
     *    to `<name>: <value>`.
     */
    private formatMessage(rule: ManagedRule, value: ioBroker.StateValue): string {
        if (rule.type === 'boolean') {
            const truthy = !!value;
            const explicit = truthy ? rule.settings.onStatus : rule.settings.offStatus;
            if (explicit) {
                return this.applyTemplate(explicit, rule.title, value);
            }
            return `${rule.title}: ${truthy ? I18n.t('ON') : I18n.t('OFF')}`;
        }

        const template = rule.settings.message;
        if (template) {
            return this.applyTemplate(template, rule.title, value);
        }
        if (value === null || value === undefined) {
            return `${rule.title}: -`;
        }
        return `${rule.title}: ${String(value)}`;
    }

    /** Substitute `${name}` and `${value}` placeholders in a message template. */
    private applyTemplate(template: string, name: string, value: ioBroker.StateValue): string {
        const v = value === null || value === undefined ? '' : String(value);
        return template.replace(/\$\{name\}/g, name).replace(/\$\{value\}/g, v);
    }

    /** Unsubscribe everything. Call from the adapter's `unload`. */
    async destroy(): Promise<void> {
        const ids = [...this.rules.keys()];
        this.rules.clear();
        for (const id of ids) {
            try {
                await this.adapter.unsubscribeForeignStatesAsync(id);
            } catch {
                // ignore
            }
        }
    }
}
