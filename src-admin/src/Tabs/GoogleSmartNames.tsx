import React, { Component } from 'react';

import {
    useMediaQuery,
    Fab,
    CircularProgress,
    Toolbar,
    TextField,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Box,
} from '@mui/material';

import { FileCopy as IconCopy, Close as IconClose } from '@mui/icons-material';

import {
    Utils,
    IconExpert as ExpertIcon,
    I18n,
    DialogSelectID,
    DialogMessage,
    type AdminConnection,
    type IobTheme,
} from '@iobroker/adapter-react-v5';

import {
    MdAdd as IconAdd,
    MdRefresh as IconRefresh,
    MdHelpOutline as IconHelp,
    MdList as IconList,
    MdClear as IconClear,
} from 'react-icons/md';

import TreeTable from '../Components/TreeTable';
import type { IotAdapterConfig } from '../types';

const styles: Record<string, any> = {
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
        marginLeft: 8,
        verticalAlign: 'middle',
    },
    headerRow: (theme: IobTheme): React.CSSProperties => ({
        paddingLeft: theme.spacing(1),
        background: theme.palette.primary.main,
    }),
    headerCell: {
        display: 'inline-block',
        verticalAlign: 'top',
        width: '30%',
    },
    tableCell: {
        display: 'inline-block',
        verticalAlign: 'top',
        width: '30%',
    },
    button: {
        // empty placeholder used inline below
    },
};

const MOBILE_HEIGHT = 400;
const MOBILE_WIDTH = 400;

// SmartName as it can appear inside obj.common.smartName, with Google-Home-specific fields.
interface GHSmartName {
    [lang: string]: string | string[] | undefined;
    ghType?: string;
    ghTraits?: string[];
    ghAttributes?: string;
    ghConv2GH?: string;
    ghConv2iob?: string;
}

interface GHDeviceName {
    defaultNames?: string[];
    name?: string;
    nicknames?: string | string[];
}

// A device row as returned by the backend's getDevices() (mirror of GHDevice in src/lib/googleHome.ts).
interface GHDevice {
    id: string;
    type?: string;
    traits?: string[];
    displayTraits?: string | string[];
    attributes?: Record<string, unknown>;
    displayAttributes?: string;
    name?: GHDeviceName;
    willReportState?: boolean;
    roomHint?: string;
    deviceInfo?: { manufacturer?: string; model?: string };
    customData?: Record<string, string | undefined>;
    smartEnum?: string;
    ioType?: string;
    parentId?: string;
    conv2GH?: Record<string, string> | string;
    displayConv2GH?: string;
    conv2iob?: Record<string, string> | string;
    displayConv2iob?: string;
    otherDeviceIds?: { deviceId: string }[];
    merged?: boolean;
    common?: { smartName?: GHSmartName };
    _id?: string;
}

interface BrowseResponseError {
    error: string;
}
type BrowseResponse = GHDevice[] | BrowseResponseError;

interface EditCellProps {
    value: string;
    onChange: (value: string) => void;
}

// Extends the TreeTable column type with local-only fields (expertMode + editComponent).
interface TreeTableColumn {
    field: string;
    title: string;
    editable?: 'never';
    lookup?: Record<string, string>;
    cellStyle?: React.CSSProperties;
    expertMode?: boolean;
    editComponent?: (props: EditCellProps) => React.JSX.Element;
}

interface GoogleSmartNamesProps {
    socket: AdminConnection;
    adapterName: string;
    instance: number;
    native: IotAdapterConfig;
    onError: (text: string | Error) => void;
    theme: IobTheme;
    themeType?: 'light' | 'dark';
    common?: ioBroker.AdapterCommon | null;
    smallDisplay?: boolean;
    title?: string;
}

interface GoogleSmartNamesState {
    editedSmartName: string;
    editId: string;
    editObjectName: string;
    deleteId: string;
    expertMode: boolean;
    helpHidden: boolean;
    hideHelp?: boolean;
    showSelectId: boolean;
    searchText: string;
    showConfirmation: boolean;
    changed: string[];
    devices: GHDevice[];
    message: string;
    filter: string;
    loading: boolean;
    browse: boolean;
    expanded: string[];
    lastChanged: string;
    helpHeight: number;
    showListOfDevices?: boolean;
}

class GoogleSmartNames extends Component<GoogleSmartNamesProps, GoogleSmartNamesState> {
    private timerChanged: ReturnType<typeof setTimeout> | null = null;
    private browseTimer: ReturnType<typeof setTimeout> | null = null;
    private browseTimerCount = 0;
    private editedSmartName: string | string[] = '';
    private waitForUpdateID: string | null = null;
    private lastBrowse = 0;
    private devTimer: ReturnType<typeof setTimeout> | null = null;
    private readonly onReadyUpdateBound: (id: string, state: ioBroker.State | null | undefined) => void;
    private readonly onResultUpdateBound: (id: string, state: ioBroker.State | null | undefined) => void;
    private readonly helpRef = React.createRef<HTMLDivElement>();

    private readonly columns: TreeTableColumn[];

    constructor(props: GoogleSmartNamesProps) {
        super(props);

        this.state = {
            editedSmartName: '',
            editId: '',
            editObjectName: '',
            deleteId: '',

            expertMode: window.localStorage.getItem('App.expertMode') === 'true',
            helpHidden: window.localStorage.getItem('App.helpHidden') === 'true',
            showSelectId: false,
            searchText: '',
            showConfirmation: false,
            changed: [],
            devices: [],
            message: '',
            filter: '',
            loading: true,
            browse: false,
            expanded: [],
            lastChanged: '',
            helpHeight: 0,
        };

        this.columns = [
            {
                title: I18n.t('ID'),
                field: 'id',
                editable: 'never',
                cellStyle: {
                    maxWidth: '12rem',
                    overflow: 'hidden',
                    wordBreak: 'break-word',
                },
            },
            { title: I18n.t('Smart names'), field: 'name.nicknames' },
            {
                title: I18n.t('ioBType'),
                field: 'ioType',
                editable: 'never',
                cellStyle: {
                    maxWidth: '4rem',
                    overflow: 'hidden',
                    wordBreak: 'break-word',
                },
            },
            {
                title: I18n.t('Type'),
                field: 'type',
                lookup: {
                    'action.devices.types.AC_UNIT': 'Air conditioning unit',
                    'action.devices.types.AIRFRESHENER': 'Air Freshener',
                    'action.devices.types.AIRPURIFIER': 'Air purifier',
                    'action.devices.types.AWNING': 'Awning',
                    'action.devices.types.BLINDS': 'Blinds',
                    'action.devices.types.BOILER': 'Boiler',
                    'action.devices.types.CAMERA': 'Camera',
                    'action.devices.types.COFFEE_MAKER': 'Coffee maker',
                    'action.devices.types.CURTAIN': 'Curtain',
                    'action.devices.types.DISHWASHER': 'Dishwasher',
                    'action.devices.types.DOOR': 'Door',
                    'action.devices.types.DRYER': 'Dryer',
                    'action.devices.types.FAN': 'Fan',
                    'action.devices.types.FIREPLACE': 'Fireplace',
                    'action.devices.types.GARAGE': 'Garage',
                    'action.devices.types.GATE': 'Gate',
                    'action.devices.types.HEATER': 'Heater',
                    'action.devices.types.HOOD': 'Hood',
                    'action.devices.types.KETTLE': 'Kettle',
                    'action.devices.types.LIGHT': 'Light',
                    'action.devices.types.LOCK': 'Lock',
                    'action.devices.types.MOP': 'Mop',
                    'action.devices.types.MICROWAVE': 'Microwave',
                    'action.devices.types.OUTLET': 'Outlet',
                    'action.devices.types.OVEN': 'Oven',
                    'action.devices.types.PERGOLA': 'Pergola',
                    'action.devices.types.REFRIGERATOR': 'Refrigerator',
                    'action.devices.types.SCENE': 'Scene',
                    'action.devices.types.SECURITYSYSTEM': 'Security System',
                    'action.devices.types.SENSOR': 'Sensor',
                    'action.devices.types.SHUTTER': 'Shutter',
                    'action.devices.types.SHOWER': 'Shower',
                    'action.devices.types.SPEAKER': 'Speaker',
                    'action.devices.types.SPRINKLER': 'Sprinkler',
                    'action.devices.types.SWITCH': 'Switch',
                    'action.devices.types.THERMOSTAT': 'Thermostat',
                    'action.devices.types.VACUUM': 'Vacuum',
                    'action.devices.types.VALVE': 'Valve',
                    'action.devices.types.WASHER': 'Washer',
                    'action.devices.types.WATERHEATER': 'Water heater',
                    'action.devices.types.WINDOW': 'Window',
                },
            },
            {
                title: I18n.t('Function/Trait'),
                field: 'displayTraits',
                lookup: {
                    'action.devices.traits.Brightness': 'Brightness',
                    'action.devices.traits.ColorSetting_temperature': 'ColorSetting_Temperature',
                    'action.devices.traits.ColorSetting_spectrumRGB': 'ColorSetting_RGB',
                    'action.devices.traits.FanSpeed': 'FanSpeed',
                    'action.devices.traits.LockUnlock': 'LockUnlock',
                    'action.devices.traits.Modes': 'Modes',
                    'action.devices.traits.OnOff': 'OnOff',
                    'action.devices.traits.OpenClose': 'OpenClose',
                    'action.devices.traits.Scene': 'Scene',
                    'action.devices.traits.StartStop': 'StartStop',
                    'action.devices.traits.TemperatureControl_temperatureSetpointCelsius': 'Oven_SetTemp',
                    'action.devices.traits.TemperatureControl_temperatureAmbientCelsius': 'Oven_StatusTemp',
                    'action.devices.traits.TemperatureSetting_thermostatMode': 'Thermostat_Mode',
                    'action.devices.traits.TemperatureSetting_thermostatTemperatureSetpoint': 'Thermostat_SetTemp',
                    'action.devices.traits.TemperatureSetting_thermostatTemperatureAmbient': 'Thermostat_StatusTemp',
                    'action.devices.traits.TemperatureSetting_thermostatHumidityAmbient': 'Thermostat_StatusHumidity',
                    'action.devices.traits.Toggles': 'Toggles',
                    'action.devices.traits.Volume': 'Volume',
                },
            },
            {
                title: I18n.t('Attributes'),
                field: 'displayAttributes',
                cellStyle: {
                    maxWidth: '12rem',
                    overflow: 'hidden',
                    wordBreak: 'break-word',
                },
                expertMode: true,
                editComponent: GoogleSmartNames.editDisplayAttributesComponent,
            },
            { title: I18n.t('Room'), field: 'roomHint', editable: 'never' },
            {
                title: I18n.t('Auto'),
                field: 'smartEnum',
                editable: 'never',
                cellStyle: {
                    maxWidth: '3rem',
                    overflow: 'hidden',
                    wordBreak: 'break-word',
                },
                expertMode: true,
            },
            {
                title: I18n.t('Conversation to GH'),
                field: 'displayConv2GH',
                cellStyle: {
                    maxWidth: '4rem',
                    overflow: 'hidden',
                    wordBreak: 'break-word',
                },
                expertMode: true,
                editComponent: GoogleSmartNames.editDisplayConv2GH,
            },
            {
                title: I18n.t('Conversation to ioB'),
                field: 'displayConv2iob',
                cellStyle: {
                    maxWidth: '4rem',
                    overflow: 'hidden',
                    wordBreak: 'break-word',
                },
                expertMode: true,
                editComponent: GoogleSmartNames.editDisplayConv2iob,
            },
        ];

        this.onReadyUpdateBound = this.onReadyUpdate.bind(this);
        this.onResultUpdateBound = this.onResultUpdate.bind(this);

        void this.props.socket.getObject(`system.adapter.${this.props.adapterName}.${this.props.instance}`).then(obj =>
            this.props.socket
                .getState(`system.adapter.${this.props.adapterName}.${this.props.instance}.alive`)
                .then(state => {
                    if (!obj?.common || (!obj.common.enabled && !state?.val)) {
                        this.setState({
                            message: I18n.t('Instance must be enabled'),
                            loading: false,
                            devices: [],
                        });
                    } else {
                        this.browse();
                    }
                }),
        );
    }

    static editDisplayConv2GH(props: EditCellProps): React.JSX.Element {
        return (
            <div>
                Conversation to Google Home = function(value)&#123;
                <br />
                <textarea
                    rows={4}
                    style={{ width: '100%', resize: 'vertical' }}
                    value={props.value}
                    onChange={e => props.onChange(e.target.value)}
                />
                &#125;
            </div>
        );
    }

    static editDisplayConv2iob(props: EditCellProps): React.JSX.Element {
        return (
            <div>
                Conversation to ioBroker = function(value)&#123;
                <br />
                <textarea
                    rows={4}
                    style={{ width: '100%', resize: 'vertical' }}
                    value={props.value}
                    onChange={e => props.onChange(e.target.value)}
                />
                &#125;
            </div>
        );
    }

    static editDisplayAttributesComponent(props: EditCellProps): React.JSX.Element {
        return (
            <textarea
                rows={4}
                style={{ width: '100%', resize: 'vertical' }}
                value={props.value}
                onChange={e => props.onChange(e.target.value)}
            />
        );
    }

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

        void this.props.socket
            .sendTo(`${this.props.adapterName}.${this.props.instance}`, 'browseGH', null)
            .then((list: BrowseResponse) => {
                if (this.browseTimer) {
                    clearTimeout(this.browseTimer);
                }
                this.browseTimerCount = 0;
                this.browseTimer = null;

                if ((list as BrowseResponseError)?.error) {
                    this.setState({ message: I18n.t((list as BrowseResponseError).error) });
                    return;
                }

                const devices = list as GHDevice[];
                if (this.waitForUpdateID) {
                    if (!this.onEdit(this.waitForUpdateID, devices)) {
                        this.setState({ message: I18n.t('Device %s was not added', this.waitForUpdateID) });
                    }
                    this.waitForUpdateID = null;
                }

                this.setState({
                    devices,
                    loading: false,
                    changed: [],
                    browse: false,
                });
            })
            .catch((error: unknown) =>
                this.setState({ message: I18n.t((error as Error)?.toString() || ''), browse: false }),
            );
    }

    onReadyUpdate(id: string, state: ioBroker.State | null | undefined): void {
        console.log(`Update ${id} ${state ? `${String(state.val)}/${String(state.ack)}` : 'null'}`);
        if (state && state.ack === true && state.val === true) {
            if (this.devTimer) {
                clearTimeout(this.devTimer);
            }
            this.devTimer = setTimeout(() => {
                this.devTimer = null;
                this.browse();
            }, 10);
        }
    }

    onResultUpdate(_id: string, state: ioBroker.State | null | undefined): void {
        if (state && state.ack === true && state.val) {
            this.setState({ message: state.val as string });
        }
    }

    componentDidMount(): void {
        void this.props.socket.subscribeState(
            `${this.props.adapterName}.${this.props.instance}.smart.updatesGH`,
            this.onReadyUpdateBound,
        );
        void this.props.socket.subscribeState(
            `${this.props.adapterName}.${this.props.instance}.smart.updatesResult`,
            this.onResultUpdateBound,
        );
    }

    componentWillUnmount(): void {
        this.props.socket.unsubscribeState(
            `${this.props.adapterName}.${this.props.instance}.smart.updatesGH`,
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

    informInstance(id: string): void {
        void this.props.socket.sendTo(`${this.props.adapterName}.${this.props.instance}`, 'update', id);
    }

    addChanged(id: string, cb?: () => void): void {
        const changed = [...this.state.changed];
        if (!changed.includes(id)) {
            changed.push(id);
            this.setState({ changed }, () => cb?.());
        } else {
            cb?.();
        }
    }

    onEdit(id: string, devices?: GHDevice[]): boolean {
        const list = devices || this.state.devices;
        const device = list.find(dev => dev.id === id);
        if (!device) {
            return false;
        }
        void this.props.socket.getObject(id).then(obj => {
            const smartNameSource = device.common?.smartName ?? device._id;
            let smartName: string | string[] = '';
            if (smartNameSource && typeof smartNameSource === 'object') {
                const t = smartNameSource as ioBroker.Translated;
                smartName = t[I18n.getLanguage()] || t.en || '';
            } else {
                smartName = (smartNameSource as string) || '';
            }
            this.editedSmartName = smartName;
            this.setState({
                editId: id,
                editedSmartName: smartName,
                editObjectName: Utils.getObjectNameFromObj(obj!, null, { language: I18n.getLanguage() }),
            });
        });
        return true;
    }

    onDelete(): void {
        const id = this.state.deleteId;
        this.addChanged(id, () => {
            this.props.socket
                .getObject(id)
                .then(obj => {
                    if (!obj) {
                        return undefined;
                    }
                    Utils.disableSmartName(
                        obj as ioBroker.StateObject,
                        `${this.props.adapterName}.${this.props.instance}`,
                        this.props.native.noCommon,
                    );
                    return this.props.socket.setObject(id, obj);
                })
                .then(() => {
                    this.setState({ deleteId: '', showConfirmation: false, lastChanged: id });

                    if (this.timerChanged) {
                        clearTimeout(this.timerChanged);
                    }
                    this.timerChanged = setTimeout(() => {
                        this.setState({ lastChanged: '' });
                        this.timerChanged = null;
                    }, 30000);

                    this.informInstance(id);
                })
                .catch(err => this.props.onError(err as Error));
        });
    }

    onGHParamsChange(newData: GHDevice, oldData: GHDevice): void {
        this.addChanged(newData.id, () => {
            this.props.socket
                .getObject(newData.id)
                .then(obj => {
                    if (!obj?.common) {
                        this.setState({ message: I18n.t('Object %s is invalid. No common found.', newData.id) });
                        return undefined;
                    }
                    Utils.updateSmartNameEx(obj as ioBroker.StateObject, {
                        smartName: Array.isArray(this.editedSmartName)
                            ? this.editedSmartName.join(',')
                            : this.editedSmartName,
                        instanceId: `${this.props.adapterName}.${this.props.instance}`,
                        noCommon: this.props.native.noCommon,
                    });

                    const common = obj.common as ioBroker.StateCommon & { smartName?: GHSmartName };
                    common.smartName ||= {};
                    const smartName = common.smartName as GHSmartName;

                    if (JSON.stringify(newData.displayTraits) !== JSON.stringify(oldData.displayTraits)) {
                        if (!Array.isArray(newData.displayTraits)) {
                            newData.displayTraits = [newData.displayTraits as string];
                        }
                        smartName.ghTraits = newData.displayTraits;
                    }
                    if (newData.type !== oldData.type) {
                        smartName.ghType = newData.type;
                    }
                    if (newData.displayAttributes !== oldData.displayAttributes) {
                        smartName.ghAttributes = newData.displayAttributes;
                        try {
                            if (smartName.ghAttributes) {
                                JSON.parse(smartName.ghAttributes);
                            }
                        } catch {
                            this.setState({ message: I18n.t('Attributes has not correct JSON format.') });
                        }
                    }
                    if (newData.conv2GH) {
                        smartName.ghConv2GH = newData.displayConv2GH;
                    }
                    if (newData.conv2iob) {
                        smartName.ghConv2iob = newData.displayConv2iob;
                    }
                    return this.props.socket.setObject(newData.id, obj);
                })
                .then(() => this.informInstance(newData.id))
                .catch(err => this.props.onError(err as Error));
        });
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

    getSelectIdDialog(): React.JSX.Element | null {
        if (!this.state.showSelectId) {
            return null;
        }
        return (
            <DialogSelectID
                key="dialogSelectGoogle"
                theme={this.props.theme}
                imagePrefix="../.."
                socket={this.props.socket}
                selected=""
                types={['state']}
                onClose={() => this.setState({ showSelectId: false })}
                onOk={(selected: string | string[] | undefined): void => {
                    this.setState({ showSelectId: false });
                    const selectedId = Array.isArray(selected) ? selected[0] : selected;
                    if (!selectedId) {
                        return;
                    }

                    void this.props.socket.getObject(selectedId).then(obj => {
                        if (!obj) {
                            this.setState({ message: I18n.t('Invalid ID') });
                            return;
                        }
                        if (!obj.common) {
                            this.setState({
                                message: I18n.t('Object %s is invalid. No common found.', selectedId),
                            });
                            return;
                        }

                        const name = Utils.getObjectNameFromObj(obj, null, { language: I18n.getLanguage() });
                        Utils.updateSmartNameEx(obj as ioBroker.StateObject, {
                            smartName: (name || I18n.t('Device name')).replace(/[-_.]+/g, ' '),
                            instanceId: `${this.props.adapterName}.${this.props.instance}`,
                            noCommon: this.props.native.noCommon,
                        });
                        this.addChanged(obj._id);
                        this.waitForUpdateID = obj._id;

                        if (this.state.lastChanged !== obj._id) {
                            this.setState({ lastChanged: obj._id });
                            if (this.timerChanged) {
                                clearTimeout(this.timerChanged);
                            }
                            this.timerChanged = setTimeout(() => {
                                this.timerChanged = null;
                                this.setState({ lastChanged: '' });
                            }, 30000);
                        }

                        const common = obj.common as ioBroker.StateCommon & { smartName?: GHSmartName };
                        if (!common.smartName) {
                            common.smartName = {
                                ghTraits: ['action.devices.traits.OnOff'],
                                ghType: 'action.devices.types.LIGHT',
                            };
                        } else {
                            common.smartName.ghType = 'action.devices.types.LIGHT';
                            common.smartName.ghTraits = ['action.devices.traits.OnOff'];
                        }

                        this.props.socket
                            .setObject(obj._id, obj)
                            .then(() => {
                                this.informInstance(obj._id);
                                this.setState({
                                    message: I18n.t('Please add type and trait to complete the Google Home state.'),
                                });
                            })
                            .catch(err => this.setState({ message: (err as Error)?.toString?.() || String(err) }));
                    });
                }}
            />
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
                        <div style={styles.headerCell}>{I18n.t('Function')}</div>
                        <div style={styles.headerCell}>{I18n.t('Room')}</div>
                    </Box>
                    <div style={styles.tableDiv}>
                        {this.state.devices.map((item, i) => (
                            <div key={i}>
                                <div style={styles.tableCell}>
                                    {Array.isArray(item.name?.nicknames)
                                        ? item.name?.nicknames.join(', ')
                                        : item.name?.nicknames || ''}
                                </div>
                                <div style={styles.tableCell}>
                                    {(Array.isArray(item.displayTraits) ? item.displayTraits : [item.displayTraits])
                                        .filter(Boolean)
                                        .map(n => (n as string).replace('action.devices.traits.', ''))
                                        .join(', ')}
                                </div>
                                <div style={styles.tableCell}>{item.roomHint}</div>
                            </div>
                        ))}
                    </div>
                </DialogContent>
                <DialogActions>
                    <Button
                        variant="outlined"
                        onClick={() => {
                            this.setState({ showListOfDevices: false });
                            const lines = this.state.devices.map(item => {
                                const nicknames = Array.isArray(item.name?.nicknames)
                                    ? item.name?.nicknames.join(', ')
                                    : item.name?.nicknames || '';
                                return `${nicknames}\t${String(item.displayTraits)}\t${String(item.roomHint || '')}`;
                            });
                            Utils.copyToClipboard(lines.join('\n'));
                        }}
                        color="primary"
                        startIcon={<IconCopy />}
                    >
                        {I18n.t('Copy to clipboard')}
                    </Button>
                    <Button
                        color="grey"
                        startIcon={<IconClose />}
                        variant="contained"
                        onClick={() => this.setState({ showListOfDevices: false })}
                        autoFocus
                    >
                        {I18n.t('Close')}
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }

    renderInstructions(): React.JSX.Element | null {
        const desktop = window.innerHeight > MOBILE_HEIGHT && window.innerWidth > MOBILE_WIDTH;

        if (this.state.helpHidden || this.props.smallDisplay || !desktop) {
            return null;
        }

        const manualModeHint = I18n.t('manualModeHint');
        return (
            <div
                style={{ width: '100%' }}
                ref={this.helpRef}
            >
                <div style={{ marginTop: '4rem', display: 'flex' }}>
                    <div style={{ flex: '50%' }}>
                        <div style={{ fontWeight: 'bold' }}>{I18n.t('Auto Mode')}</div>
                        <div style={{ marginTop: '0.8rem', marginRight: '0.8rem' }}>
                            {I18n.t(
                                'To auto detect devices please assign a room and function to the channel if no channel available than assign to a device. Not only to the state or device. And enable them under SmartEnum/Intelligente Aufzählung',
                            )}
                        </div>
                    </div>
                    <div style={{ flex: '50%' }}>
                        <div style={{ fontWeight: 'bold' }}>{I18n.t('Manual Mode')}</div>
                        <span>{Utils.renderTextWithA(manualModeHint)}</span>
                    </div>
                </div>
                <br />
                <div style={{ flex: '100%' }}>
                    <div style={{ fontWeight: 'bold' }}>{Utils.renderTextWithA(I18n.t('For help use this forum'))}</div>
                </div>
            </div>
        );
    }

    renderToolbar(): React.JSX.Element {
        const desktop = window.innerHeight > MOBILE_HEIGHT && window.innerWidth > MOBILE_WIDTH;

        return (
            <Toolbar variant="dense">
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
                    style={{ ...styles.button, marginLeft: '1rem' }}
                    size="small"
                    color="primary"
                    aria-label="Refresh"
                    onClick={() => this.browse(true)}
                    disabled={this.state.browse}
                >
                    {this.state.browse ? <CircularProgress size={20} /> : <IconRefresh />}
                </Fab>
                {desktop && !this.state.hideHelp ? (
                    <Fab
                        style={{ ...styles.button, marginLeft: '1rem' }}
                        size="small"
                        color={this.state.helpHidden ? 'default' : 'primary'}
                        aria-label="Help"
                        title={I18n.t('Show/Hide help')}
                        onClick={() => {
                            window.localStorage.setItem('App.helpHidden', this.state.helpHidden ? 'false' : 'true');
                            this.setState({ helpHidden: !this.state.helpHidden });
                        }}
                        disabled={this.state.browse}
                    >
                        <IconHelp />
                    </Fab>
                ) : null}
                <Fab
                    style={{ ...styles.button, marginLeft: '1rem' }}
                    size="small"
                    color={this.state.expertMode ? 'primary' : 'default'}
                    aria-label="Help"
                    title={I18n.t('Toggle expert mode')}
                    onClick={() => {
                        window.localStorage.setItem('App.expertMode', this.state.expertMode ? 'false' : 'true');
                        this.setState({ expertMode: !this.state.expertMode });
                    }}
                    disabled={this.state.browse}
                >
                    <ExpertIcon />
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
                {!this.props.smallDisplay ? (
                    <TextField
                        variant="standard"
                        style={styles.searchText}
                        label={I18n.t('Filter')}
                        value={this.state.searchText}
                        onChange={e => this.setState({ searchText: e.target.value })}
                        slotProps={{
                            input: {
                                endAdornment: this.state.searchText ? (
                                    <IconButton onClick={() => this.setState({ searchText: '' })}>
                                        <IconClear />
                                    </IconButton>
                                ) : undefined,
                            },
                        }}
                    />
                ) : null}
            </Toolbar>
        );
    }

    componentDidUpdate(): void {
        if (this.helpRef.current) {
            const h = this.helpRef.current.clientHeight;
            if (this.state.helpHeight !== h) {
                if (!this.state.helpHidden && h + 64 + 48 + 200 > window.innerHeight) {
                    setTimeout(() => this.setState({ helpHeight: h, helpHidden: true, hideHelp: true }), 50);
                } else {
                    setTimeout(() => this.setState({ helpHeight: h }), 50);
                }
            }
        } else if (this.state.helpHeight) {
            setTimeout(() => this.setState({ helpHeight: 0 }), 50);
        }
    }

    render(): React.JSX.Element {
        if (this.state.loading) {
            return <CircularProgress key="alexaProgress" />;
        }
        const searchText = this.state.searchText.toLowerCase();
        const devices = this.state.searchText
            ? this.state.devices.filter(
                  item =>
                      item.name?.name?.toLowerCase().includes(searchText) ||
                      item.name?.defaultNames?.find(n => n.toLowerCase().includes(searchText)) ||
                      (Array.isArray(item.name?.nicknames)
                          ? item.name?.nicknames.find(n => n.toLowerCase().includes(searchText))
                          : item.name?.nicknames?.toLowerCase().includes(searchText)),
              )
            : this.state.devices;

        return (
            <form
                key="gh"
                style={styles.tab}
            >
                {this.renderToolbar()}
                {this.renderInstructions()}
                <div
                    style={{
                        ...styles.tableDiv,
                        height: `calc(100% - ${48 + (this.state.helpHeight ? this.state.helpHeight + 64 : 0)}px)`,
                    }}
                >
                    <TreeTable
                        columns={this.state.expertMode ? this.columns : this.columns.filter(item => !item.expertMode)}
                        data={devices as unknown as Record<string, unknown>[]}
                        onUpdate={(newData: Record<string, unknown>, oldData: Record<string, unknown>): void => {
                            const _new = newData as unknown as GHDevice;
                            const _old = oldData as unknown as GHDevice;
                            if (_new.name?.nicknames && Array.isArray(_new.name.nicknames)) {
                                _new.name.nicknames = _new.name.nicknames.join(',');
                            }
                            this.editedSmartName = (_new.name?.nicknames as string) || '';
                            this.setState({ editId: _new.id }, () => {
                                if (!_new.type || !_new.displayTraits) {
                                    this.setState({
                                        browse: true,
                                        message: I18n.t(
                                            'Please add action and trait to complete the Google Home state.',
                                        ),
                                    });
                                } else {
                                    this.setState({ browse: true });
                                }

                                this.onGHParamsChange(_new, _old);
                                const _devices = JSON.parse(JSON.stringify(this.state.devices)) as GHDevice[];
                                _devices[_devices.indexOf(_old)] = _new;
                                this.setState({ devices: _devices });
                            });
                        }}
                        onDelete={(oldData: Record<string, unknown>): Promise<void> => {
                            const _old = oldData as unknown as GHDevice;
                            if (_old.smartEnum === 'X') {
                                this.setState({ deleteId: _old.id });
                            } else {
                                void this.props.socket.getObject(_old.id).then(obj => {
                                    if (obj?.common) {
                                        const common = obj.common as ioBroker.StateCommon & {
                                            smartName?: GHSmartName;
                                        };
                                        if (common.smartName) {
                                            delete common.smartName.ghTraits;
                                            delete common.smartName.ghType;
                                            delete common.smartName.ghAttributes;
                                        }
                                    }
                                    if (obj) {
                                        return this.props.socket.setObject(_old.id, obj);
                                    }
                                    return undefined;
                                });
                            }

                            return new Promise<void>(resolve => {
                                setTimeout(() => {
                                    if (this.state.deleteId) {
                                        this.onDelete();
                                    } else {
                                        this.informInstance(_old.id);
                                    }
                                    resolve();
                                    const _devices = JSON.parse(JSON.stringify(this.state.devices)) as GHDevice[];
                                    _devices.splice(_devices.indexOf(_old), 1);
                                    this.setState({ devices: _devices });
                                }, 600);
                            });
                        }}
                    />
                </div>
                {this.renderMessage()}
                {this.getSelectIdDialog()}
                {this.renderListOfDevices()}
            </form>
        );
    }
}

// HOC that injects the `smallDisplay` prop (mobile-detection hook can only run inside a function component).
type WithoutSmallDisplay = Omit<GoogleSmartNamesProps, 'smallDisplay'>;
function withMediaQuery<C extends React.ComponentType<GoogleSmartNamesProps>>(Wrapped: C) {
    return function MediaQueryWrapper(props: WithoutSmallDisplay): React.JSX.Element {
        const smallDisplay = useMediaQuery('(max-width:600px)');
        const Comp: React.ComponentType<GoogleSmartNamesProps> = Wrapped;
        return (
            <Comp
                {...props}
                smallDisplay={smallDisplay}
            />
        );
    };
}

export default withMediaQuery(GoogleSmartNames);
