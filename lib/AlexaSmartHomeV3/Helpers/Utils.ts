import { createHash } from 'node:crypto';
import AdapterProvider from './AdapterProvider';
import ChannelDetector, { type DetectOptions, Types } from '@iobroker/type-detector';
import type { AlexaV3EndpointID, IotExternalDetectorState, IotExternalPatternControl, SmartName } from '../types';
import type { IotAdapterConfig } from '../../types';
import roomTranslator from '../../rooms';
import functionTranslator from '../../functions';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function onlyValidCharactersAndLength(name: string): string {
    return name.substring(0, 128).replace(/[^.a-zA-Z0-9äÄüÜöÖßÉéÈèÀàÂâÊêÙùÛûÇçÎîËëÏïŸÿÔôŒœãõìòáíóú]+/g, ' ');
}

function isRoom(enumObject: ioBroker.EnumObject): boolean {
    return enumObject?._id?.startsWith('enum.rooms.');
}

function isFunctionality(enumObject: ioBroker.EnumObject): boolean {
    return enumObject?._id?.startsWith('enum.functions.');
}

async function allEnums(adapter: ioBroker.Adapter): Promise<ioBroker.EnumObject[]> {
    const result = await adapter.getObjectViewAsync('system', 'enum', {});
    return result.rows.map(row => row.value);
}

function parentOf(id: string): string {
    const parts = (id || '').split('.');
    parts.pop();
    return parts.join('.');
}

async function allObjects(adapter: ioBroker.Adapter): Promise<Record<string, ioBroker.Object>> {
    const states = await adapter.getObjectViewAsync('system', 'state', {});
    const channels = await adapter.getObjectViewAsync('system', 'channel', {});
    const devices = await adapter.getObjectViewAsync('system', 'device', {});
    const enums = await adapter.getObjectViewAsync('system', 'enum', {});

    return (states.rows as { id: string; value: ioBroker.Object }[])
        .concat(channels.rows)
        .concat(devices.rows)
        .concat(enums.rows)
        .reduce(
            (obj, item) => (
                (obj[item.id] = {
                    common: item.value?.common,
                    type: item.value?.type,
                } as ioBroker.Object),
                obj
            ),
            {} as Record<string, ioBroker.Object>,
        );
}

const SMART_TYPES: { [name: string]: string } = {
    LIGHT: 'light',
    SWITCH: 'socket',
    THERMOSTAT: 'thermostat',
    SMARTPLUG: 'socket',
    SMARTLOCK: 'lock',
    CAMERA: 'camera',
};

function getSmartNameFromObj(
    obj: ioBroker.Object | ioBroker.StateCommon,
    instanceId: string,
    noCommon?: boolean,
): SmartName | undefined {
    if (!obj) {
        return undefined;
    }
    if (!(obj as ioBroker.StateObject).common) {
        return (obj as ioBroker.StateCommon).smartName;
    }

    if (!noCommon) {
        return (obj as ioBroker.StateObject).common.smartName;
    }
    const custom = (obj as ioBroker.StateObject).common.custom;
    if (!custom) {
        return undefined;
    }
    return custom[instanceId] ? custom[instanceId].smartName : undefined;
}

async function functionalitiesAndRooms(
    adapter: ioBroker.Adapter,
): Promise<[ioBroker.EnumObject[], ioBroker.EnumObject[]]> {
    const enumerations = await allEnums(adapter);
    // skip empty enums (with no members, i.e. states, assigned)
    const notEmptyRoomsAndFunctionalities = enumerations
        .filter(item => {
            const smartName = getSmartNameFromObj(
                item,
                adapter.namespace,
                (adapter.config as IotAdapterConfig).noCommon,
            );
            return smartName !== false && smartName !== 'ignore';
        })
        .filter(item => item?.common?.members?.length);
    // all enums that are of type 'function'
    const functionalities = notEmptyRoomsAndFunctionalities.filter(item => isFunctionality(item));
    // all enums, that are of type 'room'
    const rooms = notEmptyRoomsAndFunctionalities.filter(item => isRoom(item));
    return [functionalities, rooms];
}

function getChannelId(id: string, objects: Record<string, ioBroker.Object>): string | null | undefined {
    if (objects[id] && objects[id].type === 'channel') {
        return id;
    }

    if (objects[id] && objects[id].type === 'state') {
        const channelId = parentOf(id);
        if (objects[channelId] && objects[channelId].type === 'channel') {
            return channelId;
        }
        return null;
    }
}

function getDeviceId(id: string, objects: Record<string, ioBroker.Object>): string | null {
    const channelId = getChannelId(id, objects);
    if (channelId) {
        const deviceId = parentOf(channelId);
        if (objects[deviceId] && (objects[deviceId].type === 'device' || objects[deviceId].type === 'channel')) {
            return deviceId;
        }
    }
    return null;
}

export function parseISOString(dateTimeAsISOString: string): Date {
    const [year, month, date, hours, minutes, seconds, ms]: string[] = dateTimeAsISOString.split(/\D+/);
    return new Date(
        Date.UTC(
            parseInt(year, 10),
            parseInt(month, 10) - 1,
            parseInt(date, 10),
            parseInt(hours, 10),
            parseInt(minutes, 10),
            parseInt(seconds, 10),
            parseInt(ms, 10),
        ),
    );
}

export function configuredRangeOrDefault(state: IotExternalDetectorState): {
    min: number | boolean;
    max: number | boolean;
} {
    if (state.common?.type === 'boolean') {
        return { min: false, max: true };
    }
    const configuredMin = state.common?.min;
    const configuredMax = state.common?.max;
    const min =
        configuredMin === undefined || isNaN(configuredMin) ? 0 : parseFloat(configuredMin as unknown as string);
    const max =
        configuredMax === undefined || isNaN(configuredMax) ? 100 : parseFloat(configuredMax as unknown as string);

    return { min, max };
}

export function currentHour(): Date {
    const datetime = new Date();
    datetime.setMinutes(0);
    datetime.setSeconds(0);
    return datetime;
}

export function isToday(dateTime: Date): boolean {
    const today = new Date();
    return (
        dateTime.getDate() === today.getDate() &&
        dateTime.getMonth() === today.getMonth() &&
        dateTime.getFullYear() === today.getFullYear()
    );
}

export function isCurrentHour(dateTime: Date): boolean {
    const now = new Date();
    const diffInHours = Math.abs(now.getTime() - dateTime.getTime()) / 3.6e6;
    return diffInHours < 1;
}

export function endpointId(id: string): AlexaV3EndpointID {
    // even more restrictive than Alexa documents
    const regex = /^[A-Za-z0-9\-_]{1,256}$/g;
    id = id.replace(/\s/g, '_');
    if (!regex.test(id)) {
        const hash = createHash('sha256').update(id).digest('hex');
        id = `${hash}#${id.replace(/[^A-Za-z0-9\-_]+/g, '-')}`.substring(0, 256);
    }

    return id;
}

export function onlyValidCharactersAndLengthForFriendlyName(name: string): string {
    return name.substring(0, 128).replace(/[^.a-zA-Z0-9äÄüÜöÖßÉéÈèÀàÂâÊêÙùÛûÇçÎîËëÏïŸÿÔôŒœãõìòáíóú]+/g, ' ');
}

export function stringify(smartName: SmartName, lang: ioBroker.Languages): string {
    if (smartName && typeof smartName === 'object') {
        return smartName[lang] || smartName.en || '';
    }
    if (!smartName) {
        return '';
    }
    return onlyValidCharactersAndLengthForFriendlyName(smartName);
}

export function friendlyNameByRoomAndFunctionName(
    control: IotExternalPatternControl,
    lang: ioBroker.Languages,
): string {
    const config: IotAdapterConfig = AdapterProvider.get().config as IotAdapterConfig;
    const funcNameFirst = config.functionFirst;
    let concatenation = config.concatWord;
    let name;

    let roomName: ioBroker.StringOrTranslated | undefined = control.room?.common?.name;
    let translateRoomName;
    if (typeof roomName === 'object') {
        // try to translate from EN to any other language
        translateRoomName = lang && lang !== 'en' && !roomName[lang];
        roomName = roomName[lang] || roomName.en || '';
    } else {
        // always try to translate room names provided as a non-object type
        translateRoomName = true;
    }

    if (translateRoomName && roomName) {
        roomName = roomTranslator(lang, roomName);
    }

    let funcName = control.functionality?.common?.name;
    let translateFunctionalityName;
    if (typeof funcName === 'object') {
        translateFunctionalityName = lang && lang !== 'en' && !funcName[lang];
        funcName = funcName[lang] || funcName.en;
    } else {
        translateFunctionalityName = true;
    }
    if (translateFunctionalityName && funcName) {
        funcName = functionTranslator(lang, funcName);
    }

    concatenation = concatenation ? ` ${concatenation} ` : ' ';

    name = `${funcNameFirst ? funcName : roomName}${concatenation}${funcNameFirst ? roomName : funcName}`;
    name = name.trim();

    return onlyValidCharactersAndLengthForFriendlyName(name);
}
/**
 * Checks whether the provided value is a valid smart name.
 *
 * @param smartName The value to check
 * @param lang Configured language
 * @returns True if a valid smart name, false - otherwise.
 */
export function isValidSmartName(smartName: SmartName | undefined, lang: ioBroker.Languages): boolean {
    let name = smartName;
    if (smartName === false || smartName === 'ignore') {
        return false;
    }
    if (smartName && typeof smartName === 'object') {
        name = smartName[lang] || smartName.en || smartName.de;
    }
    return ![null, undefined, 'ignore', false].includes(name as string);
}
/**
 * Checks a value for validity or returns a default.
 *
 * @param value The value being checked
 * @param defaultValue A default value if the passed value is not valid
 * @returns The passed value if valid otherwise the default value.
 */
export function defaultIfNullOrEmpty<T>(value: T | undefined, defaultValue: T): T {
    if (
        value === undefined ||
        value === null ||
        (typeof value === 'object' && Object.keys(value).length === 0) ||
        value === ''
    ) {
        return defaultValue;
    }

    return value;
}
/**
 * Inspects all objects (states, channels and devices) and tries to identify so-called 'controls'
 *
 * To identify the controls, the ioBroker type detector library is used (https://github.com/ioBroker/ioBroker.type-detector).
 *
 * @param adapter The iot adapter instance
 * @param lang language
 * @returns An array containing the detected controls
 */
export async function controls(
    adapter: ioBroker.Adapter,
    lang: ioBroker.Languages,
): Promise<IotExternalPatternControl[]> {
    // here we collect ids to inspect
    const list: string[] = [];

    // fetch all objects (states, channels and devices in terms of iobroker)
    const devicesObject = await allObjects(adapter);
    // fetch all defined rooms and functions (enumerations)
    const [functionalities, rooms] = await functionalitiesAndRooms(adapter);

    // every member of a function enumeration is added to the list of ids to inspect
    functionalities.forEach(functionEnumItem => {
        functionEnumItem.common.members?.forEach(id => {
            const smartName = getSmartNameFromObj(
                devicesObject[id],
                adapter.namespace,
                (adapter.config as IotAdapterConfig).noCommon,
            );

            if (
                devicesObject[id]?.common &&
                (devicesObject[id].type === 'state' ||
                    devicesObject[id].type === 'channel' ||
                    devicesObject[id].type === 'device') &&
                !list.includes(id) &&
                smartName !== false && // if the device is not disabled
                smartName !== 'ignore'
            ) {
                list.push(id);
            }
        });
    });

    // a member of a room enumeration is only added if neither its parent (channel) nor its grandparent (device) is in
    rooms.forEach(roomEnumItem => {
        roomEnumItem.common.members?.forEach(id => {
            const smartName = getSmartNameFromObj(
                devicesObject[id],
                adapter.namespace,
                (adapter.config as IotAdapterConfig).noCommon,
            );
            if (
                devicesObject[id] &&
                devicesObject[id].common &&
                (devicesObject[id].type === 'state' ||
                    devicesObject[id].type === 'channel' ||
                    devicesObject[id].type === 'device') &&
                !list.includes(id) &&
                smartName !== false && // if the device is not disabled
                smartName !== 'ignore'
            ) {
                const channelId = getChannelId(id, devicesObject);
                if (channelId) {
                    if (!list.includes(channelId)) {
                        const deviceId = getDeviceId(id, devicesObject);
                        if (deviceId) {
                            if (!list.includes(deviceId)) {
                                list.push(id);
                            }
                        } else {
                            list.push(id);
                        }
                    }
                } else {
                    list.push(id);
                }
            }
        });
    });

    // all ids, i.e. ids of all iobroker states/channels/devices
    const keys = Object.keys(devicesObject).sort();

    const idsWithSmartName: string[] = [];
    // if a state has got a smart name directly assigned and neither itself nor its channel is in the list, add its id to the inspection list
    // and process it first
    keys.forEach(id => {
        const smartName =
            devicesObject[id] &&
            getSmartNameFromObj(devicesObject[id], adapter.namespace, (adapter.config as IotAdapterConfig).noCommon);
        if (
            isValidSmartName(smartName, lang) &&
            devicesObject[id].common &&
            (devicesObject[id].type === 'state' ||
                devicesObject[id].type === 'channel' ||
                devicesObject[id].type === 'device')
        ) {
            idsWithSmartName.push(id);
        }
    });

    // collect first all smart names and remove them from the auto-groups
    const detectedControls: IotExternalPatternControl[] = [];
    const detector = new ChannelDetector();

    const patterns = ChannelDetector.getPatterns();
    // process states with defined smartName
    for (let s = 0; s < idsWithSmartName.length; s++) {
        const id = idsWithSmartName[s];
        const common = devicesObject[id].common;
        const smartName = getSmartNameFromObj(
            devicesObject[id],
            adapter.namespace,
            (adapter.config as IotAdapterConfig).noCommon,
        ) as { [lang in ioBroker.Languages]?: string } & {
            smartType?: string | null;
            byON?: string | null;
            toggle?: number;
        };

        // try to convert the state to typeDetector format
        // "smartName": {
        //    "de": "Rote Lampe",
        //    "smartType": "LIGHT", // optional
        //    "byON": 80            // optional
        //  }
        if (!smartName.smartType) {
            // by default,
            // all booleans are sockets
            // all numbers are dimmer
            // string is not possible to control
            if (common.type === 'boolean' || common.type === 'mixed') {
                // we will write boolean
                smartName.smartType = 'socket';
            } else if (common.type === 'number') {
                smartName.smartType = 'dimmer';
            } else {
                smartName.smartType = 'socket';
            }
        }
        // convert alexa2 smartType to alexa 3
        if (SMART_TYPES[smartName.smartType]) {
            smartName.smartType = SMART_TYPES[smartName.smartType];
        }
        // try to simulate typeDetector format
        if (patterns[smartName.smartType]) {
            const control: IotExternalPatternControl = JSON.parse(JSON.stringify(patterns[smartName.smartType]));
            // find first required
            const state = control.states.find(state => state.required);
            if (state) {
                state.id = id;
                // process control
                // remove all unassigned control register
                control.states = control.states.filter(s => s.id);

                // take all smartNames if any
                control.states.forEach(s => {
                    s.smartName = getSmartNameFromObj(
                        devicesObject[s.id],
                        adapter.namespace,
                        (adapter.config as IotAdapterConfig).noCommon,
                    );
                    s.common = {
                        min: devicesObject[s.id]?.common?.min,
                        max: devicesObject[s.id]?.common?.max,
                        type: devicesObject[s.id]?.common?.type,
                        states: devicesObject[s.id]?.common?.states,
                        role: devicesObject[s.id]?.common?.role,
                        name: devicesObject[s.id]?.common?.name,
                    };
                });

                devicesObject[id].common.smartName = smartName;

                control.object = {
                    id,
                    type: devicesObject[id].type,
                    common: devicesObject[id].common,
                    autoDetected: false,
                    toggle: smartName?.toggle,
                };

                // remove id from the groups
                let pos = list.indexOf(id);
                if (pos !== -1) {
                    list.splice(pos, 1);
                }
                const channelId = getChannelId(id, devicesObject);
                if (channelId) {
                    pos = list.indexOf(channelId);
                    if (pos !== -1) {
                        list.splice(pos, 1);
                    }
                }

                const name = smartName[lang] || smartName.en || smartName.de;
                control.groupNames = name?.split(',').map(n => n.trim()) || [];

                adapter.log.debug(`[ALEXA3] added ${id} with smartName as "${smartName.smartType}"`);
                detectedControls.push(control);
            } else {
                // ignored
                adapter.log.debug(
                    `[ALEXA3] Ignored state ${id} with smartName ${JSON.stringify(smartName)} and type ${common.type}`,
                );
            }
        } else {
            // ignored
            adapter.log.debug(
                `[ALEXA3] Ignored state ${id} with smartName ${JSON.stringify(smartName)} and type ${common.type}`,
            );
        }
    }

    // initialize iobroker type detector
    const usedIds: string[] = [];
    const ignoreIndicators = ['UNREACH_STICKY']; // Ignore indicators by name
    const excludedTypes = [Types.info];
    const options: DetectOptions = {
        objects: devicesObject,
        _keysOptional: keys,
        _usedIdsOptional: usedIds,
        ignoreIndicators,
        excludedTypes,
        id: '', // this will be set for each id in the list
    };

    // go other the list of IDs to inspect and collect the detected controls
    list.forEach(id => {
        options.id = id;
        const controls = detector.detect(options);
        controls?.forEach(control => {
            const iotControl: IotExternalPatternControl = control as IotExternalPatternControl;

            // if any detected state has an ID, we can use this control
            if (iotControl.states.find(state => state.id)) {
                // console.log(`In ${id} was detected "${control.type}" with the following states:`);

                // remove all unassigned control register
                iotControl.states = iotControl.states.filter(s => s.id);

                // take all smartNames if any
                iotControl.states.forEach(s => {
                    s.smartName = getSmartNameFromObj(
                        devicesObject[s.id],
                        adapter.namespace,
                        (adapter.config as IotAdapterConfig).noCommon,
                    );
                    s.common = {
                        min: devicesObject[s.id]?.common?.min,
                        max: devicesObject[s.id]?.common?.max,
                        type: devicesObject[s.id]?.common?.type,
                        states: devicesObject[s.id]?.common?.states,
                        role: devicesObject[s.id]?.common?.role,
                        name: devicesObject[s.id]?.common?.name,
                    };
                });

                // find out the room the found control is in
                const room = rooms.find(room => room?.common?.members?.includes(id));

                // find out the functionality the found control assigned to
                const functionality = functionalities.find(functionality =>
                    functionality?.common?.members?.includes(id),
                );

                const smartName = getSmartNameFromObj(
                    devicesObject[id],
                    adapter.namespace,
                    (adapter.config as IotAdapterConfig).noCommon,
                );
                iotControl.object = {
                    id,
                    type: devicesObject[id].type,
                    common: {
                        min: devicesObject[id].common?.min,
                        max: devicesObject[id].common?.max,
                        type: devicesObject[id].common?.type,
                        states: devicesObject[id].common?.states,
                        role: devicesObject[id].common?.role,
                        name: devicesObject[id].common?.name,
                        smartName,
                    },
                    autoDetected: true,
                    toggle: smartName && typeof smartName === 'object' ? smartName.toggle : undefined,
                };

                iotControl.room = room
                    ? {
                          id: room._id,
                          common: room.common,
                      }
                    : undefined;

                iotControl.functionality = functionality
                    ? {
                          id: functionality._id,
                          common: functionality.common,
                      }
                    : undefined;

                detectedControls.push(iotControl);
            }
        });
    });

    return detectedControls;
}

/**
 * Normalizes any provided value with observed min and max to the range 0..100
 *
 * @param value value to be normalized
 * @param min min observed (possible) value
 * @param max max observed (possible) value
 * @returns Normalized value in the range 0..100 or undefined on invalid input
 */
export function normalize_0_100(value: number, min: number, max: number): number | undefined {
    return min >= max || value < min || value > max ? undefined : Math.round(((value - min) / (max - min)) * 100);
}

/**
 * Denormalizes any provided value from range 0..100 to the min..max range
 *
 * @param normalized normalized value
 * @param min min observed (possible) value
 * @param max max observed (possible) value
 * @returns Denormalized value in the range min-max
 */
export function denormalize_0_100(normalized: number, min: number, max: number): number | undefined {
    return min >= max || normalized < 0 || normalized > 100
        ? undefined
        : Math.round((normalized / 100) * (max - min) + min);
}

/**
 * Returns distinct objects in a list based on values of the provided property name
 *
 * @param list - list of objects
 * @param propertyName - name of the property to build distinct values on
 * @param combineValues - if the values should be combined and not just overwritten
 * @returns List containing at most one element per property value
 */
export function distinctByPropertyName<T extends Record<string, any>>(
    list: T[],
    propertyName: keyof T,
    combineValues?: boolean,
): T[] {
    const map = new Map<T[keyof T], T>();
    for (const item of list) {
        const key = item[propertyName];
        if (combineValues && map.has(key)) {
            const existing = map.get(key)!;
            if (existing.value === 'ON' || existing.value === 'OFF') {
                if ((item as any).value === 'ON') {
                    (existing as any).value = (item as any).value;
                }
            } else if (isFinite((existing as any).value) && isFinite((item as any).value)) {
                (existing as any).value = Math.max((existing as any).value, (item as any).value);
            }
            continue;
        }
        map.set(key, item);
    }
    return Array.from(map.values());
}

export function className(thisToString: string): string {
    const classNameRegEx = /\S+\s+([a-zA-Z_$][0-9a-zA-Z_$]*)/;
    const result = classNameRegEx.exec(thisToString);
    return result?.[1] || 'UnknownClass';
}

/**
 * Updates the provided value if required to fit it into the range 0..100
 */
export function ensureValueInRange_0_100(value: number): number {
    return ensureValueInRange(value, 0, 100);
}

/**
 * Updates the provided value if required to fit it into the range min..max
 */
export function ensureValueInRange(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

export function firstLower(input: string): string {
    if (!input || typeof input !== 'string') {
        return input;
    }
    return input[0].toLowerCase() + input.slice(1);
}

export function closestFromList(target: number, list: number[]): number {
    return list.reduce((prev, curr) => (Math.abs(curr - target) < Math.abs(prev - target) ? curr : prev));
}

export function asEnum(values: string[]): Record<string, number | string> {
    const enumeration: Record<string, number | string> = {};
    for (let i = 0; i < values.length; i++) {
        enumeration[i] = values[i];
        enumeration[values[i]] = i;
        i++;
    }
    return enumeration;
}
