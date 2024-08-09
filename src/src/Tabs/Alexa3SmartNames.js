import React, { Component } from 'react';
import PropTypes from 'prop-types';
import SVG from 'react-inlinesvg';

import {
    TextField,
    Button,
    IconButton,
    Fab,
    CircularProgress,
    Badge,
    Select,
    MenuItem,
    FormHelperText,
    FormControl,
    DialogTitle,
    DialogContent,
    DialogActions,
    Dialog, Box,
} from '@mui/material';

import {
    MdEdit as IconEdit,
    MdAdd as IconAdd,
    MdRefresh as IconRefresh,
    MdClear as IconClear,
    MdDelete as IconDelete,
    MdFormatAlignJustify as IconExpand,
    MdDragHandle as IconCollapse,
    MdList as IconList,
    MdBlinds,
    MdOutlineSensors, MdOutlineThermostat,
} from 'react-icons/md';

import {
    FaLightbulb,
    FaPercentage as Percent,
    FaSnowflake,
    FaTemperatureLow,
} from 'react-icons/fa';

import { AiFillUnlock } from 'react-icons/ai';
import { BsFillDoorOpenFill, BsFillVolumeUpFill } from 'react-icons/bs';
import { GiElectricalSocket, GiGate, GiWindow } from 'react-icons/gi';
import { HiLightBulb } from 'react-icons/hi';
import { IoIosColorFilter } from 'react-icons/io';
import { CgMenuMotion } from 'react-icons/cg';
import { RxSlider } from 'react-icons/rx';
import { TbVacuumCleaner } from 'react-icons/tb';

import {
    FileCopy as IconCopy,
    Close as IconClose,
    Check as IconCheck,
    Brightness5,
    ToggleOn,
    Palette,
    Gradient,
    Notifications,
    Lock,
    ModeStandby,
    VolumeOff,
    Thermostat,
    ThermostatAuto,
    VolumeUp,
    DeviceThermostat,
    ChevronRight,
} from '@mui/icons-material';

import {
    Utils,
    I18n,
    Message as MessageDialog,
    SelectID as DialogSelectID,
    Icon as ARIcon,
} from '@iobroker/adapter-react-v5';

const CHANGED_COLOR = '#e7000040';
const DEFAULT_CHANNEL_COLOR_DARK = '#4f4f4f';
const DEFAULT_CHANNEL_COLOR_DARK2 = '#313131';
const DEFAULT_CHANNEL_COLOR_LIGHT = '#e9e9e9';
const DEFAULT_CHANNEL_COLOR_LIGHT2 = '#bbbbbb';
const LAST_CHANGED_COLOR_DARK = '#5c8f65';
const LAST_CHANGED_COLOR_LIGHT = '#b4ffbe';

const DEFAULT_STATE_COLOR_DARK = '#6e6e6e';
const DEFAULT_STATE_COLOR_LIGHT = '#d0d0d0';

const SMART_TYPES = [
    'socket',
    'light',
    'dimmer',
    'thermostat',
    'blinds',
    'gate',
    'lock',
    'hue',
    'ct',
    'motion',
    'levelSlider',
    'temperature',
    'window',
];

const SMART_TYPES_V2 = {
    LIGHT: 'light',
    SWITCH: 'socket',
    THERMOSTAT: 'thermostat',
    SMARTPLUG: 'socket',
    SMARTLOCK: 'lock',
    CAMERA: 'camera',
};

const CAPABILITIES = {
    brightness: { label: 'Brightness', icon: Brightness5, color: '#c9b803' },
    powerState: { label: 'Power', icon: ToggleOn, color: '#70bd00' },
    colorTemperatureInKelvin: { label: 'Color temperature', icon: Gradient, color: '#019bb6' },
    color: { label: 'Color', icon: Palette, color: '#a20030' },
    detectionState: { label: 'Detection', icon: Notifications, color: '#913c01' },
    lockState: { label: 'Lock', icon: Lock, color: '#00519b' },
    mode: { label: 'Mode', icon: ModeStandby, color: '#112233' },
    muted: { label: 'Muted', icon: VolumeOff, color: '#9701af' },
    percentage: { label: 'Percentage', icon: Percent, color: '#009870' },
    targetSetpoint: { label: 'Set point', icon: Thermostat, color: '#813600' },
    temperature: { label: 'Temperature', icon: DeviceThermostat, color: '#9f1300' },
    thermostatMode: { label: 'Thermostat mode', icon: ThermostatAuto, color: '#800048' },
    volume: { label: 'Volume', icon: VolumeUp, color: '#006702' },
};

const DEVICES = {
    Light: {
        label: 'Light',
        icon: FaLightbulb,
        color: '#c9b803',
        control: 'switch',
        controllable: true,
    },
    AirCondition: {
        label: 'AirCondition',
        icon: FaSnowflake,
        color: '#001fb9',
        control: 'switch',
        controllable: true,
    },
    Blind: {
        label: 'Blinds',
        icon: MdBlinds,
        color: '#00a28f',
        control: 'blinds',
        controllable: true,
    },
    ContactSensor: {
        label: 'Sensor',
        icon: MdOutlineSensors,
        color:'#c9b803',
        control: 'sensor',
        controllable: false,
    },
    Dimmer: {
        label: 'Dimmer',
        icon: HiLightBulb,
        color: '#cb8500',
        control: 'slider',
        controllable: true,
    },
    Door: {
        label: 'Door sensor',
        icon: BsFillDoorOpenFill,
        color: '#ad002a',
        control: 'doorSensor',
        controllable: false,
    },
    Gate: {
        label: 'Gate',
        icon: GiGate,
        color: '#9d02af',
        control: 'gate',
    },
    Hue: {
        label: 'Color HUE',
        icon: IoIosColorFilter,
        color: '#007a96',
        control: 'color',
    },
    Ct: { label: 'Color temperature', icon: IoIosColorFilter, color: '#5a9600' },
    Lock: { label: 'Lock', icon: AiFillUnlock, color: '#c9030a' },
    Motion: { label: 'Motion', icon: CgMenuMotion, color: '#149100' },
    Slider: { label: 'Slider', icon: RxSlider, color: '#029a7f' },
    Socket: { label: 'Socket', icon: GiElectricalSocket, color: '#834303' },
    Temperature: { label: 'Temperature', icon: FaTemperatureLow, color: '#8ca102' },
    Thermostat: { label: 'Thermostat', icon: MdOutlineThermostat, color: '#8c4800' },
    VacuumCleaner: { label: 'Vacuum cleaner', icon: TbVacuumCleaner, color: '#9e03c9' },
    Volume: { label: 'Volume', icon: BsFillVolumeUpFill, color: '#c903c6' },
    VolumeGroup: { label: 'Volume group', icon: BsFillVolumeUpFill, color: '#c903c6' },
    Window: { label: 'Window sensor', icon: GiWindow, color: '#27c903' },
};

const styles = {
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
    devLineName: {

    },
    devLineNumber:{
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
    devSubSubLineName:  {
        fontSize: 11,
        fontStyle: 'italic',
        paddingLeft: 10,
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
    headerRow: theme => ({
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
};

function getObjectIcon(obj, id, imagePrefix) {
    imagePrefix = imagePrefix || '.'; // http://localhost:8081';
    let src = '';
    const common = obj && obj.common;

    if (common) {
        const cIcon = common.icon;
        if (cIcon) {
            if (!cIcon.startsWith('data:image/')) {
                if (cIcon.includes('.')) {
                    let instance;
                    if (obj.type === 'instance' || obj.type === 'adapter') {
                        src = `${imagePrefix}/adapter/${common.name}/${cIcon}`;
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

function getName(name, lang) {
    if (name && typeof name === 'object') {
        return name[lang] || name.en;
    }
    return name;
}

class Alexa3SmartNames extends Component {
    constructor(props) {
        super(props);

        if (!CAPABILITIES.translated) {
            Object.keys(CAPABILITIES).forEach(a => CAPABILITIES[a].label = I18n.t(CAPABILITIES[a].label));
            CAPABILITIES.translated = true;
        }

        if (!DEVICES.translated) {
            Object.keys(DEVICES).forEach(a => DEVICES[a].label = I18n.t(DEVICES[a].label));
            DEVICES.translated = true;
        }

        let expanded = window.localStorage.getItem('v3.expanded') || '[]';
        try {
            expanded = JSON.parse(expanded);
        } catch (e) {
            expanded = [];
        }

        this.state = {
            editedSmartName: '',
            editId: '',
            editedSmartType: null,
            editObjectName: '',
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
        };

        this.requesting = {};
        this.timerChanged = null;
        this.browseTimer = null;
        this.browseTimerCount = 0;
        this.editedSmartName = '';

        this.waitForUpdateID = null;
        this.language = I18n.getLanguage();
    }

    onAliveChanged = (id, state) => {
        if ((!!state?.val) !== this.state.alive) {
            this.setState({ alive: !!state?.val }, () =>
                this.state.alive && setTimeout(() => this.browse(), 10000));
        }
    };

    browse(isIndicate) {
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

        this.props.socket.sendTo(`${this.props.adapterName}.${this.props.instance}`, 'browse3', null)
            .then(list => {
                this.browseTimer && clearTimeout(this.browseTimer);
                this.browseTimerCount = 0;
                this.browseTimer = null;
                if (list && list.error) {
                    this.setState({ message: I18n.t(list.error) });
                } else {
                    if (this.waitForUpdateID) {
                        if (!this.onEdit(this.waitForUpdateID, list)) {
                            this.setState({ message: I18n.t('Device %s was not added', this.waitForUpdateID) });
                        }
                        this.waitForUpdateID = null;
                    }
                    console.log('BROWSE received.');
                    list.sort((a, b) => {
                        if (a.friendlyName > b.friendlyName) {
                            return 1;
                        }
                        if (a.friendlyName < b.friendlyName) {
                            return -1;
                        }
                        return 0;
                    });

                    this.setState({
                        devices: list,
                        loading: false,
                        changed: [],
                        browse: false,
                    });

                    if (list.length > 300) {
                        this.props.onError(I18n.t('Too many devices (%s) configured. Max number is 300', list.length));
                    }
                }
            })
            .catch(e => this.setState({ message: I18n.t('Error %s', e), browse: false }));
    }

    onReadyUpdate = (id, state) => {
        console.log(`Update ${id} ${state ? `${state.val}/${state.ack}` : 'null'}`);
        if (state && state.ack === true && state.val === true) {
            this.devTimer && clearTimeout(this.devTimer);
            this.devTimer = setTimeout(() => {
                this.devTimer = null;
                this.browse();
            }, 300);
        }
    };

    onResultUpdate = (id, state) => {
        state && state.ack === true && state.val && this.setState({ message: state.val });
    };

    componentDidMount() {
        this.props.socket.getObject(`system.adapter.${this.props.adapterName}.${this.props.instance}`)
            .then(obj =>
                this.props.socket.getState(`system.adapter.${this.props.adapterName}.${this.props.instance}.alive`)
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
                    }));

        this.props.socket.subscribeState(`${this.props.adapterName}.${this.props.instance}.smart.updates3`, this.onReadyUpdate);
        this.props.socket.subscribeState(`${this.props.adapterName}.${this.props.instance}.smart.updatesResult`, this.onResultUpdate);
        this.props.socket.subscribeState(`system.adapter.${this.props.adapterName}.${this.props.instance}.alive`, this.onAliveChanged);
    }

    componentWillUnmount() {
        this.props.socket.unsubscribeState(`${this.props.adapterName}.${this.props.instance}.smart.updates3`, this.onReadyUpdate);
        this.props.socket.unsubscribeState(`${this.props.adapterName}.${this.props.instance}.smart.updatesResult`, this.onResultUpdate);
        this.props.socket.unsubscribeState(`system.adapter.${this.props.adapterName}.${this.props.instance}.alive`, this.onAliveChanged);
        if (this.timerChanged) {
            clearTimeout(this.timerChanged);
            this.timerChanged = null;
        }
    }

    informInstance(id) {
        this.props.socket.sendTo(`${this.props.adapterName}.${this.props.instance}`, 'update', id);
    }

    addChanged(id, cb) {
        const changed = JSON.parse(JSON.stringify(this.state.changed));
        if (!changed.includes(id)) {
            changed.push(id);
            this.setState({ changed }, () => cb && cb());
        } else {
            cb && cb();
        }
    }

    onEdit(id, devices) {
        devices = devices || this.state.devices;
        const device = devices.find(dev => dev.controls.find(control => Object.values(control.states).find(item => item.id === id)));
        if (device) {
            this.props.socket.getObject(id)
                .then(obj => {
                    let smartName = Utils.getSmartNameFromObj(obj, `${this.props.adapterName}.${this.props.instance}`, this.props.native.noCommon);
                    if (typeof smartName === 'object' && smartName) {
                        smartName = smartName[I18n.getLanguage()] || smartName.en;
                    }
                    this.editedSmartName = smartName;

                    this.setState({
                        editId: id,
                        editedSmartName: smartName,
                        editObjectName: Utils.getObjectNameFromObj(obj, null, { language: I18n.getLanguage() }),
                    });
                });
            return true;
        }

        return false;
    }

    onAskDelete(deleteId) {
        this.setState({ deleteId, showConfirmation: true });
    }

    onDelete() {
        const id = this.state.deleteId;
        // const device = this.state.devices.find(dev => dev.additionalApplianceDetails.id === id);
        this.addChanged(id, () => {
            this.props.socket.getObject(id)
                .then(obj => {
                    Utils.disableSmartName(obj, `${this.props.adapterName}.${this.props.instance}`, this.props.native.noCommon);
                    return this.props.socket.setObject(id, obj);
                })
                .then(() => {
                    this.setState({ deleteId: '', showConfirmation: false, lastChanged: id });

                    this.timerChanged && clearTimeout(this.timerChanged);
                    this.timerChanged = setTimeout(() => {
                        this.setState({ lastChanged: '' });
                        this.timerChanged = null;
                    }, 30000);

                    // update obj
                    this.informInstance(id);
                })
                .catch(err => this.props.onError(err));
        });
    }

    static renderChannelActions(control) {
        // Type
        const actions = [];

        Object.keys(CAPABILITIES).forEach(action => {
            if (action === 'translated') {
                return;
            }
            if (control.supported.includes(action)) {
                let state;
                const Icon = CAPABILITIES[action].icon;
                let style = styles.actionIcon;
                let valuePercent = null;
                let valueBrightness = null;
                let valueColor = null;
                if (control.state) {
                    state = control.state.find(st => action === st.name);
                    if (state?.name === 'powerState') {
                        if (state?.value === 'OFF') {
                            style = { ...style, ...styles.deviceOff };
                        }
                    } else if (state?.name === 'detectionState') {
                        if (state?.value === 'NOT_DETECTED') {
                            style = { ...style, ...styles.deviceOff };
                        }
                    } else if (state?.name === 'percentage') {
                        valuePercent = `${state.value}%`;
                    } else if (state?.name === 'brightness') {
                        valueBrightness = state.value;
                    } else if (state?.name === 'color') {
                        valueColor = `hsl(${state.value}, 50%, 50%)`;
                    }
                }

                actions.push(<span
                    key={action}
                    title={CAPABILITIES[action].label + (state ? ` - ${state.value}` : '')}
                    style={styles.actionSpan}
                >
                    <Icon style={{ ...style, color: CAPABILITIES[action].color, backgroundColor: valueColor }} />
                    {valuePercent !== null ? <span style={{ color: DEVICES[control.type].color }}>{valuePercent}</span> : null}
                    {valueBrightness !== null ? <span style={{ color: DEVICES[control.type].color }}>{valueBrightness}</span> : null}
                </span>);
            } else if (control.enforced.includes(action)) {
                const Icon = CAPABILITIES[action].icon;
                actions.push(<span
                    key={action}
                    title={CAPABILITIES[action].label}
                    style={{ ...styles.actionSpan, opacity: 0.7 }}
                >
                    <Icon style={{ ...styles.actionIcon, color: CAPABILITIES[action].color }} />
                </span>);
            }
        });
        // add unknown actions
        control.supported.forEach(action => {
            if (!CAPABILITIES[action]) {
                actions.push(<span
                    key={action}
                    title={action}
                    style={styles.actionSpan}
                >
                    {action}
                </span>);
            }
        });
        control.enforced.forEach(action => {
            if (!CAPABILITIES[action]) {
                actions.push(<span
                    key={action}
                    title={action}
                    style={{ ...styles.actionSpan, opacity: 0.7 }}
                >
                    {action}
                </span>);
            }
        });

        return actions;
    }

    static renderDevTypes(dev) {
        // Type
        const devices = [];
        if (!dev.controls) {
            console.log('Something went wrong');
            return null;
        }

        const usedTypes = [];
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
                        if (state?.name === 'powerState') {
                            if (state?.value === 'OFF') {
                                style = { ...style, ...styles.deviceOff };
                            }
                        } else if (state?.name === 'detectionState') {
                            if (state?.value === 'NOT_DETECTED') {
                                style = { ...style, ...styles.deviceOff };
                            }
                        } else if (state?.name === 'percentage') {
                            valuePercent = `${state.value}%`;
                        } else if (state?.name === 'brightness') {
                            valueBrightness = state.value;
                        } else if (state?.name === 'color') {
                            valueColor = `hsl(${state.value}, 100%, 50%)`;
                        }
                    }

                    const currentType = <span
                        key={`${control.type}_${i}`}
                        title={DEVICES[control.type].label + (state ? ` - ${state.value}` : '')}
                        style={style}
                    >
                        <Icon style={{ ...styles.deviceIcon, color: DEVICES[control.type].color, backgroundColor: valueColor }} />
                        {valuePercent !== null ? <span style={{ color: DEVICES[control.type].color }}>{valuePercent}</span> : null}
                        {valueBrightness !== null ? <span style={{ color: DEVICES[control.type].color }}>{valueBrightness}</span> : null}
                    </span>;

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

    getControlId(lineNum, controlNum) {
        return controlNum === undefined ? this.state.devices[lineNum].friendlyName : `${this.state.devices[lineNum].friendlyName}_${controlNum}`;
    }

    onExpand(lineNum, controlNum) {
        const expanded = [...this.state.expanded];
        const id = this.getControlId(lineNum, controlNum);
        const pos = expanded.indexOf(id);
        if (pos === -1) {
            expanded.push(id);
        } else {
            expanded.splice(pos, 1);
        }
        window.localStorage.setItem('v3.expanded', JSON.stringify(expanded));

        this.setState({ expanded });
    }

    renderSelectByOn(control) {
        // check if brightness and powerState or percentage and powerState exists
        const allCapabilities = control.supported.concat(control.enforced);
        if ((allCapabilities.includes('brightness') && allCapabilities.includes('powerState')) ||
            (allCapabilities.includes('percentage') && allCapabilities.includes('powerState'))
        ) {
            const state = Object.values(control.states)[0];
            // get first id
            const byON = state.smartName?.byON || undefined;
            // type = '-', 'stored', false or number [5-100]
            const items = [
                <MenuItem key="_" value=""><em>{I18n.t('Default')}</em></MenuItem>,
                <MenuItem key="last" value="stored">{I18n.t('last value')}</MenuItem>,
                <MenuItem key="omit" value="omit">{I18n.t('omit value')}</MenuItem>,
            ];
            for (let i = 5; i <= 100; i += 5) {
                items.push(<MenuItem key={i.toString()} value={i.toString()}>
                    {i}
                    %
                </MenuItem>);
            }
            return <FormControl style={styles.selectType} variant="standard">
                <Select
                    variant="standard"
                    style={styles.devSubLineByOnSelect}
                    value={(byON || '').toString()}
                    onChange={e => this.onParamsChange(state.id, e.target.value)}
                >
                    {items}
                </Select>
                <FormHelperText style={styles.devSubLineTypeTitle}>{I18n.t('by ON')}</FormHelperText>
            </FormControl>;
        }

        return <div style={styles.selectType} />;
    }

    onParamsChange(id, byON, type) {
        this.addChanged(id, () =>
            this.props.socket.getObject(id)
                .then(obj => {
                    Utils.updateSmartName(obj, undefined, byON, type, `${this.props.adapterName}.${this.props.instance}`, this.props.native.noCommon);

                    if (this.state.lastChanged !== id) {
                        this.setState({ lastChanged: id });
                        this.timerChanged && clearTimeout(this.timerChanged);
                        this.timerChanged = setTimeout(() => {
                            this.setState({ lastChanged: '' });
                            this.timerChanged = null;
                        }, 30000);
                    }

                    return this.props.socket.setObject(id, obj);
                })
                .then(() => this.informInstance(id)) // update obj
                .catch(err => this.props.onError(err)));
    }

    static renderSelectTypeSelector(type, onChange) {
        if (type !== false) {
            const items = [<MenuItem key="_" value="_"><em>{I18n.t('no type')}</em></MenuItem>];
            for (let i = 0; i < SMART_TYPES.length; i++) {
                items.push(<MenuItem key={SMART_TYPES[i]} value={SMART_TYPES[i]}><em>{I18n.t(SMART_TYPES[i])}</em></MenuItem>);
            }
            // convert from AlexaV2 to AlexaV3
            if (type && !SMART_TYPES[type]) {
                if (SMART_TYPES[type.toLowerCase()]) {
                    type = type.toLowerCase();
                } else if (SMART_TYPES_V2[type]) {
                    type = SMART_TYPES_V2[type];
                }
            }

            return <FormControl variant="standard" style={styles.selectType}>
                <Select
                    variant="standard"
                    value={type || '_'}
                    onChange={e => onChange(e.target.value === '_' ? '' : e.target.value)}
                >
                    {items}
                </Select>
                <FormHelperText style={styles.devSubLineTypeTitle}>{I18n.t('Types')}</FormHelperText>
            </FormControl>;
        }

        return null;
    }

    renderSelectType(control, dev) {
        if (dev.autoDetected) {
            return <div style={styles.selectType} />;
        }
        // get first id
        const state = Object.values(control.states)[0];
        const type = state.smartName?.smartType;

        return Alexa3SmartNames.renderSelectTypeSelector(type, value => this.onParamsChange(state.id, undefined, value));
    }

    renderStates(control, background) {
        return <div key="states" style={{ ...styles.statesLine, background }}>
            {Object.keys(control.states).map((name, c) =>
                <div
                    key={name}
                    style={{
                        ...styles.devSubSubLine,
                        ...((c % 2) ?
                            { background: this.props.themeType === 'dark' ? `${DEFAULT_STATE_COLOR_DARK}80` : `${DEFAULT_STATE_COLOR_LIGHT}80` }
                            :
                            { background: this.props.themeType === 'dark' ? DEFAULT_STATE_COLOR_DARK : DEFAULT_STATE_COLOR_LIGHT }
                        ),
                    }}
                >
                    <div style={styles.devSubSubLineName}>
                        <div style={styles.devSubSubLineStateName}>
                            {name}
                            :
                        </div>
                        <span style={styles.devSubSubLineStateId}>{control.states[name].id}</span>
                    </div>
                </div>)}
        </div>;
    }

    static getParentId(id) {
        const parts = id.split('.');
        parts.pop();
        return parts.join('.');
    }

    async findDeviceForState(stateId) {
        // read channel
        const channelId = Alexa3SmartNames.getParentId(stateId);
        const channelObj = await this.props.socket.getObject(channelId);
        if (channelObj?.type === 'device') {
            return channelObj;
        }

        if (channelObj && (channelObj.type === 'channel' || channelObj.type === 'folder')) {
            let deviceId = Alexa3SmartNames.getParentId(channelId);
            let deviceObj = await this.props.socket.getObject(deviceId);

            if (deviceObj?.type === 'device') {
                return deviceObj;
            }

            if (deviceObj?.type === 'folder') {
                deviceId = Alexa3SmartNames.getParentId(channelId);
                deviceObj = await this.props.socket.getObject(deviceId);
                if (deviceObj?.type === 'device') {
                    return deviceObj;
                }
            }

            return channelObj;
        }

        return this.props.socket.getObject(stateId);
    }

    getControlProps(control) {
        // get first state
        const stateId = Object.values(control.states)[0].id;
        if (this.state.objects[stateId] === undefined && !this.requesting[stateId]) {
            this.requesting[stateId] = true;
            // try to find the device
            setTimeout(() => {
                this.findDeviceForState(stateId)
                    .then(obj => {
                        delete this.requesting[stateId];
                        const objects = JSON.parse(JSON.stringify(this.state.objects));
                        if (obj && obj.common) {
                            objects[stateId] = { name: obj.common?.name || null, icon: getObjectIcon(obj, stateId, '../..') };
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

    renderChannels(dev, lineNum) {
        return dev.controls.map((control, c) => {
            const id = Object.values(control.states)[0].id;

            let background = this.state.changed.includes(id) ?
                CHANGED_COLOR :
                this.props.themeType === 'dark' ?
                    ((c % 2) ? DEFAULT_CHANNEL_COLOR_DARK : DEFAULT_CHANNEL_COLOR_DARK2) :
                    ((c % 2) ? DEFAULT_CHANNEL_COLOR_LIGHT : DEFAULT_CHANNEL_COLOR_LIGHT2);

            if (this.state.lastChanged === id && (background === DEFAULT_CHANNEL_COLOR_DARK || background === DEFAULT_CHANNEL_COLOR_LIGHT)) {
                background = this.props.themeType === 'dark' ? LAST_CHANGED_COLOR_DARK : LAST_CHANGED_COLOR_LIGHT;
            }

            const Icon = DEVICES[control.type]?.icon || null;
            const expanded = this.state.expanded.includes(this.getControlId(lineNum, c));

            const controlProps = this.getControlProps(control);

            return [
                <div key={c} style={{ ...styles.devSubLine, background }}>
                    <IconButton style={styles.devSubLineExpand} onClick={() => this.onExpand(lineNum, c)}>
                        <ChevronRight style={expanded ? styles.devSubLineExpanded : undefined} />
                    </IconButton>
                    {Icon ? <Icon style={{ ...styles.deviceSmallIcon, color: DEVICES[control.type].color }} /> : null}
                    <div style={styles.devSubLineName}>
                        <div style={styles.devSubLineName1}>{I18n.t(control.type)}</div>
                        <div style={styles.devSubLineName2}>
                            <div style={styles.devSubLineName2Div}>
                                {controlProps.icon ?
                                    (controlProps.icon.startsWith('data:image/svg') ?
                                        <SVG style={styles.devSubLineName2Icon} src={controlProps.icon} width={20} height={20} /> :
                                        <ARIcon src={controlProps.icon} style={{ ...styles.devSubLineName2Icon, width: 20, height: 20 }} />)
                                    : null}
                                {controlProps.name}
                            </div>
                        </div>
                    </div>
                    <div style={styles.devLineActions}>{Alexa3SmartNames.renderChannelActions(control)}</div>
                    {this.renderSelectByOn(control, dev)}
                    {this.renderSelectType(control, dev)}
                    {!dev.autoDetected ?
                        <IconButton aria-label="Edit" style={styles.devLineEdit} onClick={() => this.onEdit(id)}>
                            <IconEdit fontSize="middle" />
                        </IconButton> : <div style={styles.devLineEdit} />}
                    {!dev.autoDetected ?
                        <IconButton aria-label="Delete" style={styles.devLineDelete} onClick={() => this.onAskDelete(id)}>
                            <IconDelete fontSize="middle" />
                        </IconButton> :
                        (dev.controls.length > 1 ?
                            <IconButton
                                aria-label="Delete"
                                style={styles.devSubLineDelete}
                                onClick={() => this.onAskDelete(id)}
                            >
                                <IconDelete fontSize="middle" />
                            </IconButton> :
                            <div style={styles.devLineDelete} />)}
                </div>,
                expanded ? this.renderStates(control, background) : null,
            ];
        });
    }

    renderDevice(dev, lineNum) {
        // if (!dev.additionalApplianceDetails.group && dev.additionalApplianceDetails.nameModified) {
        const title = dev.friendlyName;
        // } else {
        //    title = <span style={styles.devModified} title={I18n.t('modified')}>{friendlyName}</span>;
        // }

        const expanded = this.state.expanded.includes(title);
        // take the very first ID
        const id = Object.values(dev.controls[0].states)[0].id;

        let background = (lineNum % 2) ? (this.props.themeType === 'dark' ? '#272727' : '#f1f1f1') : 'inherit';
        const changed = this.state.changed.includes(id);
        if (changed) {
            background = CHANGED_COLOR;
        } else if (id === this.state.lastChanged) {
            background = this.props.themeType === 'dark' ? LAST_CHANGED_COLOR_DARK : LAST_CHANGED_COLOR_LIGHT;
        }

        return [
            <div key={`line${lineNum}`} style={{ ...styles.devLine, background }}>
                <div style={styles.devLineNumber}>
                    {lineNum + 1}
.
                </div>
                <IconButton style={styles.devLineExpand} onClick={() => this.onExpand(lineNum)}>
                    {dev.controls.length > 1 ?
                        <Badge badgeContent={dev.controls.length} color="primary">
                            {expanded ? <IconCollapse /> : <IconExpand />}
                        </Badge> :
                        (expanded ? <IconCollapse /> : <IconExpand />)}
                </IconButton>
                <div style={styles.devLineNameBlock}>
                    {dev.autoDetected ? <>
                        <span style={styles.devLineName}>{title}</span>
                        <span style={styles.devLineDescription}>
                            {I18n.t('Grouped from %s and %s', getName(dev.roomName, this.language), getName(dev.funcName, this.language))}
                        </span>
                    </> : title}
                    {changed ? <CircularProgress style={styles.devLineProgress} size={20} /> : null}
                </div>
                <span style={styles.devLineActions}>{Alexa3SmartNames.renderDevTypes(dev)}</span>
            </div>,
            expanded ? this.renderChannels(dev, lineNum) : null,
        ];
    }

    renderMessage() {
        if (this.state.message) {
            return <MessageDialog text={this.state.message} onClose={() => this.setState({ message: '' })} />;
        }
        return null;
    }

    changeSmartName(e) {
        e && e.preventDefault();
        // Check if the name is duplicate
        this.addChanged(this.state.editId, () => {
            const id = this.state.editId;
            const editedSmartType = this.state.editedSmartType;

            this.setState({
                editId: '',
                editObjectName: '',
                lastChanged: id,
                editedSmartType: null,
            });

            this.timerChanged && clearTimeout(this.timerChanged);
            this.timerChanged = setTimeout(() => {
                this.setState({ lastChanged: '' });
                this.timerChanged = null;
            }, 30000); // show for 30 seconds the green background for changes

            this.props.socket.getObject(id)
                .then(obj => {
                    Utils.updateSmartName(
                        obj,
                        this.editedSmartName,
                        undefined,
                        editedSmartType === null ? undefined : editedSmartType,
                        `${this.props.adapterName}.${this.props.instance}`,
                        this.props.native.noCommon,
                    );

                    return this.props.socket.setObject(id, obj);
                })
                .then(() => this.informInstance(id)) // update obj
                .catch(err => this.props.onError(err));
        });
    }

    renderEditDialog() {
        if (this.state.editId) {
            return <Dialog
                open={!0}
                maxWidth="sm"
                fullWidth
                onClose={() => {
                    this.editedSmartName = null;
                    this.setState({ editId: '', editedSmartName: '' });
                }}
                aria-labelledby="message-dialog-title"
                aria-describedby="message-dialog-description"
            >
                <DialogTitle id="message-dialog-title">{this.props.title || I18n.t('Smart name for %s', this.state.editObjectName)}</DialogTitle>
                <DialogContent>
                    <p>
                        <span>ID:</span>
                        {' '}
                        <span style={styles.editedId}>{this.state.editId}</span>
                    </p>
                    <TextField
                        variant="standard"
                        style={{ width: '100%' }}
                        label={I18n.t('Smart name')}
                        autoFocus
                        onKeyDown={e =>
                            e.keyCode === 13 && this.changeSmartName(e)}
                        onChange={e => this.editedSmartName = e.target.value}
                        defaultValue={this.state.editedSmartName}
                        helperText={I18n.t('You can enter several names divided by comma')}
                        margin="normal"
                    />
                    {this.state.editedSmartType !== null ? this.renderSelectTypeSelector(this.state.editedSmartType, value => this.setState({ editedSmartType: value })) : null}
                </DialogContent>
                <DialogActions>
                    <Button
                        variant="contained"
                        onClick={() => this.changeSmartName()}
                        color="primary"
                        startIcon={<IconCheck />}
                    >
                        {I18n.t('Ok')}
                    </Button>
                    <Button
                        variant="contained"
                        onClick={() => {
                            this.editedSmartName = null;
                            this.setState({ editId: '', editedSmartName: '' });
                        }}
                        startIcon={<IconClose />}
                        color="grey"
                    >
                        {I18n.t('Cancel')}
                    </Button>
                </DialogActions>
            </Dialog>;
        }
        return null;
    }

    renderConfirmDialog() {
        if (this.state.showConfirmation) {
            return <Dialog
                open={!0}
                maxWidth="sm"
                fullWidth
                onClose={() => this.setState({ showConfirmation: '' })}
                aria-labelledby="confirmation-dialog-title"
                aria-describedby="confirmation-dialog-description"
            >
                <DialogTitle id="confirmation-dialog-title">{this.props.title || I18n.t('Device %s will be disabled.', this.state.deleteId)}</DialogTitle>
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
            </Dialog>;
        }
        return null;
    }

    getSelectIdDialog() {
        if (this.state.showSelectId) {
            return <DialogSelectID
                key="dialogSelectID1"
                imagePrefix="../.."
                theme={this.props.theme}
                socket={this.props.socket}
                selected=""
                types={['state']}
                onClose={() => this.setState({ showSelectId: false })}
                onOk={(selected/* , name */) => {
                    this.setState({ showSelectId: false });

                    this.props.socket.getObject(selected)
                        .then(obj => {
                            if (obj) {
                                const name = Utils.getObjectNameFromObj(obj, null, { language: this.language });
                                Utils.updateSmartName(
                                    obj,
                                    (name || I18n.t('Device name')).replace(/[-_.]+/g, ' '),
                                    undefined,
                                    undefined,
                                    `${this.props.adapterName}.${this.props.instance}`,
                                    this.props.native.noCommon,
                                );
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

                                this.props.socket.setObject(obj._id, obj)
                                    .then(() => this.informInstance(obj._id))
                                    .catch(err => this.setState({ message: err }));
                            } else {
                                this.setState({ message: I18n.t('Invalid ID') });
                            }
                        });
                }}
            />;
        }
        return null;
    }

    renderDevices() {
        const filter = this.state.filter.toLowerCase();
        const result = [];
        for (let i = 0; i < this.state.devices.length; i++) {
            if (this.state.filter && !this.state.devices[i].friendlyName.toLowerCase().includes(filter)) {
                continue;
            }
            result.push(this.renderDevice(this.state.devices[i], i));
        }

        return <div key="listDevices" style={styles.columnDiv}>{result}</div>;
    }

    renderListOfDevices() {
        if (!this.state.showListOfDevices) {
            return null;
        }
        return <Dialog
            open={!0}
            maxWidth="xl"
            fullWidth
            onClose={() => this.setState({ showListOfDevices: false })}
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description"
        >
            <DialogTitle id="alert-dialog-title">
                {I18n.t('List of devices to print out, e.g. to give all device names to your partner.')}
                {' '}
                <span role="img" aria-label="smile">😄</span>
            </DialogTitle>
            <DialogContent>
                <Box sx={styles.headerRow}>
                    <div style={styles.headerCell}>{I18n.t('Name')}</div>
                </Box>
                <div style={styles.tableDiv}>
                    {this.state.devices.map((item, i) => <div key={i}>
                        <div style={styles.tableCell}>{item.friendlyName}</div>
                    </div>)}
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
        </Dialog>;
    }

    render() {
        if (this.state.loading) {
            return <CircularProgress key="alexaProgress" />;
        }

        return <form key="alexa" style={styles.tab}>
            <Fab
                size="small"
                color="secondary"
                aria-label="Add"
                disabled={(!!this.state.lastChanged && !!this.waitForUpdateID) || !this.state.alive}
                style={styles.button}
                onClick={() => this.setState({ showSelectId: true })}
            >
                {this.state.lastChanged && this.waitForUpdateID ? <CircularProgress /> : <IconAdd />}
            </Fab>
            <Fab
                size="small"
                color="primary"
                aria-label="Refresh"
                disable={!this.state.alive}
                style={styles.button}
                onClick={() => this.browse(true)}
                disabled={this.state.browse}
            >
                {this.state.browse ? <CircularProgress size={20} /> : <IconRefresh />}
            </Fab>
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
                InputProps={{
                    endAdornment: this.state.filter ?
                        <IconButton onClick={() => this.setState({ filter: '' })}>
                            <IconClear />
                        </IconButton> : undefined,
                }}
            />
            {this.renderDevices()}
            {this.renderMessage()}
            {this.renderEditDialog()}
            {this.getSelectIdDialog()}
            {this.renderConfirmDialog()}
            {this.renderListOfDevices()}
        </form>;
    }
}

Alexa3SmartNames.propTypes = {
    // common: PropTypes.object.isRequired,
    native: PropTypes.object.isRequired,
    instance: PropTypes.number.isRequired,
    adapterName: PropTypes.string.isRequired,
    onError: PropTypes.func,
    // onLoad: PropTypes.func,
    // onChange: PropTypes.func,
    socket: PropTypes.object.isRequired,
    themeType: PropTypes.string,
    theme: PropTypes.object,
};

export default Alexa3SmartNames;
