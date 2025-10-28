import { device as DeviceModule } from 'aws-iot-device-sdk';
import { Adapter, type AdapterOptions } from '@iobroker/adapter-core'; // Get common adapter utils
import { readFileSync } from 'node:fs';
import axios from 'axios';
import { deflateSync } from 'node:zlib';

// @ts-expect-error no types
import AlexaSH2 from './lib/alexaSmartHomeV2';
import AlexaSH3 from './lib/alexaSmartHomeV3';
import AlexaCustom, { type AlexaCustomResponse } from './lib/alexaCustom';
// @ts-expect-error no types
import GoogleHome from './lib/googleHome';
// @ts-expect-error no types
import YandexAlisa from './lib/alisa';
import Remote, { type SOCKET_MESSAGE, type SOCKET_TRUNK } from './lib/remote';
import { handleGeofenceData, handleDevicesData, handleSendToAdapter, handleGetInstances } from './lib/visuApp';
import { buildMessageFromNotification } from './lib/notifications';
import type { IotAdapterConfig } from './lib/types';

const NONE = '___none___';
const MAX_IOT_MESSAGE_LENGTH = 127 * 1024;
const SPECIAL_ADAPTERS = ['netatmo'];
const ALLOWED_SERVICES = SPECIAL_ADAPTERS.concat(['text2command']);

export class IotAdapter extends Adapter {
    declare public config: IotAdapterConfig;
    private recalcTimeout: NodeJS.Timeout | null = null;
    private lang: ioBroker.Languages = 'de';
    private translate = false;
    private alexaSH2: AlexaSH2 | null = null;
    private alexaSH3: AlexaSH3 | null = null;
    private googleHome: GoogleHome | null = null;
    private alexaCustom: AlexaCustom | null = null;
    private yandexAlisa: YandexAlisa | null = null;
    private remote: Remote | null = null;
    private device: DeviceModule | null = null;
    private urlKey: { key: string } | null = null;

    private connectedOwn = false;
    private secret: string = '';
    private connectStarted = 0;

    public constructor(options: Partial<AdapterOptions> = {}) {
        super({
            ...options,
            name: 'iot',
            objectChange: (id, obj) => {
                if (id === 'system.config' && obj && !this.translate) {
                    const systemObj = obj as ioBroker.SystemConfigObject;
                    this.lang = systemObj.common.language;

                    if (this.lang !== 'en' && this.lang !== 'de' && this.lang !== 'ru') {
                        this.lang = 'en';
                    }

                    this.alexaSH2?.setLanguage(this.lang);
                    this.alexaSH3?.setLanguage(this.lang);
                    this.yandexAlisa?.setLanguage(this.lang);
                    this.alexaCustom?.setLanguage(this.lang);
                    this.googleHome?.setLanguage(this.lang);
                    this.remote?.setLanguage(this.lang);
                }
                // if it is an instance
                if (id.startsWith('system.adapter.')) {
                    // try to find it in special adapters
                    const adpr = SPECIAL_ADAPTERS.find(a => id.startsWith(`system.adapter.${a}.`));
                    // if found and it is really instance
                    if (adpr && id.match(/\.\d+$/)) {
                        // update state
                        setTimeout(async () => await this.createStateForAdapter(adpr), 1000);
                    }

                    return;
                }
                void this.alexaSH3?.handleObjectChange(id, obj);

                if (id) {
                    this.remote?.updateObject(id, obj);
                }
            },
            stateChange: async (id, state) => {
                if (id === `${this.namespace}.app.message` && state && !state.ack) {
                    try {
                        await this.sendMessageToApp(state.val as string);
                    } catch (e) {
                        this.log.error(`Cannot send message to app: ${e}`);
                    }
                }

                if (state) {
                    if (this.config.googleHome) {
                        void this.googleHome?.updateState(id, state);
                    }
                    if (this.config.amazonAlexa) {
                        void this.alexaSH3?.handleStateUpdate(id, state);
                    }

                    if (this.config.yandexAlisa) {
                        void this.yandexAlisa?.updateState?.(id, state);
                    }
                }

                if (id) {
                    this.remote?.updateState(id, state);
                }

                if (id === `${this.namespace}.smart.lastResponse` && state && !state.ack) {
                    this.alexaCustom?.setResponse(state.val as string);
                }
            },
            unload: async callback => {
                try {
                    if (this.device) {
                        this.device.end();
                        this.device = null;
                    }
                    if (this.remote) {
                        this.remote.destroy();
                        this.remote = null;
                    }

                    if (this.alexaSH3) {
                        await this.alexaSH3.destroy();
                    }
                } catch {
                    // ignore
                }
                callback();
            },
            message: async obj => {
                if (obj) {
                    switch (obj.command) {
                        case 'update':
                            if (this.recalcTimeout) {
                                clearTimeout(this.recalcTimeout);
                            }

                            this.recalcTimeout = setTimeout(async () => {
                                this.recalcTimeout = null;
                                this.alexaSH2?.updateDevices(
                                    obj.message,
                                    async (analyseAddedId: any): Promise<void> => {
                                        await this.setStateAsync('smart.updatesResult', analyseAddedId || '', true);
                                        this.log.debug('Devices updated!');
                                        await this.setStateAsync('smart.updates', true, true);
                                    },
                                );

                                // this.alexaSH3 && this.alexaSH3.updateDevices(obj.message, async analyseAddedId => {
                                //     await this.setStateAsync('smart.updatesResult', analyseAddedId || '', true);
                                //     await this.setStateAsync('smart.updates3', true, true);
                                // });
                                if (this.alexaSH3) {
                                    await this.alexaSH3.updateDevices();
                                    await this.setStateAsync('smart.updates3', true, true);
                                }

                                this.googleHome?.updateDevices(async (analyseAddedId: any): Promise<void> => {
                                    await this.setStateAsync('smart.updatesResult', analyseAddedId || '', true);
                                    this.log.debug('GH Devices updated!');
                                    await this.setStateAsync('smart.updatesGH', true, true);
                                });
                            }, 1000);
                            break;

                        case 'browse':
                            if (obj.callback) {
                                this.log.info('Request devices');
                                if (this.alexaSH2) {
                                    this.alexaSH2.updateDevices(() => {
                                        this.sendTo(obj.from, obj.command, this.alexaSH2!.getDevices(), obj.callback);
                                        void this.setState('smart.updates', false, true);
                                    });
                                } else {
                                    this.sendTo(obj.from, obj.command, { error: 'not activated' }, obj.callback);
                                }
                            }
                            break;

                        case 'browse3':
                            if (obj.callback) {
                                this.log.info('Request V3 devices');
                                if (this.alexaSH3) {
                                    const devices = await this.alexaSH3.getDevices();
                                    this.sendTo(obj.from, obj.command, devices, obj.callback);
                                    await this.setStateAsync('smart.updates3', false, true);
                                } else {
                                    this.sendTo(obj.from, obj.command, { error: 'not activated' }, obj.callback);
                                }
                            }
                            break;

                        case 'browseGH':
                            if (obj.callback) {
                                this.log.info('Request google home devices');
                                if (this.googleHome) {
                                    this.googleHome.updateDevices(() => {
                                        this.sendTo(obj.from, obj.command, this.googleHome!.getDevices(), obj.callback);
                                        void this.setStateAsync('smart.updatesGH', false, true);
                                    });
                                } else {
                                    this.sendTo(obj.from, obj.command, { error: 'not activated' }, obj.callback);
                                }
                            }
                            break;

                        case 'browseAlisa':
                            if (obj.callback) {
                                this.log.info('Request Yandex Alice devices');
                                if (this.yandexAlisa) {
                                    this.yandexAlisa.updateDevices(() => {
                                        this.sendTo(
                                            obj.from,
                                            obj.command,
                                            this.yandexAlisa!.getDevices(),
                                            obj.callback,
                                        );
                                        void this.setStateAsync('smart.updatesYA', false, true);
                                    });
                                } else {
                                    this.sendTo(obj.from, obj.command, { error: 'not activated' }, obj.callback);
                                }
                            }
                            break;

                        case 'alexaCustomKnownDevices':
                            // Admin UI can request the known/discoveredAlexa devices used via Custom skill
                            // Allow setting the rooms of the devices and store in adapter config
                            // Restart adapter after change - or we also add a set message to the config
                            if (obj.callback) {
                                this.log.info('Request Alexa Custom known devices');
                                this.sendTo(
                                    obj.from,
                                    obj.command,
                                    this.alexaCustom ? this.alexaCustom.getKnownDevices() : { error: 'not activated' },
                                    obj.callback,
                                );
                            }
                            break;

                        case 'alexaCustomKnownUsers':
                            // Admin UI can request the known/discoveredAlexa users used via Custom skill
                            // Allow setting the names of the users and store in adapter config
                            // Restart adapter after change - or we also add a set message to the config
                            if (obj.callback) {
                                this.log.info('Request Alexa Custom known users');
                                this.sendTo(
                                    obj.from,
                                    obj.command,
                                    this.alexaCustom ? this.alexaCustom.getKnownUsers() : { error: 'not activated' },
                                    obj.callback,
                                );
                            }
                            break;

                        case 'private': {
                            if (typeof obj.message !== 'object') {
                                try {
                                    obj.message = JSON.parse(obj.message);
                                } catch (e) {
                                    this.log.error(`Cannot parse object: ${e}`);
                                    obj.callback &&
                                        this.sendTo(
                                            obj.from,
                                            obj.command,
                                            { error: 'Invalid message format: cannot parse object' },
                                            obj.callback,
                                        );
                                    return;
                                }
                            }
                            const response = await this.processMessage(obj.message.type, obj.message.request);
                            if (obj.callback) {
                                this.sendTo(obj.from, obj.command, response, obj.callback);
                            }

                            break;
                        }
                        case 'ifttt':
                            this.sendDataToIFTTT(obj.message);
                            break;

                        case 'alexaCustomResponse':
                            this.alexaCustom?.setResponse(obj.message);
                            break;

                        case 'debug':
                            this.alexaSH2?.getDebug((data: any): void =>
                                this.sendTo(obj.from, obj.command, data, obj.callback),
                            );
                            break;

                        case 'getServiceEndpoint':
                            if (obj.callback) {
                                if (!this.urlKey) {
                                    try {
                                        this.urlKey = await this.readUrlKey();
                                    } catch {
                                        try {
                                            this.urlKey = await this.createUrlKey(this.config.login, this.config.pass);
                                        } catch (err) {
                                            return (
                                                obj.callback &&
                                                this.sendTo(
                                                    obj.from,
                                                    obj.command,
                                                    { error: `Cannot get urlKey: ${err.toString()}` },
                                                    obj.callback,
                                                )
                                            );
                                        }
                                    }
                                }

                                const result: {
                                    url: string;
                                    stateID?: string;
                                    data?: string;
                                    warning?: string;
                                } = {
                                    url: `https://service.iobroker.in/v1/iotService?key=${this.urlKey.key}&user=${encodeURIComponent(this.config.login)}`,
                                };
                                const serviceName =
                                    typeof obj.message === 'string' ? obj.message : obj.message?.serviceName;
                                if (serviceName) {
                                    result.url += `&service=${encodeURIComponent(serviceName)}`;
                                    result.stateID = `${this.namespace}.services.${serviceName}`;
                                }
                                if (obj.message?.data) {
                                    result.data += `&data=${typeof obj.message.data === 'object' ? JSON.stringify(obj.message.data) : obj.message.data}`;
                                }
                                // check if the service name is in the white list
                                if (
                                    serviceName &&
                                    this.config.allowedServices[0] !== '*' &&
                                    !this.config.allowedServices.includes(serviceName.replace(/^custom_/, '')) &&
                                    !ALLOWED_SERVICES.includes(serviceName)
                                ) {
                                    result.warning = 'Service name is not in white list';
                                    this.log.warn(`Service "${serviceName}" is not in allowed services list`);
                                }

                                if (obj.callback) {
                                    this.sendTo(obj.from, obj.command, result, obj.callback);
                                }
                            }
                            break;
                        case 'sendNotification':
                            try {
                                const { message, title } = buildMessageFromNotification(obj.message);
                                await this.sendMessageToApp(JSON.stringify({ message, title }));
                                if (obj.callback) {
                                    this.sendTo(obj.from, 'sendNotification', { sent: true }, obj.callback);
                                }
                            } catch {
                                if (obj.callback) {
                                    this.sendTo(obj.from, 'sendNotification', { sent: false }, obj.callback);
                                }
                            }
                            break;
                        default:
                            this.log.warn(`Unknown command: ${obj.command}`);
                            break;
                    }
                }
            },
            ready: () =>
                this.main()
                    .then(() => {})
                    .catch(error => {
                        this.log.error(`Error in main: ${error.toString()}`);
                    }),
        });

        // warning: `this.log = obj => console.log(obj)` does not implemented. Only this.on('log', obj => console.log(obj))
        this.on('log', obj => this.remote?.onLog(obj));
    }

    sendDataToIFTTT(obj: {
        event?: string;
        key?: string;
        id?: string;
        val?: ioBroker.StateValue;
        ack?: boolean;
    }): void {
        if (!obj) {
            this.log.warn('No data to send to IFTTT');
            return;
        }
        if (!this.config.iftttKey && (typeof obj !== 'object' || !obj.key)) {
            this.log.warn('No IFTTT key is defined');
            return;
        }

        let url;
        let data;
        if (typeof obj !== 'object') {
            url = `https://maker.ifttt.com/trigger/state/with/key/${this.config.iftttKey}`;
            data = {
                value1: `${this.namespace}.services.ifttt`,
                value2: obj,
            };
        } else if (obj.event) {
            const event = obj.event;
            const key = obj.key;
            delete obj.event;
            delete obj.key;
            url = `https://maker.ifttt.com/trigger/${event}/with/key/${key || this.config.iftttKey}`;
            data = obj;
        } else if (obj.val === undefined) {
            return this.log.warn('No value is defined');
        } else {
            obj.id = obj.id || `${this.namespace}.services.ifttt`;
            url = `https://maker.ifttt.com/trigger/state/with/key/${this.config.iftttKey}`;
            data = {
                value1: obj.id,
                value2: obj.val,
                value3: obj.ack,
            };
        }

        if (url) {
            axios
                .post(url, data, {
                    timeout: 15000,
                    validateStatus: status => status < 400,
                })
                .then(response => this.log.debug(`Response from IFTTT: ${JSON.stringify(response.data)}`))
                .catch(error => {
                    if (error.response) {
                        this.log.warn(
                            `Response from IFTTT: ${error.response.data ? JSON.stringify(error.response.data) : error.response.status}`,
                        );
                    } else {
                        this.log.warn(`Response from IFTTT: ${error.code}`);
                    }
                });
        } else {
            this.log.warn(`Invalid request to IFTTT: ${JSON.stringify(obj)}`);
        }
    }

    /**
     * Send a message to the ioBroker Visu App by using the app-message endpoint (which then forwards it to the app via FCM)
     *
     * @param message either a json string or the message itself, if the message itself the other props will be taken from the adapter states
     */
    async sendMessageToApp(message: string): Promise<void> {
        if (!message) {
            throw new Error('Empty message');
        }
        const trimmedMessage = message.toString().trim();
        let json: {
            message: string;
            title: string;
            priority?: 'high';
            ttlSeconds?: number;
            expire?: number;
        } | null;
        if (trimmedMessage.startsWith('{') && trimmedMessage.endsWith('}')) {
            try {
                json = JSON.parse(trimmedMessage);
            } catch {
                this.log.warn(`Cannot parse message: ${trimmedMessage}`);
                json = null;
            }
        } else {
            json = null;
        }

        if (!json) {
            // take expires
            const ttlSecondsState = await this.getStateAsync(`${this.namespace}.app.expire`);
            const priorityState = await this.getStateAsync(`${this.namespace}.app.priority`);
            const titleState = await this.getStateAsync(`${this.namespace}.app.title`);
            const priorityVal = priorityState?.val;
            json = {
                message: message.toString(),
                priority: priorityVal === '1' || priorityVal === 'high' || priorityVal === true ? 'high' : undefined,
                ttlSeconds: parseInt(ttlSecondsState?.val as string, 0) || undefined,
                title: ((titleState?.val as string) || 'ioBroker').toString(),
            };
        } else {
            if (json.expire) {
                json.ttlSeconds = json.expire;
                delete json.expire;
            }
        }

        json.ttlSeconds = parseInt(json.ttlSeconds as unknown as string, 0) || undefined;

        if (json.ttlSeconds && json.ttlSeconds > 3_600 * 48) {
            json.ttlSeconds = 3_600 * 48;
        }

        if (!json.message) {
            throw new Error('Empty message');
        }

        const response = await axios.post('https://app-message.iobroker.in/', json, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${Buffer.from(`${this.config.login}:${this.config.pass}`).toString('base64')}`,
            },
            timeout: 5_000,
            validateStatus: status => status < 400,
        });
        await this.setState('app.message', message, true);
        this.log.debug(`Message sent: ${JSON.stringify(response.data)}`);
    }

    async controlState(
        id: string | null,
        data: string | { id?: string; val?: ioBroker.StateValue; ack?: boolean },
    ): Promise<void> {
        id ||= 'services.ifttt';

        if (typeof data === 'object') {
            if (data.id) {
                if (data.id === `${this.namespace}.services.ifttt`) {
                    data.ack = true;
                }
                if (data.val === undefined) {
                    throw new Error('No value set');
                }
                const obj = await this.getForeignObjectAsync(data.id);
                if (!obj || !obj.common) {
                    throw new Error(`Unknown ID: ${data.id}`);
                } else {
                    if (typeof data.val === 'string') {
                        data.val = data.val.replace(/^@ifttt\s?/, '');
                    }
                    if (obj.common.type === 'boolean') {
                        data.val =
                            data.val === true ||
                            data.val === 'true' ||
                            data.val === 'on' ||
                            data.val === 'ON' ||
                            data.val === 1 ||
                            data.val === '1';
                    } else if (obj.common.type === 'number') {
                        data.val = parseFloat(data.val as string);
                    }

                    await this.setForeignStateAsync(data.id, data.val, data.ack);
                }
            } else if (data.val !== undefined) {
                if (typeof data.val === 'string') {
                    data.val = data.val.replace(/^@ifttt\s?/, '');
                }
                await this.setStateAsync(id, data.val, data.ack !== undefined ? data.ack : true);
            } else {
                await this.setStateAsync(id, JSON.stringify(data), true);
            }
        } else {
            if (typeof data === 'string') {
                data = data.replace(/^@ifttt\s?/, '');
            }
            await this.setStateAsync(id, data, true);
        }
    }

    async processIfttt(data: {
        id?: string;
        data?:
            | string
            | {
                  id?: string;
                  val?: ioBroker.StateValue;
                  ack?: boolean;
                  data?: { id?: string; val?: ioBroker.StateValue; ack?: boolean } | string;
              };
    }): Promise<void> {
        this.log.debug(`Received IFTTT object: ${JSON.stringify(data)}`);
        let id: string | undefined;
        let dataObj: { id?: string; val?: ioBroker.StateValue; ack?: boolean } | null = null;
        // >If data is object with id and data property
        if (typeof data === 'object' && data.id && data.data !== undefined) {
            id = data.id;
            if (typeof data.data === 'string' && data.data[0] === '{') {
                try {
                    dataObj = JSON.parse(data.data);
                } catch {
                    this.log.debug(`Cannot parse: ${data.data}`);
                    dataObj = data;
                }
            } else {
                dataObj = data.data as { id?: string; val?: ioBroker.StateValue; ack?: boolean };
            }
        } else if (typeof data === 'string' && data[0] === '{') {
            // If data is string and starts with {
            try {
                dataObj = JSON.parse(data) as { id?: string; val?: ioBroker.StateValue; ack?: boolean };

                if (typeof dataObj.id === 'string') {
                    id = dataObj.id;
                    if ((dataObj as any).data) {
                        dataObj = (dataObj as any).data as {
                            id?: string;
                            val?: ioBroker.StateValue;
                            ack?: boolean;
                        };
                    }
                }
            } catch {
                this.log.debug(`Cannot parse: ${JSON.stringify(data)}`);
            }
        } else {
            dataObj = data as { id?: string; val?: ioBroker.StateValue; ack?: boolean };
        }

        if (id) {
            let obj = await this.getForeignObjectAsync(id);
            if (!obj) {
                const newId = `${this.namespace}.services.${id}`;
                obj = await this.getForeignObjectAsync(newId);
                if (!obj) {
                    // create state
                    await this.setObjectNotExistsAsync(`services.${id}`, {
                        type: 'state',
                        common: {
                            name: 'IFTTT value',
                            write: false,
                            role: 'state',
                            read: true,
                            type: 'mixed',
                            desc: 'Custom state',
                        },
                        native: {},
                    });
                    id = newId;
                }
            }
        }

        await this.controlState(
            id || null,
            (dataObj as { id?: string; val?: ioBroker.StateValue; ack?: boolean }) || data,
        );
    }

    onDisconnect(event?: string): void {
        const now = Date.now();
        if (now - this.connectStarted < 500) {
            this.log.warn(
                'Looks like your connection certificates are invalid. Please renew them via configuration dialog.',
            );
        }

        if (typeof event === 'string') {
            if (event.toLowerCase().includes('duplicate')) {
                // disable adapter
                this.log.error(
                    `Two devices are trying to connect with the same iot account. This is not allowed. Stopping`,
                );
                void this.getForeignObjectAsync(`system.adapter.${this.namespace}`).then(obj => {
                    if (obj) {
                        obj.common.enabled = false;
                        return this.setForeignObjectAsync(obj._id, obj);
                    }
                });
            }
            this.log.info(`Connection changed: ${event}`);
        } else {
            this.log.info('Connection changed: disconnect');
        }

        if (this.connectedOwn) {
            this.log.info('Connection lost');
            this.connectedOwn = false;
            void this.setState('info.connection', false, true);
        }

        this.remote?.onCloudDisconnect();
    }

    onConnect(clientId: string): void {
        if (!this.connectedOwn) {
            this.log.info(`Connection changed: connect "${clientId}"`);
            this.connectedOwn = true;
            void this.setState('info.connection', this.connectedOwn, true);
            // setTimeout(() => {
            //     device.publish(`response/${clientId}/stateChange`, JSON.stringify({alive: true}), {qos: 0}, (error, result) => {
            //         console.log(`Published alive: ${result}, ${error}`);
            //     });
            // }, 2000);
        } else {
            this.log.info('Connection not changed: was connected');
        }
    }

    encryptOwn(secret: string, value: string): string {
        let result = '';
        for (let i = 0; i < value.length; i++) {
            result += String.fromCharCode(secret[i % secret.length].charCodeAt(0) ^ value.charCodeAt(i));
        }
        return `base64:${Buffer.from(result).toString('base64')}`;
    }

    decryptOwn(secret: string, value: string): string {
        if (value.startsWith('base64:')) {
            try {
                value = Buffer.from(value.substring(7), 'base64').toString('ascii');
            } catch (e) {
                this.log.error(`Cannot decrypt key: ${e}`);
            }
        }

        let result = '';
        for (let i = 0; i < value.length; i++) {
            result += String.fromCharCode(secret[i % secret.length].charCodeAt(0) ^ value.charCodeAt(i));
        }
        return result;
    }

    async readUrlKey(): Promise<{ key: string }> {
        const key = await this.getStateAsync('certs.urlKey');

        if (!key?.val) {
            throw new Error('Not exists');
        } else {
            return { key: key.val as string };
        }
    }

    async createUrlKey(login: string, pass: string): Promise<{ key: string }> {
        this.log.debug('Fetching URL key...');

        let response;
        try {
            response = await axios.get(
                `https://generate-key.iobroker.in/v1/generateUrlKey?user=${encodeURIComponent(login)}&pass=${encodeURIComponent(pass)}&version=${this.version}`,
                {
                    timeout: 15000,
                    validateStatus: status => status < 400,
                },
            );
        } catch (error) {
            if (error.response) {
                if (error.response.status === 401) {
                    this.log.error(`Cannot create URL key because of invalid user or password`);
                }

                throw new Error(error.response.data);
            } else {
                throw error;
            }
        }

        if (response.data && response.data.error) {
            this.log.error(`Cannot fetch URL key: ${JSON.stringify(response.data.error)}`);
            throw new Error(response.data);
        } else if (response.data && response.data.key) {
            await this.setStateAsync('certs.urlKey', response.data.key, true);
            return { key: response.data.key };
        } else {
            this.log.error(`Cannot fetch URL key: ${JSON.stringify(response.data)}`);
            throw new Error(response.data);
        }
    }

    async readCertificates(): Promise<{
        private: string;
        certificate: string;
    }> {
        let privateKey: ioBroker.State | null | undefined;
        let certificate: ioBroker.State | null | undefined;

        try {
            privateKey = await this.getStateAsync('certs.private');
            certificate = await this.getStateAsync('certs.certificate');
        } catch {
            throw new Error('Not exists');
        }

        if (!certificate?.val || !privateKey?.val) {
            throw new Error('Not exists');
        } else {
            return {
                private: this.decryptOwn(this.secret, privateKey.val as string),
                certificate: this.decryptOwn(this.secret, certificate.val as string),
            };
        }
    }

    async writeKeys(data: {
        certificateId: string;
        certificatePem: string;
        keyPair: { PublicKey: string; PrivateKey: string };
    }): Promise<void> {
        await this.setStateAsync('certs.private', this.encryptOwn(this.secret, data.keyPair.PrivateKey), true);
        await this.setStateAsync('certs.public', this.encryptOwn(this.secret, data.keyPair.PublicKey), true);
        await this.setStateAsync('certs.certificate', this.encryptOwn(this.secret, data.certificatePem), true);
        await this.setStateAsync('certs.id', data.certificateId, true);
    }

    async fetchCertificates(
        login: string,
        pass: string,
        _forceUserCreation?: boolean,
    ): Promise<{
        private: string;
        certificate: string;
    }> {
        const state = await this.getStateAsync('certs.forceUserCreate');
        const forceUserCreation = state?.val;

        if (forceUserCreation) {
            await this.setStateAsync('certs.forceUserCreate', false, true);
        }

        this.log.debug('Fetching certificates...');
        let response;
        try {
            response = await axios.get(
                `https://create-user.iobroker.in/v1/createUser?user=${encodeURIComponent(login)}&pass=${encodeURIComponent(pass)}&forceRecreate=${forceUserCreation}&version=${this.version}`,
                {
                    timeout: 15000,
                    validateStatus: status => status < 400,
                },
            );
        } catch (error) {
            if (error.response) {
                if (error.response.status === 401) {
                    this.log.error(`Cannot fetch connection certificates because of invalid user or password`);
                } else {
                    this.log.error(`Cannot fetch connection certificates: ${JSON.stringify(error.response.data)}`);
                }
                throw new Error(error.response.data);
            } else {
                this.log.error(`Cannot fetch connection certificates: ${JSON.stringify(error.code)}`);
                throw error;
            }
        }

        if (response?.data?.certificates) {
            const awsCertificates: {
                certificateId: string;
                certificatePem: string;
                keyPair: { PublicKey: string; PrivateKey: string };
            } = response.data.certificates;
            await this.writeKeys(awsCertificates);

            return {
                private: awsCertificates.keyPair.PrivateKey,
                certificate: awsCertificates.certificatePem,
            };
        }
        this.log.error(`Cannot fetch connection certificates: ${JSON.stringify(response.data)}`);
        throw new Error(response.data);
    }

    async processMessage(
        type: string,
        request: any,
    ): Promise<{ error?: string; result?: string } | string | SOCKET_MESSAGE | SOCKET_TRUNK[] | AlexaCustomResponse> {
        if (request instanceof Buffer) {
            request = request.toString();
        }

        if (!request || !type) {
            this.log.debug(`Invalid request: ${JSON.stringify(request)}`);
            return { error: 'invalid request' };
        }

        if (type.startsWith('remote')) {
            const start = Date.now();

            this.log.debug(`Remote request: ${JSON.stringify(request)}`);

            if (this.remote) {
                return this.remote
                    .process(request, type as `remote${string}`)
                    .then(response => {
                        if (response !== NONE) {
                            this.log.debug(
                                `[REMOTE] Response in: ${Date.now() - start}ms (Length: ${Array.isArray(response) ? `A ${response.length}` : JSON.stringify(response).length}) for ${request}`,
                            );
                        }
                        return response;
                    })
                    .catch(err => {
                        this.log.error(`Error in processing of remote request: ${err.toString()}`);
                        return NONE;
                    });
            }
            this.log.error(`Received command, but remote already closed.`);
        } else if (type.startsWith('nightscout')) {
            this.log.debug(`Nightscout request: ${JSON.stringify(request)}`);
            if (this.config.nightscout) {
                const state = await this.getForeignStateAsync(
                    `system.adapter.nightscout.${this.config.nightscout}.alive`,
                );
                if (state?.val) {
                    return this.sendToAsync(`nightscout.${this.config.nightscout}`, 'send', request) as {
                        error?: string;
                        result?: string;
                    };
                }
                return { error: `nightscout.${this.config.nightscout} is offline` };
            }
            return { error: 'Service is disabled' };
        } else if (type.startsWith('alexa')) {
            if (typeof request === 'string') {
                try {
                    request = JSON.parse(request);
                } catch {
                    this.log.error(`Cannot parse request: ${JSON.stringify(request)}`);
                    return { error: 'Cannot parse request' };
                }
            }

            const printRequest = JSON.parse(JSON.stringify(request));
            if (printRequest.directive?.header?.correlationToken) {
                printRequest.directive.header.correlationToken = '***';
            }
            if (printRequest.directive?.endpoint?.scope?.token) {
                printRequest.directive.endpoint.scope.token = '***';
            }
            this.log.debug(`${Date.now()} ALEXA: ${JSON.stringify(printRequest)}`);

            if (request?.directive) {
                if (this.alexaSH3) {
                    try {
                        const response = await this.alexaSH3.process(request);
                        if (request.directive.header.messageId != response.event!.header.messageId) {
                            throw new Error('Incoming and outgoing header message IDs are not equal!');
                        }
                        return response as any;
                    } catch {
                        this.log.error(`Cannot parse request: ${request}`);
                    }
                }
                return { error: 'Service is disabled' };
            } else if (request?.error) {
                // answer from alexa3 events cloud actually just show it in log
                if (request.error.includes('You have no iobroker.iot license')) {
                    // pause for 30 minutes send of the events
                    this.alexaSH3?.pauseEvents();
                }
                this.log.error(`Error from Alexa events cloud: ${request.error}`);
            } else if (request && !request.header) {
                if (this.alexaCustom) {
                    return this.alexaCustom.process(request, this.config.amazonCustom);
                }
                return { error: 'Service is disabled' };
            } else {
                if (this.alexaSH2) {
                    return this.alexaSH2.process(request, this.config.amazonAlexa) as any;
                }
                return { error: 'Service is disabled' };
            }
        } else if (type.startsWith('ifttt')) {
            try {
                if (typeof request === 'object') {
                    request = JSON.stringify(request);
                } else {
                    request = request.toString();
                }
            } catch {
                this.log.error(`Cannot parse request: ${request}`);
                return { error: 'Cannot parse request' };
            }
            this.log.debug(`IFTTT request: ${JSON.stringify(request)}`);

            await this.processIfttt(request);
            return NONE;
        } else if (type.startsWith('ghome')) {
            if (typeof request === 'string') {
                try {
                    request = JSON.parse(request);
                } catch {
                    this.log.error(`Cannot parse request: ${request}`);
                    return { error: 'Cannot parse request' };
                }
            }
            this.log.debug(`[GHOME] request: ${JSON.stringify(request)}`);

            if (this.googleHome) {
                return this.googleHome.process(request, this.config.googleHome);
            }
            return { error: 'Service is disabled' };
        } else if (type.startsWith('alisa')) {
            if (typeof request === 'string') {
                try {
                    request = JSON.parse(request);
                } catch {
                    this.log.error(`Cannot parse request: ${request}`);
                    return { error: 'Cannot parse request' };
                }
            }
            this.log.debug(`[ALISA] request: ${JSON.stringify(request)}`);

            this.log.debug(`${Date.now()} ALISA: ${JSON.stringify(request)}`);
            if (this.yandexAlisa) {
                return this.yandexAlisa.process(request, this.config.yandexAlisa) as any;
            }
            return { error: 'Service is disabled' };
        } else {
            let isCustom = false;
            let _type = type;
            if (_type.startsWith('custom_')) {
                _type = _type.substring(7);
                isCustom = true;
            }
            if (_type === 'visu') {
                this.log.debug(`Received visu command: ${JSON.stringify(request)}`);
                if (typeof request === 'object') {
                    request = JSON.stringify(request);
                } else {
                    request = request.toString();
                }

                try {
                    const visuData = JSON.parse(request);

                    if (visuData.presence) {
                        await handleGeofenceData(visuData, this);
                    }

                    if (visuData.devices) {
                        await handleDevicesData(visuData, this);
                    }

                    if (visuData.command === 'getInstances') {
                        const res = await handleGetInstances(visuData, this);
                        return { result: 'Ok', ...res };
                    }

                    if (visuData.command === 'sendToAdapter') {
                        return await handleSendToAdapter(visuData, this);
                    }
                } catch (e) {
                    this.log.error(`Could not handle data "${request}" by Visu App: ${e.message}`);
                    return { error: e.message };
                }

                return { result: 'Ok' };
            } else if (
                this.config.allowedServices[0] === '*' ||
                this.config.allowedServices.includes(_type) ||
                ALLOWED_SERVICES.includes(_type)
            ) {
                if (typeof request === 'object') {
                    request = JSON.stringify(request);
                } else {
                    request = request.toString();
                }
                this.log.debug(`Custom request: ${JSON.stringify(request)}`);

                if (SPECIAL_ADAPTERS.includes(_type)) {
                    try {
                        await this.setStateAsync(`services.${_type}`, request, true);
                    } catch (err) {
                        return { result: err };
                    }

                    return { result: 'Ok' };
                } else if (type.startsWith('text2command')) {
                    if (this.config.text2command !== undefined && (this.config.text2command as string) !== '') {
                        try {
                            await this.setForeignStateAsync(`text2command.${this.config.text2command}.text`, request);
                        } catch (err) {
                            return { result: err };
                        }
                        return { result: 'Ok' };
                    }
                    this.log.warn('Received service text2command, but instance is not defined');
                    return { result: 'but instance is not defined' };
                } else if (type.startsWith('simpleApi')) {
                    return { result: 'not implemented' };
                } else if (isCustom) {
                    let obj;
                    try {
                        obj = await this.getObjectAsync(`services.custom_${_type}`);
                    } catch (e) {
                        this.log.error(`Cannot get object services.custom_${_type}: ${e}`);
                    }

                    if (!obj) {
                        try {
                            await this.setObjectNotExistsAsync(`services.custom_${_type}`, {
                                _id: `${this.namespace}.services.custom_${_type}`,
                                type: 'state',
                                common: {
                                    name: `Service for ${_type}`,
                                    write: false,
                                    read: true,
                                    type: 'mixed',
                                    role: 'value',
                                },
                                native: {},
                            });
                            await this.setStateAsync(`services.custom_${_type}`, request, true);
                        } catch (err) {
                            this.log.error(`Cannot control .services.custom_${_type}: ${JSON.stringify(err)}`);
                            return { error: err };
                        }
                    } else {
                        await this.setStateAsync(`services.custom_${_type}`, request, true);
                        return { result: 'Ok' };
                    }
                } else {
                    this.log.warn(`Received service "${type}", but it is not allowed`);
                    return { error: 'not allowed' };
                }
            } else {
                this.log.warn(`Received service "${type}", but it is not found in whitelist`);
                return { error: 'Unknown service' };
            }
        }

        this.log.warn(`Received message of unknown type: ${type}`);
        return { error: 'Unknown message type' };
    }

    closeDevice(): Promise<void> {
        return new Promise<void>(resolve => {
            if (this.device) {
                try {
                    this.device.end(true, () => {
                        this.device = null;
                        resolve();
                    });
                } catch {
                    this.device = null;
                    resolve();
                }
            } else {
                resolve();
            }
        });
    }

    async startDevice(clientId: string, login: string, password: string, retry?: number): Promise<void> {
        retry ||= 0;
        let certs:
            | {
                  private: string;
                  certificate: string;
              }
            | undefined;

        try {
            certs = await this.readCertificates();
        } catch (error) {
            if (error.message === 'Not exists') {
                try {
                    certs = await this.fetchCertificates(login, password);
                } catch {
                    // ignore
                }
            } else {
                throw error;
            }
        }

        // destroy the old device
        await this.closeDevice();

        if (!certs) {
            return this.log.error(`Cannot read connection certificates`);
        }

        try {
            this.connectStarted = Date.now();
            this.device = new DeviceModule({
                privateKey: Buffer.from(certs.private),
                clientCert: Buffer.from(certs.certificate),
                caCert: readFileSync(`${__dirname}/../keys/root-CA.crt`),
                clientId,
                username: 'ioBroker',
                host: this.config.cloudUrl,
                debug: !!this.config.debug,
                baseReconnectTimeMs: 5000,
                keepalive: 60,
            });
            this.remote?.registerDevice(this.device);

            this.device.subscribe(`command/${clientId}/#`);
            this.device.on('connect', () => this.onConnect(clientId));
            this.device.on('close', (): void => this.onDisconnect());
            this.device.on('reconnect', () => this.log.debug('reconnect'));
            this.device.on('offline', () => this.log.debug('offline'));
            this.device.on('error', error => {
                const errorTxt =
                    ((error as Error)?.message && JSON.stringify((error as Error).message)) || JSON.stringify(error);
                this.log.error(`Error by device connection: ${errorTxt}`);

                // restart the iot device if DNS cannot be resolved
                if (errorTxt.includes('EAI_AGAIN')) {
                    this.log.error(
                        `DNS name of ${this.config.cloudUrl} cannot be resolved: connection will be retried in 10 seconds.`,
                    );
                    setTimeout(() => this.startDevice(clientId, login, password), 10000);
                }
            });

            this.device.on('message', async (topic: string, request: string | Buffer): Promise<void> => {
                this.log.debug(`Request ${topic}`);
                if (topic.startsWith(`command/${clientId}/`)) {
                    const type = topic.substring(clientId.length + 9); // 9 === 'command//'.length

                    try {
                        const response = await this.processMessage(type, request);

                        if (this.common!.loglevel === 'debug' && !type.startsWith('remote')) {
                            this.log.debug(`Response: ${JSON.stringify(response)}`);
                        }

                        if (this.device && response !== NONE) {
                            // It is a big file - send in trunks
                            if (Array.isArray(response)) {
                                try {
                                    for (let m = 0; m < response.length; m++) {
                                        const trunk = response[m];
                                        await new Promise<void>((resolve, reject) =>
                                            this.device!.publish(
                                                `response/${clientId}/${type}`,
                                                typeof trunk !== 'string' ? JSON.stringify(trunk) : trunk,
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
                                    this.log.error(`[REMOTE] Cannot send packet: ${err}`);
                                }
                            } else {
                                const printResponse = JSON.parse(JSON.stringify(response));
                                if (printResponse?.event?.header?.correlationToken) {
                                    printResponse.event.header.correlationToken = '***';
                                }
                                if (printResponse?.event?.endpoint?.scope?.token) {
                                    printResponse.event.endpoint.scope.token = '***';
                                }
                                this.log.debug(
                                    `[REMOTE] Response to 'response/${clientId}/${type}: ${JSON.stringify(
                                        printResponse,
                                    )}`,
                                );

                                const msg = JSON.stringify(response);
                                if (msg && msg.length > MAX_IOT_MESSAGE_LENGTH) {
                                    const packed = deflateSync(msg).toString('base64');
                                    this.log.debug(
                                        `[REMOTE] Content was packed from ${msg.length} bytes to ${packed.length} bytes`,
                                    );
                                    if (packed.length > MAX_IOT_MESSAGE_LENGTH) {
                                        this.log.warn(
                                            `[REMOTE] Content was packed to ${packed.length} bytes which is still near/over the message limit!`,
                                        );
                                    }
                                    this.device.publish(`response/${clientId}/${type}`, packed);
                                } else {
                                    // console.log(`Publish to "response/${clientId}/${type}": ${msg}`);
                                    this.device.publish(`response/${clientId}/${type}`, msg);
                                }
                            }
                        }
                    } catch (error) {
                        this.log.debug(`Error processing request ${topic}`);
                        this.log.debug(`${error}`);
                    }
                }
            });
        } catch (error) {
            if (error && typeof error === 'object' && error.message) {
                this.log.error(`Cannot read connection certificates: ${error.message}`);
            } else {
                this.log.error(
                    `Cannot read connection certificates: ${JSON.stringify(error)} / ${error && error.toString()}`,
                );
            }

            if ((error === 'timeout' || error.message?.includes('timeout')) && retry < 10) {
                setTimeout(() => this.startDevice(clientId, login, password, retry + 1), 10000);
            }
        }
    }

    async updateNightscoutSecret(): Promise<void> {
        if (!this.config.nightscout) {
            return;
        }

        const email = this.config.login.replace(/[^\w\d-_]/g, '_');
        const secret = this.config.nightscoutPass;
        const apiSecret = email + (secret ? `-${secret}` : '');
        const URL = `https://generate-key.iobroker.in/v1/generateUrlKey?user=${encodeURIComponent(this.config.login)}&pass=${encodeURIComponent(this.config.pass)}&apisecret=${encodeURIComponent(apiSecret)}`;
        let response;

        try {
            response = await axios.get(URL, {
                timeout: 15000,
                validateStatus: status => status < 400,
            });
            if (response.data.error) {
                this.log.error(`Api-Secret cannot be updated: ${response.data.error}`);
            } else {
                this.log.debug(`Api-Secret updated: ${JSON.stringify(response.data)}`);
            }
        } catch (error) {
            if (error.response) {
                this.log.warn(
                    `Cannot update api-secret: ${error.response.data ? JSON.stringify(error.response.data) : error.response.status}`,
                );
            } else {
                this.log.warn(`Cannot update api-secret: ${error.code}`);
            }
        }
    }

    async createStateForAdapter(adapterName: string): Promise<void> {
        // find any instance of this adapter
        const instances = await this.getObjectViewAsync('system', 'instance', {
            startkey: `system.adapter.${adapterName}.`,
            endkey: `system.adapter.${adapterName}.\u9999`,
        });
        if (instances?.rows?.length) {
            let obj;
            try {
                obj = await this.getObjectAsync(`service.${adapterName}`);
            } catch {
                // ignore
            }
            if (!obj) {
                try {
                    await this.setForeignObjectAsync(`${this.namespace}.services.${adapterName}`, {
                        type: 'state',
                        common: {
                            name: `Service for ${adapterName}`,
                            write: false,
                            read: true,
                            type: 'mixed',
                            role: 'value',
                        },
                        native: {},
                    });
                } catch {
                    // ignore
                }
            }
        } else {
            try {
                // delete if object exists
                const obj = await this.getObjectAsync(`service.${adapterName}`);
                if (obj) {
                    await this.delObjectAsync(`service.${adapterName}`);
                }
            } catch {
                // ignore
            }
        }
    }

    async syncServiceStates(): Promise<void> {
        const states = await this.getObjectViewAsync('system', 'state', {
            startkey: `${this.namespace}.services.`,
            endkey: `${this.namespace}.services.\u9999`,
        });
        // Create new states
        for (let s = 0; s < this.config.allowedServices.length; s++) {
            const type = this.config.allowedServices[s];
            if (type !== '*' && !states.rows.find(st => st.id === `${this.namespace}.services.custom_${type}`)) {
                await this.setObjectNotExistsAsync(`services.custom_${type}`, {
                    _id: `${this.namespace}.services.custom_${type}`,
                    type: 'state',
                    common: {
                        name: `Service for ${type}`,
                        write: false,
                        read: true,
                        type: 'mixed',
                        role: 'value',
                    },
                    native: {},
                });
            }
        }

        // delete all service states
        for (let s = 0; s < (states?.rows?.length || 0); s++) {
            const id = states.rows[s].id;
            if (id.startsWith(`${this.namespace}.services.custom_`)) {
                const stateId = id.substring(`${this.namespace}.services.custom_`.length);
                if (!this.config.allowedServices.includes(stateId)) {
                    await this.delStateAsync(id);
                }
            }
        }
    }

    async main(): Promise<void> {
        if (this.config.googleHome === undefined) {
            this.config.googleHome = false;
        }

        if (this.config.amazonAlexa === undefined) {
            this.config.amazonAlexa = true;
        }

        if (this.config.yandexAlisa === undefined) {
            this.config.yandexAlisa = false;
        }

        // Workaround for amazonCustom
        if (this.config.amazonCustom === undefined) {
            // get current config
            const obj = await this.getForeignObjectAsync(`system.adapter.${this.namespace}`);
            if (obj) {
                this.log.info(
                    `Migrating amazonCustom configuration to ${this.config.amazonAlexa || this.config.amazonAlexaV3}`,
                );
                obj.native.amazonCustom = !!(this.config.amazonAlexa || this.config.amazonAlexaV3);
                await this.setForeignObjectAsync(`system.adapter.${this.namespace}`, obj);
                return;
            }
        }

        this.config.pingTimeout = parseInt(this.config.pingTimeout as string, 10) || 5000;

        if (this.config.pingTimeout < 3000) {
            this.config.pingTimeout = 3000;
        }

        if (this.config.deviceOffLevel === undefined) {
            this.config.deviceOffLevel = 30;
        }

        if (this.config.login !== (this.config.login || '').trim().toLowerCase()) {
            this.log.error('Please write your login only in lowercase!');
        }
        if (!this.config.login || !this.config.pass) {
            return this.log.error('No cloud credentials found. Please get one on https://iobroker.pro');
        }

        let systemConfig = await this.getForeignObjectAsync('system.config');
        if (!systemConfig) {
            this.log.warn('Object system.config not found. Please check your installation!');
            systemConfig = { common: {} } as ioBroker.SystemConfigObject;
        }

        // create service state for netatmo if any instance exists
        for (let a = 0; a < SPECIAL_ADAPTERS.length; a++) {
            await this.createStateForAdapter(SPECIAL_ADAPTERS[a]);
        }

        this.secret = systemConfig?.native?.secret || 'Zgfr56gFe87jJOM';

        this.config.pass = this.decryptOwn(this.secret, this.config.pass);
        this.config.deviceOffLevel = parseFloat(this.config.deviceOffLevel as string) || 0;
        this.config.concatWord = (this.config.concatWord || '').toString().trim();
        this.config.apikey = (this.config.apikey || '').trim();
        this.config.replaces = this.config.replaces ? (this.config.replaces as string).split(',') : null;
        this.config.cloudUrl = (this.config.cloudUrl || '').toString();
        this.config.nightscout = this.config.nightscout || '';

        if (this.config.replaces) {
            const text: string[] = [];
            for (let r = 0; r < this.config.replaces.length; r++) {
                text.push(`"${this.config.replaces[r]}"`);
            }
            this.log.debug(`Following strings will be replaced in names: ${text.join(', ')}`);
        }
        if (this.config.yandexAlisa) {
            this.yandexAlisa = new YandexAlisa(this);
        }

        this.remote = new Remote(this, this.config.login.replace(/[^-_:a-zA-Z1-9]/g, '_'));

        this.config.allowedServices = ((this.config.allowedServices as string) || '')
            .split(/[,\s]+/)
            .map(s => s.trim())
            .filter(s => s);

        await this.syncServiceStates();

        await this.setStateAsync('info.connection', false, true);
        this.config.cloudUrl = this.config.cloudUrl || 'a18wym7vjdl22g.iot.eu-west-1.amazonaws.com';

        if (!this.config.login || !this.config.pass) {
            return this.log.error('No cloud credentials found. Please get one on https://iobroker.pro');
        }

        if (this.config.iftttKey) {
            await this.subscribeStatesAsync('services.ifttt');
            // create ifttt object
            const iftttObj = await this.getObjectAsync('.services.ifttt');
            if (!iftttObj) {
                await this.setObjectNotExistsAsync('services.ifttt', {
                    _id: `${this.namespace}.services.ifttt`,
                    type: 'state',
                    common: {
                        name: 'IFTTT value',
                        write: true,
                        role: 'state',
                        read: true,
                        type: 'mixed',
                        desc: 'All written data will be sent to IFTTT. If no state specified all requests from IFTTT will be saved here',
                    },
                    native: {},
                });
            }
        }

        // detect netatmo creation
        await this.subscribeForeignObjectsAsync('system.adapter.*');

        await this.subscribeStatesAsync('smart.*');

        this.log.info(`Connecting with ${this.config.cloudUrl}`);

        if (this.config.language) {
            this.translate = true;
            this.lang = this.config.language;
        } else {
            this.lang = systemConfig.common.language;
        }

        if (this.lang !== 'en' && this.lang !== 'de' && this.lang !== 'ru') {
            this.lang = 'en';
        }

        if (this.config.amazonAlexa) {
            this.alexaSH2 = new AlexaSH2(this);
            this.alexaSH2.setLanguage(this.lang, this.translate);
            this.alexaSH2.updateDevices();
        } else {
            // Check that update result is empty
            const state = await this.getStateAsync('smart.updatesResult');
            if (state?.val) {
                await this.setStateAsync('smart.updatesResult', '', true);
            }
        }

        this.remote?.setLanguage(this.lang);
        // check password
        if (
            this.config.pass.length < 8 ||
            !this.config.pass.match(/[a-z]/) ||
            !this.config.pass.match(/[A-Z]/) ||
            !this.config.pass.match(/\d/)
        ) {
            return this.log.error(
                'The password must be at least 8 characters long and have numbers, upper and lower case letters. Please change the password in the profile https://iobroker.pro/accountProfile.',
            );
        }

        await this.updateNightscoutSecret();

        const iotClientId = this.config.login.replace(/[^-_:a-zA-Z1-9]/g, '_');
        // user will be created here
        await this.startDevice(iotClientId, this.config.login, this.config.pass);

        // after the user created, we can try to generate URL key
        // read URL keys from server
        try {
            this.urlKey = await this.readUrlKey();
        } catch {
            if (
                this.config.googleHome ||
                this.config.yandexAlisa ||
                this.config.allowedServices.length ||
                this.config.iftttKey
            ) {
                try {
                    this.urlKey = await this.createUrlKey(this.config.login, this.config.pass);
                } catch (err) {
                    return this.log.error(
                        `Cannot read URL key: ${typeof err === 'object' ? JSON.stringify(err) : err}`,
                    );
                }
            }
        }

        if (this.config.amazonAlexaV3) {
            this.alexaSH3 = new AlexaSH3({
                adapter: this,
                iotClientId,
                iotDevice: this.device!,
            });
            this.alexaSH3.setLanguage(this.lang);
            await this.alexaSH3.updateDevices();
        } else {
            // Check that update result is empty
            const state = await this.getStateAsync('smart.updates3');
            if (state?.val) {
                await this.setStateAsync('smart.updates3', '', true);
            }
        }

        if (this.config.amazonCustom) {
            this.alexaCustom = new AlexaCustom(this);
            this.alexaCustom.setLanguage(this.lang);
        }

        if (this.config.googleHome) {
            this.googleHome = new GoogleHome(this, this.urlKey);
        } else {
            // Check that update result is empty
            const state = await this.getStateAsync('smart.updatesGH');
            if (state?.val) {
                await this.setStateAsync('smart.updatesGH', '', true);
            }
        }
        if (this.config.yandexAlisa) {
            this.yandexAlisa = new YandexAlisa(this, this.urlKey);
        } else {
            // Check that update result is empty
            const state = await this.getStateAsync('smart.updatesYA');
            if (state?.val) {
                await this.setStateAsync('smart.updatesYA', '', true);
            }
        }

        this.googleHome?.setLanguage(this.lang);
        this.googleHome?.updateDevices();

        this.yandexAlisa?.setLanguage(this.lang);
        this.yandexAlisa?.updateDevices();

        await this.subscribeStatesAsync('app.message');
    }
}

if (require.main !== module) {
    // Export the constructor in compact mode
    module.exports = (options: Partial<AdapterOptions> | undefined) => new IotAdapter(options);
} else {
    // otherwise start the instance directly
    (() => new IotAdapter())();
}
