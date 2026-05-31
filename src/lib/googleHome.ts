import axios from 'axios';
import ChannelDetector, { Types, type DetectOptions, type PatternControl } from '@iobroker/type-detector';

import textsT from './texts';
import roomsT from './rooms';
import funcsT from './functions';
import type { IotAdapterConfig } from './types';

const PROTOCOL_VERSION = 1;
const RETRY_UNKNOWN_DEVICES_INTERVAL = 10 * 60000; // 10 minutes

interface TraitDefinition {
    command: string;
    getter?: string;
    defaultAttributes: string;
}

const traitEnum: Record<string, TraitDefinition> = {
    'action.devices.traits.ArmDisarm': {
        command: 'arm',
        defaultAttributes: `{
            "availableArmLevels": {
              "levels": [
                {
                  "level_name": "L1",
                  "level_values": [
                    {
                      "level_synonym": [
                        "home and guarding",
                        "SL1"
                      ],
                      "lang": "en"
                    },
                    {
                      "level_synonym": [
                        "zuhause und bewachen",
                        "SL1"
                      ],
                      "lang": "de"
                    },
                    {
                      "level_synonym": [
                        "дома и охрана",
                        "SL1"
                      ],
                      "lang": "ru"
                    }
                  ]
                },
                {
                  "level_name": "L2",
                  "level_values": [
                    {
                      "level_synonym": [
                        "away and guarding",
                        "SL2"
                      ],
                      "lang": "en"
                    },
                    {
                      "level_synonym": [
                        "weg und bewachen",
                        "SL2"
                      ],
                      "lang": "de"
                    },
                    {
                      "level_synonym": [
                        "все ушли и охрана",
                        "SL2"
                      ],
                      "lang": "ru"
                    }
                  ]
                }
              ],
              "ordered": true
            }
          }`,
    },
    'action.devices.traits.Brightness': {
        command: 'brightness',
        defaultAttributes: '{}',
    },
    'action.devices.traits.CameraStream': {
        command: 'cameraStream',
        defaultAttributes: `{
            "cameraStreamSupportedProtocols": [
              "hls",
              "dash"
            ],
            "cameraStreamNeedAuthToken": true,
            "cameraStreamNeedDrmEncryption": false
          }`,
    },
    'action.devices.traits.ColorSetting_temperature': {
        command: 'color_temperature',
        defaultAttributes: `{
            "colorModel": "rgb",
            "colorTemperatureRange": {
              "temperatureMinK": 2000,
              "temperatureMaxK": 9000
            },
            "commandOnlyColorSetting": false
          }`,
    },
    'action.devices.traits.ColorSetting_spectrumRGB': {
        command: 'color_spectrumRGB',
        defaultAttributes: `{
            "colorModel": "rgb",
            "colorTemperatureRange": {
              "temperatureMinK": 2000,
              "temperatureMaxK": 9000
            },
            "commandOnlyColorSetting": false
          }`,
    },
    'action.devices.traits.Dock': {
        command: 'command',
        defaultAttributes: '{}',
    },
    'action.devices.traits.FanSpeed': {
        command: 'fanSpeed',
        getter: 'currentFanSpeedSetting',
        defaultAttributes: `{
            "availableFanSpeeds": {
              "speeds": [
                {
                  "speed_name": "S1",
                  "speed_values": [
                    {
                      "speed_synonym": [
                        "low",
                        "slow"
                      ],
                      "lang": "en"
                    },
                    {
                      "speed_synonym": [
                        "niedrig",
                        "schwach"
                      ],
                      "lang": "de"
                    },
                    {
                      "speed_synonym": [
                        "медленно",
                        "тихо"
                      ],
                      "lang": "ru"
                    }
                  ]
                },
                {
                  "speed_name": "S2",
                  "speed_values": [
                    {
                      "speed_synonym": [
                        "high",
                        "speed"
                      ],
                      "lang": "en"
                    },
                    {
                      "speed_synonym": [
                        "schnell",
                        "stark"
                      ],
                      "lang": "de"
                    },
                    {
                      "speed_synonym": [
                        "быстро",
                        "сильно"
                      ],
                      "lang": "ru"
                    }
                  ]
                }
              ],
              "ordered": true
            },
            "reversible": false
          }`,
    },
    'action.devices.traits.LightEffects': {
        command: 'effect',
        getter: 'activeLightEffect',
        defaultAttributes: `{
            "supportedEffects": [
              "colorLoop"
            ]
          }`,
    },
    'action.devices.traits.Locator': {
        command: 'silent',
        defaultAttributes: '{}',
    },
    'action.devices.traits.LockUnlock': {
        command: 'lock',
        getter: 'isLocked',
        defaultAttributes: '{}',
    },
    'action.devices.traits.MediaState': {
        command: 'mediastate',
        defaultAttributes: `{
            "supportActivityState": true,
            "supportPlaybackState": true
          }`,
    },
    'action.devices.traits.Modes': {
        command: 'updateModeSettings',
        getter: 'currentModeSettings',
        defaultAttributes: `{
            "availableModes": [
              {
                "name": "load_mode",
                "name_values": [
                  {
                    "name_synonym": [
                      "load",
                      "size",
                      "load size"
                    ],
                    "lang": "en"
                  }
                ],
                "settings": [
                  {
                    "setting_name": "small_load",
                    "setting_values": [
                      {
                        "setting_synonym": [
                          "small",
                          "half"
                        ],
                        "lang": "en"
                      }
                    ]
                  },
                  {
                    "setting_name": "medium_load",
                    "setting_values": [
                      {
                        "setting_synonym": [
                          "medium",
                          "normal"
                        ],
                        "lang": "en"
                      }
                    ]
                  },
                  {
                    "setting_name": "large_load",
                    "setting_values": [
                      {
                        "setting_synonym": [
                          "large",
                          "full"
                        ],
                        "lang": "en"
                      }
                    ]
                  }
                ],
                "ordered": true
              }
            ]
          }`,
    },
    'action.devices.traits.OnOff': {
        command: 'on',
        defaultAttributes: '{}',
    },
    'action.devices.traits.OpenClose': {
        command: 'openPercent',
        defaultAttributes: `{
            "openDirection": [
              "UP",
              "DOWN"
            ],
            "discreteOnlyOpenClose": true,
            "queryOnlyOpenClose": false
          }`,
    },
    'action.devices.traits.Reboot': {
        command: 'reboot',
        defaultAttributes: '{}',
    },
    'action.devices.traits.RunCycle': {
        command: 'runCycle',
        defaultAttributes: '{}',
    },
    'action.devices.traits.Scene': {
        command: 'ActivateScene',
        defaultAttributes: `{
            "sceneReversible": true
          }`,
    },
    'action.devices.traits.SoftwareUpdate': {
        command: 'softwareUpdate',
        defaultAttributes: '{}',
    },
    'action.devices.traits.StartStop': {
        command: 'start',
        defaultAttributes: `{
            "pausable":true
          }`,
    },
    'action.devices.traits.TemperatureControl': {
        command: 'temperature',
        getter: 'temperatureAmbientCelsius',
        defaultAttributes: `{
            "temperatureRange": {
              "minThresholdCelsius": -100,
              "maxThresholdCelsius": 100
            },
            "temperatureStepCelsius": 1,
            "temperatureUnitForUX": "C",
            "commandOnlyTemperatureControl": false,
            "queryOnlyTemperatureControl": true
          }`,
    },
    'action.devices.traits.TemperatureSetting_thermostatTemperatureSetpoint': {
        command: 'thermostatTemperatureSetpoint',
        defaultAttributes: `{
            "availableThermostatModes": "off,heat,cool,on",
            "thermostatTemperatureUnit": "C"
          }`,
    },
    'action.devices.traits.TemperatureSetting_thermostatTemperatureAmbient': {
        command: 'thermostatTemperatureAmbient',
        defaultAttributes: `{
            "queryOnlyTemperatureSetting": true,
            "thermostatTemperatureUnit": "C"
          }`,
    },
    'action.devices.traits.TemperatureSetting_thermostatHumidityAmbient': {
        command: 'thermostatHumidityAmbient',
        defaultAttributes: `{
            "queryOnlyTemperatureSetting": true,
            "thermostatTemperatureUnit": "C"
          }`,
    },
    'action.devices.traits.Timer': {
        command: 'timerStart',
        defaultAttributes: `{
            "maxTimerLimitSec": 3600,
            "commandOnlyTimer": false
          }`,
    },
    'action.devices.traits.Toggles': {
        command: 'updateToggleSettings',
        getter: 'currentToggleSettings',
        defaultAttributes: `{
            "availableToggles": [
              {
                "name": "sterilization",
                "name_values": [
                  {
                    "name_synonym": [
                      "bio-clean",
                      "ultrasound"
                    ],
                    "lang": "en"
                  }
                ]
              },
              {
                "name": "energysaving",
                "name_values": [
                  {
                    "name_synonym": [
                      "normal",
                      "saver"
                    ],
                    "lang": "en"
                  }
                ]
              }
            ]
          }`,
    },
    'action.devices.traits.Volume': {
        command: 'volumeLevel',
        getter: 'currentVolume',
        defaultAttributes: `{
            "volumeMaxLevel": 11,
            "volumeCanMuteAndUnmute": true
          }`,
    },
};

const customToTraitEnum: Record<string, string> = {
    on: 'action.devices.traits.OnOff',
    openClose: 'action.devices.traits.OpenClose',
    openDirection: 'action.devices.traits.OpenClose',
    openPercent: 'action.devices.traits.OpenClose',
    isLocked: 'action.devices.traits.LockUnlock',
    brightness: 'action.devices.traits.Brightness',
    thermostatTemperatureSetpoint: 'action.devices.traits.TemperatureSetting_thermostatTemperatureSetpoint',
    thermostatTemperatureAmbient: 'action.devices.traits.TemperatureSetting_thermostatTemperatureAmbient',
    thermostatHumidityAmbient: 'action.devices.traits.TemperatureSetting_thermostatHumidityAmbient',
    color_spectrumRGB: 'action.devices.traits.ColorSetting_spectrumRGB',
    color_hue: 'action.devices.traits.ColorSetting_spectrumRGB',
    color_saturation: 'action.devices.traits.ColorSetting_spectrumRGB',
    color_temperature: 'action.devices.traits.ColorSetting_temperature',
};

const URL_STATUS = 'https://gstatus.iobroker.in/v1/googleHomeStatus';

const ignoreIds: RegExp[] = [/^system\./, /^script\./];

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type IoBObject = ioBroker.Object;
type Adapter = ioBroker.Adapter;

// SmartName as it appears in obj.common.smartName (mirrors ioBroker.SmartName plus optional Google-specific fields).
type SmartName = ioBroker.SmartName | undefined;
interface SmartNameObject {
    // Language → translated friendly name. Allow undefined for partially-populated objects.
    [lang: string]: string | undefined | boolean | string[];
    smartType?: string;
    ghType?: string;
    ghTraits?: string[];
    ghAttributes?: string;
    ghConv2GH?: string;
    ghConv2iob?: string;
}

interface GHDeviceName {
    defaultNames?: string[];
    name?: string;
    nicknames?: string[];
}

interface GHDeviceInfo {
    manufacturer: string;
    model: string;
}

// Trait-specific attribute schemas (flat union — all fields optional).
// See https://developers.home.google.com/cloud-to-cloud/traits
interface GHAttributes {
    // OnOff
    commandOnlyOnOff?: boolean;
    queryOnlyOnOff?: boolean;
    // Brightness
    commandOnlyBrightness?: boolean;
    // ColorSetting
    colorModel?: 'rgb' | 'hsv';
    colorTemperatureRange?: { temperatureMinK: number; temperatureMaxK: number };
    commandOnlyColorSetting?: boolean;
    // OpenClose
    queryOnlyOpenClose?: boolean;
    discreteOnlyOpenClose?: boolean;
    openDirection?: ('UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'IN' | 'OUT')[];
    // TemperatureSetting
    availableThermostatModes?: string;
    thermostatTemperatureUnit?: 'C' | 'F';
    queryOnlyTemperatureSetting?: boolean;
}

interface GHDevice {
    id: string;
    type?: string;
    traits: string[];
    displayTraits?: string[];
    attributes?: GHAttributes;
    displayAttributes?: string;
    name?: GHDeviceName;
    willReportState?: boolean;
    roomHint?: string;
    deviceInfo?: GHDeviceInfo;
    customData: Record<string, string | undefined>;
    smartEnum?: string;
    ioType?: string;
    parentId?: string;
    conv2GH?: Record<string, string>;
    displayConv2GH?: string;
    conv2iob?: Record<string, string>;
    displayConv2iob?: string;
    otherDeviceIds?: { deviceId: string }[];
    merged?: boolean;
}

type SmartDevicesMap = Record<string, GHDevice>;

type ConverterFn = (
    id: string,
    control: PatternControl,
    name: string,
    room: string,
    func: string,
    obj: IoBObject,
) => GHDevice;

interface UrlKey {
    key: string;
}

// Trait-specific EXECUTE command params (flat union — all fields optional).
interface GHColor {
    name?: string;
    temperatureK?: number;
    spectrumRGB?: number;
    spectrumHSV?: { hue: number; saturation: number; value: number };
}
interface GHExecuteParams {
    on?: boolean;
    brightness?: number;
    color?: GHColor;
    openPercent?: number;
    openDirection?: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'IN' | 'OUT';
    lock?: boolean;
    thermostatTemperatureSetpoint?: number;
    thermostatMode?: string;
    activate?: boolean;
    deactivate?: boolean;
    [field: string]: unknown;
}

interface GHExecute {
    command: string;
    params: GHExecuteParams;
}
interface GHCommand {
    devices: { id: string }[];
    execution: GHExecute[];
}

// QUERY device-state value (trait-specific subset of fields).
interface GHQueryColor {
    spectrumRgb?: number;
    temperatureK?: number;
}
interface GHQueryDeviceState {
    online: boolean;
    status?: 'SUCCESS' | 'OFFLINE' | 'EXCEPTIONS' | 'ERROR';
    errorCode?: string;
    on?: boolean;
    brightness?: number;
    color?: GHQueryColor;
    openPercent?: number;
    openDirection?: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'IN' | 'OUT';
    isLocked?: boolean;
    thermostatMode?: string;
    thermostatTemperatureSetpoint?: number;
    thermostatTemperatureAmbient?: number;
    thermostatHumidityAmbient?: number;
    [field: string]: unknown;
}

// EXECUTE single-command outcome.
interface GHExecuteResult {
    ids: string[];
    status: 'SUCCESS' | 'PENDING' | 'OFFLINE' | 'EXCEPTIONS' | 'ERROR';
    states?: Record<string, unknown>;
    errorCode?: string;
    debugString?: string;
}

// SYNC response payload.
interface GHSyncResponse {
    requestId: string;
    payload: {
        agentUserId: string;
        devices: GHDevice[];
    };
}
interface GHQueryResponse {
    requestId: string;
    payload: { devices: Record<string, GHQueryDeviceState> };
}
interface GHExecuteResponse {
    requestId: string;
    payload: { commands: GHExecuteResult[] };
}
interface GHErrorResponse {
    error?: string;
    errorCode?: number;
}
type GHIntentResponse = GHSyncResponse | GHQueryResponse | GHExecuteResponse | GHErrorResponse | Record<string, never>;

// Generic per-intent payload shape (flat — different intents use different fields).
interface GHInputPayload {
    devices?: { id: string }[];
    commands?: GHCommand[];
}
interface GHInput {
    intent: string;
    payload?: GHInputPayload;
}
interface GHRequest {
    requestId?: string;
    inputs?: GHInput[];
}

// Reported-state cache: per device, per attribute → last sent value + timestamp.
type ReportedValue = ioBroker.StateValue | GHQueryColor | undefined;
interface ReportedEntry {
    val: ReportedValue;
    ts: number;
}

// updateStates / updateState send-to-cloud per-device JSON shape.
// Mixed-type map — discrimination is dynamic, so we type as unknown and narrow at access sites.
interface GHUpdateAttrRef {
    id: string;
}
interface GHUpdateDeviceMap {
    color?: GHQueryColor;
    [field: string]: unknown;
}
type GHUpdateMap = Record<string, GHUpdateDeviceMap>;

// -----------------------------------------------------------------------------

export default class GoogleHome {
    private adapter: Adapter;
    private urlKey: UrlKey | undefined;
    private lang: ioBroker.Languages = 'de';
    private agentUserId: string;

    public smartDevices: SmartDevicesMap = {};
    public smartDevicesSentToGoogle: SmartDevicesMap = {};
    private smartNames: Record<string, GHDevice> = {};
    public enums: string[] = [];
    private usedIds: string[] | null = [];
    private keys: string[] | null = [];
    private detector: ChannelDetector;
    private urlKeyOk = false;
    private keyPromise: Promise<void> | null = null;
    private keyPromiseTime: number | null = null;
    private unknownDevices: Record<string, number> = {};
    private reportedStates: Record<string, Record<string, ReportedEntry>> = {};
    private rateCalculation: number[] = [];

    private tasksTimer: NodeJS.Timeout | null = null;

    private readonly converter: Partial<Record<Types, ConverterFn>>;

    constructor(adapter: Adapter, urlKey?: UrlKey | null) {
        this.adapter = adapter;
        this.urlKey = urlKey ?? undefined;
        this.agentUserId = (adapter.config as IotAdapterConfig).login.replace(/[^-_:a-zA-Z1-9]/g, '_');
        this.detector = new ChannelDetector();

        this.converter = {
            [Types.socket]: this.processSocket.bind(this),
            [Types.light]: this.processLight.bind(this),
            [Types.info]: this.processInfo.bind(this),
            [Types.dimmer]: this.processDimmer.bind(this),
            [Types.rgbSingle]: this.processRgbSingle.bind(this),
            [Types.rgb]: this.processRgb.bind(this),
            [Types.hue]: this.processHue.bind(this),
            [Types.ct]: this.processCT.bind(this),
            [Types.temperature]: this.processTemperature.bind(this),
            [Types.thermostat]: this.processThermostat.bind(this),
            [Types.button]: this.processButton.bind(this),
            [Types.windowTilt]: this.processWindowTilt.bind(this),
            [Types.door]: this.processWindowTilt.bind(this),
            [Types.window]: this.processWindowTilt.bind(this),
            [Types.blind]: this.processBlind.bind(this),
            [Types.slider]: this.processBlind.bind(this),
            [Types.media]: this.processMedia.bind(this),
        };
    }

    checkUrlKey(): Promise<void> {
        const now = Date.now();
        if (!this.keyPromise || (this.keyPromiseTime !== null && now - this.keyPromiseTime > 900000)) {
            this.keyPromiseTime = now;
            this.keyPromise = this._performUrlKeyCheck();
        }
        return this.keyPromise;
    }

    private async _performUrlKeyCheck(): Promise<void> {
        const url = `${URL_STATUS}?user=${encodeURIComponent((this.adapter.config as IotAdapterConfig).login)}&urlKey=${encodeURIComponent(this.urlKey ? this.urlKey.key : '')}&p=${PROTOCOL_VERSION}&v=${this.adapter.version || ''}`;
        try {
            const response = await axios.get(url, { validateStatus: status => status === 200 });
            this.adapter.log.debug(`[GHOME] CHECK URL reported: ${JSON.stringify(response.data)}`);
            this.urlKeyOk = true;
        } catch (error) {
            const err = error as {
                response?: { data?: unknown; status?: number };
                request?: unknown;
                message?: string;
            };
            let errorMessage: unknown;
            if (err.response) {
                errorMessage = err.response.data || err.response.status;
            } else if (err.request) {
                errorMessage = 'No answer';
            } else {
                errorMessage = err.message;
            }
            if ((this.adapter.config as IotAdapterConfig).googleHome) {
                this.adapter.log.error(
                    `[GHOME] Url Key error. Google Request and Response are working. But device states are not reported automatically. If you have pro license please try to delete iot.0.certs: ${JSON.stringify(errorMessage)}`,
                );
            }
        }
    }

    // Resolve room/function display name: prefer smartName, then common.name, then prefix-stripped ID.
    private resolveDisplayName(
        smartName: SmartName,
        fallbackName: ioBroker.StringOrTranslated | undefined,
        fallbackId: string,
        prefix: string,
    ): string {
        let n: SmartName | ioBroker.StringOrTranslated = smartName || undefined;
        if (!n) {
            n = fallbackName;
        }
        if (n && typeof n === 'object') {
            const obj = n as ioBroker.Translated;
            n = obj[this.lang] || obj.en || '';
        }
        let result = (n as string) || '';
        if (!result) {
            result = fallbackId.substring(prefix.length);
            result = result[0].toUpperCase() + result.substring(1);
        }
        return result;
    }

    private collectSubscribedIds(): string[] {
        const ids: string[] = [];
        if (!this.smartDevices) {
            return ids;
        }
        Object.keys(this.smartDevices).forEach(devId => {
            const custom = this.smartDevices[devId].customData;
            if (!custom) {
                return;
            }
            Object.keys(custom).forEach(attr => {
                const v = custom[attr];
                if (attr?.startsWith('get_') && v && !ids.includes(v)) {
                    ids.push(v);
                }
            });
        });
        return ids;
    }

    async unsubscribeAllIds(): Promise<void> {
        const ids = this.collectSubscribedIds();
        this.adapter.log.debug(`[GHOME] Unsubscribe ${ids.length} states for google home`);
        for (const id of ids) {
            try {
                await this.adapter.unsubscribeForeignStatesAsync(id);
            } catch (e) {
                this.adapter.log.warn(`[GHOME] Cannot unsubscribe ${id}: ${e as string}`);
            }
        }
        this.adapter.log.debug('[GHOME] Unsubscribe done');
    }

    async subscribeAllIds(): Promise<void> {
        const ids = this.collectSubscribedIds();
        this.adapter.log.debug(`[GHOME] Subscribe ${ids.length} states for google home`);
        for (const id of ids) {
            try {
                await this.adapter.subscribeForeignStatesAsync(id);
            } catch (e) {
                this.adapter.log.warn(`[GHOME] Cannot subscribe ${id}: ${e as string}`);
            }
        }
        this.adapter.log.debug('[GHOME] Subscribe done');
    }

    getObjectName(obj: IoBObject, onlySimpleName?: boolean): string {
        let name: ioBroker.StringOrTranslated | undefined = '';
        if (!onlySimpleName) {
            const common = obj.common as ioBroker.StateCommon | undefined;
            if ((this.adapter.config as IotAdapterConfig).noCommon) {
                const custom = common?.custom?.[this.adapter.namespace];
                if (custom?.smartName && custom.smartName !== 'ignore') {
                    name = custom.smartName as ioBroker.StringOrTranslated;
                }
            } else {
                const sn = common?.smartName;
                if (sn && (sn as unknown) !== true && sn !== 'ignore') {
                    name = sn as ioBroker.StringOrTranslated;
                }
            }
        }
        if (!name && obj?.common?.name) {
            name = obj.common.name;
        }

        if (name && typeof name === 'object') {
            name = name[this.lang] || name.en || '';
        }

        if (!name && obj) {
            name = obj._id.split('.').pop() || '';
        }

        return name || '';
    }

    checkName(name: string | undefined, obj: IoBObject, room?: string, func?: string): string {
        if (!name) {
            name = this.getObjectName(obj) || '';
            name = name.replace(/[^a-zA-ZöäüßÖÄÜа-яА-Я0-9ÉéÈèÀàÂâÊêÙùÛûÇçÎîËëÏïŸÿÔôŒœãõìòáíóú]/g, ' ');
            let _name = name.toLowerCase();
            let pos: number;
            if (room) {
                pos = _name.indexOf(room.toLowerCase());
                if (pos !== -1) {
                    name = name.substring(0, pos) + name.substring(pos + room.length);
                    _name = _name.substring(0, pos) + _name.substring(pos + room.length);
                }
            }
            if (func) {
                pos = _name.indexOf(func.toLowerCase());
                if (pos !== -1) {
                    name = name.substring(0, pos) + name.substring(pos + func.length);
                }
            }
            name = name.replace(/\s\s+/g, ' ').trim();
        }
        return name || (func as string);
    }

    processSocket(
        id: string,
        control: PatternControl,
        name: string,
        room: string,
        func: string,
        obj: IoBObject,
    ): GHDevice {
        const setOnOffState = control.states.find(state => state.name === 'SET' && state.id);
        const set_on = setOnOffState?.id;

        const getOnOffState = control.states.find(state => state.name === 'ACTUAL' && state.id);
        const get_on = getOnOffState?.id || set_on;

        name = this.checkName(name, obj, room, func);

        return {
            type: 'action.devices.types.OUTLET',
            traits: ['action.devices.traits.OnOff'],
            name: {
                defaultNames: [`${room}steckdose`],
                name: this.getObjectName(obj) || name,
                nicknames: [name],
            },
            willReportState: true,
            roomHint: room || '',
            deviceInfo: { manufacturer: 'ioBroker', model: id.split('.')[0] },
            customData: { set_on, get_on },
            id,
        };
    }

    processLight(
        id: string,
        control: PatternControl,
        name: string,
        room: string,
        func: string,
        obj: IoBObject,
    ): GHDevice {
        const setOnOffState = control.states.find(state => state.name === 'SET' && state.id);
        const set_on = setOnOffState?.id;

        const getOnOffState = control.states.find(state => state.name === 'ACTUAL' && state.id);
        const get_on = getOnOffState?.id || set_on;

        const traits = ['action.devices.traits.OnOff'];
        name = this.checkName(name, obj, room, func);

        return {
            type: 'action.devices.types.LIGHT',
            traits,
            name: {
                defaultNames: [textsT(this.lang, 'light', room)],
                name: this.getObjectName(obj) || name,
                nicknames: [name],
            },
            willReportState: true,
            roomHint: room || '',
            deviceInfo: { manufacturer: 'ioBroker', model: id.split('.')[0] },
            customData: { set_on, get_on },
            id,
        };
    }

    processInfo(
        id: string,
        control: PatternControl,
        name: string,
        room: string,
        func: string,
        obj: IoBObject,
    ): GHDevice {
        const getOnOffState = control.states.find(state => state.name === 'ACTUAL' && state.id);
        const get_on = getOnOffState?.id;

        name = this.checkName(name, obj, room, func);

        const get_isLocked = get_on;
        const set_lock = get_on;
        const set_openPercent = set_lock;
        const get_openPercent = get_isLocked;

        const traits: string[] = ['action.devices.traits.LockUnlock', 'action.devices.traits.OpenClose'];

        return {
            type: 'action.devices.types.SENSOR',
            traits,
            displayTraits: ['action.devices.traits.OpenClose'],
            name: {
                defaultNames: [room + func],
                name: this.getObjectName(obj) || name,
                nicknames: [name],
            },
            attributes: { queryOnlyOpenClose: true },
            displayAttributes: JSON.stringify({ queryOnlyOpenClose: true }),
            willReportState: true,
            roomHint: room || '',
            deviceInfo: { manufacturer: 'ioBroker', model: id.split('.')[0] },
            customData: { get_isLocked, set_lock, set_openPercent, get_openPercent },
            id,
        };
    }

    processButton(
        id: string,
        control: PatternControl,
        name: string,
        room: string,
        func: string,
        obj: IoBObject,
    ): GHDevice {
        const setOnOffState = control.states.find(state => state.name === 'SET' && state.id);
        const set_on = setOnOffState?.id;

        const getOnOffState = control.states.find(state => state.name === 'ACTUAL' && state.id);
        const get_on = getOnOffState?.id || set_on;

        const traits = ['action.devices.traits.OnOff'];
        name = this.checkName(name, obj, room, func);

        return {
            type: 'action.devices.types.SWITCH',
            traits,
            name: {
                defaultNames: [room + func],
                name: this.getObjectName(obj) || name,
                nicknames: [name],
            },
            willReportState: true,
            roomHint: room || '',
            deviceInfo: { manufacturer: 'ioBroker', model: id.split('.')[0] },
            customData: { set_on, get_on },
            id,
        };
    }

    processDimmer(
        id: string,
        control: PatternControl,
        name: string,
        room: string,
        func: string,
        obj: IoBObject,
    ): GHDevice {
        const setBrightnessState = control.states.find(state => state.name === 'SET' && state.id);
        let set_brightness = setBrightnessState?.id;
        if (set_brightness?.includes('.dimspeed')) {
            const idArray = set_brightness.split('.');
            idArray.pop();
            idArray.push('bri');
            set_brightness = idArray.join('.');
        }
        const getBrightnessState = control.states.find(state => state.name === 'ACTUAL' && state.id);
        const get_brightness = getBrightnessState?.id || set_brightness;

        const setOnOffState = control.states.find(state => state.name === 'ON_SET' && state.id);
        const set_on = setOnOffState?.id || set_brightness;

        const getOnOffState = control.states.find(state => state.name === 'ON_ACTUAL' && state.id);
        const get_on = getOnOffState?.id || set_on;

        const traits: string[] = [];
        if (set_on) {
            traits.push('action.devices.traits.OnOff');
        }
        if (set_brightness) {
            traits.push('action.devices.traits.Brightness');
        }

        name = this.checkName(name, obj, room, func);

        return {
            type: 'action.devices.types.LIGHT',
            traits,
            displayTraits: ['action.devices.traits.Brightness'],
            name: {
                defaultNames: [textsT(this.lang, 'light', room)],
                name: this.getObjectName(obj) || name,
                nicknames: [name],
            },
            willReportState: true,
            roomHint: room || '',
            deviceInfo: { manufacturer: 'ioBroker', model: id.split('.')[0] },
            customData: { set_on, get_on, set_brightness, get_brightness },
            id,
        };
    }

    processHue(
        id: string,
        control: PatternControl,
        name: string,
        room: string,
        func: string,
        obj: IoBObject,
    ): GHDevice {
        let setBrightnessState = control.states.find(state => state.name === 'BRIGHTNESS' && state.id);
        if (!setBrightnessState) {
            setBrightnessState = control.states.find(state => state.name === 'DIMMER' && state.id);
        }
        const set_brightness = setBrightnessState?.id;
        const get_brightness = set_brightness;

        const setOnOffState = control.states.find(state => state.name === 'ON' && state.id);
        const set_on = setOnOffState?.id || set_brightness;
        const get_on = set_on;

        const setHueState = control.states.find(state => state.name === 'HUE' && state.id);
        const set_color_hue = setHueState?.id;
        const get_color_hue = set_color_hue;

        const setSaturationState = control.states.find(state => state.name === 'SATURATION' && state.id);
        const set_color_saturation = setSaturationState?.id;
        const get_color_saturation = set_color_saturation;

        const setTempState = control.states.find(state => state.name === 'TEMPERATURE' && state.id);
        const set_color_temperature = setTempState?.id;
        const get_color_temperature = set_color_temperature;

        const traits: string[] = [];
        if (set_on) {
            traits.push('action.devices.traits.OnOff');
        }
        if (set_brightness) {
            traits.push('action.devices.traits.Brightness');
        }
        if (set_color_hue) {
            traits.push('action.devices.traits.ColorSetting');
        }
        name = this.checkName(name, obj, room, func);

        return {
            type: 'action.devices.types.LIGHT',
            traits,
            displayTraits: ['action.devices.traits.ColorSetting_spectrumRGB'],
            attributes: {
                colorModel: 'rgb',
                colorTemperatureRange: { temperatureMinK: 2000, temperatureMaxK: 9000 },
            },
            displayAttributes: JSON.stringify({
                colorModel: 'rgb',
                colorTemperatureRange: { temperatureMinK: 2000, temperatureMaxK: 9000 },
            }),
            name: {
                defaultNames: [textsT(this.lang, 'light', room)],
                name: this.getObjectName(obj) || name,
                nicknames: [name],
            },
            willReportState: true,
            roomHint: room || '',
            deviceInfo: { manufacturer: 'ioBroker', model: id.split('.')[0] },
            customData: {
                set_on,
                get_on,
                set_brightness,
                get_brightness,
                set_color_hue,
                get_color_hue,
                set_color_saturation,
                get_color_saturation,
                set_color_temperature,
                get_color_temperature,
            },
            id,
        };
    }

    processRgbSingle(
        id: string,
        control: PatternControl,
        name: string,
        room: string,
        func: string,
        obj: IoBObject,
    ): GHDevice {
        let setBrightnessState = control.states.find(state => state.name === 'BRIGHTNESS' && state.id);
        if (!setBrightnessState) {
            setBrightnessState = control.states.find(state => state.name === 'DIMMER' && state.id);
        }
        const set_brightness = setBrightnessState?.id;
        const get_brightness = set_brightness;

        let setOnOffState = control.states.find(state => state.name === 'ON_LIGHT' && state.id);
        if (!setOnOffState) {
            setOnOffState = control.states.find(state => state.name === 'ON' && state.id);
        }
        const set_on = setOnOffState?.id || set_brightness;
        const get_on = set_on;

        const setRGBState = control.states.find(state => state.name === 'RGB' && state.id);
        const set_color_spectrumRGB = setRGBState?.id;
        const get_color_spectrumRGB = set_color_spectrumRGB;

        const setTempState = control.states.find(state => state.name === 'TEMPERATURE' && state.id);
        const set_color_temperature = setTempState?.id;
        const get_color_temperature = set_color_temperature;

        const traits: string[] = [];
        if (set_on) {
            traits.push('action.devices.traits.OnOff');
        }
        if (set_brightness) {
            traits.push('action.devices.traits.Brightness');
        }
        if (set_color_spectrumRGB) {
            traits.push('action.devices.traits.ColorSetting');
        }

        name = this.checkName(name, obj, room, func);

        return {
            type: 'action.devices.types.LIGHT',
            traits,
            displayTraits: ['action.devices.traits.ColorSetting_spectrumRGB'],
            attributes: {
                colorModel: 'rgb',
                colorTemperatureRange: { temperatureMinK: 2000, temperatureMaxK: 9000 },
            },
            displayAttributes: JSON.stringify({
                colorModel: 'rgb',
                colorTemperatureRange: { temperatureMinK: 2000, temperatureMaxK: 9000 },
            }),
            name: {
                defaultNames: [textsT(this.lang, 'light', room)],
                name: this.getObjectName(obj) || name,
                nicknames: [name],
            },
            willReportState: true,
            roomHint: room || '',
            deviceInfo: { manufacturer: 'ioBroker', model: id.split('.')[0] },
            customData: {
                set_on,
                get_on,
                set_brightness,
                get_brightness,
                set_color_spectrumRGB,
                get_color_spectrumRGB,
                set_color_temperature,
                get_color_temperature,
            },
            id,
        };
    }

    processRgb(
        id: string,
        control: PatternControl,
        name: string,
        room: string,
        func: string,
        obj: IoBObject,
    ): GHDevice {
        let setBrightnessState = control.states.find(state => state.name === 'BRIGHTNESS' && state.id);
        if (!setBrightnessState) {
            setBrightnessState = control.states.find(state => state.name === 'DIMMER' && state.id);
        }
        const set_brightness = setBrightnessState?.id;
        const get_brightness = set_brightness;

        let setOnOffState = control.states.find(state => state.name === 'ON_LIGHT' && state.id);
        if (!setOnOffState) {
            setOnOffState = control.states.find(state => state.name === 'ON' && state.id);
        }
        const set_on = setOnOffState?.id || set_brightness;
        const get_on = set_on;

        const setTempState = control.states.find(state => state.name === 'TEMPERATURE' && state.id);
        const set_color_temperature = setTempState?.id;
        const get_color_temperature = set_color_temperature;

        const setRState = control.states.find(state => state.name === 'RED' && state.id);
        const set_color_R = setRState?.id;
        const get_color_R = set_color_R;

        const setGState = control.states.find(state => state.name === 'GREEN' && state.id);
        const set_color_G = setGState?.id;
        const get_color_G = set_color_G;

        const setBState = control.states.find(state => state.name === 'BLUE' && state.id);
        const set_color_B = setBState?.id;
        const get_color_B = set_color_B;

        const traits: string[] = [];
        if (set_on) {
            traits.push('action.devices.traits.OnOff');
        }
        if (set_brightness) {
            traits.push('action.devices.traits.Brightness');
        }
        traits.push('action.devices.traits.ColorSetting');

        name = this.checkName(name, obj, room, func);

        return {
            type: 'action.devices.types.LIGHT',
            traits,
            displayTraits: ['action.devices.traits.ColorSetting_spectrumRGB'],
            attributes: {
                colorModel: 'rgb',
                colorTemperatureRange: { temperatureMinK: 2000, temperatureMaxK: 9000 },
            },
            displayAttributes: JSON.stringify({
                colorModel: 'rgb',
                colorTemperatureRange: { temperatureMinK: 2000, temperatureMaxK: 9000 },
            }),
            name: {
                defaultNames: [textsT(this.lang, 'light', room)],
                name: this.getObjectName(obj) || name,
                nicknames: [name],
            },
            willReportState: true,
            roomHint: room || '',
            deviceInfo: { manufacturer: 'ioBroker', model: id.split('.')[0] },
            customData: {
                set_on,
                get_on,
                set_brightness,
                get_brightness,
                set_color_temperature,
                get_color_temperature,
                set_color_R,
                get_color_R,
                set_color_G,
                get_color_G,
                set_color_B,
                get_color_B,
            },
            id,
        };
    }

    processCT(id: string, control: PatternControl, name: string, room: string, func: string, obj: IoBObject): GHDevice {
        let setBrightnessState = control.states.find(state => state.name === 'BRIGHTNESS' && state.id);
        if (!setBrightnessState) {
            setBrightnessState = control.states.find(state => state.name === 'DIMMER' && state.id);
        }
        const set_brightness = setBrightnessState?.id;
        const get_brightness = set_brightness;

        let setOnOffState = control.states.find(state => state.name === 'ON' && state.id);
        if (!setOnOffState) {
            setOnOffState = control.states.find(state => state.name === 'ON_LIGHT' && state.id);
        }
        const set_on = setOnOffState?.id || set_brightness;
        const get_on = set_on;

        const setTempState = control.states.find(state => state.name === 'TEMPERATURE' && state.id);
        const set_color_temperature = setTempState?.id;
        const get_color_temperature = set_color_temperature;

        const traits: string[] = [];
        if (set_on) {
            traits.push('action.devices.traits.OnOff');
        }
        if (set_brightness) {
            traits.push('action.devices.traits.Brightness');
        }
        if (set_color_temperature) {
            traits.push('action.devices.traits.ColorSetting');
        }
        name = this.checkName(name, obj, room, func);

        return {
            type: 'action.devices.types.LIGHT',
            traits,
            displayTraits: ['action.devices.traits.ColorSetting_temperature'],
            attributes: {
                colorModel: 'rgb',
                colorTemperatureRange: { temperatureMinK: 2000, temperatureMaxK: 9000 },
            },
            displayAttributes: JSON.stringify({
                colorModel: 'rgb',
                colorTemperatureRange: { temperatureMinK: 2000, temperatureMaxK: 9000 },
            }),
            name: {
                defaultNames: [textsT(this.lang, 'light', room)],
                name: this.getObjectName(obj) || name,
                nicknames: [name],
            },
            willReportState: true,
            roomHint: room || '',
            deviceInfo: { manufacturer: 'ioBroker', model: id.split('.')[0] },
            customData: {
                set_on,
                get_on,
                set_brightness,
                get_brightness,
                set_color_temperature,
                get_color_temperature,
            },
            id,
        };
    }

    processWindowTilt(
        id: string,
        control: PatternControl,
        name: string,
        room: string,
        func: string,
        obj: IoBObject,
    ): GHDevice {
        const getWindowTile = control.states.find(state => state.name === 'ACTUAL' && state.id);
        const get_isLocked = getWindowTile?.id;
        const set_lock = getWindowTile?.id;
        const set_openPercent = set_lock;
        const get_openPercent = get_isLocked;

        const traits: string[] = ['action.devices.traits.LockUnlock', 'action.devices.traits.OpenClose'];

        name = this.checkName(name, obj, room, func);

        return {
            type: 'action.devices.types.WINDOW',
            traits,
            attributes: { queryOnlyOpenClose: true },
            displayAttributes: JSON.stringify({ queryOnlyOpenClose: true }),
            name: {
                defaultNames: [textsT(this.lang, 'window', room)],
                name: this.getObjectName(obj) || name,
                nicknames: [name],
            },
            willReportState: true,
            roomHint: room || '',
            deviceInfo: { manufacturer: 'ioBroker', model: id.split('.')[0] },
            customData: { set_lock, get_isLocked, set_openPercent, get_openPercent },
            id,
        };
    }

    processBlind(
        id: string,
        control: PatternControl,
        name: string,
        room: string,
        func: string,
        obj: IoBObject,
    ): GHDevice {
        const getOpenPercent = control.states.find(state => state.name === 'SET' && state.id);
        const set_openPercent = getOpenPercent?.id;
        const get_openPercent = set_openPercent;

        const getOpenDirection = control.states.find(state => state.name === 'DIRECTION' && state.id);
        const set_openDirection = getOpenDirection?.id;
        const get_openDirection = set_openDirection;

        const traits: string[] = ['action.devices.traits.OpenClose'];

        name = this.checkName(name, obj, room, func);

        return {
            type: 'action.devices.types.BLINDS',
            traits,
            name: {
                defaultNames: [textsT(this.lang, 'blinds', room)],
                name: this.getObjectName(obj) || name,
                nicknames: [name],
            },
            willReportState: true,
            roomHint: room || '',
            deviceInfo: { manufacturer: 'ioBroker', model: id.split('.')[0] },
            customData: { set_openPercent, get_openPercent, set_openDirection, get_openDirection },
            id,
        };
    }

    processTemperature(
        id: string,
        control: PatternControl,
        name: string,
        room: string,
        func: string,
        obj: IoBObject,
    ): GHDevice {
        const setThermostatTemperatureSetpoint = control.states.find(state => state.name === 'SET' && state.id);
        const set_thermostatTemperatureSetpoint = setThermostatTemperatureSetpoint?.id;

        const getThermostatTemperatureAmbient = control.states.find(state => state.name === 'ACTUAL' && state.id);
        const get_thermostatTemperatureAmbient =
            getThermostatTemperatureAmbient?.id || set_thermostatTemperatureSetpoint;

        const getThermostatHumidityAmbient = control.states.find(state => state.name === 'SECOND' && state.id);
        const get_thermostatHumidityAmbient = getThermostatHumidityAmbient?.id;

        const traits: string[] = ['action.devices.traits.TemperatureSetting'];

        name = this.checkName(name, obj, room, func);

        return {
            type: 'action.devices.types.THERMOSTAT',
            traits,
            displayTraits: ['action.devices.traits.TemperatureSetting_thermostatTemperatureSetpoint'],
            attributes: { queryOnlyTemperatureSetting: true, thermostatTemperatureUnit: 'C' },
            displayAttributes: JSON.stringify({ queryOnlyTemperatureSetting: true, thermostatTemperatureUnit: 'C' }),
            name: {
                defaultNames: [textsT(this.lang, 'thermostat', room)],
                name: this.getObjectName(obj) || name,
                nicknames: [name],
            },
            willReportState: true,
            roomHint: room || '',
            deviceInfo: { manufacturer: 'ioBroker', model: id.split('.')[0] },
            customData: {
                set_thermostatTemperatureSetpoint,
                get_thermostatTemperatureAmbient,
                get_thermostatHumidityAmbient,
            },
            id,
        };
    }

    processThermostat(
        id: string,
        control: PatternControl,
        name: string,
        room: string,
        func: string,
        obj: IoBObject,
    ): GHDevice {
        const setThermostatTemperatureSetpoint = control.states.find(state => state.name === 'SET' && state.id);
        const set_thermostatTemperatureSetpoint = setThermostatTemperatureSetpoint?.id;
        const get_thermostatTemperatureSetpoint = set_thermostatTemperatureSetpoint;
        const getThermostatTemperatureAmbient = control.states.find(state => state.name === 'ACTUAL' && state.id);
        const get_thermostatTemperatureAmbient =
            getThermostatTemperatureAmbient?.id || set_thermostatTemperatureSetpoint;

        const getThermostatHumidityAmbient = control.states.find(state => state.name === 'HUMIDITY' && state.id);
        const get_thermostatHumidityAmbient = getThermostatHumidityAmbient?.id;

        const traits: string[] = ['action.devices.traits.TemperatureSetting'];

        name = this.checkName(name, obj, room, func);

        return {
            type: 'action.devices.types.THERMOSTAT',
            traits,
            displayTraits: ['action.devices.traits.TemperatureSetting_thermostatTemperatureSetpoint'],
            attributes: { availableThermostatModes: 'off,heat,cool,on', thermostatTemperatureUnit: 'C' },
            displayAttributes: JSON.stringify({
                availableThermostatModes: 'off,heat,cool,on',
                thermostatTemperatureUnit: 'C',
            }),
            name: {
                defaultNames: [textsT(this.lang, 'thermostat', room)],
                name: this.getObjectName(obj) || name,
                nicknames: [name],
            },
            willReportState: false,
            roomHint: room || '',
            deviceInfo: { manufacturer: 'ioBroker', model: id.split('.')[0] },
            customData: {
                set_thermostatTemperatureSetpoint,
                get_thermostatTemperatureSetpoint,
                get_thermostatTemperatureAmbient,
                get_thermostatHumidityAmbient,
            },
            id,
        };
    }

    processMedia(
        id: string,
        control: PatternControl,
        name: string,
        room: string,
        func: string,
        obj: IoBObject,
    ): GHDevice {
        const setOnOffState = control.states.find(state => state.name === 'STATE' && state.id);
        const set_on = setOnOffState?.id;
        const get_on = set_on;

        const setPlayState = control.states.find(state => state.name === 'PLAY' && state.id);
        const set_mediaPlay = setPlayState?.id || set_on;

        const setPauseState = control.states.find(state => state.name === 'PAUSE' && state.id);
        const set_mediaPause = setPauseState?.id;

        const setStopState = control.states.find(state => state.name === 'STOP' && state.id);
        const set_mediaStop = setStopState?.id;

        const setNextState = control.states.find(state => state.name === 'NEXT' && state.id);
        const set_mediaNext = setNextState?.id;

        const setPrevState = control.states.find(state => state.name === 'PREV' && state.id);
        const set_mediaPrev = setPrevState?.id;

        const setVolumeState = control.states.find(state => state.name === 'VOLUME' && state.id);
        const set_brightness = setVolumeState?.id;

        const traits = [
            'action.devices.traits.OnOff',
            'action.devices.traits.MediaState',
            'action.devices.traits.Brightness',
        ];
        name = this.checkName(name, obj, room, func);

        return {
            type: 'action.devices.types.SPEAKER',
            traits,
            displayTraits: ['action.devices.traits.Brightness'],
            name: {
                defaultNames: [textsT(this.lang, 'media', room)],
                name: this.getObjectName(obj) || name,
                nicknames: [name],
            },
            willReportState: true,
            roomHint: room || '',
            deviceInfo: { manufacturer: 'ioBroker', model: id.split('.')[0] },
            customData: {
                set_on,
                get_on,
                set_mediaPlay,
                set_mediaPause,
                set_mediaStop,
                set_mediaNext,
                set_mediaPrev,
                set_brightness,
            },
            id,
        };
    }

    setLanguage(_lang: ioBroker.Languages): void {
        this.lang = _lang || 'de';
    }

    getSmartName(states: IoBObject | Record<string, IoBObject>, id?: string): SmartName {
        if (!id) {
            const obj = states as IoBObject;
            const common = obj.common as ioBroker.StateCommon | undefined;
            if (!(this.adapter.config as IotAdapterConfig).noCommon) {
                if (common) {
                    return common.smartName;
                }
                this.adapter.log.warn(
                    `[GHOME] No common property for ${JSON.stringify(states)} IoT options available please check the state.`,
                );
                return null;
            }
            const custom = common?.custom?.[this.adapter.namespace];
            return custom ? (custom.smartName as SmartName) : undefined;
        }
        const objects = states as Record<string, IoBObject>;
        const common = objects[id]?.common as ioBroker.StateCommon | undefined;
        if (!(this.adapter.config as IotAdapterConfig).noCommon) {
            return common ? common.smartName : null;
        }
        const custom = common?.custom?.[this.adapter.namespace];
        return custom ? ((custom.smartName as SmartName) ?? null) : null;
    }

    async processState(
        ids: string[],
        objects: Record<string, IoBObject>,
        id: string,
        roomName: string,
        funcName: string,
        result: SmartDevicesMap,
        smartEnum: boolean,
        parentId?: string,
    ): Promise<void> {
        try {
            if (!id || !objects[id] || result[id]) {
                return;
            }
            this.adapter.log.debug(`[GHOME] Process: ${id} ${roomName} ${funcName}`);
            const smartName = this.getSmartName(objects, id);

            if (smartName !== undefined && (smartName === 'ignore' || smartName === false)) {
                this.adapter.log.warn(
                    `[GHOME] ${id} is ignored because the property smartName is false or ignore. To use this state again, remove the property smartName in Object explorer or add it manually under Google Devices`,
                );
                return;
            }

            let friendlyName = '';
            if (typeof smartName === 'object' && smartName) {
                const sn = smartName as SmartNameObject;
                friendlyName = (sn[this.lang] as string) || (sn.en as string) || '';
            }
            if (!friendlyName) {
                friendlyName = this.checkName('', objects[id], roomName, funcName);
            }

            result[id] = { id, traits: [], customData: {} };
            if (parentId) {
                result[id].parentId = parentId;
            }

            let childStates: string[] = [];
            result[id].ioType = objects[id].type;
            if (objects[id].type === 'channel') {
                childStates = this.getAllStatesInChannel(Object.keys(objects), id);
            } else if (objects[id].type === 'device') {
                childStates = this.getAllStatesInDevice(Object.keys(objects), id);
                if (!childStates.length) {
                    childStates = this.getAllStatesInChannel(Object.keys(objects), id);
                }
            }

            const snObj = typeof smartName === 'object' && smartName ? (smartName as SmartNameObject) : null;

            if (snObj) {
                result[id].conv2GH = {};
                result[id].displayConv2GH = '';
                result[id].conv2iob = {};
                result[id].displayConv2iob = '';
                if (snObj.ghConv2GH) {
                    result[id].conv2GH[id] = snObj.ghConv2GH;
                    result[id].displayConv2GH = snObj.ghConv2GH;
                }
                if (snObj.ghConv2iob) {
                    result[id].conv2iob[id] = snObj.ghConv2iob;
                    result[id].displayConv2iob = snObj.ghConv2iob;
                }
            }
            if ((snObj?.ghType && snObj?.ghTraits) || parentId) {
                if (snObj?.ghType) {
                    result[id].type = snObj.ghType;
                }
                if (snObj?.ghTraits && snObj.ghTraits.length > 0 && snObj.ghTraits[0]) {
                    result[id].traits = [snObj.ghTraits[0].split('_')[0]];
                    result[id].displayTraits = [snObj.ghTraits[0]];
                }
                try {
                    if (snObj?.ghAttributes) {
                        result[id].attributes = JSON.parse(snObj.ghAttributes);
                        result[id].displayAttributes = JSON.stringify(result[id].attributes);
                    }
                } catch (error) {
                    this.adapter.log.error(`[GHOME] Cannot parse attributes ${error as string} ${snObj?.ghAttributes}`);
                    result[id].attributes = {};
                    result[id].displayAttributes = snObj?.ghAttributes;
                }
                for (let c = 0; c < childStates.length; c++) {
                    await this.processState(ids, objects, childStates[c], roomName, funcName, result, false, id);
                }
            } else if (smartEnum) {
                try {
                    if (id.match(/^hm-rpc\..*?\.CUX/)) {
                        this.adapter.log.debug(`[GHOME] Ignore "${id}": Because it is a virtual device`);
                        return;
                    }
                    const options: DetectOptions = {
                        objects,
                        id,
                        _keysOptional: ids,
                        _usedIdsOptional: this.usedIds || undefined,
                    };

                    const controls = this.detector.detect(options);
                    if (controls) {
                        let control = controls[0];
                        if (controls[0].type === 'socket' && controls[1] && controls[1].type !== 'info') {
                            control = controls[1];
                        }
                        this.adapter.log.debug(`[GHOME] Type: ${control.type}`);

                        const fn = this.converter[control.type];
                        if (fn) {
                            this.adapter.log.info(`[GHOME] ${id} is auto added with type  ${control.type}.`);
                            result[id] = fn(id, control, friendlyName, roomName, funcName, objects[id]);
                            result[id].displayTraits ||= result[id].traits;

                            if (snObj?.ghAttributes) {
                                result[id].attributes = JSON.parse(snObj.ghAttributes);
                                result[id].displayAttributes = JSON.stringify(result[id].attributes);
                            }

                            result[id].smartEnum = 'X';
                            result[id].conv2GH = {};
                            result[id].conv2iob = {};

                            if (result[id].customData.set_brightness) {
                                const briState = await this.adapter.getForeignObjectAsync(
                                    result[id].customData.set_brightness,
                                );
                                const max = (briState?.common as ioBroker.StateCommon | undefined)?.max;
                                if (max && max >= 101) {
                                    result[id].conv2GH[result[id].customData.set_brightness] =
                                        `return value/${max / 100}`;
                                    result[id].conv2iob[result[id].customData.set_brightness] =
                                        `return value*${max / 100}`;
                                }
                            }
                            if (result[id].customData.set_color_temperature) {
                                const stObj = await this.adapter.getForeignObjectAsync(
                                    result[id].customData.set_color_temperature,
                                );
                                const max = (stObj?.common as ioBroker.StateCommon | undefined)?.max;
                                if (max !== undefined && max <= 500) {
                                    result[id].conv2GH[result[id].customData.set_color_temperature] =
                                        'return 1000000/value';
                                    result[id].conv2iob[result[id].customData.set_color_temperature] =
                                        'return 1000000/value';
                                }
                            }

                            result[id].ioType = objects[id].type;

                            this.adapter.log.debug(
                                `[GHOME] Created Google HOME device: ${result[id].name?.defaultNames?.[0]} - ${control.type} - ${id}`,
                            );

                            Object.keys(result[id].customData).forEach(element => {
                                const childID = result[id].customData[element];
                                if (!childID) {
                                    return;
                                }
                                if (childID === id) {
                                    this.adapter.log.debug('[GHOME] SmartEnum is equal child skip child detection');
                                    return;
                                }

                                if (result[childID] && !result[childID].smartEnum) {
                                    result[childID].parentId = id;
                                    this.adapter.log.warn(
                                        `[GHOME] ${childID} has custom settings this is overriding auto-detected settings. To use auto-detected settings please delete this state in the instance settings under Google Devices.`,
                                    );
                                    return;
                                }
                                const trait = customToTraitEnum[element.substring(4)];
                                result[childID] = { id: childID, traits: [trait], customData: {} };
                                result[childID].roomHint = roomName;
                                result[childID].smartEnum = 'X';
                                result[childID].type = result[id].type;

                                result[childID].ioType = objects[childID] ? objects[childID].type : '';
                                if (element.includes('set_')) {
                                    // eslint-disable-next-line no-irregular-whitespace
                                    result[childID].ioType = ` SETTER:\n    ${result[childID].ioType}`;
                                }
                                result[childID].displayTraits = [trait];
                                if (childID && result[id].conv2GH?.[childID]) {
                                    result[childID].displayConv2GH = result[id].conv2GH[childID];
                                }
                                if (childID && result[id].conv2iob?.[childID]) {
                                    result[childID].displayConv2iob = result[id].conv2iob[childID];
                                }
                                result[childID].parentId = id;
                                result[childID].name = { nicknames: [childID] };
                                result[childID].id = childID;
                            });
                        } else {
                            this.adapter.log.info(
                                `[GHOME] Cannot auto convert ${id}. Type ${control.type} is not available, yet. If you need the state please add him manually`,
                            );
                            this.adapter.log.debug(`[GHOME] ${JSON.stringify(control)}`);
                        }
                    } else {
                        console.log(`[GHOME] Nothing found for ${options.id}`);
                    }
                } catch (e) {
                    this.adapter.log.error(`[GHOME] Cannot process "${id}": ${e as string}`);
                    this.adapter.log.error(`[GHOME] ${(e as Error)?.stack}`);
                }
                return;
            } else if (snObj?.smartType) {
                switch (snObj.smartType) {
                    case 'LIGHT':
                        result[id].traits = ['action.devices.traits.OnOff'];
                        result[id].type = 'action.devices.types.LIGHT';
                        break;
                    case 'SWITCH':
                        result[id].traits = ['action.devices.traits.OnOff'];
                        result[id].type = 'action.devices.types.SWITCH';
                        break;
                    case 'SMARTPLUG':
                        result[id].traits = ['action.devices.traits.OnOff'];
                        result[id].type = 'action.devices.types.OUTLET';
                        break;
                    case 'SMARTLOCK':
                        result[id].traits = ['action.devices.traits.LockUnlock'];
                        result[id].type = 'action.devices.types.DOOR';
                        break;
                }

                result[id].displayTraits ||= result[id].traits;
                result[id].ioType = objects[id].type;
                result[id].smartEnum = 'X';

                let friendlyNamesArray: string[] = [];
                if (friendlyName) {
                    friendlyNamesArray = friendlyName.replace(/, /g, ',').split(',');
                }

                result[id].name = {
                    defaultNames: [this.getObjectName(objects[id], true)],
                    name: friendlyNamesArray[0],
                    nicknames: friendlyNamesArray,
                };
                result[id].willReportState = true;
                result[id].roomHint = roomName || '';
                result[id].deviceInfo = { manufacturer: 'ioBroker', model: id.split('.')[0] };
                result[id].id = id;
                result[id].otherDeviceIds = [{ deviceId: id }];

                this.adapter.log.debug(
                    `[GHOME] Created Google HOME device from Alexa SmartType: ${result[id].name?.defaultNames?.[0]} - ${result[id].type} - ${id}`,
                );
                return;
            } else {
                delete result[id];
                return;
            }

            let friendlyNamesArray: string[] = [];
            if (friendlyName) {
                friendlyNamesArray = friendlyName.replace(/, /g, ',').split(',');
            }

            result[id].name = {
                defaultNames: [this.getObjectName(objects[id], true)],
                name: friendlyNamesArray[0],
                nicknames: friendlyNamesArray,
            };
            result[id].willReportState = true;
            result[id].roomHint = roomName || '';
            result[id].deviceInfo = { manufacturer: 'ioBroker', model: id.split('.')[0] };
            result[id].id = id;
            result[id].otherDeviceIds = [{ deviceId: id }];
            if (snObj?.ghTraits && snObj.ghTraits.length > 0 && snObj.ghTraits[0] && traitEnum[snObj.ghTraits[0]]) {
                const command = traitEnum[snObj.ghTraits[0]].command;
                const getter = traitEnum[snObj.ghTraits[0]].getter;
                if (command) {
                    result[id].customData[`set_${command}`] = id;
                }
                if (getter) {
                    result[id].customData[`get_${getter}`] = id;
                } else {
                    result[id].customData[`get_${command}`] = id;
                }

                Object.keys(traitEnum).forEach(trait => {
                    try {
                        if (
                            JSON.stringify(JSON.parse(traitEnum[trait].defaultAttributes)) ===
                            JSON.stringify(JSON.parse(snObj.ghAttributes || ''))
                        ) {
                            snObj.ghAttributes = '';
                        }
                    } catch {
                        // ignore JSON parse failures
                    }
                });

                if (!snObj.ghAttributes && traitEnum[snObj.ghTraits[0]].defaultAttributes) {
                    const defaultAttributes = traitEnum[snObj.ghTraits[0]].defaultAttributes;
                    result[id].attributes = JSON.parse(defaultAttributes);
                    const obj = await this.adapter.getForeignObjectAsync(id);
                    const existingSn = (obj?.common as ioBroker.StateCommon | undefined)?.smartName as
                        | SmartNameObject
                        | undefined;
                    if (!existingSn?.ghAttributes || existingSn.ghAttributes !== defaultAttributes) {
                        await this.adapter.extendForeignObjectAsync(id, {
                            common: { smartName: { ghAttributes: defaultAttributes } as SmartNameObject },
                        } as Partial<ioBroker.StateObject>);
                    }
                } else {
                    result[id].attributes = {};
                }
            }

            // merge states with same name and room
            if (this.smartNames[friendlyName]?.roomHint === roomName) {
                if (Array.isArray(snObj?.ghTraits) && snObj.ghTraits.length > 0 && snObj.ghTraits[0]) {
                    const orgId = this.smartNames[friendlyName].id;
                    result[orgId].traits.push(snObj.ghTraits[0].split('_')[0]);

                    if (result[id].attributes) {
                        if (result[orgId].attributes) {
                            result[orgId].attributes = Object.assign(result[orgId].attributes, result[id].attributes);
                        } else {
                            result[orgId].attributes = result[id].attributes;
                        }
                    }
                    result[orgId].conv2GH = { ...result[orgId].conv2GH, ...result[id].conv2GH };
                    result[orgId].conv2iob = { ...result[orgId].conv2iob, ...result[id].conv2iob };

                    const command = traitEnum[snObj.ghTraits[0]].command;
                    const getter = traitEnum[snObj.ghTraits[0]].getter;
                    if (command) {
                        result[orgId].customData[`set_${command}`] = id;
                    }
                    if (getter) {
                        result[orgId].customData[`get_${getter}`] = id;
                    } else {
                        result[orgId].customData[`get_${command}`] = id;
                    }
                    this.adapter.log.debug(`[GHOME] ${JSON.stringify(result[orgId])}`);
                    result[id].merged = true;
                }
            } else {
                this.smartNames[friendlyName] = result[id];
            }
            this.adapter.log.debug(`[GHOME] ${JSON.stringify(result[id])}`);
        } catch (error) {
            if (id && result[id]) {
                delete result[id];
            }
            this.adapter.log.error(`[GHOME] Cannot process: ${id} ${error as string}`);
            this.adapter.log.error(`[GHOME] ${objects[id] as unknown as string}`);
            this.adapter.log.debug(`[GHOME] ${(error as Error)?.stack}`);
        }
    }

    getAllStatesInChannel(keys: string[], channelId: string): string[] {
        const reg = new RegExp(`^${channelId.replace(/\./g, '\\.')}\\.[^.]+$`);
        return keys.filter(_id => reg.test(_id));
    }

    getAllStatesInDevice(keys: string[], channelId: string): string[] {
        const reg = new RegExp(`^${channelId.replace(/\./g, '\\.')}\\.[^.]+\\.[^.]+$`);
        return keys.filter(_id => reg.test(_id));
    }

    private async _readObjects(): Promise<{
        objects: Record<string, IoBObject>;
        enums: Record<string, IoBObject>;
    }> {
        const [states, channels, devices, enumsView] = await Promise.all([
            this.adapter.getObjectViewAsync('system', 'state', {}),
            this.adapter.getObjectViewAsync('system', 'channel', {}),
            this.adapter.getObjectViewAsync('system', 'device', {}),
            this.adapter.getObjectViewAsync('system', 'enum', {}),
        ]);

        const objects: Record<string, IoBObject> = {};
        const enums: Record<string, IoBObject> = {};
        const pushRows = (rows?: { value: IoBObject }[]): void => {
            if (!rows) {
                return;
            }
            for (const row of rows) {
                const v = row?.value;
                if (v?._id && !ignoreIds.find(reg => reg.test(v._id))) {
                    objects[v._id] = v;
                }
            }
        };
        pushRows(devices?.rows);
        pushRows(channels?.rows);
        pushRows(states?.rows);
        if (enumsView?.rows) {
            for (const row of enumsView.rows) {
                const v = row?.value;
                if (v?._id) {
                    enums[v._id] = v;
                    objects[v._id] = v;
                }
            }
        }
        return { objects, enums };
    }

    filterValidGoogleDevices(): SmartDevicesMap {
        const returnObject: SmartDevicesMap = {};
        Object.keys(this.smartDevices).forEach(id => {
            const d = this.smartDevices[id];
            if (!d.merged) {
                if ((d.name?.name && d.type && d.traits && d.traits.length > 0) || d.parentId) {
                    returnObject[id] = d;
                }
            }
        });
        return returnObject;
    }

    async updateDevices(cb?: (analyseAddedId?: string) => void): Promise<void> {
        try {
            await this.unsubscribeAllIds();
            this.smartDevices = await this._updateDevices();
            this.smartDevicesSentToGoogle = this.filterValidGoogleDevices();
            try {
                await this.checkUrlKey();
                await this.subscribeAllIds();
            } catch (err) {
                if ((this.adapter.config as IotAdapterConfig).googleHome) {
                    this.adapter.log.warn(
                        `[GHOME] Invalid URL Pro key. Status auto-update is disabled you can set states but receive states only manually: ${err as string}`,
                    );
                }
            }
        } finally {
            cb?.();
        }
    }

    getDevices(): GHDevice[] {
        return Object.keys(this.smartDevices)
            .filter(device => !!this.smartDevices[device].name)
            .map(device => this.smartDevices[device]);
    }

    private _findRoomOfId(
        allRooms: string[],
        enums: Record<string, IoBObject>,
        objects: Record<string, IoBObject>,
        id: string,
    ): string {
        let roomHint = '';
        allRooms.forEach(roomId => {
            const room = enums[roomId];
            const members = (room.common as ioBroker.EnumCommon | undefined)?.members;
            if (!members?.length) {
                return;
            }

            let pos = members.indexOf(id);
            if (pos === -1) {
                const idArray = id.split('.');
                idArray.pop();
                const parent = idArray.join('.');
                if (objects[parent]?.type === 'channel') {
                    pos = members.indexOf(parent);
                }
            }
            if (pos !== -1) {
                roomHint = this.resolveDisplayName(this.getSmartName(room), room.common.name, roomId, 'enum.rooms.');
            }
        });

        return roomHint;
    }

    private async _updateDevices(): Promise<SmartDevicesMap> {
        const { objects, enums } = await this._readObjects();
        const ids = Object.keys(objects);

        this.enums = [];
        this.smartDevices = {};
        this.smartNames = {};
        this.usedIds = [];
        this.keys = [];

        ids.sort();

        const rooms: string[] = [];
        const allRooms: string[] = [];
        const funcs: string[] = [];
        Object.keys(enums).forEach(id => {
            const smartName = this.getSmartName(enums[id]);
            if (id.match(/^enum\.rooms\./)) {
                allRooms.push(id);
                if (smartName !== 'ignore' && smartName !== false) {
                    rooms.push(id);
                }
            } else if (id.match(/^enum\.functions\./) && smartName !== 'ignore' && smartName !== false) {
                funcs.push(id);
            }
        });

        const result: SmartDevicesMap = {};
        const roomNames: Record<string, string> = {};

        // find smart names without room or func
        this.adapter.log.debug('[GHOME] Start non smart enum processing');
        const keys = Object.keys(objects);
        for (let k = 0; k < keys.length; k++) {
            const id = keys[k];
            const smartName = this.getSmartName(objects[id]);
            if (smartName && smartName !== 'ignore') {
                const roomHint = this._findRoomOfId(allRooms, enums, objects, id);
                await this.processState(ids, objects, id, roomHint, '', result, false);
            }
        }

        this.adapter.log.debug('[GHOME] Start smartenum processing');

        for (let f = 0; f < funcs.length; f++) {
            const funcId = funcs[f];
            const func = enums[funcId];
            const members = (func.common as ioBroker.EnumCommon | undefined)?.members;
            if (!members || typeof members !== 'object' || !members.length) {
                continue;
            }
            this.adapter.log.debug(`[GHOME] Process ${funcId}`);
            const funcName = this.resolveDisplayName(
                this.getSmartName(func),
                func.common.name,
                funcId,
                'enum.functions.',
            );

            for (let m = 0; m < members.length; m++) {
                const id = members[m];
                if (!result[id]) {
                    for (let r = 0; r < rooms.length; r++) {
                        const roomId = rooms[r];
                        const room = enums[roomId];
                        const roomMembers = (room.common as ioBroker.EnumCommon | undefined)?.members;
                        if (!roomMembers || typeof roomMembers !== 'object' || !roomMembers.length) {
                            continue;
                        }

                        if (roomMembers.includes(id)) {
                            if (!roomNames[roomId]) {
                                roomNames[roomId] = this.resolveDisplayName(
                                    this.getSmartName(room),
                                    room.common.name,
                                    roomId,
                                    'enum.rooms.',
                                );
                            }
                            if (objects[id]?.type === 'state') {
                                this.adapter.log.warn(
                                    `[GHOME] ${id} is a state. It's recommended to add rooms and functionality to channels or devices and not to a state to get auto detected for Google Home. This works only for simple switches.`,
                                );
                            }
                            await this.processState(ids, objects, id, roomNames[roomId], funcName, result, true);
                        }
                    }
                }
            }
        }

        // scan alias.* and linkeddevices.*
        for (let i = 0; i < ids.length; i++) {
            if (ids[i] < 'alias.') {
                continue;
            }
            if (ids[i] > 'linkeddevices.香') {
                break;
            }

            if (
                (ids[i].startsWith('alias.') || ids[i].startsWith('linkeddevices.')) &&
                objects[ids[i]] &&
                (objects[ids[i]].type === 'device' || objects[ids[i]].type === 'channel')
            ) {
                const roomHint = this._findRoomOfId(allRooms, enums, objects, ids[i]);
                if (roomHint) {
                    await this.processState(
                        ids,
                        objects,
                        ids[i],
                        roomsT(this.lang, roomHint),
                        funcsT(this.lang, 'undefined'),
                        result,
                        true,
                    );
                }
            }
        }

        this.usedIds = null;
        this.keys = null;

        Object.keys(result).forEach(id => this.adapter.log.debug(`[GHOME] ${id} => ${result[id].type}`));

        return result;
    }

    async updateState(id: string, state: ioBroker.State): Promise<void> {
        const now = Date.now();
        if (
            !this.urlKeyOk ||
            (this.unknownDevices[id] && now - this.unknownDevices[id] < RETRY_UNKNOWN_DEVICES_INTERVAL)
        ) {
            return;
        }

        const json: GHUpdateMap = {};
        let found = false;
        for (const devId in this.smartDevicesSentToGoogle) {
            if (!Object.prototype.hasOwnProperty.call(this.smartDevicesSentToGoogle, devId)) {
                continue;
            }
            const custom = this.smartDevicesSentToGoogle[devId].customData;
            let idIsAttr = false;
            for (const attr in custom) {
                if (!Object.prototype.hasOwnProperty.call(custom, attr)) {
                    continue;
                }
                if (attr?.startsWith('get_')) {
                    if (custom[attr] === id) {
                        idIsAttr = true;
                    } else {
                        continue;
                    }
                    const _attr = attr.substring(4);
                    json[devId] ||= {};
                    json[devId][_attr] = { id: custom[attr] };
                }
            }

            if (!idIsAttr) {
                continue;
            }

            for (const attr in custom) {
                if (!Object.prototype.hasOwnProperty.call(custom, attr)) {
                    continue;
                }
                if (custom[attr] !== id || !attr?.startsWith('get_')) {
                    continue;
                }

                const _attr = attr.substring(4);
                let val: ReportedValue;
                json[devId] ||= {};

                try {
                    if (_attr === 'on') {
                        val =
                            state.val === 1 ||
                            state.val === '1' ||
                            state.val === 'true' ||
                            state.val === 'ON' ||
                            state.val === 'on' ||
                            state.val === true ||
                            (typeof state.val === 'number' && state.val > 0);
                    } else if (_attr === 'color_R' || _attr === 'color_G' || _attr === 'color_B') {
                        const colorR = json[devId].color_R as GHUpdateAttrRef | undefined;
                        const colorG = json[devId].color_G as GHUpdateAttrRef | undefined;
                        const colorB = json[devId].color_B as GHUpdateAttrRef | undefined;
                        if (!colorR && !!colorG && !colorB) {
                            this.adapter.log.warn(
                                `[GHOME] Invalid structure for "${devId}": ${JSON.stringify(json[devId])}`,
                            );
                            val = this.reportedStates[devId]?.[_attr]?.val;
                        } else {
                            const r = colorR ? await this.adapter.getForeignStateAsync(colorR.id) : { val: 0 };
                            const g = colorG ? await this.adapter.getForeignStateAsync(colorG.id) : { val: 0 };
                            const b = colorB ? await this.adapter.getForeignStateAsync(colorB.id) : { val: 0 };
                            const rv = (r?.val as number) || 0;
                            const gv = (g?.val as number) || 0;
                            const bv = (b?.val as number) || 0;
                            const spectrumRgb = (rv << 16) + (gv << 8) + bv;
                            val = Math.floor(spectrumRgb);
                        }
                    } else if (_attr === 'color_hue') {
                        json[devId].color ||= {};
                        const hueRef = json[devId].color_hue as GHUpdateAttrRef | undefined;
                        const satRef = json[devId].color_saturation as GHUpdateAttrRef | undefined;
                        const briRef = json[devId].brightness as GHUpdateAttrRef | undefined;
                        const hue = hueRef ? await this.adapter.getForeignStateAsync(hueRef.id) : { val: 0 };
                        const sat = satRef ? await this.adapter.getForeignStateAsync(satRef.id) : { val: 0 };
                        const value = briRef ? await this.adapter.getForeignStateAsync(briRef.id) : { val: 0 };
                        const h = ((hue?.val as number) || 0) / 360;
                        const s = ((sat?.val as number) || 0) / 255;
                        const v = ((value?.val as number) || 0) / 100;
                        const i = Math.floor(h * 6);
                        const f = h * 6 - i;
                        const p = v * (1 - s);
                        const q = v * (1 - f * s);
                        const t = v * (1 - (1 - f) * s);

                        let r = 0;
                        let g = 0;
                        let b = 0;
                        switch (i % 6) {
                            case 0:
                                r = v;
                                g = t;
                                b = p;
                                break;
                            case 1:
                                r = q;
                                g = v;
                                b = p;
                                break;
                            case 2:
                                r = p;
                                g = v;
                                b = t;
                                break;
                            case 3:
                                r = p;
                                g = q;
                                b = v;
                                break;
                            case 4:
                                r = t;
                                g = p;
                                b = v;
                                break;
                            case 5:
                                r = v;
                                g = p;
                                b = q;
                                break;
                        }
                        val = (r << 16) | (g << 8) | b;
                    } else if (_attr === 'color_spectrumRGB') {
                        const rgb = state.val;
                        json[devId].color ||= {};
                        if (typeof rgb === 'string') {
                            val = parseInt(rgb.substring(1), 16) || 0;
                        } else {
                            val = rgb as number;
                        }
                    } else if (_attr === 'color_temperature') {
                        const temp = state.val as number;
                        val = Math.floor(temp) || 0;
                    } else if (_attr === 'isLocked') {
                        val = !!state.val;
                    } else if (_attr === 'openDirection') {
                        val = state.val === 2 ? 'DOWN' : 'UP';
                    } else if (_attr === 'openPercent') {
                        if (state.val === true || state.val === false) {
                            val = state.val === false ? 100 : 0;
                        } else {
                            val = parseInt(state.val as unknown as string) || 0;
                        }
                    } else {
                        val = state.val;
                    }

                    const customId = custom[attr];
                    if (this.smartDevices[devId].conv2GH?.[customId]) {
                        try {
                            const conv = new Function('value', this.smartDevices[devId].conv2GH[customId]);
                            val = conv(val) as ReportedValue;
                        } catch {
                            this.adapter.log.error(
                                `Invalid convert function in ${devId}/${customId}: ${this.smartDevices[devId].conv2GH[customId]}`,
                            );
                        }
                    }

                    if (this.reportedStates[devId]?.[_attr]?.val !== val) {
                        this.reportedStates[devId] ||= {};
                        this.reportedStates[devId][_attr] ||= { val: undefined, ts: 0 };
                        this.reportedStates[devId][_attr].val = val;
                        this.reportedStates[devId][_attr].ts = now;
                        json[devId] ||= {};
                        if (_attr.includes('color_')) {
                            const color = (json[devId].color ||= {});
                            if (_attr === 'color_temperature') {
                                color.temperatureK = Math.floor(val as number);
                            } else {
                                color.spectrumRgb = val as number;
                            }
                        } else if (_attr.substring(4).split('_').length > 1) {
                            const attrArray = _attr.substring(4).split('_');
                            const dest = json[devId] as Record<string, Record<string, ReportedValue>>;
                            dest[attrArray[0]] ||= {};
                            dest[attrArray[0]][attrArray[1]] = val;
                        } else {
                            json[devId][_attr] = val;
                        }
                        found = true;
                    }
                } catch (error) {
                    this.adapter.log.error(`[GHOME] ${(error as Error)?.message} ${(error as Error)?.stack}`);
                }
            }
        }

        if (found && this.urlKey) {
            const ts = Date.now();

            let i = 0;
            while (i < this.rateCalculation.length) {
                if (ts - this.rateCalculation[i] < 60000) {
                    break;
                }
                i++;
            }
            if (i) {
                if (i < this.rateCalculation.length) {
                    this.rateCalculation.splice(0, i);
                } else {
                    this.rateCalculation = [];
                }
            }

            if (this.rateCalculation.length > 60) {
                this.adapter.log.warn(`[GHOME] Sending too fast: ${this.rateCalculation.length} in last minute!`);
                return;
            }

            this.rateCalculation.push(ts);

            const url = `${URL_STATUS}?user=${encodeURIComponent((this.adapter.config as IotAdapterConfig).login)}&urlKey=${encodeURIComponent(this.urlKey.key)}&p=${PROTOCOL_VERSION}&v=${this.adapter.version || ''}`;
            try {
                const response = await axios.post(url, json, { validateStatus: status => status === 200 });
                if (this.unknownDevices[id]) {
                    delete this.unknownDevices[id];
                }
                this.adapter.log.debug(
                    `[GHOME] Status reported:  ${JSON.stringify(json)}  ${JSON.stringify(response.data)}`,
                );
            } catch (error) {
                const err = error as {
                    response?: { status?: number; data?: unknown; body?: unknown };
                    request?: unknown;
                    message?: string;
                };
                if (err.response?.status === 404) {
                    this.adapter.log.error(`[GHOME] device ${id} is unknown to google home`);
                    this.unknownDevices[id] = Date.now();
                } else if (err.response?.status === 401) {
                    this.adapter.log.error(`[GHOME] auth error: ${JSON.stringify(err.response.body)}`);
                    this.urlKeyOk = false;
                } else if (err.response?.status === 410) {
                    this.adapter.log.error(`[GHOME] invalid protocol version: ${JSON.stringify(err.response.body)}`);
                    this.urlKeyOk = false;
                } else {
                    let errorMessage: unknown;
                    if (err.response) {
                        errorMessage = err.response.data || err.response.status;
                    } else if (err.request) {
                        errorMessage = 'No answer';
                    } else {
                        errorMessage = err.message;
                    }
                    this.adapter.log.error(`[GHOME] Cannot updateState: ${JSON.stringify(errorMessage)}`);
                    this.adapter.log.debug(`[GHOME] ${JSON.stringify(json)}`);
                }
            }
        }
    }

    async updateStates(json?: GHUpdateMap): Promise<void> {
        if (!this.urlKeyOk || !this.urlKey) {
            return;
        }
        if (!json) {
            json = {};
            for (const devId in this.smartDevicesSentToGoogle) {
                if (!Object.prototype.hasOwnProperty.call(this.smartDevicesSentToGoogle, devId)) {
                    continue;
                }
                const custom = this.smartDevicesSentToGoogle[devId].customData;
                for (const attr in custom) {
                    if (!Object.prototype.hasOwnProperty.call(custom, attr)) {
                        continue;
                    }
                    if (attr?.startsWith('get_')) {
                        const _attr = attr.substring(4);
                        json[devId] ||= {};
                        json[devId][_attr] = { id: custom[attr] };
                    }
                }
            }
        }

        for (const devId in json) {
            try {
                if (!Object.prototype.hasOwnProperty.call(json, devId)) {
                    continue;
                }

                for (const attr in json[devId]) {
                    if (!Object.prototype.hasOwnProperty.call(json[devId], attr)) {
                        continue;
                    }

                    const attrRef = json[devId][attr] as GHUpdateAttrRef | undefined;
                    if (typeof attrRef === 'object' && attrRef !== null && attrRef.id) {
                        let state = await this.adapter.getForeignStateAsync(attrRef.id);
                        if (state == null || state.val === null || state.val === '') {
                            delete json[devId][attr];
                            if (Object.keys(json[devId]).length === 0) {
                                delete json[devId];
                            }
                            continue;
                        }

                        state ||= { val: false } as ioBroker.State;

                        if (this.smartDevices[devId].conv2GH?.[attrRef.id]) {
                            try {
                                const conv = new Function('value', this.smartDevices[devId].conv2GH[attrRef.id]);
                                state.val = conv(state.val) as ioBroker.StateValue;
                            } catch {
                                this.adapter.log.error(
                                    `Invalid convert function in ${devId}/${attr}: ${this.smartDevices[devId].conv2GH[attrRef.id]}`,
                                );
                            }
                        }
                        if (attr === 'on') {
                            json[devId][attr] =
                                state.val === 1 ||
                                state.val === '1' ||
                                state.val === 'true' ||
                                state.val === 'ON' ||
                                state.val === 'on' ||
                                state.val === true ||
                                (typeof state.val === 'number' && state.val > 0);
                        } else if (attr === 'color_R' || attr === 'color_G' || attr === 'color_B') {
                            const colorR = json[devId].color_R as GHUpdateAttrRef | undefined;
                            const colorG = json[devId].color_G as GHUpdateAttrRef | undefined;
                            const colorB = json[devId].color_B as GHUpdateAttrRef | undefined;
                            const r = colorR ? await this.adapter.getForeignStateAsync(colorR.id) : { val: 0 };
                            const g = colorG ? await this.adapter.getForeignStateAsync(colorG.id) : { val: 0 };
                            const b = colorB ? await this.adapter.getForeignStateAsync(colorB.id) : { val: 0 };
                            const rv = (r?.val as number) || 0;
                            const gv = (g?.val as number) || 0;
                            const bv = (b?.val as number) || 0;
                            const spectrumRgb = (rv << 16) | (gv << 8) | bv;
                            json[devId].color ||= {};
                            json[devId].color.spectrumRgb = Math.floor(spectrumRgb);
                            delete json[devId].color_R;
                            delete json[devId].color_G;
                            delete json[devId].color_B;
                        } else if (attr === 'color_hue') {
                            json[devId].color ||= {};
                            const hueRef = json[devId].color_hue as GHUpdateAttrRef | undefined;
                            const satRef = json[devId].color_saturation as GHUpdateAttrRef | undefined;
                            const briRef = json[devId].brightness as GHUpdateAttrRef | undefined;
                            if (hueRef && satRef && briRef) {
                                try {
                                    const hue = await this.adapter.getForeignStateAsync(hueRef.id);
                                    const sat = await this.adapter.getForeignStateAsync(satRef.id);
                                    const val = await this.adapter.getForeignStateAsync(briRef.id);
                                    const h = ((hue?.val as number) || 0) / 360;
                                    const s = ((sat?.val as number) || 0) / 255;
                                    const v = ((val?.val as number) || 0) / 100;
                                    const i = Math.floor(h * 6);
                                    const f = h * 6 - i;
                                    const p = v * (1 - s);
                                    const q = v * (1 - f * s);
                                    const t = v * (1 - (1 - f) * s);
                                    let r = 0,
                                        g = 0,
                                        b = 0;
                                    switch (i % 6) {
                                        case 0:
                                            r = v;
                                            g = t;
                                            b = p;
                                            break;
                                        case 1:
                                            r = q;
                                            g = v;
                                            b = p;
                                            break;
                                        case 2:
                                            r = p;
                                            g = v;
                                            b = t;
                                            break;
                                        case 3:
                                            r = p;
                                            g = q;
                                            b = v;
                                            break;
                                        case 4:
                                            r = t;
                                            g = p;
                                            b = v;
                                            break;
                                        case 5:
                                            r = v;
                                            g = p;
                                            b = q;
                                            break;
                                    }
                                    json[devId].color.spectrumRgb = (r << 16) | (g << 8) | b;
                                } catch (error) {
                                    this.adapter.log.error(`[GHOME] ${error as string}`);
                                }
                            }
                            delete json[devId].color_hue;
                            delete json[devId].color_saturation;
                            delete json[devId].brightness;
                        } else if (attr === 'color_spectrumRGB') {
                            const rgb = state.val;
                            json[devId].color ||= {};
                            if (typeof rgb === 'string') {
                                json[devId].color.spectrumRgb = parseInt(rgb.substring(1), 16) || 0;
                            } else {
                                json[devId].color.spectrumRgb = rgb as number;
                            }
                            delete json[devId][attr];
                        } else if (attr === 'color_temperature') {
                            const temp = state.val as number;
                            json[devId].color ||= {};
                            json[devId].color.temperatureK = Math.floor(temp);
                            delete json[devId][attr];
                        } else if (attr === 'isLocked') {
                            json[devId][attr] = !!state.val;
                        } else if (attr === 'openDirection') {
                            json[devId][attr] = state.val === 2 ? 'DOWN' : 'UP';
                        } else if (attr === 'openPercent') {
                            if (state.val === true || state.val === false || isNaN(state.val as number)) {
                                json[devId][attr] = state.val === false ? 100 : 0;
                            } else {
                                json[devId][attr] = parseInt(state.val as unknown as string) || 0;
                            }
                        } else if (attr === 'thermostatTemperatureSetpoint') {
                            json[devId][attr] = state.val;
                            const ambient = json[devId].thermostatTemperatureAmbient as number | undefined;
                            const setpoint = json[devId].thermostatTemperatureSetpoint as number | undefined;
                            if (ambient !== undefined && setpoint !== undefined && ambient > setpoint) {
                                json[devId].thermostatMode = 'cool';
                            } else {
                                json[devId].thermostatMode = 'heat';
                            }
                        } else {
                            if (attr.split('_').length > 1) {
                                const attrArray = attr.split('_');
                                delete json[devId][attr];
                                const dest = json[devId] as Record<string, Record<string, ioBroker.StateValue>>;
                                dest[attrArray[0]] ||= {};
                                dest[attrArray[0]][attrArray[1]] = state.val;
                            } else {
                                if (!isNaN(state.val as number)) {
                                    state.val = Math.floor(state.val as number);
                                }
                                json[devId][attr] = state.val;
                            }
                        }
                    }
                }
            } catch (error) {
                this.adapter.log.error(`[GHOME] ${error as string}`);
                this.adapter.log.error(`[GHOME] ${(error as Error)?.stack}`);
            }
        }

        const url = `${URL_STATUS}?user=${encodeURIComponent((this.adapter.config as IotAdapterConfig).login)}&urlKey=${encodeURIComponent(this.urlKey.key)}&p=${PROTOCOL_VERSION}&v=${this.adapter.version || ''}`;
        const sendRequest = async (): Promise<void> => {
            try {
                const response = await axios.post(url, json, { validateStatus: status => status === 200 });
                Object.keys(this.unknownDevices).forEach(id => {
                    if (this.unknownDevices[id]) {
                        delete this.unknownDevices[id];
                    }
                });
                this.adapter.log.debug(`[GHOME] Status reported: ${JSON.stringify(response.data)}`);
            } catch (error) {
                const err = error as {
                    response?: { status?: number; data?: unknown };
                    request?: unknown;
                    message?: string;
                };
                if (err.response?.status === 404) {
                    this.adapter.log.error('[GHOME] devices are unknown to google home');
                    Object.keys(this.unknownDevices).forEach(id => (this.unknownDevices[id] = Date.now()));
                } else if (err.response?.status === 401) {
                    this.adapter.log.error(`[GHOME] auth error: ${JSON.stringify(err.response.data)}`);
                    this.urlKeyOk = false;
                } else if (err.response?.status === 410) {
                    this.adapter.log.error(`[GHOME] invalid protocol version: ${JSON.stringify(err.response.data)}`);
                    this.urlKeyOk = false;
                } else {
                    let errorMessage: unknown;
                    if (err.response) {
                        errorMessage = err.response.data || err.response.status;
                    } else if (err.request) {
                        errorMessage = 'No answer';
                    } else {
                        errorMessage = err.message;
                    }
                    this.adapter.log.error(`[GHOME] Cannot updateStates: ${errorMessage as string}`);
                    this.adapter.log.debug(`[GHOME] ${JSON.stringify(json)}`);
                }
            }
        };
        setTimeout(() => void sendRequest(), 100);
    }

    sync(requestId: string): GHSyncResponse {
        this.smartDevicesSentToGoogle = {};
        const devicesArray: GHDevice[] = [];
        Object.keys(this.smartDevices).forEach(id => {
            const d = this.smartDevices[id];
            if (!d.merged) {
                if (d.name?.name && d.type && d.traits && d.traits.length > 0) {
                    const dev = JSON.parse(JSON.stringify(d)) as GHDevice;
                    delete dev.displayTraits;
                    delete dev.displayAttributes;
                    delete dev.smartEnum;
                    delete dev.ioType;
                    delete dev.parentId;
                    delete dev.conv2GH;
                    delete dev.displayConv2GH;
                    delete dev.conv2iob;
                    delete dev.displayConv2iob;
                    devicesArray.push(dev);
                } else if (!d.parentId) {
                    this.adapter.log.warn(`[GHOME] Missing name, type or treat for: ${id}. Not added to GoogleHome`);
                    this.adapter.log.debug(`[GHOME] ${JSON.stringify(d)}`);
                }
            }
        });

        if (devicesArray.length === 0) {
            this.adapter.log.warn(
                '[GHOME] No devices defined. Did you add no sensors or indicate states to rooms and enums?',
            );
        }

        devicesArray.forEach(element => (this.smartDevicesSentToGoogle[element.id] = element));

        if (this.tasksTimer) {
            clearTimeout(this.tasksTimer);
        }
        this.tasksTimer = setTimeout(() => void this.updateStates(), 6000);

        return {
            requestId,
            payload: {
                agentUserId: this.agentUserId,
                devices: devicesArray,
            },
        };
    }

    async getStates(ids: string[]): Promise<Record<string, ioBroker.StateValue | undefined>> {
        const states: Record<string, ioBroker.StateValue | undefined> = {};
        const results = await Promise.all(ids.map(id => this.adapter.getForeignStateAsync(id).catch(() => null)));
        ids.forEach((id, idx) => {
            states[id] = results[idx]?.val;
        });
        return states;
    }

    async query(requestId: string, devices: { id: string }[]): Promise<GHQueryResponse> {
        const responseDev: Record<string, GHQueryDeviceState> = {};
        const ids: string[] = [];
        try {
            devices.forEach(dev => {
                if (this.smartDevices[dev.id]) {
                    const attrs = this.smartDevices[dev.id].customData;
                    if (attrs) {
                        Object.keys(attrs).forEach(attr => {
                            const v = attrs[attr];
                            if (attr?.startsWith('get_') && v !== undefined && !ids.includes(v)) {
                                ids.push(v);
                            }
                        });
                    } else {
                        this.adapter.log.error(
                            `[GHOME] No Google Home customData for ${dev.id} cannot handle Google Request.`,
                        );
                    }
                }
            });

            const states = await this.getStates(ids);
            devices.forEach(dev => {
                if (!this.smartDevices[dev.id]) {
                    responseDev[dev.id] = { online: false };
                    return;
                }
                responseDev[dev.id] = { online: true };
                const attrs = this.smartDevices[dev.id].customData;
                if (!attrs) {
                    this.adapter.log.error(
                        `[GHOME] No Google Home customData for ${dev.id} cannot handle Google Request.`,
                    );
                    return;
                }
                Object.keys(attrs).forEach(attr => {
                    if (!attr?.startsWith('get_')) {
                        return;
                    }
                    const targetId = attrs[attr]!;
                    if (this.smartDevices[dev.id].conv2GH?.[targetId]) {
                        try {
                            const conv = new Function('value', this.smartDevices[dev.id].conv2GH![targetId]);
                            states[targetId] = conv(states[targetId]);
                        } catch {
                            this.adapter.log.error(
                                `Invalid convert function in ${dev.id}/${targetId}: ${this.smartDevices[dev.id].conv2GH![targetId]}`,
                            );
                        }
                    }
                    if (attr.substring(4).split('_').length > 1) {
                        const attrArray = attr.substring(4).split('_');
                        if (attr === 'get_color_R' || attr === 'get_color_G' || attr === 'get_color_B') {
                            const r = (states[attrs.get_color_R!] as number) || 0;
                            const g = (states[attrs.get_color_G!] as number) || 0;
                            const b = (states[attrs.get_color_B!] as number) || 0;
                            const spectrumRgb = (r << 16) + (g << 8) + b;
                            responseDev[dev.id].color ||= {};
                            responseDev[dev.id].color!.spectrumRgb = spectrumRgb;
                        } else if (attr === 'get_color_hue') {
                            responseDev[dev.id].color ||= {};
                            const h = ((states[attrs.get_color_hue!] as number) || 0) / 360;
                            const s = ((states[attrs.get_color_saturation!] as number) || 0) / 255;
                            const v = ((states[attrs.get_brightness!] as number) || 0) / 100;
                            const i = Math.floor(h * 6);
                            const f = h * 6 - i;
                            const p = v * (1 - s);
                            const q = v * (1 - f * s);
                            const t = v * (1 - (1 - f) * s);
                            let r = 0;
                            let g = 0;
                            let b = 0;
                            switch (i % 6) {
                                case 0:
                                    r = v;
                                    g = t;
                                    b = p;
                                    break;
                                case 1:
                                    r = q;
                                    g = v;
                                    b = p;
                                    break;
                                case 2:
                                    r = p;
                                    g = v;
                                    b = t;
                                    break;
                                case 3:
                                    r = p;
                                    g = q;
                                    b = v;
                                    break;
                                case 4:
                                    r = t;
                                    g = p;
                                    b = v;
                                    break;
                                case 5:
                                    r = v;
                                    g = p;
                                    b = q;
                                    break;
                            }
                            responseDev[dev.id].color!.spectrumRgb = (r << 16) | (g << 8) | b;
                        } else if (attr === 'get_color_spectrumRGB') {
                            const rgb = states[attrs.get_color_spectrumRGB!];
                            responseDev[dev.id].color ||= {};
                            if (typeof rgb === 'string') {
                                responseDev[dev.id].color!.spectrumRgb = parseInt(rgb.substring(1), 16) || 0;
                            } else {
                                responseDev[dev.id].color!.spectrumRgb = rgb as number;
                            }
                        } else {
                            const dest = responseDev[dev.id] as Record<string, Record<string, unknown>>;
                            dest[attrArray[0]] ||= {};
                            dest[attrArray[0]][attrArray[1]] = states[targetId];
                        }
                    } else {
                        if (attr === 'get_isLocked' && states[targetId] !== true && states[targetId] !== false) {
                            (responseDev[dev.id] as Record<string, unknown>)[attr.substring(4)] =
                                states[targetId] === 0;
                        }
                        if (attr === 'get_openPercent' && (states[targetId] === true || states[targetId] === false)) {
                            (responseDev[dev.id] as Record<string, unknown>)[attr.substring(4)] =
                                states[targetId] === true ? 0 : 100;
                        } else {
                            (responseDev[dev.id] as Record<string, unknown>)[attr.substring(4)] = states[targetId];
                        }
                    }
                });
                if (responseDev[dev.id].thermostatTemperatureSetpoint !== undefined) {
                    if (
                        (responseDev[dev.id].thermostatTemperatureAmbient as number) >
                        (responseDev[dev.id].thermostatTemperatureSetpoint as number)
                    ) {
                        responseDev[dev.id].thermostatMode = 'cool';
                    } else {
                        responseDev[dev.id].thermostatMode = 'heat';
                    }
                }
            });
        } catch (error) {
            this.adapter.log.error(`[GHOME] ${(error as Error)?.stack}`);
            this.adapter.log.error(`[GHOME] ${JSON.stringify(devices)}`);
            this.adapter.log.error(`[GHOME] ${(ids || []).toString()}`);
        }
        return { requestId, payload: { devices: responseDev } };
    }

    async setStates(
        tasks: { id: string; val: ioBroker.StateValue; cmd?: string; devId: string; param: string }[],
    ): Promise<Record<string, Record<string, ioBroker.StateValue | string | Error>>> {
        const results: Record<string, Record<string, ioBroker.StateValue | string | Error>> = {};
        for (const task of tasks) {
            this.adapter.log.debug(`[GHOME] setState: ${JSON.stringify(task)}`);
            try {
                if (task.cmd === 'action.devices.commands.SetToggles') {
                    const state = await this.adapter.getForeignStateAsync(task.id);
                    const val = !state?.val;
                    await this.adapter.setForeignStateAsync(task.id, val);
                    results[task.devId] ||= {};
                    results[task.devId][task.param] = val;
                } else {
                    await this.adapter.setForeignStateAsync(task.id, task.val);
                    results[task.devId] ||= {};
                    results[task.devId][task.param] = task.val;
                }
            } catch (error) {
                results[task.devId] ||= {};
                results[task.devId].error = error as Error;
            }
        }
        return results;
    }

    async execute(requestId: string, commands: GHCommand[]): Promise<GHExecuteResponse | { error: string }> {
        if (!commands) {
            this.adapter.log.error('[GHOME] Invalid parameter commands - NULL');
            return { error: 'Invalid parameter' };
        }

        const tasks: { id: string; val: ioBroker.StateValue; cmd?: string; devId: string; param: string }[] = [];
        commands.forEach(command => {
            command.execution.forEach(execute => {
                this.adapter.log.debug(`[GHOME] execute ${execute.command} => ${JSON.stringify(execute.params)}`);

                command.devices.forEach(dev => {
                    if (!this.smartDevices[dev.id]) {
                        return;
                    }
                    const attrs = this.smartDevices[dev.id].customData;
                    if (!attrs) {
                        this.adapter.log.error(
                            `[GHOME] Try to control ${dev.id}, but the device is not configured for Google Home`,
                        );
                        return;
                    }

                    if (execute.command === 'action.devices.commands.SetToggles') {
                        if (attrs.set_on) {
                            tasks.push({
                                id: attrs.set_on,
                                cmd: execute.command,
                                param: 'on',
                                devId: dev.id,
                                val: null,
                            });
                        }
                        return;
                    }

                    if (
                        (typeof execute.params === 'undefined' ||
                            execute.command === 'action.devices.commands.ActivateScene') &&
                        execute.command
                    ) {
                        const cmd = execute.command.split('.').pop()!;
                        execute.params = {} as GHExecuteParams;
                        execute.params[cmd] = !execute.params.deactivate;
                    }

                    Object.keys(execute.params).forEach(param => {
                        const paths: { path: string; val: ioBroker.StateValue }[] = [];
                        const paramValue = execute.params[param];
                        if (paramValue && typeof paramValue === 'object') {
                            Object.keys(paramValue as Record<string, unknown>).forEach(subElement => {
                                if (subElement === 'spectrumRGB' && attrs.set_color_R) {
                                    const rgb = parseInt(String(execute.params.color?.spectrumRGB)) || 0;
                                    paths.push({ path: 'color_R', val: (rgb & 0xff0000) >> 16 });
                                    paths.push({ path: 'color_G', val: (rgb & 0x00ff00) >> 8 });
                                    paths.push({ path: 'color_B', val: rgb & 0x0000ff });
                                } else if (subElement === 'spectrumRGB' && attrs.set_color_hue) {
                                    const rgb = parseInt(String(execute.params.color?.spectrumRGB)) || 0;
                                    const r = ((rgb & 0xff0000) >> 16) / 255;
                                    const g = ((rgb & 0x00ff00) >> 8) / 255;
                                    const b = (rgb & 0x0000ff) / 255;

                                    const max = Math.max(r, g, b);
                                    const min = Math.min(r, g, b);
                                    let h = 0;
                                    const v = max;
                                    const d = max - min;
                                    const s = max ? d / max : 0;

                                    if (max === min) {
                                        h = 0;
                                    } else {
                                        switch (max) {
                                            case r:
                                                h = (g - b) / d + (g < b ? 6 : 0);
                                                break;
                                            case g:
                                                h = (b - r) / d + 2;
                                                break;
                                            case b:
                                                h = (r - g) / d + 4;
                                                break;
                                        }
                                        h /= 6;
                                    }
                                    paths.push({ path: 'color_hue', val: h });
                                    paths.push({ path: 'color_saturation', val: s });
                                    paths.push({ path: 'brightness', val: v });
                                } else if (subElement === 'spectrumRGB') {
                                    const rgb = parseInt(String(execute.params.color?.spectrumRGB)) || 0;
                                    paths.push({
                                        path: 'color_spectrumRGB',
                                        val: `#${`000000${rgb.toString(16)}`.slice(-6)}`,
                                    });
                                } else {
                                    paths.push({
                                        path: `${param}_${subElement}`,
                                        val: (paramValue as Record<string, ioBroker.StateValue>)[subElement],
                                    });
                                }
                            });
                        } else {
                            if (param === 'on' && attrs[`set_${param}`] === attrs.set_brightness) {
                                paths.push({ path: param, val: paramValue ? 100 : 0 });
                            } else {
                                paths.push({ path: param, val: paramValue as ioBroker.StateValue });
                            }
                        }

                        paths.forEach(element => {
                            const targetSetId = attrs[`set_${element.path}`];
                            if (!targetSetId) {
                                return;
                            }
                            if (this.smartDevices[dev.id].conv2iob?.[targetSetId]) {
                                try {
                                    const conv = new Function(
                                        'value',
                                        this.smartDevices[dev.id].conv2iob![targetSetId],
                                    );
                                    element.val = conv(element.val) as ioBroker.StateValue;
                                } catch {
                                    this.adapter.log.error(
                                        `Invalid convert function in ${dev.id}/${targetSetId}: ${this.smartDevices[dev.id].conv2iob![targetSetId]}`,
                                    );
                                }
                            }
                            tasks.push({ id: targetSetId, val: element.val, param, devId: dev.id });
                        });
                    });
                });
            });
        });

        const results = await this.setStates(tasks);
        const responseCommands: GHExecuteResult[] = Object.keys(results).map(devId => {
            const r = results[devId];
            if (r.error) {
                return { ids: [devId], status: 'ERROR', errorCode: String(r.error) };
            }
            return { ids: [devId], status: 'SUCCESS', states: r as Record<string, unknown> };
        });

        return { requestId, payload: { commands: responseCommands } };
    }

    async process(request: GHRequest | undefined, isEnabled: boolean): Promise<GHIntentResponse> {
        if (!request) {
            this.adapter.log.error('[GHOME] Invalid request: no request!');
            return {};
        }

        if (!isEnabled) {
            return { error: textsT(this.lang, 'The service deactivated'), errorCode: 501 };
        }

        if (!request.inputs || !request.inputs.length) {
            return { error: textsT(this.lang, 'missing inputs'), errorCode: 401 };
        }

        for (let i = 0; i < request.inputs.length; i++) {
            const input = request.inputs[i];
            const intent = input.intent;
            if (!intent) {
                continue;
            }

            this.adapter.log.debug(`[GHOME] Received ${intent}`);

            switch (intent) {
                case 'action.devices.SYNC':
                    return this.sync(request.requestId || '');

                case 'action.devices.QUERY':
                    return this.query(request.requestId || '', input.payload?.devices ?? []);

                case 'action.devices.EXECUTE':
                    return this.execute(request.requestId || '', input.payload?.commands ?? []);

                case 'action.devices.DISCONNECT':
                    this.adapter.log.info('[GHOME] Google home unlinked!');
                    return {};

                default:
                    return { error: textsT(this.lang, 'missing intent'), errorCode: 401 };
            }
        }

        return { error: textsT(this.lang, 'missing inputs'), errorCode: 401 };
    }
}
