import React, { Component } from 'react';
import SVG from 'react-inlinesvg';

import {
    Badge,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Fab,
    FormControl,
    FormHelperText,
    IconButton,
    MenuItem,
    Select,
    TextField,
} from '@mui/material';

import {
    MdAdd as IconAdd,
    MdBlinds,
    MdClear as IconClear,
    MdDelete as IconDelete,
    MdDragHandle as IconCollapse,
    MdEdit as IconEdit,
    MdFormatAlignJustify as IconExpand,
    MdList as IconList,
    MdOutlineSensors,
    MdOutlineThermostat,
    MdPlayArrow,
    MdRefresh as IconRefresh,
} from 'react-icons/md';

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

import {
    Brightness5,
    Check as IconCheck,
    ChevronRight,
    Close as IconClose,
    DeviceThermostat,
    FileCopy as IconCopy,
    Gradient,
    Lock,
    ModeStandby,
    Notifications,
    Palette,
    SignalWifiStatusbarNullTwoTone,
    Thermostat,
    ThermostatAuto,
    ToggleOn,
    UnfoldLess,
    UnfoldMore,
    VolumeOff,
    VolumeUp,
} from '@mui/icons-material';

import {
    Utils,
    I18n,
    DialogMessage,
    DialogSelectID,
    Icon as ARIcon,
    type IobTheme,
    type AdminConnection,
    type ThemeType,
} from '@iobroker/adapter-react-v5';
import type { IconType } from 'react-icons';
import type { IotAdapterConfig } from '../types';
import type {
    AlexaSH3DeviceDescription,
    AlexaSH3ControlDescription,
    IotExternalDetectorState,
    SmartNameObject,
} from './alexa.types';
import { Types } from '@iobroker/type-detector/types';

const CHANGED_COLOR = '#e7000040';
const DEFAULT_CHANNEL_COLOR_DARK = '#4f4f4f';
const DEFAULT_CHANNEL_COLOR_DARK2 = '#313131';
const DEFAULT_CHANNEL_COLOR_LIGHT = '#e9e9e9';
const DEFAULT_CHANNEL_COLOR_LIGHT2 = '#bbbbbb';
const LAST_CHANGED_COLOR_DARK = '#5c8f65';
const LAST_CHANGED_COLOR_LIGHT = '#b4ffbe';

const DEFAULT_STATE_COLOR_DARK = '#6e6e6e';
const DEFAULT_STATE_COLOR_LIGHT = '#d0d0d0';

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

const CAPABILITIES: Record<string, { label: string; icon: IconType; color: string; style?: React.CSSProperties }> = {
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
let capabilitiesTranslated = false;

const DEVICES: Record<string, { label: string; icon: IconType; color: string; controllable?: boolean }> = {
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

let devicesTranslated = false;

const styles: Record<string, any> = {
    tab: {
        width: '100%',
        height: '100%',
    },
    columnDiv: {
        height: 'calc(100% - 40px)',
        overflow: 'auto',
        minWidth: 300,
    },
    filter: {
        margin: 0,
    },
    button: {
        marginRight: 20,
    },
    devLineExpand: {
        width: 40,
    },
    devLineEdit: {
        width: 40,
        marginLeft: 5,
    },
    devLineDelete: {
        width: 40,
    },
    devLineName: {},
    devLineNumber: {
        width: 15,
    },
    editedId: {
        fontStyle: 'italic',
    },
    devLine: {
        height: 48,
        width: '100%',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
    },
    devLineDescription: {
        display: 'block',
        fontStyle: 'italic',
        fontSize: 12,
    },
    devLineActions: {
        fontStyle: 'italic',
        fontSize: 12,
        paddingRight: 5,
        display: 'flex',
    },
    devLineProgress: {
        position: 'absolute',
        top: 0,
        left: 0,
    },
    devLineNameBlock: {
        flexGrow: 1,
    },
    devModified: {
        fontStyle: 'italic',
    },
    actionSpan: {
        marginRight: 5,
        display: 'flex',
        alignItems: 'center',
    },
    deviceOff: {
        filter: 'grayscale(0.9)',
    },
    actionIcon: {
        width: 16,
    },
    deviceIcon: {
        width: 24,
        height: 24,
    },
    deviceSmallIcon: {
        width: 20,
        height: 20,
    },
    devSubLine: {
        position: 'relative',
        display: 'flex',
        width: '100%',
        alignItems: 'center',
    },
    devSubLineExpand: {
        marginLeft: 15,
    },
    devSubLineExpanded: {
        transition: 'transform 0.3s',
        transform: 'rotate(90deg)',
    },
    devSubLineName: {
        flexGrow: 1,
        fontSize: 13,
        fontWeight: 'bold',
        marginLeft: 5,
    },
    devSubLineName1: {
        minWidth: 100,
        marginRight: 5,
        display: 'inline-block',
    },
    devSubLineName2: {
        fontWeight: 'normal',
        display: 'inline-block',
    },
    devSubLineName2Div: {
        display: 'flex',
        alignItems: 'center',
        gap: 5,
    },
    devSubSubLineName: {
        fontSize: 11,
        fontStyle: 'italic',
        paddingLeft: 10,
        flexGrow: 1,
    },
    devSubSubLineStateName: {
        minWidth: 121,
        display: 'inline-block',
        fontWeight: 'bold',
    },
    devSubSubLineStateId: {
        marginLeft: 5,
    },
    devSubLineDelete: {
        // padding: 0,
    },
    devSubLineEdit: {
        // padding: 0,
    },
    devSubLineTypeTitle: {
        marginTop: 0,
    },
    statesLine: {
        position: 'relative',
        width: 'calc(100% - 50px)',
        paddingLeft: 50,
        paddingBottom: 5,
    },
    devSubSubLine: {
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        paddingTop: 2,
        paddingBottom: 2,
    },
    headerRow: (theme: IobTheme): any => ({
        pl: 1,
        background: theme.palette.primary.main,
    }),
    headerCell: {
        display: 'inline-block',
        verticalAlign: 'top',
        width: '100%',
    },
    tableCell: {
        display: 'inline-block',
        verticalAlign: 'top',
        width: '100%',
    },
    selectType: {
        width: 130,
        marginLeft: 8,
    },
    stateValueAck: {},
    stateValueNoAck: {
        color: '#ff0000',
    },
};

function getName(name: ioBroker.StringOrTranslated | undefined, lang: ioBroker.Languages): string {
    if (name && typeof name === 'object') {
        return name[lang] || name.en;
    }
    return name || '';
}

function getObjectIcon(obj: ioBroker.Object, id: string, imagePrefix: string, lang: ioBroker.Languages): string | null {
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

interface Alexa3SmartNamesProps {
    socket: AdminConnection;
    adapterName: string;
    instance: number;
    native: IotAdapterConfig;
    onError: (error: string) => void;
    themeType: ThemeType;
    title?: string;
    theme: IobTheme;
}

interface Alexa3SmartNamesState {
    edit: null | {
        id: string;
        type: Types | null;
        name: string;
        originalType: string | null;
        originalName: string;
        objectName: string;
        isAfterAdd: boolean;
    };
    deleteId: string;

    showListOfDevices: boolean;
    showSelectId: boolean;
    showConfirmation: boolean | string;
    changed: string[];
    devices: AlexaSH3DeviceDescription[];
    message: string;
    filter: string;
    loading: boolean;
    browse: boolean;
    expanded: string[];
    lastChanged: string;
    objects: Record<
        string,
        {
            name: string;
            icon?: string | null;
        }
    >;
    alive: boolean;
    values: { [id: string]: ioBroker.State | null | undefined };
}

export default class Alexa3SmartNames extends Component<Alexa3SmartNamesProps, Alexa3SmartNamesState> {
    private readonly requesting: Record<string, boolean> = {};
    private timerChanged: null | ReturnType<typeof setTimeout> = null;
    private devTimer: null | ReturnType<typeof setTimeout> = null;
    private browseTimer: null | ReturnType<typeof setTimeout> = null;
    private browseTimerCount: number = 0;
    private lastBrowse = 0;
    private waitForUpdateID: null | string = null;
    private readonly language: ioBroker.Languages = I18n.getLanguage();
    private editedSmartName: string | null;
    private subscribedStates: Record<string, number> = {};
    private tempStates: Record<string, ioBroker.State | null | undefined> | null = null;
    private updateValuesTimeout: null | ReturnType<typeof setTimeout> = null;
    private objects: { [id: string]: ioBroker.Object | null | undefined } = {};
    private collectSubscribes: string[] | null = null;
    private collectSubscribesTimer: null | ReturnType<typeof setTimeout> = null;
    private collectUnsubscribes: string[] | null = null;
    private collectUnsubscribesTimer: null | ReturnType<typeof setTimeout> = null;

    constructor(props: Alexa3SmartNamesProps) {
        super(props);

        if (!capabilitiesTranslated) {
            Object.keys(CAPABILITIES).forEach(a => (CAPABILITIES[a].label = I18n.t(CAPABILITIES[a].label)));
            capabilitiesTranslated = true;
        }

        if (!devicesTranslated) {
            Object.keys(DEVICES).forEach(a => (DEVICES[a].label = I18n.t(DEVICES[a].label)));
            devicesTranslated = true;
        }

        const expandedStr = window.localStorage.getItem('v3.expanded') || '[]';
        let expanded: string[];
        try {
            expanded = JSON.parse(expandedStr);
        } catch {
            expanded = [];
        }

        this.state = {
            edit: null,
            deleteId: '',

            showListOfDevices: false,
            showSelectId: false,
            showConfirmation: '',
            changed: [],
            devices: [],
            message: '',
            filter: '',
            loading: true,
            browse: false,
            expanded,
            lastChanged: '',
            objects: {},
            alive: false,
            values: {},
        };
    }

    subscribe(id: string): void {
        if (this.subscribedStates[id]) {
            this.subscribedStates[id]++;
        } else {
            this.subscribedStates[id] = 1;

            this.collectSubscribes ||= [];
            this.collectSubscribes.push(id);
            const pos = this.collectUnsubscribes?.indexOf(id);
            if (pos !== -1 && pos !== undefined) {
                this.collectUnsubscribes?.splice(pos);
                if (!this.collectUnsubscribes?.length) {
                    this.collectUnsubscribes = null;
                    if (this.collectUnsubscribesTimer) {
                        clearTimeout(this.collectUnsubscribesTimer);
                        this.collectUnsubscribesTimer = null;
                    }
                }
            }

            if (this.collectSubscribesTimer) {
                clearTimeout(this.collectSubscribesTimer);
            }

            this.collectSubscribesTimer = setTimeout(async (): Promise<void> => {
                this.collectSubscribesTimer = null;
                if (this.collectSubscribes?.length) {
                    const collect = this.collectSubscribes;
                    this.collectSubscribes = null;
                    const objectIds = collect.filter(id => !this.objects[id]);
                    const objects = await this.props.socket.getObjectsById(objectIds);

                    if (objects) {
                        Object.keys(objects).forEach(id => (this.objects[id] = objects[id]));
                    }
                    void this.props.socket.subscribeState(collect, this.onStateChange);
                }
            }, 200);
        }
    }

    unsubscribe(id: string): void {
        if (this.subscribedStates[id]) {
            this.subscribedStates[id]--;
            if (!this.subscribedStates[id]) {
                delete this.subscribedStates[id];

                this.collectUnsubscribes ||= [];
                this.collectUnsubscribes.push(id);

                const pos = this.collectSubscribes?.indexOf(id);
                if (pos !== -1 && pos !== undefined) {
                    this.collectSubscribes?.splice(pos);
                    if (!this.collectSubscribes?.length) {
                        this.collectSubscribes = null;
                        if (this.collectSubscribesTimer) {
                            clearTimeout(this.collectSubscribesTimer);
                            this.collectSubscribesTimer = null;
                        }
                    }
                }

                if (this.collectUnsubscribesTimer) {
                    clearTimeout(this.collectUnsubscribesTimer);
                }

                this.collectUnsubscribesTimer = setTimeout(() => {
                    this.collectUnsubscribesTimer = null;
                    if (this.collectUnsubscribes?.length) {
                        void this.props.socket.unsubscribeState(this.collectUnsubscribes, this.onStateChange);
                        this.collectUnsubscribes = null;
                    }
                }, 200);
            }
        }
    }

    unsubscribeAll(): void {
        Object.keys(this.subscribedStates).forEach(id => {
            void this.props.socket.unsubscribeState(id, this.onStateChange);
            delete this.subscribedStates[id];
        });
        // Go through all states and set the subscribed flag to false
        this.state.devices.forEach(dev => {
            dev.controls.forEach(control => {
                if (control.states) {
                    Object.keys(control.states).forEach(id => {
                        if (control.states[id]) {
                            control.states[id].subscribed = false;
                        }
                    });
                }
            });
        });
    }

    onStateChange = (id: string, state: ioBroker.State | null | undefined): void => {
        this.tempStates ||= {};
        this.tempStates[id] = state;
        if (this.updateValuesTimeout) {
            clearTimeout(this.updateValuesTimeout);
        }
        this.updateValuesTimeout = setTimeout((): void => {
            this.updateValuesTimeout = null;
            if (this.tempStates) {
                const tempStates = this.tempStates;
                this.tempStates = null;
                const values = JSON.parse(JSON.stringify(this.state.values));
                let changed = false;
                Object.keys(tempStates).forEach(sid => {
                    const state = tempStates[sid];
                    if (values[sid]?.val !== state?.val || values[sid]?.ack !== state?.ack) {
                        changed = true;
                        values[sid] = state;
                    }
                });
                if (changed) {
                    this.setState({ values });
                }
            }
        }, 200);
    };

    onAliveChanged = (id: string, state: ioBroker.State | null | undefined): void => {
        if (!!state?.val !== this.state.alive) {
            this.setState({ alive: !!state?.val }, () => {
                if (this.state.alive) {
                    setTimeout(() => this.browse(), 10000);
                }
            });
        }
    };

    browse(isIndicate?: boolean): void {
        if (Date.now() - this.lastBrowse < 500) {
            return;
        }
        this.lastBrowse = Date.now();
        if (isIndicate) {
            this.setState({ loading: true, browse: true });
        } else {
            this.setState({ browse: true });
        }
        console.log('Send BROWSE!');
        this.browseTimer = setTimeout(() => {
            console.log('Browse timeout!');
            this.browseTimer = null;
            this.browseTimerCount++;
            if (this.browseTimerCount < 5) {
                this.browse(isIndicate);
            } else {
                this.setState({ message: I18n.t('Cannot read devices!') });
            }
        }, 10000);

        this.props.socket
            .sendTo(`${this.props.adapterName}.${this.props.instance}`, 'browse3', null)
            .then((list: AlexaSH3DeviceDescription[] | { error: string } | null): void => {
                if (this.browseTimer) {
                    clearTimeout(this.browseTimer);
                    this.browseTimer = null;
                }
                this.browseTimerCount = 0;
                if ((list as { error: string })?.error) {
                    this.setState({ message: I18n.t((list as { error: string }).error) });
                } else if (list) {
                    const typedList: AlexaSH3DeviceDescription[] = list as AlexaSH3DeviceDescription[];
                    if (this.waitForUpdateID) {
                        if (!this.onEdit(this.waitForUpdateID, typedList)) {
                            this.setState({ message: I18n.t('Device %s was not added', this.waitForUpdateID) });
                        }
                        this.waitForUpdateID = null;
                    }
                    console.log('BROWSE received.');
                    typedList.sort((a, b) => {
                        if (a.friendlyName > b.friendlyName) {
                            return 1;
                        }
                        if (a.friendlyName < b.friendlyName) {
                            return -1;
                        }
                        return 0;
                    });

                    this.setState({
                        devices: typedList,
                        loading: false,
                        changed: [],
                        browse: false,
                    });

                    if (typedList.length > 300) {
                        this.props.onError(
                            I18n.t('Too many devices (%s) configured. Max number is 300', typedList.length),
                        );
                    }
                }
            })
            .catch(e => this.setState({ message: I18n.t('Error %s', e), browse: false }));
    }

    onReadyUpdate = (id: string, state: ioBroker.State | null | undefined): void => {
        console.log(`Update ${id} ${state ? `${state.val}/${state.ack}` : 'null'}`);
        if (state?.ack === true && state.val === true) {
            this.devTimer && clearTimeout(this.devTimer);
            this.devTimer = setTimeout(() => {
                this.devTimer = null;
                this.browse();
            }, 300);
        }
    };

    onResultUpdate = (_id: string, state: ioBroker.State | null | undefined): void => {
        if (state?.ack === true && state.val) {
            this.setState({ message: state.val as string });
        }
    };

    componentDidMount(): void {
        void this.props.socket.getObject(`system.adapter.${this.props.adapterName}.${this.props.instance}`).then(obj =>
            this.props.socket
                .getState(`system.adapter.${this.props.adapterName}.${this.props.instance}.alive`)
                .then(state => {
                    if (!obj || !obj.common || (!obj.common.enabled && (!state || !state.val))) {
                        this.setState({
                            message: I18n.t('Instance must be enabled'),
                            loading: false,
                            devices: [],
                            alive: false,
                        });
                    } else {
                        this.setState({ alive: true }, () => this.browse());
                    }
                }),
        );

        void this.props.socket.subscribeState(
            `${this.props.adapterName}.${this.props.instance}.smart.updates3`,
            this.onReadyUpdate,
        );
        void this.props.socket.subscribeState(
            `${this.props.adapterName}.${this.props.instance}.smart.updatesResult`,
            this.onResultUpdate,
        );
        void this.props.socket.subscribeState(
            `system.adapter.${this.props.adapterName}.${this.props.instance}.alive`,
            this.onAliveChanged,
        );
    }

    componentWillUnmount(): void {
        this.props.socket.unsubscribeState(
            `${this.props.adapterName}.${this.props.instance}.smart.updates3`,
            this.onReadyUpdate,
        );

        if (this.updateValuesTimeout) {
            clearTimeout(this.updateValuesTimeout);
            this.updateValuesTimeout = null;
        }

        this.props.socket.unsubscribeState(
            `${this.props.adapterName}.${this.props.instance}.smart.updatesResult`,
            this.onResultUpdate,
        );
        this.props.socket.unsubscribeState(
            `system.adapter.${this.props.adapterName}.${this.props.instance}.alive`,
            this.onAliveChanged,
        );

        this.unsubscribeAll();

        if (this.timerChanged) {
            clearTimeout(this.timerChanged);
            this.timerChanged = null;
        }
    }

    informInstance(id: string): void {
        void this.props.socket.sendTo(`${this.props.adapterName}.${this.props.instance}`, 'update', id);
    }

    addChanged(id: string, cb?: () => void): void {
        const changed = JSON.parse(JSON.stringify(this.state.changed));
        if (!changed.includes(id)) {
            changed.push(id);
            this.setState({ changed }, () => cb?.());
        } else {
            cb && cb();
        }
    }

    onEdit(id: string, devices?: AlexaSH3DeviceDescription[]): boolean {
        const isAfterAdd = !!devices;
        devices ||= this.state.devices;
        const device = devices.find(dev =>
            dev.controls.find(control =>
                Object.values(control.states).find((item: IotExternalDetectorState) => item.id === id),
            ),
        );
        if (device) {
            void this.props.socket.getObject(id).then(obj => {
                this.objects[id] = obj; // remember for later
                if (obj) {
                    let smartName = Utils.getSmartNameFromObj(
                        obj as ioBroker.StateObject,
                        `${this.props.adapterName}.${this.props.instance}`,
                        this.props.native.noCommon,
                    );
                    if (typeof smartName === 'object' && smartName) {
                        smartName = smartName[I18n.getLanguage()] || smartName.en;
                    }
                    this.editedSmartName = smartName || '';

                    this.setState({
                        edit: {
                            id,
                            type: null,
                            name: this.editedSmartName,
                            originalType: null,
                            originalName: this.editedSmartName,
                            objectName: Utils.getObjectNameFromObj(obj, null, { language: I18n.getLanguage() }),
                            isAfterAdd,
                        },
                    });
                }
            });
            return true;
        }

        return false;
    }

    onAskDelete(deleteId: string): void {
        this.setState({ deleteId, showConfirmation: true });
    }

    onDelete(): void {
        const id = this.state.deleteId;
        // const device = this.state.devices.find(dev => dev.additionalApplianceDetails.id === id);
        this.addChanged(id, () => {
            this.props.socket
                .getObject(id)
                .then(obj => {
                    this.objects[id] = obj; // remember for later
                    if (obj) {
                        Utils.disableSmartName(
                            obj as ioBroker.StateObject,
                            `${this.props.adapterName}.${this.props.instance}`,
                            this.props.native.noCommon,
                        );
                        return this.props.socket.setObject(id, obj);
                    }
                })
                .then(() => {
                    this.setState({ deleteId: '', showConfirmation: false, lastChanged: id });

                    if (this.timerChanged) {
                        clearTimeout(this.timerChanged);
                    }
                    this.timerChanged = setTimeout(() => {
                        this.timerChanged = null;
                        this.setState({ lastChanged: '' });
                    }, 30000);

                    // update obj
                    this.informInstance(id);
                })
                .catch(err => this.props.onError(err));
        });
    }

    static renderChannelActions(control: AlexaSH3ControlDescription): React.JSX.Element[] {
        // Type
        const actions: React.JSX.Element[] = [];

        Object.keys(CAPABILITIES).forEach(action => {
            if (control.supported.includes(action)) {
                let state;
                const Icon = CAPABILITIES[action].icon;
                let style = styles.actionIcon;
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
                    } else if (state?.name === 'percentage' || state?.name === 'relativeHumidity') {
                        valueString = `${state.value === null ? '--' : Math.round(state.value * 100) / 100}%`;
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
                        state.value = `${Math.round(state.value.value * 100) / 100} ${state.value.scale === 'CELSIUS' ? '°C' : state.value.scale}`;
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

    static renderDevTypes(dev: AlexaSH3DeviceDescription): React.JSX.Element[] | null {
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
                    let valueColor = null;
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

    getControlId(lineNum: number, controlNum?: number): string {
        return controlNum === undefined
            ? this.state.devices[lineNum].friendlyName
            : `${this.state.devices[lineNum].friendlyName}_${controlNum}`;
    }

    onExpand(lineNum: number, controlNum?: number): void {
        const expanded = [...this.state.expanded];
        const id = this.getControlId(lineNum, controlNum);
        const pos = expanded.indexOf(id);
        if (pos === -1) {
            expanded.push(id);
        } else {
            expanded.splice(pos, 1);
            // Unsubscribe all states of this control
            if (controlNum !== undefined) {
                const control = this.state.devices[lineNum].controls[controlNum];
                Object.values(control.states).forEach((state: IotExternalDetectorState) => {
                    state.subscribed = false;
                    this.unsubscribe(state.id);
                });
            } else {
                const device = this.state.devices[lineNum];
                device.controls.forEach(control => {
                    Object.values(control.states).forEach((state: IotExternalDetectorState) => {
                        state.subscribed = false;
                        this.unsubscribe(state.id);
                    });
                });
            }
        }
        window.localStorage.setItem('v3.expanded', JSON.stringify(expanded));

        this.setState({ expanded });
    }

    renderSelectByOn(control: AlexaSH3ControlDescription): React.JSX.Element {
        // check if brightness and powerState or percentage and powerState exists
        const allCapabilities = control.supported.concat(control.enforced);
        if (
            (allCapabilities.includes('brightness') && allCapabilities.includes('powerState')) ||
            (allCapabilities.includes('percentage') && allCapabilities.includes('powerState'))
        ) {
            const state = Object.values(control.states)[0];
            // get first id
            const byON =
                typeof state?.smartName === 'object'
                    ? (state.smartName as SmartNameObject)?.byON || undefined
                    : undefined;
            // type = '-', 'stored', false or number [5-100]
            const items = [
                <MenuItem
                    key="_"
                    value=""
                >
                    <em>{I18n.t('Default')}</em>
                </MenuItem>,
                <MenuItem
                    key="last"
                    value="stored"
                >
                    {I18n.t('last value')}
                </MenuItem>,
                <MenuItem
                    key="omit"
                    value="omit"
                >
                    {I18n.t('omit value')}
                </MenuItem>,
            ];
            for (let i = 5; i <= 100; i += 5) {
                items.push(
                    <MenuItem
                        key={i.toString()}
                        value={i.toString()}
                    >
                        {i}%
                    </MenuItem>,
                );
            }
            return (
                <FormControl
                    style={styles.selectType}
                    variant="standard"
                >
                    <Select
                        variant="standard"
                        style={styles.devSubLineByOnSelect}
                        value={(byON || '').toString()}
                        onChange={e => state?.id && this.onParamsChange(state.id, e.target.value)}
                    >
                        {items}
                    </Select>
                    <FormHelperText style={styles.devSubLineTypeTitle}>{I18n.t('by ON')}</FormHelperText>
                </FormControl>
            );
        }

        return <div style={styles.selectType} />;
    }

    onParamsChange(id: string, byON: string | undefined, type?: string): void {
        this.addChanged(id, () =>
            this.props.socket
                .getObject(id)
                .then(obj => {
                    this.objects[id] = obj; // remember for later
                    if (obj) {
                        Utils.updateSmartName(
                            // @ts-expect-error fixed in admin
                            obj,
                            undefined, // undefined means do not update
                            byON,
                            type,
                            `${this.props.adapterName}.${this.props.instance}`,
                            this.props.native.noCommon,
                        );
                        if (this.state.lastChanged !== id) {
                            this.setState({ lastChanged: id });
                            this.timerChanged && clearTimeout(this.timerChanged);
                            this.timerChanged = setTimeout(() => {
                                this.setState({ lastChanged: '' });
                                this.timerChanged = null;
                            }, 30000);
                        }

                        return this.props.socket.setObject(id, obj);
                    }
                })
                .then(() => this.informInstance(id)) // update obj
                .catch(err => this.props.onError(err)),
        );
    }

    static renderSelectTypeSelector(type: false | Types, onChange: (value: string) => void): React.JSX.Element | null {
        if (type !== false) {
            const items = [
                <MenuItem
                    key="_"
                    value="_"
                >
                    <em>{I18n.t('no type')}</em>
                </MenuItem>,
            ];
            for (let i = 0; i < SMART_TYPES.length; i++) {
                items.push(
                    <MenuItem
                        key={SMART_TYPES[i]}
                        value={SMART_TYPES[i]}
                    >
                        <em>{I18n.t(SMART_TYPES[i])}</em>
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

        return null;
    }

    renderSelectType(control: AlexaSH3ControlDescription, dev: AlexaSH3DeviceDescription): React.JSX.Element | null {
        if (dev.autoDetected) {
            return <div style={styles.selectType} />;
        }
        // get first id
        const state = Object.values(control.states)[0]!;
        const type = (state?.smartName as SmartNameObject)?.smartType || false;

        return Alexa3SmartNames.renderSelectTypeSelector(type, value =>
            this.onParamsChange(state.id, undefined, value),
        );
    }

    renderStates(control: AlexaSH3ControlDescription, background: string): React.JSX.Element {
        return (
            <div
                key="states"
                style={{ ...styles.statesLine, background }}
            >
                {Object.keys(control.states).map((name, c) => {
                    const stateId = control.states[name]!.id;
                    if (stateId && !control.states[name]!.subscribed) {
                        this.subscribe(stateId);
                        control.states[name]!.subscribed = true;
                    }
                    const unit = this.objects[stateId]?.common?.unit || '';
                    let states = this.objects[stateId]?.common?.states;
                    if (Array.isArray(states)) {
                        const nStates: { [val: string]: string } = {};
                        states.forEach((s, i) => (nStates[i] = s));
                        states = nStates;
                        this.objects[stateId]!.common.states = states;
                    }
                    let valueStr: React.JSX.Element | null = null;
                    const stateValue = this.state.values[stateId];
                    if (stateValue) {
                        if (states) {
                            if (states[String(stateValue.val)] !== undefined) {
                                valueStr = (
                                    <span style={stateValue.ack ? styles.stateValueAck : styles.stateValueNoAck}>
                                        {states[String(stateValue.val)]}({String(stateValue.val)})
                                    </span>
                                );
                            } else {
                                valueStr = (
                                    <span style={stateValue.ack ? styles.stateValueAck : styles.stateValueNoAck}>
                                        {String(stateValue.val)}
                                    </span>
                                );
                            }
                        } else if (unit) {
                            valueStr = (
                                <span>
                                    <span style={stateValue.ack ? styles.stateValueAck : styles.stateValueNoAck}>
                                        {String(
                                            typeof stateValue.val === 'number'
                                                ? Math.round(stateValue.val * 1000) / 1000
                                                : stateValue.val,
                                        )}
                                    </span>
                                    <span style={{ opacity: 0.7, fontSize: 'smaller' }}>{unit}</span>
                                </span>
                            );
                        } else {
                            valueStr = (
                                <span style={stateValue.ack ? styles.stateValueAck : styles.stateValueNoAck}>
                                    {String(
                                        typeof stateValue.val === 'number'
                                            ? Math.round(stateValue.val * 1000) / 1000
                                            : stateValue.val,
                                    )}
                                </span>
                            );
                        }
                    } else {
                        valueStr = <span>--{unit}</span>;
                    }

                    return (
                        <div
                            key={c}
                            style={{
                                ...styles.devSubSubLine,
                                ...(c % 2
                                    ? {
                                          background:
                                              this.props.themeType === 'dark'
                                                  ? `${DEFAULT_STATE_COLOR_DARK}80`
                                                  : `${DEFAULT_STATE_COLOR_LIGHT}80`,
                                      }
                                    : {
                                          background:
                                              this.props.themeType === 'dark'
                                                  ? DEFAULT_STATE_COLOR_DARK
                                                  : DEFAULT_STATE_COLOR_LIGHT,
                                      }),
                            }}
                        >
                            <div style={styles.devSubSubLineName}>
                                <div style={styles.devSubSubLineStateName}>{name}:</div>
                                <span style={styles.devSubSubLineStateId}>{stateId}</span>
                            </div>
                            <div>{valueStr}</div>
                            <div style={{ width: 130 + 130 + 40 + 40 + 30 }} />
                        </div>
                    );
                })}
            </div>
        );
    }

    static getParentId(id: string): string {
        const parts = id.split('.');
        parts.pop();
        return parts.join('.');
    }

    async findDeviceForState(stateId: string): Promise<ioBroker.Object | null | undefined> {
        // read channel
        const channelId = Alexa3SmartNames.getParentId(stateId);
        const channelObj = await this.props.socket.getObject(channelId);
        this.objects[channelId] = channelObj; // remember for later
        if (channelObj?.type === 'device') {
            return channelObj;
        }

        if (channelObj && (channelObj.type === 'channel' || channelObj.type === 'folder')) {
            let deviceId = Alexa3SmartNames.getParentId(channelId);
            let deviceObj = await this.props.socket.getObject(deviceId);
            this.objects[deviceId] = deviceObj; // remember for later

            if (deviceObj?.type === 'device') {
                return deviceObj;
            }

            if (deviceObj?.type === 'folder') {
                deviceId = Alexa3SmartNames.getParentId(channelId);
                deviceObj = await this.props.socket.getObject(deviceId);
                this.objects[deviceId] = deviceObj; // remember for later
                if (deviceObj?.type === 'device') {
                    return deviceObj;
                }
            }

            return channelObj;
        }

        const result = await this.props.socket.getObject(stateId);
        this.objects[stateId] = result; // remember for later
        return result;
    }

    getControlProps(control: AlexaSH3ControlDescription): {
        name: string;
        icon?: string | null;
    } {
        // get first state
        const stateId = Object.values(control.states)[0]!.id;
        if (this.state.objects[stateId] === undefined && !this.requesting[stateId]) {
            this.requesting[stateId] = true;
            // try to find the device
            setTimeout(() => {
                void this.findDeviceForState(stateId).then(obj => {
                    delete this.requesting[stateId];
                    const objects = JSON.parse(JSON.stringify(this.state.objects));
                    if (obj?.common) {
                        objects[stateId] = {
                            name: obj.common?.name || null,
                            icon: getObjectIcon(obj, stateId, '../..', this.language),
                        };
                        objects[stateId].name = getName(objects[stateId].name, this.language);
                    } else {
                        objects[stateId] = { name: stateId };
                    }
                    this.setState({ objects });
                });
            }, 50);
        }

        if (this.state.objects[stateId]) {
            return this.state.objects[stateId];
        }

        return { name: stateId };
    }

    renderChannels(dev: AlexaSH3DeviceDescription, lineNum: number): (React.JSX.Element | null)[] {
        return dev.controls.map((control: AlexaSH3ControlDescription, c: number): React.JSX.Element | null => {
            if (!control.states || !Object.keys(control.states).length) {
                return null;
            }
            const id: string = Object.values(control.states)[0]!.id;

            let background = this.state.changed.includes(id)
                ? CHANGED_COLOR
                : this.props.themeType === 'dark'
                  ? c % 2
                      ? DEFAULT_CHANNEL_COLOR_DARK
                      : DEFAULT_CHANNEL_COLOR_DARK2
                  : c % 2
                    ? DEFAULT_CHANNEL_COLOR_LIGHT
                    : DEFAULT_CHANNEL_COLOR_LIGHT2;

            if (
                this.state.lastChanged === id &&
                (background === DEFAULT_CHANNEL_COLOR_DARK || background === DEFAULT_CHANNEL_COLOR_LIGHT)
            ) {
                background = this.props.themeType === 'dark' ? LAST_CHANGED_COLOR_DARK : LAST_CHANGED_COLOR_LIGHT;
            }

            const Icon = DEVICES[control.type]?.icon || null;
            const expanded = this.state.expanded.includes(this.getControlId(lineNum, c));

            const controlProps = this.getControlProps(control);

            return [
                <div
                    key={`channel_${c}`}
                    style={{ ...styles.devSubLine, background }}
                >
                    <IconButton
                        style={styles.devSubLineExpand}
                        onClick={() => this.onExpand(lineNum, c)}
                    >
                        <ChevronRight style={expanded ? styles.devSubLineExpanded : undefined} />
                    </IconButton>
                    {Icon ? <Icon style={{ ...styles.deviceSmallIcon, color: DEVICES[control.type]?.color }} /> : null}
                    <div style={styles.devSubLineName}>
                        <div style={styles.devSubLineName1}>{I18n.t(control.type)}</div>
                        <div style={styles.devSubLineName2}>
                            <div style={styles.devSubLineName2Div}>
                                {controlProps.icon ? (
                                    controlProps.icon.startsWith('data:image/svg') ? (
                                        <SVG
                                            style={styles.devSubLineName2Icon}
                                            src={controlProps.icon}
                                            width={20}
                                            height={20}
                                        />
                                    ) : (
                                        <ARIcon
                                            src={controlProps.icon}
                                            style={{ ...styles.devSubLineName2Icon, width: 20, height: 20 }}
                                        />
                                    )
                                ) : null}
                                {controlProps.name}
                            </div>
                        </div>
                    </div>
                    <div style={styles.devLineActions}>{Alexa3SmartNames.renderChannelActions(control)}</div>
                    {this.renderSelectByOn(control)}
                    {this.renderSelectType(control, dev)}
                    {!dev.autoDetected ? (
                        <IconButton
                            aria-label="Edit"
                            style={styles.devLineEdit}
                            onClick={() => this.onEdit(id)}
                        >
                            <IconEdit fontSize="middle" />
                        </IconButton>
                    ) : (
                        <div style={styles.devLineEdit} />
                    )}
                    {!dev.autoDetected ? (
                        <IconButton
                            aria-label="Delete"
                            style={styles.devLineDelete}
                            onClick={() => this.onAskDelete(id)}
                        >
                            <IconDelete fontSize="middle" />
                        </IconButton>
                    ) : dev.controls.length > 1 ? (
                        <IconButton
                            aria-label="Delete"
                            style={styles.devSubLineDelete}
                            onClick={() => this.onAskDelete(id)}
                        >
                            <IconDelete fontSize="middle" />
                        </IconButton>
                    ) : (
                        <div style={styles.devLineDelete} />
                    )}
                </div>,
                expanded ? this.renderStates(control, background) : null,
                dev.controls.length - 1 === c ? (
                    <div
                        key={`margin_${c}`}
                        style={{ marginBottom: 10 }}
                    />
                ) : null,
            ] as unknown as React.JSX.Element;
        });
    }

    renderDevice(dev: AlexaSH3DeviceDescription, lineNum: number): React.JSX.Element | null {
        // if (!dev.additionalApplianceDetails.group && dev.additionalApplianceDetails.nameModified) {
        const title = dev.friendlyName;
        // } else {
        //    title = <span style={styles.devModified} title={I18n.t('modified')}>{friendlyName}</span>;
        // }

        const expanded = this.state.expanded.includes(title);
        // take the very first ID
        const id = Object.values(dev.controls[0].states)[0]!.id;

        let background = lineNum % 2 ? (this.props.themeType === 'dark' ? '#272727' : '#f1f1f1') : 'inherit';
        const changed = this.state.changed.includes(id);
        if (changed) {
            background = CHANGED_COLOR;
        } else if (id === this.state.lastChanged) {
            background = this.props.themeType === 'dark' ? LAST_CHANGED_COLOR_DARK : LAST_CHANGED_COLOR_LIGHT;
        }

        return [
            <div
                key={`line${lineNum}`}
                style={{ ...styles.devLine, background }}
            >
                <div style={styles.devLineNumber}>{lineNum + 1}.</div>
                <IconButton
                    style={styles.devLineExpand}
                    onClick={() => this.onExpand(lineNum)}
                >
                    {dev.controls.length > 1 ? (
                        <Badge
                            badgeContent={dev.controls.length}
                            color="primary"
                        >
                            {expanded ? <IconCollapse /> : <IconExpand />}
                        </Badge>
                    ) : expanded ? (
                        <IconCollapse />
                    ) : (
                        <IconExpand />
                    )}
                </IconButton>
                <div style={styles.devLineNameBlock}>
                    {dev.autoDetected ? (
                        <>
                            <span style={styles.devLineName}>{title}</span>
                            <span style={styles.devLineDescription}>
                                {I18n.t(
                                    'Grouped from %s and %s',
                                    getName(dev.roomName, this.language),
                                    getName(dev.funcName, this.language),
                                )}
                            </span>
                        </>
                    ) : (
                        title
                    )}
                    {changed ? (
                        <CircularProgress
                            style={styles.devLineProgress}
                            size={20}
                        />
                    ) : null}
                </div>
                <span style={styles.devLineActions}>{Alexa3SmartNames.renderDevTypes(dev)}</span>
            </div>,
            expanded ? this.renderChannels(dev, lineNum) : null,
        ] as unknown as React.JSX.Element;
    }

    renderMessage(): React.JSX.Element | null {
        if (!this.state.message) {
            return null;
        }
        return (
            <DialogMessage
                text={this.state.message}
                onClose={() => this.setState({ message: '' })}
            />
        );
    }

    changeSmartName(e?: React.SyntheticEvent): void {
        e?.preventDefault();
        if (!this.state.edit) {
            return;
        }

        // Check if the name is duplicate
        this.addChanged(this.state.edit.id, () => {
            const id = this.state.edit!.id;
            const editedSmartType = this.state.edit!.type;
            const editedSmartName = this.state.edit!.name;

            this.setState({
                edit: null,
                lastChanged: id,
            });

            if (this.timerChanged) {
                clearTimeout(this.timerChanged);
            }
            this.timerChanged = setTimeout(() => {
                this.timerChanged = null;
                this.setState({ lastChanged: '' });
            }, 30000); // show for 30 seconds the green background for changes

            this.props.socket
                .getObject(id)
                .then(obj => {
                    this.objects[id] = obj; // remember for later
                    if (obj) {
                        Utils.updateSmartName(
                            // @ts-expect-error fixed in admin
                            obj,
                            editedSmartName,
                            undefined,
                            editedSmartType,
                            `${this.props.adapterName}.${this.props.instance}`,
                            this.props.native.noCommon,
                        );
                        return this.props.socket.setObject(id, obj);
                    }
                })
                .then(() => this.informInstance(id)) // update obj
                .catch(err => this.props.onError(err));
        });
    }

    renderEditDialog(): React.JSX.Element | null {
        if (!this.state.edit) {
            return null;
        }
        return (
            <Dialog
                open={!0}
                maxWidth="sm"
                fullWidth
                onClose={() => this.setState({ edit: null })}
                aria-labelledby="message-dialog-title"
                aria-describedby="message-dialog-description"
            >
                <DialogTitle id="message-dialog-title">
                    {this.state.edit.isAfterAdd ? (
                        <div>
                            {I18n.t('The device was added. You can set a smart name now or just keep the current.')}
                        </div>
                    ) : null}
                    {this.props.title || I18n.t('Smart name for %s', this.state.edit.objectName)}
                </DialogTitle>
                <DialogContent>
                    <p>
                        <span>ID:</span> <span style={styles.editedId}>{this.state.edit.id}</span>
                    </p>
                    <TextField
                        variant="standard"
                        style={{ width: '100%' }}
                        label={I18n.t('Smart name')}
                        autoFocus
                        onKeyDown={e => e.key === 'Enter' && this.changeSmartName(e)}
                        onChange={e => {
                            const edit = JSON.parse(JSON.stringify(this.state.edit));
                            edit.name = e.target.value;
                            this.setState({ edit });
                        }}
                        value={this.state.edit.name}
                        helperText={I18n.t('You can enter several names divided by comma')}
                        margin="normal"
                    />
                    {this.state.edit.type !== null
                        ? Alexa3SmartNames.renderSelectTypeSelector(this.state.edit.type, value => {
                              const edit = JSON.parse(JSON.stringify(this.state.edit));
                              edit.type = value;
                              this.setState({ edit });
                          })
                        : null}
                </DialogContent>
                <DialogActions>
                    <Button
                        variant="contained"
                        disabled={
                            !this.state.edit.name ||
                            (this.state.edit.originalName === this.state.edit.name &&
                                (this.state.edit.type || null) === (this.state.edit.originalType || null))
                        }
                        onClick={() => this.changeSmartName()}
                        color="primary"
                        startIcon={<IconCheck />}
                    >
                        {I18n.t('Ok')}
                    </Button>
                    <Button
                        variant="contained"
                        onClick={() => this.setState({ edit: null })}
                        startIcon={<IconClose />}
                        color="grey"
                    >
                        {this.state.edit.originalName === this.state.edit.name &&
                        (this.state.edit.type || null) === (this.state.edit.originalType || null)
                            ? I18n.t('Close')
                            : I18n.t('Cancel')}
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }

    renderConfirmDialog(): React.JSX.Element | null {
        if (this.state.showConfirmation) {
            return (
                <Dialog
                    open={!0}
                    maxWidth="sm"
                    fullWidth
                    onClose={() => this.setState({ showConfirmation: '' })}
                    aria-labelledby="confirmation-dialog-title"
                    aria-describedby="confirmation-dialog-description"
                >
                    <DialogTitle id="confirmation-dialog-title">
                        {this.props.title || I18n.t('Device %s will be disabled.', this.state.deleteId)}
                    </DialogTitle>
                    <DialogContent>
                        <p>{I18n.t('Are you sure?')}</p>
                    </DialogContent>
                    <DialogActions>
                        <Button
                            variant="contained"
                            onClick={() => this.onDelete()}
                            color="primary"
                            autoFocus
                            startIcon={<IconDelete />}
                        >
                            {I18n.t('Delete')}
                        </Button>
                        <Button
                            color="grey"
                            variant="contained"
                            startIcon={<IconClose />}
                            onClick={() => this.setState({ showConfirmation: '' })}
                        >
                            {I18n.t('Cancel')}
                        </Button>
                    </DialogActions>
                </Dialog>
            );
        }
        return null;
    }

    getSelectIdDialog(): React.JSX.Element | null {
        if (this.state.showSelectId) {
            return (
                <DialogSelectID
                    key="dialogSelectID1"
                    imagePrefix="../.."
                    theme={this.props.theme}
                    socket={this.props.socket}
                    selected=""
                    types={['state']}
                    onClose={() => this.setState({ showSelectId: false })}
                    onOk={(selected /* , name */) => {
                        this.setState({ showSelectId: false });
                        const selectedId = Array.isArray(selected) ? selected[0] : selected;

                        if (!selectedId) {
                            this.setState({ message: I18n.t('Invalid ID') });
                            return;
                        }
                        void this.props.socket.getObject(selectedId).then(obj => {
                            this.objects[selectedId] = obj; // remember for later
                            if (obj) {
                                const name = Utils.getObjectNameFromObj(obj, null, { language: this.language });
                                // special case for buttons
                                if (obj.common.role?.includes('button')) {
                                    if (this.props.native.noCommon) {
                                        obj.common.custom ||= {};
                                        obj.common.custom[`${this.props.adapterName}.${this.props.instance}`] ||= {};
                                        obj.common.custom[
                                            `${this.props.adapterName}.${this.props.instance}`
                                        ].smartName = {
                                            smartType: 'button',
                                            [this.language]: name || I18n.t('Button'),
                                        };
                                    } else {
                                        obj.common.smartName = {
                                            smartType: 'button',
                                            [this.language]: name || I18n.t('Button'),
                                        };
                                    }
                                } else {
                                    Utils.updateSmartName(
                                        // @ts-expect-error fixed in admin
                                        obj,
                                        (name || I18n.t('Device name')).replace(/[-_.]+/g, ' '),
                                        undefined,
                                        undefined,
                                        `${this.props.adapterName}.${this.props.instance}`,
                                        this.props.native.noCommon,
                                    );
                                }
                                this.addChanged(obj._id);
                                this.waitForUpdateID = obj._id;

                                if (this.state.lastChanged !== obj._id) {
                                    this.setState({ lastChanged: obj._id });
                                    this.timerChanged && clearTimeout(this.timerChanged);
                                    this.timerChanged = setTimeout(() => {
                                        this.setState({ lastChanged: '' });
                                        this.timerChanged = null;
                                    }, 30000);
                                }

                                this.props.socket
                                    .setObject(obj._id, obj)
                                    .then(() => this.informInstance(obj._id))
                                    .catch(err => this.setState({ message: err }));
                            } else {
                                this.setState({ message: I18n.t('Invalid ID') });
                            }
                        });
                    }}
                />
            );
        }
        return null;
    }

    renderDevices(): React.JSX.Element {
        const filter = this.state.filter.toLowerCase();
        const result = [];
        for (let i = 0; i < this.state.devices.length; i++) {
            if (this.state.filter && !this.state.devices[i].friendlyName.toLowerCase().includes(filter)) {
                continue;
            }
            result.push(this.renderDevice(this.state.devices[i], i));
        }

        return (
            <div
                key="listDevices"
                style={styles.columnDiv}
            >
                {result}
            </div>
        );
    }

    renderListOfDevices(): React.JSX.Element | null {
        if (!this.state.showListOfDevices) {
            return null;
        }
        return (
            <Dialog
                open={!0}
                maxWidth="xl"
                fullWidth
                onClose={() => this.setState({ showListOfDevices: false })}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
            >
                <DialogTitle id="alert-dialog-title">
                    {I18n.t('List of devices to print out, e.g. to give all device names to your partner.')}{' '}
                    <span
                        role="img"
                        aria-label="smile"
                    >
                        😄
                    </span>
                </DialogTitle>
                <DialogContent>
                    <Box sx={styles.headerRow}>
                        <div style={styles.headerCell}>{I18n.t('Name')}</div>
                    </Box>
                    <div style={styles.tableDiv}>
                        {this.state.devices.map((item, i) => (
                            <div key={i}>
                                <div style={styles.tableCell}>{item.friendlyName}</div>
                            </div>
                        ))}
                    </div>
                </DialogContent>
                <DialogActions>
                    <Button
                        variant="outlined"
                        onClick={() => {
                            this.setState({ showListOfDevices: false });
                            const lines = this.state.devices.map(item => item.friendlyName);
                            Utils.copyToClipboard(lines.join('\n'));
                        }}
                        color="primary"
                        startIcon={<IconCopy />}
                    >
                        {I18n.t('Copy to clipboard')}
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<IconClose />}
                        onClick={() => this.setState({ showListOfDevices: false })}
                        autoFocus
                        color="grey"
                    >
                        {I18n.t('Close')}
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }

    render(): React.JSX.Element {
        if (this.state.loading) {
            return <CircularProgress key="alexaProgress" />;
        }

        return (
            <form
                key="alexa"
                style={styles.tab}
            >
                <Fab
                    size="small"
                    color="secondary"
                    aria-label="Add"
                    title={I18n.t('Add new device from state')}
                    disabled={(!!this.state.lastChanged && !!this.waitForUpdateID) || !this.state.alive}
                    style={styles.button}
                    onClick={() => this.setState({ showSelectId: true })}
                >
                    {this.state.lastChanged && this.waitForUpdateID ? <CircularProgress /> : <IconAdd />}
                </Fab>
                <Fab
                    size="small"
                    color="primary"
                    title={I18n.t('Refresh list of devices')}
                    aria-label="Refresh"
                    style={styles.button}
                    onClick={() => this.browse(true)}
                    disabled={this.state.browse || !this.state.alive}
                >
                    {this.state.browse ? <CircularProgress size={20} /> : <IconRefresh />}
                </Fab>
                <IconButton
                    title={I18n.t('Expand all devices')}
                    onClick={() => {
                        const expanded: string[] = [];
                        this.state.devices.forEach((dev, lineNum) => {
                            expanded.push(dev.friendlyName);
                            dev.controls.forEach((control, c) => {
                                expanded.push(this.getControlId(lineNum, c));
                            });
                        });
                        window.localStorage.setItem('v3.expanded', JSON.stringify(expanded));
                        this.setState({ expanded });
                    }}
                >
                    <UnfoldMore />
                </IconButton>
                <IconButton
                    disabled={!this.state.expanded.length}
                    onClick={() => {
                        this.setState({ expanded: [] });
                        this.unsubscribeAll();
                        window.localStorage.removeItem('v3.expanded');
                    }}
                    title={I18n.t('Collapse all devices')}
                >
                    <UnfoldLess />
                </IconButton>
                <Fab
                    style={{ ...styles.button, marginLeft: '1rem' }}
                    title={I18n.t('Show all devices for print out')}
                    size="small"
                    aria-label="List of devices"
                    onClick={() => this.setState({ showListOfDevices: true })}
                    disabled={this.state.browse || !this.state.alive}
                >
                    <IconList />
                </Fab>
                <TextField
                    variant="standard"
                    placeholder={I18n.t('Filter')}
                    value={this.state.filter}
                    onChange={e => this.setState({ filter: e.target.value })}
                    slotProps={{
                        input: {
                            endAdornment: this.state.filter ? (
                                <IconButton onClick={() => this.setState({ filter: '' })}>
                                    <IconClear />
                                </IconButton>
                            ) : undefined,
                        },
                    }}
                />
                {this.renderDevices()}
                {this.renderMessage()}
                {this.renderEditDialog()}
                {this.getSelectIdDialog()}
                {this.renderConfirmDialog()}
                {this.renderListOfDevices()}
            </form>
        );
    }
}
