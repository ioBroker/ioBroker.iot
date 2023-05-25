import React, { Component } from 'react';
import { withStyles } from '@mui/styles';
import PropTypes from 'prop-types';

import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Fab from '@mui/material/Fab';
import CircularProgress from '@mui/material/CircularProgress';
import Badge from '@mui/material/Badge';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormHelperText from '@mui/material/FormHelperText';
import FormControl from '@mui/material/FormControl';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Dialog from '@mui/material/Dialog';

import {
    MdEdit as IconEdit, MdAdd as IconAdd, MdRefresh as IconRefresh, MdClear as IconClear, MdDelete as IconDelete, MdFormatAlignJustify as IconExpand, MdDragHandle as IconCollapse, MdList as IconList,
} from 'react-icons/md';

import {
    FaPowerOff as IconOn, FaThermometerHalf as IconTemperature, FaLongArrowAltUp as IconUp, FaLongArrowAltDown as IconDown, FaPercentage as IconPercentage, FaPalette as IconColor, FaLightbulb as IconBulb, FaLockOpen as IconLock, FaThermometer as IconThermometer,
} from 'react-icons/fa';

import IconCopy from '@mui/icons-material/FileCopy';
import IconClose from '@mui/icons-material/Close';
import IconCheck from '@mui/icons-material/Check';

import {
    Utils, I18n, Message as MessageDialog, SelectID as DialogSelectID,
} from '@iobroker/adapter-react-v5';

const colorOn = '#aba613';
const colorOff = '#444';
const colorSet = '#00c6ff';
const colorRead = '#00bc00';

const CHANGED_COLOR = '#e7000040';
const DEFAULT_CHANNEL_COLOR_DARK = '#4f4f4f';
const DEFAULT_CHANNEL_COLOR_LIGHT = '#e9e9e9';
const LAST_CHANGED_COLOR_DARK = '#5c8f65';
const LAST_CHANGED_COLOR_LIGHT = '#b4ffbe';

const DEFAULT_STATE_COLOR_DARK = '#6e6e6e';
const DEFAULT_STATE_COLOR_LIGHT = '#d0d0d0';

const actionsMapping = {
    turnOn: {
        color: colorOn, icon: IconOn, desc: 'Turn on', v2: true,
    },
    turnOff: {
        color: colorOff, icon: IconOn, desc: 'Turn off', v2: true,
    },

    setTargetTemperature: {
        color: colorSet, icon: IconTemperature, desc: 'Set target temperature', v2: true,
    },
    incrementTargetTemperature: {
        color: colorOn, icon: IconUp, desc: 'Increment target temperature', v2: true,
    },
    decrementTargetTemperature: {
        color: colorOff, icon: IconDown, desc: 'Decrement target temperature', v2: true,
    },

    setPercentage: {
        color: colorSet, icon: IconPercentage, desc: 'Set percentage', v2: true,
    },
    incrementPercentage: {
        color: colorOn, icon: IconUp, desc: 'Increment percentage', v2: true,
    },
    decrementPercentage: {
        color: colorOff, icon: IconDown, desc: 'Decrement percentage', v2: true,
    },

    setColor: {
        color: colorSet, icon: IconColor, desc: 'Set color', v2: true,
    },

    setColorTemperature: {
        color: colorSet, icon: IconBulb, desc: 'Set color temperature', v2: true,
    },
    incrementColorTemperature: {
        color: colorOn, icon: IconUp, desc: 'Increment color temperature', v2: true,
    },
    decrementColorTemperature: {
        color: colorOff, icon: IconDown, desc: 'Decrement color temperature', v2: true,
    },

    getTargetTemperature: {
        color: colorRead, icon: IconThermometer, desc: 'Get target temperature', v2: true,
    },
    getTemperatureReading: {
        color: colorRead, icon: IconThermometer, desc: 'Get actual temperature', v2: true,
    },

    setLockState: {
        color: colorSet, icon: IconLock, desc: 'Set lock state', v2: true,
    },
    getLockState: {
        color: colorRead, icon: IconLock, desc: 'Read lock state', v2: true,
    },
};

const SMART_TYPES = [
    'socket',
    'light',
    'dimmer',
    'thermostat',
    'blind',
    'gate',
    'lock',
    'hue',
    'motion',
    'slider',
    'temperature',
    'window',
];

const styles = theme => ({
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
        width: 40,
    },
    devLineEnabled: {
        position: 'absolute',
        right: 0,
        top: 0,
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
        /*display: 'inline-block',
        verticalAlign: 'middle',*/
        width: 15,
    },
    editedId: {
        fontStyle: 'italic',
    },
    enumLineSubName:{
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
        flexGrow: 1,
    },
    columnHeader: {
        background: theme.palette.primary.light,
        padding: 10,
        color: theme.palette.primary.contrastText,
    },
    devModified: {
        fontStyle: 'italic',
    },
    actionIcon: {
        width: 16,
    },
    devSubLine: {
        position: 'relative',
        height: 32,
    },
    devSubLineName: {
        marginLeft: 5,
        marginTop: 6,
        display: 'inline-block',
        fontSize: 13,
        width: 'calc(100% - 400px)',
    },
    devSubSubLineName:  {
        fontSize: 10,
        fontStyle: 'italic',
        display: 'block',
        paddingLeft: 70,
        paddingTop: 4,
    },
    devSubSubLineStateName: {

    },
    devSubSubLineStateId: {
        marginLeft: 5,
    },
    devSubLineByOn: {
        marginLeft: 5,
    },
    devSubLineDelete: {
        position: 'absolute',
        top: 6,
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
    devSubSubLine: {
        position: 'relative',
        height: 20,
    },
    headerRow: {
        paddingLeft: theme.spacing(1),
        background: theme.palette.primary.main,
    },
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
        width: 100,
    },
});

class Alexa3SmartNames extends Component {
    constructor(props) {
        super(props);

        if (!actionsMapping.translated) {
            Object.keys(actionsMapping).forEach(a => actionsMapping[a].desc = I18n.t(actionsMapping[a].desc));
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

        this.props.socket.getObject(`system.adapter.${this.props.adapterName}.${this.props.instance}`)
            .then(obj =>
                this.props.socket.getState(`system.adapter.${this.props.adapterName}.${this.props.instance}.alive`)
                    .then(state => {
                        if (!obj || !obj.common || (!obj.common.enabled && (!state || !state.val))) {
                            this.setState({ message: I18n.t('Instance must be enabled'), loading: false, devices: [] });
                        } else {
                            this.browse();
                        }
                    }));
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
            .catch(e => this.setState({ message: I18n.t('Error %s', e) }));
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
        this.props.socket.subscribeState(`${this.props.adapterName}.${this.props.instance}.smart.updates3`, this.onReadyUpdate);
        this.props.socket.subscribeState(`${this.props.adapterName}.${this.props.instance}.smart.updatesResult`, this.onResultUpdate);
    }

    componentWillUnmount() {
        this.props.socket.unsubscribeState(`${this.props.adapterName}.${this.props.instance}.smart.updates3`, this.onReadyUpdate);
        this.props.socket.unsubscribeState(`${this.props.adapterName}.${this.props.instance}.smart.updatesResult`, this.onResultUpdate);
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
        const device = devices.find(dev => dev.additionalApplianceDetails.id === id);
        if (device) {
            this.props.socket.getObject(id)
                .then(obj => {
                    let smartName = device.additionalApplianceDetails.friendlyNames ? device.additionalApplianceDetails.friendlyNames : device.friendlyName;
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

    renderActions(dev) {
        // Type
        const actions = [];
        if (!dev.controls) {
            console.log('Something went wrong');
            return null;
        }

        Object.keys(actionsMapping).forEach(action => {
            if (dev.controls.find(item => item.supported.includes(action))) {
                const Icon = actionsMapping[action].icon;
                actions.push(<span key={action} title={actionsMapping[action].desc}><Icon className={this.props.classes.actionIcon} style={{ color: actionsMapping[action].color }} /></span>);
            } else if (dev.controls.find(item => item.enforced.includes(action))) {
                const Icon = actionsMapping[action].icon;
                actions.push(<span key={action} title={actionsMapping[action].desc}><Icon className={this.props.classes.actionIcon} style={{ color: actionsMapping[action].color }} /></span>);
            }
        });
        // add unknown actions
        dev.controls.forEach(control => {
            control.supported.forEach(action => {
                if (!actionsMapping[action]) {
                    actions.push(<span key={action} title={action}>{action}</span>);
                }
            });
            control.enforced.forEach(action => {
                if (!actionsMapping[action]) {
                    actions.push(<span key={action} title={action}>{action}</span>);
                }
            });
        });

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

    renderSelectByOn(dev) {
        if (dev.autoDetected) {
            return null;
        }
        const state = Object.values(dev.controls[0].states)[0];
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
        return <FormControl className={this.props.classes.devSubLineByOn} variant="standard">
            <Select
                variant="standard"
                className={this.props.classes.devSubLineByOnSelect}
                value={(byON || '').toString()}
                onChange={e => this.onParamsChange(state.id, e.target.value)}
            >
                {items}
            </Select>
            <FormHelperText className={this.props.classes.devSubLineTypeTitle}>{I18n.t('by ON')}</FormHelperText>
        </FormControl>;
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

    renderSelectTypeSelector(type, onChange) {
        if (type !== false) {
            const items = [<MenuItem key="_" value="_"><em>{I18n.t('no type')}</em></MenuItem>];
            for (let i = 0; i < SMART_TYPES.length; i++) {
                items.push(<MenuItem key={SMART_TYPES[i]} value={SMART_TYPES[i]}><em>{I18n.t(SMART_TYPES[i])}</em></MenuItem>);
            }
            return <FormControl variant="standard" className={this.props.classes.selectType}>
                <Select variant="standard" value={type || '_'} onChange={e => onChange(e.target.value === '_' ? '' : e.target.value)}>{items}</Select>
                <FormHelperText className={this.props.classes.devSubLineTypeTitle}>{I18n.t('Types')}</FormHelperText>
            </FormControl>;
        }

        return null;
    }

    renderSelectType(dev) {
        if (dev.autoDetected) {
            return <div className={this.props.classes.selectType} />;
        }
        // get first id
        const state = Object.values(dev.controls[0].states)[0];
        const type = state.smartName?.smartType;

        return this.renderSelectTypeSelector(type, value => this.onParamsChange(state.id, undefined, value));
    }

    renderStates(control, classes) {
        return Object.keys(control.states).map((name, c) =>
            <div
                key={name}
                className={classes.devSubSubLine}
                style={(c % 2) ?
                    { background: this.props.themeType === 'dark' ? `${DEFAULT_STATE_COLOR_DARK}80` : `${DEFAULT_STATE_COLOR_LIGHT}80` }
                    :
                    { background: this.props.themeType === 'dark' ? DEFAULT_STATE_COLOR_DARK : DEFAULT_STATE_COLOR_LIGHT }}
            >
                <div className={classes.devSubSubLineName}>
                    <span className={classes.devSubSubLineStateName}>{name}</span>
                    :
                    <span className={classes.devSubSubLineStateId}>{control.states[name].id}</span>
                </div>
            </div>);
    }

    renderChannels(dev, lineNum) {
        const classes = this.props.classes;

        return dev.controls.map((control, c) => {
            const id = Object.values(control.states)[0].id;

            let background = this.state.changed.includes(id) ? CHANGED_COLOR : this.props.themeType === 'dark' ? DEFAULT_CHANNEL_COLOR_DARK : DEFAULT_CHANNEL_COLOR_LIGHT;
            if (this.state.lastChanged === id && (background === DEFAULT_CHANNEL_COLOR_DARK || background === DEFAULT_CHANNEL_COLOR_LIGHT)) {
                background = this.props.themeType === 'dark' ? LAST_CHANGED_COLOR_DARK : LAST_CHANGED_COLOR_LIGHT;
            }

            return [
                <div key={c} className={classes.devSubLine} style={(c % 2) ? {} : { background }}>
                    <div className={Utils.clsx(this.props.classes.devLineActions, this.props.classes.channelLineActions)}>{this.renderActions({ controls: [control] })}</div>
                    <div className={classes.devSubLineName}>{control.type}</div>
                    {dev.autoDetected && dev.controls.length > 1 ? <IconButton aria-label="Delete" className={this.props.classes.devSubLineDelete} onClick={() => this.onAskDelete(id, lineNum)}>
                        <IconDelete fontSize="middle" />
                    </IconButton> : null}
                </div>,
                this.renderStates(control, classes),
            ];
        });
    }

    renderDevice(dev, lineNum) {
        const friendlyName = dev.friendlyName;
        // if (!dev.additionalApplianceDetails.group && dev.additionalApplianceDetails.nameModified) {
        const title = friendlyName;
        // } else {
        //    title = <span className={this.props.classes.devModified} title={I18n.t('modified')}>{friendlyName}</span>;
        // }

        const expanded = this.state.expanded.includes(friendlyName);
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
            <div key={`line${lineNum}`} className={this.props.classes.devLine} style={{ background }}>
                <div className={this.props.classes.devLineNumber}>
                    {lineNum + 1}
.
                </div>
                <IconButton className={this.props.classes.devLineExpand} onClick={() => this.onExpand(lineNum)}>
                    {dev.controls.length > 1 ?
                        <Badge badgeContent={dev.controls.length} color="primary">
                            {expanded ? <IconCollapse /> : <IconExpand />}
                        </Badge> :
                        (expanded ? <IconCollapse /> : <IconExpand />)}
                </IconButton>
                <div className={this.props.classes.devLineNameBlock}>
                    <span className={this.props.classes.devLineName}>{title}</span>
                    <span className={this.props.classes.devLineDescription}>{dev.type}</span>
                    {changed ? <CircularProgress className={this.props.classes.devLineProgress} size={20} /> : null}
                </div>
                <span className={this.props.classes.devLineActions}>{this.renderActions(dev)}</span>
                {this.renderSelectType(dev)}
                {this.renderSelectByOn(dev)}
                {!dev.autoDetected ?
                    <IconButton aria-label="Edit" className={this.props.classes.devLineEdit} onClick={() => this.onEdit(id)}>
                        <IconEdit fontSize="middle" />
                    </IconButton> : <div className={this.props.classes.devLineEdit} />}
                {!dev.autoDetected ?
                    <IconButton aria-label="Delete" className={this.props.classes.devLineDelete} onClick={() => this.onAskDelete(id)}>
                        <IconDelete fontSize="middle" />
                    </IconButton> : <div className={this.props.classes.devLineDelete} />}
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
            }, 30000);

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
                        <span className={this.props.classes.editedId}>{this.state.editId}</span>
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
                socket={this.props.socket}
                selected=""
                types={['state']}
                onClose={() => this.setState({ showSelectId: false })}
                onOk={(selected/* , name */) => {
                    this.setState({ showSelectId: false });

                    this.props.socket.getObject(selected)
                        .then(obj => {
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

        return <div key="listDevices" className={this.props.classes.columnDiv}>{result}</div>;
    }

    renderListOfDevices() {
        if (!this.state.showListOfDevices) {
            return null;
        }
        const classes = this.props.classes;

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
                <div className={classes.headerRow}>
                    <div className={classes.headerCell}>{I18n.t('Name')}</div>
                </div>
                <div className={this.props.classes.tableDiv}>
                    {this.state.devices.map((item, i) => <div key={i}>
                        <div className={classes.tableCell}>{item.friendlyName}</div>
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

        return <form key="alexa" className={this.props.classes.tab}>
            <Fab
                size="small"
                color="secondary"
                aria-label="Add"
                className={this.props.classes.button}
                onClick={() => this.setState({ showSelectId: true })}
            >
                <IconAdd />
            </Fab>
            <Fab
                size="small"
                color="primary"
                aria-label="Refresh"
                className={this.props.classes.button}
                onClick={() => this.browse(true)}
                disabled={this.state.browse}
            >
                {this.state.browse ? <CircularProgress size={20} /> : <IconRefresh />}
            </Fab>
            <Fab
                style={{ marginLeft: '1rem' }}
                title={I18n.t('Show all devices for print out')}
                size="small"
                aria-label="List of devices"
                className={this.props.classes.button}
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
};

export default withStyles(styles)(Alexa3SmartNames);
