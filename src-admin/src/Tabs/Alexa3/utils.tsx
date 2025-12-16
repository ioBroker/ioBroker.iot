import React from 'react';
import { Divider, FormControl, FormHelperText, ListItemText, MenuItem, Select } from '@mui/material';

import type { IconType } from 'react-icons';

import {
    Brightness5,
    DeviceThermostat,
    Gradient,
    Lock,
    ModeStandby,
    Notifications,
    Palette,
    SignalWifiStatusbarNullTwoTone,
    Thermostat,
    ThermostatAuto,
    ToggleOn,
    VolumeOff,
    VolumeUp,
    Percent,
} from '@mui/icons-material';
import { MdBlinds, MdOutlineSensors, MdOutlineThermostat, MdPlayArrow } from 'react-icons/md';
import { AiFillUnlock } from 'react-icons/ai';
import { BsFillDoorOpenFill, BsFillVolumeUpFill } from 'react-icons/bs';
import { CgMenuMotion } from 'react-icons/cg';
import { FaLightbulb, FaSnowflake, FaTemperatureLow } from 'react-icons/fa';
import { GiElectricalSocket, GiGate, GiWindow } from 'react-icons/gi';
import { HiLightBulb } from 'react-icons/hi';
import { IoIosColorFilter, IoIosColorPalette } from 'react-icons/io';
import { RxSlider } from 'react-icons/rx';
import { TbVacuumCleaner } from 'react-icons/tb';
import { WiHumidity } from 'react-icons/wi';
import { PiSlidersHorizontal } from 'react-icons/pi';

import { type AdminConnection, DialogConfirm, I18n, Utils } from '@iobroker/adapter-react-v5';
import { Types } from '@iobroker/type-detector';

import type {
    AlexaSH3ControlDescription,
    AlexaSH3DeviceDescription,
    AlexaV3ReportedState,
    IotExternalDetectorState,
    SmartNameObject,
} from './alexa.types';

const SMART_TYPES: Types[] = [
    Types.socket,
    Types.light,
    Types.dimmer,
    Types.thermostat,
    Types.blind,
    Types.gate,
    Types.lock,
    Types.hue,
    Types.rgb,
    Types.rgbSingle,
    Types.rgbwSingle,
    Types.ct,
    Types.motion,
    Types.slider,
    Types.percentage,
    Types.temperature,
    Types.humidity,
    Types.button,
    Types.window,
];

// Automatically convert AlexaV2 to V3
const SMART_TYPES_V2: Record<string, Types> = {
    LIGHT: Types.light,
    SWITCH: Types.socket,
    THERMOSTAT: Types.thermostat,
    SMARTPLUG: Types.socket,
    SMARTLOCK: Types.lock,
    CAMERA: Types.camera,
    blinds: Types.blind,
    levelSlider: Types.slider,
    TV: Types.button,
};
const styles: { [styleName: string]: React.CSSProperties } = {
    deviceOff: {
        filter: 'grayscale(0.9)',
    },
    actionSpan: {
        marginRight: 5,
        display: 'flex',
        alignItems: 'center',
    },
    actionIcon: {
        width: 16,
    },
    deviceIcon: {
        width: 24,
        height: 24,
    },
    selectType: {
        width: 130,
        marginLeft: 8,
    },
    devSubLineTypeTitle: {
        marginTop: 0,
    },
};

export const CAPABILITIES: Record<string, { label: string; icon: IconType; color: string; style?: React.CSSProperties }> = {
    brightness: { label: 'Brightness', icon: Brightness5, color: '#c9b803' },
    connectivity: {
        label: 'Connectivity',
        icon: SignalWifiStatusbarNullTwoTone,
        color: '#989898',
    },
    color: { label: 'Color', icon: Palette, color: '#a20030' },
    colorTemperatureInKelvin: { label: 'Color temperature', icon: Gradient, color: '#019bb6' },
    detectionState: { label: 'Detection', icon: Notifications, color: '#913c01' },
    lockState: { label: 'Lock', icon: Lock, color: '#00519b' },
    mode: { label: 'Mode', icon: ModeStandby, color: '#112233' },
    muted: { label: 'Muted', icon: VolumeOff, color: '#9701af' },
    percentage: { label: 'Percentage', icon: Percent, color: '#fa8547' },
    powerState: { label: 'Power', icon: ToggleOn, color: '#70bd00' },
    relativeHumidity: { label: 'Humidity', icon: WiHumidity, color: '#3c58ca', style: { width: 24, height: 24 } },
    targetSetpoint: { label: 'Set point', icon: Thermostat, color: '#813600' },
    temperature: { label: 'Temperature', icon: DeviceThermostat, color: '#9f1300' },
    thermostatMode: { label: 'Thermostat mode', icon: ThermostatAuto, color: '#800048' },
    rangeValue: { label: 'Range value', icon: PiSlidersHorizontal, color: '#00804b' },
    volume: { label: 'Volume', icon: VolumeUp, color: '#006702' },
};

export const DEVICES: Record<string, { label: string; icon: IconType; color: string; controllable?: boolean }> = {
    AirCondition: {
        label: 'AirCondition',
        icon: FaSnowflake,
        color: '#001fb9',
        controllable: true,
    },
    Blind: {
        label: 'Blinds',
        icon: MdBlinds,
        color: '#00a28f',
        controllable: true,
    },
    Button: {
        label: 'Button/Scene',
        icon: MdPlayArrow,
        color: '#00a28f',
        controllable: true,
    },
    ContactSensor: {
        label: 'Sensor',
        icon: MdOutlineSensors,
        color: '#c9b803',
        controllable: false,
    },
    Ct: { label: 'Color temperature', icon: IoIosColorFilter, color: '#5a9600' },
    Dimmer: {
        label: 'Dimmer',
        icon: HiLightBulb,
        color: '#cb8500',
        controllable: true,
    },
    Door: {
        label: 'Door sensor',
        icon: BsFillDoorOpenFill,
        color: '#ad002a',
        controllable: false,
    },
    Gate: {
        label: 'Gate',
        icon: GiGate,
        color: '#9d02af',
    },
    Humidity: { label: 'Humidity', icon: WiHumidity, color: '#8ca102' },
    Hue: {
        label: 'Color HUE',
        icon: IoIosColorFilter,
        color: '#007a96',
    },
    Light: {
        label: 'Light',
        icon: FaLightbulb,
        color: '#c9b803',
        controllable: true,
    },
    Lock: { label: 'Lock', icon: AiFillUnlock, color: '#c9030a' },
    Motion: { label: 'Motion', icon: CgMenuMotion, color: '#149100' },
    Percentage: { label: 'Percentage', icon: Percent, color: '#fa8547' },
    Rgb: { label: 'RGB(W)', icon: IoIosColorPalette, color: '#5a9600' },
    RgbSingle: { label: 'RGB single', icon: IoIosColorPalette, color: '#5a9600' },
    RgbwSingle: { label: 'RGBW single', icon: IoIosColorPalette, color: '#5a9600' },
    Slider: { label: 'Slider', icon: RxSlider, color: '#029a7f' },
    Socket: { label: 'Socket', icon: GiElectricalSocket, color: '#834303' },
    Temperature: { label: 'Temperature', icon: FaTemperatureLow, color: '#8ca102' },
    Thermostat: { label: 'Thermostat', icon: MdOutlineThermostat, color: '#8c4800' },
    VacuumCleaner: { label: 'Vacuum cleaner', icon: TbVacuumCleaner, color: '#9e03c9' },
    Volume: { label: 'Volume', icon: BsFillVolumeUpFill, color: '#c903c6' },
    VolumeGroup: { label: 'Volume group', icon: BsFillVolumeUpFill, color: '#c903c6' },
    Window: { label: 'Window sensor', icon: GiWindow, color: '#27c903' },
};

function state2string(state: AlexaV3ReportedState | undefined): {
    color?: string;
    value: string;
    style?: React.CSSProperties;
} {
    const result: { color?: string; value: string; style?: React.CSSProperties } = { value: '' };
    if (state) {
        if (state.value === null || state.value === undefined) {
            return { value: '--' };
        }

        if (state.name === 'color' && state.value && typeof state.value === 'object') {
            // the object is HAL {
            //     "hue": 0,
            //     "saturation": 0,
            //     "brightness": 0
            // }
            // So convert it to RGB
            result.value = hal2rgb(state.value);
            result.color = state.value;
        } else if (state.name === 'powerState') {
            if (state.value === 'OFF' || state?.value === false) {
                result.style = { ...styles.deviceOff };
            }
        } else if (state.name === 'detectionState') {
            if (state.value === 'NOT_DETECTED') {
                result.style = { ...styles.deviceOff };
            }
        } else if (state.name === 'percentage') {
            result.value = `${isNaN(state.value) || state.value === null ? '--' : Math.round(state.value * 100) / 100}%`;
        } else if (state.name === 'relativeHumidity') {
            if (typeof state.value === 'object') {
                result.value = `${state.value?.value === null || state.value?.value === undefined ? '--' : Math.round(state.value.value * 100) / 100}%`;
            } else {
                result.value = state.value;
            }
        } else if (state.name === 'brightness') {
            result.value = (Math.round(state.value * 100) / 100).toString();
        } else if (state.name === 'rangeValue') {
            result.value = (Math.round(state.value * 100) / 100).toString();
        } else if (state.name === 'temperature') {
            if (typeof state.value === 'object') {
                const val = state.value?.value;
                result.value =
                    (val === null || val === undefined ? '--' : Math.round(val * 100) / 100) +
                    (state.value?.scale === 'CELSIUS'
                        ? '°C'
                        : state.value.scale === 'FAHRENHEIT'
                          ? '°F'
                          : state.value.scale || '');
            } else {
                result.value = state.value;
            }
        }

        if (state.value && typeof state.value === 'object' && state.value.value !== undefined) {
            if (typeof state.value.value === 'number') {
                result.value = `${Math.round(state.value.value * 100) / 100} ${state.value.scale === 'CELSIUS' ? '°C' : state.value.scale === 'FAHRENHEIT' ? '°F' : state.value.scale || '%'}`;
            } else {
                result.value = state.value.value.toString();
            }
        }
        return result;
    }
    return { value: '' };
}

export function renderChannelActions(control: AlexaSH3ControlDescription): React.JSX.Element[] {
    // Type
    const actions: React.JSX.Element[] = [];

    Object.keys(CAPABILITIES).forEach(action => {
        if (control.supported.includes(action)) {
            let state: AlexaV3ReportedState | undefined;
            const Icon = CAPABILITIES[action].icon;
            let style = { ...styles.actionIcon };
            if (control.state) {
                state = control.state.find(st => action === st.name);
            }
            const valueObj = state2string(state);

            if (valueObj.style) {
                style = { ...style, ...valueObj.style };
            }

            actions.push(
                <span
                    key={action}
                    title={CAPABILITIES[action].label + (valueObj.value ? `: ${valueObj.value}` : '')}
                    style={styles.actionSpan}
                >
                    <Icon
                        style={{
                            ...style,
                            ...CAPABILITIES[action]?.style,
                            color: CAPABILITIES[action]?.color,
                            backgroundColor: valueObj.color,
                        }}
                    />
                    {valueObj.value !== null ? (
                        <span style={{ color: DEVICES[control.type]?.color }}>{valueObj.value}</span>
                    ) : null}
                </span>,
            );
        } else if (control.enforced.includes(action)) {
            const Icon = CAPABILITIES[action].icon;
            actions.push(
                <span
                    key={action}
                    title={CAPABILITIES[action].label}
                    style={{ ...styles.actionSpan, opacity: 0.7 }}
                >
                    <Icon style={{ ...styles.actionIcon, color: CAPABILITIES[action].color }} />
                </span>,
            );
        }
    });

    // add unknown actions
    control.supported.forEach(action => {
        if (!CAPABILITIES[action]) {
            actions.push(
                <span
                    key={action}
                    title={action}
                    style={styles.actionSpan}
                >
                    {action}
                </span>,
            );
        }
    });
    control.enforced.forEach(action => {
        if (!CAPABILITIES[action]) {
            actions.push(
                <span
                    key={action}
                    title={action}
                    style={{ ...styles.actionSpan, opacity: 0.7 }}
                >
                    {action}
                </span>,
            );
        }
    });

    return actions;
}

export function renderDevTypes(dev: AlexaSH3DeviceDescription): React.JSX.Element[] | null {
    // Type
    const devices: React.JSX.Element[] = [];
    if (!dev.controls) {
        console.log('Something went wrong');
        return null;
    }

    const usedTypes: string[] = [];
    dev.controls.forEach((control, i) => {
        if (!usedTypes.includes(control.type)) {
            usedTypes.push(control.type);
            if (DEVICES[control.type]) {
                const Icon = DEVICES[control.type].icon;
                let state;
                if (dev.state) {
                    state = dev.state.find(st => control.supported.includes(st.name));
                }
                const valueObj = state2string(state);
                const style = { ...styles.actionSpan, ...valueObj.style };

                const currentType = (
                    <span
                        key={`${control.type}_${i}`}
                        title={DEVICES[control.type].label + (valueObj.value ? `: ${valueObj.value}` : '')}
                        style={style}
                    >
                        <Icon
                            style={{
                                ...styles.deviceIcon,
                                color: DEVICES[control.type].color,
                                backgroundColor: valueObj.color,
                            }}
                        />
                        <span style={{ color: DEVICES[control.type].color }}>{valueObj.value}</span>
                    </span>
                );

                if (control.type !== 'Blind' && control.type !== 'Light' && control.type !== 'Socket') {
                    devices.unshift(currentType);
                } else {
                    // try to place light, blind and socket at the end
                    devices.push(currentType);
                }
            }
        }
    });

    return devices;
}

export function SelectTypeSelector(props: {
    type: null | Types;
    detected: boolean;
    possibleTypes: Types[];
    onChange: (value: Types | null) => void;
}): React.JSX.Element | null {
    const [showWarning, setShowWarning] = React.useState<Types | ''>('');
    const items = [
        <MenuItem
            key="_"
            value="_"
            style={{ opacity: 0.5, fontStyle: 'normal' }}
        >
            <em>{I18n.t('Auto-detection')}</em>
        </MenuItem>,
    ];
    let possibleTypes = props.possibleTypes;
    let addedDivider = false;
    if (!possibleTypes.length) {
        possibleTypes = SMART_TYPES;
        if (!addedDivider) {
            items.push(<Divider key="divider11" />);
            items.push(
                <MenuItem
                    disabled
                    value="__info__1"
                    key="__info__1"
                >
                    <ListItemText
                        style={{
                            fontSize: 10,
                            fontStyle: 'italic',
                            color: 'orange',
                        }}
                        primary={I18n.t('Not suggested types')}
                    />
                </MenuItem>,
            );
            items.push(<Divider key="divider21" />);
            addedDivider = true;
        }
    }
    // get the mapping of device types
    const mapping: { [key: string]: string } = {};
    Object.keys(DEVICES).forEach(key => (mapping[key.toLowerCase()] = key));

    for (let i = 0; i < possibleTypes.length; i++) {
        const deviceDescription = DEVICES[mapping[possibleTypes[i].toLowerCase()]];
        const Icon = deviceDescription?.icon || null;
        items.push(
            <MenuItem
                key={possibleTypes[i]}
                value={possibleTypes[i]}
            >
                {Icon ? (
                    <Icon
                        style={{
                            width: 20,
                            height: 20,
                            marginRight: 4,
                            color: deviceDescription?.color,
                        }}
                    />
                ) : null}
                {I18n.t(possibleTypes[i])}
                {props.detected && props.type === possibleTypes[i] ? (
                    <span style={{ marginLeft: 4, color: 'orange' }}>(Auto)</span>
                ) : null}
            </MenuItem>,
        );
    }

    // Added all other types which are not in possibleTypes
    SMART_TYPES.forEach(smartType => {
        if (!possibleTypes.includes(smartType)) {
            if (!addedDivider) {
                items.push(<Divider key="divider1" />);
                items.push(
                    <MenuItem
                        disabled
                        value="__info__"
                        key="__info__"
                    >
                        <ListItemText
                            style={{
                                fontSize: 10,
                                fontStyle: 'italic',
                                color: 'orange',
                            }}
                            primary={I18n.t('Not suggested types')}
                        />
                    </MenuItem>,
                );
                items.push(<Divider key="divider2" />);
                addedDivider = true;
            }

            const deviceDescription = DEVICES[mapping[smartType.toLowerCase()]];
            const Icon = deviceDescription?.icon || null;
            items.push(
                <MenuItem
                    key={smartType}
                    value={smartType}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                    }}
                >
                    {Icon ? (
                        <Icon
                            style={{
                                width: 20,
                                height: 20,
                                marginRight: 4,
                                color: deviceDescription?.color,
                            }}
                        />
                    ) : null}
                    {I18n.t(smartType)}
                </MenuItem>,
            );
        }
    });

    let type = props.type;
    // convert from AlexaV2 to AlexaV3
    if (type && !SMART_TYPES.includes(type)) {
        if (SMART_TYPES.includes((type as unknown as Types).toLowerCase() as Types)) {
            type = type.toLowerCase() as Types;
        } else if (SMART_TYPES_V2[type]) {
            type = SMART_TYPES_V2[type];
        }
    }

    return (
        <FormControl
            variant="standard"
            style={styles.selectType}
        >
            {showWarning ? (
                <DialogConfirm
                    title={I18n.t('Confirm type change')}
                    text={I18n.t(
                        'Type detector could not detect the selected type automatically. Are you sure you want to set the type to "%s"?',
                        I18n.t(showWarning),
                    )}
                    onClose={(ok?: boolean): void => {
                        if (ok) {
                            props.onChange(showWarning);
                        }
                        setShowWarning('');
                    }}
                />
            ) : null}
            <Select
                variant="standard"
                value={type || '_'}
                renderValue={value => {
                    if (value === '_') {
                        return <em>{I18n.t('Auto-detection')}</em>;
                    }
                    const deviceDescription = DEVICES[mapping[value.toLowerCase()]];
                    const Icon = deviceDescription?.icon || null;
                    return (
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            {Icon ? (
                                <Icon
                                    style={{
                                        width: 20,
                                        height: 20,
                                        marginRight: 4,
                                        color: deviceDescription?.color,
                                    }}
                                />
                            ) : null}
                            {I18n.t(value as string)}
                        </div>
                    );
                }}
                onChange={e => {
                    if (e.target.value && e.target.value !== '_' && !possibleTypes.includes(e.target.value as Types)) {
                        setShowWarning(e.target.value as Types);
                    } else {
                        props.onChange(e.target.value === '_' ? null : (e.target.value as Types));
                    }
                }}
            >
                {items}
            </Select>
            <FormHelperText style={styles.devSubLineTypeTitle}>{I18n.t('Types')}</FormHelperText>
        </FormControl>
    );
}

export function getParentId(id: string): string {
    const parts = id.split('.');
    parts.pop();
    return parts.join('.');
}

export function takeIdForSmartName(control: AlexaSH3ControlDescription): IotExternalDetectorState {
    // The states are sorted and the state which initially was with smart name could stay not on the first place
    const state = Object.values(control.states).find(state => {
        const smartName = (state?.smartName as SmartNameObject) || false;
        return !!smartName;
    });
    if (state) {
        return state;
    }
    return Object.values(control.states)[0]!;
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

export interface UpdateSmartNameOptions {
    smartName?: ioBroker.StringOrTranslated;
    byON?: string | null;
    smartType?: Types | null;
    instanceId: string;
    noCommon?: boolean;
    noAutoDetect?: boolean;
}

export function getName(name: ioBroker.StringOrTranslated | undefined, lang: ioBroker.Languages): string {
    if (name && typeof name === 'object') {
        return name[lang] || name.en;
    }
    return name || '';
}

export function getObjectIcon(
    obj: ioBroker.Object,
    id: string,
    imagePrefix: string,
    lang: ioBroker.Languages,
): string | null {
    imagePrefix ||= '.'; // http://localhost:8081';
    let src = '';
    const common = obj?.common;

    if (common) {
        const cIcon = common.icon;
        if (cIcon) {
            if (!cIcon.startsWith('data:image/')) {
                if (cIcon.includes('.')) {
                    let instance;
                    if (obj.type === 'instance' || obj.type === 'adapter') {
                        src = `${imagePrefix}/adapter/${getName(common.name, lang)}/${cIcon}`;
                    } else if (id && id.startsWith('system.adapter.')) {
                        instance = id.split('.', 3);
                        if (cIcon[0] === '/') {
                            instance[2] += cIcon;
                        } else {
                            instance[2] += `/${cIcon}`;
                        }
                        src = `${imagePrefix}/adapter/${instance[2]}`;
                    } else {
                        instance = id.split('.', 2);
                        if (cIcon[0] === '/') {
                            instance[0] += cIcon;
                        } else {
                            instance[0] += `/${cIcon}`;
                        }
                        src = `${imagePrefix}/adapter/${instance[0]}`;
                    }
                } else {
                    return null;
                }
            } else {
                src = cIcon;
            }
        }
    }

    return src || null;
}

export async function findDeviceForState(
    stateId: string,
    socket: AdminConnection,
    objects: { [id: string]: ioBroker.Object | null | undefined },
): Promise<ioBroker.Object | null | undefined> {
    // read channel
    const channelId = getParentId(stateId);
    const channelObj = await socket.getObject(channelId);
    objects[channelId] = channelObj; // remember for later
    if (channelObj?.type === 'device') {
        return channelObj;
    }

    if (channelObj && (channelObj.type === 'channel' || channelObj.type === 'folder')) {
        let deviceId = getParentId(channelId);
        let deviceObj = await socket.getObject(deviceId);
        objects[deviceId] = deviceObj; // remember for later

        if (deviceObj?.type === 'device') {
            return deviceObj;
        }

        if (deviceObj?.type === 'folder') {
            deviceId = getParentId(channelId);
            deviceObj = await socket.getObject(deviceId);
            objects[deviceId] = deviceObj; // remember for later
            if (deviceObj?.type === 'device') {
                return deviceObj;
            }
        }

        return channelObj;
    }

    const result = await socket.getObject(stateId);
    objects[stateId] = result; // remember for later
    return result;
}

export async function collectSmartNamesOfDevice(
    dev: AlexaSH3DeviceDescription,
    instanceId: string,
    noCommon: boolean,
    context: { objects: { [id: string]: ioBroker.Object | null | undefined }; socket: AdminConnection },
): Promise<{ [id: string]: { common: ioBroker.StateCommon; smartName: SmartNameObject | false } }> {
    const result: { [id: string]: { common: ioBroker.StateCommon; smartName: SmartNameObject | false } } = {};
    // Process every control in device
    for (const control of dev.controls) {
        // Take all states of the control
        for (const state of Object.values(control.states)) {
            const parentObj = state?.id ? await findDeviceForState(state.id, context.socket, context.objects) : null;
            if (parentObj && parentObj._id !== state?.id) {
                // read all children of the device/channel+
                const states = await context.socket.getObjectViewSystem(
                    'state',
                    `${parentObj._id}.`,
                    `${parentObj._id}.\u9999`,
                );
                Object.keys(states).forEach(sid => {
                    const smartName = Utils.getSmartNameFromObj(states[sid], instanceId, noCommon);
                    if (smartName !== undefined && smartName !== null) {
                        result[sid] = {
                            common: states[sid].common,
                            smartName: smartName as SmartNameObject | false,
                        };
                    }
                });
            } else {
                const obj = state?.id ? context.objects[state.id] || (await context.socket.getObject(state.id)) : null;
                if (obj) {
                    context.objects[obj._id] = obj;
                    const smartName = Utils.getSmartNameFromObj(obj as ioBroker.StateObject, instanceId, noCommon);
                    if (smartName !== undefined && smartName !== null) {
                        result[obj._id] = {
                            common: obj.common as ioBroker.StateCommon,
                            smartName: smartName as SmartNameObject | false,
                        };
                    }
                }
            }
        }
    }

    return result;
}
