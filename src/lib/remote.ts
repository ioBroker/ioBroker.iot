import axios, { type AxiosError } from 'axios';
import { deflateSync } from 'node:zlib';
import AdminSocket from './adminCommonSocket';
import type { IotAdapterConfig } from './types';
import type { device as DeviceModule } from 'aws-iot-device-sdk';
import type IotAdapter from '../main';

type MESSAGE_TYPE = number;
const MESSAGE_TYPES: Record<string, MESSAGE_TYPE> = {
    MESSAGE: 0,
    PING: 1,
    PONG: 2,
    CALLBACK: 3,
    READY: 4,
    WAIT: 5,
    SENDING_DONE: 6,
    MISSING: 7,
    TIMEOUT: 8,
    HTML: 9,
    COMBINED_CALLBACK: 10,
    COMBINED_MESSAGE: 11,
};

const MAX_IOT_MESSAGE_LENGTH = 127 * 1024;
const MAX_POST_MESSAGE_LENGTH = 127 * 1024;
const MAX_FILE_SIZE = 4 * 1024 * 1024;

const COLLECT_OBJS_MS = 400;
const COLLECT_STATES_MS = 400;
const COLLECT_LOGS_MS = 800;

const NONE = '___none___';

type SessionID = string;
type SubscribeType = 'stateChange' | 'objectChange' | 'log';
type Socket = {
    _subscribe: {
        stateChange: { pattern: string; regex: RegExp }[];
        objectChange: { pattern: string; regex: RegExp }[];
        log: { pattern: string; regex: RegExp }[];
    };
    ts: number;
    name?: string;
};

type SOCKET_PAYLOAD = [
    type: MESSAGE_TYPE,
    id: number,
    functionName: string,
    args: any[] | string | { error: string },
    readUrlOrTotalMultiPackageLength?: string | number,
    numberOfPacketInMultiPackage?: number,
];
export type SOCKET_MESSAGE = {
    sid: SessionID;
    d: SOCKET_PAYLOAD;
    wu?: string;
    ru?: string;
};
export type SOCKET_CHANGE_MESSAGE = {
    name: SubscribeType;
    args: string | [ioBroker.LogMessage[]] | [string[], (ioBroker.Object | null | undefined)[]];
    sid: SessionID;
    multi?: boolean;
};

export type SOCKET_TRUNK = {
    sid: string;
    i: number;
    l: number;
    d: SOCKET_PAYLOAD;
};

export default class RemoteAccess {
    private readonly adapter: IotAdapter;
    private device: DeviceModule | null = null;
    private gcInterval: NodeJS.Timeout | null = null;
    private name = {};
    private objects = {};
    private readonly packets: {
        [id: string]: {
            ts: number;
            trunks: SOCKET_TRUNK[];
        };
    } = {};
    private readonly statesCache: { [stateId: string]: string } = {};
    private listOfLogs: ioBroker.LogMessage[] = [];
    private listOfStates: { ids: string[]; states: (ioBroker.State | null | undefined)[] } = { ids: [], states: [] };
    private listOfObjects: { ids: string[]; objs: (ioBroker.Object | null | undefined)[] } = { ids: [], objs: [] };
    private readonly clientId: string;
    private readonly config: IotAdapterConfig;
    private readonly collectStatesMs: number;
    private readonly collectObjectsMs: number;
    private readonly collectLogsMs: number;
    private readonly handlers: { [funcName: string]: { f: (...args: any[]) => Promise<any>; args: number } };
    private subscribes: {
        stateChange: { [pattern: string]: number };
        objectChange: { [pattern: string]: number };
        log: { [pattern: string]: number };
    } = { stateChange: {}, objectChange: {}, log: {} };
    private sockets: { [socketId: SessionID]: Socket } = {};
    private vendorPrefix = '';
    private localAdmin: string | null = null;
    private webObj: ioBroker.InstanceObject | null = null;
    private webUrl: string = '';
    private adminObj: ioBroker.InstanceObject | null = null;
    private adminUrl: string = '';
    private lang: ioBroker.Languages = 'en';
    private sendObjectsTimeout: NodeJS.Timeout | null = null;
    private sendLogsTimeout: NodeJS.Timeout | null = null;
    private sendStatesTimeout: NodeJS.Timeout | null = null;
    private infoTimeout: NodeJS.Timeout | null = null;
    private secret: string = '';

    constructor(adapter: IotAdapter, clientId: string) {
        this.adapter = adapter;
        this.config = adapter.config;
        this.clientId = clientId;
        this.collectStatesMs =
            this.config.collectStatesMs === undefined
                ? COLLECT_STATES_MS
                : parseInt(this.config.collectStatesMs as string, 10);
        this.collectObjectsMs =
            this.config.collectObjectsMs === undefined
                ? COLLECT_OBJS_MS
                : parseInt(this.config.collectObjectsMs as string, 10);
        this.collectLogsMs =
            this.config.collectLogsMs === undefined
                ? COLLECT_LOGS_MS
                : parseInt(this.config.collectLogsMs as string, 10);

        this.handlers = {
            getObject: { f: this.adapter.getForeignObjectAsync.bind(this.adapter), args: 1 },
            setObject: { f: this.adapter.setForeignObjectAsync.bind(this.adapter), args: 2 },
            getState: { f: this.adapter.getForeignStateAsync.bind(this.adapter), args: 1 },
            setState: { f: this.adapter.setForeignStateAsync.bind(this.adapter), args: 2 },
            delState: { f: this.adapter.delForeignStateAsync.bind(this.adapter), args: 2 },
            getObjectView: { f: this.adapter.getObjectViewAsync.bind(this.adapter), args: 4 },
            delObject: { f: this.adapter.delForeignObjectAsync.bind(this.adapter), args: 2 },
            delObjects: { f: this.adapter.delForeignObjectAsync.bind(this.adapter), args: 2 },
            extendObject: { f: this.adapter.extendForeignObjectAsync.bind(this.adapter), args: 2 },
            getForeignStates: { f: this.adapter.getForeignStatesAsync.bind(this.adapter), args: 1 },
            getForeignObjects: { f: this.adapter.getForeignObjectsAsync.bind(this.adapter), args: 2 },
            fileExists: { f: this.adapter.fileExistsAsync.bind(this.adapter), args: 2 },
            chownFile: { f: this.adapter.chownFileAsync.bind(this.adapter), args: 3 },
            chmodFile: { f: this.adapter.chmodFileAsync.bind(this.adapter), args: 3 },
            deleteFolder: { f: this.adapter.unlinkAsync.bind(this.adapter), args: 2 },
            deleteFile: { f: this.adapter.unlinkAsync.bind(this.adapter), args: 2 },
            mkdir: { f: this.adapter.mkdirAsync.bind(this.adapter), args: 2 },
            renameFile: { f: this.adapter.renameAsync.bind(this.adapter), args: 3 },
            readDir: { f: this.adapter.readDirAsync.bind(this.adapter), args: 2 },
            changePassword: { f: this.adapter.setPasswordAsync.bind(this.adapter), args: 2 },
        };

        if (!this.config.remote) {
            return;
        }

        if (this.config.remoteAdminInstance) {
            try {
                this.localAdmin = require
                    .resolve('iobroker.admin')
                    .replace(/\\/g, '/')
                    .replace(/main\.js$/, 'www-react');
            } catch {
                this.localAdmin = null;
                this.adapter.log.warn('[REMOTE] Cannot read admin files while iobroker.admin was not found');
            }
            void this.adapter.getForeignObjectAsync(`system.adapter.${this.config.remoteAdminInstance}`).then(obj => {
                this.adminObj = obj || null;
                if (obj?.native && !obj.native.auth) {
                    this.adminUrl = `${obj.native.secure ? 'https:' : 'http:'}//localhost:${obj.native.port}`;
                }
            });
        }
        if (this.config.remoteWebInstance) {
            void this.adapter.getForeignObjectAsync(`system.adapter.${this.config.remoteWebInstance}`).then(obj => {
                this.webObj = obj || null;
                if (obj?.native && !obj.native.auth) {
                    this.webUrl = `${obj.native.secure ? 'https:' : 'http:'}//localhost:${obj.native.port}`;
                }
            });
        }

        void this.adapter.getForeignObjectAsync('system.meta.uuid').then(obj => {
            if (obj?.native) {
                this.vendorPrefix = obj.native.uuid.length > 36 ? obj.native.uuid.substring(0, 2) : '';
            }
        });
    }

    setLanguage(_lang: ioBroker.Languages): void {
        this.lang = _lang || 'de';
    }

    registerDevice(device: DeviceModule): void {
        this.device = device;
    }

    async _sendCachedStates(): Promise<void> {
        const sids = Object.keys(this.sockets);

        const listOfStates = this.listOfStates;
        // clear cache
        this.listOfStates = { ids: [], states: [] };

        if (sids.length) {
            this.adapter.log.debug(
                `Send to ${sids.length} sockets: ${listOfStates.ids.map((id, i) => `${id}: ${listOfStates.states[i]?.val}`).join(', ')}`,
            );

            // pack the data
            const data = JSON.stringify([listOfStates.ids, listOfStates.states]);
            const args = deflateSync(data).toString('base64');

            for (let s = 0; s < sids.length; s++) {
                const error = await this._sendEvent({ name: 'stateChange', args, sid: sids[s], multi: true });
                if (error) {
                    this.adapter.log.warn(`[REMOTE] cannot send "stateChange": ${JSON.stringify(error)}`);
                }
            }
        }
    }

    updateState(id: string, state: ioBroker.State | null | undefined): void {
        if (!this.config.remote) {
            return;
        }
        const cache = JSON.stringify(state);

        if (this.statesCache[id] && this.statesCache[id] !== cache) {
            if (this.config.debug) {
                this.adapter.log.debug(`[REMOTE] send stateChange "${id}": ${JSON.stringify(state)}`);
            }

            this.statesCache[id] = cache;

            this.listOfStates.ids.push(id);
            this.listOfStates.states.push(JSON.parse(JSON.stringify(state)));

            // do not wait if the list will be too long
            if (this.listOfStates.ids.length > 70) {
                if (this.sendObjectsTimeout) {
                    clearTimeout(this.sendObjectsTimeout);
                    this.sendObjectsTimeout = null;
                }
                this._sendCachedStates().catch(e => this.adapter.log.error(`[REMOTE] Cannot send cached states: ${e}`));
            } else {
                this.sendObjectsTimeout ||= setTimeout(() => {
                    this.sendObjectsTimeout = null;
                    this._sendCachedStates().catch(e =>
                        this.adapter.log.error(`[REMOTE] Cannot send cached states: ${e}`),
                    );
                }, this.collectStatesMs);
            }
        } else {
            // this.adapter.log.debug(`[REMOTE] ignore stateChange "${id}": ${JSON.stringify(state)}`);
        }
    }

    updateObject(id: string, obj: ioBroker.Object | null | undefined): void {
        if (!this.config.remote) {
            return;
        }
        this.listOfObjects.ids.push(id);
        this.listOfObjects.objs.push(JSON.parse(JSON.stringify(obj)));

        if (this.sendObjectsTimeout) {
            clearTimeout(this.sendObjectsTimeout);
        }

        this.sendObjectsTimeout = setTimeout(async () => {
            this.sendObjectsTimeout = null;
            const listOfObjects = this.listOfObjects;
            this.listOfObjects = { ids: [], objs: [] };
            const sids = Object.keys(this.sockets);

            for (let s = 0; s < sids.length; s++) {
                const error = await this._sendEvent({
                    name: 'objectChange',
                    args: [listOfObjects.ids, listOfObjects.objs],
                    sid: sids[s],
                    multi: true,
                });
                if (error) {
                    this.adapter.log.warn(`[REMOTE] cannot send "objectChange": ${JSON.stringify(error)}`);
                }
            }
        }, COLLECT_OBJS_MS);
    }

    onLog(obj: ioBroker.LogMessage): void {
        if (!this.config.remote) {
            return;
        }
        this.listOfLogs.push(obj);

        if (this.sendLogsTimeout) {
            clearTimeout(this.sendLogsTimeout);
        }

        this.sendLogsTimeout = setTimeout(async () => {
            this.sendLogsTimeout = null;
            const listOfLogs = this.listOfLogs;
            this.listOfLogs = [];
            const sids = Object.keys(this.sockets);
            for (let s = 0; s < sids.length; s++) {
                const error = await this._sendEvent({
                    name: 'log',
                    args: [listOfLogs],
                    sid: sids[s],
                    multi: true,
                });
                if (error) {
                    this.adapter.log.error(`[REMOTE] cannot send "log": ${JSON.stringify(error)}`);
                }
            }
        }, COLLECT_LOGS_MS);
    }

    destroy(): void {
        if (this.gcInterval) {
            clearInterval(this.gcInterval);
            this.gcInterval = null;
        }
        if (this.sendLogsTimeout) {
            clearTimeout(this.sendLogsTimeout);
            this.sendLogsTimeout = null;
        }
        if (this.sendObjectsTimeout) {
            clearTimeout(this.sendObjectsTimeout);
            this.sendObjectsTimeout = null;
        }
        if (this.sendStatesTimeout) {
            clearTimeout(this.sendStatesTimeout);
            this.sendStatesTimeout = null;
        }
        AdminSocket.stopGB();
        this._unsubscribeAll();
        this.sockets = {};
    }

    _clearMemory(): void {
        const now = Date.now();
        const DAY = 36000000 * 3;
        Object.keys(this.sockets).forEach(sid => {
            if (now - this.sockets[sid].ts > DAY) {
                this._unsubscribeSocket(sid, 'stateChange');
                this._unsubscribeSocket(sid, 'objectChange');
                this._unsubscribeSocket(sid, 'log');
                delete this.sockets[sid];
            }
        });

        Object.keys(this.packets).forEach(id => {
            if (now - this.packets[id].ts > 120000) {
                delete this.packets[id];
            }
        });
    }

    _readAllObjects(): Promise<{ [id: string]: ioBroker.Object }> {
        return this.adapter.getObjectListAsync({ include_docs: true }).then(res => {
            const objects: { [id: string]: ioBroker.Object } = {};
            this.adapter.log.info('[REMOTE] received all objects');
            if (res?.rows) {
                for (let i = 0; i < res.rows.length; i++) {
                    objects[res.rows[i].doc._id] = res.rows[i].doc;
                }
            }
            return objects;
        });
    }

    pattern2RegEx(pattern: string): string | null {
        if (!pattern || typeof pattern !== 'string') {
            return null;
        }
        if (pattern !== '*') {
            if (pattern[0] === '*' && pattern[pattern.length - 1] !== '*') {
                pattern += '$';
            }
            if (pattern[0] !== '*' && pattern[pattern.length - 1] === '*') {
                pattern = `^${pattern}`;
            }
        }
        pattern = pattern.replace(/\./g, '\\.');
        pattern = pattern.replace(/\*/g, '.*');
        pattern = pattern.replace(/\[/g, '\\[');
        pattern = pattern.replace(/]/g, '\\]');
        pattern = pattern.replace(/\(/g, '\\(');
        pattern = pattern.replace(/\)/g, '\\)');
        return pattern;
    }

    _subscribe(sid: SessionID, type: SubscribeType, pattern: string): void {
        //console.log((socket._name || socket.id) + ' subscribe ' + pattern);
        const socket = this.sockets[sid];

        this.subscribes[type] ||= {};

        let s: { pattern: string; regex: RegExp }[] | undefined;
        if (socket) {
            socket._subscribe[type] ||= [];
            s = socket._subscribe[type];
            for (let i = 0; i < s.length; i++) {
                if (s[i].pattern === pattern) {
                    return;
                }
            }
        }

        const p = this.pattern2RegEx(pattern);
        if (p === null) {
            return this.adapter.log.warn('[REMOTE] Empty or invalid pattern on subscribe!');
        }
        if (s) {
            s.push({ pattern, regex: new RegExp(p) });
        }

        if (this.subscribes[type][pattern] === undefined) {
            this.subscribes[type][pattern] = 1;
            if (type === 'stateChange') {
                this.adapter.log.debug(`[REMOTE] Subscribe STATES: ${pattern}`);
                this.adapter.subscribeForeignStates(pattern);
            } else if (type === 'objectChange') {
                this.adapter.log.debug(`[REMOTE] Subscribe OBJECTS: ${pattern}`);
                this.adapter.subscribeForeignObjects?.(pattern);
            } else if (type === 'log') {
                this.adapter.log.debug('[REMOTE] Subscribe LOGS');
                void this.adapter.requireLog?.(true);
            }
        } else {
            this.subscribes[type][pattern]++;
        }
    }

    _showSubscribes(sid: SessionID, type: SubscribeType): void {
        const socket = this.sockets[sid];

        if (socket?._subscribe) {
            const s = socket._subscribe[type] || [];
            const ids = [];
            for (let i = 0; i < s.length; i++) {
                ids.push(s[i].pattern);
            }
            this.adapter.log.debug(`[REMOTE] Subscribes: ${ids.join(', ')}`);
        } else {
            this.adapter.log.debug('[REMOTE] Subscribes: no subscribes');
        }
    }

    _updateConnectedInfo(): void {
        if (this.infoTimeout) {
            clearTimeout(this.infoTimeout);
            this.infoTimeout = null;
        }

        // TODO
        // this.adapter.setState('info.connection', text, true);
    }

    _unsubscribe(sid: SessionID, type: SubscribeType, pattern?: string): void {
        const socket = this.sockets[sid];
        this.subscribes[type] ||= {};

        if (socket && typeof socket === 'object') {
            if (!socket._subscribe?.[type]) {
                return;
            }

            for (let i = socket._subscribe[type].length - 1; i >= 0; i--) {
                if (socket._subscribe[type][i].pattern === pattern) {
                    // Remove pattern from global list
                    if (this.subscribes[type][pattern] !== undefined) {
                        this.subscribes[type][pattern]--;
                        if (this.subscribes[type][pattern] <= 0) {
                            if (type === 'stateChange') {
                                this.adapter.log.debug(`[REMOTE] Unsubscribe STATES: ${pattern}`);
                                //console.log((socket._name || socket.id) + ' unsubscribeForeignStates ' + pattern);
                                this.adapter.unsubscribeForeignStates(pattern);
                            } else if (type === 'objectChange') {
                                this.adapter.log.debug(`[REMOTE] Unsubscribe OBJECTS: ${pattern}`);
                                //console.log((socket._name || socket.id) + ' unsubscribeForeignObjects ' + pattern);
                                this.adapter.unsubscribeForeignObjects &&
                                    this.adapter.unsubscribeForeignObjects(pattern);
                            } else if (type === 'log') {
                                //console.log((socket._name || socket.id) + ' requireLog false');
                                this.adapter.log.debug('[REMOTE] Unsubscribe LOGS');
                                void this.adapter.requireLog?.(false);
                            }
                            delete this.subscribes[type][pattern];
                        }
                    }

                    socket._subscribe[type].splice(i, 1);
                    return;
                }
            }
        } else if (pattern) {
            // Remove pattern from global list
            if (this.subscribes[type][pattern] !== undefined) {
                this.subscribes[type][pattern]--;
                if (this.subscribes[type][pattern] <= 0) {
                    if (type === 'stateChange') {
                        this.adapter.log.debug(`[REMOTE] Unsubscribe STATES: ${pattern}`);
                        this.adapter.unsubscribeForeignStates(pattern);
                    } else if (type === 'objectChange') {
                        this.adapter.log.debug(`[REMOTE] Unsubscribe OBJECTS: ${pattern}`);
                        this.adapter.unsubscribeForeignObjects?.(pattern);
                    } else if (type === 'log') {
                        this.adapter.log.debug('[REMOTE] Unsubscribe LOGS');
                        void this.adapter.requireLog?.(false);
                    }
                    delete this.subscribes[type][pattern];
                }
            }
        }
    }

    _unsubscribeAll(): void {
        Object.keys(this.sockets).forEach(sid => {
            this._unsubscribe(sid, 'stateChange');
            this._unsubscribe(sid, 'objectChange');
            this._unsubscribe(sid, 'log');
        });
    }

    _unsubscribeSocket(sid: SessionID, type: SubscribeType): void {
        const socket = this.sockets[sid];

        if (!socket?._subscribe?.[type]) {
            return;
        }

        for (let i = 0; i < socket._subscribe[type].length; i++) {
            const pattern = socket._subscribe[type][i].pattern;
            if (this.subscribes[type][pattern] !== undefined) {
                this.subscribes[type][pattern]--;
                if (this.subscribes[type][pattern] <= 0) {
                    if (type === 'stateChange') {
                        this.adapter.log.debug(`[REMOTE] Unsubscribe STATES: ${pattern}`);
                        this.adapter.unsubscribeForeignStates(pattern);
                    } else if (type === 'objectChange') {
                        this.adapter.log.debug(`[REMOTE] Unsubscribe OBJECTS: ${pattern}`);
                        this.adapter.unsubscribeForeignObjects?.(pattern);
                    } else if (type === 'log') {
                        this.adapter.log.debug(`[REMOTE] Unsubscribe LOGS: ${pattern}`);
                        void this.adapter.requireLog?.(false);
                    }
                    delete this.subscribes[type][pattern];
                }
            }
        }
    }

    _subscribeSocket(sid: SessionID, type: SubscribeType): void {
        const socket = this.sockets[sid];

        if (!socket?._subscribe?.[type]) {
            return;
        }

        for (let i = 0; i < socket._subscribe[type].length; i++) {
            const pattern = socket._subscribe[type][i].pattern;
            if (this.subscribes[type][pattern] === undefined) {
                this.subscribes[type][pattern] = 1;
                if (type === 'stateChange') {
                    this.adapter.log.debug(`[REMOTE] Subscribe STATES: ${pattern}`);
                    this.adapter.subscribeForeignStates(pattern);
                } else if (type === 'objectChange') {
                    this.adapter.log.debug(`[REMOTE] Subscribe OBJECTS: ${pattern}`);
                    this.adapter.subscribeForeignObjects?.(pattern);
                } else if (type === 'log') {
                    this.adapter.log.debug('[REMOTE] Subscribe LOGS');
                    void this.adapter.requireLog?.(true);
                }
            } else {
                this.subscribes[type][pattern]++;
            }
        }
    }

    _sendEvent(
        message: SOCKET_MESSAGE | SOCKET_CHANGE_MESSAGE,
        _originalMessage?: SOCKET_MESSAGE,
    ): Promise<string | undefined> {
        return axios
            .post('https://remote-events.iobroker.in/', message, {
                validateStatus: status => status === 200,
                timeout: 5000,
            })
            .then(() => undefined)
            .catch(error => {
                let errorMessage: any;
                if ((error as AxiosError).response) {
                    errorMessage = (error as AxiosError).response!.data || (error as AxiosError).response!.status;
                } else {
                    errorMessage = error.message?.toString();
                }

                this.adapter.log.warn(
                    `[REMOTE] Cannot send status update to ${message.sid} (${JSON.stringify(_originalMessage)}): ${JSON.stringify(errorMessage)}`,
                );

                if (errorMessage.error === 'invalid connectionId') {
                    if (this.sockets[message.sid]) {
                        this.adapter.log.debug(`[REMOTE] delete connection id ${message.sid}`);
                        delete this.sockets[message.sid];
                    }
                    errorMessage = false;
                } else {
                    this.adapter.log.warn(
                        `[REMOTE] Cannot send status update to "${message.sid}" (${JSON.stringify(_originalMessage)}): ${JSON.stringify(errorMessage)}`,
                    );
                }

                return JSON.stringify(errorMessage);
            });
    }

    async _getStatesManyArgs(
        args: [string][],
    ): Promise<[error: string | null, states?: Record<string, ioBroker.State>][]> {
        const response: [error: string | null, states?: Record<string, ioBroker.State>][] = [];
        for (let a = 0; a < args.length; a++) {
            const id = args[a][0];
            try {
                const result: Record<string, ioBroker.State> = await this.adapter.getForeignStatesAsync(id || '*');
                response[a] = [null, result];
                if (result) {
                    Object.keys(result).forEach(id => (this.statesCache[id] = JSON.stringify(result[id])));
                }
            } catch (error) {
                response[a] = [error];
            }
        }
        return response;
    }

    async _getStateManyArgs(
        args: [string][],
    ): Promise<[error: string | null, state?: ioBroker.State | null | undefined][]> {
        const response: [error: string | null, state?: ioBroker.State | null | undefined][] = [];
        for (let a = 0; a < args.length; a++) {
            const id = args[a][0];
            try {
                const result = await this.adapter.getForeignStateAsync(id || '*');
                response[a] = [null, result];
                this.statesCache[id] = JSON.stringify(result);
            } catch (error) {
                response[a] = [error];
            }
        }
        return response;
    }

    async _getObjectManyArgs(
        args: [string][],
    ): Promise<[error: string | null, state?: ioBroker.Object | null | undefined][]> {
        const response: [error: string | null, state?: ioBroker.Object | null | undefined][] = [];
        for (let a = 0; a < args.length; a++) {
            const id = args[a][0];
            try {
                const result = await this.adapter.getForeignObjectAsync(id || '*');
                response[a] = [null, result];
            } catch (error) {
                response[a] = [error];
            }
        }
        return response;
    }

    _subscribeManyArgs(sid: SessionID, args: [string | string[]][]): Promise<[error: string | null][]> {
        const result: [error: string | null][] = [];
        for (let a = 0; a < args.length; a++) {
            const pattern = args[a][0];
            if (Array.isArray(pattern)) {
                for (let p = 0; p < pattern.length; p++) {
                    this._subscribe(sid, 'stateChange', pattern[p]);
                }
            } else {
                this._subscribe(sid, 'stateChange', pattern);
            }
            result.push([null]);
        }
        return Promise.resolve(result);
    }

    async _unsubscribeManyArgs(sid: SessionID, args: [string | string[]][]): Promise<[error: string | null][]> {
        const result: [error: string | null][] = [];
        for (let a = 0; a < args.length; a++) {
            const pattern = args[a][0];
            if (Array.isArray(pattern)) {
                for (let p = 0; p < pattern.length; p++) {
                    this._unsubscribe(sid, 'stateChange', pattern[p]);
                }
            } else {
                this._unsubscribe(sid, 'stateChange', pattern);
            }
            result.push([null]);
        }
        return Promise.resolve(result);
    }

    uploadToServer(url: string, data: { file: string; mimeType: string }, raw?: boolean): Promise<boolean> {
        return axios
            .put(url, raw ? data.file : Buffer.from(data.file, 'base64'), {
                headers: {
                    'Content-Type': data.mimeType,
                },
            })
            .then(() => {
                return true;
            })
            .catch(e => {
                console.log(e);
                return false;
            });
    }

    readUrlFile(
        url: string,
        path: string,
        sid: SessionID,
        type: MESSAGE_TYPE,
        id: number,
    ): Promise<{ file: string; mimeType: string } | SOCKET_MESSAGE> {
        return axios(url + path, {
            responseType: 'arraybuffer',
            validateStatus: status => status === 200,
            timeout: 500,
        })
            .then(response => {
                // replace port
                if (path.endsWith('_socket/info.js')) {
                    response.data = response.data.toString();
                    // var socketUrl = ":8084"; var socketSession = ""; window.sysLang = "ru"; window.socketForceWebSockets = false;
                    // replace ":8084"; => "";
                    response.data = response.data.replace(/":\d+";/, '"";');
                }

                return {
                    file: Buffer.from(response.data).toString('base64'),
                    mimeType: response.headers['content-type'],
                };
            })
            .catch(error => {
                this.adapter.log.warn(`[REMOTE] File ${url}${path} not found`);
                let errorMessage;
                if (error.response && error.response.status === 404) {
                    errorMessage = 'Not exists';
                } else if (error.response && error.response.status === 401) {
                    errorMessage = 'Not authorised';
                } else {
                    if (error.response) {
                        errorMessage = error.response.data || error.response.status;
                    } else if (error.request) {
                        errorMessage = 'No answer';
                    } else {
                        errorMessage = error.message;
                    }
                }
                return { sid, d: [type, id, '', { error: errorMessage }] };
            });
    }

    _sendResponse(
        sid: SessionID,
        _type: MESSAGE_TYPE,
        id: number,
        name: string,
        args: any[],
        writeUrl?: string,
        readUrl?: string,
    ): Promise<SOCKET_MESSAGE> {
        let packed = deflateSync(JSON.stringify(args)).toString('base64');

        if (packed.length > MAX_IOT_MESSAGE_LENGTH) {
            if (writeUrl) {
                if (args.length === 3) {
                    const [error, file, mimeType] = args;
                    if (!error) {
                        return this.uploadToServer(writeUrl, { file, mimeType }, true).then(done => ({
                            sid,
                            d: [_type, id, name, done ? readUrl! : ['Cannot upload']],
                        }));
                    }
                } else if (args.length === 2) {
                    const [error, result] = args;
                    if (!error) {
                        return this.uploadToServer(
                            writeUrl,
                            { file: JSON.stringify(result), mimeType: 'application/json' },
                            true,
                        ).then(done => ({ sid, d: [_type, id, name, done ? readUrl! : ['Cannot upload']] }));
                    }
                } else if (args.length === 1) {
                    const [result] = args;
                    return this.uploadToServer(
                        writeUrl,
                        { file: JSON.stringify(result), mimeType: 'application/json' },
                        true,
                    ).then(done => ({ sid, d: [_type, id, name, done ? readUrl! : ['Cannot upload']] }));
                }
            }
            // too big message. Do not use iot for that and send directly to socket
            /*const packets = []
            while (packed.length > MAX_IOT_MESSAGE_LENGTH) {
                const trunk = packed.substring(0, MAX_IOT_MESSAGE_LENGTH);
                packed = packed.substring(MAX_IOT_MESSAGE_LENGTH);
                packets.push(trunk);
            }
            if (packed.length) {
                packets.push(packed);
            }

            const trunks = packets.map((trunk, i) =>
                sid: message.sid, i, l: packets.length, d: [_type, id, name, trunk]}));

            this.packets[id] = {ts: Date.now(), trunks};

            // start garbage collector
            this.gcInterval = this.gcInterval || setInterval(() => this._clearMemory(), 60000);

            return trunks;*/
            setImmediate(async () => {
                if (packed.length > MAX_POST_MESSAGE_LENGTH) {
                    // too big message. Do not use iot for that and send directly to socket
                    const packets: string[] = [];
                    while (packed.length > MAX_POST_MESSAGE_LENGTH) {
                        const trunk = packed.substring(0, MAX_POST_MESSAGE_LENGTH);
                        packed = packed.substring(MAX_POST_MESSAGE_LENGTH);
                        packets.push(trunk);
                    }
                    if (packed.length) {
                        packets.push(packed);
                    }

                    for (let i = 0; i < packets.length; i++) {
                        const error = await this._sendEvent({
                            sid,
                            d: [_type, id, name, packets[i], packets.length, i],
                        });
                        if (error) {
                            this.adapter.log.error(`[REMOTE] cannot send: ${JSON.stringify(error)}`);
                            break;
                        }
                    }
                } else {
                    await this._sendEvent({ sid, d: [_type, id, name, packed] });
                }
            });

            return Promise.resolve({ sid, d: [MESSAGE_TYPES.WAIT, id, name, [packed.length]] });
        }
        return Promise.resolve({ sid, d: [_type, id, name, packed] });
    }

    onCloudDisconnect(): void {
        // delete all sockets
        this.adapter.log.debug(`[REMOTE] Cloud disconnected`);
        if (!this.sockets) {
            return;
        }

        const sids = Object.keys(this.sockets);
        for (let s = 0; s < sids.length; s++) {
            this._unsubscribeSocket(sids[s], 'stateChange');
            this._unsubscribeSocket(sids[s], 'objectChange');
            this._unsubscribeSocket(sids[s], 'log');
            delete this.sockets[sids[s]];
        }
    }

    process(
        request: string | SOCKET_MESSAGE,
        serviceType: `remote${string}`,
    ): Promise<'___none___' | SOCKET_MESSAGE | SOCKET_TRUNK[]> {
        let message: SOCKET_MESSAGE | null;
        if (typeof request === 'string') {
            try {
                message = JSON.parse(request);
            } catch {
                this.adapter.log.error(`[REMOTE] Cannot parse request: ${request}`);
                message = null;
            }
        } else {
            message = request;
        }

        if (message) {
            const [_type, id, name, args, readUrl] = message.d;
            let promiseOne: Promise<any> | undefined; // answer will be created automatically (error, result)
            let promiseResult: Promise<SOCKET_MESSAGE | '___none___'> | undefined; // answer will be created by promise

            if (this.config.remote && _type === MESSAGE_TYPES.MISSING) {
                if (this.packets[id]) {
                    const missing = (args as number[][])[0];
                    this.adapter.log.warn(
                        `[REMOTE] Request for existing trunks: ${id}, "${name}": ${JSON.stringify(missing)}`,
                    );

                    if (this.device) {
                        setImmediate(async () => {
                            try {
                                for (let m = 0; m < missing.length; m++) {
                                    await new Promise<void>((resolve, reject) =>
                                        this.device!.publish(
                                            `response/${this.clientId}/${serviceType}`,
                                            JSON.stringify(this.packets[id].trunks[m]),
                                            { qos: 1 },
                                            error => {
                                                if (error) {
                                                    reject(error);
                                                } else {
                                                    resolve();
                                                }
                                            },
                                        ),
                                    );
                                }
                            } catch (err) {
                                this.adapter.log.error(`[REMOTE] Cannot send packet: ${err}`);
                            }
                        });
                    }
                } else {
                    this.adapter.log.warn(`[REMOTE] Request for non existing trunks: ${id}, "${name}"`);
                }
                promiseResult = Promise.resolve(NONE);
            } else if (this.config.remote && _type === MESSAGE_TYPES.SENDING_DONE) {
                this.adapter.log.debug(`[REMOTE] Packet received: ${id}, "${name}"`);
                delete this.packets[id];
                promiseResult = Promise.resolve(NONE);
            } else if (_type === MESSAGE_TYPES.HTML) {
                let promiseFile: Promise<SOCKET_MESSAGE | { file: string; mimeType: string }>;

                if (!this.config.remote) {
                    return Promise.resolve({ sid: message.sid, d: [_type, id, '', ['Not enabled']] });
                } else if (name === 'listOfPrograms' || name === '/listOfPrograms') {
                    promiseFile = AdminSocket.getListOfAllAdapters(this.adapter)
                        .then(result => {
                            const packed = deflateSync(JSON.stringify([null, result])).toString('base64');
                            return { sid: message.sid, d: [_type, id, '', packed] } as SOCKET_MESSAGE;
                        })
                        .catch(
                            error =>
                                ({
                                    sid: message.sid,
                                    d: [_type, id, '', [error.toString()]],
                                }) as SOCKET_MESSAGE,
                        );
                } else if (name === 'vendorPrefix' || name === '/vendorPrefix') {
                    return Promise.resolve({ sid: message.sid, d: [_type, id, '', [null, this.vendorPrefix]] });
                } else if (name.startsWith('/adapter')) {
                    if (this.config.remoteAdminInstance) {
                        if (this.adminUrl) {
                            promiseFile = this.readUrlFile(this.adminUrl, name, message.sid, _type, id);
                        } else {
                            promiseFile = Promise.resolve({
                                sid: message.sid,
                                d: [_type, id, '', { error: 'Not exists' }],
                            });
                        }
                    } else {
                        promiseFile = Promise.resolve({
                            sid: message.sid,
                            d: [_type, id, '', { error: 'Not exists' }],
                        });
                    }
                } else {
                    const path = name.split('?')[0];
                    const parts = path.split('/');
                    parts.shift(); // remove leading /
                    const _adapter = parts.shift() || '';
                    this.adapter.log.debug(`[REMOTE] HTML: ${path}`);

                    // html must be returned only by iot channel, as lambda must process the answer
                    promiseFile = this.adapter
                        .readFileAsync(_adapter, parts.join('/'))
                        .then(data => {
                            data.file = Buffer.from(data.file).toString('base64');
                            return data as { file: string; mimeType: string };
                        })
                        .catch(() => {
                            if (this.webUrl) {
                                // try to read from server
                                return this.readUrlFile(this.webUrl, path, message.sid, _type, id);
                            }
                            return {
                                sid: message.sid,
                                d: [_type, id, '', { error: 'Not exists' }],
                            };
                        });
                }

                return promiseFile.then(
                    (
                        data: SOCKET_MESSAGE | { file: string; mimeType: string },
                    ): Promise<SOCKET_MESSAGE | SOCKET_TRUNK[]> => {
                        // if error
                        if ((data as SOCKET_MESSAGE).sid) {
                            return Promise.resolve(data as SOCKET_MESSAGE);
                        }
                        const dataFile = data as { file: string; mimeType: string };
                        let packed = deflateSync(JSON.stringify(data)).toString('base64');
                        if (
                            typeof args === 'string' &&
                            args?.startsWith('https:') &&
                            packed.length > MAX_IOT_MESSAGE_LENGTH
                        ) {
                            // upload file to temp server
                            return this.uploadToServer(args, dataFile).then(done => ({
                                sid: message.sid,
                                d: [_type, id, '', done ? '_$%URL' : 'Cannot upload'],
                            }));
                        }

                        if (dataFile.file.length > MAX_FILE_SIZE) {
                            // file too big
                            this.adapter.log.warn(
                                `[REMOTE] Requested file ${name} is too big (${Math.round(dataFile.file.length / 1000)}Kb). Max length is ${MAX_FILE_SIZE / 1024}Kb`,
                            );
                            return Promise.resolve({
                                sid: message.sid,
                                d: [
                                    _type,
                                    id,
                                    '',
                                    {
                                        error: `File is too big: ${Math.round(dataFile.file.length / 1000)}Kb, max ${MAX_FILE_SIZE / 1024}Kb`,
                                    },
                                ],
                            });
                        }

                        if (packed.length > MAX_IOT_MESSAGE_LENGTH) {
                            const packets: string[] = [];
                            while (packed.length > MAX_IOT_MESSAGE_LENGTH) {
                                const trunk = packed.substring(0, MAX_IOT_MESSAGE_LENGTH);
                                packed = packed.substring(MAX_IOT_MESSAGE_LENGTH);
                                packets.push(trunk);
                            }
                            if (packed.length) {
                                packets.push(packed);
                            }

                            const trunks: SOCKET_TRUNK[] = packets.map((trunk, i) => ({
                                sid: message.sid,
                                i,
                                l: packets.length,
                                d: [_type, id, '', trunk],
                            }));

                            this.packets[id] = { ts: Date.now(), trunks };

                            // start garbage collector
                            this.gcInterval = this.gcInterval || setInterval(() => this._clearMemory(), 60000);

                            return Promise.resolve(trunks);
                        }
                        return Promise.resolve({ sid: message.sid, d: [_type, id, '', packed] });
                    },
                );
            }

            if (!this.config.remote) {
                promiseResult = Promise.resolve({ sid: message.sid, d: [_type, id, name, ['Not enabled']] });
            }
            let isNew = false;
            if (this.sockets) {
                if (!this.sockets[message.sid]) {
                    this.adapter.log.debug(`[REMOTE] +++++ CONNECT ${message.sid}`);
                    this.sockets[message.sid] = {
                        _subscribe: {
                            stateChange: [],
                            objectChange: [],
                            log: [],
                        },
                        ts: Date.now(),
                    };
                    isNew = true;
                } else {
                    this.sockets[message.sid].ts = Date.now();
                }
            }

            if (promiseResult) {
                // this answer will be processed at the very end of the function
            } else if (_type === MESSAGE_TYPES.COMBINED_CALLBACK || _type === MESSAGE_TYPES.COMBINED_MESSAGE) {
                let promiseMany: Promise<[error: string | null, result?: any][]> | undefined;
                if (name === 'getStates') {
                    promiseMany = this._getStatesManyArgs(args as [string][]);
                } else if (name === 'getState') {
                    promiseMany = this._getStateManyArgs(args as [string][]);
                } else if (name === 'getObject') {
                    promiseMany = this._getObjectManyArgs(args as [string][]);
                } else if (name === 'subscribe' || name === 'subscribeStates') {
                    promiseMany = this._subscribeManyArgs(message.sid, args as [string | string[]][]);
                } else if (name === 'unsubscribe' || name === 'unsubscribeStates') {
                    promiseMany = this._unsubscribeManyArgs(message.sid, args as [string | string[]][]);
                } else if (name === 'ppng') {
                    // ping
                    promiseResult = Promise.resolve({ sid: message.sid, d: [_type, id, name, [0, isNew ? 0 : 1]] }); // 1 is OK, 0 is not OK
                } else {
                    // error
                    this.adapter.log.error(`[REMOTE] Received unknown multiple request: ${name}`);
                    promiseResult = Promise.resolve({ sid: message.sid, d: [_type, id, name, ['Unknown command']] });
                }
                if (promiseMany) {
                    promiseResult = promiseMany
                        .then(result => this._sendResponse(message.sid, _type, id, name, result))
                        /*      let packed = zlib.deflateSync(JSON.stringify(result)).toString('base64');

                            if (packed.length > MAX_IOT_MESSAGE_LENGTH) {
                                setImmediate(async () => {
                                    if (packed.length > MAX_POST_MESSAGE_LENGTH) {
                                        // too big message. Do not use iot for that and send directly to socket
                                        const packets = []
                                        while (packed.length > MAX_POST_MESSAGE_LENGTH) {
                                            const trunk = packed.substring(0, MAX_POST_MESSAGE_LENGTH);
                                            packed = packed.substring(MAX_POST_MESSAGE_LENGTH);
                                            packets.push(trunk);
                                        }
                                        if (packed.length) {
                                            packets.push(packed);
                                        }

                                        for (let i = 0; i < packets.length; i++) {
                                            const error = await this._sendEvent({sid: message.sid, d: [_type, id, name, packets[i], packets.length, i]});
                                            if (error) {
                                                this.adapter.log.error('[REMOTE] cannot send: ' + JSON.stringify(error));
                                                break;
                                            }
                                        }
                                    } else {
                                        await this._sendEvent({sid: message.sid, d: [_type, id, name, packed]});
                                    }
                                });
                                return {sid: message.sid, d: [MESSAGE_TYPES.WAIT, id, name, [packed.length]]};
                            } else {
                                return {sid: message.sid, d: [_type, id, name, packed]};
                            }
                        })*/
                        .catch(error => ({ sid: message.sid, d: [_type, id, name, [error]] }) as SOCKET_MESSAGE);
                }
            } else if (this.handlers[name]) {
                const argsArray = args as any[];
                if (!this.handlers[name].args) {
                    promiseOne = this.handlers[name].f();
                } else if (this.handlers[name].args === 1) {
                    promiseOne = this.handlers[name].f(argsArray[0]);
                } else if (this.handlers[name].args === 2) {
                    promiseOne = this.handlers[name].f(argsArray[0], argsArray[1]);
                } else if (this.handlers[name].args === 3) {
                    promiseOne = this.handlers[name].f(argsArray[0], argsArray[1], argsArray[2]);
                } else if (this.handlers[name].args === 4) {
                    promiseOne = this.handlers[name].f(argsArray[0], argsArray[1], argsArray[2], argsArray[3]);
                } else if (this.handlers[name].args === 5) {
                    promiseOne = this.handlers[name].f(
                        argsArray[0],
                        argsArray[1],
                        argsArray[2],
                        argsArray[3],
                        argsArray[4],
                    );
                } else if (this.handlers[name].args === 6) {
                    promiseOne = this.handlers[name].f(
                        argsArray[0],
                        argsArray[1],
                        argsArray[2],
                        argsArray[3],
                        argsArray[4],
                        argsArray[5],
                    );
                } else {
                    this.adapter.log.warn('[REMOTE] Unsupported number of arguments');
                }
            } else if (name === 'ppng') {
                // ping
                promiseResult = Promise.resolve({ sid: message.sid, d: [_type, id, name, [null, !isNew]] });
            } else if (name === 'name') {
                const socket = this.sockets[message.sid];
                if (socket.name === undefined) {
                    socket.name = name;
                    this.adapter.log.info(`[REMOTE] socket ${message.sid} connected with name "${name}"`);
                } else if (socket.name !== name) {
                    this.adapter.log.warn(
                        `[REMOTE] socket ${message.sid} changed socket name from ${socket.name} to ${name}`,
                    );
                    socket.name = name;
                }

                // start garbage collector
                this.gcInterval = this.gcInterval || setInterval(() => this._clearMemory(), 60000);

                promiseResult = Promise.resolve({ sid: message.sid, d: [_type, id, name, []] });
            } else if (name === 'authenticate') {
                promiseResult = Promise.resolve({ sid: message.sid, d: [_type, id, name, [true, false]] });
            } else if (name === 'getObjects') {
                promiseOne = this._readAllObjects();
            } else if (name === 'getHostByIp') {
                promiseResult = AdminSocket.getHostByIp(this.adapter, (args as [string])[0]).then(result => ({
                    sid: message.sid,
                    d: [_type, id, name, [result.ip, result.obj]],
                }));
            } else if (name === 'getStates') {
                promiseOne = this.adapter.getForeignStatesAsync((args as [string])[0] || '*');
            } else if (name === 'requireLog') {
                const isEnabled = (args as [string])[0];
                if (isEnabled) {
                    this._subscribe(message.sid, 'log', 'dummy');
                } else {
                    this._unsubscribe(message.sid, 'log', 'dummy');
                }

                if (this.adapter.log.level === 'debug') {
                    this._showSubscribes(message.sid, 'log');
                }

                promiseOne = Promise.resolve({ sid: message.sid, d: [_type, id, name, [null]] });
            } else if (name === 'DCT') {
                // disconnect
                const socket = this.sockets[message.sid];
                this.adapter.log.debug(`[REMOTE] ---- DISCONNECT ${message.sid}`);
                if (socket) {
                    this._unsubscribeSocket(message.sid, 'stateChange');
                    this._unsubscribeSocket(message.sid, 'objectChange');
                    this._unsubscribeSocket(message.sid, 'log');
                    delete this.sockets[message.sid];
                }
            } else if (name === 'getVersion') {
                promiseResult = Promise.resolve({
                    sid: message.sid,
                    d: [_type, id, name, [null, this.adminObj?.common.version, 'admin']],
                });
            } else if (name === 'subscribe' || name === 'subscribeStates') {
                const pattern = (args as [string | string[]])[0];
                if (Array.isArray(pattern)) {
                    for (let p = 0; p < pattern.length; p++) {
                        this._subscribe(message.sid, 'stateChange', pattern[p]);
                    }
                } else {
                    this._subscribe(message.sid, 'stateChange', pattern);
                }

                this.adapter.log.level === 'debug' && this._showSubscribes(message.sid, 'stateChange');
                promiseOne = Promise.resolve({ sid: message.sid, d: [_type, id, name, [null]] });
            } else if (name === 'unsubscribe' || name === 'unsubscribeStates') {
                const pattern = (args as [string | string[]])[0];
                if (Array.isArray(pattern)) {
                    for (let p = 0; p < pattern.length; p++) {
                        this._unsubscribe(message.sid, 'stateChange', pattern[p]);
                    }
                } else {
                    this._unsubscribe(message.sid, 'stateChange', pattern);
                }

                this.adapter.log.level === 'debug' && this._showSubscribes(message.sid, 'stateChange');
                promiseOne = Promise.resolve({ sid: message.sid, d: [_type, id, name, [null]] });
            } else if (name === 'subscribeObjects') {
                const pattern = (args as [string | string[]])?.[0] || '*';
                if (Array.isArray(pattern)) {
                    for (let p = 0; p < pattern.length; p++) {
                        this._subscribe(message.sid, 'objectChange', pattern[p]);
                    }
                } else {
                    this._subscribe(message.sid, 'objectChange', pattern);
                }

                this.adapter.log.level === 'debug' && this._showSubscribes(message.sid, 'objectChange');
                promiseOne = Promise.resolve({ sid: message.sid, d: [_type, id, name, [null]] });
            } else if (name === 'unsubscribeObjects') {
                const pattern = (args as [string | string[]])[0];
                if (Array.isArray(pattern)) {
                    for (let p = 0; p < pattern.length; p++) {
                        this._unsubscribe(message.sid, 'objectChange', pattern[p]);
                    }
                } else {
                    this._unsubscribe(message.sid, 'objectChange', pattern);
                }

                this.adapter.log.level === 'debug' && this._showSubscribes(message.sid, 'objectChange');
                promiseOne = Promise.resolve({ sid: message.sid, d: [_type, id, name, [null]] });
            } else if (name === 'authEnabled') {
                promiseResult = Promise.resolve({ sid: message.sid, d: [_type, id, name, [false, 'admin']] });
            } else if (name === 'readFile') {
                const adapter = (args as [id: string, filePath: string])[0];
                const fileName = (args as [id: string, filePath: string])[1];
                promiseResult = this.adapter
                    .readFileAsync(adapter, fileName)
                    .then(data =>
                        this._sendResponse(
                            message.sid,
                            _type,
                            id,
                            name,
                            [null, data.file, data.mimeType],
                            message.wu,
                            message.ru,
                        ),
                    )
                    .catch(error => ({ sid: message.sid, d: [_type, id, name, [error]] }) as SOCKET_MESSAGE);
            } else if (name === 'readFile64') {
                const adapter = (args as [id: string, filePath: string])[0];
                const fileName = (args as [id: string, filePath: string])[1];
                promiseResult = this.adapter
                    .readFileAsync(adapter, fileName)
                    .then(data => {
                        let data64: string | undefined;
                        if (data.mimeType) {
                            try {
                                if (
                                    data.mimeType === 'application/json' ||
                                    data.mimeType === 'application/json5' ||
                                    fileName.toLowerCase().endsWith('.json5')
                                ) {
                                    data64 = Buffer.from(encodeURIComponent(data.mimeType)).toString('base64');
                                } else if (data.mimeType) {
                                    data64 = Buffer.from(data.mimeType).toString('base64');
                                }
                            } catch (error) {
                                this.adapter.log.error(`[readFile64] Cannot convert data: ${error.toString()}`);
                            }
                        }

                        return this._sendResponse(
                            message.sid,
                            _type,
                            id,
                            name,
                            [null, data64, data.mimeType],
                            message.wu,
                            message.ru,
                        );
                    })
                    .catch(error => ({ sid: message.sid, d: [_type, id, name, [error]] }) as SOCKET_MESSAGE);
            } else if (name === 'writeFile' || name === 'writeFile64') {
                const [adr, fileName, data64, options] = args as [
                    adapterId: string,
                    fileName: string,
                    data64: string,
                    options?: any,
                ];
                if (readUrl) {
                    promiseOne = axios(readUrl as string, {
                        responseType: 'arraybuffer',
                        validateStatus: status => status === 200,
                        timeout: 15000,
                    }).then(response =>
                        this.adapter.writeFileAsync(adr, fileName, Buffer.from(response.data), options),
                    );
                } else if (name === 'writeFile') {
                    this.adapter.log.debug('writeFile deprecated. Please use writeFile64');
                    promiseOne = this.adapter.writeFileAsync(adr, fileName, data64, options);
                } else if (name === 'writeFile64') {
                    const buffer = Buffer.from(data64, 'base64');
                    promiseOne = this.adapter.writeFileAsync(adr, fileName, buffer, options);
                }
            } else if (name === 'getHistory') {
                const _id = (args as [id: string, otions: ioBroker.GetHistoryOptions])[0];
                const options = (args as [id: string, otions: ioBroker.GetHistoryOptions])[1];
                promiseResult = this.adapter
                    .getHistoryAsync(_id, options)
                    .then(data =>
                        this._sendResponse(
                            message.sid,
                            _type,
                            id,
                            name,
                            [null, data.result, data.step, data.sessionId],
                            message.wu,
                            message.ru,
                        ),
                    )
                    .catch(error => ({ sid: message.sid, d: [_type, id, name, [error]] }) as SOCKET_MESSAGE);
            } else if (name === 'getEasyMode') {
                promiseOne = AdminSocket.getEasyMode(this.adapter, this.adminObj);
            } else if (name === 'getAdapterInstances') {
                promiseOne = AdminSocket.getAdapterInstances(this.adapter, (args as [string])[0]);
            } else if (name === 'getCurrentInstance') {
                promiseOne = Promise.resolve(this.config.remoteAdminInstance);
            } else if (name === 'checkFeatureSupported') {
                promiseOne = Promise.resolve(
                    this.adapter.supportsFeature?.(
                        (
                            args as [
                                | 'ALIAS'
                                | 'ALIAS_SEPARATE_READ_WRITE_ID'
                                | 'ADAPTER_GETPORT_BIND'
                                | 'ADAPTER_DEL_OBJECT_RECURSIVE'
                                | 'ADAPTER_SET_OBJECT_SETS_DEFAULT_VALUE'
                                | 'ADAPTER_AUTO_DECRYPT_NATIVE'
                                | 'PLUGINS'
                                | 'CONTROLLER_NPM_AUTO_REBUILD'
                                | 'CONTROLLER_READWRITE_BASE_SETTINGS'
                                | 'CONTROLLER_MULTI_REPO'
                                | 'CONTROLLER_LICENSE_MANAGER'
                                | 'CONTROLLER_OS_PACKAGE_UPGRADE'
                                | 'DEL_INSTANCE_CUSTOM'
                                | 'CUSTOM_FULL_VIEW'
                                | 'ADAPTER_GET_OBJECTS_BY_ARRAY'
                                | 'CONTROLLER_UI_UPGRADE'
                                | 'ADAPTER_WEBSERVER_UPGRADE',
                            ]
                        )[0],
                    ),
                );
            } else if (name === 'getAdapterName') {
                promiseOne = Promise.resolve('admin');
            } else if (name === 'decrypt') {
                if (this.secret) {
                    promiseOne = Promise.resolve(this.adapter.decrypt(this.secret, (args as [string])[0]));
                } else {
                    promiseOne = this.adapter.getForeignObjectAsync(
                        'system.config',
                        (err: Error | null | undefined, obj: ioBroker.SystemConfigObject): string => {
                            if (obj?.native?.secret) {
                                this.secret = obj.native.secret;
                                return this.adapter.decrypt(this.secret, (args as [string])[0]);
                            }
                            this.adapter.log.error(`No system.config found: ${err}`);
                            throw new Error('No system.config found');
                        },
                    );
                }
            } else if (name === 'encrypt') {
                if (this.secret) {
                    promiseOne = Promise.resolve(this.adapter.encrypt(this.secret, (args as [string])[0]));
                } else {
                    promiseOne = this.adapter.getForeignObjectAsync(
                        'system.config',
                        (err: Error | null | undefined, obj: ioBroker.SystemConfigObject): string => {
                            if (obj?.native?.secret) {
                                this.secret = obj.native.secret;
                                return this.adapter.encrypt(this.secret, (args as [string])[0]);
                            }
                            this.adapter.log.error(`No system.config found: ${err}`);
                            throw new Error('No system.config found');
                        },
                    );
                }
            } else if (name === 'getIsEasyModeStrict') {
                promiseOne = AdminSocket.getIsEasyModeStrict(this.adapter, this.adminObj);
            } else if (name === 'getAdapters') {
                promiseOne = AdminSocket.getAdapters(this.adapter, (args as [string])[0]);
            } else if (name === 'updateLicenses') {
                promiseOne = AdminSocket.updateLicenses(
                    this.adapter,
                    (args as [admin: string, password: string])[0],
                    (args as [admin: string, password: string])[1],
                    this.adminObj,
                );
            } else if (name === 'getCompactInstances') {
                promiseOne = AdminSocket.getCompactInstances(this.adapter);
            } else if (name === 'getCompactSystemRepositories') {
                promiseOne = AdminSocket.getCompactSystemRepositories(this.adapter);
            } else if (name === 'getCompactAdapters') {
                promiseOne = AdminSocket.getCompactAdapters(this.adapter);
            } else if (name === 'getCompactInstalled') {
                promiseResult = AdminSocket.getCompactInstalled(
                    this.adapter,
                    (args as [hostName: string])[0] || this.adminObj?.common.host || this.adapter.common!.host,
                ).then(data => ({ sid: message.sid, d: [_type, id, name, [data]] }));
            } else if (name === 'getCompactSystemConfig') {
                promiseOne = AdminSocket.getCompactSystemConfig(this.adapter);
            } else if (name === 'getCompactRepository') {
                promiseResult = AdminSocket.getCompactRepository(
                    this.adapter,
                    (args as [hostName: string])[0] || this.adminObj?.common.host || this.adapter.common!.host,
                ).then(data => ({ sid: message.sid, d: [_type, id, name, [data]] }));
            } else if (name === 'getCompactHosts') {
                promiseOne = AdminSocket.getCompactHosts(this.adapter);
            } else if (name === 'readLogs') {
                promiseOne = AdminSocket.readLogs(
                    this.adapter,
                    (args as [hostName: string])[0] || this.adminObj?.common.host || this.adapter.common!.host,
                );
            } else if (name === 'eventsThreshold') {
                promiseOne = Promise.resolve(NONE);
            } else if (name === 'getRatings') {
                promiseOne = AdminSocket.getRatings(
                    this.adapter,
                    (args as [forceUpdate?: boolean, autoUpdate?: boolean])[0],
                    (args as [forceUpdate?: boolean, autoUpdate?: boolean])[1],
                );
            } else if (name === 'getUserPermissions') {
                this.adapter.log.error(`[REMOTE] getUserPermissions not implemented!!!!!!!!!!!!!!!!!!!!!`);
            } else if (name === 'listPermissions') {
                promiseResult = AdminSocket.listPermissions(this.adapter)
                    .then(commandsPermissions =>
                        this._sendResponse(message.sid, _type, id, name, [commandsPermissions]),
                    )
                    .catch(error => ({ sid: message.sid, d: [_type, id, name, [error]] }) as SOCKET_MESSAGE);
            } else if (name === 'sendToHost') {
                const [host, command, msg] = args as [host: string, command: string, message: any];
                this.adapter.log.debug(`[REMOTE] SEND_TO_HOST: ${command}`);
                // check if the host is alive
                promiseResult = AdminSocket.sendToHost(this.adapter, host, command, msg)
                    .then(data => this._sendResponse(message.sid, _type, id, name, [data], message.wu, message.ru))
                    .catch(error => ({ sid: message.sid, d: [_type, id, name, [error]] }) as SOCKET_MESSAGE);
            } else if (name === 'sendTo') {
                const [adapterInstance, command, message] = args as [instance: string, command: string, message: any];
                promiseResult = AdminSocket.sendTo(this.adapter, adapterInstance, command, message)
                    .then(data => this._sendResponse(message.sid, _type, id, name, [data], message.wu, message.ru))
                    .catch(error => ({ sid: message.sid, d: [_type, id, name, [error]] }) as SOCKET_MESSAGE);
            } else if (name === 'getAllObjects') {
                promiseOne = AdminSocket.getAllObjects(this.adapter);
            }

            // MESSAGE is the only one-way message and no answer is expected
            if (_type === MESSAGE_TYPES.MESSAGE || _type === MESSAGE_TYPES.COMBINED_MESSAGE) {
                promiseResult = promiseOne ? promiseOne.then(() => NONE) : Promise.resolve(NONE);
            } else if (!promiseResult && promiseOne) {
                promiseResult = promiseOne
                    .then(result =>
                        this._sendResponse(message.sid, _type, id, name, [null, result], message.wu, message.ru),
                    )
                    .catch(error => ({ sid: message.sid, d: [_type, id, name, [error]] }) as SOCKET_MESSAGE);
            }

            if (!promiseResult) {
                this.adapter.log.warn(`[REMOTE] Received unknown command: ${name}`);
                promiseResult = Promise.resolve({ sid: message.sid, d: [_type, id, name, ['Unknown command']] });
            }

            return promiseResult.then(result => {
                if (result !== NONE && result.d && result.d[0] !== MESSAGE_TYPES.WAIT) {
                    setImmediate(
                        async (_result, _message) => await this._sendEvent(_result, _message),
                        result,
                        message,
                    );
                }

                return NONE;
            });
        }
        return Promise.reject(new Error('Null message'));
    }
}
