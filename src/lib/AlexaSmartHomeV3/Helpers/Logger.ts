import AdapterProvider from './AdapterProvider';

export type LogFn = (message: string) => void;

export default class Logger {
    private readonly logged: Map<number, number> = new Map();
    private readonly maxLoggedEntries = 500;
    private readonly ttl = 30;
    public _component: string;

    constructor(instance: unknown) {
        if (instance && typeof instance === 'object' && 'constructor' in instance) {
            this._component = (instance as { constructor: { name?: string } }).constructor.name || 'Unknown';
        } else if (typeof instance === 'string') {
            this._component = instance;
        } else {
            this._component = 'Unknown';
        }
    }

    get component(): string {
        return this._component;
    }

    set component(value: string) {
        this._component = value;
    }

    static hashCode(str: string): number {
        let hash = 0;
        let i;
        let chr;
        if (str.length === 0) {
            return hash;
        }
        for (i = 0; i < str.length; i++) {
            chr = str.charCodeAt(i);
            hash = (hash << 5) - hash + chr;
            hash |= 0; // Convert to 32bit integer
        }
        return hash;
    }

    toSkip(hash: number): boolean {
        // clear old entries
        let keys = Array.from(this.logged.keys());
        const now = new Date().getTime();
        for (const key of keys) {
            const expired = (now - key) / 1000 > this.ttl;
            if (expired) {
                this.logged.delete(key);
            }
        }

        keys = Array.from(this.logged.keys());
        if (keys.length > this.maxLoggedEntries) {
            const toRemove = keys.length - this.maxLoggedEntries;
            keys.sort();
            for (let i = 0; i < toRemove; i++) {
                this.logged.delete(keys[i]);
            }
        }

        return Array.from(this.logged.values()).includes(hash);
    }

    compose(message: string): string {
        return `[AlexaV3::${this.component}]: ${message}`;
    }

    print(logger: LogFn, message: string): void {
        if (typeof message === 'string' && message.length > 0) {
            const hash = Logger.hashCode(message);
            if (this.toSkip(hash)) {
                return;
            }

            this.logged.set(new Date().getTime(), hash);
            return logger(message);
        }
    }

    silly(message: string): void {
        return this.print(AdapterProvider.get().log.silly, this.compose(message));
    }

    debug(message: string): void {
        return this.print(AdapterProvider.get().log.debug, this.compose(message));
    }

    info(message: string): void {
        return this.print(AdapterProvider.get().log.info, this.compose(message));
    }

    warn(message: string): void {
        return this.print(AdapterProvider.get().log.warn, this.compose(message));
    }

    error(message: string): void {
        return this.print(AdapterProvider.get().log.error, this.compose(message));
    }
}
