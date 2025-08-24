import React, { Component } from 'react';

import {
    TextField,
    Input,
    FormHelperText,
    Fab,
    FormControl,
    Select,
    MenuItem,
    FormControlLabel,
    Checkbox,
} from '@mui/material';

import { MdAdd as IconAdd } from 'react-icons/md';

import { Utils, I18n, DialogSelectID, type AdminConnection, type IobTheme } from '@iobroker/adapter-react-v5';
import type { IotAdapterConfig } from '../types';

const styles: Record<string, React.CSSProperties> = {
    tab: {
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
    },
    input: {
        marginTop: 0,
        minWidth: 300,
        maxWidth: 500,
    },
    button: {
        marginRight: 20,
    },
    card: {
        maxWidth: 345,
        textAlign: 'center',
    },
    media: {
        height: 180,
    },
    column: {
        display: 'inline-block',
        verticalAlign: 'top',
        marginRight: 20,
    },
    columnLogo: {
        width: 350,
        marginRight: 0,
    },
    columnSettings: {
        width: 'calc(100% - 370px)',
    },
    controlElement: {
        // background: '#d2d2d2',
        marginBottom: 5,
    },
};

interface ExtendedOptionsProps {
    native: IotAdapterConfig;
    onChange: (attr: string, value: any) => void;
    socket: AdminConnection;
    theme: IobTheme;
}

interface ExtendedOptionsState {
    showSelectId: boolean;
    adminInstances: { title: string; value: string; noTranslation?: true }[];
    webInstances: { title: string; value: string; noTranslation?: true }[];
}

export default class ExtendedOptions extends Component<ExtendedOptionsProps, ExtendedOptionsState> {
    constructor(props: ExtendedOptionsProps) {
        super(props);

        this.state = {
            showSelectId: false,
            adminInstances: [],
            webInstances: [],
        };
    }

    componentDidMount(): void {
        void this.props.socket.getAdapterInstances('admin').then(adminInstances => {
            // filter out instances with authentication
            const aInstances: { title: string; value: string; noTranslation?: true }[] = adminInstances
                .filter(item => !item.native.auth)
                .map(item => ({
                    title: `${item.common.name}.${item._id.split('.').pop()}`,
                    value: `${item.common.name}.${item._id.split('.').pop()}`,
                    noTranslation: true,
                }));

            aInstances.unshift({ title: 'disabled', value: '' });

            return this.props.socket.getAdapterInstances('web').then(webInstances => {
                const wInstances: { title: string; value: string; noTranslation?: true }[] = webInstances
                    .filter(item => !item.native.auth)
                    .map(item => ({
                        title: `${item.common.name}.${item._id.split('.').pop()}`,
                        value: `${item.common.name}.${item._id.split('.').pop()}`,
                        noTranslation: true,
                    }));

                wInstances.unshift({ title: 'disabled', value: '' });

                this.setState({ adminInstances: aInstances, webInstances: wInstances });
            });
        });
    }

    renderInput(
        title: string,
        attr: string,
        type?: 'text' | 'password' | 'number',
        disabled?: boolean,
        helperText?: string,
    ): React.JSX.Element {
        return (
            <TextField
                variant="standard"
                label={I18n.t(title)}
                disabled={disabled}
                style={{ ...styles.input, ...styles.controlElement }}
                value={(this.props.native as unknown as Record<string, string>)[attr]}
                type={type || 'text'}
                helperText={helperText ? I18n.t(helperText) : ''}
                onChange={e => this.props.onChange(attr, e.target.value)}
                margin="normal"
            />
        );
    }

    renderSelect(
        title: string,
        attr: string,
        options: { value: string; title: string; noTranslation?: true }[],
        style?: React.CSSProperties,
    ): React.JSX.Element {
        return (
            <FormControl
                style={{
                    ...styles.input,
                    ...styles.controlElement,
                    paddingTop: 5,
                    paddingRight: 8,
                    ...style,
                }}
                variant="standard"
            >
                <Select
                    variant="standard"
                    value={(this.props.native as unknown as Record<string, string>)[attr] || '_'}
                    onChange={e => this.props.onChange(attr, e.target.value === '_' ? '' : e.target.value)}
                    input={
                        <Input
                            name={attr}
                            id={`${attr}-helper`}
                        />
                    }
                >
                    {options.map(item => (
                        <MenuItem
                            key={`key-${item.value}`}
                            value={item.value || '_'}
                        >
                            {item.noTranslation ? item.title : I18n.t(item.title)}
                        </MenuItem>
                    ))}
                </Select>
                <FormHelperText>{I18n.t(title)}</FormHelperText>
            </FormControl>
        );
    }

    renderCheckbox(title: string, attr: string, style?: React.CSSProperties): React.JSX.Element {
        return (
            <FormControlLabel
                key={attr}
                style={{ ...styles.controlElement, paddingTop: 5, ...style }}
                control={
                    <Checkbox
                        checked={!!(this.props.native as unknown as Record<string, string>)[attr]}
                        onChange={() =>
                            this.props.onChange(attr, !(this.props.native as unknown as Record<string, string>)[attr])
                        }
                        color="primary"
                    />
                }
                label={I18n.t(title)}
            />
        );
    }

    getSelectIdDialog(attr: string): React.JSX.Element | null {
        if (this.state.showSelectId) {
            return (
                <DialogSelectID
                    key="dialogSelectID2"
                    theme={this.props.theme}
                    imagePrefix="../.."
                    socket={this.props.socket}
                    selected={(this.props.native as unknown as Record<string, string>)[attr]}
                    types={['state']}
                    onClose={() => this.setState({ showSelectId: false })}
                    onOk={selected => {
                        this.setState({ showSelectId: false });
                        this.props.onChange(attr, selected);
                    }}
                />
            );
        }
        return null;
    }

    render(): React.JSX.Element {
        return (
            <form style={styles.tab}>
                {/* this.renderInput('Cloud URL', 'cloudUrl', null, true) */}
                {this.renderSelect('Language', 'language', [
                    { title: 'default', value: '' },
                    { title: 'english', value: 'en', noTranslation: true },
                    { title: 'Deutsch', value: 'de', noTranslation: true },
                    { title: 'русский', value: 'ru', noTranslation: true },
                ])}
                {this.renderCheckbox('Place function in names first', 'functionFirst')}
                {this.renderInput('Concatenate words with', 'concatWord')}
                {/* this.renderInput('Replace in names', 'replaces') */}
                {this.props.native.amazonAlexaV3 ? (
                    <FormControl
                        style={{
                            ...styles.input,
                            ...styles.controlElement,
                            paddingTop: 5,
                            paddingRight: 8,
                        }}
                        variant="standard"
                    >
                        <Select
                            variant="standard"
                            value={this.props.native.defaultToggle ? 'true' : 'false'}
                            onChange={e => this.props.onChange('defaultToggle', e.target.value === 'true')}
                        >
                            <MenuItem value={'false'}>{I18n.t('Do not toggle')}</MenuItem>
                            <MenuItem value={'true'}>{I18n.t('Toggle')}</MenuItem>
                        </Select>
                        <FormHelperText>{I18n.t('Default toggle behaviour (Only alexa v3)')}</FormHelperText>
                    </FormControl>
                ) : null}
                {this.renderInput(
                    'OFF level for switches in %',
                    'deviceOffLevel',
                    'text',
                    false,
                    '(Set to 0 if behavior not desired)',
                )}
                <div style={styles.controlElement}>
                    {this.renderInput('Write response to', 'responseOID')}
                    <Fab
                        size="small"
                        color="secondary"
                        onClick={() => this.setState({ showSelectId: true })}
                        aria-label="Add"
                        style={{ marginLeft: 5, marginTop: 10 }}
                    >
                        <IconAdd />
                    </Fab>
                </div>
                <div style={styles.controlElement}>
                    {this.renderCheckbox('Personal settings (only pro)', 'noCommon')}
                    <FormHelperText>{Utils.renderTextWithA(I18n.t('help_tip'))}</FormHelperText>
                </div>
                {this.renderCheckbox('Debug outputs', 'debug')}
                <div style={styles.controlElement}>
                    {this.renderCheckbox('Allow remote access', 'remote')}
                    {this.props.native.remote
                        ? this.renderSelect('Admin instance', 'remoteAdminInstance', this.state.adminInstances, {
                              width: 120,
                              minWidth: 120,
                          })
                        : null}
                    {this.props.native.remote
                        ? this.renderSelect('Web instance', 'remoteWebInstance', this.state.webInstances, {
                              width: 120,
                              minWidth: 120,
                          })
                        : null}
                </div>

                {this.getSelectIdDialog('responseOID')}
            </form>
        );
    }
}
