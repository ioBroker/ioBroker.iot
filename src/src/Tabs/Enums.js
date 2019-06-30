import React, {Component} from 'react';
import {withStyles} from '@material-ui/core/styles';
import PropTypes from 'prop-types';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import Utils from '../Components/Utils'
import Switch from '@material-ui/core/Switch';
import {MdEdit as IconEdit} from 'react-icons/md';

import I18n from '../i18n';
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import Dialog from "@material-ui/core/Dialog";
import MessageDialog from '../Dialogs/Message';
import CircularProgress from '@material-ui/core/CircularProgress';

const CHANGED_COLOR = '#e7000040';

const styles = theme => ({
    tab: {
        width: '100%',
        height: '100%'
    },
    column: {
        display: 'inline-block',
        verticalAlign: 'top',
        marginRight: 20,
        height: '100%',
        overflow: 'hidden',
        width: 'calc(50% - 20px)',
        minWidth: 300,
        maxWidth: 450
    },
    columnDiv: {
        height: 'calc(100% - 60px)',
        overflow: 'auto',
        minWidth: 300
    },
    enumLineEnabled: {
        position: 'absolute',
        right: 0,
        top: 0,
    },
    enumLineEdit: {
        //float: 'right'
        position: 'absolute',
        top: 5,
        right: 50
    },
    enumLineName: {

    },
    enumLineSubName:{
        fontStyle: 'italic',
    },
    enumLine: {
        height: 48,
        width: '100%',
        position: 'relative'
    },
    enumLineId: {
        display: 'block',
        fontStyle: 'italic',
        fontSize: 12
    },
    columnHeader: {
        background: theme.palette.primary.light,
        padding: 10,
        color: theme.palette.primary.contrastText
    }
});

const adapterName = 'iot.';

class Enums extends Component {
    constructor(props) {
        super(props);

        this.state = {
            inAction: false,
            editId: '',
            editedSmartName: '',
            funcs: [],
            rooms: [],
            changed: [],
            message: '',
            loading: true,
        };

        this.onEnumUpdateBound = this.onEnumUpdate.bind(this);

        this.props.socket.getEnums()
            .then(res => {
                const funcs = [];
                const rooms = [];
                Object.keys(res).forEach(id => {
                    if (id.match(/^enum\.rooms\./)) {
                        rooms.push(res[id]);
                    } else
                    if (id.match(/^enum\.functions\./)) {
                        funcs.push(res[id]);
                    }
                });

                this.setState({funcs, rooms, loading: false});
                return this.props.socket.subscribeObject('enum.*', this.onEnumUpdateBound);
            });
    }

    componentWillUnmount() {
        this.props.socket.unsubscribeObject('enum.*', this.onEnumUpdateBound).then(() => {});
    }

    onEnumUpdate(id, obj) {
        this.removeChanged(id);
        this.updateObjInState(id, obj);
    }

    informInstance(id) {
        this.props.socket.sendTo(adapterName + this.props.instance, 'update', id);
    }

    addChanged(id) {
        const changed = JSON.parse(JSON.stringify(this.state.changed));
        if (changed.indexOf(id) === -1) {
            changed.push(id);
            this.setState({changed});
        }
    }

    removeChanged(id) {
        const changed = JSON.parse(JSON.stringify(this.state.changed));
        const pos = changed.indexOf(id);

        if (pos !== -1) {
            changed.splice(pos, 1);
            this.setState({changed});
        }
    }

    updateObjInState(id, obj) {
        // update obj
        if (id.match(/^enum\.functions\./)) {
            for (let i = this.state.funcs.length - 1; i >= 0 ; i--) {
                if (this.state.funcs[i]._id === id) {
                    const funcs = JSON.parse(JSON.stringify(this.state.funcs));
                    if (obj) {
                        funcs[i] = obj;
                    } else {
                        funcs.splice(i, 1);
                    }
                    this.setState({funcs});
                    break;
                }
            }
        } else
        if (id.match(/^enum\.rooms\./)) {
            for (let i = this.state.rooms.length - 1; i >= 0; i--) {
                if (this.state.rooms[i]._id === id) {
                    const rooms = JSON.parse(JSON.stringify(this.state.rooms));
                    if (obj) {
                        rooms[i] = obj;
                    } else {
                        rooms.splice(i, 1);
                    }
                    this.setState({rooms});
                    break;
                }
            }
        }
    }

    onToggleEnum(id) {
        let obj = this.state.funcs.find(e => e._id === id) || this.state.rooms.find(e => e._id === id);

        let smartName = Utils.getSmartNameFromObj(obj);
        obj = JSON.parse(JSON.stringify(obj));
        if (smartName !== false) {
            Utils.disableSmartName(obj, adapterName + this.props.instance, this.props.native.noCommon);
        } else {
            Utils.removeSmartName(obj, adapterName + this.props.instance, this.props.native.noCommon);
        }

        this.addChanged(id);

        this.props.socket.setObject(id, obj)
            .then(() => {
                // update obj
                this.updateObjInState(id, obj);
                this.informInstance(id);

                setTimeout(() => this.removeChanged(id), 500);
            });
    }

    onEdit(id) {
        const obj = this.state.funcs.find(e => e._id === id) || this.state.rooms.find(e => e._id === id);
        let smartName = Utils.getSmartNameFromObj(obj, adapterName + this.props.instance, this.props.native.noCommon);
        if (typeof smartName === 'object' && smartName) {
            smartName = smartName[I18n.getLanguage()] || smartName.en;
        }
        smartName = smartName || Utils.getObjectNameFromObj(obj, null, {language: I18n.getLanguage()});
        this.setState({editId: id, editedSmartName: smartName});
    }

    renderEnum(obj) {
        let smartName = Utils.getSmartNameFromObj(obj, adapterName + this.props.instance, this.props.native.noCommon);
        // convert old format
        if (smartName && typeof smartName === 'object') {
            smartName = smartName[I18n.getLanguage()] || smartName.en || '';
        }
        let name = Utils.getObjectNameFromObj(obj);

        return (<div className={this.props.classes.enumLine} style={{background: this.state.changed.indexOf(obj._id) !== -1 ? CHANGED_COLOR : 'inherit'}}>
            <span className={this.props.classes.enumLineName} style={{opacity: smartName === false ? 0.5: 1}}>{smartName || null}{smartName ? (<span className={this.props.classes.enumLineSubName}> ({name})</span>) : name}</span>
            <span className={this.props.classes.enumLineId} style={{opacity: smartName === false ? 0.5: 1}}>{obj._id}</span>
            <Switch
                className={this.props.classes.enumLineEnabled}
                checked={smartName !== false}
                onChange={() => this.onToggleEnum(obj._id)}
            />
            <IconButton aria-label="Edit" className={this.props.classes.enumLineEdit} onClick={() => this.onEdit(obj._id)}>
                <IconEdit fontSize="small" />
            </IconButton>

        </div>);
    }

    renderEnums(name) {
        return this.state[name].map(e => this.renderEnum(e));
    }

    renderMessage() {
        if (this.state.message) {
            return (<MessageDialog text={this.state.message} onClose={() => this.setState({message: ''})}/>);
        } else {
            return null;
        }
    }

    changeSmartName() {
        // Check if the name is duplicate
        let enums = this.state.editId.startsWith('enum.functions.') ? this.state.funcs : this.state.rooms;
        if (enums.find(obj =>
            this.state.editId !== obj._id && (
            this.state.editedSmartName === Utils.getObjectNameFromObj(obj, null, {language: I18n.getLanguage()}) ||
            this.state.editedSmartName === Utils.getSmartNameFromObj(obj, adapterName + this.props.instance, this.props.native.noCommon)))) {
            this.setState({message: I18n.t('Duplicate name')});
        } else {
            this.addChanged(this.state.editId);
            setTimeout(() => this.removeChanged(this.state.editId), 500);
            const id = this.state.editId;
            this.setState({editId: ''});
            let newObj;
            this.props.socket.getObject(id)
                .then(obj => {
                    Utils.updateSmartName(obj, this.state.editedSmartName, undefined, undefined, adapterName + this.props.instance, this.props.native.noCommon);
                    newObj = obj;
                    return this.props.socket.setObject(id, obj);
                })
                .then(() => {
                    // update obj
                    this.updateObjInState(id, newObj);
                    this.informInstance(id);
                })
                .catch(err => this.props.onError(err));
        }
    }

    renderEditDialog() {
        if (this.state.editId) {
            const obj = this.state.funcs.find(e => e._id === this.state.editId) || this.state.rooms.find(e => e._id === this.state.editId);

            return (<Dialog
                open={true}
                maxWidth="sm"
                fullWidth={true}
                onClose={() => this.handleOk()}
                aria-labelledby="message-dialog-title"
                aria-describedby="message-dialog-description"
            >
                <DialogTitle id="message-dialog-title">{this.props.title || I18n.t('Smart name for %s', Utils.getObjectNameFromObj(obj, null, {language: I18n.getLanguage()}))}</DialogTitle>
                <DialogContent>
                    <TextField
                        style={{width: '100%'}}
                        label={I18n.t('Smart name')}
                        onChange={e => this.setState({editedSmartName: e.target.value})}
                        value={this.state.editedSmartName}
                        helperText={I18n.t('You can enter several names divided by comma')}
                        margin="normal"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => this.changeSmartName()} color="primary" autoFocus>{I18n.t('Ok')}</Button>
                    <Button onClick={() => this.setState({editId: ''})}>{I18n.t('Cancel')}</Button>
                </DialogActions>
            </Dialog>)
        } else {
            return null;
        }
    }

    render() {
        if (this.state.loading) {
            return (<CircularProgress />);
        }
        return (
            <form className={this.props.classes.tab}>
                <div className={this.props.classes.column}>
                    <h5 className={this.props.classes.columnHeader}>{I18n.t('Rooms')}</h5>
                    <div className={this.props.classes.columnDiv}>{this.renderEnums('rooms')}</div>
                </div>
                <div className={this.props.classes.column}>
                    <h5 className={this.props.classes.columnHeader}>{I18n.t('Functions')}</h5>
                    <div className={this.props.classes.columnDiv}>{this.renderEnums('funcs')}</div>
                </div>
                {this.renderMessage()}
                {this.renderEditDialog()}
            </form>
        );
    }
}

Enums.propTypes = {
    common: PropTypes.object.isRequired,
    native: PropTypes.object.isRequired,
    instance: PropTypes.number.isRequired,
    onError: PropTypes.func,
    onLoad: PropTypes.func,
    onChange: PropTypes.func,
    socket: PropTypes.object.isRequired,
};

export default withStyles(styles)(Enums);
