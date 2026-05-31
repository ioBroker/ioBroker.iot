import ChannelDetector, { Types, type DetectOptions, type PatternControl } from '@iobroker/type-detector';
import axios from 'axios';
import { randomUUID } from 'node:crypto';

import textsT from './texts';
import roomsT from './rooms';
import funcsT from './functions';
import type { IotAdapterConfig } from './types';

const ignoreIds: RegExp[] = [/^system\./, /^script\./];

function replaceInvalidChars(name: string): string {
    return name
        .replace(/[^a-zA-Z0-9А-Яа-я_]/g, '_')
        .replace(/Ü/g, 'UE')
        .replace(/Ä/g, 'AE')
        .replace(/Ö/g, 'OE')
        .replace(/ü/g, 'ue')
        .replace(/ä/g, 'ae')
        .replace(/ö/g, 'oe')
        .replace(/ß/g, 'ss');
}

const typesMapping: Record<string, string> = {
    on_off: 'OnOff',
    color_setting: 'RGB',
    'range_unit.percent': 'Brightness',
    'range_unit.temperature.celsius': 'setTargetTemperature',
    'float_temperature_unit.temperature.celsius': 'getActualTemperature',
    'float_temperature_unit.temperature.kelvin': 'getActualTemperature',
    'float_humidity_unit.percent': 'getActualHumidity',
    bool_motion: 'getMotion',
    bool_censor: 'getContact',
};

const URL_STATUS = 'https://20k0wcmzs4.execute-api.eu-west-1.amazonaws.com/default/alisaStatus';
const PROTOCOL_VERSION = 1;
const RETRY_UNKNOWN_DEVICES_INTERVAL = 10 * 60000; // 10 minutes

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

// See https://yandex.ru/dev/dialogs/smart-home/doc/concepts/response-codes.html
type AlisaErrorCode =
    | 'DOOR_OPEN'
    | 'LID_OPEN'
    | 'REMOTE_CONTROL_DISABLED'
    | 'NOT_ENOUGH_WATER'
    | 'LOW_CHARGE_LEVEL'
    | 'CONTAINER_FULL'
    | 'CONTAINER_EMPTY'
    | 'DRIP_TRAY_FULL'
    | 'DEVICE_STUCK'
    | 'DEVICE_OFF'
    | 'FIRMWARE_OUT_OF_DATE'
    | 'NOT_ENOUGH_DETERGENT'
    | 'HUMAN_INVOLVEMENT_NEEDED'
    | 'DEVICE_UNREACHABLE'
    | 'DEVICE_BUSY'
    | 'INTERNAL_ERROR'
    | 'INVALID_ACTION'
    | 'INVALID_VALUE'
    | 'NOT_SUPPORTED_IN_CURRENT_MODE'
    | 'ACCOUNT_LINKING_ERROR'
    | 'DEVICE_NOT_FOUND';

interface AlisaActionResult {
    status: 'DONE' | 'ERROR';
    error_code?: AlisaErrorCode;
    error_message?: string;
}

// HSV color value used by color_setting.
interface AlisaHSV {
    h: number;
    s: number;
    v: number;
}

// Union of all valid capability state value shapes across capability types
// (on_off=boolean, range=number, mode/scene/rgb-as-string=string, color_setting hsv=AlisaHSV).
type AlisaCapabilityValue = boolean | number | string | AlisaHSV;

interface AlisaCapabilityState {
    instance: string;
    value: AlisaCapabilityValue;
    relative?: boolean;
    action_result?: AlisaActionResult;
}

// Flat shape that covers every devices.capabilities.* parameter set
// (https://yandex.ru/dev/dialogs/smart-home/doc/concepts/capability-types.html).
interface AlisaCapabilityParameters {
    instance?: string;
    // range
    unit?: string;
    random_access?: boolean;
    range?: { min: number; max: number; precision?: number };
    // mode
    modes?: { value: string }[];
    // on_off
    split?: boolean;
    // color_setting
    color_model?: 'rgb' | 'hsv';
    temperature_k?: { min: number; max: number; precision?: number };
    color_scene?: { scenes: { id: string }[] };
}

interface AlisaCapability {
    type: string;
    retrievable?: boolean;
    parameters?: AlisaCapabilityParameters;
    state?: AlisaCapabilityState;
}

// Flat shape that covers every devices.properties.* parameter set.
interface AlisaPropertyParameters {
    instance?: string;
    unit?: string;
    events?: { value: string }[];
}

interface AlisaPropertyState {
    instance: string;
    value: number | string | boolean;
}

interface AlisaProperty {
    type: string;
    retrievable?: boolean;
    parameters?: AlisaPropertyParameters;
    state?: AlisaPropertyState;
}

interface AlisaAttribute {
    attribute: string;
    getId?: string | null;
    setId?: string | null;
    type?: ioBroker.CommonType;
    min?: number;
    max?: number;
    states?: Record<string | number, string>;
}

interface AlisaStateRef {
    setId: string | null;
    getId: string | null;
    openId?: string;
    type?: ioBroker.CommonType;
    min?: number;
    max?: number;
}

interface AlisaContext {
    id: string;
    type: string;
    name: string;
    description: string;
    room: string | undefined;
    custom_data: { entity_id: string };
    capabilities: AlisaCapability[];
    properties: AlisaProperty[];
    device_info: {
        manufacturer: string;
        model: string;
        hw_version: string;
        sw_version: string;
    };
}

interface AlisaEntity {
    entity_id: string;
    attributes: {
        friendly_name: string;
        unit_of_measurement?: string;
        icon?: string;
    };
    context: AlisaContext;
    COMMANDS: {
        get_state?: (entity: AlisaEntity) => Promise<unknown>;
        set_state?: (entity: AlisaEntity, data: AlisaActionData) => Promise<AlisaActionData>;
    };
    ATTRIBUTES: AlisaAttribute[];
    STATE: AlisaStateRef;
}

interface AlisaActionData {
    id: string;
    capabilities: AlisaCapability[];
    action_result?: AlisaActionResult;
}

// Per-device snapshot returned by the /devices/query and updateState payloads.
// Yandex docs: https://yandex.ru/dev/dialogs/smart-home/doc/concepts/payloads.html
interface AlisaDeviceStateSnapshot {
    id: string;
    capabilities?: { type: string; state: AlisaCapabilityState }[];
    properties?: { type: string; state: AlisaPropertyState }[];
    error_code?: AlisaErrorCode;
    error_message?: string;
}

// Discriminated payload union returned by process(). One shape per Yandex endpoint.
type AlisaResponsePayload =
    // /v1.0/user/devices
    | { user_id: string; devices: (AlisaContext | undefined)[] }
    // /v1.0/user/devices/query
    | { user_id: string; devices: AlisaDeviceStateSnapshot[] | { id: string }[] }
    // /v1.0/user/devices/action
    | { devices: (AlisaActionData | AlisaDeviceStateSnapshot)[] };

interface AlisaSimpleDevice {
    name: string;
    main: { getId: string | null; setId: string | null };
    attributes: { name: string; getId?: string | null; setId?: string | null }[];
    actions: string[];
    iobID: string;
    description: string;
    room: string | undefined;
    func: string;
}

interface AlisaRequest {
    alisa?: string;
    devices?: { id: string }[];
    payload?: { devices: AlisaActionData[] };
}

type SmartName = ioBroker.SmartName | undefined;

type ConverterFn = (
    id: string,
    control: PatternControl,
    name: string,
    room: string | undefined,
    func: string | undefined,
    obj: ioBroker.Object,
    objects: Record<string, ioBroker.Object>,
) => AlisaEntity | undefined;

interface UrlKey {
    key: string;
}

// -----------------------------------------------------------------------------
// Converter
// -----------------------------------------------------------------------------

class YandexAliceConverter {
    public lang: ioBroker.Languages = 'ru';
    public types: Partial<Record<Types, ConverterFn>>;

    private adapter: ioBroker.Adapter;
    private _entities: AlisaEntity[] = [];
    private _entity2ID: Record<string, AlisaEntity> = {};
    private _ID2entity: Record<string, AlisaEntity[]> = {};

    constructor(adapter: ioBroker.Adapter) {
        this.adapter = adapter;

        this.types = {
            [Types.socket]: this._processSocket.bind(this),
            [Types.light]: this._processLight.bind(this),
            [Types.dimmer]: this._processDimmer.bind(this),
            [Types.ct]: this._processCT.bind(this),
            [Types.rgbSingle]: this._processRGB.bind(this),
            [Types.airCondition]: this._processAC.bind(this),
            [Types.thermostat]: this._processAC.bind(this),
            [Types.blind]: this._processBlinds.bind(this),
            [Types.lock]: this._processLock.bind(this),
            [Types.vacuumCleaner]: this._processVacuumCleaner.bind(this),
            [Types.gate]: this._processLock.bind(this),
            // sensors
            [Types.motion]: this._processMotion.bind(this),
            [Types.door]: this._processContact.bind(this),
            [Types.window]: this._processContact.bind(this),
            [Types.temperature]: this._processTemperature.bind(this),
            [Types.humidity]: this._processHumidity.bind(this),
            [Types.buttonSensor]: this._processButtonSensor.bind(this),
        };
    }

    setLanguage(lang: ioBroker.Languages): void {
        this.lang = lang || 'ru';
    }

    private _getSmartName(obj: ioBroker.Object | null | undefined): SmartName {
        if (!(this.adapter.config as IotAdapterConfig).noCommon) {
            return obj?.common ? ((obj.common as ioBroker.StateCommon).smartName as SmartName) || '' : '';
        }
        const custom = (obj?.common as ioBroker.StateCommon)?.custom?.[this.adapter.namespace];
        return custom ? custom.smartName : '';
    }

    private _getObjectName(obj: ioBroker.Object, _lang?: ioBroker.Languages): string {
        const lang = _lang || this.lang;

        let result: SmartName = this._getSmartName(obj);

        if (!result || (typeof result !== 'object' && typeof result !== 'string')) {
            result = obj?.common ? obj.common.name : null;
            result ||= obj._id;
        }

        if (typeof result === 'object') {
            if (result[lang] || result.en) {
                return result[lang] || result.en || '';
            }
            // take first not empty value
            const key = Object.keys(result).find(l => result[l as ioBroker.Languages]);
            if (key && result[key as ioBroker.Languages]) {
                return result[key as ioBroker.Languages]!;
            }
            return obj._id;
        }

        return result || '';
    }

    private _generateName(obj: ioBroker.Object, lang?: ioBroker.Languages): string {
        return this._getObjectName(obj, lang).replace(/[^-._\w0-9А-Яа-яÄÜÖßäöü]/g, '_');
    }

    private _addID2entity(id: string, entity: AlisaEntity): void {
        this._ID2entity[id] = this._ID2entity[id] || [];
        const found = this._ID2entity[id].find(e => e.entity_id === entity.entity_id);
        if (!found) {
            this._ID2entity[id].push(entity);
        }
    }

    // ------------------------------- START OF CONVERTERS ---------------------------------------- //
    private async _getStateBooleanProperty(
        entity: AlisaEntity,
        name: string,
        mapping: Record<string, string>,
    ): Promise<void> {
        const attribute = entity.ATTRIBUTES.find(attr => attr.attribute === name);
        const stateId = attribute ? attribute.getId || attribute.setId : undefined;
        const capability = entity.context.properties.find(
            cap => cap.type === 'devices.properties.event' && cap.parameters?.instance === name,
        );
        if (capability && stateId) {
            try {
                const state = await this.adapter.getForeignStateAsync(stateId);
                if (state) {
                    const truthy =
                        state.val === 'false' || state.val === '0'
                            ? false
                            : state.val === 'true' ||
                              state.val === true ||
                              state.val === 1 ||
                              state.val === '1' ||
                              !!state.val;
                    capability.state = {
                        instance: name,
                        value: mapping[String(truthy)],
                    };
                }
            } catch (e) {
                this.adapter.log.warn(`Cannot read state ${stateId} for entity ${entity.entity_id}: ${e}`);
            }
        }
    }

    private async _getStateFloatProperty(entity: AlisaEntity, name: string): Promise<void> {
        const attribute = entity.ATTRIBUTES.find(attr => attr.attribute === name);
        const stateId = attribute ? attribute.getId || attribute.setId : undefined;
        const capability = entity.context.properties.find(
            cap => cap.type === 'devices.properties.float' && cap.parameters?.instance === name,
        );
        if (capability && stateId) {
            try {
                const state = await this.adapter.getForeignStateAsync(stateId);
                if (state) {
                    capability.state = {
                        instance: name,
                        value: parseFloat(state.val as unknown as string) || 0,
                    };
                }
            } catch (e) {
                this.adapter.log.warn(`Cannot read state ${stateId} for entity ${entity.entity_id}: ${e}`);
            }
        }
    }

    private async _getStateNumber(entity: AlisaEntity, type: string, name: string): Promise<void> {
        const attribute = entity.ATTRIBUTES.find(attr => attr.attribute === name);
        const stateId = attribute ? attribute.getId || attribute.setId : undefined;
        const capability = entity.context.capabilities.find(
            cap => cap.type === type && cap.parameters?.instance === name,
        );
        if (!capability || !stateId) {
            return;
        }
        try {
            const state = await this.adapter.getForeignStateAsync(stateId);
            if (state) {
                capability.state = {
                    instance: name,
                    value: parseFloat(state.val as unknown as string) || 0,
                };
            }
        } catch (e) {
            this.adapter.log.warn(`Cannot read state ${stateId} for entity ${entity.entity_id}: ${e as string}`);
        }
    }

    private async _setStateNumber(
        entity: AlisaEntity,
        data: AlisaActionData,
        type: string,
        name: string,
    ): Promise<AlisaActionData> {
        const attribute = entity.ATTRIBUTES.find(attr => attr.attribute === name);
        const stateId = attribute ? attribute.setId || attribute.getId : undefined;
        const capability = data.capabilities.find(cap => cap.type === type && cap.state?.instance === name);
        if (!capability?.state || !stateId) {
            return data;
        }
        if (capability.state.relative) {
            const state = await this.adapter.getForeignStateAsync(stateId);
            if (state) {
                const val =
                    (parseFloat(state.val as unknown as string) || 0) +
                    parseFloat(String(capability.state.value as unknown as string));
                await this.adapter.setForeignStateAsync(stateId, val);
                capability.state.action_result = { status: 'DONE' };
            } else {
                capability.state.action_result = {
                    status: 'ERROR',
                    error_code: 'INVALID_VALUE',
                    error_message: 'State has invalid value',
                };
            }
            return data;
        }
        await this.adapter.setForeignStateAsync(
            stateId,
            parseFloat(String(capability.state.value as unknown as string)),
        );
        capability.state.action_result = { status: 'DONE' };
        return data;
    }

    private async _getStateMode(entity: AlisaEntity, name: string): Promise<void> {
        const attribute = entity.ATTRIBUTES.find(attr => attr.attribute === name);
        const stateId = attribute ? attribute.getId || attribute.setId : undefined;
        const capability = entity.context.capabilities.find(
            cap => cap.type === 'devices.capabilities.mode' && cap.parameters?.instance === name,
        );
        if (!capability || !stateId || !attribute) {
            return;
        }
        try {
            const state = await this.adapter.getForeignStateAsync(stateId);
            if (state) {
                const rawValue = state.val as unknown as string | number;
                capability.state = {
                    instance: name,
                    value: attribute.states ? (attribute.states[rawValue] || '').toLowerCase() : rawValue,
                };
            }
        } catch (e) {
            this.adapter.log.warn(`Cannot read state ${stateId} for entity ${entity.entity_id}: ${e as string}`);
        }
    }

    private async _setStateMode(entity: AlisaEntity, data: AlisaActionData, name: string): Promise<AlisaActionData> {
        const attribute = entity.ATTRIBUTES.find(attr => attr.attribute === name);
        const stateId = attribute ? attribute.setId || attribute.getId : undefined;
        const capability = data.capabilities.find(
            cap => cap.type === 'devices.capabilities.mode' && cap.state?.instance === name,
        );
        if (!capability?.state || !stateId || !attribute) {
            return data;
        }
        let val: string | number | undefined = attribute.states
            ? Object.keys(attribute.states).find(
                  v =>
                      attribute.states![v].toLowerCase() ===
                      String(capability.state!.value as unknown as string).toLowerCase(),
              )
            : (capability.state.value as string | number);
        if (attribute.states && attribute.type === 'number' && typeof val === 'string') {
            val = parseInt(val, 10);
        }
        if (val !== undefined) {
            await this.adapter.setForeignStateAsync(stateId, val as ioBroker.StateValue);
        }
        capability.state.action_result = { status: 'DONE' };
        return data;
    }

    private _getStateRange(entity: AlisaEntity, name: string): Promise<void> {
        return this._getStateNumber(entity, 'devices.capabilities.range', name);
    }

    private _setStateRange(entity: AlisaEntity, data: AlisaActionData, name: string): Promise<AlisaActionData> {
        return this._setStateNumber(entity, data, 'devices.capabilities.range', name);
    }

    private async _getStateOnOff(entity: AlisaEntity): Promise<void> {
        const stateId = entity.STATE.getId;
        const capability = entity.context.capabilities.find(cap => cap.type === 'devices.capabilities.on_off');
        if (!capability || !stateId) {
            return;
        }
        try {
            const state = await this.adapter.getForeignStateAsync(stateId);
            if (state) {
                capability.state = {
                    instance: 'on',
                    value:
                        entity.STATE.min !== undefined && entity.STATE.min === state.val
                            ? false
                            : entity.STATE.max !== undefined && entity.STATE.max === state.val
                              ? true
                              : !!state.val,
                };
            }
        } catch (e) {
            this.adapter.log.warn(`Cannot read state ${stateId} for entity ${entity.entity_id}: ${e as string}`);
        }
    }

    private async _setStateOnOff(entity: AlisaEntity, data: AlisaActionData): Promise<AlisaActionData> {
        const stateId = entity.STATE.setId;
        const capability = data.capabilities.find(cap => cap.type === 'devices.capabilities.on_off');
        if (!capability?.state || !stateId) {
            return data;
        }
        if (entity.STATE.type === 'number') {
            const value = capability.state.value
                ? entity.STATE.max !== undefined
                    ? entity.STATE.max
                    : 100
                : entity.STATE.min !== undefined
                  ? entity.STATE.min
                  : 0;
            await this.adapter.setForeignStateAsync(stateId, value);
        } else {
            // on_off capability: state.value is boolean, but the union allows HSV.
            await this.adapter.setForeignStateAsync(stateId, capability.state.value as ioBroker.StateValue);
        }
        capability.state.action_result = { status: 'DONE' };
        return data;
    }

    private async _setStateLock(entity: AlisaEntity, data: AlisaActionData): Promise<AlisaActionData> {
        const stateId = entity.STATE.setId;
        const capability = data.capabilities.find(cap => cap.type === 'devices.capabilities.on_off');
        if (!capability?.state || !stateId) {
            return data;
        }
        const onOffValue = capability.state.value as ioBroker.StateValue;
        if (capability.state.value && entity.STATE.openId) {
            await this.adapter.setForeignStateAsync(entity.STATE.openId, onOffValue);
        } else {
            await this.adapter.setForeignStateAsync(stateId, onOffValue);
        }
        capability.state.action_result = { status: 'DONE' };
        return data;
    }

    private _getStateBrightness(entity: AlisaEntity): Promise<void> {
        return this._getStateRange(entity, 'brightness');
    }

    private _setStateBrightness(entity: AlisaEntity, data: AlisaActionData): Promise<AlisaActionData> {
        return this._setStateRange(entity, data, 'brightness');
    }

    private async _getStateCT(entity: AlisaEntity): Promise<void> {
        const attribute = entity.ATTRIBUTES.find(attr => attr.attribute === 'ct');
        const stateId = attribute ? attribute.getId : undefined;
        const capability = entity.context.capabilities.find(cap => cap.type === 'devices.capabilities.color_setting');
        if (!capability || !stateId) {
            return;
        }
        try {
            const state = await this.adapter.getForeignStateAsync(stateId);
            if (state) {
                const val = parseInt(state.val as unknown as string);
                capability.state = { instance: 'temperature_k', value: val };
            }
        } catch (e) {
            this.adapter.log.warn(`Cannot read state ${stateId} for entity ${entity.entity_id}: ${e as string}`);
        }
    }

    private async _setStateCT(entity: AlisaEntity, data: AlisaActionData): Promise<AlisaActionData> {
        const attribute = entity.ATTRIBUTES.find(attr => attr.attribute === 'ct');
        const stateId = attribute ? attribute.getId : undefined;
        const capability = data.capabilities.find(cap => cap.type === 'devices.capabilities.color_setting');
        if (capability?.state && stateId && capability.state.instance === 'temperature_k') {
            const val = parseInt(String(capability.state.value as unknown as string));
            await this.adapter.setForeignStateAsync(stateId, val);
            capability.state.action_result = { status: 'DONE' };
        }
        return data;
    }

    private async _getStateRGB(entity: AlisaEntity): Promise<void> {
        const attribute = entity.ATTRIBUTES.find(attr => attr.attribute === 'rgb');
        const stateId = attribute ? attribute.getId : undefined;
        const capability = entity.context.capabilities.find(cap => cap.type === 'devices.capabilities.color_setting');
        if (!capability || !stateId) {
            return;
        }
        try {
            const state = await this.adapter.getForeignStateAsync(stateId);
            if (state) {
                const val = String(state.val).replace('#', '');
                capability.state = { instance: 'rgb', value: parseInt(val, 16) };
            }
        } catch (e) {
            this.adapter.log.warn(`Cannot read state ${stateId} for entity ${entity.entity_id}: ${e as string}`);
        }
    }

    private async _setStateRGB(entity: AlisaEntity, data: AlisaActionData): Promise<AlisaActionData> {
        const attribute = entity.ATTRIBUTES.find(attr => attr.attribute === 'rgb');
        const stateId = attribute ? attribute.getId : undefined;
        const capability = data.capabilities.find(cap => cap.type === 'devices.capabilities.color_setting');
        if (capability?.state && stateId && capability.state.instance === 'rgb') {
            const val = (capability.state.value as number).toString(16).padStart(6, '0');
            await this.adapter.setForeignStateAsync(stateId, `#${val}`);
            capability.state.action_result = { status: 'DONE' };
        }
        return data;
    }

    private _getStateTemperature(entity: AlisaEntity): Promise<void> {
        return this._getStateRange(entity, 'temperature');
    }

    private _setStateTemperature(entity: AlisaEntity, data: AlisaActionData): Promise<AlisaActionData> {
        return this._setStateRange(entity, data, 'temperature');
    }

    private _getStateThermostat(entity: AlisaEntity): Promise<void> {
        return this._getStateMode(entity, 'thermostat');
    }

    private _setStateThermostat(entity: AlisaEntity, data: AlisaActionData): Promise<AlisaActionData> {
        return this._setStateMode(entity, data, 'thermostat');
    }

    private _getStateSwing(entity: AlisaEntity): Promise<void> {
        return this._getStateMode(entity, 'swing');
    }

    private _setStateSwing(entity: AlisaEntity, data: AlisaActionData): Promise<AlisaActionData> {
        return this._setStateMode(entity, data, 'swing');
    }

    private _getStateSpeed(entity: AlisaEntity): Promise<void> {
        return this._getStateMode(entity, 'fan_speed');
    }

    private _setStateSpeed(entity: AlisaEntity, data: AlisaActionData): Promise<AlisaActionData> {
        return this._setStateMode(entity, data, 'fan_speed');
    }

    private async _getStateBlinds(entity: AlisaEntity): Promise<void> {
        const attribute = entity.ATTRIBUTES.find(attr => attr.attribute === 'open');
        const stateId = attribute ? attribute.getId : undefined;
        const capability = entity.context.capabilities.find(cap => cap.type === 'devices.capabilities.range');
        if (!capability || !stateId) {
            return;
        }
        try {
            const state = await this.adapter.getForeignStateAsync(stateId);
            if (state) {
                capability.state = {
                    instance: 'open',
                    value: state.val === true ? 100 : state.val === false ? 0 : state.val === null ? 0 : state.val,
                };
            }
        } catch (e) {
            this.adapter.log.warn(`Cannot read state ${stateId} for entity ${entity.entity_id}: ${e as string}`);
        }
    }

    private async _setStateBlinds(entity: AlisaEntity, data: AlisaActionData): Promise<AlisaActionData> {
        const attribute = entity.ATTRIBUTES.find(attr => attr.attribute === 'open');
        const stateId = attribute ? attribute.setId || attribute.getId : undefined;
        const capability = data.capabilities.find(cap => cap.type === 'devices.capabilities.range');
        if (capability?.state && stateId) {
            // range.open: state.value is a number (0..100).
            await this.adapter.setForeignStateAsync(stateId, capability.state.value as ioBroker.StateValue);
            capability.state.action_result = { status: 'DONE' };
        }
        return data;
    }

    private async _getStatePause(entity: AlisaEntity): Promise<void> {
        const attribute = entity.ATTRIBUTES.find(attr => attr.attribute === 'pause');
        const stateId = attribute ? attribute.getId : undefined;
        const capability = entity.context.capabilities.find(cap => cap.type === 'devices.capabilities.toggle');
        if (!capability || !stateId) {
            return;
        }
        try {
            const state = await this.adapter.getForeignStateAsync(stateId);
            if (state) {
                capability.state = {
                    instance: 'pause',
                    value:
                        state.val === true ||
                        state.val === 'true' ||
                        state.val === '1' ||
                        state.val === 1 ||
                        state.val === 'AN' ||
                        state.val === 'ON' ||
                        state.val === 'an' ||
                        state.val === 'on',
                };
            }
        } catch (e) {
            this.adapter.log.warn(`Cannot read state ${stateId} for entity ${entity.entity_id}: ${e as string}`);
        }
    }

    private async _setStatePause(entity: AlisaEntity, data: AlisaActionData): Promise<AlisaActionData> {
        const stateId = entity.STATE.setId;
        const capability = data.capabilities.find(
            cap => cap.type === 'devices.capabilities.toggle' && cap.state?.instance === 'pause',
        );
        if (capability?.state && stateId) {
            await this.adapter.setForeignStateAsync(
                stateId,
                capability.state.value === true || capability.state.value === 'true',
            );
            capability.state.action_result = { status: 'DONE' };
        }
        return data;
    }

    private _getStateVacuumMode(entity: AlisaEntity): Promise<void> {
        return this._getStateMode(entity, 'cleanup_mode');
    }

    private _setStateVacuumMode(entity: AlisaEntity, data: AlisaActionData): Promise<AlisaActionData> {
        return this._setStateMode(entity, data, 'cleanup_mode');
    }

    private _getStateVacuumWorkMode(entity: AlisaEntity): Promise<void> {
        return this._getStateMode(entity, 'work_speed');
    }

    private _setStateVacuumWorkMode(entity: AlisaEntity, data: AlisaActionData): Promise<AlisaActionData> {
        return this._setStateMode(entity, data, 'work_speed');
    }

    private _getStateFloat(entity: AlisaEntity, name: string): Promise<void> {
        return this._getStateNumber(entity, 'devices.properties.float', name);
    }

    private _processCommon(
        _id: string,
        name: string | undefined,
        room: string | undefined,
        func: string | undefined,
        obj: ioBroker.Object,
        entityType: string,
        entity_id?: string,
    ): AlisaEntity {
        let displayName = name;
        if (!displayName) {
            if (func && room) {
                displayName = `${room} ${func}`;
            } else {
                const custom = (obj.common as ioBroker.StateCommon)?.custom?.[this.adapter.namespace];
                displayName = (custom?.name as string | undefined) || this._generateName(obj);
            }
        }
        const _name = replaceInvalidChars(this._generateName(obj, 'en'));

        const entity: AlisaEntity = {
            entity_id: entity_id || `${entityType}.${_name}`,
            attributes: {
                friendly_name: displayName,
            },

            context: {
                id: obj._id,
                type: entityType,
                name: displayName,
                description: displayName,
                room: room,
                custom_data: {
                    entity_id: entity_id || `${entityType}.${_name}`,
                },
                capabilities: [],
                properties: [],
                device_info: {
                    manufacturer: 'IOBroker',
                    model: entity_id || `${entityType}.${_name}`,
                    hw_version: '',
                    sw_version: this.adapter.version || '',
                },
            },

            COMMANDS: {},
            ATTRIBUTES: [],
            STATE: { setId: null, getId: null },
        };

        if (obj.common.unit) {
            entity.attributes.unit_of_measurement = obj.common.unit;
        }

        this._ID2entity[obj._id] = this._ID2entity[obj._id] || [];
        this._ID2entity[obj._id].push(entity);
        this._entity2ID[entity.entity_id] = entity;
        this._entities.push(entity);
        return entity;
    }

    private _processSocket(
        id: string,
        control: PatternControl,
        name: string,
        room: string | undefined,
        func: string | undefined,
        _obj: ioBroker.Object,
        objects: Record<string, ioBroker.Object>,
    ): AlisaEntity {
        const entity = this._processCommon(id, name, room, func, _obj, 'devices.types.switch');

        let state = control.states.find(s => s.id && s.name === 'SET');
        if (state?.id) {
            entity.STATE.setId = state.id;
            entity.STATE.getId = state.id;
            entity.STATE.type = (objects[state.id]?.common as ioBroker.StateCommon)?.type;
            entity.attributes.icon = 'mdi:power-socket-eu';
            this._addID2entity(state.id, entity);
        }

        state = control.states.find(s => s.id && s.name === 'ACTUAL');
        if (state?.id) {
            entity.STATE.getId = state.id;
            this._addID2entity(state.id, entity);
        }

        entity.context.capabilities.push({
            type: 'devices.capabilities.on_off',
            retrievable: true,
        });
        entity.COMMANDS.get_state = e => this._getStateOnOff(e);
        entity.COMMANDS.set_state = (e, d) => this._setStateOnOff(e, d);
        return entity;
    }

    private _processLight(
        id: string,
        control: PatternControl,
        name: string,
        room: string | undefined,
        func: string | undefined,
        _obj: ioBroker.Object,
        objects: Record<string, ioBroker.Object>,
    ): AlisaEntity {
        const entity = this._processCommon(id, name, room, func, _obj, 'devices.types.light');

        let state = control.states.find(s => s.id && ['ON_SET', 'ON', 'SET'].includes(s.name));
        if (state?.id) {
            const common = objects[state.id]?.common as ioBroker.StateCommon;
            entity.STATE.type = common?.type;
            entity.STATE.min = common?.min;
            entity.STATE.max = common?.max;
            entity.STATE.setId = state.id;
            entity.STATE.getId = state.id;
            this._addID2entity(state.id, entity);
        }

        state = control.states.find(s => s.id && s.name === 'ACTUAL');
        if (state?.id) {
            entity.STATE.getId = state.id;
            this._addID2entity(state.id, entity);
        }

        entity.context.capabilities.push({
            type: 'devices.capabilities.on_off',
            retrievable: true,
        });
        entity.COMMANDS.get_state = e => this._getStateOnOff(e);
        entity.COMMANDS.set_state = (e, d) => this._setStateOnOff(e, d);
        return entity;
    }

    private _processDimmer(
        id: string,
        control: PatternControl,
        name: string,
        room: string | undefined,
        func: string | undefined,
        _obj: ioBroker.Object,
        objects: Record<string, ioBroker.Object>,
    ): AlisaEntity {
        const entity = this._processCommon(id, name, room, func, _obj, 'devices.types.light');

        let state = control.states.find(s => s.id && ['ON_SET', 'ON'].includes(s.name));
        if (state?.id) {
            const common = objects[state.id]?.common as ioBroker.StateCommon;
            entity.STATE.type = common?.type;
            entity.STATE.min = common?.min;
            entity.STATE.max = common?.max;
            entity.STATE.setId = state.id;
            entity.STATE.getId = state.id;
            this._addID2entity(state.id, entity);
        }

        state = control.states.find(s => s.id && s.name === 'ON_ACTUAL');
        if (state?.id) {
            entity.STATE.getId = state.id;
            this._addID2entity(state.id, entity);
        }

        let getDimmer: string | undefined;
        state = control.states.find(s => s.id && s.name === 'ACTUAL');
        if (state?.id) {
            getDimmer = state.id;
        }

        state = control.states.find(s => s.id && ['DIMMER', 'SET', 'BRIGHTNESS'].includes(s.name));
        let setDimmer = '';
        if (state?.id) {
            setDimmer = state.id;
            entity.ATTRIBUTES.push({
                attribute: 'brightness',
                getId: getDimmer || setDimmer,
                setId: setDimmer,
                type: (objects[setDimmer]?.common as ioBroker.StateCommon)?.type,
            });
            this._addID2entity(state.id, entity);
        } else if (getDimmer) {
            entity.ATTRIBUTES.push({
                attribute: 'brightness',
                getId: getDimmer,
                setId: null,
                type: (objects[getDimmer]?.common as ioBroker.StateCommon)?.type,
            });
            this._addID2entity(getDimmer, entity);
        }

        if (entity.STATE.getId) {
            entity.context.capabilities.push({
                type: 'devices.capabilities.on_off',
                retrievable: true,
            });
        }

        if (getDimmer || setDimmer) {
            const dimmerCommon = (getDimmer ? objects[getDimmer]?.common : undefined) as ioBroker.StateCommon;
            entity.context.capabilities.push({
                type: 'devices.capabilities.range',
                retrievable: !!getDimmer,
                parameters: {
                    instance: 'brightness',
                    random_access: true,
                    unit: 'unit.percent',
                    range: {
                        min: dimmerCommon?.min !== undefined ? dimmerCommon.min : 0,
                        max: dimmerCommon?.max !== undefined ? dimmerCommon.max : 100,
                        precision: 1,
                    },
                },
            });
        }

        entity.COMMANDS.get_state = async e => {
            await this._getStateOnOff(e);
            await this._getStateBrightness(e);
        };
        entity.COMMANDS.set_state = async (e, d) => {
            const res = await this._setStateOnOff(e, d);
            return this._setStateBrightness(e, res);
        };

        return entity;
    }

    private _processCT(
        id: string,
        control: PatternControl,
        name: string,
        room: string | undefined,
        func: string | undefined,
        _obj: ioBroker.Object,
        objects: Record<string, ioBroker.Object>,
    ): AlisaEntity {
        const entity = this._processDimmer(id, control, name, room, func, _obj, objects);
        const ctState = control.states.find(s => s.id && ['TEMPERATURE'].includes(s.name));
        if (ctState && ctState.id) {
            const common = objects[ctState.id]?.common as ioBroker.StateCommon;
            entity.ATTRIBUTES.push({
                attribute: 'ct',
                getId: ctState.id,
                setId: ctState.id,
                type: common?.type,
                min: common?.min,
                max: common?.max,
            });
            this._addID2entity(ctState.id, entity);

            entity.context.capabilities.push({
                type: 'devices.capabilities.color_setting',
                retrievable: true,
                parameters: {
                    temperature_k: {
                        min: common?.min || 2700,
                        max: common?.max || 9000,
                        precision: 100,
                    },
                },
            });

            const get_state = entity.COMMANDS.get_state!;
            const set_state = entity.COMMANDS.set_state!;

            entity.COMMANDS.get_state = async e => {
                await get_state(e);
                await this._getStateCT(e);
            };
            entity.COMMANDS.set_state = async (e, d) => {
                const data = await set_state(e, d);
                return this._setStateCT(e, data);
            };
        }
        return entity;
    }

    private _processAC(
        id: string,
        control: PatternControl,
        name: string,
        room: string | undefined,
        func: string | undefined,
        _obj: ioBroker.Object,
        objects: Record<string, ioBroker.Object>,
    ): AlisaEntity {
        const entity = this._processCommon(
            id,
            name,
            room,
            func,
            _obj,
            control.type === Types.thermostat ? 'devices.types.thermostat' : 'devices.types.thermostat.ac',
        );

        let state = control.states.find(s => s.id && ['POWER', 'ON'].includes(s.name));
        if (state?.id) {
            const common = objects[state.id]?.common as ioBroker.StateCommon;
            entity.STATE.setId = state.id;
            entity.STATE.getId = state.id;
            entity.STATE.type = common?.type;
            entity.STATE.min = common?.min;
            entity.STATE.max = common?.max;
            this._addID2entity(state.id, entity);
        }

        if (entity.STATE.getId) {
            entity.context.capabilities.push({
                type: 'devices.capabilities.on_off',
                retrievable: true,
            });
        }

        let getTemperature: string | undefined;
        state = control.states.find(s => s.id && s.name === 'ACTUAL');
        if (state?.id) {
            getTemperature = state.id;
        }

        state = control.states.find(s => s.id && ['SET'].includes(s.name));
        let setTemperature = '';
        if (state?.id) {
            setTemperature = state.id;
            entity.ATTRIBUTES.push({
                attribute: 'temperature',
                getId: getTemperature || setTemperature,
                setId: setTemperature,
                type: (objects[setTemperature]?.common as ioBroker.StateCommon)?.type,
            });
            this._addID2entity(state.id, entity);
        } else if (getTemperature) {
            entity.ATTRIBUTES.push({
                attribute: 'temperature',
                getId: getTemperature,
                setId: null,
                type: (objects[getTemperature]?.common as ioBroker.StateCommon)?.type,
            });
            // NOTE: original JS referenced state.id here which is undefined when entering this branch;
            // calling _addID2entity with the actual getTemperature is the intended behavior.
            this._addID2entity(getTemperature, entity);
        }

        if (getTemperature || setTemperature) {
            const setCommon = (setTemperature ? objects[setTemperature]?.common : undefined) as ioBroker.StateCommon;
            entity.context.capabilities.push({
                type: 'devices.capabilities.range',
                retrievable: true,
                parameters: {
                    instance: 'temperature',
                    random_access: true,
                    unit: 'unit.temperature.celsius',
                    range: {
                        min: setCommon?.min !== undefined ? setCommon.min : 12,
                        max: setCommon?.max !== undefined ? setCommon.max : 30,
                        precision: 1,
                    },
                },
            });
        }

        // mode: thermostat
        state = control.states.find(s => s.id && ['MODE'].includes(s.name));
        if (state?.id) {
            const thermostatId = state.id;
            const common = objects[thermostatId]?.common as ioBroker.StateCommon;
            const states = (common?.states as Record<string | number, string>) || {};
            entity.ATTRIBUTES.push({
                attribute: 'thermostat',
                getId: thermostatId,
                setId: thermostatId,
                states,
                type: common?.type,
            });
            this._addID2entity(state.id, entity);
            const modes: { value: string }[] = [];
            const values = Object.values(states).map(n => n.toLowerCase());
            ['auto', 'cool', 'dry', 'eco', 'fan_only', 'heat'].forEach(v => {
                if (values.includes(v)) {
                    modes.push({ value: v });
                }
            });

            entity.context.capabilities.push({
                type: 'devices.capabilities.mode',
                retrievable: true,
                parameters: { instance: 'thermostat', modes },
            });
        }

        // mode: swing
        state = control.states.find(s => s.id && ['SWING'].includes(s.name));
        if (state?.id) {
            const swingId = state.id;
            const common = objects[swingId]?.common as ioBroker.StateCommon;
            const states = (common?.states as Record<string | number, string>) || {};
            entity.ATTRIBUTES.push({
                attribute: 'swing',
                getId: swingId,
                setId: swingId,
                states,
                type: common?.type,
            });
            this._addID2entity(state.id, entity);
            const modes: { value: string }[] = [];
            const values = Object.values(states).map(n => n.toLowerCase());
            ['auto', 'horizontal', 'stationary', 'vertical'].forEach(v => {
                if (values.includes(v)) {
                    modes.push({ value: v });
                }
            });

            entity.context.capabilities.push({
                type: 'devices.capabilities.mode',
                retrievable: true,
                parameters: { instance: 'swing', modes },
            });
        }

        // mode: fan_speed
        state = control.states.find(s => s.id && ['SPEED'].includes(s.name));
        if (state?.id) {
            const fanSpeedId = state.id;
            const common = objects[fanSpeedId]?.common as ioBroker.StateCommon;
            const states = (common?.states as Record<string | number, string>) || {};
            entity.ATTRIBUTES.push({
                attribute: 'fan_speed',
                getId: fanSpeedId,
                setId: fanSpeedId,
                states,
                type: common?.type,
            });
            this._addID2entity(state.id, entity);
            const modes: { value: string }[] = [];
            const values = Object.values(states).map(n => n.toLowerCase());
            ['auto', 'high', 'low', 'medium', 'quiet', 'turbo'].forEach(v => {
                if (values.includes(v)) {
                    modes.push({ value: v });
                }
            });

            entity.context.capabilities.push({
                type: 'devices.capabilities.mode',
                retrievable: true,
                parameters: { instance: 'fan_speed', modes },
            });
        }

        entity.COMMANDS.get_state = async e => {
            await this._getStateOnOff(e);
            await this._getStateTemperature(e);
            await this._getStateThermostat(e);
            await this._getStateSwing(e);
            await this._getStateSpeed(e);
        };

        entity.COMMANDS.set_state = async (e, d) => {
            let res = await this._setStateOnOff(e, d);
            res = await this._setStateTemperature(e, res);
            res = await this._setStateThermostat(e, res);
            res = await this._setStateSwing(e, res);
            return this._setStateSpeed(e, res);
        };

        return entity;
    }

    private _processRGB(
        id: string,
        control: PatternControl,
        name: string,
        room: string | undefined,
        func: string | undefined,
        _obj: ioBroker.Object,
        objects: Record<string, ioBroker.Object>,
    ): AlisaEntity {
        const entity = this._processDimmer(id, control, name, room, func, _obj, objects);

        const rgbState = control.states.find(s => s.id && ['RGB'].includes(s.name));
        if (rgbState && rgbState.id) {
            const common = objects[rgbState.id]?.common as ioBroker.StateCommon;
            entity.ATTRIBUTES.push({
                attribute: 'rgb',
                getId: rgbState.id,
                setId: rgbState.id,
                type: common?.type,
                min: common?.min,
                max: common?.max,
            });
            this._addID2entity(rgbState.id, entity);

            const capability = entity.context.capabilities.find(
                cap => cap.type === 'devices.capabilities.color_setting',
            );
            if (!capability) {
                entity.context.capabilities.push({
                    type: 'devices.capabilities.color_setting',
                    retrievable: true,
                    parameters: { color_model: 'rgb' },
                });
            } else {
                capability.parameters ||= {};
                capability.parameters.color_model = 'rgb';
            }

            const get_state = entity.COMMANDS.get_state!;
            const set_state = entity.COMMANDS.set_state!;

            entity.COMMANDS.get_state = async e => {
                await get_state(e);
                await this._getStateRGB(e);
            };
            entity.COMMANDS.set_state = async (e, d) => {
                const data = await set_state(e, d);
                return this._setStateRGB(e, data);
            };
        }

        return entity;
    }

    private _processBlinds(
        id: string,
        control: PatternControl,
        name: string,
        room: string | undefined,
        func: string | undefined,
        _obj: ioBroker.Object,
        objects: Record<string, ioBroker.Object>,
    ): AlisaEntity {
        const entity = this._processCommon(id, name, room, func, _obj, 'devices.types.openable.curtain');

        let state = control.states.find(s => s.id && ['SET'].includes(s.name));
        if (state?.id && (objects[state.id]?.common as ioBroker.StateCommon)?.type === 'boolean') {
            entity.STATE.setId = state.id;
            entity.STATE.getId = state.id;
            entity.STATE.type = 'boolean';
            this._addID2entity(state.id, entity);
        }

        state = control.states.find(s => s.id && s.name === 'ACTUAL');
        if (state?.id && (objects[state.id]?.common as ioBroker.StateCommon)?.type === 'boolean') {
            entity.STATE.getId = state.id;
            this._addID2entity(state.id, entity);
        }

        if (entity.STATE.getId) {
            entity.context.capabilities.push({
                type: 'devices.capabilities.on_off',
                retrievable: true,
            });
        }

        state = control.states.find(s => s.id && ['SET'].includes(s.name));
        if (state?.id && (objects[state.id]?.common as ioBroker.StateCommon)?.type === 'number') {
            const blindId = state.id;
            const common = objects[blindId]?.common as ioBroker.StateCommon;
            const attribute: AlisaAttribute = {
                attribute: 'open',
                getId: blindId,
                setId: blindId,
                type: 'number',
                min: common?.min !== undefined ? common.min : 0,
                max: common?.max !== undefined ? common.max : 100,
            };
            entity.ATTRIBUTES.push(attribute);
            this._addID2entity(blindId, entity);

            const getState = control.states.find(s => s.id && s.name === 'ACTUAL');
            if (getState && getState.id && (objects[getState.id]?.common as ioBroker.StateCommon)?.type === 'number') {
                attribute.getId = getState.id;
                this._addID2entity(getState.id, entity);
            }

            entity.context.capabilities.push({
                type: 'devices.capabilities.range',
                retrievable: true,
                parameters: {
                    instance: 'open',
                    random_access: true,
                    unit: 'unit.percent',
                    range: {
                        min: common?.min !== undefined ? common.min : 0,
                        max: common?.max !== undefined ? common.max : 100,
                        precision: 1,
                    },
                },
            });

            if (!entity.STATE.getId) {
                entity.STATE.setId = state.id;
                entity.STATE.getId = getState ? getState.id : state.id;
                entity.STATE.type = 'number';
                entity.context.capabilities.push({
                    type: 'devices.capabilities.on_off',
                    retrievable: true,
                });
            }
        }

        entity.COMMANDS.get_state = async e => {
            await this._getStateOnOff(e);
            await this._getStateBlinds(e);
        };
        entity.COMMANDS.set_state = async (e, d) => {
            const res = await this._setStateOnOff(e, d);
            return this._setStateBlinds(e, res);
        };

        return entity;
    }

    private _processLock(
        id: string,
        control: PatternControl,
        name: string,
        room: string | undefined,
        func: string | undefined,
        _obj: ioBroker.Object,
        objects: Record<string, ioBroker.Object>,
    ): AlisaEntity {
        const entity = this._processCommon(id, name, room, func, _obj, 'devices.types.openable');

        let state = control.states.find(s => s.id && ['SET'].includes(s.name));
        if (state?.id) {
            const common = objects[state.id]?.common as ioBroker.StateCommon;
            entity.STATE.type = common?.type;
            entity.STATE.min = common?.min;
            entity.STATE.max = common?.max;
            entity.STATE.setId = state.id;
            entity.STATE.getId = state.id;
            this._addID2entity(state.id, entity);
        }

        state = control.states.find(s => s.id && s.name === 'ACTUAL');
        if (state?.id) {
            entity.STATE.getId = state.id;
            this._addID2entity(state.id, entity);
        }

        state = control.states.find(s => s.id && s.name === 'OPEN');
        if (state?.id) {
            entity.STATE.openId = state.id;
            this._addID2entity(state.id, entity);
        }

        if (entity.STATE.getId) {
            entity.context.capabilities.push({
                type: 'devices.capabilities.on_off',
                retrievable: true,
            });
        }

        entity.COMMANDS.get_state = e => this._getStateOnOff(e);
        entity.COMMANDS.set_state = (e, d) => this._setStateLock(e, d);

        return entity;
    }

    private _processVacuumCleaner(
        id: string,
        control: PatternControl,
        name: string,
        room: string | undefined,
        func: string | undefined,
        _obj: ioBroker.Object,
        objects: Record<string, ioBroker.Object>,
    ): AlisaEntity {
        const entity = this._processCommon(id, name, room, func, _obj, 'devices.types.vacuum_cleaner');

        let state = control.states.find(s => s.id && ['POWER'].includes(s.name));
        if (state?.id) {
            const common = objects[state.id]?.common as ioBroker.StateCommon;
            entity.STATE.setId = state.id;
            entity.STATE.getId = state.id;
            entity.STATE.type = common?.type;
            entity.STATE.min = common?.min;
            entity.STATE.max = common?.max;
            this._addID2entity(state.id, entity);
        }

        if (entity.STATE.getId) {
            entity.context.capabilities.push({
                type: 'devices.capabilities.on_off',
                retrievable: true,
            });
        }

        // mode: cleanup_mode
        state = control.states.find(s => s.id && ['MODE'].includes(s.name));
        if (state?.id) {
            const common = objects[state.id]?.common as ioBroker.StateCommon;
            const states = (common?.states as Record<string | number, string>) || {};
            entity.ATTRIBUTES.push({
                attribute: 'cleanup_mode',
                getId: state.id,
                setId: state.id,
                states,
                type: common?.type,
            });
            this._addID2entity(state.id, entity);
            const modes: { value: string }[] = [];
            const values = Object.values(states).map(n => n.toLowerCase());
            ['auto', 'eco', 'express', 'normal', 'quiet'].forEach(v => {
                if (values.includes(v)) {
                    modes.push({ value: v });
                }
            });

            entity.context.capabilities.push({
                type: 'devices.capabilities.mode',
                retrievable: true,
                parameters: { instance: 'cleanup_mode', modes },
            });
        }

        // mode: work_speed
        state = control.states.find(s => s.id && ['WORK_MODE'].includes(s.name));
        if (state?.id) {
            const common = objects[state.id]?.common as ioBroker.StateCommon;
            const states = (common?.states as Record<string | number, string>) || {};
            entity.ATTRIBUTES.push({
                attribute: 'work_speed',
                getId: state.id,
                setId: state.id,
                states,
                type: common?.type,
            });
            this._addID2entity(state.id, entity);
            const modes: { value: string }[] = [];
            const values = Object.values(states).map(n => n.toLowerCase());
            ['auto', 'fast', 'medium', 'slow', 'turbo'].forEach(v => {
                if (values.includes(v)) {
                    modes.push({ value: v });
                }
            });

            entity.context.capabilities.push({
                type: 'devices.capabilities.mode',
                retrievable: true,
                parameters: { instance: 'work_speed', modes },
            });
        }

        // toggle: pause
        state = control.states.find(s => s.id && ['PAUSE'].includes(s.name));
        if (state?.id) {
            const common = objects[state.id]?.common as ioBroker.StateCommon;
            const states = (common?.states as Record<string | number, string>) || {};
            entity.ATTRIBUTES.push({
                attribute: 'pause',
                getId: state.id,
                setId: state.id,
                states,
                type: common?.type,
            });
            this._addID2entity(state.id, entity);

            entity.context.capabilities.push({
                type: 'devices.capabilities.toggle',
                retrievable: true,
                parameters: { instance: 'pause' },
            });
        }

        // float: water_level
        state = control.states.find(s => s.id && ['WATER'].includes(s.name));
        if (state?.id) {
            const common = objects[state.id]?.common as ioBroker.StateCommon;
            const states = (common?.states as Record<string | number, string>) || {};
            entity.ATTRIBUTES.push({
                attribute: 'water_level',
                getId: state.id,
                states,
                type: common?.type,
            });
            this._addID2entity(state.id, entity);

            entity.context.capabilities.push({
                type: 'devices.capabilities.float',
                retrievable: true,
                parameters: { instance: 'water_level', unit: 'unit.percent' },
            });
        }

        // float: battery_level
        state = control.states.find(s => s.id && ['BATTERY'].includes(s.name));
        if (state?.id) {
            const common = objects[state.id]?.common as ioBroker.StateCommon;
            const states = (common?.states as Record<string | number, string>) || {};
            entity.ATTRIBUTES.push({
                attribute: 'battery_level',
                getId: state.id,
                states,
                type: common?.type,
            });
            this._addID2entity(state.id, entity);

            entity.context.capabilities.push({
                type: 'devices.capabilities.float',
                retrievable: true,
                parameters: { instance: 'battery_level', unit: 'unit.percent' },
            });
        }

        entity.COMMANDS.get_state = async e => {
            await this._getStateOnOff(e);
            await this._getStateVacuumMode(e);
            await this._getStateVacuumWorkMode(e);
            await this._getStatePause(e);
            await this._getStateFloat(e, 'water_level');
            await this._getStateFloat(e, 'battery_level');
        };

        entity.COMMANDS.set_state = async (e, d) => {
            let res = await this._setStateOnOff(e, d);
            res = await this._setStatePause(e, res);
            res = await this._setStateVacuumMode(e, res);
            return this._setStateVacuumWorkMode(e, res);
        };

        return entity;
    }

    private _processTemperature(
        id: string,
        control: PatternControl,
        name: string,
        room: string | undefined,
        func: string | undefined,
        _obj: ioBroker.Object,
        objects: Record<string, ioBroker.Object>,
    ): AlisaEntity {
        const entity = this._processCommon(id, name, room, func, _obj, 'devices.types.sensor');

        let state = control.states.find(s => s.id && ['ACTUAL'].includes(s.name));
        const temperatureId = state?.id;
        if (temperatureId && (objects[temperatureId]?.common as ioBroker.StateCommon)?.type === 'number') {
            const common = objects[temperatureId].common as ioBroker.StateCommon;
            entity.STATE.getId = temperatureId;
            entity.STATE.type = 'number';
            this._addID2entity(temperatureId, entity);

            entity.ATTRIBUTES.push({
                attribute: 'temperature',
                getId: temperatureId,
                type: 'number',
            });

            entity.context.properties.push({
                type: 'devices.properties.float',
                retrievable: true,
                parameters: {
                    instance: 'temperature',
                    unit:
                        common.unit === '°K' || common.unit === 'K' || common.unit === 'K°'
                            ? 'unit.temperature.kelvin'
                            : 'unit.temperature.celsius',
                },
            });
        }

        state = control.states.find(s => s.id && ['SECOND'].includes(s.name));
        const humidityId = state?.id;
        if (humidityId && (objects[humidityId]?.common as ioBroker.StateCommon)?.type === 'number') {
            entity.ATTRIBUTES.push({
                attribute: 'humidity',
                getId: humidityId,
                type: 'number',
            });
            this._addID2entity(humidityId, entity);

            entity.context.properties.push({
                type: 'devices.properties.float',
                retrievable: true,
                parameters: { instance: 'humidity', unit: 'unit.percent' },
            });
        }

        entity.COMMANDS.get_state = async e => {
            await this._getStateFloatProperty(e, 'temperature');
            await this._getStateFloatProperty(e, 'humidity');
        };

        return entity;
    }

    private _processHumidity(
        id: string,
        control: PatternControl,
        name: string,
        room: string | undefined,
        func: string | undefined,
        _obj: ioBroker.Object,
        objects: Record<string, ioBroker.Object>,
    ): AlisaEntity {
        const entity = this._processCommon(id, name, room, func, _obj, 'devices.types.sensor');

        const state = control.states.find(s => s.id && ['ACTUAL'].includes(s.name));
        const humidityId = state?.id;
        if (humidityId && (objects[humidityId]?.common as ioBroker.StateCommon)?.type === 'number') {
            entity.STATE.getId = humidityId;
            entity.STATE.type = 'number';
            this._addID2entity(humidityId, entity);

            entity.ATTRIBUTES.push({
                attribute: 'humidity',
                getId: humidityId,
                type: 'number',
            });

            entity.context.properties.push({
                type: 'devices.properties.float',
                retrievable: true,
                parameters: { instance: 'humidity', unit: 'unit.percent' },
            });
        }

        entity.COMMANDS.get_state = e => this._getStateFloatProperty(e, 'humidity');

        return entity;
    }

    private _processMotion(
        id: string,
        control: PatternControl,
        name: string,
        room: string | undefined,
        func: string | undefined,
        _obj: ioBroker.Object,
        objects: Record<string, ioBroker.Object>,
    ): AlisaEntity {
        const entity = this._processCommon(id, name, room, func, _obj, 'devices.types.sensor');

        const state = control.states.find(s => s.id && ['ACTUAL'].includes(s.name));
        const motionId = state?.id;
        if (motionId && (objects[motionId]?.common as ioBroker.StateCommon)?.type === 'boolean') {
            entity.STATE.getId = motionId;
            entity.STATE.type = 'boolean';
            this._addID2entity(motionId, entity);

            entity.ATTRIBUTES.push({
                attribute: 'motion',
                getId: motionId,
                type: 'number',
            });

            entity.context.properties.push({
                type: 'devices.properties.event',
                retrievable: true,
                parameters: {
                    instance: 'motion',
                    events: [{ value: 'detected' }, { value: 'not_detected' }],
                },
            });
        }

        entity.COMMANDS.get_state = e =>
            this._getStateBooleanProperty(e, 'motion', { true: 'detected', false: 'not_detected' });

        return entity;
    }

    private _processContact(
        id: string,
        control: PatternControl,
        name: string,
        room: string | undefined,
        func: string | undefined,
        _obj: ioBroker.Object,
        objects: Record<string, ioBroker.Object>,
    ): AlisaEntity {
        const entity = this._processCommon(id, name, room, func, _obj, 'devices.types.sensor');

        const state = control.states.find(s => s.id && ['ACTUAL'].includes(s.name));
        const contactId = state?.id;
        if (contactId && (objects[contactId]?.common as ioBroker.StateCommon)?.type === 'boolean') {
            entity.STATE.getId = contactId;
            entity.STATE.type = 'boolean';
            this._addID2entity(contactId, entity);

            entity.ATTRIBUTES.push({
                attribute: 'open',
                getId: contactId,
                type: 'number',
            });

            entity.context.properties.push({
                type: 'devices.properties.event',
                retrievable: true,
                parameters: {
                    instance: 'open',
                    events: [{ value: 'opened' }, { value: 'closed' }],
                },
            });
        }

        entity.COMMANDS.get_state = e => this._getStateBooleanProperty(e, 'open', { true: 'closed', false: 'opened' });

        return entity;
    }

    private _processButtonSensor(
        id: string,
        control: PatternControl,
        name: string,
        room: string | undefined,
        func: string | undefined,
        _obj: ioBroker.Object,
        objects: Record<string, ioBroker.Object>,
    ): AlisaEntity {
        const entity = this._processCommon(id, name, room, func, _obj, 'devices.types.sensor');

        const state = control.states.find(s => s.id && ['PRESS'].includes(s.name));
        const buttonId = state?.id;
        if (buttonId && (objects[buttonId]?.common as ioBroker.StateCommon)?.type === 'boolean') {
            entity.STATE.getId = buttonId;
            entity.STATE.type = 'string';
            this._addID2entity(buttonId, entity);

            entity.ATTRIBUTES.push({
                attribute: 'button',
                getId: buttonId,
                type: 'boolean',
            });

            entity.context.properties.push({
                type: 'devices.properties.event',
                retrievable: true,
                parameters: {
                    instance: 'button',
                    events: [{ value: 'click' }, { value: 'double_click' }, { value: 'long_press' }],
                },
            });
        }

        entity.COMMANDS.get_state = e => this._getStateBooleanProperty(e, 'button', { true: 'click' });

        return entity;
    }
}

// -----------------------------------------------------------------------------
// YandexAlisa
// -----------------------------------------------------------------------------

export default class YandexAlisa {
    private adapter: ioBroker.Adapter;
    private lang: ioBroker.Languages = 'ru';
    private readonly urlKey: UrlKey | undefined;
    private readonly user_id: string;

    public smartDevices: AlisaEntity[] = [];
    public enums: string[] = [];
    private usedIds: string[] | null = [];
    private keys: string[] | null = [];
    private detector: ChannelDetector;
    private unknownDevices: Record<string, number> = {};
    private rateCalculation: number[] = [];

    private converter: YandexAliceConverter;

    private keyPromise: Promise<void> | undefined;
    private keyPromiseTime = 0;
    private urlKeyOk = false;

    constructor(adapter: ioBroker.Adapter, urlKey?: UrlKey | null) {
        this.adapter = adapter;
        this.urlKey = urlKey ?? undefined;
        this.user_id = (adapter.config as IotAdapterConfig).login.replace(/[^-_:a-zA-Z1-9]/g, '_');
        this.detector = new ChannelDetector();
        this.converter = new YandexAliceConverter(adapter);
    }

    private collectSubscribedIds(): string[] {
        const ids: string[] = [];
        this.smartDevices?.forEach(device =>
            device.ATTRIBUTES.forEach(item => {
                if (item?.getId && !ids.includes(item.getId)) {
                    ids.push(item.getId);
                }
            }),
        );
        return ids;
    }

    async unsubscribeAllIds(): Promise<void> {
        const ids = this.collectSubscribedIds();
        this.adapter.log.debug(`[ALISA] Unsubscribe ${ids.length} states for Alisa`);
        for (const id of ids) {
            try {
                await this.adapter.unsubscribeForeignStatesAsync(id);
            } catch (e) {
                this.adapter.log.warn(`[ALISA] Cannot unsubscribe ${id}: ${e as string}`);
            }
        }
        this.adapter.log.debug('[ALISA] Unsubscribe done');
    }

    async subscribeAllIds(): Promise<void> {
        const ids = this.collectSubscribedIds();
        this.adapter.log.debug(`[ALISA] Subscribe ${ids.length} states for Alisa`);
        for (const id of ids) {
            try {
                await this.adapter.subscribeForeignStatesAsync(id);
            } catch (e) {
                this.adapter.log.warn(`[ALISA] Cannot subscribe ${id}: ${e as string}`);
            }
        }
        this.adapter.log.debug('[ALISA] Subscribe done');
    }

    getObjectName(obj: ioBroker.Object): string {
        let name: ioBroker.StringOrTranslated = '';
        let smartName: SmartName | undefined;
        if ((this.adapter.config as IotAdapterConfig).noCommon) {
            const custom = (obj.common as ioBroker.StateCommon)?.custom?.[this.adapter.namespace];
            if (custom?.smartName && custom.smartName !== 'ignore') {
                smartName = custom.smartName;
            }
        } else {
            const sn = (obj.common as ioBroker.StateCommon)?.smartName;
            if (sn && sn !== 'ignore') {
                smartName = sn;
            }
        }

        if (!smartName && obj?.common?.name) {
            name = obj.common.name;
        }

        if (name && typeof name === 'object') {
            name = name[this.lang] || name.en;
        }

        if (!name && obj) {
            name = obj._id.split('.').pop() || '';
        }

        return name;
    }

    checkName(name: string | undefined, obj: ioBroker.Object, room?: string, func?: string): string {
        if (!name) {
            name = this.getObjectName(obj);
            name = name.replace(/[^a-zA-ZöäüßÖÄÜа-яА-Я0-9]/g, ' ');
            const _name = name.toLowerCase();
            let pos: number;
            if (room) {
                pos = _name.indexOf(room.toLowerCase());
                if (pos !== -1) {
                    name = name.substring(0, pos) + name.substring(pos + room.length + 1);
                }
            }
            if (func) {
                pos = _name.indexOf(func.toLowerCase());
                if (pos !== -1) {
                    name = name.substring(0, pos) + name.substring(pos + func.length + 1);
                }
            }
            name = name.replace(/\s\s/g, ' ').replace(/\s\s/g, ' ').trim();
        }
        return name;
    }

    setLanguage(_lang: ioBroker.Languages): void {
        this.lang = _lang || 'ru';
        this.converter.setLanguage(this.lang);
    }

    getSmartName(states: ioBroker.Object | Record<string, ioBroker.Object>, id?: string): SmartName {
        if (!id) {
            const obj = states as ioBroker.Object;
            if (!(this.adapter.config as IotAdapterConfig).noCommon) {
                return (obj.common as ioBroker.StateCommon)?.smartName;
            }
            const custom = (obj.common as ioBroker.StateCommon)?.custom?.[this.adapter.namespace];
            return custom ? custom.smartName : undefined;
        }
        const objects = states as Record<string, ioBroker.Object>;
        if (!(this.adapter.config as IotAdapterConfig).noCommon) {
            return objects[id]?.common ? (objects[id].common as ioBroker.StateCommon).smartName : null;
        }
        const custom = (objects[id]?.common as ioBroker.StateCommon)?.custom?.[this.adapter.namespace];
        return custom ? custom.smartName : null;
    }

    processState(
        ids: string[],
        objects: Record<string, ioBroker.Object>,
        id: string,
        roomName: string | undefined,
        funcName: string | undefined,
        result: AlisaEntity[],
    ): void {
        if (!id) {
            return;
        }

        let friendlyName: SmartName = this.getSmartName(objects, id);
        if (typeof friendlyName === 'object' && friendlyName) {
            friendlyName = friendlyName[this.lang] || friendlyName.en;
        }

        if (friendlyName === 'ignore' || friendlyName === false) {
            return;
        }

        if (!friendlyName && !roomName && !funcName) {
            return;
        }

        try {
            const options: DetectOptions = {
                objects,
                id,
                _keysOptional: ids,
                _usedIdsOptional: this.usedIds || undefined,
            };
            const controls = this.detector.detect(options);
            if (controls) {
                controls.forEach(control => {
                    const fn = this.converter.types[control.type];
                    if (fn) {
                        const entity = fn(
                            id,
                            control,
                            friendlyName as string,
                            roomName,
                            funcName,
                            objects[id],
                            objects,
                        );
                        if (!entity) {
                            return;
                        }

                        const exists = result.find(e => e.entity_id === entity.entity_id);
                        if (exists) {
                            console.log(`Duplicates found for ${entity.entity_id}`);
                            return;
                        }

                        result.push(entity);
                        this.adapter.log.debug(
                            `[ALISA] Created Yandex Alice device: ${entity.entity_id} - ${control.type} - ${id}`,
                        );
                    }
                });
            } else {
                console.log(`[ALISA] Nothing found for ${options.id}`);
            }
        } catch (e) {
            this.adapter.log.error(`[ALISA] Cannot process "${id}": ${e as string}`);
        }
    }

    private async _readObjects(): Promise<{
        objects: Record<string, ioBroker.Object>;
        enums: Record<string, ioBroker.Object>;
    }> {
        const [states, channels, devices, enumsView] = await Promise.all([
            this.adapter.getObjectViewAsync('system', 'state', {}),
            this.adapter.getObjectViewAsync('system', 'channel', {}),
            this.adapter.getObjectViewAsync('system', 'device', {}),
            this.adapter.getObjectViewAsync('system', 'enum', {}),
        ]);

        const objects: Record<string, ioBroker.Object> = {};
        const enums: Record<string, ioBroker.Object> = {};
        const pushRows = (rows?: { value: ioBroker.Object }[]): void => {
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
                const v = row?.value as ioBroker.Object | undefined;
                if (v?._id) {
                    enums[v._id] = v;
                    objects[v._id] = v;
                }
            }
        }
        return { objects, enums };
    }

    async updateDevices(cb?: () => void): Promise<void> {
        try {
            await this.unsubscribeAllIds();
            this.smartDevices = await this._updateDevices();
            this.adapter.log.debug(`[ALISA] SmartDevices: ${JSON.stringify(this.smartDevices)}`);
            try {
                await this.checkUrlKey();
                await this.subscribeAllIds();
            } catch (err) {
                if ((this.adapter.config as IotAdapterConfig).yandexAlisa) {
                    this.adapter.log.warn(
                        `[ALISA] Invalid URL Pro key. Status auto-update is disabled you can set states but receive states only manually: ${err as string}`,
                    );
                }
            }
        } finally {
            cb?.();
        }
    }

    getDevices(): AlisaSimpleDevice[] {
        const result: AlisaSimpleDevice[] = this.smartDevices.map(device => ({
            name: device.attributes.friendly_name,
            main: { getId: device.STATE.getId, setId: device.STATE.setId },
            attributes: device.ATTRIBUTES
                ? device.ATTRIBUTES.map(a => ({ name: a.attribute, getId: a.getId, setId: a.setId }))
                : [],
            actions: device.context.capabilities.length
                ? device.context.capabilities.map(cap => {
                      const capText = cap.type.replace('devices.capabilities.', '');
                      const capTextUnit = capText + (cap.parameters?.unit ? `_${cap.parameters.unit}` : '');
                      if (!typesMapping[capTextUnit]) {
                          this.adapter.log.debug(`[ALISA] No mapping found for ${capTextUnit}`);
                      }
                      return typesMapping[capTextUnit] || capText;
                  })
                : device.context.properties.map(cap => {
                      const capText = cap.type.replace('devices.properties.', '');
                      const capTextUnit = `${capText}_${cap.parameters?.instance}${cap.parameters?.unit ? `_${cap.parameters.unit}` : ''}`;
                      if (!typesMapping[capTextUnit]) {
                          this.adapter.log.debug(`[ALISA] No mapping found for ${capTextUnit}`);
                      }
                      return typesMapping[capTextUnit] || capText;
                  }),
            iobID: device.context.id,
            description: device.context.description,
            room: device.context.room,
            func: device.context.type.replace('devices.types.', '').toUpperCase(),
        }));
        this.adapter.log.debug(`[ALISA] Devices: ${JSON.stringify(result)}`);
        return result;
    }

    async getAll(): Promise<void> {
        this.smartDevices = await this._updateDevices();
        this.adapter.log.debug(`[ALISA] SmartDevices: ${JSON.stringify(this.smartDevices)}`);
    }

    private async _getSmartDeviceData(entity: AlisaEntity): Promise<AlisaContext | undefined> {
        if (!entity.context) {
            return undefined;
        }
        if (entity.COMMANDS?.get_state) {
            await entity.COMMANDS.get_state(entity);
        }
        return entity.context;
    }

    private _getSmartDeviceState(context: AlisaContext | undefined): AlisaDeviceStateSnapshot {
        const result: AlisaDeviceStateSnapshot = {
            id: context?.id ?? '',
        };

        if (context?.capabilities?.length) {
            const caps: { type: string; state: AlisaCapabilityState }[] = [];
            for (const c of context.capabilities) {
                if (c.state) {
                    caps.push({ type: c.type, state: c.state });
                }
            }
            if (caps.length) {
                result.capabilities = caps;
            }
        }

        if (context?.properties?.length) {
            const props: { type: string; state: AlisaPropertyState }[] = [];
            for (const c of context.properties) {
                if (c.state) {
                    props.push({ type: c.type, state: c.state });
                }
            }
            if (props.length) {
                result.properties = props;
            }
        }

        return result;
    }

    async getSmartDevices(): Promise<(AlisaContext | undefined)[]> {
        await this.getAll();
        return Promise.all(this.smartDevices.map(entity => this._getSmartDeviceData(entity)));
    }

    async querySmartDevicesByIds(
        ids: string[],
    ): Promise<(AlisaContext | undefined | { id: string; error_code: string; error_message: string })[]> {
        const result: (AlisaContext | undefined)[] = [];
        const exists: string[] = [];
        for (const entity of this.smartDevices) {
            if (!ids.includes(entity.context.id)) {
                continue;
            }
            exists.push(entity.context.id);
            result.push(await this._getSmartDeviceData(entity));
        }
        const final: (AlisaContext | undefined | { id: string; error_code: string; error_message: string })[] = [
            ...result,
        ];
        ids.forEach(id => {
            if (!exists.includes(id)) {
                final.push({
                    id,
                    error_code: 'DEVICE_NOT_FOUND',
                    error_message: 'Device not found',
                });
            }
        });
        return final;
    }

    private async _updateDevices(): Promise<AlisaEntity[]> {
        const { objects, enums } = await this._readObjects();
        const ids = Object.keys(objects);

        this.enums = [];
        this.smartDevices = [];
        this.usedIds = [];
        this.keys = [];

        ids.sort();

        const rooms: string[] = [];
        const funcs: string[] = [];
        Object.keys(enums).forEach(id => {
            const smartName = this.getSmartName(enums[id]);
            if (id.match(/^enum\.rooms\./) && smartName !== 'ignore' && smartName !== false) {
                rooms.push(id);
            } else if (id.match(/^enum\.functions\./) && smartName !== 'ignore' && smartName !== false) {
                funcs.push(id);
            }
        });

        const result: AlisaEntity[] = [];
        const roomNames: Record<string, string> = {};

        funcs.forEach(funcId => {
            const func = enums[funcId];
            const members = (func.common as ioBroker.EnumCommon)?.members;
            if (!members || typeof members !== 'object' || !members.length) {
                return;
            }

            let funcName: SmartName = this.getSmartName(func);
            funcName ||= func.common.name;
            if (funcName && typeof funcName === 'object') {
                funcName = funcName[this.lang] || funcName.en;
            }
            if (!funcName) {
                funcName = funcId.substring('enum.functions.'.length);
                funcName = funcName[0].toUpperCase() + funcName.substring(1);
            }

            members.forEach(id => {
                rooms.forEach(roomId => {
                    const room = enums[roomId];
                    const roomMembers = (room.common as ioBroker.EnumCommon)?.members;
                    if (!roomMembers || typeof roomMembers !== 'object' || !roomMembers.length) {
                        return;
                    }

                    if (roomMembers.includes(id)) {
                        if (!roomNames[roomId]) {
                            let roomName: SmartName = this.getSmartName(room);
                            roomName ||= room.common.name;
                            if (roomName && typeof roomName === 'object') {
                                roomName = roomName[this.lang] || roomName.en;
                            }
                            if (!roomName) {
                                roomName = roomId.substring('enum.rooms.'.length);
                                roomName = roomName[0].toUpperCase() + roomName.substring(1);
                            }
                            roomNames[roomId] = roomName;
                        }

                        this.processState(ids, objects, id, roomNames[roomId], funcName, result);
                    }
                });
            });
        });

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
                this.processState(
                    ids,
                    objects,
                    ids[i],
                    roomsT(this.lang, 'undefined'),
                    funcsT(this.lang, 'undefined'),
                    result,
                );
            }
        }

        this.usedIds = null;
        this.keys = null;

        result.forEach(entity =>
            this.adapter.log.debug(`[ALISA] ${entity.context.id} => ${entity.context.type} ${entity.context.name}`),
        );

        return result;
    }

    private async _doSmartDeviceAction(
        entity: AlisaEntity,
        data: AlisaActionData,
    ): Promise<AlisaActionData | AlisaDeviceStateSnapshot> {
        if (entity.COMMANDS?.set_state) {
            return entity.COMMANDS.set_state(entity, data);
        }
        return {
            id: data.id,
            error_code: 'INVALID_ACTION',
            error_message: 'Device has not this action',
        };
    }

    checkUrlKey(_forceCheck?: boolean): Promise<void> {
        const now = Date.now();
        if (this.urlKey && (!this.keyPromise || now - this.keyPromiseTime > 900000)) {
            this.keyPromiseTime = now;
            this.keyPromise = this._performUrlKeyCheck();
        } else {
            this.keyPromise ||= Promise.resolve();
        }
        return this.keyPromise;
    }

    private async _performUrlKeyCheck(): Promise<void> {
        const url = `${URL_STATUS}?user=${encodeURIComponent((this.adapter.config as IotAdapterConfig).login)}&urlKey=${encodeURIComponent(this.urlKey!.key)}&p=${PROTOCOL_VERSION}&v=${this.adapter.version || ''}`;
        try {
            const response = await axios.get(url, { validateStatus: status => status === 200 });
            this.adapter.log.debug(`[ALISA] CHECK URL reported: ${JSON.stringify(response.data)}`);
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
            if ((this.adapter.config as IotAdapterConfig).yandexAlisa) {
                this.adapter.log.error(
                    `[ALISA] Url Key error. Alisa Request and Response are working. But device states are not reported automatically. If you have pro license please try to delete iot.0.certs: ${errorMessage as string}`,
                );
            }
        }
    }

    async updateState(id: string, _state: ioBroker.State): Promise<void> {
        const now = Date.now();
        if (
            !this.urlKeyOk ||
            (this.unknownDevices[id] && now - this.unknownDevices[id] < RETRY_UNKNOWN_DEVICES_INTERVAL)
        ) {
            return;
        }
        if (!this.urlKey) {
            return;
        }

        let i = 0;
        while (i < this.rateCalculation.length) {
            if (now - this.rateCalculation[i] < 60000) {
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
            this.adapter.log.warn(`[ALISA] Sending too fast: ${this.rateCalculation.length} in last minute!`);
            return;
        }

        this.rateCalculation.push(now);

        try {
            const devices = await this.querySmartDevicesByIds([id]);
            const json = {
                ts: Date.now() / 100,
                payload: {
                    user_id: this.user_id,
                    devices: devices.map(d => this._getSmartDeviceState(d as AlisaContext | undefined)),
                },
            };
            this.adapter.log.debug(`[ALISA] Response: ${JSON.stringify(json)}`);
            const url = `${URL_STATUS}?user=${encodeURIComponent((this.adapter.config as IotAdapterConfig).login)}&urlKey=${encodeURIComponent(this.urlKey.key)}&p=${PROTOCOL_VERSION}&v=${this.adapter.version || ''}`;
            const response = await axios.post(url, json, { validateStatus: status => status === 200 });
            if (this.unknownDevices[id]) {
                delete this.unknownDevices[id];
            }
            this.adapter.log.debug(
                `[ALISA] Status reported:  ${JSON.stringify(json)}  ${JSON.stringify(response.data)}`,
            );
        } catch (error) {
            const err = error as {
                response?: { status?: number; data?: unknown; body?: unknown };
                request?: unknown;
                message?: string;
            };
            if (err.response?.status === 404) {
                this.adapter.log.error(`[ALISA] device ${id} is unknown to alisa`);
                this.unknownDevices[id] = Date.now();
            } else if (err.response?.status === 401) {
                this.adapter.log.error(`[ALISA] auth error: ${JSON.stringify(err.response.body)}`);
                this.urlKeyOk = false;
            } else if (err.response?.status === 410) {
                this.adapter.log.error(`[ALISA] invalid protocol version: ${JSON.stringify(err.response.body)}`);
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

                this.adapter.log.error(`[ALISA] Cannot updateState: ${errorMessage as string}`);
                this.adapter.log.debug(`[ALISA] ${JSON.stringify(err.response?.body)}`);
            }
        }
    }

    async doAction(deviceData: AlisaActionData): Promise<AlisaActionData | AlisaDeviceStateSnapshot> {
        const entity = this.smartDevices.find(e => deviceData.id === e.context.id);
        if (entity) {
            return this._doSmartDeviceAction(entity, deviceData);
        }
        return {
            id: deviceData.id,
            error_code: 'DEVICE_NOT_FOUND',
            error_message: 'Device not found',
        };
    }

    async process(
        request: AlisaRequest | undefined,
        isEnabled: boolean,
    ): Promise<
        // /v1.0 (check), unlink, no-payload responses
        | Record<string, never>
        | { error: string; errorCode?: number }
        | { request_id: string; payload: AlisaResponsePayload }
    > {
        if (!request) {
            this.adapter.log.error('[ALISA] Invalid request: no request!');
            return { error: 'Invalid request: no request!' };
        }

        if (!isEnabled) {
            return { error: textsT(this.lang, 'The service deactivated'), errorCode: 500 };
        }

        if (!request.alisa) {
            return { error: textsT(this.lang, 'missing inputs'), errorCode: 400 };
        }

        this.adapter.log.debug(`[ALISA] Received ${JSON.stringify(request.alisa)}`);
        const url = request.alisa.replace(/^\/[-_\w\d]+\//, '/');
        switch (url) {
            // https://yandex.ru/dev/dialogs/alice/doc/smart-home/reference/check-docpage/
            case '/v1.0':
                return {};

            // https://yandex.ru/dev/dialogs/alice/doc/smart-home/reference/get-devices-docpage/
            case '/v1.0/user/devices': {
                const result = {
                    request_id: randomUUID(),
                    payload: {
                        user_id: this.user_id,
                        devices: await this.getSmartDevices(),
                    },
                };
                this.adapter.log.debug(`[ALISA] Response: ${JSON.stringify(result)}`);
                return result;
            }

            // https://yandex.ru/dev/dialogs/alice/doc/smart-home/reference/post-devices-query-docpage/
            case '/v1.0/user/devices/query': {
                const queryDevices = request.devices || [];
                const ids: string[] = [];

                queryDevices.forEach(element => ids.push(element.id));

                if (ids.length) {
                    const devices = await this.querySmartDevicesByIds(ids);
                    const queryPayload: {
                        user_id: string;
                        devices: AlisaDeviceStateSnapshot[] | { id: string }[];
                    } = {
                        user_id: this.user_id,
                        devices: devices.map(d => this._getSmartDeviceState(d as AlisaContext | undefined)),
                    };
                    if (!devices.length) {
                        queryPayload.devices = queryDevices;
                    }
                    const queryResult = {
                        request_id: randomUUID(),
                        payload: queryPayload,
                    };
                    this.adapter.log.debug(`[ALISA] Response: ${JSON.stringify(queryResult)}`);
                    return queryResult;
                }
                break;
            }

            // https://yandex.ru/dev/dialogs/alice/doc/smart-home/reference/post-action-docpage/
            case '/v1.0/user/devices/action': {
                const actionDevices = request.payload ? request.payload.devices || [] : [];
                const devices: (AlisaActionData | AlisaDeviceStateSnapshot)[] = [];

                for (let i = 0; i < actionDevices.length; i++) {
                    devices.push(await this.doAction(actionDevices[i]));
                }

                const result = {
                    request_id: randomUUID(),
                    payload: { devices },
                };
                this.adapter.log.debug(`[ALISA] Response: ${JSON.stringify(result)}`);
                return result;
            }

            // https://yandex.ru/dev/dialogs/alice/doc/smart-home/reference/unlink-docpage/
            case '/alisaIot/v1.0/user/unlink':
                return {};

            default:
                return { error: textsT(this.lang, 'missing data'), errorCode: 400 };
        }

        return { error: textsT(this.lang, 'missing inputs'), errorCode: 400 };
    }
}
