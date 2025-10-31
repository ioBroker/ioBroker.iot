import React from 'react';
import { Types } from '@iobroker/type-detector';

import type {
    AlexaSH3ControlDescription,
    AlexaSH3DeviceDescription,
    IotExternalDetectorState,
    SmartName,
    SmartNameObject,
} from './alexa.types';
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
} from '@mui/icons-material';
import { MdBlinds, MdOutlineSensors, MdOutlineThermostat, MdPlayArrow } from 'react-icons/md';
import { AiFillUnlock } from 'react-icons/ai';
import { BsFillDoorOpenFill, BsFillVolumeUpFill } from 'react-icons/bs';
import { CgMenuMotion } from 'react-icons/cg';
import { FaLightbulb, FaPercentage as Percent, FaSnowflake, FaTemperatureLow } from 'react-icons/fa';
import { GiElectricalSocket, GiGate, GiWindow } from 'react-icons/gi';
import { HiLightBulb } from 'react-icons/hi';
import { IoIosColorFilter, IoIosColorPalette } from 'react-icons/io';
import { RxSlider } from 'react-icons/rx';
import { TbVacuumCleaner } from 'react-icons/tb';
import { WiHumidity } from 'react-icons/wi';
import { I18n } from '@iobroker/adapter-react-v5';
import { FormControl, FormHelperText, MenuItem, Select } from '@mui/material';

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
    Types.temperature,
    Types.humidity,
    Types.button,
    Types.window,
];

const SMART_TYPES_V2: Record<string, Types> = {
    LIGHT: Types.light,
    SWITCH: Types.socket,
    THERMOSTAT: Types.thermostat,
    SMARTPLUG: Types.socket,
    SMARTLOCK: Types.lock,
    CAMERA: Types.camera,
    blinds: Types.blind,
    levelSlider: Types.slider,
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

export const CAPABILITIES: Record<
    string,
    { label: string; icon: IconType; color: string; style?: React.CSSProperties }
> = {
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
    percentage: { label: 'Percentage', icon: Percent, color: '#009870' },
    powerState: { label: 'Power', icon: ToggleOn, color: '#70bd00' },
    relativeHumidity: { label: 'Humidity', icon: WiHumidity, color: '#3c58ca', style: { width: 24, height: 24 } },
    targetSetpoint: { label: 'Set point', icon: Thermostat, color: '#813600' },
    temperature: { label: 'Temperature', icon: DeviceThermostat, color: '#9f1300' },
    thermostatMode: { label: 'Thermostat mode', icon: ThermostatAuto, color: '#800048' },
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

export function renderChannelActions(control: AlexaSH3ControlDescription): React.JSX.Element[] {
    // Type
    const actions: React.JSX.Element[] = [];

    Object.keys(CAPABILITIES).forEach(action => {
        if (control.supported.includes(action)) {
            let state;
            const Icon = CAPABILITIES[action].icon;
            let style = { ...styles.actionIcon };
            let valueString = null;
            let valueColor = null;
            if (control.state) {
                state = control.state.find(st => action === st.name);
                if (state?.name === 'color' && state?.value && typeof state.value === 'object') {
                    // the object is HAL {
                    //     "hue": 0,
                    //     "saturation": 0,
                    //     "brightness": 0
                    // }
                    // So convert it to RGB
                    state.value = hal2rgb(state.value);
                    valueColor = state.value;
                } else if (state?.name === 'powerState') {
                    if (state?.value === 'OFF' || state?.value === false) {
                        style = { ...style, ...styles.deviceOff };
                    }
                } else if (state?.name === 'detectionState') {
                    if (state?.value === 'NOT_DETECTED') {
                        style = { ...style, ...styles.deviceOff };
                    }
                } else if (state?.name === 'percentage') {
                    valueString = `${state.value === null ? '--' : Math.round(state.value * 100) / 100}%`;
                } else if (state?.name === 'relativeHumidity') {
                    if (typeof state.value === 'object') {
                        valueString = `${state.value?.value === null || state.value?.value === undefined ? '--' : Math.round(state.value.value * 100) / 100}%`;
                    } else {
                        valueString = state.value;
                    }
                } else if (state?.name === 'brightness') {
                    valueString = state.value === null ? '--' : Math.round(state.value * 100) / 100;
                } else if (state?.name === 'temperature') {
                    if (typeof state.value === 'object') {
                        const val = state.value?.value;
                        valueString =
                            (val === null || val === undefined ? '--' : Math.round(val * 100) / 100) +
                            (state.value?.scale === 'CELSIUS' ? '°C' : state.value.scale);
                    } else {
                        valueString = state.value;
                    }
                }

                if (state?.value && typeof state.value === 'object' && state.value.value !== undefined) {
                    state.value = `${Math.round(state.value.value * 100) / 100} ${state.value.scale === 'CELSIUS' ? '°C' : state.value.scale === 'FAHRENHEIT' ? '°F' : state.value.scale || '%'}`;
                }
            }
            const stateValue = state
                ? ` - ${state.value === null || state.value === undefined ? '--' : state.value}`
                : '';

            actions.push(
                <span
                    key={action}
                    title={CAPABILITIES[action].label + stateValue}
                    style={styles.actionSpan}
                >
                    <Icon
                        style={{
                            ...style,
                            ...CAPABILITIES[action]?.style,
                            color: CAPABILITIES[action]?.color,
                            backgroundColor: valueColor,
                        }}
                    />
                    {valueString !== null ? (
                        <span style={{ color: DEVICES[control.type]?.color }}>{valueString}</span>
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
                let style = styles.actionSpan;
                let valuePercent = null;
                let valueBrightness = null;
                let valueColor = undefined;
                let state;
                if (dev.state) {
                    state = dev.state.find(st => control.supported.includes(st.name));
                    if (state?.name === 'color' && state?.value && typeof state.value === 'object') {
                        // the object is HAL {
                        //     "hue": 0,
                        //     "saturation": 0,
                        //     "brightness": 0
                        // }
                        // So convert it to RGB
                        valueColor = hal2rgb(state.value);
                        state.value = valueColor;
                    } else if (state?.name === 'powerState') {
                        if (state?.value === 'OFF' || state?.value === false) {
                            style = { ...style, ...styles.deviceOff };
                        }
                    } else if (state?.name === 'detectionState') {
                        if (state?.value === 'NOT_DETECTED') {
                            style = { ...style, ...styles.deviceOff };
                        }
                    } else if (state?.name === 'percentage') {
                        valuePercent = `${state.value === null ? '--' : Math.round(state.value * 100) / 100}%`;
                    } else if (state?.name === 'brightness') {
                        valueBrightness = state.value === null ? '--' : Math.round(state.value * 100) / 100;
                    }
                    if (state?.value && typeof state.value === 'object' && state.value.value !== undefined) {
                        state.value = `${Math.round(state.value.value * 100) / 100}} ${state.value.scale === 'CELSIUS' ? '°C' : state.value.scale}`;
                    }
                }
                const stateValue = state
                    ? ` - ${state.value === null || state.value === undefined ? '--' : state.value}`
                    : '';

                const currentType = (
                    <span
                        key={`${control.type}_${i}`}
                        title={DEVICES[control.type].label + stateValue}
                        style={style}
                    >
                        <Icon
                            style={{
                                ...styles.deviceIcon,
                                color: DEVICES[control.type].color,
                                backgroundColor: valueColor,
                            }}
                        />
                        {valuePercent !== null ? (
                            <span style={{ color: DEVICES[control.type].color }}>{valuePercent}</span>
                        ) : null}
                        {valueBrightness !== null ? (
                            <span style={{ color: DEVICES[control.type].color }}>{valueBrightness}</span>
                        ) : null}
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

export function renderSelectTypeSelector(
    type: null | Types,
    detected: boolean,
    possibleTypes: Types[],
    onChange: (value: string) => void,
): React.JSX.Element | null {
    const items = [
        <MenuItem
            key="_"
            value="_"
            style={{ opacity: 0.5, fontStyle: 'normal' }}
        >
            <em>{I18n.t('Auto-detection')}</em>
        </MenuItem>,
    ];
    if (!possibleTypes.length) {
        possibleTypes = SMART_TYPES;
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
                {detected && type === possibleTypes[i] ? (
                    <span style={{ marginLeft: 4, color: 'orange' }}>(Auto)</span>
                ) : null}
            </MenuItem>,
        );
    }
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
            <Select
                variant="standard"
                value={type || '_'}
                onChange={e => onChange(e.target.value === '_' ? '' : e.target.value)}
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

export function updateSmartNameEx(
    obj: ioBroker.StateObject | ioBroker.EnumObject,
    options: {
        smartName?: ioBroker.StringOrTranslated;
        byON?: string | null;
        smartType?: Types | null;
        instanceId: string;
        noCommon?: boolean;
        noAutoDetect?: boolean;
    },
): void {
    const language = I18n.getLanguage();

    // Typing must be fixed in js-controller
    const sureStateObject = obj as ioBroker.StateObject;

    // convert the old format
    if (typeof sureStateObject.common.smartName === 'string') {
        const nnn = sureStateObject.common.smartName;
        sureStateObject.common.smartName = {};
        sureStateObject.common.smartName[language] = nnn;
    }

    // convert the old settings
    if (sureStateObject.native?.byON) {
        delete sureStateObject.native.byON;
        let _smartName: SmartName = sureStateObject.common.smartName as SmartName;

        if (_smartName && typeof _smartName !== 'object') {
            _smartName = {
                en: _smartName,
                [language]: _smartName,
            };
        }
        sureStateObject.common.smartName = _smartName;
    }
    if (options.smartType !== undefined) {
        if (options.noCommon) {
            sureStateObject.common.custom ||= {};
            sureStateObject.common.custom[options.instanceId] ||= {};
            sureStateObject.common.custom[options.instanceId].smartName ||= {};
            if (!options.smartType) {
                delete sureStateObject.common.custom[options.instanceId].smartName.smartType;
            } else {
                sureStateObject.common.custom[options.instanceId].smartName.smartType = options.smartType;
            }
        } else {
            sureStateObject.common.smartName ||= {};
            if (!options.smartType) {
                delete (sureStateObject.common.smartName as SmartNameObject).smartType;
            } else {
                (sureStateObject.common.smartName as SmartNameObject).smartType = options.smartType;
            }
        }
    }

    if (options.byON !== undefined) {
        if (options.noCommon) {
            sureStateObject.common.custom ||= {};
            sureStateObject.common.custom[options.instanceId] ||= {};
            sureStateObject.common.custom[options.instanceId].smartName ||= {};
            sureStateObject.common.custom[options.instanceId].smartName.byON = options.byON;
        } else {
            sureStateObject.common.smartName ||= {};
            (sureStateObject.common.smartName as SmartNameObject).byON = options.byON;
        }
    }

    if (options.noAutoDetect !== undefined) {
        if (options.noCommon) {
            if (options.noAutoDetect) {
                sureStateObject.common.custom ||= {};
                sureStateObject.common.custom[options.instanceId] ||= {};
                sureStateObject.common.custom[options.instanceId].smartName ||= {};
                sureStateObject.common.custom[options.instanceId].smartName.noAutoDetect = options.noAutoDetect;
            } else if (sureStateObject.common.custom?.[options.instanceId]?.smartName) {
                delete sureStateObject.common.custom[options.instanceId].smartName.noAutoDetect;
            }
        } else {
            if (!options.noAutoDetect && sureStateObject.common.smartName) {
                delete (sureStateObject.common.smartName as SmartNameObject).noAutoDetect;
            } else {
                sureStateObject.common.smartName ||= {};
                (sureStateObject.common.smartName as SmartNameObject).noAutoDetect = options.noAutoDetect;
            }
        }
    }

    if (options.smartName !== undefined) {
        let smartName;
        if (options.noCommon) {
            sureStateObject.common.custom ||= {};
            sureStateObject.common.custom[options.instanceId] ||= {};
            sureStateObject.common.custom[options.instanceId].smartName ||= {};
            smartName = sureStateObject.common.custom[options.instanceId].smartName;
        } else {
            sureStateObject.common.smartName ||= {};
            smartName = sureStateObject.common.smartName;
        }
        smartName[language] = options.smartName;

        // If smart name deleted
        if (
            smartName &&
            (!smartName[language] ||
                (smartName[language] === sureStateObject.common.name && !sureStateObject.common.role))
        ) {
            delete smartName[language];
            let empty = true;
            // Check if the structure has any definitions
            for (const key in smartName) {
                if (Object.prototype.hasOwnProperty.call(smartName, key)) {
                    empty = false;
                    break;
                }
            }
            // If empty => delete smartName completely
            if (empty) {
                if (options.noCommon && sureStateObject.common.custom?.[options.instanceId]) {
                    if (sureStateObject.common.custom[options.instanceId].smartName.byON === undefined) {
                        delete sureStateObject.common.custom[options.instanceId];
                    } else {
                        delete sureStateObject.common.custom[options.instanceId].en;
                        delete sureStateObject.common.custom[options.instanceId].de;
                        delete sureStateObject.common.custom[options.instanceId].ru;
                        delete sureStateObject.common.custom[options.instanceId].nl;
                        delete sureStateObject.common.custom[options.instanceId].pl;
                        delete sureStateObject.common.custom[options.instanceId].it;
                        delete sureStateObject.common.custom[options.instanceId].fr;
                        delete sureStateObject.common.custom[options.instanceId].pt;
                        delete sureStateObject.common.custom[options.instanceId].es;
                        delete sureStateObject.common.custom[options.instanceId].uk;
                        delete sureStateObject.common.custom[options.instanceId]['zh-cn'];
                    }
                } else if (
                    sureStateObject.common.smartName &&
                    (sureStateObject.common.smartName as SmartNameObject).byON !== undefined
                ) {
                    const _smartName: { [lang in ioBroker.Languages]?: string } = sureStateObject.common.smartName as {
                        [lang in ioBroker.Languages]?: string;
                    };
                    delete _smartName.en;
                    delete _smartName.de;
                    delete _smartName.ru;
                    delete _smartName.nl;
                    delete _smartName.pl;
                    delete _smartName.it;
                    delete _smartName.fr;
                    delete _smartName.pt;
                    delete _smartName.es;
                    delete _smartName.uk;
                    delete _smartName['zh-cn'];
                } else {
                    sureStateObject.common.smartName = null;
                }
            }
        }
    }
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
