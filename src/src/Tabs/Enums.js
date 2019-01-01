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


const styles = theme => ({
    tab: {
        width: '100%',
        height: '100%'
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
        marginRight: 20,
        height: '100%',
        overflow: 'hidden'
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
        right: 40
    },
    enumLineName: {

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
    }
});

class Enums extends Component {
    constructor(props) {
        super(props);

        this.state = {
            inAction: false,
            editId: '',
            editedSmartName: '',
            funcs: [],
            rooms: [],
            changed: []
        };

        this.props.socket.getEnums()
            .then(res => {
                const funcs = [];
                const rooms = [];
                Object.keys(res).forEach(id => {
                    if (id.match(/^enum\.rooms\./)) {
                        funcs.push(res[id]);
                    } else
                    if (id.match(/^enum\.functions\./)) {
                        rooms.push(res[id]);
                    }
                });
                this.setState({funcs, rooms});
            });
    }

    informInstance(id) {
        this.props.socket.sendTo('iot.' + this.props.instance, 'update', id);
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

    updateObjInState(obj) {
        // update obj
        if (obj._id.match(/^enum\.funcs\./)) {
            for (let i = 0; i < this.state.funcs.length; i++) {
                if (this.state.funcs[i]._id === obj._id) {
                    const funcs = JSON.parse(JSON.stringify(this.state.funcs));
                    funcs[i] = obj;
                    this.setState({funcs});
                    break;
                }
            }
        } else
        if (obj._id.match(/^enum\.rooms\./)) {
            for (let i = 0; i < this.state.rooms.length; i++) {
                if (this.state.rooms[i]._id === obj._id) {
                    const rooms = JSON.parse(JSON.stringify(this.state.rooms));
                    rooms[i] = obj;
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
            Utils.disableSmartName(obj);
        } else {
            Utils.removeSmartName(obj);
        }

        this.addChanged(id);

        this.props.socket.setObject(id, obj)
            .then(() => {
                this.informInstance(id);
                // update obj
                this.updateObjInState(obj);

                setTimeout(() => this.removeChanged(id));
            });
    }

    onEdit(id) {
        const obj = this.state.funcs.find(e => e._id === id) || this.state.rooms.find(e => e._id === id);
        let smartName = Utils.getSmartNameFromObj(obj);
        if (typeof smartName === 'object' && smartName) {
            smartName = smartName[I18n.getLanguage()] || smartName.en;
        }
        smartName = smartName || Utils.getObjectNameFromObj(obj, null, {language: I18n.getLanguage()});
        this.setState({editId: id, editedSmartName: smartName});
    }

    renderEnum(obj) {
        let smartName = Utils.getSmartNameFromObj(obj);
        // convert old format
        if (smartName && typeof smartName === 'object') {
            smartName = smartName[I18n.getLanguage()] || smartName.en || '';
        }
        let name = Utils.getObjectNameFromObj(obj);

        return (<div className={this.props.classes.enumLine}>
            <span className={this.props.classes.enumLineName}>{smartName || null}{smartName ? (<span className={this.props.classes.enumLineSubName}>({name})</span>) : name}</span>
            <span className={this.props.classes.enumLineId}>{obj._id}</span>
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

    changeSmartName() {
        this.setState({editId: ''});
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
        return (
            <form className={this.props.classes.tab}>
                <div className={this.props.classes.column}>
                    <h5>{I18n.t('Rooms')}</h5>
                    <div className={this.props.classes.columnDiv}>{this.renderEnums('rooms')}</div>
                </div>
                <div className={this.props.classes.column}>
                    <h5>{I18n.t('Functions')}</h5>
                    <div className={this.props.classes.columnDiv}>{this.renderEnums('funcs')}</div>
                </div>
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
