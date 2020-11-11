import React, {Component} from 'react';
import {withStyles} from '@material-ui/core/styles';
import PropTypes from 'prop-types';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Checkbox from '@material-ui/core/Checkbox';
import Card from '@material-ui/core/Card';
import CardActionArea from '@material-ui/core/CardActionArea';
import CardActions from '@material-ui/core/CardActions';
import CardContent from '@material-ui/core/CardContent';
import CardMedia from '@material-ui/core/CardMedia';
import Snackbar from '@material-ui/core/Snackbar';
import IconButton from '@material-ui/core/IconButton';
import Utils from '@iobroker/adapter-react/Components/Utils'

import {MdRefresh as IconReload} from 'react-icons/md';
import {MdClose as IconClose} from 'react-icons/md';

import I18n from '@iobroker/adapter-react/i18n';
import Logo from './Logo';

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

        this.props.socket.getState(`system.adapter.${this.props.adapterName}.${this.props.instance}.alive`).then(state =>
            this.setState({isInstanceAlive: state && state.val}));
    }

    componentDidMount() {
        this.props.socket.subscribeState(`system.adapter.${this.props.adapterName}.${this.props.instance}.alive`, this.onAliveChanged);
    }

    componentWillUnmount() {
        this.props.socket.unsubscribeState(`system.adapter.${this.props.adapterName}.${this.props.instance}.alive`, this.onAliveChanged);
    }

    onAliveChanged = (id, state) => {
        if (id === `system.adapter.${this.props.adapterName}.${this.props.instance}.alive`) {
            this.setState({isInstanceAlive: state && state.val});
        }
    };

    checkPassword(pass) {
        if (pass.length < 8 || !pass.match(/[a-z]/) || !pass.match(/[A-Z]/) || !pass.match(/\d/)) {
            return I18n.t('invalid_password_warning');
        } else {
            return false;
        }
    }

    renderInput(title, attr, type) {
        const error = attr === 'pass' && this.checkPassword(this.props.native[attr]);
        return (<TextField
            label={ I18n.t(title) }
            error={ !!error  }
            className={ this.props.classes.input }
            value={ this.props.native[attr] }
            type={ type || 'text' }
            helperText={ error || '' }
            onChange={ e => this.props.onChange(attr, e.target.value) }
            margin="normal"
        />);
    }

    renderCard() {
        return (<Card className={this.props.classes.card}>
            <CardActionArea>
                <CardMedia
                    className={this.props.classes.media}
                    image="alexalogo.png"
                    title="Alexa logo"
                />
                <CardContent>{Utils.renderTextWithA(I18n.t('amazon link'))}</CardContent>
            </CardActionArea>
            <CardActions style={{textAlign: 'center'}} >
                <Button size="small" color="primary" style={{textAlign: 'center'}} onClick={() => {
                    const win = window.open('http://alexa.amazon.de/spa/index.html#skills/dp/B07L66BFF9/reviews', '_blank');
                    win.focus();
                }}>{I18n.t('Review')}</Button>
            </CardActions>
        </Card>);
    }

    resetCerts(forceUserCreate) {
        this.setState({ inAction: true });

        this.props.socket.setState('iot.' + this.props.instance + '.certs.private', {val: '', ack: true})
            .then(() => this.props.socket.setState('iot.' + this.props.instance + '.certs.id', {val: '', ack: true}))
            .then(() => this.props.socket.setState('iot.' + this.props.instance + '.certs.public', {val: '', ack: true}))
            .then(() => this.props.socket.setState('iot.' + this.props.instance + '.certs.certificate', {val: '', ack: true}))
            .then(() => {
                if (forceUserCreate) {
                    return this.props.socket.setState('iot.' + this.props.instance + '.certs.forceUserCreate', {val: true, ack: true});
                } else {
                    return Promise.resolve();
                }
            })
            // read actual instance object
            .then(() => this.props.socket.getObject('system.adapter.iot.' + this.props.instance))
            .then(obj => {
                if (!obj || !obj.common || !obj.common.enabled) {
                    // adapter is disabled, do not restart it
                    return Promise.resolve();
                } else {
                    // restart adapter
                    return this.props.socket.setObject('system.adapter.iot.' + this.props.instance, obj);
                }
            })
            .then(() => this.setState({toast: I18n.t('Certificates will be updated after start')}))
            .catch(err => this.props.onError(err))
            .then(() => this.setState({inAction: false}));
    }

    renderToast() {
        if (!this.state.toast) return null;
        return (
            <Snackbar
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                }}
                open={true}
                autoHideDuration={6000}
                onClose={() => this.setState({toast: ''})}
                ContentProps={{
                    'aria-describedby': 'message-id',
                }}
                message={<span id="message-id">{this.state.toast}</span>}
                action={[
                    <IconButton
                        key="close"
                        aria-label="Close"
                        color="inherit"
                        className={this.props.classes.close}
                        onClick={() => this.setState({toast: ''})}
                    >
                        <IconClose />
                    </IconButton>,
                ]}
            />);
    }

    renderCheckbox(title, attr, style) {
        return (<FormControlLabel key={attr} style={Object.assign({paddingTop: 5}, style)} className={this.props.classes.controlElement}
              control={
                  <Checkbox
                      checked={this.props.native[attr]}
                      onChange={() => this.props.onChange(attr, !this.props.native[attr])}
                      color="primary"
                  />
              }
              label={I18n.t(title)}
        />);
    }

    render() {
        return <form className={ this.props.classes.tab }>
            <Logo
                instance={ this.props.instance }
                common={ this.props.common }
                native={ this.props.native }
                onError={ text => this.setState({errorText: text}) }
                onLoad={ this.props.onLoad }
            />
            <div className={ this.props.classes.column + ' ' + this.props.classes.columnSettings }>
                { this.renderInput('ioBroker.pro Login', 'login') }<br/>
                { this.renderInput('ioBroker.pro Password', 'pass', 'password') }<br/>
                { this.renderCheckbox('Amazon Alexa', 'amazonAlexa') }
                <FormControlLabel key="googleHome" className={ this.props.classes.controlElement }
                                  style={{ marginTop: 5 }}
                    control={
                      <Checkbox
                          checked={this.props.native.googleHome}
                          onChange={() => {
                              // activate alexa if google home is on (temporary)
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
                <Button variant="outlined"
                        className={ this.props.classes.button }
                        disabled={ this.props.changed || this.state.inAction || !this.state.isInstanceAlive }
                        title={ !this.state.isInstanceAlive ? I18n.t('Instance must be enabled') : '' }
                        onClick={ () => this.resetCerts() }>
                    <IconReload style={{ marginRight: 8 }}/>{ I18n.t('Get new connection certificates') }
                </Button>

                <p>{I18n.t('new_credentials_tip')}</p>
                {this.props.changed ? <div className={this.props.classes.hintUnsaved}>{I18n.t('Save settings before pressing this button')}</div> : null}
                <Button variant="outlined"
                        className={ this.props.classes.button }
                        disabled={ this.props.changed || this.state.inAction || !this.state.isInstanceAlive }
                        title={ !this.state.isInstanceAlive ? I18n.t('Instance must be enabled') : '' }
                        onClick={ () => this.resetCerts(true) }>
                    <IconReload  style={{ marginRight: 8 }}/>{ I18n.t('Create IoT credentials anew') }
                </Button>
                <p>{ Utils.renderTextWithA(I18n.t('forum_tip')) }</p>
                <p style={{ fontWeight: 'bold' }}>{ Utils.renderTextWithA(I18n.t('help_tip')) }</p>
                <p style={{ fontWeight: 'bold', paddingTop: 20}}>{ Utils.renderTextWithA(I18n.t('help_link_tip1')) }</p>
                <p style={{ fontWeight: 'bold' }}>{ Utils.renderTextWithA(I18n.t('help_link_tip2')) }</p>
                <p style={{ fontWeight: 'bold', color: 'red'}}>{ Utils.renderTextWithA(I18n.t('help_link_tip3')) }</p>
            </div>
            <div className={this.props.classes.column + ' ' + this.props.classes.columnLogo}>{this.renderCard() }</div>
            { this.renderToast() }
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
