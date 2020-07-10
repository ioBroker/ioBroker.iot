import React, {Component} from 'react';
import {withStyles} from '@material-ui/core/styles';
import PropTypes from 'prop-types';
import TextField from '@material-ui/core/TextField';
import Input from '@material-ui/core/Input';
import FormHelperText from '@material-ui/core/FormHelperText';
import Fab from '@material-ui/core/Fab';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Checkbox from '@material-ui/core/Checkbox';

import {MdAdd as IconAdd} from 'react-icons/md';

import I18n from '@iobroker/adapter-react/i18n';
import DialogSelectID from '@iobroker/adapter-react/Dialogs/SelectID';
import Utils from '@iobroker/adapter-react/Components/Utils'

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
        };

    }
    
    renderInput(title, attr, type) {
        return (<TextField
            label={I18n.t(title)}
            className={this.props.classes.input + ' ' + this.props.classes.controlElement}
            value={this.props.native[attr]}
            type={type || 'text'}
            onChange={e => this.props.onChange(attr, e.target.value)}
            margin="normal"
        />);
    }

    renderSelect(title, attr, options, style) {
        return (<FormControl className={this.props.classes.input + ' ' + this.props.classes.controlElement} style={Object.assign({paddingTop: 5}, style)}>
            <Select
                value={this.props.native[attr] || '_'}
                onChange={e => this.props.onChange(attr, e.target.value === '_' ? '' : e.target.value)}
                input={<Input name={attr} id={attr + '-helper'} />}
            >
                {options.map(item => (<MenuItem key={'key-' + item.value} value={item.value || '_'}>{I18n.t(item.title)}</MenuItem>))}
            </Select>
            <FormHelperText>{I18n.t(title)}</FormHelperText>
        </FormControl>);
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

    getSelectIdDialog(attr) {
        if (this.state.showSelectId) {
            return (<DialogSelectID
                key="dialogSelectID2"
                prefix={'../..'}
                socket={this.props.socket}
                selected={this.props.native[attr]}
                types={['state']}
                onClose={() => this.setState({showSelectId: false})}
                onOk={selected => {
                    this.setState({showSelectId: false});
                    this.props.onChange(attr, selected);
                }}
            />);
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
                    {title: 'english', value: 'en'},
                    {title: 'Deutsch', value: 'de'},
                    {title: 'русский', value: 'ru'}
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
