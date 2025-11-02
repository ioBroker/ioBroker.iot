import React, { Component } from 'react';
import SVG from 'react-inlinesvg';

import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Badge,
    Box,
    Button,
    Checkbox,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Fab,
    FormControl,
    FormControlLabel,
    FormHelperText,
    IconButton,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Select,
    TextField,
    Tooltip,
} from '@mui/material';

import {
    Check as IconCheck,
    ChevronRight,
    Close as IconClose,
    FileCopy as IconCopy,
    UnfoldLess,
    UnfoldMore,
    MoreVertRounded as IconMenu,
    Add as IconAdd,
    Clear as IconClear,
    Delete as IconDelete,
    DragHandle as IconCollapse,
    Edit as IconEdit,
    FormatAlignJustify as IconExpand,
    List as IconList,
    Refresh as IconRefresh,
    PhonelinkErase as IconReset,
    Sort as IconByType,
    SortByAlpha as IconByName,
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
import type { IotAdapterConfig } from '../../types';
import type {
    AlexaSH3DeviceDescription,
    AlexaSH3ControlDescription,
    IotExternalDetectorState,
    SmartNameObject,
} from './alexa.types';
import type { Types } from '@iobroker/type-detector';
import {
    updateSmartNameEx,
    takeIdForSmartName,
    CAPABILITIES,
    DEVICES,
    renderSelectTypeSelector,
    getObjectIcon,
    getName,
    renderChannelActions,
    renderDevTypes,
    type UpdateSmartNameOptions,
    findDeviceForState,
} from './utils';
import SmartNameManageDialog from './SmartNameManageDialog';

const CHANGED_COLOR = '#e7000040';
const DEFAULT_CHANNEL_COLOR_DARK = '#4f4f4f';
const DEFAULT_CHANNEL_COLOR_DARK2 = '#313131';
const DEFAULT_CHANNEL_COLOR_LIGHT = '#e9e9e9';
const DEFAULT_CHANNEL_COLOR_LIGHT2 = '#bbbbbb';
const LAST_CHANGED_COLOR_DARK = '#5c8f65';
const LAST_CHANGED_COLOR_LIGHT = '#b4ffbe';

const DEFAULT_STATE_COLOR_DARK = '#6e6e6e';
const DEFAULT_STATE_COLOR_LIGHT = '#d0d0d0';

let capabilitiesTranslated = false;
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
        typeWasDetected: boolean;
        possibleTypes: Types[];
        name: string;
        originalType: string | null;
        originalName: string;
        objectName: string;
        isAfterAdd: boolean;
        isNoMagic?: boolean;
    };
    deleteId: string;
    showDeviceMenu: null | {
        el: HTMLButtonElement;
        dev: AlexaSH3DeviceDescription;
    };
    showListOfDevices: boolean;
    showSelectId: { predefinedName?: string } | null;
    showConfirmation: boolean | string;
    changed: string[];
    devices: AlexaSH3DeviceDescription[];
    message: string;
    filter: string;
    loading: boolean;
    browse: boolean;
    expanded: string[];
    expandedTypes: string[];
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
    showResetId: AlexaSH3DeviceDescription | null;
    sortBy: 'name' | 'type';
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
    private readonly namespace: string;

    constructor(props: Alexa3SmartNamesProps) {
        super(props);

        this.namespace = `${this.props.adapterName}.${this.props.instance}`;

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

        const expandedTypesStr = window.localStorage.getItem('v3.expandedTypes') || '[]';
        let expandedTypes: string[];
        try {
            expandedTypes = JSON.parse(expandedTypesStr);
        } catch {
            expandedTypes = [];
        }

        this.state = {
            edit: null,
            deleteId: '',

            showListOfDevices: false,
            showSelectId: null,
            showConfirmation: '',
            changed: [],
            devices: [],
            message: '',
            filter: '',
            loading: true,
            browse: false,
            expanded,
            expandedTypes,
            lastChanged: '',
            objects: {},
            alive: false,
            values: {},
            showResetId: null,
            showDeviceMenu: null,
            sortBy: (window.localStorage.getItem('v3.sortBy') as 'type' | 'name') || 'name',
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
                    setTimeout(() => this.browse(), 5000);
                }
            });
        }
    };

    showDevice(id: string, devices: AlexaSH3DeviceDescription[]): void {
        devices ||= this.state.devices;
        const deviceIndex = devices.findIndex(dev =>
            dev.controls.find(control =>
                Object.values(control.states).find((item: IotExternalDetectorState) => item.id === id),
            ),
        );
        if (deviceIndex !== -1) {
            if (this.state.sortBy === 'type') {
                const id = `line${deviceIndex}`;
                const type = devices[deviceIndex].controls[0].type || 'unknown';
                if (!this.state.expandedTypes.includes(type)) {
                    const expandedTypes = [...this.state.expandedTypes];
                    expandedTypes.push(type);
                    window.localStorage.setItem('v3.expandedTypes', JSON.stringify(expandedTypes));
                    this.setState({ expandedTypes }, () => {
                        setTimeout(() => {
                            const el = document.getElementById(id);
                            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }, 100);
                    });
                } else {
                    setTimeout(() => {
                        const el = document.getElementById(id);
                        el && el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 100);
                }
            } else {
                const el = document.getElementById(id);
                el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
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
            .sendTo(this.namespace, 'browse3', null)
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
                        this.showDevice(this.waitForUpdateID, typedList);

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

    async componentDidMount(): Promise<void> {
        const obj = await this.props.socket.getObject(
            `system.adapter.${this.props.adapterName}.${this.props.instance}`,
        );
        const state = await this.props.socket.getState(
            `system.adapter.${this.props.adapterName}.${this.props.instance}.alive`,
        );

        if (!obj || !obj.common || (!obj.common.enabled && !state?.val)) {
            this.setState({
                message: I18n.t('Instance must be enabled'),
                loading: false,
                devices: [],
                alive: false,
            });
            void this.props.socket.subscribeState(
                `system.adapter.${this.props.adapterName}.${this.props.instance}.alive`,
                this.onAliveChanged,
            );
        } else {
            this.setState({ alive: true }, () => {
                this.browse();
                // Subscribe on alive after the alive check
                void this.props.socket.subscribeState(
                    `system.adapter.${this.props.adapterName}.${this.props.instance}.alive`,
                    this.onAliveChanged,
                );
            });
        }

        void this.props.socket.subscribeState(
            `${this.props.adapterName}.${this.props.instance}.smart.updates3`,
            this.onReadyUpdate,
        );
        void this.props.socket.subscribeState(
            `${this.props.adapterName}.${this.props.instance}.smart.updatesResult`,
            this.onResultUpdate,
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
        void this.props.socket.sendTo(this.namespace, 'update', id);
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
                        this.namespace,
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
                            typeWasDetected: device.typeWasDetected,
                            possibleTypes: device.possibleTypes,
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
                        Utils.disableSmartName(obj as ioBroker.StateObject, this.namespace, this.props.native.noCommon);
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

    getControlId(deviceIndex: number, controlIndex?: number): string {
        return controlIndex === undefined
            ? this.state.devices[deviceIndex].friendlyName
            : `${this.state.devices[deviceIndex].friendlyName}_${controlIndex}`;
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
            const state = takeIdForSmartName(control);
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
            // Do not allow to set ON less than config.deviceOffLevel
            let min = this.props.native.deviceOffLevel ? parseInt(this.props.native.deviceOffLevel as string, 10) : 0;
            if (min < 5) {
                min = 5;
            }
            min = Math.ceil(min / 5) * 5;

            for (let i = min; i <= 100; i += 5) {
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

    renderNoMagic(control: AlexaSH3ControlDescription, dev: AlexaSH3DeviceDescription): React.JSX.Element {
        // Do not show it by autoDetected devices
        if (dev.autoDetected) {
            return <div style={styles.selectAutoDetect} />;
        }
        const smartId = takeIdForSmartName(control);
        const smartName = smartId?.smartName as SmartNameObject;

        if (!smartId || (Object.keys(control.states).length < 2 && !smartName?.noAutoDetect)) {
            return <div style={styles.selectAutoDetect} />;
        }
        return (
            <FormControlLabel
                title={I18n.t('Disable automatic detection for this control and use only one state')}
                label={I18n.t('No auto')}
                control={
                    <Checkbox
                        checked={!!smartName?.noAutoDetect}
                        onChange={async (_e, noAutoDetect) => {
                            const obj: ioBroker.StateObject | null | undefined = (await this.props.socket.getObject(
                                smartId.id,
                            )) as ioBroker.StateObject | null | undefined;
                            if (obj) {
                                updateSmartNameEx(obj, {
                                    noAutoDetect,
                                    instanceId: this.namespace,
                                    noCommon: this.props.native.noCommon,
                                });
                                const posDev = this.state.devices.findIndex(d => d === dev);
                                if (posDev !== -1) {
                                    const posControl = this.state.devices[posDev].controls.findIndex(
                                        c => c === control,
                                    );
                                    if (posControl !== -1) {
                                        const devices: AlexaSH3DeviceDescription[] = JSON.parse(
                                            JSON.stringify(this.state.devices),
                                        );
                                        const smartId = takeIdForSmartName(devices[posDev].controls[posControl]);
                                        const smartName = smartId?.smartName as SmartNameObject;
                                        if (noAutoDetect) {
                                            smartName.noAutoDetect = true;
                                        } else {
                                            delete smartName.smartType;
                                        }
                                        this.setState({ devices }, () => {
                                            this.addChanged(obj._id, async (): Promise<void> => {
                                                await this.props.socket.setObject(obj._id, obj);
                                                this.informInstance(smartId.id);
                                            });
                                        });
                                    }
                                }
                            }
                        }}
                    />
                }
            />
        );
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
                            this.namespace,
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

    renderSelectType(control: AlexaSH3ControlDescription, dev: AlexaSH3DeviceDescription): React.JSX.Element | null {
        if (dev.autoDetected) {
            return <div style={styles.selectType} />;
        }
        // get first id
        const state = takeIdForSmartName(control);
        const type = (state?.smartName as SmartNameObject)?.smartType || null;

        return renderSelectTypeSelector(type, dev.typeWasDetected, dev.possibleTypes, value =>
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
                    let valueStr: React.JSX.Element | null;
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

                    let smartName: React.JSX.Element | null = null;
                    if (this.objects[stateId]?.common) {
                        let smartNameValue = Utils.getSmartNameFromObj(
                            this.objects[stateId] as ioBroker.StateObject,
                            this.namespace,
                            this.props.native.noCommon,
                        );
                        if (typeof smartNameValue !== 'object' && smartNameValue) {
                            smartNameValue = {
                                [this.language]: smartName,
                            };
                        }
                        if (smartNameValue) {
                            smartName = (
                                <div>
                                    <div style={{ fontWeight: 'bold' }}>
                                        {I18n.t('Content of the smart name structure (for debug)')}
                                    </div>
                                    {Object.keys(smartNameValue).map(name => {
                                        const value = (smartNameValue as Record<string, string>)[name];
                                        return (
                                            <div key={name}>
                                                <span style={{ fontWeight: 'bold' }}>{name}:</span>{' '}
                                                {value === null
                                                    ? 'null'
                                                    : value === undefined
                                                      ? 'undefined'
                                                      : value.toString()}
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        }
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
                                {smartName ? (
                                    <Tooltip title={smartName}>
                                        <div style={styles.devSubSubLineStateName}>
                                            {name}
                                            {' *'}:
                                        </div>
                                    </Tooltip>
                                ) : (
                                    <div style={styles.devSubSubLineStateName}>{name}</div>
                                )}
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

    getControlProps(control: AlexaSH3ControlDescription): {
        name: string;
        icon?: string | null;
    } {
        // get first state
        const stateId = takeIdForSmartName(control).id;
        if (this.state.objects[stateId] === undefined && !this.requesting[stateId]) {
            this.requesting[stateId] = true;
            // try to find the device
            setTimeout(() => {
                void findDeviceForState(stateId, this.props.socket, this.objects).then(obj => {
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

    renderChannels(dev: AlexaSH3DeviceDescription, deviceIndex: number): (React.JSX.Element | null)[] {
        return dev.controls.map((control: AlexaSH3ControlDescription, c: number): React.JSX.Element | null => {
            if (!control.states || !Object.keys(control.states).length) {
                return null;
            }
            const id: string = takeIdForSmartName(control).id;

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
            const expanded = this.state.expanded.includes(this.getControlId(deviceIndex, c));

            const controlProps = this.getControlProps(control);

            return [
                <div
                    key={`channel_${c}`}
                    style={{ ...styles.devSubLine, background }}
                >
                    <IconButton
                        style={styles.devSubLineExpand}
                        onClick={() => this.onExpand(deviceIndex, c)}
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
                    <div style={styles.devLineActions}>{renderChannelActions(control)}</div>
                    {this.renderNoMagic(control, dev)}
                    {this.renderSelectByOn(control)}
                    {this.renderSelectType(control, dev)}
                    {!dev.autoDetected ? (
                        <IconButton
                            aria-label="Edit"
                            style={styles.devLineEdit}
                            onClick={() => this.onEdit(id)}
                        >
                            <IconEdit style={{ width: 16, height: 16 }} />
                        </IconButton>
                    ) : (
                        <div style={styles.devLineEdit} />
                    )}
                    <IconButton
                        aria-label="Delete"
                        style={dev.autoDetected ? styles.devLineDelete : styles.devSubLineDelete}
                        onClick={() => this.onAskDelete(id)}
                    >
                        <IconDelete style={{ width: 16, height: 16 }} />
                    </IconButton>
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

    renderResetDialog(): React.JSX.Element | null {
        if (this.state.showResetId === null) {
            return null;
        }

        return (
            <SmartNameManageDialog
                socket={this.props.socket}
                objects={this.objects}
                namespace={this.namespace}
                noCommon={this.props.native.noCommon}
                dev={this.state.showResetId}
                language={this.language}
                themeType={this.props.themeType}
                onClose={(doInformBackend?: boolean) => {
                    this.setState({ showResetId: null }, () => {
                        if (doInformBackend) {
                            // inform backend
                            this.browse(true);
                        }
                    });
                }}
            />
        );
    }

    renderDeviceMenu(): React.JSX.Element | null {
        if (!this.state.showDeviceMenu) {
            return null;
        }

        return (
            <Menu
                open={!0}
                anchorEl={this.state.showDeviceMenu.el}
                onClose={() => this.setState({ showDeviceMenu: null })}
            >
                <MenuItem
                    onClick={() => {
                        const smartId = takeIdForSmartName(this.state.showDeviceMenu!.dev.controls[0]);
                        const smartName = smartId?.smartName as SmartNameObject;
                        this.setState({
                            showSelectId: {
                                predefinedName: smartName[this.language] || smartName.en || undefined,
                            },
                        });
                    }}
                >
                    <ListItemIcon>
                        <IconAdd />
                    </ListItemIcon>
                    <ListItemText>{I18n.t('Add state to current device')}</ListItemText>
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        // Find the control with maximal number of states and let it unchecked. All others will be checked
                        let max = 0;
                        let maxIndex = 0;
                        const resetDevices = [];
                        this.state.showDeviceMenu!.dev.controls.forEach((control, i) => {
                            const statesCount = Object.keys(control.states).filter(
                                stateName => control.states[stateName]?.id,
                            ).length;
                            if (statesCount > max) {
                                max = statesCount;
                                maxIndex = this.state.showDeviceMenu!.dev.controls.indexOf(control);
                            }
                            resetDevices[i] = true;
                        });
                        resetDevices[maxIndex] = false;

                        this.setState({
                            showResetId: this.state.showDeviceMenu!.dev,
                            showDeviceMenu: null,
                        });
                    }}
                >
                    <ListItemIcon>
                        <IconReset />
                    </ListItemIcon>
                    <ListItemText>{I18n.t('Edit smart names for device')}</ListItemText>
                </MenuItem>
            </Menu>
        );
    }

    renderDevice(dev: AlexaSH3DeviceDescription, deviceIndex: number, lineNumber: number): React.JSX.Element | null {
        // if (!dev.additionalApplianceDetails.group && dev.additionalApplianceDetails.nameModified) {
        const title = dev.friendlyName;
        // } else {
        //    title = <span style={styles.devModified} title={I18n.t('modified')}>{friendlyName}</span>;
        // }

        const expanded = this.state.expanded.includes(title);
        // take the very first ID
        const id = Object.values(dev.controls[0].states)[0]!.id;

        let background = lineNumber % 2 ? (this.props.themeType === 'dark' ? '#272727' : '#f1f1f1') : 'inherit';
        const changed = this.state.changed.includes(id);
        if (changed) {
            background = CHANGED_COLOR;
        } else if (id === this.state.lastChanged) {
            background = this.props.themeType === 'dark' ? LAST_CHANGED_COLOR_DARK : LAST_CHANGED_COLOR_LIGHT;
        }

        return [
            <div
                key={`line${deviceIndex}`}
                id={`line${deviceIndex}`}
                style={{ ...styles.devLine, background }}
            >
                <div style={styles.devLineNumber}>{lineNumber + 1}.</div>
                <IconButton
                    style={styles.devLineExpand}
                    onClick={() => this.onExpand(deviceIndex)}
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
                <span style={styles.devLineActions}>{renderDevTypes(dev)}</span>
                {!dev.autoDetected ? (
                    <IconButton onClick={e => this.setState({ showDeviceMenu: { dev, el: e.currentTarget } })}>
                        <IconMenu />
                    </IconButton>
                ) : null}
            </div>,
            expanded ? this.renderChannels(dev, deviceIndex) : null,
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
        const names = this.state.edit.name.split(',').map(n => n.trim());
        // All names must be unique
        const uniqueNames = new Set(names);
        if (uniqueNames.size < names.length) {
            this.state.edit.name = Array.from(uniqueNames).join(', ');
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
                            obj as ioBroker.StateObject,
                            editedSmartName,
                            undefined,
                            editedSmartType,
                            this.namespace,
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
                        ? renderSelectTypeSelector(
                              this.state.edit.type,
                              this.state.edit.typeWasDetected,
                              this.state.edit.possibleTypes,
                              value => {
                                  const edit = JSON.parse(JSON.stringify(this.state.edit));
                                  edit.type = value;
                                  this.setState({ edit });
                              },
                          )
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
        if (!this.state.showSelectId) {
            return null;
        }
        return (
            <DialogSelectID
                key="dialogSelectID1"
                imagePrefix="../.."
                theme={this.props.theme}
                socket={this.props.socket}
                selected=""
                types={['state']}
                onClose={() => this.setState({ showSelectId: null })}
                onOk={async (selected /* , name */): Promise<void> => {
                    this.setState({ showSelectId: null });
                    const selectedId = Array.isArray(selected) ? selected[0] : selected;

                    if (!selectedId) {
                        this.setState({ message: I18n.t('Invalid ID') });
                        return;
                    }
                    const obj = await this.props.socket.getObject(selectedId);
                    this.objects[selectedId] = obj; // remember for later
                    if (obj) {
                        const name = Utils.getObjectNameFromObj(obj, null, { language: this.language });
                        // special case for buttons
                        if (obj.common.role?.includes('button')) {
                            if (this.props.native.noCommon) {
                                obj.common.custom ||= {};
                                obj.common.custom[this.namespace] ||= {};
                                obj.common.custom[this.namespace].smartName = {
                                    smartType: 'button',
                                    [this.language]: name || I18n.t('Button'),
                                };
                                if (this.state.showSelectId?.predefinedName) {
                                    obj.common.custom[this.namespace].smartName[this.language] =
                                        this.state.showSelectId.predefinedName;
                                    obj.common.custom[this.namespace].smartName.noAutoDetect = true;
                                }
                            } else {
                                obj.common.smartName = {
                                    smartType: 'button',
                                    [this.language]: name || I18n.t('Button'),
                                };
                                if (this.state.showSelectId?.predefinedName) {
                                    obj.common.smartName[this.language] = this.state.showSelectId.predefinedName;
                                    obj.common.smartName.noAutoDetect = true;
                                }
                            }
                        } else {
                            const options: UpdateSmartNameOptions = {
                                smartName: (name || I18n.t('Device name')).replace(/[-_.]+/g, ' '),
                                instanceId: this.namespace,
                                noCommon: this.props.native.noCommon,
                            };
                            if (this.state.showSelectId?.predefinedName) {
                                options.noAutoDetect = true;
                                options.smartName = this.state.showSelectId.predefinedName;
                            }

                            updateSmartNameEx(obj as ioBroker.StateObject, options);
                        }
                        this.addChanged(obj._id);
                        if (!this.state.showSelectId?.predefinedName) {
                            this.waitForUpdateID = obj._id;
                        }

                        if (this.state.lastChanged !== obj._id) {
                            this.setState({ lastChanged: obj._id });
                            this.timerChanged && clearTimeout(this.timerChanged);
                            this.timerChanged = setTimeout(() => {
                                this.setState({ lastChanged: '' });
                                this.timerChanged = null;
                            }, 30000);
                        }

                        try {
                            await this.props.socket.setObject(obj._id, obj);
                            this.informInstance(obj._id);
                        } catch (err) {
                            this.setState({ message: err instanceof Error ? err.message : `${err}` });
                        }
                    } else {
                        this.setState({ message: I18n.t('Invalid ID') });
                    }
                }}
            />
        );
    }

    renderDevices(): React.JSX.Element {
        const filter = this.state.filter.toLowerCase();
        const result = [];
        if (this.state.sortBy === 'name') {
            for (let i = 0; i < this.state.devices.length; i++) {
                if (this.state.filter && !this.state.devices[i].friendlyName.toLowerCase().includes(filter)) {
                    continue;
                }
                result.push(this.renderDevice(this.state.devices[i], i, i));
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
        // sort by type
        const devicesByType: Record<string, (React.JSX.Element | null)[]> = {};
        this.state.devices.forEach((dev, i): void => {
            if (this.state.filter && !this.state.devices[i].friendlyName.toLowerCase().includes(filter)) {
                return;
            }
            const types: string[] = [];
            dev.controls.forEach(control => {
                if (control) {
                    const type = control?.type || 'unknown';
                    if (types.includes(type)) {
                        return;
                    }
                    types.push(type);
                    devicesByType[type] ||= [];
                    devicesByType[type].push(this.renderDevice(dev, i, devicesByType[type].length));
                }
            });
        });

        return (
            <div
                key="listDevicesByType"
                style={styles.columnDiv}
            >
                {Object.keys(devicesByType)
                    .sort()
                    .map(type => {
                        const Icon = DEVICES[type]?.icon || null;

                        return (
                            <Accordion
                                key={`type_${type}`}
                                expanded={this.state.expandedTypes.includes(type)}
                                onChange={() => this.onExpandType(type)}
                            >
                                <AccordionSummary style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                                    {Icon ? (
                                        <Icon
                                            style={{
                                                width: 24,
                                                height: 24,
                                                color: DEVICES[type]?.color,
                                                marginRight: 12,
                                            }}
                                        />
                                    ) : null}
                                    {I18n.t(type)}
                                </AccordionSummary>
                                <AccordionDetails style={{ paddingLeft: 20 }}>
                                    {devicesByType[type].map(dev => dev)}
                                </AccordionDetails>
                            </Accordion>
                        );
                    })}
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

    onExpandType(type: string) {
        const expandedTypes = [...this.state.expandedTypes];
        const index = expandedTypes.indexOf(type);
        if (index === -1) {
            expandedTypes.push(type);
        } else {
            expandedTypes.splice(index, 1);
        }
        this.setState({ expandedTypes });
        window.localStorage.setItem('v3.expandedTypes', JSON.stringify(expandedTypes));
    }

    render(): React.JSX.Element {
        if (this.state.loading) {
            return <CircularProgress key="alexaProgress" />;
        }

        return (
            <div
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
                    onClick={() => this.setState({ showSelectId: {} })}
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
                        const expandedTypes: string[] = [];
                        this.state.devices.forEach((dev, lineNum) => {
                            expanded.push(dev.friendlyName);
                            dev.controls.forEach((control, c) => {
                                expanded.push(this.getControlId(lineNum, c));
                                if (!expandedTypes.includes(control.type || 'unknown')) {
                                    expandedTypes.push(control.type || 'unknown');
                                }
                            });
                        });
                        window.localStorage.setItem('v3.expanded', JSON.stringify(expanded));
                        if (this.state.sortBy === 'type') {
                            window.localStorage.setItem('v3.expandedTypes', JSON.stringify(expandedTypes));
                            this.setState({ expanded, expandedTypes });
                        } else {
                            this.setState({ expanded });
                        }
                    }}
                >
                    <UnfoldMore />
                </IconButton>
                <IconButton
                    disabled={
                        !this.state.expanded.length &&
                        (this.state.sortBy === 'name' || !this.state.expandedTypes.length)
                    }
                    onClick={() => {
                        this.unsubscribeAll();
                        window.localStorage.removeItem('v3.expanded');
                        if (this.state.sortBy === 'type') {
                            window.localStorage.removeItem('v3.expandedTypes');
                            this.setState({ expanded: [], expandedTypes: [] });
                        } else {
                            this.setState({ expanded: [] });
                        }
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
                <Fab
                    style={{ ...styles.button, marginLeft: '1rem' }}
                    title={I18n.t('Sort by name/type')}
                    size="small"
                    onClick={() => {
                        window.localStorage.setItem('v3.sortBy', this.state.sortBy === 'name' ? 'type' : 'name');
                        this.setState({ sortBy: this.state.sortBy === 'name' ? 'type' : 'name' });
                    }}
                    disabled={this.state.browse || !this.state.alive}
                >
                    {this.state.sortBy === 'type' ? <IconByType /> : <IconByName />}
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
                {this.renderResetDialog()}
                {this.renderDevices()}
                {this.renderDeviceMenu()}
                {this.renderMessage()}
                {this.renderEditDialog()}
                {this.getSelectIdDialog()}
                {this.renderConfirmDialog()}
                {this.renderListOfDevices()}
            </div>
        );
    }
}
