import React, { Component } from 'react';

import {
    TextField,
    Button,
    IconButton,
    CircularProgress,
    Badge,
    DialogTitle,
    DialogContent,
    DialogActions,
    Dialog,
    Fab,
    Box,
} from '@mui/material';
import type { IconType } from 'react-icons';

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
    FaPalette as IconColor,
    FaLightbulb as IconBulb,
    FaLockOpen as IconLock,
    FaThermometer as IconThermometer,
    FaTint as IconHumidity,
    FaMale as IconMotion,
    FaLink as IconContact,
} from 'react-icons/fa';

import { FileCopy as IconCopy, Close as IconClose, Check as IconCheck } from '@mui/icons-material';

import {
    Utils,
    I18n,
    DialogMessage,
    DialogSelectID,
    type AdminConnection,
    type IobTheme,
    type ThemeType,
} from '@iobroker/adapter-react-v5';

import type { IotAdapterConfig } from '../types';

const colorOn = '#aba613';
const colorOff = '#444';
const colorSet = '#00c6ff';
const colorRGB = '#ff7ee3';
const colorRead = '#00bc00';
const CHANGED_COLOR = '#e7000040';
const DEFAULT_CHANNEL_COLOR_DARK = '#4f4f4f';
const DEFAULT_CHANNEL_COLOR_LIGHT = '#e9e9e9';
const LAST_CHANGED_COLOR_DARK = '#5c8f65';
const LAST_CHANGED_COLOR_LIGHT = '#b4ffbe';

interface AlisaActionConfig {
    color: string;
    icon: IconType;
    desc: string;
}

const actionsMapping: Record<string, AlisaActionConfig> = {
    OnOff: { color: colorOn, icon: IconOn, desc: 'On/Off' },
    Brightness: { color: colorSet, icon: IconBulb, desc: 'Dimmer' },
    RGB: { color: colorRGB, icon: IconBulb, desc: 'Set color' },

    setTargetTemperature: { color: colorSet, icon: IconTemperature, desc: 'Set target temperature' },
    incrementTargetTemperature: { color: colorOn, icon: IconUp, desc: 'Increment target temperature' },
    decrementTargetTemperature: { color: colorOff, icon: IconDown, desc: 'Decrement target temperature' },

    incrementPercentage: { color: colorOn, icon: IconUp, desc: 'Increment percentage' },
    decrementPercentage: { color: colorOff, icon: IconDown, desc: 'Decrement percentage' },

    setColor: { color: colorSet, icon: IconColor, desc: 'Set color' },

    incrementColorTemperature: { color: colorOn, icon: IconUp, desc: 'Increment color temperature' },
    decrementColorTemperature: { color: colorOff, icon: IconDown, desc: 'Decrement color temperature' },

    getTargetTemperature: { color: colorRead, icon: IconThermometer, desc: 'Get target temperature' },
    getTemperatureReading: { color: colorRead, icon: IconThermometer, desc: 'Get actual temperature' },

    setLockState: { color: colorSet, icon: IconLock, desc: 'Set lock state' },
    getLockState: { color: colorRead, icon: IconLock, desc: 'Read lock state' },

    getActualTemperature: { color: colorRead, icon: IconThermometer, desc: 'Get actual temperature' },
    getActualHumidity: { color: colorRead, icon: IconHumidity, desc: 'Get actual humidity' },

    getMotion: { color: colorRead, icon: IconMotion, desc: 'Get motion' },
    getContact: { color: colorRead, icon: IconContact, desc: 'Get contact' },
};

let actionsTranslated = false;

const styles: Record<string, any> = {
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
        minWidth: 100,
        display: 'inline-block',
        fontSize: 13,
        paddingLeft: 70,
    },
    devSubSubLine: {
        fontSize: 10,
        fontStyle: 'italic',
        display: 'inline-block',
        marginLeft: 15,
    },
    devSubLineSetId: {
        fontStyle: 'italic',
        display: 'block',
        color: '#999',
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
    headerRow: (theme: IobTheme): React.CSSProperties => ({
        paddingLeft: theme.spacing(1),
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

interface AlisaDeviceAttribute {
    name: string;
    getId?: string | null;
    setId?: string | null;
}

interface AlisaDevice {
    name: string;
    main: { getId: string | null; setId: string | null };
    attributes: AlisaDeviceAttribute[];
    actions: string[];
    iobID: string;
    description: string;
    room?: string;
    func: string;
}

interface BrowseResponseError {
    error: string;
}

type BrowseResponse = AlisaDevice[] | BrowseResponseError;

interface AlisaSmartNamesProps {
    socket: AdminConnection;
    adapterName: string;
    instance: number;
    native: IotAdapterConfig;
    onError: (text: string | Error) => void;
    themeType: ThemeType;
    theme: IobTheme;
    common?: ioBroker.AdapterCommon | null;
    title?: string;
}

interface AlisaSmartNamesState {
    editedSmartName: string;
    editId: string;
    editObjectName: string;
    deleteId: string;
    showSelectId: boolean;
    showConfirmation: boolean;
    changed: string[];
    devices: AlisaDevice[];
    message: string;
    filter: string;
    loading: boolean;
    browse: boolean;
    expanded: string[];
    lastChanged: string;
    showListOfDevices?: boolean;
}

export default class AlisaDevices extends Component<AlisaSmartNamesProps, AlisaSmartNamesState> {
    private timerChanged: ReturnType<typeof setTimeout> | null = null;
    private browseTimer: ReturnType<typeof setTimeout> | null = null;
    private browseTimerCount = 0;
    private editedSmartName: string | null = '';
    private waitForUpdateID: string | null = null;
    private lastBrowse = 0;
    private devTimer: ReturnType<typeof setTimeout> | null = null;
    private readonly onReadyUpdateBound: (id: string, state: ioBroker.State | null | undefined) => void;
    private readonly onResultUpdateBound: (id: string, state: ioBroker.State | null | undefined) => void;

    constructor(props: AlisaSmartNamesProps) {
        super(props);

        if (!actionsTranslated) {
            Object.keys(actionsMapping).forEach(a => (actionsMapping[a].desc = I18n.t(actionsMapping[a].desc)));
            actionsTranslated = true;
        }

        this.state = {
            editedSmartName: '',
            editId: '',
            editObjectName: '',
            deleteId: '',
            showSelectId: false,
            showConfirmation: false,
            changed: [],
            devices: [],
            message: '',
            filter: '',
            loading: true,
            browse: false,
            expanded: [],
            lastChanged: '',
        };

        this.onReadyUpdateBound = this.onReadyUpdate.bind(this);
        this.onResultUpdateBound = this.onResultUpdate.bind(this);

        void this.props.socket
            .getObject(`system.adapter.${this.props.adapterName}.${this.props.instance}`)
            .then(obj => {
                void this.props.socket
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
                    });
            });
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
            this.browseTimer = null;
            this.browseTimerCount++;
            if (this.browseTimerCount < 5) {
                this.browse(isIndicate);
            } else {
                this.setState({ message: I18n.t('Cannot read devices!') });
            }
        }, 10000);

        void this.props.socket
            .sendTo(`${this.props.adapterName}.${this.props.instance}`, 'browseAlisa', null)
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

                const devices = list as AlisaDevice[];
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
            .catch((error: unknown) => {
                if (this.browseTimer) {
                    clearTimeout(this.browseTimer);
                }
                this.browseTimerCount = 0;
                this.browseTimer = null;
                this.setState({
                    message: (error as Error)?.toString() || I18n.t('Cannot read devices!'),
                    browse: false,
                    loading: false,
                });
            });
    }

    onReadyUpdate = (_id: string, state: ioBroker.State | null | undefined): void => {
        if (state && state.ack === true && state.val === true) {
            if (this.devTimer) {
                clearTimeout(this.devTimer);
            }
            this.devTimer = setTimeout(() => {
                this.devTimer = null;
                this.browse();
            }, 300);
        }
    };

    onResultUpdate = (_id: string, state: ioBroker.State | null | undefined): void => {
        if (state && state.ack === true && state.val) {
            this.setState({ message: state.val as string });
        }
    };

    componentDidMount(): void {
        void this.props.socket.subscribeState(
            `${this.props.adapterName}.${this.props.instance}.smart.updates`,
            this.onReadyUpdateBound,
        );
        void this.props.socket.subscribeState(
            `${this.props.adapterName}.${this.props.instance}.smart.updatesResult`,
            this.onResultUpdateBound,
        );
    }

    componentWillUnmount(): void {
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

    onEdit(id: string, devices?: AlisaDevice[]): boolean {
        const list = devices || this.state.devices;
        const device = list.find(dev => dev.iobID === id);
        if (!device) {
            return false;
        }
        let smartName: unknown = device.name;
        if (smartName && typeof smartName === 'object') {
            const obj = smartName as ioBroker.Translated;
            smartName = obj[I18n.getLanguage()] || obj.en || '';
        }
        const nameStr = (smartName as string) || '';
        this.editedSmartName = nameStr;
        this.setState({
            editId: id,
            editedSmartName: nameStr,
            editObjectName: nameStr,
        });
        return true;
    }

    onAskDelete(deleteId: string): void {
        this.setState({ deleteId, showConfirmation: true });
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

    static renderActions(dev: AlisaDevice): React.JSX.Element[] | null {
        const actions: React.JSX.Element[] = [];
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
        for (let a = 0; a < dev.actions.length; a++) {
            if (!actionsMapping[dev.actions[a]]) {
                actions.push(<span key={dev.actions[a]}>{dev.actions[a]}</span>);
            }
        }
        return actions;
    }

    onExpand(lineNum: number): void {
        const expanded = [...this.state.expanded];
        const pos = expanded.indexOf(this.state.devices[lineNum].name);
        if (pos === -1) {
            expanded.push(this.state.devices[lineNum].name);
        } else {
            expanded.splice(pos, 1);
        }
        this.setState({ expanded });
    }

    renderChannels(dev: AlisaDevice, lineNum: number): React.JSX.Element[] {
        const result: React.JSX.Element[] = [];
        const id = dev.main.getId || dev.iobID;
        const name = dev.func;
        const background = this.props.themeType === 'dark' ? DEFAULT_CHANNEL_COLOR_DARK : DEFAULT_CHANNEL_COLOR_LIGHT;
        result.push(
            <div
                key={`sub${id}_${lineNum}`}
                style={{ ...styles.devSubLine, background }}
            >
                <div style={styles.devSubLineName}>{name.toUpperCase()}</div>
                <div style={styles.devSubSubLine}>
                    <div>{dev.main.getId}</div>
                    {dev.main.setId && dev.main.setId !== dev.main.getId ? (
                        <div style={styles.devSubLineSetId}>{dev.main.setId}</div>
                    ) : null}
                </div>
            </div>,
        );

        dev.attributes.forEach(attr => {
            result.push(
                <div
                    key={`sub${attr.getId}`}
                    style={{ ...styles.devSubLine, background }}
                >
                    <div style={styles.devSubLineName}>{attr.name.toUpperCase()}</div>
                    <div style={styles.devSubSubLine}>
                        <div>{attr.getId}</div>
                        {attr.setId && attr.setId !== attr.getId ? (
                            <div style={styles.devSubLineSetId}>{attr.setId}</div>
                        ) : null}
                    </div>
                </div>,
            );
        });

        return result;
    }

    renderDevice(dev: AlisaDevice, lineNum: number): React.ReactNode[] {
        const expanded = this.state.expanded.includes(dev.name);
        let background: string = lineNum % 2 ? (this.props.themeType === 'dark' ? '#272727' : '#f1f1f1') : 'inherit';
        const changed = this.state.changed.includes(dev.iobID);
        if (changed) {
            background = CHANGED_COLOR;
        } else if (dev.iobID === this.state.lastChanged) {
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
                    {dev.attributes.length ? (
                        <Badge
                            badgeContent={dev.attributes.length}
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
                    <span style={styles.devLineName}>{dev.name}</span>
                    <span style={styles.devLineDescription}>{dev.description}</span>
                    {changed ? (
                        <CircularProgress
                            style={styles.devLineProgress}
                            size={20}
                        />
                    ) : null}
                </div>
                <span style={styles.devLineActions}>{AlisaDevices.renderActions(dev)}</span>
                <IconButton
                    aria-label="Edit"
                    style={styles.devLineEdit}
                    onClick={() => this.onEdit(dev.iobID)}
                >
                    <IconEdit fontSize="medium" />
                </IconButton>
                <IconButton
                    aria-label="Delete"
                    style={styles.devLineDelete}
                    onClick={() => this.onAskDelete(dev.iobID)}
                >
                    <IconDelete fontSize="medium" />
                </IconButton>
            </div>,
            expanded ? this.renderChannels(dev, lineNum) : null,
        ];
    }

    renderMessage(): React.JSX.Element | null {
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

    changeSmartName(e?: React.SyntheticEvent): void {
        e?.preventDefault();
        this.addChanged(this.state.editId, () => {
            const id = this.state.editId;
            this.setState({ editId: '', editObjectName: '', lastChanged: id });

            if (this.timerChanged) {
                clearTimeout(this.timerChanged);
            }
            this.timerChanged = setTimeout(() => {
                this.setState({ lastChanged: '' });
                this.timerChanged = null;
            }, 30000);

            this.props.socket
                .getObject(id)
                .then(obj => {
                    if (!obj) {
                        return undefined;
                    }
                    Utils.updateSmartNameEx(obj as ioBroker.StateObject, {
                        smartName: this.editedSmartName ?? '',
                        instanceId: `${this.props.adapterName}.${this.props.instance}`,
                        noCommon: this.props.native.noCommon,
                    });
                    return this.props.socket.setObject(id, obj);
                })
                .then(() => this.informInstance(id))
                .catch(err => this.props.onError(err as Error));
        });
    }

    renderEditDialog(): React.JSX.Element | null {
        if (!this.state.editId) {
            return null;
        }
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
                        onKeyDown={e => e.key === 'Enter' && this.changeSmartName(e)}
                        onChange={e => (this.editedSmartName = e.target.value)}
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
                        startIcon={<IconCheck />}
                    >
                        {I18n.t('Ok')}
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<IconClose />}
                        color="grey"
                        onClick={() => {
                            this.editedSmartName = null;
                            this.setState({ editId: '', editedSmartName: '' });
                        }}
                    >
                        {I18n.t('Cancel')}
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }

    renderConfirmDialog(): React.JSX.Element | null {
        if (!this.state.showConfirmation) {
            return null;
        }
        return (
            <Dialog
                open={!0}
                maxWidth="sm"
                fullWidth
                onClose={() => this.setState({ showConfirmation: false })}
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
                        onClick={() => this.setState({ showConfirmation: false })}
                        startIcon={<IconClose />}
                    >
                        {I18n.t('Cancel')}
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }

    getSelectIdDialog(): React.JSX.Element | null {
        if (!this.state.showSelectId) {
            return null;
        }
        return (
            <DialogSelectID
                theme={this.props.theme}
                key="dialogSelectAlisa"
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
                                this.setState({ lastChanged: '' });
                                this.timerChanged = null;
                            }, 30000);
                        }

                        this.props.socket
                            .setObject(obj._id, obj)
                            .then(() => this.informInstance(obj._id))
                            .catch(err => this.setState({ message: (err as Error)?.toString() || String(err) }));
                    });
                }}
            />
        );
    }

    renderDevices(): React.JSX.Element {
        const filter = this.state.filter.toLowerCase();
        const result: React.ReactNode[] = [];
        for (let i = 0; i < this.state.devices.length; i++) {
            if (this.state.filter && !this.state.devices[i].name.toLowerCase().includes(filter)) {
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
                                <div style={styles.tableCell}>{item.name}</div>
                            </div>
                        ))}
                    </div>
                </DialogContent>
                <DialogActions>
                    <Button
                        variant="outlined"
                        onClick={() => {
                            this.setState({ showListOfDevices: false });
                            const lines = this.state.devices.map(item => item.name);
                            Utils.copyToClipboard(lines.join('\n'));
                        }}
                        color="primary"
                        startIcon={<IconCopy />}
                    >
                        {I18n.t('Copy to clipboard')}
                    </Button>
                    <Button
                        color="grey"
                        variant="contained"
                        startIcon={<IconClose />}
                        onClick={() => this.setState({ showListOfDevices: false })}
                        autoFocus
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
