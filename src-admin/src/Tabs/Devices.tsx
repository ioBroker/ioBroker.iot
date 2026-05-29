import React, { Component } from 'react';

import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    IconButton,
    InputAdornment,
    Switch,
    TextField,
    Tooltip,
    Button,
} from '@mui/material';
import {
    MdRefresh as IconRefresh,
    MdUnfoldMore as IconExpandAll,
    MdUnfoldLess as IconCollapseAll,
    MdExpandMore as IconExpand,
    MdClose as IconClose,
    MdSearch as IconSearch,
    MdCheck as IconCheck,
} from 'react-icons/md';

import { Utils, I18n, type IobTheme, type AdminConnection, Icon, DeviceTypeIcon } from '@iobroker/adapter-react-v5';
import ChannelDetector, { Types, type DetectOptions, type PatternControl } from '@iobroker/type-detector';

import type { IotAdapterConfig } from '../types';

const CHANGED_COLOR = '#e7000040';

const styles: Record<string, any> = {
    tab: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
    },
    toolbar: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 8px',
    },
    listWrap: {
        flex: 1,
        overflow: 'auto',
    },
    roomHeader: (theme: IobTheme): React.CSSProperties =>
        ({
            background: theme.palette.primary.light,
            color: theme.palette.primary.contrastText,
            minHeight: 40,
            alignItems: 'center',
            '& .MuiAccordionSummary-content': {
                margin: '8px 0',
                alignItems: 'center',
                display: 'flex',
            },
            '& .MuiAccordionSummary-content.Mui-expanded': {
                margin: '8px 0',
            },
        }) as React.CSSProperties,
    accordion: {
        '&:before': { display: 'none' },
        boxShadow: 'none',
        borderBottom: '1px solid rgba(0,0,0,0.08)',
    },
    accordionDetails: {
        padding: 0,
    },
    devLine: (theme: IobTheme) => ({
        minHeight: 48,
        width: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        padding: '0 8px',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        cursor: 'pointer',
        transition: 'background-color 120ms',
        '&:hover': {
            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
        },
    }),
    devName: {},
    devSubName: {
        fontStyle: 'italic',
        marginLeft: 4,
    },
    devId: {
        display: 'block',
        fontStyle: 'italic',
        fontSize: 12,
        opacity: 0.7,
    },
    devType: {
        marginLeft: 8,
        fontSize: 12,
        opacity: 0.7,
    },
    devIcon: {
        width: 24,
        height: 24,
        marginRight: 8,
        objectFit: 'contain',
    },
};

const IGNORE_INDICATORS = ['UNREACH_STICKY'];
const EXCLUDED_TYPES: Types[] = [Types.info];

// Hidden when the "Show all device types" toggle is off. Extendable later.
const HIDDEN_TYPES_BY_DEFAULT: ReadonlySet<Types> = new Set<Types>([Types.button]);
const STORAGE_KEY_SHOW_ALL_TYPES = 'iot.devices.showAllTypes';
const STORAGE_KEY_EXPANDED_ROOMS = 'iot.devices.expandedRooms';

function loadExpandedRooms(): Record<string, boolean> {
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY_EXPANDED_ROOMS);
        if (!raw) {
            return {};
        }
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? (parsed as Record<string, boolean>) : {};
    } catch {
        return {};
    }
}

function saveExpandedRooms(map: Record<string, boolean>): void {
    try {
        window.localStorage.setItem(STORAGE_KEY_EXPANDED_ROOMS, JSON.stringify(map));
    } catch {
        // localStorage may be full or disabled - ignore
    }
}

// Device types handled by the Alexa V3 backend (see src/lib/AlexaSmartHomeV3/Controls/index.ts).
const ALEXA_SUPPORTED_TYPES: ReadonlySet<Types> = new Set<Types>([
    Types.airCondition,
    Types.blind,
    Types.button,
    Types.ct,
    Types.dimmer,
    Types.door,
    Types.gate,
    Types.hue,
    Types.humidity,
    Types.light,
    Types.lock,
    Types.motion,
    Types.percentage,
    Types.rgb,
    Types.rgbSingle,
    Types.rgbwSingle,
    Types.slider,
    Types.socket,
    Types.temperature,
    Types.thermostat,
    Types.vacuumCleaner,
    Types.volume,
    Types.volumeGroup,
    Types.window,
]);

type AnyObj = ioBroker.AnyObject;
type ObjectForDetector = AnyObj & { name?: string };

interface DetectorDevice {
    _id: string;
    type: ioBroker.ObjectType;
    deviceType: Types;
    common: ioBroker.StateCommon;
    icon?: string | null;
    states: ObjectForDetector[];
    roomName?: string | ioBroker.StringOrTranslated;
}

interface RoomGroup {
    _id: string;
    common: ioBroker.EnumCommon | ioBroker.StateCommon;
    devices: DetectorDevice[];
}

interface DevicesProps {
    native: IotAdapterConfig;
    instance: number;
    adapterName: string;
    onError: (err: Error) => void;
    socket: AdminConnection;
}

interface DevicesState {
    loading: boolean;
    groups: RoomGroup[];
    changed: string[];
    inAction: boolean;
    expandedRooms: Record<string, boolean>;
    debugObject: { id: string; data: ioBroker.Object | null } | null;
    showAllTypes: boolean;
    search: string;
    pendingActivation: { device: DetectorDevice; name: string } | null;
}

const IS_DEBUG_PORT =
    typeof window !== 'undefined' && typeof window.location !== 'undefined' && window.location.port === '3000';

async function allObjects(socket: AdminConnection): Promise<Record<string, ObjectForDetector>> {
    const types: ioBroker.ObjectType[] = ['state', 'channel', 'device', 'folder', 'enum'];
    const result: Record<string, ObjectForDetector> = {};
    for (const t of types) {
        const part = await socket.getObjectViewSystem(t as any);
        if (part) {
            Object.assign(result, part);
        }
    }
    return result;
}

function getContrastColor(bg: string | undefined | null): string | null {
    if (!bg || typeof bg !== 'string') {
        return null;
    }
    let r = 0;
    let g = 0;
    let b = 0;
    if (bg.startsWith('#')) {
        const hex = bg.slice(1);
        if (hex.length === 3) {
            r = parseInt(hex[0] + hex[0], 16);
            g = parseInt(hex[1] + hex[1], 16);
            b = parseInt(hex[2] + hex[2], 16);
        } else if (hex.length >= 6) {
            r = parseInt(hex.slice(0, 2), 16);
            g = parseInt(hex.slice(2, 4), 16);
            b = parseInt(hex.slice(4, 6), 16);
        } else {
            return null;
        }
    } else if (bg.startsWith('rgb')) {
        const m = bg.match(/\d+(?:\.\d+)?/g);
        if (!m || m.length < 3) {
            return null;
        }
        r = parseInt(m[0], 10);
        g = parseInt(m[1], 10);
        b = parseInt(m[2], 10);
    } else {
        return null;
    }
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
        return null;
    }
    // YIQ-based perceived brightness
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128 ? '#000' : '#fff';
}

function getParentId(id: string): string {
    const parts = id.split('.');
    parts.pop();
    return parts.join('.');
}

// Walk up the parent chain of `channelId` searching for a `common.icon`,
// then resolve the icon to a URL (or return it as-is for data:/ http(s):/).
function searchIcon(channelId: string, objects: Record<string, AnyObj>): string | null {
    if (!objects || !channelId) {
        return null;
    }
    let icon: string | undefined | null = null;

    if (channelId.split('.').length > 2) {
        const channelObj = objects[channelId];
        if (
            channelObj &&
            (channelObj.type === 'channel' || channelObj.type === 'device' || channelObj.type === 'state')
        ) {
            if (channelObj.common?.icon) {
                icon = channelObj.common.icon;
            } else {
                const deviceId = getParentId(channelId);
                if (deviceId && deviceId.split('.').length > 2) {
                    const arrayParent = deviceId.split('.');
                    let parentId: string | null = deviceId;
                    for (let i = 0; i < arrayParent.length - 2; i++) {
                        if (!parentId) {
                            break;
                        }
                        const deviceObj = objects[parentId];
                        if (deviceObj && (deviceObj.type === 'channel' || deviceObj.type === 'device')) {
                            if (deviceObj.common?.icon) {
                                icon = deviceObj.common.icon;
                                break;
                            }
                        }
                        parentId = getParentId(parentId);
                    }
                }
            }
        }
    }

    if (!icon) {
        return null;
    }

    const imagePrefix = '../..';
    const cIcon = icon;
    const id = channelId;

    if (cIcon.includes('.') && !cIcon.includes('data:image/')) {
        let instance: string[];
        const o = objects[id];
        if (o?.type === 'instance' || o?.type === 'adapter') {
            return `${imagePrefix}/adapter/${(o.common as any).name}/${cIcon}`;
        }
        if (id.startsWith('system.adapter.')) {
            instance = id.split('.', 3);
            instance[2] += cIcon[0] === '/' ? cIcon : `/${cIcon}`;
            return `${imagePrefix}/adapter/${instance[2]}`;
        }
        instance = id.split('.', 2);
        instance[0] += cIcon[0] === '/' ? cIcon : `/${cIcon}`;
        return `${imagePrefix}/adapter/${instance[0]}`;
    }

    return icon;
}

export default class Devices extends Component<DevicesProps, DevicesState> {
    private readonly namespace = `${this.props.adapterName}.${this.props.instance}`;

    private allObjectsMap: Record<string, ObjectForDetector> = {};

    constructor(props: DevicesProps) {
        super(props);
        this.state = {
            loading: true,
            groups: [],
            changed: [],
            inAction: false,
            expandedRooms: loadExpandedRooms(),
            debugObject: null,
            showAllTypes: window.localStorage.getItem(STORAGE_KEY_SHOW_ALL_TYPES) === 'true',
            search: '',
            pendingActivation: null,
        };
    }

    componentDidMount(): void {
        void this.detect();
    }

    addChanged(id: string): void {
        if (!this.state.changed.includes(id)) {
            this.setState({ changed: [...this.state.changed, id] });
        }
    }

    removeChanged(id: string): void {
        const pos = this.state.changed.indexOf(id);
        if (pos !== -1) {
            const copy = [...this.state.changed];
            copy.splice(pos, 1);
            this.setState({ changed: copy });
        }
    }

    async detect(): Promise<void> {
        this.setState({ loading: true });
        try {
            this.allObjectsMap = await allObjects(this.props.socket);
            const groups = this.detectDevices(this.allObjectsMap);
            const expandedRooms: Record<string, boolean> = {};
            groups.forEach(g => {
                expandedRooms[g._id] = this.state.expandedRooms[g._id] ?? true;
            });
            saveExpandedRooms(expandedRooms);
            this.setState({ groups, loading: false, expandedRooms });
        } catch (err) {
            this.props.onError(err as Error);
            this.setState({ loading: false });
        }
    }

    setAllExpanded(expanded: boolean): void {
        const expandedRooms: Record<string, boolean> = {};
        this.state.groups.forEach(g => {
            expandedRooms[g._id] = expanded;
        });
        saveExpandedRooms(expandedRooms);
        this.setState({ expandedRooms });
    }

    isDeviceVisible(d: DetectorDevice): boolean {
        if (!this.state.showAllTypes && HIDDEN_TYPES_BY_DEFAULT.has(d.deviceType)) {
            return false;
        }
        const q = this.state.search.trim().toLowerCase();
        if (!q) {
            return true;
        }
        if (d._id.toLowerCase().includes(q)) {
            return true;
        }
        if ((d.deviceType as string).toLowerCase().includes(q)) {
            return true;
        }
        if (this.deviceName(d).toLowerCase().includes(q)) {
            return true;
        }
        if (this.smartNameLabel(d).toLowerCase().includes(q)) {
            return true;
        }
        return false;
    }

    visibleGroups(): RoomGroup[] {
        const noTypeFilter = this.state.showAllTypes;
        const noSearch = !this.state.search.trim();
        if (noTypeFilter && noSearch) {
            return this.state.groups;
        }
        return this.state.groups
            .map(g => ({ ...g, devices: g.devices.filter(d => this.isDeviceVisible(d)) }))
            .filter(g => g.devices.length > 0);
    }

    setShowAllTypes(value: boolean): void {
        window.localStorage.setItem(STORAGE_KEY_SHOW_ALL_TYPES, value ? 'true' : 'false');
        this.setState({ showAllTypes: value });
    }

    async openDebug(stateId: string): Promise<void> {
        try {
            const data = (await this.props.socket.getObject(stateId)) as ioBroker.Object | null;
            this.setState({ debugObject: { id: stateId, data } });
        } catch (err) {
            this.props.onError(err as Error);
        }
    }

    detectDevices(devicesObject: Record<string, ObjectForDetector>): RoomGroup[] {
        const keys = Object.keys(devicesObject).sort();
        const detector = new ChannelDetector();

        const usedIds: string[] = [];
        const enums: string[] = [];
        const rooms: string[] = [];
        const list: string[] = [];

        keys.forEach(id => {
            if (devicesObject[id]?.type === 'enum') {
                enums.push(id);
            } else if ((devicesObject[id]?.common as ioBroker.StateCommon)?.smartName) {
                list.push(id);
            }
        });

        enums.forEach(id => {
            if (id.startsWith('enum.rooms.')) {
                rooms.push(id);
            }
            const members = (devicesObject[id].common as ioBroker.EnumCommon).members;
            if (members?.length) {
                members.forEach(member => {
                    if (devicesObject[member] && !list.includes(member)) {
                        list.push(member);
                    }
                });
            }
        });

        const options: DetectOptions = {
            id: '',
            objects: devicesObject as Record<string, ioBroker.Object>,
            _keysOptional: keys,
            _usedIdsOptional: usedIds,
            ignoreIndicators: IGNORE_INDICATORS,
            excludedTypes: EXCLUDED_TYPES,
        };

        const results: RoomGroup[] = [];

        list.forEach(id => {
            options.id = id;
            const controls = detector.detect(options);
            if (!controls) {
                return;
            }
            for (const control of controls) {
                // Skip device types the Alexa V3 backend cannot handle.
                if (!ALEXA_SUPPORTED_TYPES.has(control.type)) {
                    continue;
                }
                const primaryState = control.states.find(s => s.id);
                if (!primaryState) {
                    continue;
                }
                const stateId = primaryState.id;

                // already added?
                if (results.find(g => g.devices.find(d => d.states.find(s => s._id === stateId)))) {
                    continue;
                }

                const deviceObject: DetectorDevice = {
                    _id: stateId,
                    type: devicesObject[stateId].type,
                    deviceType: control.type,
                    common: devicesObject[stateId].common as ioBroker.StateCommon,
                    states: control.states
                        .filter(s => s.id)
                        .map(s => {
                            devicesObject[s.id].name = s.name;
                            (devicesObject[s.id].common as ioBroker.StateCommon).role =
                                s.defaultRole ?? (devicesObject[s.id].common as ioBroker.StateCommon).role;
                            return devicesObject[s.id];
                        }),
                };

                // Find channel / device id
                const parts = stateId.split('.');
                let channelId: string | null = null;
                let deviceId: string | null = null;
                if (devicesObject[stateId].type === 'channel' || devicesObject[stateId].type === 'state') {
                    parts.pop();
                    channelId = parts.join('.');
                    if (
                        devicesObject[channelId] &&
                        (devicesObject[channelId].type === 'channel' || devicesObject[channelId].type === 'folder')
                    ) {
                        parts.pop();
                        deviceId = parts.join('.');
                        if (
                            !devicesObject[deviceId] ||
                            (devicesObject[deviceId].type !== 'device' && devicesObject[deviceId].type !== 'folder')
                        ) {
                            deviceId = null;
                        }
                    } else {
                        channelId = null;
                    }
                }

                // Find a room enum that contains stateId / channelId / deviceId
                const room = rooms.find(roomId => {
                    const members = (devicesObject[roomId].common as ioBroker.EnumCommon).members || [];
                    if (members.includes(stateId)) {
                        return true;
                    }
                    if (channelId && members.includes(channelId)) {
                        return true;
                    }
                    return !!deviceId && members.includes(deviceId);
                });

                let roomGroup: RoomGroup | undefined;
                if (room) {
                    roomGroup = results.find(g => g._id === room);
                    if (!roomGroup) {
                        roomGroup = {
                            _id: room,
                            common: devicesObject[room].common as ioBroker.EnumCommon,
                            devices: [],
                        };
                        results.push(roomGroup);
                    }
                } else {
                    roomGroup = results.find(g => g._id === 'unknown');
                    if (!roomGroup) {
                        roomGroup = {
                            _id: 'unknown',
                            common: { name: I18n.t('Without room'), icon: '?' } as unknown as ioBroker.StateCommon,
                            devices: [],
                        };
                        results.push(roomGroup);
                    }
                }
                deviceObject.roomName = (roomGroup.common as ioBroker.StateCommon).name;

                // resolve display name + icon from parent channel/device
                this.resolveDeviceDisplay(deviceObject, devicesObject);

                roomGroup.devices.push(deviceObject);
                // Take only first device
                break;
            }
        });

        // sort: known rooms first, "unknown" last; devices sorted by name
        results.sort((a, b) => {
            if (a._id === 'unknown') {
                return 1;
            }
            if (b._id === 'unknown') {
                return -1;
            }
            const an = Utils.getObjectNameFromObj(
                { _id: a._id, common: a.common, type: 'enum' } as ioBroker.EnumObject,
                null,
                { language: I18n.getLanguage() },
            );
            const bn = Utils.getObjectNameFromObj(
                { _id: b._id, common: b.common, type: 'enum' } as ioBroker.EnumObject,
                null,
                { language: I18n.getLanguage() },
            );
            return an.localeCompare(bn);
        });
        for (const g of results) {
            g.devices.sort((a, b) => {
                const an = this.deviceName(a);
                const bn = this.deviceName(b);
                return an.localeCompare(bn);
            });
        }

        return results;
    }

    resolveDeviceDisplay(deviceObj: DetectorDevice, devicesObject: Record<string, ObjectForDetector>): void {
        // Find a better display name by walking up to channel/device parent.
        if (deviceObj.type === 'state' || deviceObj.type === 'channel') {
            const idArr = deviceObj._id.split('.');
            idArr.pop();
            const parent = devicesObject[idArr.join('.')];
            if (parent?.common?.name) {
                deviceObj.common = { ...deviceObj.common, name: parent.common.name as any };
            }
            if (parent && (parent.type === 'channel' || parent.type === 'device' || parent.type === 'folder')) {
                idArr.pop();
                const grand = devicesObject[idArr.join('.')];
                if (grand?.type === 'device' && grand.common?.name) {
                    deviceObj.common = { ...deviceObj.common, name: grand.common.name as any };
                }
            }
        }

        // Find icon by walking up the parent chain.
        deviceObj.icon = searchIcon(deviceObj._id, devicesObject);
    }

    deviceName(d: DetectorDevice): string {
        return Utils.getObjectNameFromObj(
            { _id: d._id, common: d.common, type: 'state' } as ioBroker.StateObject,
            null,
            { language: I18n.getLanguage() },
        );
    }

    // Mirrors the backend logic in src/lib/AlexaSmartHomeV3/Helpers/Utils.ts:isValidSmartName.
    // Enabled only when smartName is explicitly set to a usable name —
    // false / 'ignore' / undefined / null / {} (no language key) all count as disabled.
    isEnabled(d: DetectorDevice): boolean {
        const sn = Utils.getSmartNameFromObj(
            { _id: d._id, common: d.common, type: 'state' } as ioBroker.StateObject,
            this.namespace,
            this.props.native.noCommon,
        );
        if (sn === false || sn === undefined || sn === null || (sn as unknown) === 'ignore') {
            return false;
        }
        if (typeof sn === 'object') {
            const lang = I18n.getLanguage();
            const name = (sn as Record<string, unknown>)[lang] ?? (sn as any).en ?? (sn as any).de;
            return name !== null && name !== undefined && name !== 'ignore' && (name as unknown) !== false;
        }
        return true;
    }

    smartNameLabel(d: DetectorDevice): string {
        if (!this.isEnabled(d)) {
            return '';
        }
        let sn = Utils.getSmartNameFromObj(
            { _id: d._id, common: d.common, type: 'state' } as ioBroker.StateObject,
            this.namespace,
            this.props.native.noCommon,
        );
        if (sn && typeof sn === 'object') {
            sn = sn[I18n.getLanguage()] || sn.en || '';
        }
        return (sn as string) || '';
    }

    toggleDevice(d: DetectorDevice): void {
        if (this.isEnabled(d)) {
            // Deactivation is unambiguous - persist immediately.
            void this.persistSmartName(d, null);
        } else {
            // Activation requires the user to confirm / pick a name.
            this.setState({
                pendingActivation: { device: d, name: this.deviceName(d) || d._id },
            });
        }
    }

    async confirmActivation(): Promise<void> {
        const pending = this.state.pendingActivation;
        if (!pending) {
            return;
        }
        const name = pending.name.trim();
        if (!name) {
            return;
        }
        this.setState({ pendingActivation: null });
        await this.persistSmartName(pending.device, name);
    }

    async persistSmartName(d: DetectorDevice, name: string | null): Promise<void> {
        const stateId = d._id;
        const currentObj = (await this.props.socket.getObject(stateId)) as ioBroker.StateObject | null;
        if (!currentObj) {
            return;
        }
        const updated: ioBroker.StateObject = JSON.parse(JSON.stringify(currentObj));
        if (name === null) {
            Utils.disableSmartName(updated, this.namespace, this.props.native.noCommon);
        } else {
            Utils.updateSmartNameEx(updated, {
                smartName: name,
                instanceId: this.namespace,
                noCommon: this.props.native.noCommon,
            });
        }
        this.addChanged(stateId);
        try {
            await this.props.socket.setObject(stateId, updated);
            // mirror into local map so UI reflects state without full re-detect
            if (this.allObjectsMap[stateId]) {
                this.allObjectsMap[stateId].common = updated.common as any;
                d.common = updated.common as ioBroker.StateCommon;
                this.forceUpdate();
            }
            void this.props.socket.sendTo(this.namespace, 'update', stateId);
        } catch (err) {
            this.props.onError(err as Error);
        }
        setTimeout(() => this.removeChanged(stateId), 500);
    }

    renderHeaderToolbar(visible: RoomGroup[]): React.JSX.Element {
        const visibleDevices = visible.flatMap(g => g.devices);
        const total = visibleDevices.length;
        const totalEnabled = visibleDevices.filter(d => this.isEnabled(d)).length;

        return (
            <div style={styles.toolbar}>
                <span style={{ fontWeight: 'bold' }}>
                    {I18n.t('Devices')}: {total}
                </span>
                <span style={{ opacity: 0.7 }}>
                    ({I18n.t('Enabled')}: {totalEnabled})
                </span>
                <div style={{ flex: 1 }} />
                <TextField
                    variant="standard"
                    size="small"
                    placeholder={I18n.t('Search')}
                    value={this.state.search}
                    onChange={e => this.setState({ search: e.target.value })}
                    sx={{ minWidth: 180 }}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <IconSearch />
                                </InputAdornment>
                            ),
                            endAdornment: this.state.search ? (
                                <InputAdornment position="end">
                                    <IconButton
                                        size="small"
                                        onClick={() => this.setState({ search: '' })}
                                        edge="end"
                                    >
                                        <IconClose fontSize="small" />
                                    </IconButton>
                                </InputAdornment>
                            ) : null,
                        },
                    }}
                />
                <FormControlLabel
                    sx={{ marginRight: 1 }}
                    control={
                        <Switch
                            checked={this.state.showAllTypes}
                            onChange={e => this.setShowAllTypes(e.target.checked)}
                        />
                    }
                    label={I18n.t('Show all device types')}
                />
                <Tooltip title={I18n.t('Re-detect devices')}>
                    <span>
                        <IconButton
                            onClick={() => void this.detect()}
                            disabled={this.state.loading}
                        >
                            <IconRefresh />
                        </IconButton>
                    </span>
                </Tooltip>
                <Tooltip title={I18n.t('Expand all')}>
                    <span>
                        <IconButton
                            onClick={() => this.setAllExpanded(true)}
                            disabled={!visible.length}
                        >
                            <IconExpandAll />
                        </IconButton>
                    </span>
                </Tooltip>
                <Tooltip title={I18n.t('Collapse all')}>
                    <span>
                        <IconButton
                            onClick={() => this.setAllExpanded(false)}
                            disabled={!visible.length}
                        >
                            <IconCollapseAll />
                        </IconButton>
                    </span>
                </Tooltip>
            </div>
        );
    }

    renderDevice(d: DetectorDevice): React.JSX.Element {
        const sn = this.smartNameLabel(d);
        const enabled = this.isEnabled(d);
        const name = this.deviceName(d);
        const changed = this.state.changed.includes(d._id);
        const clickable = IS_DEBUG_PORT;
        return (
            <Box
                key={d._id}
                sx={theme => {
                    const base = (styles.devLine as (t: IobTheme) => any)(theme as unknown as IobTheme);
                    return {
                        ...base,
                        backgroundColor: changed ? CHANGED_COLOR : undefined,
                        cursor: clickable ? 'pointer' : 'default',
                    };
                }}
                onClick={clickable ? () => void this.openDebug(d._id) : undefined}
                title={clickable ? I18n.t('Click to show object (debug)') : undefined}
            >
                <DeviceTypeIcon
                    type={d.deviceType}
                    src={d.icon || undefined}
                    style={styles.devIcon}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ ...styles.devName, opacity: enabled ? 1 : 0.5 }}>
                        {sn ? <>{sn}</> : null}
                        {sn ? <span style={styles.devSubName}> ({name})</span> : name}
                        <span style={styles.devType}>[{d.deviceType}]</span>
                    </span>
                    <span style={{ ...styles.devId, opacity: enabled ? 1 : 0.5 }}>{d._id}</span>
                </div>
                <Switch
                    checked={enabled}
                    onClick={e => e.stopPropagation()}
                    onChange={() => void this.toggleDevice(d)}
                />
            </Box>
        );
    }

    renderRoom(g: RoomGroup): React.JSX.Element {
        const name =
            g._id === 'unknown'
                ? (g.common as ioBroker.StateCommon).name
                : Utils.getObjectNameFromObj(
                      { _id: g._id, common: g.common, type: 'enum' } as ioBroker.EnumObject,
                      null,
                      { language: I18n.getLanguage() },
                  );
        const expanded = !!this.state.expandedRooms[g._id];
        const icon = Utils.getObjectIcon(g);
        const color = (g.common as ioBroker.EnumCommon)?.color;
        const contrast = getContrastColor(color);

        return (
            <Accordion
                key={g._id}
                sx={styles.accordion}
                disableGutters
                expanded={expanded}
                onChange={(_e, isExpanded) => {
                    const expandedRooms = { ...this.state.expandedRooms, [g._id]: isExpanded };
                    saveExpandedRooms(expandedRooms);
                    this.setState({ expandedRooms });
                }}
            >
                <AccordionSummary
                    sx={theme => {
                        const base = (styles.roomHeader as (t: IobTheme) => React.CSSProperties)(
                            theme as unknown as IobTheme,
                        );
                        return {
                            ...base,
                            backgroundColor: color || (base as any).background,
                            color: contrast || (base as any).color,
                            '& .MuiSvgIcon-root': { color: contrast || (base as any).color },
                        };
                    }}
                    expandIcon={<IconExpand />}
                >
                    {icon ? (
                        <Icon
                            src={icon}
                            style={{
                                width: 22,
                                height: 22,
                                marginRight: 8,
                                objectFit: 'contain',
                                filter:
                                    contrast === '#fff'
                                        ? 'drop-shadow(0 0 1px rgba(0,0,0,0.6))'
                                        : 'drop-shadow(0 0 1px rgba(255,255,255,0.6))',
                            }}
                            styleUTF8={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 22,
                                height: 22,
                                marginTop: 0,
                                marginRight: 8,
                                fontSize: 16,
                                fontWeight: 'bold',
                                lineHeight: 1,
                            }}
                        />
                    ) : null}
                    <span style={{ flex: 1, fontWeight: 600 }}>
                        {name as string} ({g.devices.filter(d => this.isEnabled(d)).length}/{g.devices.length})
                    </span>
                </AccordionSummary>
                <AccordionDetails sx={styles.accordionDetails}>
                    {g.devices.map(d => this.renderDevice(d))}
                </AccordionDetails>
            </Accordion>
        );
    }

    renderActivationDialog(): React.JSX.Element | null {
        const pending = this.state.pendingActivation;
        if (!pending) {
            return null;
        }
        const trimmedName = pending.name.trim();
        return (
            <Dialog
                open
                maxWidth="sm"
                fullWidth
                onClose={() => this.setState({ pendingActivation: null })}
            >
                <DialogTitle>{I18n.t('Activate device')}</DialogTitle>
                <DialogContent>
                    <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>{pending.device._id}</div>
                    <TextField
                        autoFocus
                        fullWidth
                        variant="standard"
                        margin="normal"
                        label={I18n.t('Smart name')}
                        helperText={I18n.t('You can enter several names divided by comma')}
                        value={pending.name}
                        onChange={e =>
                            this.setState({
                                pendingActivation: { device: pending.device, name: e.target.value },
                            })
                        }
                        onKeyDown={e => {
                            if (e.key === 'Enter' && trimmedName) {
                                void this.confirmActivation();
                            }
                        }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<IconCheck />}
                        disabled={!trimmedName}
                        onClick={() => void this.confirmActivation()}
                    >
                        {I18n.t('Ok')}
                    </Button>
                    <Button
                        variant="outlined"
                        color="grey"
                        startIcon={<IconClose />}
                        onClick={() => this.setState({ pendingActivation: null })}
                    >
                        {I18n.t('Cancel')}
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }

    renderDebugDialog(): React.JSX.Element | null {
        if (!this.state.debugObject) {
            return null;
        }
        const { id, data } = this.state.debugObject;
        return (
            <Dialog
                open
                maxWidth="md"
                fullWidth
                onClose={() => this.setState({ debugObject: null })}
            >
                <DialogTitle>{id}</DialogTitle>
                <DialogContent>
                    <pre
                        style={{
                            fontFamily:
                                'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
                            fontSize: 12,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-all',
                            margin: 0,
                        }}
                    >
                        {JSON.stringify(data, null, 2)}
                    </pre>
                </DialogContent>
                <DialogActions>
                    <Button
                        variant="outlined"
                        startIcon={<IconClose />}
                        onClick={() => this.setState({ debugObject: null })}
                    >
                        {I18n.t('Close')}
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }

    render(): React.JSX.Element {
        if (this.state.loading) {
            return (
                <div style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <CircularProgress size={24} />
                    <span>{I18n.t('Detecting devices...')}</span>
                </div>
            );
        }
        if (!this.state.groups.length) {
            return (
                <div style={{ padding: 20 }}>
                    <p>{I18n.t('No devices detected.')}</p>
                    <Button
                        variant="outlined"
                        startIcon={<IconRefresh />}
                        onClick={() => void this.detect()}
                    >
                        {I18n.t('Re-detect devices')}
                    </Button>
                </div>
            );
        }
        const visible = this.visibleGroups();
        return (
            <div style={styles.tab}>
                {this.renderHeaderToolbar(visible)}
                <div style={styles.listWrap}>{visible.map(g => this.renderRoom(g))}</div>
                {this.renderActivationDialog()}
                {this.renderDebugDialog()}
            </div>
        );
    }
}
