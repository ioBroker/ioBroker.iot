import React, {Component} from 'react';
import { withStyles } from '@mui/styles';
import PropTypes from 'prop-types';
import clsx from 'clsx';

import TextField from '@mui/material/TextField';
import Input from '@mui/material/Input';
import FormHelperText from '@mui/material/FormHelperText';
import Fab from '@mui/material/Fab';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';

import {MdAdd as IconAdd} from 'react-icons/md';

import I18n from '@iobroker/adapter-react-v5/i18n';
import DialogSelectID from '@iobroker/adapter-react-v5/Dialogs/SelectID';
import Utils from '@iobroker/adapter-react-v5/Components/Utils'

const styles = theme => ({
    tab: {
        width: '100%',
        minHeight: '100%'
    },
    input: {
        marginTop: 0,
        minWidth: 400
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
    },
    controlElement: {
        //background: '#d2d2d2',
        marginBottom: 5
    }
});

class ExtendedOptions extends Component {
    constructor(props) {
        super(props);

        this.state = {
            showSelectId: false,
            adminInstances: [],
            webInstances: []
        };
    }

    componentDidMount() {
        this.props.socket.getAdapterInstances('admin')
            .then(adminInstances => {
                // filter out instances with authentication
                adminInstances = adminInstances
                    .filter(item => !item.common.auth)
                    .map(item => ({title: item.common.name + '.' + item._id.split('.').pop(), value: item.common.name + '.' + item._id.split('.').pop(), noTranslation: true}));

                adminInstances.unshift({title: 'disabled', value: ''});

                return this.props.socket.getAdapterInstances('web')
                    .then(webInstances => {
                        webInstances = webInstances
                            .filter(item => !item.common.auth)
                            .map(item => ({title: item.common.name + '.' + item._id.split('.').pop(), value: item.common.name + '.' + item._id.split('.').pop(), noTranslation: true}));

                        webInstances.unshift({title: 'disabled', value: ''});

                        this.setState({adminInstances, webInstances});
                    });
            });
    }

    renderInput(title, attr, type) {
        return <TextField
            variant="standard"
            label={I18n.t(title)}
            className={clsx(this.props.classes.input, this.props.classes.controlElement)}
            value={this.props.native[attr]}
            type={type || 'text'}
            onChange={e => this.props.onChange(attr, e.target.value)}
            margin="normal"
        />;
    }

    renderSelect(title, attr, options, style) {
        return <FormControl
            className={clsx(this.props.classes.input, this.props.classes.controlElement)}
            style={Object.assign({ paddingTop: 5, paddingRight: 8 }, style)}
            variant="standard"
        >
            <Select
                variant="standard"
                value={this.props.native[attr] || '_'}
                onChange={e => this.props.onChange(attr, e.target.value === '_' ? '' : e.target.value)}
                input={<Input name={attr} id={attr + '-helper'} />}
            >
                {options.map(item => <MenuItem key={'key-' + item.value} value={item.value || '_'}>{item.noTranslation ? item.title : I18n.t(item.title)}</MenuItem>)}
            </Select>
            <FormHelperText>{I18n.t(title)}</FormHelperText>
        </FormControl>;
    }

    renderCheckbox(title, attr, style) {
        return <FormControlLabel key={attr} style={Object.assign({paddingTop: 5}, style)} className={this.props.classes.controlElement}
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
                onClose={() => this.setState({showSelectId: false})}
                onOk={selected => {
                    this.setState({showSelectId: false});
                    this.props.onChange(attr, selected);
                }}
            />;
        } else {
            return null;
        }
    }

    render() {
        return (
            <form className={this.props.classes.tab}>
                {this.renderInput('Cloud URL', 'cloudUrl')}<br/>
                {this.renderSelect('Language', 'language', [
                    {title: 'default', value: ''},
                    {title: 'english', value: 'en', noTranslation: true},
                    {title: 'Deutsch', value: 'de', noTranslation: true},
                    {title: 'русский', value: 'ru', noTranslation: true}
                ], {marginTop: 10})}<br/>
                {this.renderCheckbox('Place function in names first', 'functionFirst', {marginTop: 10})}<br/>
                {this.renderInput('Concatenate words with', 'concatWord')}<br/>
                {this.renderInput('Replace in names', 'replaces')}<br/>
                <div className={this.props.classes.controlElement} style={{marginTop: 15}}>
                    {this.renderInput('OFF level for switches in %', 'deviceOffLevel')}
                    <FormHelperText>{I18n.t('(Set to 0 if behavior not desired)')}</FormHelperText>
                </div>
                <div className={this.props.classes.controlElement}>
                    {this.renderInput('Write response to', 'responseOID')}
                    <Fab size="small" color="secondary" onClick={() => this.setState({showSelectId: true})} aria-label="Add" style={{marginLeft: 5, marginTop: 10}}><IconAdd /></Fab><br/>
                </div>
                <div className={this.props.classes.controlElement}>
                    {this.renderCheckbox('Personal settings (only pro)', 'noCommon')}
                    <FormHelperText>{Utils.renderTextWithA(I18n.t('help_tip'))}</FormHelperText><br/>
                </div>
                {this.renderCheckbox('Debug outputs', 'debug')}
                {this.getSelectIdDialog('responseOID')}
                <div className={this.props.classes.controlElement}>
                    {this.renderCheckbox('Allow remote access', 'remote')}
                    {this.props.native.remote ? this.renderSelect('Admin instance', 'remoteAdminInstance', this.state.adminInstances, {width: 120, minWidth: 120}) : null}
                    {this.props.native.remote ? this.renderSelect('Web instance', 'remoteWebInstance', this.state.webInstances, {width: 120, minWidth: 120}) : null}
                </div>
            </form>
        );
    }
}

ExtendedOptions.propTypes = {
    common: PropTypes.object.isRequired,
    native: PropTypes.object.isRequired,
    instance: PropTypes.number.isRequired,
    onError: PropTypes.func,
    onLoad: PropTypes.func,
    onChange: PropTypes.func,
    socket: PropTypes.object.isRequired,
};

export default withStyles(styles)(ExtendedOptions);
