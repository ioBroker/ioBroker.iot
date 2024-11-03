import React, { Component } from 'react';
import PropTypes from 'prop-types';

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
    Dialog,
    Box,
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
} from 'react-icons/md';

import {
    FaPowerOff as IconOn,
    FaThermometerHalf as IconTemperature,
    FaLongArrowAltUp as IconUp,
    FaLongArrowAltDown as IconDown,
    FaPercentage as IconPercentage,
    FaPalette as IconColor,
    FaLightbulb as IconBulb,
    FaLockOpen as IconLock,
    FaThermometer as IconThermometer,
} from 'react-icons/fa';

import { FileCopy as IconCopy, Check as IconCheck, Close as IconClose } from '@mui/icons-material';

import { Utils, I18n, DialogMessage, DialogSelectID } from '@iobroker/adapter-react-v5';

const colorOn = '#aba613';
const colorOff = '#444';
const colorSet = '#00c6ff';
const colorRead = '#00bc00';
const CHANGED_COLOR = '#e7000040';
const DEFAULT_CHANNEL_COLOR_DARK = '#4f4f4f';
const DEFAULT_CHANNEL_COLOR_LIGHT = '#e9e9e9';
const LAST_CHANGED_COLOR_DARK = '#5c8f65';
const LAST_CHANGED_COLOR_LIGHT = '#b4ffbe';
const actionsMapping = {
    turnOn: {
        color: colorOn,
        icon: IconOn,
        desc: 'Turn on',
        v2: true,
    },
    turnOff: {
        color: colorOff,
        icon: IconOn,
        desc: 'Turn off',
        v2: true,
    },

    setTargetTemperature: {
        color: colorSet,
        icon: IconTemperature,
        desc: 'Set target temperature',
        v2: true,
    },
    incrementTargetTemperature: {
        color: colorOn,
        icon: IconUp,
        desc: 'Increment target temperature',
        v2: true,
    },
    decrementTargetTemperature: {
        color: colorOff,
        icon: IconDown,
        desc: 'Decrement target temperature',
        v2: true,
    },

    setPercentage: {
        color: colorSet,
        icon: IconPercentage,
        desc: 'Set percentage',
        v2: true,
    },
    incrementPercentage: {
        color: colorOn,
        icon: IconUp,
        desc: 'Increment percentage',
        v2: true,
    },
    decrementPercentage: {
        color: colorOff,
        icon: IconDown,
        desc: 'Decrement percentage',
        v2: true,
    },

    setColor: {
        color: colorSet,
        icon: IconColor,
        desc: 'Set color',
        v2: true,
    },

    setColorTemperature: {
        color: colorSet,
        icon: IconBulb,
        desc: 'Set color temperature',
        v2: true,
    },
    incrementColorTemperature: {
        color: colorOn,
        icon: IconUp,
        desc: 'Increment color temperature',
        v2: true,
    },
    decrementColorTemperature: {
        color: colorOff,
        icon: IconDown,
        desc: 'Decrement color temperature',
        v2: true,
    },

    getTargetTemperature: {
        color: colorRead,
        icon: IconThermometer,
        desc: 'Get target temperature',
        v2: true,
    },
    getTemperatureReading: {
        color: colorRead,
        icon: IconThermometer,
        desc: 'Get actual temperature',
        v2: true,
    },

    setLockState: {
        color: colorSet,
        icon: IconLock,
        desc: 'Set lock state',
        v2: true,
    },
    getLockState: {
        color: colorRead,
        icon: IconLock,
        desc: 'Read lock state',
        v2: true,
    },
};

const SMARTTYPES = [
    'LIGHT',
    'SWITCH',
    'THERMOSTAT',
    'ACTIVITY_TRIGGER',
    'SCENE_TRIGGER',
    'SMARTPLUG',
    'SMARTLOCK',
    'CAMERA',
];

const styles = {
    tab: {
        width: '100%',
        height: '100%',
    },
    column: {
        display: 'inline-block',
        verticalAlign: 'top',
        marginRight: 20,
        height: '100%',
        overflow: 'hidden',
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
        marginRight: 10,
    },
    devLineEnabled: {
        position: 'absolute',
        right: 0,
        top: 0,
    },
    devLineEdit: {
        position: 'absolute',
        top: 5,
        right: 50,
    },
    devLineDelete: {
        position: 'absolute',
        top: 5,
        right: 0,
    },
    devLineName: {},
    devLineNumber: {
        display: 'inline-block',
        verticalAlign: 'middle',
        width: 15,
    },
    editedId: {
        fontStyle: 'italic',
    },
    enumLineSubName: {
        fontStyle: 'italic',
    },
    devLine: {
        height: 48,
        width: '100%',
        position: 'relative',
    },
    devLineDescription: {
        display: 'block',
        fontStyle: 'italic',
        fontSize: 12,
    },
    devLineActions: {
        fontStyle: 'italic',
        fontSize: 12,
        paddingLeft: 50,
        display: 'inline-block',
    },
    devLineProgress: {
        position: 'absolute',
        top: 0,
        left: 0,
    },
    channelLineActions: {
        width: 80,
    },
    devLineNameBlock: {
        display: 'inline-block',
        width: 'calc(100% - 350px)',
    },
    devModified: {
        fontStyle: 'italic',
    },
    actionIcon: {
        width: 16,
    },
    devSubLine: {
        position: 'relative',
        height: 48,
    },
    devSubLineName: {
        marginLeft: 5,
        marginTop: 14,
        display: 'inline-block',
        fontSize: 13,
        width: 'calc(100% - 400px)',
    },
    devSubSubLineName: {
        fontSize: 8,
        fontStyle: 'italic',
        display: 'block',
    },
    devSubLineByOn: {
        marginLeft: 5,
    },
    devSubLineDelete: {
        position: 'absolute',
        top: 12,
        right: 12,
        padding: 0,
    },
    devSubLineEdit: {
        position: 'absolute',
        top: 12,
        right: 62,
        padding: 0,
    },
    devSubLineTypeTitle: {
        marginTop: 0,
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
};

class AlexaSmartNames extends Component {
    constructor(props) {
        super(props);

        if (!actionsMapping.translated) {
            Object.keys(actionsMapping).forEach(a => (actionsMapping[a].desc = I18n.t(actionsMapping[a].desc)));
            actionsMapping.translated = true;
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
            expanded: [],
            lastChanged: '',
        };

        this.timerChanged = null;
        this.browseTimer = null;
        this.browseTimerCount = 0;
        this.editedSmartName = '';

        this.waitForUpdateID = null;
        this.onReadyUpdateBound = this.onReadyUpdate.bind(this);
        this.onResultUpdateBound = this.onResultUpdate.bind(this);

        this.props.socket.getObject(`system.adapter.${this.props.adapterName}.${this.props.instance}`).then(obj =>
            this.props.socket
                .getState(`system.adapter.${this.props.adapterName}.${this.props.instance}.alive`)
                .then(state => {
                    if (!obj || !obj.common || (!obj.common.enabled && (!state || !state.val))) {
                        this.setState({ message: I18n.t('Instance must be enabled'), loading: false, devices: [] });
                    } else {
                        this.browse();
                    }
                }),
        );
    }

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

        this.props.socket
            .sendTo(`${this.props.adapterName}.${this.props.instance}`, 'browse', null)
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

    onReadyUpdate(id, state) {
        console.log(`Update ${id} ${state ? `${state.val}/${state.ack}` : 'null'}`);
        if (state && state.ack === true && state.val === true) {
            this.devTimer && clearTimeout(this.devTimer);
            this.devTimer = setTimeout(() => {
                this.devTimer = null;
                this.browse();
            }, 300);
        }
    }

    onResultUpdate(id, state) {
        state && state.ack === true && state.val && this.setState({ message: state.val });
    }

    componentDidMount() {
        this.props.socket.subscribeState(
            `${this.props.adapterName}.${this.props.instance}.smart.updates`,
            this.onReadyUpdateBound,
        );
        this.props.socket.subscribeState(
            `${this.props.adapterName}.${this.props.instance}.smart.updatesResult`,
            this.onResultUpdateBound,
        );
    }

    componentWillUnmount() {
        this.props.socket.unsubscribeState(
            `${this.props.adapterName}.${this.props.instance}.smart.updates`,
            this.onReadyUpdateBound,
        );
        this.props.socket.unsubscribeState(
            `${this.props.adapterName}.${this.props.instance}.smart.updatesResult`,
            this.onResultUpdateBound,
        );
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

    /*
    removeChanged(id) {
        const changed = JSON.parse(JSON.stringify(this.state.changed));
        const pos = changed.indexOf(id);

        if (pos !== -1) {
            changed.splice(pos, 1);
            this.setState({ changed });
        }
    }
    */

    onEdit(id, devices) {
        devices = devices || this.state.devices;
        const device = devices.find(dev => dev.additionalApplianceDetails.id === id);
        if (device) {
            this.props.socket.getObject(id).then(obj => {
                let smartName = device.additionalApplianceDetails.friendlyNames
                    ? device.additionalApplianceDetails.friendlyNames
                    : device.friendlyName;
                if (typeof smartName === 'object' && smartName) {
                    smartName = smartName[I18n.getLanguage()] || smartName.en;
                }
                this.editedSmartName = smartName;
                let editedSmartType = null;
                if (!device.additionalApplianceDetails.group) {
                    editedSmartType = device.additionalApplianceDetails.smartType;
                }

                this.setState({
                    editId: id,
                    editedSmartType,
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
            this.props.socket
                .getObject(id)
                .then(obj => {
                    Utils.disableSmartName(
                        obj,
                        `${this.props.adapterName}.${this.props.instance}`,
                        this.props.native.noCommon,
                    );
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

    static renderActions(dev) {
        // Type
        const actions = [];
        if (!dev.actions) {
            console.log('Something went wrong');
            return null;
        }
        dev.actions.sort((a, b) => {
            if (a === b) return 0;
            if (a === 'turnOn') return -1;
            if (b === 'turnOn') return 1;

            if (a === 'turnOff') return -1;
            if (b === 'turnOff') return 1;
            return 0;
        });

        Object.keys(actionsMapping).forEach(action => {
            if (dev.actions.includes(action)) {
                const Icon = actionsMapping[action].icon;
                actions.push(
                    <span
                        key={action}
                        title={actionsMapping[action].desc}
                    >
                        <Icon style={{ ...styles.actionIcon, color: actionsMapping[action].color }} />
                    </span>,
                );
            }
        });
        // add unknown actions
        for (let a = 0; a < dev.actions.length; a++) {
            if (!actionsMapping[dev.actions[a]]) {
                actions.push(<span key={dev.actions[a]}>{dev.actions[a]}</span>);
            }
        }
        return actions;
    }

    onExpand(lineNum) {
        const expanded = JSON.parse(JSON.stringify(this.state.expanded));
        const pos = expanded.indexOf(this.state.devices[lineNum].friendlyName);
        if (pos === -1) {
            expanded.push(this.state.devices[lineNum].friendlyName);
        } else {
            expanded.splice(pos, 1);
        }
        this.setState({ expanded });
    }

    renderSelectByOn(dev, lineNum, id, type) {
        // type = '-', 'stored', false or number [5-100]
        if (type !== false) {
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
                    style={styles.devSubLineByOn}
                    variant="standard"
                >
                    <Select
                        variant="standard"
                        style={styles.devSubLineByOnSelect}
                        value={(type || '').toString()}
                        onChange={e => this.onParamsChange(id, e.target.value)}
                    >
                        {items}
                    </Select>
                    <FormHelperText style={styles.devSubLineTypeTitle}>{I18n.t('by ON')}</FormHelperText>
                </FormControl>
            );
        }
        return null;
    }

    onParamsChange(id, byON, type) {
        this.addChanged(id, () => {
            this.props.socket
                .getObject(id)
                .then(obj => {
                    Utils.updateSmartName(
                        obj,
                        undefined,
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
                })
                .then(() => {
                    // update obj
                    this.informInstance(id);
                })
                .catch(err => this.props.onError(err));
        });
    }

    static renderSelectTypeSelector(type, onChange) {
        if (type !== false) {
            const items = [
                <MenuItem
                    key="_"
                    value="_"
                >
                    <em>{I18n.t('no type')}</em>
                </MenuItem>,
            ];
            for (let i = 0; i < SMARTTYPES.length; i++) {
                items.push(
                    <MenuItem
                        key={SMARTTYPES[i]}
                        value={SMARTTYPES[i]}
                    >
                        <em>{I18n.t(SMARTTYPES[i])}</em>
                    </MenuItem>,
                );
            }
            return (
                <FormControl variant="standard">
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
        return '';
    }

    renderSelectType(dev, lineNum, id, type) {
        return AlexaSmartNames.renderSelectTypeSelector(type, value => this.onParamsChange(id, undefined, value));
    }

    renderChannels(dev, lineNum) {
        const result = [];
        if (dev.additionalApplianceDetails.group) {
            const channels = dev.additionalApplianceDetails.channels;
            const names = dev.additionalApplianceDetails.names;
            const types = dev.additionalApplianceDetails.byONs;
            const smarttypes = dev.additionalApplianceDetails.smartTypes;

            let c = 0;
            channels &&
                Object.keys(channels).forEach(chan => {
                    for (let i = 0; i < channels[chan].length; i++) {
                        const id = channels[chan][i].id;
                        let background = this.state.changed.includes(id)
                            ? CHANGED_COLOR
                            : this.props.themeType === 'dark'
                              ? DEFAULT_CHANNEL_COLOR_DARK
                              : DEFAULT_CHANNEL_COLOR_LIGHT;
                        if (
                            this.state.lastChanged === id &&
                            (background === DEFAULT_CHANNEL_COLOR_DARK || background === DEFAULT_CHANNEL_COLOR_LIGHT)
                        ) {
                            background =
                                this.props.themeType === 'dark' ? LAST_CHANGED_COLOR_DARK : LAST_CHANGED_COLOR_LIGHT;
                        }
                        result.push(
                            <div
                                key={`sub${id}`}
                                style={{ ...styles.devSubLine, ...(c % 2 ? undefined : { background }) }}
                            >
                                <div style={{ ...styles.devLineActions, ...styles.channelLineActions }}>
                                    {AlexaSmartNames.renderActions(channels[chan][i])}
                                </div>
                                <div
                                    style={styles.devSubLineName}
                                    title={id}
                                >
                                    {names[id] || id}
                                    {id !== names[id] ? <span style={styles.devSubSubLineName}>{id}</span> : null}
                                </div>
                                {this.renderSelectType(dev, lineNum, id, smarttypes[id])}
                                {this.renderSelectByOn(dev, lineNum, id, types[id])}
                                <IconButton
                                    aria-label="Delete"
                                    style={styles.devSubLineDelete}
                                    onClick={() => this.onAskDelete(id, lineNum)}
                                >
                                    <IconDelete fontSize="middle" />
                                </IconButton>
                            </div>,
                        );
                        c++;
                    }
                });
        } else {
            const id = dev.additionalApplianceDetails.id;
            const name = dev.additionalApplianceDetails.name || id;
            let background = this.state.changed.includes(id)
                ? CHANGED_COLOR
                : this.props.themeType === 'dark'
                  ? DEFAULT_CHANNEL_COLOR_DARK
                  : DEFAULT_CHANNEL_COLOR_LIGHT;
            if (
                this.state.lastChanged === id &&
                (background === DEFAULT_CHANNEL_COLOR_DARK || background === DEFAULT_CHANNEL_COLOR_LIGHT)
            ) {
                background = this.props.themeType === 'dark' ? LAST_CHANGED_COLOR_DARK : LAST_CHANGED_COLOR_LIGHT;
            }
            result.push(
                <div
                    key={`sub${id}`}
                    style={{ ...styles.devSubLine, background }}
                >
                    <div style={{ ...styles.devLineActions, ...styles.channelLineActions, width: 80 }}>
                        {AlexaSmartNames.renderActions(dev)}
                    </div>
                    <div
                        style={styles.devSubLineName}
                        title={id || ''}
                    >
                        {name}
                    </div>
                    {this.renderSelectType(dev, lineNum, id, dev.additionalApplianceDetails.smartType)}
                    {this.renderSelectByOn(dev, lineNum, id, dev.additionalApplianceDetails.byON)}
                </div>,
            );
        }
        return result;
    }

    renderDevice(dev, lineNum) {
        const friendlyName = dev.friendlyName;
        let title;
        if (!dev.additionalApplianceDetails.group && dev.additionalApplianceDetails.nameModified) {
            title = friendlyName;
        } else {
            title = (
                <span
                    style={styles.devModified}
                    title={I18n.t('modified')}
                >
                    {friendlyName}
                </span>
            );
        }

        let devCount = 0;
        if (dev.additionalApplianceDetails.channels) {
            Object.keys(dev.additionalApplianceDetails.channels).forEach(
                ch => (devCount += dev.additionalApplianceDetails.channels[ch].length),
            );
        }

        devCount = devCount || 1;
        const expanded = this.state.expanded.includes(friendlyName);
        const id = dev.additionalApplianceDetails?.id;

        let background = lineNum % 2 ? (this.props.themeType === 'dark' ? '#272727' : '#f1f1f1') : 'inherit';
        const changed = this.state.changed.includes(id);
        if (changed) {
            background = CHANGED_COLOR;
        } else if (id === this.state.lastChanged) {
            background = this.props.themeType === 'dark' ? LAST_CHANGED_COLOR_DARK : LAST_CHANGED_COLOR_LIGHT;
        }

        // If some of the sub-channels in change list or in last changed
        if (dev.additionalApplianceDetails.group && !changed && id !== this.state.lastChanged) {
            const channels = dev.additionalApplianceDetails.channels;
            try {
                channels &&
                    Object.keys(channels).forEach(
                        chan =>
                            chan &&
                            channels[chan].forEach(el => {
                                if (this.state.changed.includes(el.id)) {
                                    background = CHANGED_COLOR;
                                } else if (this.state.lastChanged === el.id) {
                                    background =
                                        this.props.themeType === 'dark'
                                            ? LAST_CHANGED_COLOR_DARK
                                            : LAST_CHANGED_COLOR_LIGHT;
                                }
                            }),
                    );
            } catch (error) {
                console.log(error);
            }
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
                    {devCount > 1 ? (
                        <Badge
                            badgeContent={devCount}
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
                <div style={{ ...styles.devLineNameBlock, display: 'inline-block', position: 'relative' }}>
                    <span style={styles.devLineName}>{title}</span>
                    <span style={styles.devLineDescription}>{dev.friendlyDescription}</span>
                    {changed ? (
                        <CircularProgress
                            style={styles.devLineProgress}
                            size={20}
                        />
                    ) : null}
                </div>
                <span style={styles.devLineActions}>{AlexaSmartNames.renderActions(dev)}</span>
                {!dev.additionalApplianceDetails.group ? (
                    <IconButton
                        aria-label="Edit"
                        style={styles.devLineEdit}
                        onClick={() => this.onEdit(id)}
                    >
                        <IconEdit fontSize="middle" />
                    </IconButton>
                ) : null}
                {!dev.additionalApplianceDetails.group ? (
                    <IconButton
                        aria-label="Delete"
                        style={styles.devLineDelete}
                        onClick={() => this.onAskDelete(id)}
                    >
                        <IconDelete fontSize="middle" />
                    </IconButton>
                ) : null}
            </div>,
            expanded ? this.renderChannels(dev, lineNum) : null,
        ];
    }

    renderMessage() {
        if (this.state.message) {
            return (
                <DialogMessage
                    text={this.state.message}
                    onClose={() => this.setState({ message: '' })}
                />
            );
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
            }, 30000);

            this.props.socket
                .getObject(id)
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
                .then(() => {
                    // update obj
                    this.informInstance(id);
                })
                .catch(err => this.props.onError(err));
        });
    }

    renderEditDialog() {
        if (this.state.editId) {
            return (
                <Dialog
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
                    <DialogTitle id="message-dialog-title">
                        {this.props.title || I18n.t('Smart name for %s', this.state.editObjectName)}
                    </DialogTitle>
                    <DialogContent>
                        <p>
                            <span>ID:</span> <span style={styles.editedId}>{this.state.editId}</span>
                        </p>
                        <TextField
                            variant="standard"
                            style={{ width: '100%' }}
                            label={I18n.t('Smart name')}
                            autoFocus
                            onKeyDown={e => e.keyCode === 13 && this.changeSmartName(e)}
                            onChange={e => (this.editedSmartName = e.target.value)}
                            defaultValue={this.state.editedSmartName}
                            helperText={I18n.t('You can enter several names divided by comma')}
                            margin="normal"
                        />
                        {this.state.editedSmartType !== null
                            ? this.renderSelectTypeSelector(this.state.editedSmartType, value =>
                                  this.setState({ editedSmartType: value }),
                              )
                            : null}
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
                </Dialog>
            );
        }
        return null;
    }

    renderConfirmDialog() {
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

    getSelectIdDialog() {
        if (this.state.showSelectId) {
            return (
                <DialogSelectID
                    theme={this.props.theme}
                    key="dialogSelectID1"
                    imagePrefix="../.."
                    socket={this.props.socket}
                    selected=""
                    types={['state']}
                    onClose={() => this.setState({ showSelectId: false })}
                    onOk={(selected /* , name */) => {
                        this.setState({ showSelectId: false });

                        this.props.socket.getObject(selected).then(obj => {
                            if (obj) {
                                const name = Utils.getObjectNameFromObj(obj, null, { language: I18n.getLanguage() });
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

    renderDevices() {
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

    renderListOfDevices() {
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

    render() {
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
                    style={styles.button}
                    onClick={() => this.setState({ showSelectId: true })}
                >
                    <IconAdd />
                </Fab>
                <Fab
                    size="small"
                    color="primary"
                    aria-label="Refresh"
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
                    disabled={this.state.browse}
                >
                    <IconList />
                </Fab>
                <TextField
                    variant="standard"
                    placeholder={I18n.t('Filter')}
                    className={this.state.filter}
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

AlexaSmartNames.propTypes = {
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

export default AlexaSmartNames;
