import React, { Component } from 'react';
import PropTypes from 'prop-types';

import {
    TextField,
    Input,
    FormHelperText,
    Fab,
    FormControl,
    Select,
    MenuItem,
    Button,
    IconButton,
    Snackbar,
    Chip,
    FormControlLabel,
    Checkbox,
} from '@mui/material';

import {
    MdRefresh as IconRefresh,
    MdClose as IconClose,
    MdAdd as IconAdd,
} from 'react-icons/md';

import {
    Utils, I18n,
    SelectID as DialogSelectID, IconCopy,
} from '@iobroker/adapter-react-v5';

const styles = {
    tab: {
        width: '100%',
        minHeight: '100%',
    },
    input: {
        marginTop: 0,
        minWidth: 400,
    },
    fullSize: {
        width: 'calc(100% - 64px)',
    },
    normalSize: {
        width: 'calc(30% - 64px)',
        marginLeft: 10,
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
    chips: {
        border: '1px solid #DDD',
        borderRadius: 1,
        width: 'calc(100% - 250px)',
        display: 'inline-block',
        padding: 5,
        minHeight: 32,
        marginLeft: 10,
        marginTop: 20,
    },
    chip: {
        marginRight: 5,
    },
};

class Services extends Component {
    constructor(props) {
        super(props);

        this.state = {
            running: false,
            toast: '',
            showSelectId: false,
            text2commandList: [],
            nightscoutList: [],
            addValue: '',
            isInstanceAlive: false,
        };
        this.onKeyChangedBound = this.onKeyChanged.bind(this);

        this.props.socket.getAdapterInstances('text2command')
            .then(list =>
                this.props.socket.getAdapterInstances('nightscout')
                    .then(nsList => this.setState({
                        nightscoutList: nsList.map(obj => obj._id.replace('system.adapter.nightscout.', '')),
                        text2commandList: list.map(obj => obj._id.replace('system.adapter.text2command.', '')),
                    })));
    }

    componentDidMount() {
        this.props.socket.subscribeState(`iot.${this.props.instance}.certs.urlKey`, this.onKeyChangedBound);

        this.props.socket.getObject(`system.adapter.${this.props.adapterName}.${this.props.instance}`)
            .then(obj =>
                this.props.socket.getState(`system.adapter.${this.props.adapterName}.${this.props.instance}.alive`)
                    .then(state => this.setState({ isInstanceAlive: obj && obj.common && state && state.val })));
    }

    componentWillUnmount() {
        this.props.socket.unsubscribeState(`iot.${this.props.instance}.certs.urlKey`, this.onKeyChangedBound);
    }

    onKeyChanged(id, state) {
        state && this.setState({ key: state.val });
    }

    renderInput(title, attr, type) {
        return <TextField
            variant="standard"
            label={I18n.t(title)}
            style={{ ...styles.input, ...styles.controlElement }}
            value={this.props.native[attr]}
            type={type || 'text'}
            onChange={e => this.props.onChange(attr, e.target.value)}
            margin="normal"
        />;
    }

    reissueUrlKey() {
        this.setState({ running: true });
        return this.props.socket.setState(`iot.${this.props.instance}.certs.urlKey`, { val: '', ack: true })
            .then(() => this.props.socket.getObject(`system.adapter.iot.${this.props.instance}`))
            .then(obj => {
                if (!obj || !obj.common || !obj.common.enabled) {
                    this.setState({ running: false, toast: I18n.t('Key will be updated after start') });
                } else {
                    this.props.socket.setObject(`system.adapter.iot.${this.props.instance}`, obj);
                }
            })
            .then(() => this.setState({ running: false, toast: I18n.t('Certificates will be updated after initiated restart') }))
            .catch(err => {
                this.setState({ running: false });
                this.props.showError(err);
            });
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
            open={!0}
            autoHideDuration={6000}
            onClose={() => this.setState({ toast: '' })}
            ContentProps={{
                'aria-describedby': 'message-id',
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
        />;
    }

    onChipsDelete(attr, value) {
        const chips = (this.props.native[attr] || '').split(/[,;\s]/).filter(a => !!a);
        const pos = chips.indexOf(value);
        if (pos !== -1) {
            chips.splice(pos, 1);
            this.props.onChange(attr, chips.join(' '));
        }
    }

    onChipsAdd(attr) {
        const chips = (this.props.native[attr] || '').split(/[,;\s]/).filter(a => !!a);
        if (this.state.addValue === 'visu') {
            this.props.onError(I18n.t('This service is reserved for the ioBroker.visu app. Please use another service name.'));
            this.setState({ addValue: '' });
        } else if (!chips.includes(this.state.addValue) && this.state.addValue) {
            chips.push(this.state.addValue);
            this.setState({ addValue: '' }, () => this.props.onChange(attr, chips.join(' ')));
        }
    }

    calcNightscoutSecret() {
        const email = this.props.native.login.replace(/[^\w\d-_]/g, '_');
        const secret = this.props.native.nightscoutPass;
        return email + (secret ? `-${secret}` : '');
    }

    getSelectIdDialog(attr) {
        if (this.state.showSelectId) {
            return <DialogSelectID
                theme={this.props.theme}
                key="dialogSelectID3"
                imagePrefix="../.."
                socket={this.props.socket}
                selected={this.props.native[attr]}
                types={['state']}
                onClose={() => this.setState({ showSelectId: false })}
                onOk={selected => {
                    this.setState({ showSelectId: false });
                    this.props.onChange(attr, selected);
                }}
            />;
        }
        return null;
    }

    renderChips(label, attr) {
        return <div style={styles.chipsDiv}>
            <FormHelperText>{Utils.renderTextWithA(I18n.t(label))}</FormHelperText>
            <TextField
                variant="standard"
                label={I18n.t('Add service')}
                style={{ width: 150 }}
                type="text"
                value={this.state.addValue}
                onKeyUp={e => e.key === 'Enter' && this.onChipsAdd(attr)}
                onChange={e => this.setState({ addValue: e.target.value.trim() })}
                margin="normal"
            />

            <Fab size="small" color="secondary" disabled={!this.state.addValue} onClick={() => this.onChipsAdd(attr)} style={{ marginLeft: 5, marginTop: -15 }}><IconAdd /></Fab>

            <div style={styles.chips}>
                {(this.props.native[attr] || '').split(/[,;\s]/).filter(a => !!a)
                    .map(word => <Chip
                        key={word}
                        size="small"
                        label={word}
                        onDelete={() => this.onChipsDelete(attr, word)}
                        style={styles.chip}
                    />)}
            </div>
        </div>;
    }

    render() {
        return <form style={styles.tab}>
            <Button
                variant="outlined"
                disabled={!this.state.isInstanceAlive || this.state.running}
                color="primary"
                title={!this.state.isInstanceAlive ? I18n.t('Instance must be enabled') : ''}
                onClick={() => this.reissueUrlKey()}
                startIcon={<IconRefresh />}
            >
                {I18n.t('Get new service URL key')}
            </Button>
            <br />

            {this.renderInput('IFTTT key', 'iftttKey')}
            <br />

            <TextField
                variant="standard"
                label={I18n.t('Use following link for IFTTT')}
                style={{
                    ...styles.input,
                    ...styles.controlElement,
                    ...styles.fullSize,
                    marginTop: 10,
                }}
                value={`https://service.iobroker.in/v1/iotService?service=ifttt&key=${this.state.key}&user=${encodeURIComponent(this.props.native.login)}`}
                type="text"
                InputProps={{ readOnly: true }}
                margin="normal"
            />
            <Fab
                size="small"
                style={{ marginTop: 10, marginLeft: 5 }}
                onClick={() => Utils.copyToClipboard(`https://service.iobroker.in/v1/iotService?service=ifttt&key=${this.state.key}&user=${encodeURIComponent(this.props.native.login)}`)}
            >
                <IconCopy />
            </Fab>
            <br />
            <br />

            {this.renderChips('White list for services', 'allowedServices')}
            <br />

            <TextField
                variant="standard"
                label={I18n.t('Use following link for custom service')}
                style={{
                    ...styles.input,
                    ...styles.controlElement,
                    ...styles.fullSize,
                    marginTop: 10,
                }}
                value={`https://service.iobroker.in/v1/iotService?service=custom_<SERVICE_NAME>&key=${this.state.key}&user=${encodeURIComponent(this.props.native.login)}&data=<SOME_TEXT>`}
                type="text"
                InputProps={{ readOnly: true }}
                margin="normal"
            />
            <Fab size="small" style={{ marginTop: 10, marginLeft: 5 }} onClick={() => Utils.copyToClipboard(`https://service.iobroker.in/v1/iotService?service=custom_<SERVICE_NAME>&key=${this.state.key}&user=${encodeURIComponent(this.props.native.login)}&data=<SOME_TEXT>`)}><IconCopy /></Fab>
            <br />

            <FormControl style={{ ...styles.input, ...styles.controlElement, paddingTop: 20 }} variant="standard">
                <Select
                    variant="standard"
                    value={this.props.native.text2command || '_'}
                    onChange={e => this.props.onChange('text2command', e.target.value === '_' ? '' : e.target.value)}
                    input={<Input name="text2command" id="text2command-helper" />}
                >
                    <MenuItem key="key-default" value="_">{I18n.t('disabled')}</MenuItem>
                    {this.state.text2commandList.map(item => <MenuItem key={`key-${item}`} value={item}>
text2command.
                        {item}
                    </MenuItem>)}
                </Select>
                <FormHelperText>{I18n.t('Use text2command instance')}</FormHelperText>
            </FormControl>
            <br />
            <FormControl style={{ ...styles.input, ...styles.controlElement, paddingTop: 20 }} variant="standard">
                <Select
                    variant="standard"
                    value={this.props.native.nightscout || '_'}
                    onChange={e => this.props.onChange('nightscout', e.target.value === '_' ? '' : e.target.value)}
                    input={<Input name="nightscout" id="nightscout-helper" />}
                >
                    <MenuItem key="key-default" value="_">{I18n.t('disabled')}</MenuItem>
                    {this.state.nightscoutList.map(item => <MenuItem key={`key-${item}`} value={item}>
nightscout.
                        {item}
                    </MenuItem>)}
                </Select>
                <FormHelperText>{I18n.t('Use Nightscout instance')}</FormHelperText>
            </FormControl>
            {this.props.native.nightscout ? <TextField
                variant="standard"
                label={I18n.t('Nightscout password')}
                onChange={e => this.props.onChange('nightscoutPass', e.target.value.replace(/[^\w\d-_]/g, '_'))}
                style={{
                    ...styles.input,
                    ...styles.controlElement,
                    ...styles.normalSize,
                    marginTop: 3.5,
                }}
                value={this.props.native.nightscoutPass}
                type="text"
                margin="normal"
            /> : null}
            {this.props.native.nightscout ? <TextField
                variant="standard"
                label={I18n.t('Nightscout api-secret')}
                style={{
                    ...styles.input,
                    ...styles.controlElement,
                    ...styles.normalSize,
                    marginTop: 3.5,
                }}
                value={this.calcNightscoutSecret()}
                type="text"
                InputProps={{ readOnly: true }}
                margin="normal"
            /> : null}
            <br />
            <br />
            <div style={styles.controlElement}>
                <TextField
                    variant="standard"
                    label={I18n.t('Read blood sugar from')}
                    style={{ ...styles.input, ...styles.controlElement }}
                    value={this.props.native.amazonAlexaBlood || ''}
                    type="text"
                    onChange={e => this.props.onChange('amazonAlexaBlood', e.target.value)}
                    margin="normal"
                />
                <Fab size="small" color="secondary" onClick={() => this.setState({ showSelectId: true })} aria-label="Add" style={{ marginLeft: 5, marginTop: 10 }}><IconAdd /></Fab>
                <FormControlLabel
                    style={styles.controlElement}
                    control={
                        <Checkbox
                            style={{ paddingLeft: 30 }}
                            checked={this.props.native.amazonAlexaBloodShortAnswer || false}
                            onChange={e => this.props.onChange('amazonAlexaBloodShortAnswer', e.target.checked)}
                            color="primary"
                        />
                    }
                    label={I18n.t('Short answer for blood sugar')}
                />
            </div>
            <br />
            {this.renderToast()}
            {this.getSelectIdDialog('amazonAlexaBlood')}
        </form>;
    }
}

Services.propTypes = {
    //     common: PropTypes.object.isRequired,
    native: PropTypes.object.isRequired,
    instance: PropTypes.number.isRequired,
    adapterName: PropTypes.string.isRequired,
    onError: PropTypes.func,
    //    onLoad: PropTypes.func,
    onChange: PropTypes.func,
    socket: PropTypes.object.isRequired,
    //    onShowError: PropTypes.func,
    theme: PropTypes.object,
};

export default Services;
