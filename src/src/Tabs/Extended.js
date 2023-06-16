import React, { Component } from 'react';
import { withStyles } from '@mui/styles';
import PropTypes from 'prop-types';

import TextField from '@mui/material/TextField';
import Input from '@mui/material/Input';
import FormHelperText from '@mui/material/FormHelperText';
import Fab from '@mui/material/Fab';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';

import { MdAdd as IconAdd } from 'react-icons/md';

import {
    Utils, I18n, SelectID as DialogSelectID,
} from '@iobroker/adapter-react-v5';

const styles = () => ({
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
});

class ExtendedOptions extends Component {
    constructor(props) {
        super(props);

        this.state = {
            showSelectId: false,
            adminInstances: [],
            webInstances: [],
        };
    }

    componentDidMount() {
        this.props.socket.getAdapterInstances('admin')
            .then(adminInstances => {
                // filter out instances with authentication
                adminInstances = adminInstances
                    .filter(item => !item.common.auth)
                    .map(item => ({ title: `${item.common.name}.${item._id.split('.').pop()}`, value: `${item.common.name}.${item._id.split('.').pop()}`, noTranslation: true }));

                adminInstances.unshift({ title: 'disabled', value: '' });

                return this.props.socket.getAdapterInstances('web')
                    .then(webInstances => {
                        webInstances = webInstances
                            .filter(item => !item.common.auth)
                            .map(item => ({ title: `${item.common.name}.${item._id.split('.').pop()}`, value: `${item.common.name}.${item._id.split('.').pop()}`, noTranslation: true }));

                        webInstances.unshift({ title: 'disabled', value: '' });

                        this.setState({ adminInstances, webInstances });
                    });
            });
    }

    renderInput(title, attr, type, disabled, helperText) {
        return <TextField
            variant="standard"
            label={I18n.t(title)}
            disabled={disabled}
            className={Utils.clsx(this.props.classes.input, this.props.classes.controlElement)}
            value={this.props.native[attr]}
            type={type || 'text'}
            helperText={helperText ? I18n.t(helperText) : ''}
            onChange={e => this.props.onChange(attr, e.target.value)}
            margin="normal"
        />;
    }

    renderSelect(title, attr, options, style) {
        return <FormControl
            className={Utils.clsx(this.props.classes.input, this.props.classes.controlElement)}
            style={({ paddingTop: 5, paddingRight: 8, ...style })}
            variant="standard"
        >
            <Select
                variant="standard"
                value={this.props.native[attr] || '_'}
                onChange={e => this.props.onChange(attr, e.target.value === '_' ? '' : e.target.value)}
                input={<Input name={attr} id={`${attr}-helper`} />}
            >
                {options.map(item => <MenuItem key={`key-${item.value}`} value={item.value || '_'}>{item.noTranslation ? item.title : I18n.t(item.title)}</MenuItem>)}
            </Select>
            <FormHelperText>{I18n.t(title)}</FormHelperText>
        </FormControl>;
    }

    renderCheckbox(title, attr, style) {
        return <FormControlLabel
            key={attr}
            style={({ paddingTop: 5, ...style })}
            className={this.props.classes.controlElement}
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

    getSelectIdDialog(attr) {
        if (this.state.showSelectId) {
            return <DialogSelectID
                key="dialogSelectID2"
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

    render() {
        return <form className={this.props.classes.tab}>
            {
                /* this.renderInput('Cloud URL', 'cloudUrl', null, true) */
            }
            {this.renderSelect('Language', 'language', [
                { title: 'default', value: '' },
                { title: 'english', value: 'en', noTranslation: true },
                { title: 'Deutsch', value: 'de', noTranslation: true },
                { title: 'русский', value: 'ru', noTranslation: true },
            ])}
            {this.renderCheckbox('Place function in names first', 'functionFirst')}
            {this.renderInput('Concatenate words with', 'concatWord')}
            {
                /* this.renderInput('Replace in names', 'replaces') */
            }
            {this.props.native.amazonAlexaV3 ?
                <FormControl
                    className={Utils.clsx(this.props.classes.input, this.props.classes.controlElement)}
                    style={({ paddingTop: 5, paddingRight: 8 })}
                    variant="standard"
                >
                    <Select
                        variant="standard"
                        value={this.props.native.defaultToggle || false}
                        onChange={e => this.props.onChange('defaultToggle', e.target.value)}
                    >
                        <MenuItem value={!1}>{I18n.t('Do not toggle')}</MenuItem>
                        <MenuItem value={!0}>{I18n.t('Toggle')}</MenuItem>
                    </Select>
                    <FormHelperText>{I18n.t('Default toggle behaviour (Only alexa v3)')}</FormHelperText>
                </FormControl> : null}
            {this.renderInput('OFF level for switches in %', 'deviceOffLevel', null, false, '(Set to 0 if behavior not desired)')}
            <div className={this.props.classes.controlElement}>
                {this.renderInput('Write response to', 'responseOID')}
                <Fab size="small" color="secondary" onClick={() => this.setState({ showSelectId: true })} aria-label="Add" style={{ marginLeft: 5, marginTop: 10 }}>
                    <IconAdd />
                </Fab>
            </div>
            <div className={this.props.classes.controlElement}>
                {this.renderCheckbox('Personal settings (only pro)', 'noCommon')}
                <FormHelperText>{Utils.renderTextWithA(I18n.t('help_tip'))}</FormHelperText>
            </div>
            {this.renderCheckbox('Debug outputs', 'debug')}
            <div className={this.props.classes.controlElement}>
                {this.renderCheckbox('Allow remote access', 'remote')}
                {this.props.native.remote ? this.renderSelect('Admin instance', 'remoteAdminInstance', this.state.adminInstances, { width: 120, minWidth: 120 }) : null}
                {this.props.native.remote ? this.renderSelect('Web instance', 'remoteWebInstance', this.state.webInstances, { width: 120, minWidth: 120 }) : null}
            </div>

            {this.getSelectIdDialog('responseOID')}
        </form>;
    }
}

ExtendedOptions.propTypes = {
//    common: PropTypes.object.isRequired,
    native: PropTypes.object.isRequired,
    //    instance: PropTypes.number.isRequired,
    //    onError: PropTypes.func,
    //    onLoad: PropTypes.func,
    onChange: PropTypes.func,
    socket: PropTypes.object.isRequired,
};

export default withStyles(styles)(ExtendedOptions);
