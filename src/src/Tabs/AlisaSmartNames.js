import React, {Component} from 'react';
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

import { MdEdit as IconEdit } from 'react-icons/md';
import { MdAdd as IconAdd } from 'react-icons/md';
import { MdRefresh as IconRefresh } from 'react-icons/md';
import { MdClear as IconClear } from 'react-icons/md';
import { MdDelete as IconDelete } from 'react-icons/md';
import { MdFormatAlignJustify as IconExpand } from 'react-icons/md';
import { MdDragHandle as IconCollapse } from 'react-icons/md';
import { MdList as IconList } from 'react-icons/md';
import { FaPowerOff as IconOn } from 'react-icons/fa';
import { FaThermometerHalf as IconTemperature } from 'react-icons/fa';
import { FaLongArrowAltUp as IconUp } from 'react-icons/fa';
import { FaLongArrowAltDown as IconDown } from 'react-icons/fa';
import { FaPalette as IconColor } from 'react-icons/fa';
import { FaLightbulb as IconBulb } from 'react-icons/fa';
import { FaLockOpen as IconLock } from 'react-icons/fa';
import { FaThermometer as IconThermometer } from 'react-icons/fa';
import { FaTint as IconHumidity } from 'react-icons/fa';
import { FaMale as IconMotion } from 'react-icons/fa';
import { FaLink as IconContact } from 'react-icons/fa';
import IconCopy from '@mui/icons-material/FileCopy';
import IconClose from '@mui/icons-material/Close';

import Utils from '@iobroker/adapter-react-v5/Components/Utils'
import I18n from '@iobroker/adapter-react-v5/i18n';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Dialog from '@mui/material/Dialog';
import MessageDialog from '@iobroker/adapter-react-v5/Dialogs/Message';
import DialogSelectID from '@iobroker/adapter-react-v5/Dialogs/SelectID';
import copy from "copy-to-clipboard";
import IconCheck from "@mui/icons-material/Check";

const colorOn = '#aba613';
const colorOff = '#444';
const colorSet = '#00c6ff';
const colorRGB = '#ff7ee3';
const colorRead = '#00bc00';
//const colorThermometer = '#bc1600';
const CHANGED_COLOR = '#e7000040';
const DEFAULT_CHANNEL_COLOR_DARK = '#4f4f4f';
const DEFAULT_CHANNEL_COLOR_LIGHT = '#e9e9e9';
const LAST_CHANGED_COLOR_DARK = '#5c8f65';
const LAST_CHANGED_COLOR_LIGHT = '#b4ffbe';

const actionsMapping = {
    OnOff: {color: colorOn, icon: IconOn, desc: 'On/Off'},
    Brightness: {color: colorSet, icon: IconBulb, desc: 'Dimmer'},
    RGB: {color: colorRGB, icon: IconBulb, desc: 'Set color'},

    setTargetTemperature: {color: colorSet, icon: IconTemperature, desc: 'Set target temperature'},
    incrementTargetTemperature: {color: colorOn, icon: IconUp, desc: 'Increment target temperature'},
    decrementTargetTemperature: {color: colorOff, icon: IconDown, desc: 'Decrement target temperature'},

    incrementPercentage: {color: colorOn, icon: IconUp, desc: 'Increment percentage'},
    decrementPercentage: {color: colorOff, icon: IconDown, desc: 'Decrement percentage'},

    setColor: {color: colorSet, icon: IconColor, desc: 'Set color'},

    incrementColorTemperature: {color: colorOn, icon: IconUp, desc: 'Increment color temperature'},
    decrementColorTemperature: {color: colorOff, icon: IconDown, desc: 'Decrement color temperature'},

    getTargetTemperature: {color: colorRead, icon: IconThermometer, desc: 'Get target temperature'},
    getTemperatureReading: {color: colorRead, icon: IconThermometer, desc: 'Get actual temperature'},

    setLockState: {color: colorSet, icon: IconLock, desc: 'Set lock state'},
    getLockState: {color: colorRead, icon: IconLock, desc: 'Read lock state'},

    getActualTemperature: {color: colorRead, icon: IconThermometer, desc: 'Get actual temperature'},
    getActualHumidity: {color: colorRead, icon: IconHumidity, desc: 'Get actual humidity'},

    getMotion: {color: colorRead, icon: IconMotion, desc: 'Get motion'},
    getContact: {color: colorRead, icon: IconContact, desc: 'Get contact'},

};

const SMARTTYPES = ['LIGHT', 'SWITCH', 'THERMOSTAT', 'ACTIVITY_TRIGGER', 'SCENE_TRIGGER', 'SMARTPLUG', 'SMARTLOCK', 'CAMERA', 'THERMOSTAT.AC', 'VACUUM_CLEANER'];

const styles = theme => ({
    tab: {
        width: '100%',
        height: '100%'
    },
    column: {
        display: 'inline-block',
        verticalAlign: 'top',
        marginRight: 20,
        height: '100%',
        overflow: 'hidden'
    },
    columnDiv: {
        height: 'calc(100% - 40px)',
        overflow: 'auto',
        minWidth: 300
    },
    filter: {
        margin: 0
    },
    button: {
        marginRight: 20
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
        right: 50
    },
    devLineDelete: {
        position: 'absolute',
        top: 5,
        right: 0
    },
    devLineName: {

    },
    devLineNumber:{
        display: 'inline-block',
        verticalAlign: 'middle',
        width: 15,
    },
    editedId: {
        fontStyle: 'italic'
    },
    enumLineSubName:{
        fontStyle: 'italic',
    },
    devLine: {
        height: 48,
        width: '100%',
        position: 'relative'
    },
    devLineDescription: {
        display: 'block',
        fontStyle: 'italic',
        fontSize: 12
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
        width: 80
    },
    devLineNameBlock: {
        display: 'inline-block',
        width: 'calc(100% - 350px)'
    },
    columnHeader: {
        background: theme.palette.primary.light,
        padding: 10,
        color: theme.palette.primary.contrastText
    },
    devModified: {
        fontStyle: 'italic'
    },
    actionIcon: {
        width: 16
    },

    devSubLine: {
        position: 'relative',
        height: 48
    },
    devSubLineName: {
        marginLeft: 5,
        marginTop: 14,
        minWidth: 100,
        display: 'inline-block',
        fontSize: 13,
        paddingLeft: 70,
        //width: 'calc(100% - 400px)'
    },
    devSubSubLine:  {
        fontSize: 10,
        fontStyle: 'italic',
        display: 'inline-block',
        marginLeft: 15
    },
    devSubLineSetId:  {
        fontStyle: 'italic',
        display: 'block',
        color: '#999'
    },
    devSubLineByOn: {
        marginLeft: 5
    },
    devSubLineDelete: {
        position: 'absolute',
        top: 12,
        right: 12,
        padding: 0
    },
    devSubLineEdit: {
        position: 'absolute',
        top: 12,
        right: 62,
        padding: 0
    },
    devSubLineTypeTitle: {
        marginTop: 0
    },
    headerRow: {
        paddingLeft: theme.spacing(1),
        background: theme.palette.primary.main,
    },
    headerCell: {
        display: 'inline-block',
        verticalAlign: 'top',
        width: '100%'
    },
    tableCell: {
        display: 'inline-block',
        verticalAlign: 'top',
        width: '100%'
    },
});

class AlisaDevices extends Component {
    constructor(props) {
        super(props);

        if (!actionsMapping.translated) {
            Object.keys(actionsMapping).forEach(a => actionsMapping[a].desc = I18n.t(actionsMapping[a].desc));
            actionsMapping.translated = true;
        }

        this.state = {
            editedSmartName: '',
            editId: '',
            editObjectName: '',
            deleteId: '',

            showSelectId: false,
            showConfirmation: '',
            changed: [],
            devices: [],
            message: '',
            filter: '',
            loading: true,
            browse: false,
            expanded: [],
            lastChanged: ''
        };

        this.timerChanged = null;
        this.browseTimer = null;
        this.browseTimerCount = 0;
        this.editedSmartName = '';

        this.waitForUpdateID = null;
        this.onReadyUpdateBound = this.onReadyUpdate.bind(this);
        this.onResultUpdateBound = this.onResultUpdate.bind(this);

        this.props.socket.getObject(`system.adapter.${this.props.adapterName}.${this.props.instance}`).then(obj => {
            this.props.socket.getState(`system.adapter.${this.props.adapterName}.${this.props.instance}.alive`).then(state => {
                if (!obj || !obj.common || (!obj.common.enabled && (!state || !state.val))) {
                    this.setState({message: I18n.t('Instance must be enabled'), loading: false, devices: []});
                } else {
                    this.browse();
                }
            });
        });
    }

    browse(isIndicate) {
        if (Date.now() - this.lastBrowse < 500) {
            return;
        }

        this.lastBrowse = Date.now();

        if (isIndicate) {
            this.setState({loading: true, browse: true});
        } else {
            this.setState({browse: true});
        }

        this.browseTimer = setTimeout(() => {
            this.browseTimer = null;
            this.browseTimerCount++;
            if (this.browseTimerCount < 5) {
                this.browse(isIndicate);
            } else {
                this.setState({message: I18n.t('Cannot read devices!')});
            }
        }, 10000);

        this.props.socket.sendTo(this.props.adapterName + '.' + this.props.instance, 'browseAlisa', null)
            .then(list => {
                this.browseTimer && clearTimeout(this.browseTimer);
                this.browseTimerCount = 0;
                this.browseTimer = null;

                if (list && list.error) {
                    this.setState({message: I18n.t(list.error)});
                } else {
                    if (this.waitForUpdateID) {
                        if (!this.onEdit(this.waitForUpdateID, list)) {
                            this.setState({message: I18n.t('Device %s was not added', this.waitForUpdateID)});
                        }
                        this.waitForUpdateID = null;
                    }

                    this.setState({devices: list, loading: false, changed: [], browse: false});
                }
            });
    }

    onReadyUpdate(id, state) {
        if (state && state.ack === true && state.val === true) {
            if (this.devTimer) clearTimeout(this.devTimer);
            this.devTimer = setTimeout(() => {
                this.devTimer = null;
                this.browse();
            }, 300);
        }
    }

    onResultUpdate(id, state) {
        state && state.ack === true && state.val && this.setState({message: state.val});
    }

    componentDidMount() {
        this.props.socket.subscribeState(`${this.props.adapterName}.${this.props.instance}.smart.updates`, this.onReadyUpdateBound);
        this.props.socket.subscribeState(`${this.props.adapterName}.${this.props.instance}.smart.updatesResult`, this.onResultUpdateBound);
    }

    componentWillUnmount() {
        this.props.socket.unsubscribeState(`${this.props.adapterName}.${this.props.instance}.smart.updates`, this.onReadyUpdateBound);
        this.props.socket.unsubscribeState(`${this.props.adapterName}.${this.props.instance}.smart.updatesResult`, this.onResultUpdateBound);
        if (this.timerChanged) {
            clearTimeout(this.timerChanged);
            this.timerChanged = null;
        }
    }

    informInstance(id) {
        this.props.socket.sendTo(this.props.adapterName + '.' + this.props.instance, 'update', id);
    }

    addChanged(id, cb) {
        const changed = JSON.parse(JSON.stringify(this.state.changed));
        if (!changed.includes(id)) {
            changed.push(id);
            this.setState({changed}, () => cb && cb());
        } else {
            cb && cb();
        }
    }

    removeChanged(id) {
        const changed = JSON.parse(JSON.stringify(this.state.changed));
        const pos = changed.indexOf(id);

        if (pos !== -1) {
            changed.splice(pos, 1);
            this.setState({changed});
        }
    }

    onEdit(id, devices) {
        devices = devices || this.state.devices;
        const device = devices.find(dev => dev.iobID === id);
        if (device) {
            this.props.socket.getObject(id)
                .then(obj => {
                    let smartName = device.name;
                    if (typeof smartName === 'object' && smartName) {
                        smartName = smartName[I18n.getLanguage()] || smartName.en;
                    }
                    this.editedSmartName = smartName;
                    this.setState({editId: id, editedSmartName: smartName, editObjectName: smartName/* Utils.getObjectNameFromObj(obj, null, {language: I18n.getLanguage()})*/});
                });
            return true;
        } else {
            return false;
        }
    }

    onAskDelete(deleteId) {
        this.setState({deleteId, showConfirmation: true});
    }

    onDelete() {
        let id = this.state.deleteId;
        // const device = this.state.devices.find(dev => dev.additionalApplianceDetails.id === id);
        this.addChanged(id, () => {
            this.props.socket.getObject(id)
                .then(obj => {
                    Utils.disableSmartName(obj, this.props.adapterName + '.' + this.props.instance, this.props.native.noCommon);
                    return this.props.socket.setObject(id, obj);
                })
                .then(() => {
                    this.setState({deleteId: '', showConfirmation: false, lastChanged: id});

                    this.timerChanged && clearTimeout(this.timerChanged);
                    this.timerChanged = setTimeout(() => {
                        this.setState({lastChanged: ''});
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
        if (!dev.actions) {
            console.log('Something went wrong');
            return null;
        }

        dev.actions.sort((a, b) => {
            if (a === b) {
                return 0;
            }
            if (a === 'OnOff') {
                return -1;
            }
            if (b === 'OnOff') {
                return 1;
            }
            return 0;
        });

        Object.keys(actionsMapping).forEach(action => {
            if (dev.actions.includes(action)) {
                const Icon = actionsMapping[action].icon;
                actions.push(<span key={action} title={actionsMapping[action].desc}>
                    <Icon className={this.props.classes.actionIcon} style={{color: actionsMapping[action].color}}/>
                </span>);
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
        const pos = expanded.indexOf(this.state.devices[lineNum].name);
        if (pos === -1) {
            expanded.push(this.state.devices[lineNum].name);
        } else {
            expanded.splice(pos, 1);
        }
        this.setState({expanded});
    }

    onParamsChange(id, byON, type) {
        this.addChanged(id, () => {
            this.props.socket.getObject(id)
                .then(obj => {
                    Utils.updateSmartName(obj, undefined, byON, type, this.props.adapterName + '.' + this.props.instance, this.props.native.noCommon);

                    if (this.state.lastChanged !== id) {
                        this.setState({lastChanged: id});
                        this.timerChanged && clearTimeout(this.timerChanged);
                        this.timerChanged = setTimeout(() => {
                            this.setState({lastChanged: ''});
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

    renderSelectType(dev, lineNum, id, type) {
        if (type !== false) {
            const items = [<MenuItem key="_" value="_"><em>{I18n.t('no type')}</em></MenuItem>];
            for (let i = 0; i < SMARTTYPES.length; i++) {
                items.push(<MenuItem  key={SMARTTYPES[i]} value={SMARTTYPES[i]}><em>{I18n.t(SMARTTYPES[i])}</em></MenuItem>);
            }
            return <FormControl variant="standard">
                <Select variant="standard" value={type || '_'} onChange={e => this.onParamsChange(id, undefined, e.target.value)}>{items}</Select>
                <FormHelperText className={this.props.classes.devSubLineTypeTitle}>{I18n.t('Types')}</FormHelperText>
            </FormControl>;
        } else {
            return '';
        }
    }

    renderChannels(dev, lineNum) {
        const result = [];
        const classes = this.props.classes;

        const id = dev.main.getId || dev.iobID;
        const name = dev.func;
        let background = this.props.themeType === 'dark' ? DEFAULT_CHANNEL_COLOR_DARK : DEFAULT_CHANNEL_COLOR_LIGHT;/*this.state.changed.indexOf(id) !== -1 ? CHANGED_COLOR : DEFAULT_CHANNEL_COLOR;
        if (this.state.lastChanged === id && background === DEFAULT_CHANNEL_COLOR) {
            background = LAST_CHANGED_COLOR;
        }*/
        result.push(<div key={'sub' + id + '_' + lineNum} className={classes.devSubLine} style={{background}}>
            <div className={classes.devSubLineName}>{name.toUpperCase()}</div>
            <div className={classes.devSubSubLine}>
                <div>{dev.main.getId}</div>
                {dev.main.setId && dev.main.setId !== dev.main.getId ? <div className={classes.devSubLineSetId}>{dev.main.setId}</div> : null}
            </div>
        </div>);

        dev.attributes.forEach(attr => {
            result.push(<div key={'sub' + attr.getId} className={classes.devSubLine} style={{background}}>
                <div className={classes.devSubLineName}>{attr.name.toUpperCase()}</div>
                <div className={classes.devSubSubLine}>
                    <div>{attr.getId}</div>
                    {attr.setId && attr.setId !== attr.getId ? <div className={classes.devSubLineSetId}>{attr.setId}</div> : null}
                </div>
            </div>);
        });

        /*if (dev.additionalApplianceDetails.group) {
            const channels   = dev.additionalApplianceDetails.channels;
            const names      = dev.additionalApplianceDetails.names;
            const types      = dev.additionalApplianceDetails.byONs;
            const smarttypes = dev.additionalApplianceDetails.smartTypes;

            let c = 0;
            for (const chan in channels) {
                if (channels.hasOwnProperty(chan)) {
                    for (let i = 0; i < channels[chan].length; i++) {
                        const id = channels[chan][i].id;
                        let background = this.state.changed.indexOf(id) !== -1 ? CHANGED_COLOR : DEFAULT_CHANNEL_COLOR;
                        if (this.state.lastChanged === id && background === DEFAULT_CHANNEL_COLOR) {
                            background = LAST_CHANGED_COLOR;
                        }
                        result.push(<div key={'sub' + id} className={classes.devSubLine} style={(c % 2) ? {} : {background}}>
                            <div className={clsx(this.props.classes.devLineActions,this.props.classes.channelLineActions)}>{this.renderActions(channels[chan][i])}</div>
                            <div className={classes.devSubLineName} title={id}>{(names[id] || id)}
                                {id !== names[id] ? <span className={classes.devSubSubLineName}>{id}</span> : null}
                            </div>
                            {this.renderSelectType(dev, lineNum, id, smarttypes[id])}
                            {this.renderSelectByOn(dev, lineNum, id, types[id])}
                            <IconButton aria-label="Delete" className={this.props.classes.devSubLineDelete} onClick={() => this.onAskDelete(id, lineNum)}><IconDelete fontSize="middle" /></IconButton>
                        </div>);
                        c++;
                    }
                }
            }
        } else {
        }*/
        return result;
    }

    renderDevice(dev, lineNum) {
        //return <div key={lineNum}>{JSON.stringify(dev)}</div>;
        const expanded = this.state.expanded.includes(dev.name);
        let background = (lineNum % 2) ? (this.props.themeType === 'dark' ? '#272727' : '#f1f1f1') : 'inherit';
        const changed = this.state.changed.includes(dev.iobID);
        if (changed) {
            background = CHANGED_COLOR;
        } else if (dev.iobID === this.state.lastChanged) {
            background = this.props.themeType === 'dark' ? LAST_CHANGED_COLOR_DARK : LAST_CHANGED_COLOR_LIGHT;
        }

        //const isComplex = dev.

        return [
            <div key={'line' + lineNum} className={this.props.classes.devLine} style={{background}}>
                <div className={this.props.classes.devLineNumber}>{lineNum + 1}.</div>
                <IconButton className={this.props.classes.devLineExpand} onClick={() => this.onExpand(lineNum)}>
                    {dev.attributes.length ?
                        <Badge badgeContent={dev.attributes.length} color="primary">{expanded ? <IconCollapse/> : <IconExpand />}</Badge> :
                        (expanded ? <IconCollapse/> : <IconExpand />)}
                </IconButton>
                <div className={this.props.classes.devLineNameBlock} style={{display: 'inline-block', position: 'relative'}}>
                    <span className={this.props.classes.devLineName}>{dev.name}</span>
                    <span className={this.props.classes.devLineDescription}>{dev.description}</span>
                    {changed ? <CircularProgress className={this.props.classes.devLineProgress} size={20}/> : null}
                </div>
                <span className={this.props.classes.devLineActions}>{this.renderActions(dev)}</span>
                <IconButton aria-label="Edit" className={this.props.classes.devLineEdit} onClick={() => this.onEdit(dev.iobID)}><IconEdit fontSize="middle" /></IconButton>
                <IconButton aria-label="Delete" className={this.props.classes.devLineDelete} onClick={() => this.onAskDelete(dev.iobID)}><IconDelete fontSize="middle" /></IconButton>

            </div>,
            expanded ? this.renderChannels(dev, lineNum) : null
        ];
    }

    renderMessage() {
        if (this.state.message) {
            return <MessageDialog text={this.state.message} onClose={() => this.setState({message: ''})}/>;
        } else {
            return null;
        }
    }

    changeSmartName(e) {
        e && e.preventDefault();
        // Check if the name is duplicate
        this.addChanged(this.state.editId, () => {
            const id = this.state.editId;
            this.setState({editId: '', editObjectName: '', lastChanged: id});

            this.timerChanged && clearTimeout(this.timerChanged);
            this.timerChanged = setTimeout(() => {
                this.setState({lastChanged: ''});
                this.timerChanged = null;
            }, 30000);

            this.props.socket.getObject(id)
                .then(obj => {
                    Utils.updateSmartName(obj, this.editedSmartName, undefined, undefined, this.props.adapterName + '.' + this.props.instance, this.props.native.noCommon);
                    return this.props.socket.setObject(id, obj);
                })
                // update obj
                .then(() => this.informInstance(id))
                .catch(err => this.props.onError(err));
        });
    }

    renderEditDialog() {
        if (this.state.editId) {
            return <Dialog
                open={true}
                maxWidth="sm"
                fullWidth={true}
                onClose={() => {
                    this.editedSmartName = null;
                    this.setState({editId: '', editedSmartName: ''});
                }}
                aria-labelledby="message-dialog-title"
                aria-describedby="message-dialog-description"
            >
                <DialogTitle id="message-dialog-title">{this.props.title || I18n.t('Smart name for %s', this.state.editObjectName)}</DialogTitle>
                <DialogContent>
                    <p><span>ID:</span> <span className={this.props.classes.editedId}>{this.state.editId}</span></p>
                    <TextField
                        variant="standard"
                        style={{width: '100%'}}
                        label={I18n.t('Smart name')}
                        autoFocus
                        onKeyDown={e =>
                            e.keyCode === 13 && this.changeSmartName(e)}
                        onChange={e => this.editedSmartName = e.target.value}
                        defaultValue={this.state.editedSmartName}
                        helperText={I18n.t('You can enter several names divided by comma')}
                        margin="normal"
                    />
                </DialogContent>
                <DialogActions>
                    <Button
                        variant="contained"
                        onClick={() => this.changeSmartName()}
                        color="primary"
                        startIcon={<IconCheck/>}
                    >{I18n.t('Ok')}</Button>
                    <Button
                        variant="contained"
                        startIcon={<IconClose/>}
                        color="grey"
                        onClick={() => {
                            this.editedSmartName = null;
                            this.setState({ editId: '', editedSmartName: '' });
                        }}
                    >{I18n.t('Cancel')}</Button>
                </DialogActions>
            </Dialog>;
        } else {
            return null;
        }
    }

    renderConfirmDialog() {
        if (this.state.showConfirmation) {
            return <Dialog
                open={true}
                maxWidth="sm"
                fullWidth={true}
                onClose={() => this.setState({showConfirmation: ''})}
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
                        startIcon={<IconDelete/>}
                    >{I18n.t('Delete')}</Button>
                    <Button
                        color="grey"
                        variant="contained"
                        onClick={() => this.setState({ showConfirmation: '' })}
                        startIcon={<IconClose/>}
                    >{I18n.t('Cancel')}</Button>
                </DialogActions>
            </Dialog>;
        } else {
            return null;
        }
    }

    getSelectIdDialog() {
        if (this.state.showSelectId) {
            return <DialogSelectID
                key="dialogSelectAlisa"
                imagePrefix="../.."
                socket={this.props.socket}
                selected={''}
                types={['state']}
                onClose={() => this.setState({showSelectId: false})}
                onOk={(selected, name) => {
                    this.setState({showSelectId: false});

                    this.props.socket.getObject(selected)
                        .then(obj => {
                            if (obj) {
                                const name = Utils.getObjectNameFromObj(obj, null, {language: I18n.getLanguage()});
                                Utils.updateSmartName(obj, (name || I18n.t('Device name')).replace(/[-_.]+/g, ' '), undefined, undefined, this.props.adapterName + '.' + this.props.instance, this.props.native.noCommon);
                                this.addChanged(obj._id);
                                this.waitForUpdateID = obj._id;

                                if (this.state.lastChanged !== obj._id) {
                                    this.setState({lastChanged: obj._id});
                                    this.timerChanged && clearTimeout(this.timerChanged);
                                    this.timerChanged = setTimeout(() => {
                                        this.setState({lastChanged: ''});
                                        this.timerChanged = null;
                                    }, 30000);
                                }

                                this.props.socket.setObject(obj._id, obj)
                                    .then(() => this.informInstance(obj._id))
                                    .catch(err => this.setState({message: err}));
                            } else {
                                this.setState({message: I18n.t('Invalid ID')});
                            }
                        });
                }}
            />;
        } else {
            return null;
        }
    }

    renderDevices() {
        const filter = this.state.filter.toLowerCase();
        const result = [];
        for (let i = 0; i < this.state.devices.length; i++) {
            if (this.state.filter && this.state.devices[i].name.toLowerCase().indexOf(filter) === -1 ) {
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
            open={true}
            maxWidth="xl"
            fullWidth
            onClose={() => this.setState({showListOfDevices: false})}
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description"
        >
            <DialogTitle id="alert-dialog-title">{I18n.t('List of devices to print out, e.g. to give all device names to your partner.')} <span role="img" aria-label="smile">😄</span></DialogTitle>
            <DialogContent>
                <div className={ classes.headerRow } >
                    <div className={ classes.headerCell }>{ I18n.t('Name') }</div>
                </div>
                <div className={ this.props.classes.tableDiv } >
                    { this.state.devices.map((item, i) => <div key={i}>
                        <div className={ classes.tableCell }>{ item.name }</div>
                    </div>)
                    }
                </div>
            </DialogContent>
            <DialogActions>
                <Button
                    variant="outlined"
                        onClick={() => {
                        this.setState({showListOfDevices: false});
                        const lines = this.state.devices.map(item => item.name);
                        copy(lines.join('\n'));
                    }}
                    color="primary"
                    startIcon={<IconCopy/>}
                >{I18n.t('Copy to clipboard')}</Button>
                <Button
                    color="grey"
                    variant="contained"
                    startIcon={<IconClose/>}
                    onClick={() => this.setState({showListOfDevices: false})} autoFocus>{I18n.t('Close')}</Button>
            </DialogActions>
        </Dialog>;
    }

    render() {
        if (this.state.loading) {
            return <CircularProgress key="alexaProgress" />;
        }

        return <form key="alexa" className={this.props.classes.tab}>
            <Fab size="small" color="secondary" aria-label="Add" className={this.props.classes.button} onClick={() => this.setState({showSelectId: true})}><IconAdd /></Fab>
            <Fab size="small" color="primary" aria-label="Refresh" className={this.props.classes.button}
                  onClick={() => this.browse(true)} disabled={this.state.browse}>{this.state.browse ? <CircularProgress size={20} /> : <IconRefresh/>}</Fab>
            <Fab style={{marginLeft: '1rem'}}
                 title={I18n.t('Show all devices for print out')}
                 size="small" aria-label="List of devices" className={this.props.classes.button}
                 onClick={() => this.setState({showListOfDevices: true})} disabled={this.state.browse}><IconList/></Fab>
            <TextField
                variant="standard"
                placeholder={I18n.t('Filter')}
                className={this.state.filter}
                value={this.state.filter}
                onChange={e => this.setState({filter: e.target.value})}
                InputProps={{
                    endAdornment: this.state.filter ? (
                        <IconButton onClick={() => this.setState({ filter: '' })}>
                            <IconClear />
                        </IconButton>
                    ) : undefined,
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

AlisaDevices.propTypes = {
    common: PropTypes.object.isRequired,
    native: PropTypes.object.isRequired,
    instance: PropTypes.number.isRequired,
    adapterName: PropTypes.string.isRequired,
    onError: PropTypes.func,
    onLoad: PropTypes.func,
    onChange: PropTypes.func,
    socket: PropTypes.object.isRequired,
    themeType: PropTypes.string,
};

export default withStyles(styles)(AlisaDevices);
