import React, { Component } from 'react';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    MenuItem,
    Select,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    LinearProgress,
    Checkbox,
    Tooltip,
} from '@mui/material';
import { type AdminConnection, I18n, type ThemeType, Utils } from '@iobroker/adapter-react-v5';
import type { AlexaSH3DeviceDescription, SmartNameObject } from './alexa.types';
import { collectSmartNamesOfDevice, findDeviceForState } from './utils';
import { Close as IconClose } from '@mui/icons-material';

interface SmartNameManageDialogProps {
    socket: AdminConnection;
    noCommon: boolean;
    namespace: string;
    dev: AlexaSH3DeviceDescription;
    onClose: (doInformBacken: boolean) => void;
    objects: { [id: string]: ioBroker.Object | null | undefined };
    language: ioBroker.Languages;
    themeType: ThemeType;
}

interface SmartNameManageDialogState {
    states: { [id: string]: { common: ioBroker.StateCommon; smartName: SmartNameObject | false } };
    working: boolean;
    objects: { [id: string]: { name: string; icon?: string | null } };
    changing: string[];
    problems: string[];
}

export default class SmartNameManageDialog extends Component<SmartNameManageDialogProps, SmartNameManageDialogState> {
    private readonly subscribes: string[] = [];
    private changed = false;

    constructor(props: SmartNameManageDialogProps) {
        super(props);

        this.state = {
            states: {},
            working: true,
            objects: {},
            changing: [],
            problems: [],
        };
    }

    async componentDidMount(): Promise<void> {
        const states = await collectSmartNamesOfDevice(this.props.dev, this.props.namespace, this.props.noCommon, {
            objects: this.props.objects,
            socket: this.props.socket,
        });
        this.setState({ states, working: false }, () => this.doAnalyze());
    }

    async componentWillUnmount(): Promise<void> {
        for (const sub of this.subscribes) {
            await this.props.socket.unsubscribeObject(sub, this.onObjectChange);
        }
    }

    private onObjectChange = (id: string, obj: ioBroker.Object | null | undefined): void => {
        const states = { ...this.state.states };
        if (states[id]) {
            const changing = this.state.changing.filter(e => e !== id);
            // extract smartName info
            const smartName = obj
                ? Utils.getSmartNameFromObj(obj as ioBroker.StateObject, this.props.namespace, this.props.noCommon)
                : null;

            if (smartName === null || smartName === undefined) {
                delete states[id];
                this.setState({ states });
                return;
            }
            states[id] = {
                common: obj?.common as ioBroker.StateCommon,
                smartName: smartName as SmartNameObject | false,
            };
            this.setState({ states, changing }, () => this.doAnalyze());
        }
    };

    async doAnalyze(): Promise<void> {
        const problems: string[] = [];
        // The problem could be that we have states with different smart names and noAutoDetect is disabled by any of them
        const ids = Object.keys(this.state.states);
        for (let i = 0; i < ids.length; i++) {
            const id1 = ids[i];
            // find any other state with different smart name and noAutoDetect disabled
            for (let j = 0; j < ids.length; j++) {
                const id2 = ids[j];
                if (id1 !== id2) {
                    const sn1 = this.state.states[id1].smartName;
                    const sn2 = this.state.states[id2].smartName;
                    const name1 = sn1 ? sn1[this.props.language] || sn1.en : null;
                    const name2 = sn2 ? sn2[this.props.language] || sn2.en : null;
                    if (name1 !== name2 && sn1 && sn2 && (!sn1.noAutoDetect || !sn2.noAutoDetect)) {
                        // If both states are from the same ioBroker device, then ignore
                        const parentObj1 = await findDeviceForState(id1, this.props.socket, this.props.objects);
                        const parentObj2 = await findDeviceForState(id2, this.props.socket, this.props.objects);
                        if (parentObj1?._id !== parentObj2?._id) {
                            continue;
                        }
                        if (name1 !== this.props.dev.friendlyName && !problems.includes(id1)) {
                            problems.push(id1);
                        }
                        if (name2 !== this.props.dev.friendlyName && !problems.includes(id2)) {
                            problems.push(id2);
                        }
                    }
                }
            }
        }
        this.setState({ problems: problems });
    }

    render(): React.JSX.Element {
        return (
            <Dialog
                open={!0}
                maxWidth="lg"
                fullWidth
                onClose={() => this.props.onClose(this.changed)}
            >
                <DialogTitle>
                    {I18n.t('Manage the smart names of device "%s"', this.props.dev.friendlyName)}
                </DialogTitle>
                <DialogContent>
                    {this.state.working ? <LinearProgress /> : null}
                    <div>{I18n.t('Devices with any settings in smart name')}</div>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>{I18n.t('Action')}</TableCell>
                                <TableCell>{I18n.t('State ID')}</TableCell>
                                <TableCell>{`${I18n.t('Type')} / ${I18n.t('Role')}`}</TableCell>
                                <TableCell>{I18n.t('Smart type')}</TableCell>
                                <TableCell>{I18n.t('by ON')}</TableCell>
                                <TableCell>
                                    <Tooltip title={I18n.t('Do not take neighbour states, use only one defined state')}>
                                        <span>{I18n.t('Only state')} *</span>
                                    </Tooltip>
                                </TableCell>
                                <TableCell>{I18n.t('Min')}</TableCell>
                                <TableCell>{I18n.t('Max')}</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {Object.keys(this.state.states).map((id: string) => {
                                const state = this.state.states[id];
                                let value: 'use' | 'reset' | 'delete';
                                if (!this.state.states[id].smartName) {
                                    value = 'delete';
                                } else {
                                    value = 'use';
                                }

                                return (
                                    <TableRow
                                        key={id}
                                        style={{
                                            opacity: this.state.changing.includes(id) ? 0.3 : 1,
                                            backgroundColor: this.state.problems.includes(id)
                                                ? this.props.themeType === 'dark'
                                                    ? '#610000'
                                                    : '#ffcccc'
                                                : undefined,
                                        }}
                                        title={
                                            this.state.problems.includes(id)
                                                ? I18n.t(
                                                      'The states from this device are used in different smart devices. To let it work both states must be set to "Only state"',
                                                  )
                                                : undefined
                                        }
                                    >
                                        <TableCell>
                                            <Select
                                                disabled={this.state.changing.includes(id)}
                                                variant="standard"
                                                onChange={async (e): Promise<void> => {
                                                    if (!this.subscribes.includes(id)) {
                                                        this.subscribes.push(id);
                                                        await this.props.socket.subscribeObject(
                                                            id,
                                                            this.onObjectChange,
                                                        );
                                                    }
                                                    this.changed = true;
                                                    this.setState(
                                                        { changing: [...this.state.changing, id] },
                                                        async (): Promise<void> => {
                                                            const obj = await this.props.socket.getObject(id);
                                                            if (!obj) {
                                                                return;
                                                            }
                                                            // extract smartName info
                                                            if (e.target.value === 'reset') {
                                                                Utils.removeSmartName(
                                                                    obj as ioBroker.StateObject,
                                                                    this.props.namespace,
                                                                    this.props.noCommon,
                                                                );
                                                            } else if (e.target.value === 'delete') {
                                                                Utils.disableSmartName(
                                                                    obj as ioBroker.StateObject,
                                                                    this.props.namespace,
                                                                    this.props.noCommon,
                                                                );
                                                            } else {
                                                                Utils.updateSmartNameEx(obj as ioBroker.StateObject, {
                                                                    smartName: this.props.dev.friendlyName,
                                                                    instanceId: this.props.namespace,
                                                                    noCommon: this.props.noCommon,
                                                                });
                                                            }

                                                            if (!this.subscribes.includes(id)) {
                                                                this.subscribes.push(id);
                                                                await this.props.socket.subscribeObject(
                                                                    id,
                                                                    this.onObjectChange,
                                                                );
                                                            }

                                                            await this.props.socket.setObject(id, obj);
                                                        },
                                                    );
                                                }}
                                                value={value}
                                            >
                                                <MenuItem
                                                    value="use"
                                                    style={{ display: 'block' }}
                                                >
                                                    <div>{I18n.t('Used for detection')}</div>
                                                    <div
                                                        style={{
                                                            opacity: 0.7,
                                                            fontSize: 10,
                                                            fontStyle: 'italic',
                                                        }}
                                                    >
                                                        {(this.state.states[id].smartName as SmartNameObject)[
                                                            this.props.language
                                                        ] || (this.state.states[id].smartName as SmartNameObject).en}
                                                    </div>
                                                </MenuItem>
                                                <MenuItem value="delete">
                                                    {I18n.t('Disable state for detection')}
                                                </MenuItem>
                                                <MenuItem
                                                    value="reset"
                                                    style={{ display: 'block' }}
                                                >
                                                    <div>{I18n.t('Reset Smart Name')}</div>
                                                    <div
                                                        style={{
                                                            opacity: 0.7,
                                                            fontSize: 10,
                                                            fontStyle: 'italic',
                                                        }}
                                                    >
                                                        {I18n.t('Delete all smart settings')}
                                                    </div>
                                                </MenuItem>
                                            </Select>
                                        </TableCell>
                                        <TableCell>{id}</TableCell>
                                        <TableCell>
                                            <div>{state.common.type}</div>
                                            <div>{state.common.role}</div>
                                        </TableCell>
                                        <TableCell>
                                            {(this.state.states[id].smartName as SmartNameObject)?.smartType}
                                        </TableCell>
                                        <TableCell>
                                            {(this.state.states[id].smartName as SmartNameObject)?.byON}
                                        </TableCell>
                                        <TableCell>
                                            <Checkbox
                                                disabled={this.state.changing.includes(id)}
                                                checked={
                                                    !!(this.state.states[id].smartName as SmartNameObject)?.noAutoDetect
                                                }
                                                onChange={() => {
                                                    this.changed = true;
                                                    this.setState(
                                                        { changing: [...this.state.changing, id] },
                                                        async (): Promise<void> => {
                                                            const obj = await this.props.socket.getObject(id);
                                                            if (!obj) {
                                                                return;
                                                            }
                                                            // extract smartName info
                                                            const sn = Utils.getSmartNameFromObj(
                                                                obj as ioBroker.StateObject,
                                                                this.props.namespace,
                                                                this.props.noCommon,
                                                            ) as SmartNameObject;

                                                            if (sn) {
                                                                sn.noAutoDetect = !sn.noAutoDetect;
                                                                Utils.updateSmartNameEx(obj as ioBroker.StateObject, {
                                                                    noAutoDetect: sn?.noAutoDetect,
                                                                    instanceId: this.props.namespace,
                                                                    noCommon: this.props.noCommon,
                                                                });

                                                                if (!this.subscribes.includes(id)) {
                                                                    this.subscribes.push(id);
                                                                    await this.props.socket.subscribeObject(
                                                                        id,
                                                                        this.onObjectChange,
                                                                    );
                                                                }

                                                                await this.props.socket.setObject(id, obj);
                                                            }
                                                        },
                                                    );
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            {state.common.min !== undefined ? state.common.min.toString() : '-'}
                                        </TableCell>
                                        <TableCell>
                                            {state.common.max !== undefined ? state.common.max.toString() : '-'}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </DialogContent>
                <DialogActions>
                    <Button
                        variant="contained"
                        startIcon={<IconClose />}
                        onClick={() => this.props.onClose(this.changed)}
                        autoFocus
                        color="grey"
                    >
                        {I18n.t('Close')}
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }
}
