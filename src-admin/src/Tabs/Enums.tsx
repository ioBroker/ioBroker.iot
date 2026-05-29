import React, { Component } from 'react';

import {
    TextField,
    Button,
    IconButton,
    Switch,
    Dialog,
    CircularProgress,
    DialogTitle,
    DialogContent,
    DialogActions,
    Box,
} from '@mui/material';

import { MdEdit as IconEdit } from 'react-icons/md';
import { Close as IconClose, Check as IconCheck } from '@mui/icons-material';

import { Utils, I18n, DialogMessage, type IobTheme, type AdminConnection } from '@iobroker/adapter-react-v5';
import type { IotAdapterConfig } from '../types';

const CHANGED_COLOR = '#e7000040';

const styles: Record<string, any> = {
    tab: {
        width: '100%',
        height: '100%',
    },
    column: {
        display: 'inline-block',
        verticalAlign: 'top',
        marginRight: 10,
        height: '100%',
        overflow: 'hidden',
        width: 'calc(50% - 20px)',
        minWidth: 300,
        maxWidth: 450,
    },
    columnDiv: {
        height: 'calc(100% - 40px)',
        overflow: 'auto',
        minWidth: 300,
    },
    enumLineEnabled: {
        // position: 'absolute',
        // right: 0,
        // top: 0,
    },
    enumLineEdit: {
        // float: 'right'
        // position: 'absolute',
        // top: 5,
        // right: 50,
    },
    enumLineName: {},
    enumLineSubName: {
        fontStyle: 'italic',
    },
    enumLine: {
        height: 48,
        width: '100%',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
    },
    enumLineId: {
        display: 'block',
        fontStyle: 'italic',
        fontSize: 12,
    },
    columnHeader: (theme: IobTheme): React.CSSProperties => ({
        background: theme.palette.primary.light,
        padding: '10px',
        color: theme.palette.primary.contrastText,
        marginTop: 0,
        marginBottom: 0,
    }),
};

interface EnumsProps {
    native: IotAdapterConfig;
    instance: number;
    adapterName: string;
    onError: (err: Error) => void;
    socket: AdminConnection;
    title?: string;
}

interface EnumsState {
    inAction: boolean;
    editId: string;
    editedSmartName: string;
    funcs: ioBroker.EnumObject[];
    rooms: ioBroker.EnumObject[];
    changed: string[];
    message: string;
    loading: boolean;
}

export default class Enums extends Component<EnumsProps, EnumsState> {
    constructor(props: EnumsProps) {
        super(props);

        this.state = {
            inAction: false,
            editId: '',
            editedSmartName: '',
            funcs: [],
            rooms: [],
            changed: [],
            message: '',
            loading: true,
        };
    }

    async componentDidMount(): Promise<void> {
        const res = await this.props.socket.getEnums('', true);
        const funcs: ioBroker.EnumObject[] = [];
        const rooms: ioBroker.EnumObject[] = [];
        if (res) {
            Object.keys(res).forEach(id => {
                if (id.match(/^enum\.rooms\./)) {
                    rooms.push(res[id]);
                } else if (id.match(/^enum\.functions\./)) {
                    funcs.push(res[id]);
                }
            });
        }

        this.setState({ funcs, rooms, loading: false });
        return this.props.socket.subscribeObject('enum.*', this.onEnumUpdate);
    }

    componentWillUnmount(): void {
        void this.props.socket.unsubscribeObject('enum.*', this.onEnumUpdate).then(() => {});
    }

    onEnumUpdate = (id: string, obj: ioBroker.Object | null | undefined): void => {
        this.removeChanged(id);
        this.updateObjInState(id, obj as ioBroker.EnumObject | null | undefined);
    };

    informInstance(id: string): void {
        void this.props.socket.sendTo(`${this.props.adapterName}.${this.props.instance}`, 'update', id);
    }

    addChanged(id: string): void {
        const changed = JSON.parse(JSON.stringify(this.state.changed));
        if (!changed.includes(id)) {
            changed.push(id);
            this.setState({ changed });
        }
    }

    removeChanged(id: string): void {
        const changed = JSON.parse(JSON.stringify(this.state.changed));
        const pos = changed.indexOf(id);

        if (pos !== -1) {
            changed.splice(pos, 1);
            this.setState({ changed });
        }
    }

    updateObjInState(id: string, obj: ioBroker.EnumObject | null | undefined): void {
        // update obj
        if (id.match(/^enum\.functions\./)) {
            for (let i = this.state.funcs.length - 1; i >= 0; i--) {
                if (this.state.funcs[i]._id === id) {
                    const funcs: ioBroker.EnumObject[] = JSON.parse(JSON.stringify(this.state.funcs));
                    if (obj) {
                        funcs[i] = obj;
                    } else {
                        funcs.splice(i, 1);
                    }
                    this.setState({ funcs });
                    break;
                }
            }
        } else if (id.match(/^enum\.rooms\./)) {
            for (let i = this.state.rooms.length - 1; i >= 0; i--) {
                if (this.state.rooms[i]._id === id) {
                    const rooms: ioBroker.EnumObject[] = JSON.parse(JSON.stringify(this.state.rooms));
                    if (obj) {
                        rooms[i] = obj;
                    } else {
                        rooms.splice(i, 1);
                    }
                    this.setState({ rooms });
                    break;
                }
            }
        }
    }

    isEnumEnabled(obj: ioBroker.EnumObject): boolean {
        const smartName = Utils.getSmartNameFromObj(
            obj as unknown as ioBroker.StateObject,
            `${this.props.adapterName}.${this.props.instance}`,
            this.props.native.noCommon,
        );
        return smartName !== false;
    }

    getColumnState(name: 'funcs' | 'rooms'): 'all' | 'none' | 'partial' {
        const items = this.state[name];
        if (!items.length) {
            return 'none';
        }
        let enabled = 0;
        for (const obj of items) {
            if (this.isEnumEnabled(obj)) {
                enabled++;
            }
        }
        if (enabled === 0) {
            return 'none';
        }
        if (enabled === items.length) {
            return 'all';
        }
        return 'partial';
    }

    async onToggleAllEnums(name: 'funcs' | 'rooms'): Promise<void> {
        const state = this.getColumnState(name);
        const shouldEnable = state !== 'all';
        const items = this.state[name];
        const namespace = `${this.props.adapterName}.${this.props.instance}`;
        const noCommon = this.props.native.noCommon;
        const DELAY_MS = 100;

        this.setState({ inAction: true });

        let first = true;
        for (const orig of items) {
            const isCurrentlyEnabled = this.isEnumEnabled(orig);
            if (isCurrentlyEnabled === shouldEnable) {
                continue;
            }
            if (!first) {
                await new Promise<void>(resolve => setTimeout(resolve, DELAY_MS));
            }
            first = false;

            const obj: ioBroker.EnumObject = JSON.parse(JSON.stringify(orig));
            if (shouldEnable) {
                Utils.removeSmartName(obj as unknown as ioBroker.StateObject, namespace, noCommon);
            } else {
                Utils.disableSmartName(obj as unknown as ioBroker.StateObject, namespace, noCommon);
            }

            this.addChanged(obj._id);
            try {
                await this.props.socket.setObject(obj._id, obj);
                this.updateObjInState(obj._id, obj);
                this.informInstance(obj._id);
            } catch (err) {
                this.props.onError(err as Error);
            }
            const changedId = obj._id;
            setTimeout(() => this.removeChanged(changedId), 500);
        }

        this.setState({ inAction: false });
    }

    onToggleEnum(id: string): void {
        let obj: ioBroker.EnumObject | undefined =
            this.state.funcs.find(e => e._id === id) || this.state.rooms.find(e => e._id === id);

        if (!obj) {
            return;
        }
        const smartName = Utils.getSmartNameFromObj(
            obj as unknown as ioBroker.StateObject,
            `${this.props.adapterName}.${this.props.instance}`,
            this.props.native.noCommon,
        );
        obj = JSON.parse(JSON.stringify(obj));
        if (smartName !== false) {
            Utils.disableSmartName(
                obj as unknown as ioBroker.StateObject,
                `${this.props.adapterName}.${this.props.instance}`,
                this.props.native.noCommon,
            );
        } else {
            Utils.removeSmartName(
                obj as unknown as ioBroker.StateObject,
                `${this.props.adapterName}.${this.props.instance}`,
                this.props.native.noCommon,
            );
        }

        this.addChanged(id);

        void this.props.socket.setObject(id, obj!).then(() => {
            // update obj
            this.updateObjInState(id, obj! as ioBroker.EnumObject | null | undefined);
            this.informInstance(id);

            setTimeout(() => this.removeChanged(id), 500);
        });
    }

    onEdit(id: string): void {
        const obj = this.state.funcs.find(e => e._id === id) || this.state.rooms.find(e => e._id === id);

        if (!obj) {
            return;
        }
        let smartName = Utils.getSmartNameFromObj(
            obj as unknown as ioBroker.StateObject,
            `${this.props.adapterName}.${this.props.instance}`,
            this.props.native.noCommon,
        );
        if (typeof smartName === 'object' && smartName) {
            smartName = smartName[I18n.getLanguage()] || smartName.en;
        }
        smartName ||= Utils.getObjectNameFromObj(obj, null, { language: I18n.getLanguage() });
        this.setState({ editId: id, editedSmartName: smartName });
    }

    renderEnum(obj: ioBroker.EnumObject): React.JSX.Element {
        let smartName = Utils.getSmartNameFromObj(
            obj as unknown as ioBroker.StateObject,
            `${this.props.adapterName}.${this.props.instance}`,
            this.props.native.noCommon,
        );
        // convert an old format
        if (smartName && typeof smartName === 'object') {
            smartName = smartName[I18n.getLanguage()] || smartName.en || '';
        }
        const name = Utils.getObjectNameFromObj(obj, null, { language: I18n.getLanguage() });

        return (
            <div
                key={obj._id}
                style={{
                    ...styles.enumLine,
                    background: this.state.changed.indexOf(obj._id) !== -1 ? CHANGED_COLOR : 'inherit',
                }}
            >
                <div style={{ marginLeft: 8 }}>
                    <span style={{ ...styles.enumLineName, opacity: smartName === false ? 0.5 : 1 }}>
                        {smartName || null}
                        {smartName ? <span style={styles.enumLineSubName}> ({name})</span> : name}
                    </span>
                    <span style={{ ...styles.enumLineId, opacity: smartName === false ? 0.5 : 1 }}>{obj._id}</span>
                </div>
                <div style={{ flex: 1 }} />
                <IconButton
                    aria-label="Edit"
                    style={styles.enumLineEdit}
                    onClick={() => this.onEdit(obj._id)}
                >
                    <IconEdit fontSize="large" />
                </IconButton>
                <Switch
                    style={styles.enumLineEnabled}
                    checked={smartName !== false}
                    onChange={() => this.onToggleEnum(obj._id)}
                />
            </div>
        );
    }

    renderEnums(name: 'funcs' | 'rooms'): React.JSX.Element[] {
        return this.state[name].map(e => this.renderEnum(e));
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

    changeSmartName(): void {
        // Check if the name is duplicate
        const enums = this.state.editId.startsWith('enum.functions.') ? this.state.funcs : this.state.rooms;
        if (
            enums.find(
                obj =>
                    this.state.editId !== obj._id &&
                    (this.state.editedSmartName ===
                        Utils.getObjectNameFromObj(obj as unknown as ioBroker.StateObject, I18n.getLanguage()) ||
                        this.state.editedSmartName ===
                            Utils.getSmartNameFromObj(
                                obj as unknown as ioBroker.StateObject,
                                `${this.props.adapterName}.${this.props.instance}`,
                                this.props.native.noCommon,
                            )),
            )
        ) {
            this.setState({ message: I18n.t('Duplicate name') });
        } else {
            this.addChanged(this.state.editId);
            setTimeout(() => this.removeChanged(this.state.editId), 500);
            const id = this.state.editId;
            this.setState({ editId: '' });

            this.props.socket
                .getObject(id)
                .then(obj => {
                    if (obj) {
                        Utils.updateSmartNameEx(obj as ioBroker.StateObject | ioBroker.EnumObject, {
                            smartName: this.state.editedSmartName,
                            instanceId: `${this.props.adapterName}.${this.props.instance}`,
                            noCommon: this.props.native.noCommon,
                        });
                        return this.props.socket.setObject(id, obj).then(() => obj as ioBroker.EnumObject);
                    }
                    return undefined;
                })
                .then(newObj => {
                    this.updateObjInState(id, newObj);
                    this.informInstance(id);
                })
                .catch(err => this.props.onError(err));
        }
    }

    renderEditDialog(): React.JSX.Element | null {
        if (this.state.editId) {
            const obj =
                this.state.funcs.find(e => e._id === this.state.editId) ||
                this.state.rooms.find(e => e._id === this.state.editId);

            return (
                <Dialog
                    open={!0}
                    maxWidth="sm"
                    fullWidth
                    onClose={() => this.setState({ editId: '' })}
                    aria-labelledby="message-dialog-title"
                    aria-describedby="message-dialog-description"
                >
                    <DialogTitle id="message-dialog-title">
                        {this.props.title ||
                            I18n.t(
                                'Smart name for %s',
                                Utils.getObjectNameFromObj(obj as unknown as ioBroker.StateObject, I18n.getLanguage()),
                            )}
                    </DialogTitle>
                    <DialogContent>
                        <TextField
                            variant="standard"
                            autoFocus
                            style={{ width: '100%' }}
                            label={I18n.t('Smart name')}
                            onChange={e => this.setState({ editedSmartName: e.target.value })}
                            value={this.state.editedSmartName}
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
                            color="grey"
                            variant="contained"
                            onClick={() => this.setState({ editId: '' })}
                            startIcon={<IconClose />}
                        >
                            {I18n.t('Cancel')}
                        </Button>
                    </DialogActions>
                </Dialog>
            );
        }
        return null;
    }

    renderColumnHeader(label: string, name: 'funcs' | 'rooms'): React.JSX.Element {
        const columnState = this.getColumnState(name);
        const isPartial = columnState === 'partial';
        const checked = columnState !== 'none';
        const titleKey =
            columnState === 'all'
                ? 'Disable all'
                : columnState === 'none'
                  ? 'Enable all'
                  : 'Enable all (some are disabled)';

        return (
            <Box
                component="h5"
                sx={theme => ({
                    ...(typeof styles.columnHeader === 'function' ? styles.columnHeader(theme) : styles.columnHeader),
                    display: 'flex',
                    alignItems: 'center',
                })}
            >
                <span style={{ flex: 1 }}>{label}</span>
                <Switch
                    title={I18n.t(titleKey)}
                    disabled={this.state.inAction || !this.state[name].length}
                    checked={checked}
                    sx={
                        isPartial
                            ? {
                                  '& .MuiSwitch-thumb': {
                                      backgroundColor: 'warning.main',
                                  },
                                  '& .MuiSwitch-track': {
                                      opacity: 0.5,
                                      backgroundColor: 'warning.main',
                                  },
                                  '& .MuiSwitch-switchBase': {
                                      transform: 'translateX(9px)',
                                  },
                              }
                            : undefined
                    }
                    onChange={() => void this.onToggleAllEnums(name)}
                />
            </Box>
        );
    }

    render(): React.JSX.Element {
        if (this.state.loading) {
            return <CircularProgress />;
        }
        return (
            <form style={styles.tab}>
                <div style={styles.column}>
                    {this.renderColumnHeader(I18n.t('Rooms'), 'rooms')}
                    <div style={styles.columnDiv}>{this.renderEnums('rooms')}</div>
                </div>
                <div style={styles.column}>
                    {this.renderColumnHeader(I18n.t('Functions'), 'funcs')}
                    <div style={styles.columnDiv}>{this.renderEnums('funcs')}</div>
                </div>
                {this.renderMessage()}
                {this.renderEditDialog()}
            </form>
        );
    }
}
