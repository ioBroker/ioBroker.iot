import { createHash } from 'node:crypto';
import AdapterProvider from './AdapterProvider';
import ChannelDetector, { type DetectOptions, Types } from '@iobroker/type-detector';
import {
    roleOrEnumLight,
    roleOrEnumBlind,
    roleOrEnumWindow,
    roleOrEnumDoor,
    roleOrEnumGate,
} from '@iobroker/type-detector/roleEnumUtils';
import type {
    AlexaV3EndpointID,
    IotExternalDetectorState,
    IotExternalPatternControl,
    SmartName,
    SmartNameObject,
} from '../types';
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

const SMART_TYPES: { [name: string]: Types } = {
    LIGHT: Types.light,
    SWITCH: Types.socket,
    THERMOSTAT: Types.thermostat,
    SMARTPLUG: Types.socket,
    SMARTLOCK: Types.lock,
    CAMERA: Types.camera,
};

function getSmartNameFromObj(
    obj: ioBroker.Object | ioBroker.StateCommon,
    instanceId: string,
    noCommon?: boolean,
): undefined | false | SmartNameObject {
    if (!obj) {
        return undefined;
    }
    let result: undefined | false | SmartNameObject;
    // If it is a common object
    if (!(obj as ioBroker.StateObject).common) {
        result = (obj as ioBroker.StateCommon).smartName as undefined | false | SmartNameObject;
    } else if (!noCommon) {
        result = (obj as ioBroker.StateObject).common.smartName as undefined | false | SmartNameObject;
    } else {
        const custom = (obj as ioBroker.StateObject).common.custom;
        if (!custom) {
            return undefined;
        }
        result = custom[instanceId] ? custom[instanceId].smartName : undefined;
    }
    if (result && typeof result === 'string') {
        if (result === 'ignore') {
            return false;
        }
        return {
            en: result,
        };
    }
    // @ts-expect-error backwards compatibility
    if (result === true) {
        // Bug??
        return undefined;
    }

    return result;
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
            return smartName !== false;
        })
        .filter(item => item?.common?.members?.length);
    // all enums that are of type 'function'
    const functionalities = notEmptyRoomsAndFunctionalities.filter(item => isFunctionality(item));
    // all enums, that are of type 'room'
    const rooms = notEmptyRoomsAndFunctionalities.filter(item => isRoom(item));
    return [functionalities, rooms];
}

function getChannelId(id: string, objects: Record<string, ioBroker.Object>): string | null | undefined {
    if (objects[id]?.type === 'channel') {
        return id;
    }

    if (objects[id]?.type === 'state') {
        const channelId = parentOf(id);
        if (objects[channelId]?.type === 'channel') {
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
    const config: IotAdapterConfig = AdapterProvider.get().config;
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
        functionEnumItem?.common?.members?.forEach(id => {
            if (!devicesObject[id]) {
                // Enum has unknown member
                return;
            }
            const smartName = getSmartNameFromObj(
                devicesObject[id],
                adapter.namespace,
                (adapter.config as IotAdapterConfig).noCommon,
            );

            const objType = devicesObject[id].type;
            if (
                devicesObject[id].common &&
                (objType === 'state' || objType === 'channel' || objType === 'device') &&
                !list.includes(id) &&
                smartName !== false // if the device is not disabled
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

    // a member of a room enumeration is only added if neither its parent (channel) nor its grandparent (device) is in
    rooms.forEach(roomEnumItem => {
        roomEnumItem.common.members?.forEach(id => {
            if (!devicesObject[id]) {
                return;
            }
            const smartName = getSmartNameFromObj(
                devicesObject[id],
                adapter.namespace,
                (adapter.config as IotAdapterConfig).noCommon,
            );
            const objType = devicesObject[id].type;
            if (
                devicesObject[id].common &&
                (objType === 'state' || objType === 'channel' || objType === 'device') &&
                !list.includes(id) &&
                smartName !== false // if the device is not disabled
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

        const objType = devicesObject[id].type;

        if (
            isValidSmartName(smartName, lang) &&
            devicesObject[id].common &&
            (objType === 'state' || objType === 'channel' || objType === 'device')
        ) {
            idsWithSmartName.push(id);
        }
    });

    // collect first all smart names and remove them from the auto-groups
    const detectedControls: IotExternalPatternControl[] = [];
    const detector = new ChannelDetector();

    const patterns = ChannelDetector.getPatterns();
    const usedIds: string[] = [];
    const ignoreIndicators = ['UNREACH_STICKY']; // Ignore indicators by name
    const excludedTypes = [Types.info];
    // initialize iobroker type detector
    const options: DetectOptions = {
        objects: devicesObject,
        _keysOptional: keys,
        _usedIdsOptional: usedIds,
        ignoreIndicators,
        excludedTypes,
        detectParent: true,
        id: '', // this will be set for each id in the list
    };

    // process states with defined smartName
    for (let s = 0; s < idsWithSmartName.length; s++) {
        const id = idsWithSmartName[s];
        const common = devicesObject[id].common;
        const smartName = getSmartNameFromObj(
            devicesObject[id],
            adapter.namespace,
            (adapter.config as IotAdapterConfig).noCommon,
        ) as SmartNameObject;

        if (!smartName) {
            continue;
        }
        options.id = id;
        // Try to detect with typeDetector
        let controls = detector.detect(options);

        // try to convert the state to typeDetector format
        // "smartName": {
        //    "de": "Rote Lampe",
        //    "smartType": "LIGHT", // optional
        //    "byON": 80            // optional
        //  }
        if (!smartName.smartType) {
            // by default,
            if (controls && controls.length > 0) {
                // take the first detected control
                smartName.smartType = controls[0].type;
            } else {
                // if the upper object is channel or device, try to detect there
                const channelId = getChannelId(id, devicesObject);
                const deviceId = getDeviceId(id, devicesObject);
                const enums: string[] = [];
                for (let f = 0; f < functionalities.length; f++) {
                    const functionEnumItem = functionalities[f];
                    const members = functionEnumItem.common.members || [];
                    if (
                        members.includes(id) ||
                        (channelId && members.includes(channelId)) ||
                        (deviceId && members.includes(deviceId))
                    ) {
                        enums.push(functionEnumItem._id);
                    }
                }
                // Is it light related?
                if (
                    roleOrEnumLight(devicesObject[id], enums) ||
                    (channelId && roleOrEnumLight(devicesObject[channelId], enums)) ||
                    (deviceId && roleOrEnumLight(devicesObject[deviceId], enums))
                ) {
                    // we will write light
                    if (common.type === 'boolean') {
                        smartName.smartType = Types.light;
                    } else if (common.type === 'number') {
                        smartName.smartType = Types.dimmer;
                    }
                } else if (
                    common.type === 'number' &&
                    (roleOrEnumBlind(devicesObject[id], enums) ||
                        (channelId && roleOrEnumBlind(devicesObject[channelId], enums)) ||
                        (deviceId && roleOrEnumBlind(devicesObject[deviceId], enums)))
                ) {
                    // we will write blind
                    smartName.smartType = Types.blind;
                } else if (
                    common.type === 'number' &&
                    (roleOrEnumWindow(devicesObject[id], enums) ||
                        (channelId && roleOrEnumWindow(devicesObject[channelId], enums)) ||
                        (deviceId && roleOrEnumWindow(devicesObject[deviceId], enums)))
                ) {
                    // we will write window
                    if (common.type === 'number' && !common.states) {
                        smartName.smartType = Types.blind;
                    } else if (common.states) {
                        smartName.smartType = Types.windowTilt; // fallback
                    } else {
                        smartName.smartType = Types.window;
                    }
                } else if (
                    common.type === 'boolean' &&
                    (roleOrEnumDoor(devicesObject[id], enums) ||
                        (channelId && roleOrEnumDoor(devicesObject[channelId], enums)) ||
                        (deviceId && roleOrEnumDoor(devicesObject[deviceId], enums)))
                ) {
                    // we will write door
                    smartName.smartType = Types.door;
                } else if (
                    common.type === 'boolean' &&
                    (roleOrEnumGate(devicesObject[id], enums) ||
                        (channelId && roleOrEnumGate(devicesObject[channelId], enums)) ||
                        (deviceId && roleOrEnumGate(devicesObject[deviceId], enums)))
                ) {
                    // we will write gate
                    smartName.smartType = Types.gate;
                } else {
                    // all booleans are sockets
                    // all numbers are dimmer
                    // string is not possible to control
                    if (common.type === 'boolean' || common.type === 'mixed') {
                        // Try to find out if it in a category with light, lights or lamp, and so on
                        if (common.read === false) {
                            // write socket if writable, but not readable
                            smartName.smartType = Types.button;
                        } else {
                            // we will write boolean
                            smartName.smartType = Types.socket;
                        }
                    } else if (common.type === 'number') {
                        smartName.smartType = Types.slider;
                    } else {
                        smartName.smartType = Types.socket; // fallback
                    }
                }
            }
        } else if (controls?.length && controls[0].type !== smartName.smartType) {
            // If the user specified a different type, prefer it
            controls = null;
        }

        // convert alexa2 smartType to alexa 3
        if (smartName.smartType && SMART_TYPES[smartName.smartType]) {
            smartName.smartType = SMART_TYPES[smartName.smartType];
        }
        const pattern =
            smartName.smartType && Object.keys(patterns).find(p => patterns[p].type === smartName.smartType);

        // try to simulate typeDetector format
        if (smartName.smartType && pattern) {
            const control: IotExternalPatternControl = controls?.[0] || JSON.parse(JSON.stringify(patterns[pattern]));

            // find first required
            const state = control.states.find(state => state.required);
            if (state) {
                if (!controls?.[0]) {
                    state.id = id;
                }
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
 * @param noRound do not round the result
 * @returns Normalized value in the range 0..100 or undefined on invalid input
 */
export function normalize_0_100(value: number, min: number, max: number, noRound?: boolean): number | undefined {
    if (noRound) {
        return min >= max || value < min || value > max ? undefined : ((value - min) / (max - min)) * 100;
    }
    return min >= max || value < min || value > max ? undefined : Math.round(((value - min) / (max - min)) * 100);
}

/**
 * Denormalizes any provided value from range 0..100 to the min..max range
 *
 * @param normalized normalized value
 * @param min min observed (possible) value
 * @param max max observed (possible) value
 * @param noRound do not round the result
 * @returns Denormalized value in the range min-max
 */
export function denormalize_0_100(normalized: number, min: number, max: number, noRound?: boolean): number | undefined {
    if (noRound) {
        return min >= max || normalized < 0 || normalized > 100 ? undefined : (normalized / 100) * (max - min) + min;
    }

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
    }
    return enumeration;
}

function toHex(x: number): string {
    return x.toString(16).padStart(2, '0');
}
function to255(x: number): number {
    return Math.round(x * 255);
}

/**
 * Converts a color from HAL (Hue, Saturation, Brightness) to RGB hex string
 *
 * @param hal The color in HAL format
 * @param hal.hue The hue (0-360)
 * @param hal.saturation The saturation (0-1)
 * @param hal.brightness The brightness (0-1)
 * @returns The color in RGB hex format (e.g. #ff0000 for red)
 */
export function hal2rgb(hal: { hue: number; saturation: number; brightness: number }): string {
    const hue = hal.hue;
    const saturation = hal.saturation;
    const brightness = hal.brightness;

    let r: number;
    let g: number;
    let b: number;

    const i = Math.floor(hue / 60) % 6;
    const f = hue / 60 - i;
    const p = brightness * (1 - saturation);
    const q = brightness * (1 - f * saturation);
    const t = brightness * (1 - (1 - f) * saturation);

    switch (i) {
        case 0:
            r = brightness;
            g = t;
            b = p;
            break;
        case 1:
            r = q;
            g = brightness;
            b = p;
            break;
        case 2:
            r = p;
            g = brightness;
            b = t;
            break;
        case 3:
            r = p;
            g = q;
            b = brightness;
            break;
        case 4:
            r = t;
            g = p;
            b = brightness;
            break;
        case 5:
            r = brightness;
            g = p;
            b = q;
            break;
        default:
            r = 0;
            g = 0;
            b = 0;
    }

    return `#${toHex(to255(r))}${toHex(to255(g))}${toHex(to255(b))}`;
}

export function hal2rgbw(hal: { hue: number; saturation: number; brightness: number }): string {
    const hue = hal.hue;
    const saturation = hal.saturation;
    const brightness = hal.brightness;

    let r: number;
    let g: number;
    let b: number;

    const i = Math.floor(hue / 60) % 6;
    const f = hue / 60 - i;
    const p = brightness * (1 - saturation);
    const q = brightness * (1 - f * saturation);
    const t = brightness * (1 - (1 - f) * saturation);

    switch (i) {
        case 0:
            r = brightness;
            g = t;
            b = p;
            break;
        case 1:
            r = q;
            g = brightness;
            b = p;
            break;
        case 2:
            r = p;
            g = brightness;
            b = t;
            break;
        case 3:
            r = p;
            g = q;
            b = brightness;
            break;
        case 4:
            r = t;
            g = p;
            b = brightness;
            break;
        case 5:
            r = brightness;
            g = p;
            b = q;
            break;
        default:
            r = 0;
            g = 0;
            b = 0;
    }

    return `#${toHex(to255(r))}${toHex(to255(g))}${toHex(to255(b))}${toHex(to255(255))}`;
}

/**
 * Convert an RGB hex string to HAL (Hue, Saturation, Brightness)
 *
 * @param rgb The color in RGB hex format (e.g. #ff0000 for red)
 * @returns The color in HAL format or null on invalid input
 */
export function rgb2hal(rgb: string): { hue: number; saturation: number; brightness: number } {
    if (!rgb || typeof rgb !== 'string' || !rgb.startsWith('#') || (rgb.length !== 7 && rgb.length !== 4)) {
        return {
            hue: 0,
            saturation: 0,
            brightness: 0,
        };
    }

    let r: number;
    let g: number;
    let b: number;

    if (rgb.length === 7) {
        r = parseInt(rgb.substring(1, 3), 16);
        g = parseInt(rgb.substring(3, 5), 16);
        b = parseInt(rgb.substring(5, 7), 16);
    } else {
        r = parseInt(rgb[1] + rgb[1], 16);
        g = parseInt(rgb[2] + rgb[2], 16);
        b = parseInt(rgb[3] + rgb[3], 16);
    }

    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h: number;
    const v = max;

    const d = max - min;
    const s = max === 0 ? 0 : d / max;

    if (max === min) {
        h = 0; // achromatic
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
            default:
                h = 0;
        }
        h /= 6;
    }

    return {
        hue: Math.round(h * 360),
        saturation: parseFloat(s.toFixed(2)),
        brightness: parseFloat(v.toFixed(2)),
    };
}

/** Convert rgb(w)(1-255,1-255,1-255(,0-1)) to hex string */
export function rgbwToHex(rgbw: string): string {
    if (!rgbw || typeof rgbw !== 'string') {
        return '#00000000';
    }
    if (rgbw.startsWith('#')) {
        return rgbw;
    }
    if (rgbw.startsWith('rgba(')) {
        rgbw = rgbw.substring(5, rgbw.length - 1);
    } else if (rgbw.startsWith('rgb(')) {
        rgbw = rgbw.substring(4, rgbw.length - 1);
    }
    const parts = rgbw.split(',');
    if (parts.length < 3 || parts.length > 4) {
        return '#000000';
    }
    let r = parseInt(parts[0].trim(), 10);
    let g = parseInt(parts[1].trim(), 10);
    let b = parseInt(parts[2].trim(), 10);
    let w = parts.length === 4 ? parseFloat(parts[3].trim()) : 1;

    if (isNaN(r) || isNaN(g) || isNaN(b) || isNaN(w)) {
        if (parts.length === 4) {
            return '#00000000';
        }
        return '#000000';
    }
    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));
    w = Math.max(0, Math.min(1, w));

    if (parts.length === 3) {
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }
    return `#${toHex(r)}${toHex(g)}${toHex(b)}${toHex(Math.round(w * 255))}`;
}

/**
 * Convert an RGBW hex string to HAL (Hue, Saturation, Brightness)
 *
 * @param rgbw The color in RGB hex format (e.g. #ff0000 for red)
 * @returns The color in HAL format or null on invalid input
 */
export function rgbw2hal(rgbw: string): { hue: number; saturation: number; brightness: number } {
    if (!rgbw || typeof rgbw !== 'string' || !rgbw.startsWith('#') || (rgbw.length !== 9 && rgbw.length !== 5)) {
        return {
            hue: 0,
            saturation: 0,
            brightness: 0,
        };
    }

    let r: number;
    let g: number;
    let b: number;
    let w: number;

    if (rgbw.length === 9) {
        r = parseInt(rgbw.substring(1, 3), 16);
        g = parseInt(rgbw.substring(3, 5), 16);
        b = parseInt(rgbw.substring(5, 7), 16);
        w = parseInt(rgbw.substring(7, 9), 16);
    } else {
        r = parseInt(rgbw[1] + rgbw[1], 16);
        g = parseInt(rgbw[2] + rgbw[2], 16);
        b = parseInt(rgbw[3] + rgbw[3], 16);
        w = parseInt(rgbw[4] + rgbw[4], 16);
    }

    // remove white from RGB
    // r = Math.max(0, r - w);
    // g = Math.max(0, g - w);
    // b = Math.max(0, b - w);

    r /= 255;
    g /= 255;
    b /= 255;
    w /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h: number;
    const v = Math.max(max, w); // use white channel as brightness if higher
    const d = max - min;
    const s = v === 0 ? 0 : d / v;

    if (max === min) {
        h = 0; // achromatic
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
            default:
                h = 0;
        }
        h /= 6;
    }

    return {
        hue: Math.round(h * 360),
        saturation: parseFloat(s.toFixed(2)),
        brightness: parseFloat(v.toFixed(2)),
    };
}
