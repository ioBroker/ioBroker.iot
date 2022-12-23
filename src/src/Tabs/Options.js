import React, { Component } from 'react';
import { withStyles } from '@mui/styles';
import PropTypes from 'prop-types';

import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Snackbar from '@mui/material/Snackbar';
import IconButton from '@mui/material/IconButton';

import { MdRefresh as IconReload } from 'react-icons/md';
import { MdClose as IconClose } from 'react-icons/md';

import { I18n, Utils, Logo } from '@iobroker/adapter-react-v5';

const styles = theme => ({
    tab: {
        width: '100%',
        minHeight: '100%'
    },
    input: {
        minWidth: 300
    },
    button: {
        marginRight: 20,
        marginBottom: 40,
    },
    card: {
        maxWidth: 345,
        textAlign: 'center'
    },
    media: {
        height: 180,
    },
    column: {
        display: 'inline-block',
        verticalAlign: 'top',
        marginRight: 20
    },
    columnLogo: {
        width: 350,
        marginRight: 0
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
    }
});

class Options extends Component {
    constructor(props) {
        super(props);

        this.state = {
            inAction: false,
            toast: '',
            isInstanceAlive: false,
            errorWithPercent: false,
        };

        this.props.socket.getState(`system.adapter.${this.props.adapterName}.${this.props.instance}.alive`)
            .then(state => this.setState({ isInstanceAlive: state && state.val }));
    }

    componentDidMount() {
        this.props.socket.subscribeState(`system.adapter.${this.props.adapterName}.${this.props.instance}.alive`, this.onAliveChanged);
    }

    componentWillUnmount() {
        this.props.socket.unsubscribeState(`system.adapter.${this.props.adapterName}.${this.props.instance}.alive`, this.onAliveChanged);
    }

    onAliveChanged = (id, state) => {
        if (id === `system.adapter.${this.props.adapterName}.${this.props.instance}.alive`) {
            this.setState({ isInstanceAlive: state && state.val });
        }
    };

    checkPassword(pass) {
        pass = (pass || '').toString();
        if (pass.length < 8 || !pass.match(/[a-z]/) || !pass.match(/[A-Z]/) || !pass.match(/\d/)) {
            return I18n.t('invalid_password_warning');
        } else {
            return false;
        }
    }

    renderInput(title, attr, type, autoComplete) {
        const error = attr === 'pass' && this.checkPassword(this.props.native[attr]);
        return <TextField
            variant="standard"
            label={I18n.t(title)}
            error={!!error}
            autoComplete={autoComplete || ''}
            className={this.props.classes.input}
            value={this.props.native[attr]}
            type={type || 'text'}
            helperText={error || ''}
            onChange={e => this.props.onChange(attr, e.target.value)}
            margin="normal"
        />;
    }

    renderCard() {
        return <Card className={this.props.classes.card}>
            <CardActionArea>
                <CardMedia
                    className={this.props.classes.media}
                    image="alexalogo.png"
                    title="Alexa logo"
                />
                <CardContent>{Utils.renderTextWithA(I18n.t('amazon link'))}</CardContent>
            </CardActionArea>
            <CardActions style={{ textAlign: 'center' }} >
                <Button
                    variant="outlined"
                    size="small"
                    color="primary"
                    style={{  textAlign: 'center' }}
                    onClick={() => {
                        const win = window.open('https://alexa.amazon.de/spa/index.html#skills/dp/B07L66BFF9/reviews', '_blank');
                        win.focus();
                    }}>{I18n.t('Review')}</Button>
                {this.props.native.amazonAlexa ?
                    <Button
                        color="grey"
                        title="Debug"
                        onClick={() => this.onDebug()}
                        style={{ opacity: this.state.debugVisible ? 1 : 0 }}
                        onMouseEnter={() => this.setState({ debugVisible: true })}
                        onMouseLeave={() => this.setState({ debugVisible: false })}
                    >Debug</Button> : null}
            </CardActions>
        </Card>;
    }

    onDebug() {
        this.props.socket.sendTo(`${this.props.adapterName}.${this.props.instance}`, 'debug', null)
            .then(data => {
                const file = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
                if (window.navigator.msSaveOrOpenBlob) // IE10+
                    window.navigator.msSaveOrOpenBlob(file, 'debug.json');
                else { // Others
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

    resetCerts(forceUserCreate) {
        this.setState({ inAction: true });

        this.props.socket.setState(`iot.${this.props.instance}.certs.private`, { val: '', ack: true })
            .then(() => this.props.socket.setState(`iot.${this.props.instance}.certs.id`, { val: '', ack: true }))
            .then(() => this.props.socket.setState(`iot.${this.props.instance}.certs.public`, { val: '', ack: true }))
            .then(() => this.props.socket.setState(`iot.${this.props.instance}.certs.certificate`, { val: '', ack: true }))
            .then(() => {
                if (forceUserCreate) {
                    return this.props.socket.setState(`iot.${this.props.instance}.certs.forceUserCreate`, { val: true, ack: true });
                } else {
                    return Promise.resolve();
                }
            })
            // read actual instance object
            .then(() => this.props.socket.getObject(`system.adapter.iot.${this.props.instance}`))
            .then(obj => {
                if (!obj || !obj.common || !obj.common.enabled) {
                    // adapter is disabled, do not restart it
                    return Promise.resolve();
                } else {
                    // restart adapter
                    return this.props.socket.setObject(`system.adapter.iot.${this.props.instance}`, obj);
                }
            })
            .then(() => this.setState({ toast: I18n.t('Certificates will be updated after start') }))
            .catch(err => this.props.onError(err))
            .then(() => this.setState({ inAction: false }));
    }

    renderToast() {
        if (!this.state.toast) {
            return null;
        }
        return <Snackbar
            anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'left',
            }}
            open={true}
            autoHideDuration={6000}
            onClose={() => this.setState({ toast: '' })}
            ContentProps={{'aria-describedby': 'message-id'}}
            message={<span id="message-id">{this.state.toast}</span>}
            action={[
                <IconButton
                    key="close"
                    aria-label="Close"
                    color="inherit"
                    className={this.props.classes.close}
                    onClick={() => this.setState({ toast: '' })}
                >
                    <IconClose />
                </IconButton>,
            ]}
        />;
    }

    renderCheckbox(title, attr, style) {
        return <FormControlLabel key={attr} style={Object.assign({ paddingTop: 5 }, style)} className={this.props.classes.controlElement}
              control={
                  <Checkbox
                      checked={this.props.native[attr]}
                      onChange={() => this.props.onChange(attr, !this.props.native[attr])}
                      color="primary"
                  />
              }
              label={I18n.t(title)}
        />;
    }

    render() {
        return <form className={ this.props.classes.tab }>
            <Logo
                classes={{}}
                instance={this.props.instance}
                common={this.props.common}
                native={this.props.native}
                onError={text => this.setState({ errorText: text })}
                onLoad={this.props.onLoad}
            />
            <div className={Utils.clsx(this.props.classes.column, this.props.classes.columnSettings)}>
                {this.renderInput('ioBroker.pro Login', 'login', null, 'username')}<br/>
                {this.renderInput('ioBroker.pro Password', 'pass', 'password', 'current-password')}<br/>
                {this.renderCheckbox('Amazon Alexa', 'amazonAlexa')}
                <FormControlLabel
                    key="googleHome"
                    className={this.props.classes.controlElement}
                    style={{ marginTop: 5 }}
                    control={
                      <Checkbox
                          checked={this.props.native.googleHome}
                          onChange={() => {
                              // activate alexa if Google home is on (temporary)
                              const newVal = !this.props.native.googleHome;
                              this.props.onChange('googleHome', newVal, () =>
                                  newVal && this.props.onChange('amazonAlexa', true));
                          }}
                          color="primary"
                      />
                    }
                    label={I18n.t('Google Home')}
                />
                {this.renderCheckbox('Yandex Алиса', 'yandexAlisa')}
                <br/>

                <p>{I18n.t('new_certs_tip')}</p>
                {this.props.changed ? <div className={this.props.classes.hintUnsaved}>{I18n.t('Save settings before pressing this button')}</div> : null}
                <Button
                    variant="outlined"
                    className={this.props.classes.button}
                    disabled={this.props.changed || this.state.inAction || !this.state.isInstanceAlive}
                    title={!this.state.isInstanceAlive ? I18n.t('Instance must be enabled') : ''}
                    onClick={() => this.resetCerts()}
                    startIcon={<IconReload />}
                    color="grey"
                >
                    {I18n.t('Get new connection certificates')}
                </Button>

                <p>{I18n.t('new_credentials_tip')}</p>
                {this.props.changed ?
                    <div className={this.props.classes.hintUnsaved}>{I18n.t('Save settings before pressing this button')}</div> : null}
                <Button
                    variant="outlined"
                    color="grey"
                    className={this.props.classes.button}
                    disabled={this.props.changed || this.state.inAction || !this.state.isInstanceAlive}
                    title={!this.state.isInstanceAlive ? I18n.t('Instance must be enabled') : ''}
                    onClick={() => this.resetCerts(true)}
                    startIcon={<IconReload />}
                >
                    {I18n.t('Create IoT credentials anew')}
                </Button>
                <p>{ Utils.renderTextWithA(I18n.t('forum_tip')) }</p>
                <p style={{ fontWeight: 'bold' }}>{Utils.renderTextWithA(I18n.t('help_tip')) }</p>
                <p style={{ fontWeight: 'bold', paddingTop: 20 }}>{Utils.renderTextWithA(I18n.t('help_link_tip1'))}</p>
                <p style={{ fontWeight: 'bold' }}>{Utils.renderTextWithA(I18n.t('help_link_tip2'))}</p>
                <p style={{ fontWeight: 'bold', color: 'red' }}>{Utils.renderTextWithA(I18n.t('help_link_tip3'))}</p>
            </div>
            <div className={Utils.clsx(this.props.classes.column, this.props.classes.columnLogo)}>{this.renderCard()}</div>
            {this.renderToast()}
        </form>;
    }
}

Options.propTypes = {
    common: PropTypes.object.isRequired,
    native: PropTypes.object.isRequired,
    instance: PropTypes.number.isRequired,
    adapterName: PropTypes.string.isRequired,
    onError: PropTypes.func,
    onLoad: PropTypes.func,
    onChange: PropTypes.func,
    changed: PropTypes.bool,
    socket: PropTypes.object.isRequired,
};

export default withStyles(styles)(Options);
