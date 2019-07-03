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
import Utils from '../Components/Utils'

import {MdRefresh as IconReload} from 'react-icons/md';
import {MdClose as IconClose} from 'react-icons/md';

import I18n from '../i18n';
import Logo from './Logo';
import Message from '../Dialogs/Message';

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
    }
});

class Options extends Component {
    constructor(props) {
        super(props);

        this.state = {
            inAction: false,
            forceUserCreate: false,
            showHint: false,
            toast: ''
        };
    }

    renderInput(title, attr, type) {
        return (<TextField
            label={I18n.t(title)}
            className={this.props.classes.input}
            value={this.props.native[attr]}
            type={type || 'text'}
            onChange={e => this.props.onChange(attr, e.target.value)}
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

    resetCerts() {
        this.setState({inAction: true});
        this.props.socket.setState('iot.' + this.props.instance + '.certs.private', {val: '', ack: true})
            .then(() => this.props.socket.setState('iot.' + this.props.instance + '.certs.id', {val: '', ack: true}))
            .then(() => this.props.socket.setState('iot.' + this.props.instance + '.certs.public', {val: '', ack: true}))
            .then(() => this.props.socket.setState('iot.' + this.props.instance + '.certs.certificate', {val: '', ack: true}))
            .then(() => {
                if (this.state.forceUserCreate) {
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

    onForceUserCreate() {
        this.setState({forceUserCreate: !this.state.forceUserCreate, showHint: !this.state.forceUserCreate});
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

    renderHint() {
        if (this.state.showHint) {
            return (<Message text={I18n.t('Click now Get new connection certificates to request new temporary password')} onClose={() => this.setState({showHint: false})}/>);
        } else {
            return null;
        }
    }

    render() {
        return (
            <form className={this.props.classes.tab}>
                <Logo
                    instance={this.props.instance}
                    common={this.props.common}
                    native={this.props.native}
                    onError={text => this.setState({errorText: text})}
                    onLoad={this.props.onLoad}
                />
                <div className={this.props.classes.column + ' ' + this.props.classes.columnSettings}>
                    {this.renderInput('ioBroker.pro Login', 'login')}<br/>
                    {this.renderInput('ioBroker.pro Password', 'pass', 'password')}<br/>
                    <br/>
                    <Button variant="outlined" className={this.props.classes.button} disabled={this.state.inAction} onClick={() => this.resetCerts()}>
                        <IconReload/>{I18n.t('Get new connection certificates')}
                    </Button>
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={this.state.forceUserCreate}
                                onChange={() => this.onForceUserCreate()}
                                color="primary"
                            />
                        }
                        label={I18n.t('Request email with password one more time')}
                    />
                    <p style={{fontWeight: 'bold'}}>{Utils.renderTextWithA(I18n.t('help_tip'))}</p>
                </div>
                <div className={this.props.classes.column + ' ' + this.props.classes.columnLogo}>{this.renderCard()}</div>
                {this.renderHint()}
                {this.renderToast()}
            </form>
        );
    }
}

Options.propTypes = {
    common: PropTypes.object.isRequired,
    native: PropTypes.object.isRequired,
    instance: PropTypes.number.isRequired,
    onError: PropTypes.func,
    onLoad: PropTypes.func,
    onChange: PropTypes.func,
    socket: PropTypes.object.isRequired,
};

export default withStyles(styles)(Options);
