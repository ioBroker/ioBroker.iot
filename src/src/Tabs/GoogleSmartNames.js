import React, {Component} from 'react';
import {withStyles} from '@material-ui/core/styles';
import useMediaQuery from '@material-ui/core/useMediaQuery';
import PropTypes from 'prop-types';
import copy from 'copy-to-clipboard';

import Fab from '@material-ui/core/Fab';
import CircularProgress from '@material-ui/core/CircularProgress';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import FormHelperText from '@material-ui/core/FormHelperText';
import FormControl from '@material-ui/core/FormControl';
import Toolbar from '@material-ui/core/Toolbar';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import IconButton from '@material-ui/core/IconButton';

import IconCopy from '@material-ui/icons/FileCopy';
import IconClose from '@material-ui/icons/Close';

import I18n from '@iobroker/adapter-react/i18n';
import MessageDialog from '@iobroker/adapter-react/Dialogs/Message';
import DialogSelectID from '@iobroker/adapter-react/Dialogs/SelectID';
import Utils from '@iobroker/adapter-react/Components/Utils'
import ExpertIcon from '@iobroker/adapter-react/icons/IconExpert';

import TreeTable from '../Components/TreeTable';

import {MdAdd as IconAdd} from 'react-icons/md';
import {MdRefresh as IconRefresh} from 'react-icons/md';
import {MdHelpOutline as IconHelp} from 'react-icons/md';
import {MdList as IconList} from 'react-icons/md';
import {MdClear as IconClear} from 'react-icons/md';

const styles = theme => ({
    tab: {
        height: '100%',
        overflow: 'hidden',
    },
    tableDiv: {
        width: '100%',
        overflow: 'hidden',
        height: 'calc(100% - 48px)',
    },
    searchText: {
        width: 150,
        marginLeft: theme.spacing(1),
        verticalAlign: 'middle'
    },
    headerRow: {
        paddingLeft: theme.spacing(1),
        background: theme.palette.primary.main,
    },
    headerCell: {
        display: 'inline-block',
        verticalAlign: 'top',
        width: '30%'
    },
    tableCell: {
        display: 'inline-block',
        verticalAlign: 'top',
        width: '30%'
    },
});

const MOBILE_HEIGHT = 400;
const MOBILE_WIDTH  = 400;

class GoogleSmartNames extends Component {
    constructor(props) {
        super(props);
        this.myTableRef =  React.createRef();
        this.state = {
            editedSmartName: '',
            editId: '',
            editObjectName: '',
            deleteId: '',

            expertMode: window.localStorage.getItem('App.expertMode') !== 'true',
            helpHidden: window.localStorage.getItem('App.helpHidden') === 'true',
            showSelectId: false,
            searchText: '',
            showConfirmation: '',
            changed: [],
            devices: [],
            message: '',
            filter: '',
            loading: true,
            browse: false,
            expanded: [],
            lastChanged: '',
            helpHeight: 0
        };

        this.columns = [
            {
                title: I18n.t('ID'),
                field: 'id',
                editable: 'never',
                cellStyle: {
                    maxWidth: '12rem',
                    overflow: 'hidden',
                    wordBreak: 'break-word'
                }
            },
            {title: I18n.t('Smart names'), field: 'name.nicknames'},
            {title: I18n.t('ioBType'), field: 'ioType', editable: 'never', cellStyle: {
                    maxWidth: '4rem',
                    overflow: 'hidden',
                    wordBreak: 'break-word'
                }},
            {
                title: I18n.t('Type'),
                field: 'type',
                lookup: {
                    'action.devices.types.AC_UNIT':         'Air conditioning unit',
                    'action.devices.types.AIRFRESHENER':    'Air Freshener',
                    'action.devices.types.AIRPURIFIER':     'Air purifier',
                    'action.devices.types.AWNING':          'Awning',
                    'action.devices.types.BLINDS':          'Blinds',
                    'action.devices.types.BOILER':          'Boiler',
                    'action.devices.types.CAMERA':          'Camera',
                    'action.devices.types.COFFEE_MAKER':    'Coffee maker',
                    'action.devices.types.CURTAIN':         'Curtain',
                    'action.devices.types.DISHWASHER':      'Dishwasher',
                    'action.devices.types.DOOR':            'Door',
                    'action.devices.types.DRYER':           'Dryer',
                    'action.devices.types.FAN':             'Fan',
                    'action.devices.types.FIREPLACE':       'Fireplace',
                    'action.devices.types.GARAGE':          'Garage',
                    'action.devices.types.GATE':            'Gate',
                    'action.devices.types.HEATER':          'Heater',
                    'action.devices.types.HOOD':            'Hood',
                    'action.devices.types.KETTLE':          'Kettle',
                    'action.devices.types.LIGHT':           'Light',
                    'action.devices.types.LOCK':            'Lock',
                    'action.devices.types.MOP':             'Mop',
                    'action.devices.types.MICROWAVE':       'Microwave',
                    'action.devices.types.OUTLET':          'Outlet',
                    'action.devices.types.OVEN':            'Oven',
                    'action.devices.types.PERGOLA':         'Pergola',
                    'action.devices.types.REFRIGERATOR':    'Refrigerator',
                    'action.devices.types.SCENE':           'Scene',
                    'action.devices.types.SECURITYSYSTEM':  'Security System',
                    'action.devices.types.SENSOR':          'Sensor',
                    'action.devices.types.SHUTTER':         'Shutter',
                    'action.devices.types.SHOWER':          'Shower',
                    'action.devices.types.SPEAKER':         'Speaker',
                    'action.devices.types.SPRINKLER':       'Sprinkler',
                    'action.devices.types.SWITCH':          'Switch',
                    'action.devices.types.THERMOSTAT':      'Thermostat',
                    'action.devices.types.VACUUM':          'Vacuum',
                    'action.devices.types.VALVE':           'Valve',
                    'action.devices.types.WASHER':          'Washer',
                    'action.devices.types.WATERHEATER':     'Water heater',
                    'action.devices.types.WINDOW':          'Window'
                }
            },
            {title: I18n.t('Function/Trait'), field: 'displayTraits',  lookup: {
                    // 'action.devices.traits.ArmDisarm':   'ArmDisarm',
                    'action.devices.traits.Brightness':     'Brightness',
                    // 'action.devices.traits.CameraStream': 'CameraStream',
                    'action.devices.traits.ColorSetting_temperature': 'ColorSetting_Temperature',
                    'action.devices.traits.ColorSetting_spectrumRGB': 'ColorSetting_RGB',
                    'action.devices.trairs.Cook': 'Cook',
                    // 'action.devices.traits.Dock':        'Dock',
                    'action.devices.traits.FanSpeed':       'FanSpeed',
                    // 'action.devices.traits.LightEffects': 'LightEffects',
                    // 'action.devices.traits.Locator':     'Locator',
                    'action.devices.traits.LockUnlock':     'LockUnlock',
                    'action.devices.traits.Modes':          'Modes',
                    'action.devices.traits.OnOff':          'OnOff',
                    'action.devices.traits.OpenClose':      'OpenClose',
                    // 'action.devices.traits.RunCycle':    'RunCycle',
                    'action.devices.traits.Scene':          'Scene',
                    // 'action.devices.traits.Sensor':      'Sensor',
                    'action.devices.traits.StartStop':      'StartStop',
                    'action.devices.traits.TemperatureControl_temperatureSetpointCelsius':      'Oven_SetTemp',
                    'action.devices.traits.TemperatureControl_temperatureAmbientCelsius':       'Oven_StatusTemp',
                    'action.devices.traits.TemperatureSetting_thermostatMode':                  'Thermostat_Mode',
                    'action.devices.traits.TemperatureSetting_thermostatTemperatureSetpoint':   'Thermostat_SetTemp',
                    'action.devices.traits.TemperatureSetting_thermostatTemperatureAmbient':    'Thermostat_StatusTemp',
                    'action.devices.traits.TemperatureSetting_thermostatHumidityAmbient':       'Thermostat_StatusHumidity',
                    // 'action.devices.traits.Timer':       'Timer',
                    'action.devices.traits.Toggles':        'Toggles',
                    'action.devices.traits.Volume':         'Volume',
                }},

            {
                title: I18n.t('Attributes'),
                field: 'displayAttributes',
                cellStyle: {
                    maxWidth: '12rem',
                    overflow: 'hidden',
                    wordBreak: 'break-word'
                },
                expertMode: true,
                editComponent: props => <textarea rows={4} style={{width: '100%', resize: 'vertical'}}
                                                  value={props.value}
                                                  onChange={e => props.onChange(e.target.value)}
                />
            },
            {title: I18n.t('Room'), field: 'roomHint', editable: 'never'},
            {title: I18n.t('Auto'), field: 'smartEnum', editable: 'never',
                cellStyle: {
                    maxWidth: '3rem',
                    overflow: 'hidden',
                    wordBreak: 'break-word'
                },
                expertMode: true,
            },
            {title: I18n.t('Conversation to GH'), field: 'displayConv2GH',  cellStyle: {
                    maxWidth: '4rem',
                    overflow: 'hidden',
                    wordBreak: 'break-word'
                },
                expertMode: true,
                editComponent: props => (
                    <div>Conversation to Google Home = function(value)&#123; <br/>
                        <textarea rows={4} style={{width: '100%', resize: 'vertical'}}
                                  value={props.value}
                                  onChange={e => props.onChange(e.target.value)}
                        />
                        &#125;
                    </div>
                )
            },
            { title: I18n.t('Conversation to ioB'), field: 'displayConv2iob', cellStyle: {
                    maxWidth: '4rem',
                    overflow: 'hidden',
                    wordBreak: 'break-word'
                },
                expertMode: true,
                editComponent: props => (
                    <div>Conversation to ioBroker = function(value)&#123; <br/>
                        <textarea rows={4} style={{width: '100%', resize: 'vertical'}}
                                  value={props.value}
                                  onChange={e => props.onChange(e.target.value)}
                        />
                        &#125;
                    </div>
                )},
        ];

        this.timerChanged        = null;
        this.browseTimer         = null;
        this.browseTimerCount    = 0;
        this.editedSmartName     = '';

        this.waitForUpdateID     = null;
        this.onReadyUpdateBound  = this.onReadyUpdate.bind(this);
        this.onResultUpdateBound = this.onResultUpdate.bind(this);
        this.helpRef             = React.createRef();

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
        if (Date.now() - this.lastBrowse < 500) return;
        this.lastBrowse = Date.now();
        if (isIndicate) {
            this.setState({loading: true, browse: true});
        } else {
            this.setState({browse: true});
        }

        this.browseTimer = setTimeout(() => {
            console.log('Browse timeout!');
            this.browseTimer = null;
            this.browseTimerCount++;
            if (this.browseTimerCount < 5) {
                this.browse(isIndicate);
            } else {
                this.setState({message: I18n.t('Cannot read devices!')});
            }
        }, 10000);

        this.props.socket.sendTo(this.props.adapterName + '.' + this.props.instance, 'browseGH', null)
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
            })
            .catch(error => {
                this.setState({message: I18n.t(error)});
            });
    }

    onReadyUpdate(id, state) {
        console.log(`Update ${id} ${state ? state.val + '/' + state.ack : 'null'}`);
        if (state && state.ack === true && state.val === true) {
            if (this.devTimer) clearTimeout(this.devTimer);
            this.devTimer = setTimeout(() => {
                this.devTimer = null;
                this.browse();
            }, 10);
        }
    }

    onResultUpdate(state) {
        state && state.ack === true && state.val && this.setState({message: state.val});
    }

    componentDidMount() {
        this.props.socket.subscribeState(`${this.props.adapterName}.${this.props.instance}.smart.updatesGH`,     this.onReadyUpdateBound);
        this.props.socket.subscribeState(`${this.props.adapterName}.${this.props.instance}.smart.updatesResult`, this.onResultUpdateBound);
    }

    componentWillUnmount() {
        this.props.socket.unsubscribeState(`${this.props.adapterName}.${this.props.instance}.smart.updatesGH`,     this.onReadyUpdateBound);
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
        if (changed.indexOf(id) === -1) {
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
        const device = devices.find(dev => dev.id === id);
        if (device) {
            this.props.socket.getObject(id)
                .then(obj => {
                    let smartName = device.common && device.common.smartName ? device.common.smartName : device._id;
                    if (typeof smartName === 'object' && smartName) {
                        smartName = smartName[I18n.getLanguage()] || smartName.en;
                    }
                    this.editedSmartName = smartName;
                    this.setState({editId: id, editedSmartName: smartName, editObjectName: Utils.getObjectNameFromObj(obj, null, {language: I18n.getLanguage()})});
                });
            return true;
        } else {
            return false;
        }
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

    renderSelectByOn(id, type) {
        // type = '-', 'stored', false or number [5-100]
        if (type !== false) {
            const items = [
                <MenuItem key="_" value=""><em>{I18n.t('Default')}</em></MenuItem>,
                <MenuItem key="last" value="stored">{I18n.t('last value')}</MenuItem>
            ];
            for (let i = 5; i <= 100; i += 5) {
                items.push(<MenuItem  key={i.toString()} value={i.toString()}>{i}%</MenuItem>);
            }
            return <FormControl className={this.props.classes.devSubLineByOn}>
                <Select className={this.props.classes.devSubLineByOnSelect} value={(type || '').toString()} onChange={e => this.onParamsChange(id, e.target.value)}>{items}</Select>
                <FormHelperText className={this.props.classes.devSubLineTypeTitle}>{I18n.t('by ON')}</FormHelperText>
            </FormControl>;
        } else {
            return null;
        }
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

    onGHParamsChange(newData, oldData) {
        this.addChanged(newData.id, () => {
            this.props.socket.getObject(newData.id)
                .then(obj => {
                    if (!obj || !obj.common) {
                        return this.setState({message: I18n.t(`Object %s is invalid. No common found.`, newData.id)});
                    }
                    //  id, newData.type, newData.displayTraits, newData.displayAttributes
                    Utils.updateSmartName(obj, this.editedSmartName, undefined, undefined, this.props.adapterName + '.' + this.props.instance, this.props.native.noCommon);

                    if (JSON.stringify(newData.displayTraits) !== JSON.stringify(oldData.displayTraits)) {
                        if (!Array.isArray(newData.displayTraits)) {
                            newData.displayTraits=[newData.displayTraits]
                        }

                        obj.common.smartName.ghTraits = newData.displayTraits;
                    }
                    if (newData.type !== oldData.type) {
                        obj.common.smartName.ghType = newData.type;
                    }
                    if (newData.displayAttributes !== oldData.displayAttributes ) {
                        obj.common.smartName.ghAttributes = newData.displayAttributes;
                        try {
                            if (obj.common.smartName.ghAttributes) {
                                JSON.parse(obj.common.smartName.ghAttributes)
                            }
                        } catch (error) {
                            this.setState({message: I18n.t('Attributes has not correct JSON format.')});
                        }
                    }
                    if (newData.conv2GH) {
                        obj.common.smartName.ghConv2GH = newData.displayConv2GH;
                    }
                    if (newData.conv2iob) {
                        obj.common.smartName.ghConv2iob = newData.displayConv2iob;
                    }
                    return this.props.socket.setObject(newData.id, obj);
                })
                .then(() => {
                    // update obj
                    this.informInstance(newData.id);
                })
                .catch(err => this.props.onError(err));
        });
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
                .then(() => {
                    // update obj
                    this.informInstance(id);
                })
                .catch(err => this.props.onError(err));
        });
    }

    getSelectIdDialog() {
        if (this.state.showSelectId) {
            return <DialogSelectID
                key="dialogSelectGoogle"
                imagePrefix="../.."
                socket={this.props.socket}
                selected={''}
                types={['state']}
                onClose={() => this.setState({showSelectId: false})}
                onOk={(selected) => {
                    this.setState({showSelectId: false});

                    this.props.socket.getObject(selected)
                        .then(obj => {
                            if (obj) {
                                if (!obj.common) {
                                    return this.setState({message: I18n.t(`Object %s is invalid. No common found.`, selected)});
                                }

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

                                if (!obj.common.smartName) {
                                    obj.common.smartName = {ghType: 'action.devices.types.LIGHT'};
                                    obj.common.smartName = {ghTraits: ['action.devices.traits.OnOff']}
                                } else {
                                    obj.common.smartName.ghType = 'action.devices.types.LIGHT';
                                    obj.common.smartName.ghTraits = ['action.devices.traits.OnOff'];
                                }

                                this.props.socket.setObject(obj._id, obj)
                                    .then(() => {
                                        this.informInstance(obj._id);
                                        this.setState({message: I18n.t('Please add type and trait to complete the Google Home state.')});
                                    })
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
                    <div className={ classes.headerCell }>{ I18n.t('Function') }</div>
                    <div className={ classes.headerCell }>{ I18n.t('Room') }</div>
                </div>
                <div className={ this.props.classes.tableDiv } >
                    { this.state.devices.map((item, i) => <div key={i}>
                            <div className={ classes.tableCell }>{ item.name.nicknames.join(', ') }</div>
                            <div className={ classes.tableCell }>{ item.displayTraits.map(n => n.replace('action.devices.traits.', '')).join(', ') }</div>
                            <div className={ classes.tableCell }>{ item.roomHint }</div>
                        </div>)
                    }
                </div>
            </DialogContent>
            <DialogActions>
                <Button variant="outlined" onClick={() => {
                    this.setState({showListOfDevices: false});
                    const lines = this.state.devices.map(item => item.name.nicknames.join(', ') + '\t' + item.displayTraits + '\t' + item.roomHint);
                    copy(lines.join('\n'));
                }} color="primary" startIcon={<IconCopy/>}>{I18n.t('Copy to clipboard')}</Button>
                <Button startIcon={<IconClose/>} variant="contained" onClick={() => this.setState({showListOfDevices: false})} autoFocus>{I18n.t('Close')}</Button>
            </DialogActions>
        </Dialog>;
    }

    renderInstructions() {
        const desktop = window.innerHeight > MOBILE_HEIGHT && window.innerWidth > MOBILE_WIDTH;

        if (this.state.helpHidden || this.props.smallDisplay || !desktop) {
            return null;
        }

        const manualModeHint = I18n.t('manualModeHint');
        return <div style={{width: '100%'}} ref={this.helpRef}>
            <div style={{marginTop: '4rem', display: 'flex'}}>
                <div style={{flex: '50%'}}>
                    <div style={{fontWeight:"bold"}}>{I18n.t('Auto Mode')}</div>
                    <div style={{marginTop: "0.8rem", marginRight: "0.8rem",}}>{I18n.t('To auto detect devices please assign a room and function to the channel if no channel available than assign to a device. Not only to the state or device. And enable them under SmartEnum/Intelligente Aufzählung')}</div>
                </div>
                <div style={{flex: '50%'}}>
                    <div style={{fontWeight: 'bold'}}>{I18n.t('Manual Mode')}</div>
                    <span>{Utils.renderTextWithA(manualModeHint)}</span>
                </div>
            </div>
            <br/>
            <div style={{flex: '100%'}}>
                <div style={{fontWeight: "bold"}}>{Utils.renderTextWithA(I18n.t('For help use this forum'))}</div>
            </div>
        </div>;
    }

    renderToolbar() {
        const desktop = window.innerHeight > MOBILE_HEIGHT && window.innerWidth > MOBILE_WIDTH;

        return <Toolbar variant="dense">
            <Fab size="small" color="secondary" aria-label="Add" className={this.props.classes.button} onClick={() => this.setState({showSelectId: true})}><IconAdd /></Fab>
            <Fab style={{marginLeft: '1rem'}} size="small" color="primary" aria-label="Refresh" className={this.props.classes.button}
                 onClick={() => this.browse(true)} disabled={this.state.browse}>{this.state.browse ? <CircularProgress size={20} /> : <IconRefresh/>}</Fab>
            {desktop && !this.state.hideHelp ? <Fab style={{marginLeft: '1rem'}} size="small" color={this.state.helpHidden ? 'default' : 'primary'} aria-label="Help" className={this.props.classes.button}
                 title={I18n.t('Show/Hide help')}
                 onClick={() => {
                     window.localStorage.setItem('App.helpHidden', this.state.helpHidden ? 'false' : 'true');
                     this.setState({helpHidden: !this.state.helpHidden});
                 }} disabled={this.state.browse}><IconHelp/></Fab> : null }
            <Fab style={{marginLeft: '1rem'}}
                 size="small"
                 color={this.state.expertMode ? 'primary' : 'default'} aria-label="Help" className={this.props.classes.button}
                 title={I18n.t('Toggle expert mode')}
                 onClick={() => {
                     window.localStorage.setItem('App.expertMode', this.state.expertMode ? 'false' : 'true');
                     this.setState({expertMode: !this.state.expertMode});
                 }} disabled={this.state.browse}><ExpertIcon/></Fab>
            <Fab style={{marginLeft: '1rem'}}
                 title={I18n.t('Show all devices for print out')}
                 size="small" aria-label="List of devices" className={this.props.classes.button}
                 onClick={() => this.setState({showListOfDevices: true})} disabled={this.state.browse}><IconList/></Fab>
            {!this.props.smallDisplay ? <TextField
                className={this.props.classes.searchText}
                label={I18n.t('Filter')}
                value={this.state.searchText} onChange={e => this.setState({searchText: e.target.value})}
                InputProps={{
                    endAdornment: this.state.searchText ? (
                        <IconButton onClick={() => this.setState({ searchText: '' })}>
                            <IconClear />
                        </IconButton>
                    ) : undefined,
                }}
            /> : null}
        </Toolbar>;
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        if (this.helpRef.current) {
            const h = this.helpRef.current.clientHeight;
            if (this.state.helpHeight !== h) {
                if (!this.state.helpHidden && h + 64 + 48 + 200 > window.innerHeight) {
                    setTimeout(() => this.setState({helpHeight: h, helpHidden: true, hideHelp: true}), 50);
                } else {
                    setTimeout(() => this.setState({helpHeight: h}), 50);
                }
            }
        } else if (this.state.helpHeight) {
            setTimeout(() => this.setState({helpHeight: 0}), 50);
        }
    }

    render() {
        if (this.state.loading) {
            return <CircularProgress  key="alexaProgress" />;
        }
        const searchText = this.state.searchText.toLowerCase();
        const devices = this.state.searchText ? this.state.devices.filter(item =>
            item.name?.name?.toLowerCase().includes(searchText) ||
            item.name?.defaultNames?.find(n => n.toLowerCase().includes(searchText)) ||
            item.name?.nicknames?.find(n => n.toLowerCase().includes(searchText)))
            : this.state.devices;

        return <form key="gh" className={this.props.classes.tab}>
            {this.renderToolbar()}
            {this.renderInstructions()}
            <div className={this.props.classes.tableDiv} style={{height: `calc(100% - ${48 + (this.state.helpHeight ? this.state.helpHeight + 64 : 0)}px)`}}>
                <TreeTable
                    columns={this.state.expertMode ? this.columns : this.columns.filter(item => !item.expertMode)}
                    data={devices}
                    onUpdate={(newData, oldData) => {
                        if (newData.name.nicknames && Array.isArray(newData.name.nicknames)) {
                            newData.name.nicknames = newData.name.nicknames.join(',');
                        }
                        this.editedSmartName = newData.name.nicknames;
                        this.setState({editId: newData.id}, () => {
                            if (!newData.type || !newData.displayTraits) {
                                this.setState({browse: true, message: I18n.t('Please add action and trait to complete the Google Home state.')});
                            } else {
                                this.setState({browse: true});
                            }

                            this.onGHParamsChange(newData, oldData);
                            const devices = [...this.state.devices];
                            devices[devices.indexOf(oldData)] = newData;
                            this.setState({ ...this.state, devices});
                        });
                    }}

                    onDelete={oldData => {
                        // if smartenum set smartname on false if not delete/reset smartname content
                        if (oldData.smartEnum === 'X') {
                            this.setState({deleteId: oldData.id});
                        } else {
                            this.props.socket.getObject(oldData.id)
                                .then(obj => {
                                    if (obj && obj.common && obj.common['smartName']) {
                                        delete obj.common['smartName']['ghTraits'];
                                        delete obj.common['smartName']['ghType'];
                                        delete obj.common['smartName']['ghAttributes'];
                                    }
                                    return this.props.socket.setObject(oldData.id, obj);
                                });
                        }

                        return new Promise(resolve => {
                            setTimeout(() => {
                                if (this.state.deleteId) {
                                    this.onDelete();
                                } else {
                                    this.informInstance(oldData.id);
                                }
                                resolve();
                                const devices = [...this.state.devices];
                                devices.splice(devices.indexOf(oldData), 1);
                                this.setState({ ...this.state, devices });
                            }, 600);
                        })
                    }}
                />
            </div>
            {this.renderMessage()}
            {this.getSelectIdDialog()}
            {this.renderListOfDevices()}
        </form>;
    }
}

GoogleSmartNames.propTypes = {
    common:      PropTypes.object.isRequired,
    native:      PropTypes.object.isRequired,
    instance:    PropTypes.number.isRequired,
    adapterName: PropTypes.string.isRequired,
    onError:     PropTypes.func,
    onLoad:      PropTypes.func,
    onChange:    PropTypes.func,
    socket:      PropTypes.object.isRequired,
    themeType:   PropTypes.string.isRequired,
};

export const withMediaQuery = () => Component => props =>
    <Component smallDisplay={useMediaQuery('(max-width:600px)')} {...props} />;

export default withStyles(styles)(withMediaQuery()(GoogleSmartNames));
