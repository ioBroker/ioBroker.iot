import React, { Component } from 'react';

import {
    TextField,
    Button,
    FormControlLabel,
    Checkbox,
    Card,
    CardActionArea,
    CardActions,
    CardContent,
    CardMedia,
    Snackbar,
    IconButton,
} from '@mui/material';

import { MdRefresh as IconReload, MdClose as IconClose } from 'react-icons/md';

import { I18n, Utils, Logo, type AdminConnection } from '@iobroker/adapter-react-v5';
import type { IotAdapterConfig } from '../types';
import { Refresh } from '@mui/icons-material';

const styles: Record<string, React.CSSProperties> = {
    tab: {
        width: '100%',
        minHeight: '100%',
    },
    input: {
        minWidth: 300,
    },
    button: {
        marginRight: 20,
        marginBottom: 40,
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
    cannotUse: {
        color: 'red',
        fontWeight: 'bold',
    },
    hintUnsaved: {
        fontSize: 12,
        color: 'red',
        fontStyle: 'italic',
    },
};

interface OptionsProps {
    common: ioBroker.AdapterCommon;
    native: IotAdapterConfig;
    instance: number;
    adapterName: string;
    onError: (text: string) => void;
    onLoad: (native: IotAdapterConfig) => void;
    onChange: (attr: string, value: any, cb?: () => void) => void;
    changed: boolean;
    socket: AdminConnection;
}

interface OptionsState {
    inAction: boolean;
    toast: string;
    isInstanceAlive: boolean;
    debugVisible?: boolean;
    validTill?: string;
}

export default class Options extends Component<OptionsProps, OptionsState> {
    private readonly namespace = `${this.props.adapterName}.${this.props.instance}`;

    constructor(props: OptionsProps) {
        super(props);

        this.state = {
            inAction: false,
            toast: '',
            isInstanceAlive: false,
        };
    }

    async componentDidMount(): Promise<void> {
        const aliveState = await this.props.socket.getState(`system.adapter.${this.namespace}.alive`);
        const validTillState = await this.props.socket.getState(`${this.namespace}.info.validTill`);
        this.setState({ isInstanceAlive: !!aliveState?.val, validTill: validTillState?.val as string | undefined });

        await this.props.socket.subscribeState(`${this.namespace}.info.validTill`, this.onValidTillChanged);
        await this.props.socket.subscribeState(`system.adapter.${this.namespace}.alive`, this.onAliveChanged);
    }

    componentWillUnmount(): void {
        this.props.socket.unsubscribeState(`system.adapter.${this.namespace}.alive`, this.onAliveChanged);
        this.props.socket.unsubscribeState(`${this.namespace}.info.validTill`, this.onValidTillChanged);
    }

    onAliveChanged = (id: string, state: ioBroker.State | null | undefined): void => {
        if (id === `system.adapter.${this.namespace}.alive`) {
            this.setState({ isInstanceAlive: !!state?.val });
        }
    };

    onValidTillChanged = (id: string, state: ioBroker.State | null | undefined): void => {
        if (id === `${this.namespace}.info.validTill`) {
            this.setState({ validTill: state?.val as string | undefined });
        }
    };

    static checkPassword(pass: string): string | false {
        pass = (pass || '').toString();
        if (pass.length < 8 || !pass.match(/[a-z]/) || !pass.match(/[A-Z]/) || !pass.match(/\d/)) {
            return I18n.t('invalid_password_warning');
        }
        return false;
    }

    renderInput(
        title: string,
        attr: string,
        type?: 'text' | 'number' | 'password',
        autoComplete?: string,
    ): React.JSX.Element {
        const error = attr === 'pass' && Options.checkPassword(this.props.native[attr]);
        return (
            <TextField
                variant="standard"
                label={I18n.t(title)}
                error={!!error}
                autoComplete={autoComplete || ''}
                style={styles.input}
                value={(this.props.native as unknown as Record<string, string>)[attr]}
                type={type || 'text'}
                helperText={error || ''}
                onChange={e => this.props.onChange(attr, e.target.value)}
                margin="normal"
            />
        );
    }

    renderCard(): React.JSX.Element {
        return (
            <Card style={styles.card}>
                <CardActionArea>
                    <CardMedia
                        style={styles.media}
                        image="alexalogo.png"
                        title="Alexa logo"
                    />
                    <CardContent>{Utils.renderTextWithA(I18n.t('amazon link'))}</CardContent>
                </CardActionArea>
                <CardActions style={{ textAlign: 'center' }}>
                    <Button
                        variant="outlined"
                        size="small"
                        color="primary"
                        style={{ textAlign: 'center' }}
                        onClick={() => {
                            const win = window.open(
                                'https://alexa.amazon.de/spa/index.html#skills/dp/B07L66BFF9/reviews',
                                '_blank',
                            );
                            win?.focus();
                        }}
                    >
                        {I18n.t('Review')}
                    </Button>
                    {this.props.native.amazonAlexa ? (
                        <Button
                            color="grey"
                            title="Debug"
                            onClick={() => this.onDebug()}
                            style={{ opacity: this.state.debugVisible ? 1 : 0 }}
                            onMouseEnter={() => this.setState({ debugVisible: true })}
                            onMouseLeave={() => this.setState({ debugVisible: false })}
                        >
                            {I18n.t('Debug')}
                        </Button>
                    ) : null}
                </CardActions>
            </Card>
        );
    }

    onDebug(): void {
        void this.props.socket.sendTo(`${this.namespace}`, 'debug', null).then(data => {
            const file = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            // @ts-expect-error old browsers
            if (window.navigator.msSaveOrOpenBlob) {
                // IE10+
                // @ts-expect-error old browsers
                window.navigator.msSaveOrOpenBlob(file, 'debug.json');
            } else {
                // Others
                const a = document.createElement('a');
                const url = URL.createObjectURL(file);
                a.href = url;
                a.download = 'debug.json';
                document.body.appendChild(a);
                a.click();

                setTimeout(() => {
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                }, 0);
            }
        });
    }

    async resetCerts(forceUserCreate?: boolean): Promise<void> {
        this.setState({ inAction: true });
        const newState: Partial<OptionsState> = { inAction: false };
        try {
            const prefix = `iot.${this.props.instance}.certs.`;
            await this.props.socket.setState(`${prefix}private`, { val: '', ack: true });
            await this.props.socket.setState(`${prefix}id`, { val: '', ack: true });
            await this.props.socket.setState(`${prefix}public`, { val: '', ack: true });
            await this.props.socket.setState(`${prefix}certificate`, { val: '', ack: true });
            if (forceUserCreate) {
                await this.props.socket.setState(`${prefix}forceUserCreate`, { val: true, ack: true });
            }
            // read actual instance object
            const obj = await this.props.socket.getObject(`system.adapter.iot.${this.props.instance}`);
            if (obj?.common?.enabled) {
                // restart adapter
                await this.props.socket.setObject(obj._id, obj);
            }
            newState.toast = I18n.t('Certificates will be updated after start');
        } catch (err) {
            this.props.onError(err);
        }

        this.setState(newState as OptionsState);
    }

    renderToast(): React.JSX.Element | null {
        if (!this.state.toast) {
            return null;
        }
        return (
            <Snackbar
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                }}
                open
                autoHideDuration={6000}
                onClose={() => this.setState({ toast: '' })}
                slotProps={{
                    content: {
                        'aria-describedby': 'message-id',
                    },
                }}
                message={<span id="message-id">{this.state.toast}</span>}
                action={[
                    <IconButton
                        key="close"
                        aria-label="Close"
                        color="inherit"
                        style={styles.close}
                        onClick={() => this.setState({ toast: '' })}
                    >
                        <IconClose />
                    </IconButton>,
                ]}
            />
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

    renderValidTill(): React.JSX.Element | null {
        if (this.props.changed) {
            return null;
        }
        const week = new Date();
        week.setDate(week.getDate() + 7);
        const expiring =
            this.state.validTill &&
            new Date(this.state.validTill) > new Date() &&
            new Date(this.state.validTill).getTime() < week.getTime();
        return (
            <div>
                <div
                    style={{ display: 'flex', alignItems: 'center' }}
                    title={expiring ? I18n.t('expiring_soon_tip') : ''}
                >
                    <span style={{ fontWeight: 'bold', marginRight: 8 }}>{I18n.t('Subscription till')}:</span>
                    <span
                        style={{
                            color: expiring
                                ? 'orange'
                                : !this.state.validTill || new Date(this.state.validTill) <= new Date()
                                  ? 'red'
                                  : 'green',
                        }}
                    >
                        {this.state.validTill ? new Date(this.state.validTill).toLocaleString() : I18n.t('--')}
                    </span>
                    <IconButton
                        title={I18n.t('Refresh subscription info')}
                        disabled={!this.state.isInstanceAlive}
                        onClick={() => this.props.socket.sendTo(this.namespace, 'updateValidTill', null)}
                    >
                        <Refresh />
                    </IconButton>
                </div>
                <span>{I18n.t('subscription_buy_tip')}</span>
            </div>
        );
    }

    render(): React.JSX.Element {
        return (
            <form style={styles.tab}>
                <Logo
                    instance={this.props.instance}
                    common={this.props.common}
                    native={this.props.native}
                    onError={text => window.alert(text)}
                    onLoad={this.props.onLoad}
                />
                <div style={{ ...styles.column, ...styles.columnSettings }}>
                    {this.renderInput('ioBroker.pro Login', 'login', 'text', 'username')}
                    <br />
                    {this.renderInput('ioBroker.pro Password', 'pass', 'password', 'current-password')}
                    <br />
                    {this.renderValidTill()}
                    <br />
                    {this.renderCheckbox('Amazon AlexaV3', 'amazonAlexaV3')}
                    {this.renderCheckbox('Amazon Alexa (deprecated)', 'amazonAlexa')}
                    {this.renderCheckbox('Amazon Alexa Custom', 'amazonCustom')}
                    <FormControlLabel
                        key="googleHome"
                        style={{ ...styles.controlElement, marginTop: 5 }}
                        control={
                            <Checkbox
                                checked={this.props.native.googleHome}
                                onChange={() => {
                                    const newVal = !this.props.native.googleHome;
                                    this.props.onChange('googleHome', newVal);
                                }}
                                color="primary"
                            />
                        }
                        label={I18n.t('Google Home')}
                    />
                    {this.renderCheckbox('Yandex Алиса', 'yandexAlisa')}
                    <br />

                    <p>{I18n.t('new_certs_tip')}</p>
                    {this.props.changed ? (
                        <div style={styles.hintUnsaved}>{I18n.t('Save settings before pressing this button')}</div>
                    ) : null}
                    <Button
                        variant="outlined"
                        style={styles.button}
                        disabled={this.props.changed || this.state.inAction || !this.state.isInstanceAlive}
                        title={!this.state.isInstanceAlive ? I18n.t('Instance must be enabled') : ''}
                        onClick={() => this.resetCerts()}
                        startIcon={<IconReload />}
                        color="grey"
                    >
                        {I18n.t('Get new connection certificates')}
                    </Button>

                    <p>{I18n.t('new_credentials_tip')}</p>
                    {this.props.changed ? (
                        <div style={styles.hintUnsaved}>{I18n.t('Save settings before pressing this button')}</div>
                    ) : null}
                    <Button
                        variant="outlined"
                        color="grey"
                        style={styles.button}
                        disabled={this.props.changed || this.state.inAction || !this.state.isInstanceAlive}
                        title={!this.state.isInstanceAlive ? I18n.t('Instance must be enabled') : ''}
                        onClick={() => this.resetCerts(true)}
                        startIcon={<IconReload />}
                    >
                        {I18n.t('Create IoT credentials anew')}
                    </Button>
                    <p>{Utils.renderTextWithA(I18n.t('forum_tip'))}</p>
                    <p style={{ fontWeight: 'bold' }}>{Utils.renderTextWithA(I18n.t('help_tip'))}</p>
                    <p style={{ fontWeight: 'bold', paddingTop: 20 }}>
                        {Utils.renderTextWithA(I18n.t('help_link_tip1'))}
                    </p>
                    <p style={{ fontWeight: 'bold' }}>{Utils.renderTextWithA(I18n.t('help_link_tip2'))}</p>
                    <p style={{ fontWeight: 'bold', color: 'red' }}>
                        {Utils.renderTextWithA(I18n.t('help_link_tip3'))}
                    </p>
                </div>
                <div style={{ ...styles.column, ...styles.columnLogo }}>{this.renderCard()}</div>
                {this.renderToast()}
            </form>
        );
    }
}
