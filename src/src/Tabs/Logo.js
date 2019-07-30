import React, {Component} from 'react';
import {withStyles} from '@material-ui/core/styles';
import Fab from '@material-ui/core/Fab';
import PropTypes from 'prop-types';

import I18n from '@iobroker/adapter-react/i18n';

import {MdHelpOutline as IconHelp} from 'react-icons/md';
import {FaFileDownload as IconDownload} from 'react-icons/fa';
import {FaFileUpload as IconUpload} from 'react-icons/fa';

const styles = theme => ({
    buttons: {
        marginRight: 5,
        marginTop: 5,
        float: 'right'
    },
    logo: {
        padding: 8,
        width: 64
    }
});

class Logo extends Component {

    static generateFile(filename, obj) {
        const el = window.document.createElement('a');
        el.setAttribute('href', 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(obj, null, 2)));
        el.setAttribute('download', filename);

        el.style.display = 'none';
        window.document.body.appendChild(el);

        el.click();

        window.document.body.removeChild(el);
    }

    handleFileSelect(evt) {
        const f = evt.target.files[0];
        if (f) {
            const r = new window.FileReader();
            r.onload = e => {
                const contents = e.target.result;
                try {
                    const json = JSON.parse(contents);
                    if (json.native && json.common) {
                        if (json.common.name !== this.props.common.name) {
                            this.props.onError(I18n.t('otherConfig', json.common.name));
                        } else {
                            this.props.onLoad(json.native);
                        }
                    } else {
                        this.props.onError(I18n.t('invalidConfig'));
                    }
                } catch (e) {
                    this.props.onError(e.toString());
                }
            };
            r.readAsText(f);
        } else {
            alert('Failed to open JSON File');
        }
    }

    download() {
        const result = {
            _id: 'system.adapter.' + this.props.common.name + '.' + this.props.instance,
            common: JSON.parse(JSON.stringify(this.props.common)),
            native: this.props.native
        };
        // remove unimportant information
        if (result.common.news) {
            delete result.common.news;
        }
        if (result.common.titleLang) {
            delete result.common.titleLang;
        }
        if (result.common.desc) {
            delete result.common.desc;
        }

        //window.open('data:application/iobroker; content-disposition=attachment; filename=' + result._id + '.json,' + JSON.stringify(result, null, 2));
        Logo.generateFile(result._id + '.json', result);
    }

    upload() {
        const input = window.document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('id', 'files');
        input.setAttribute('opacity', 0);
        input.addEventListener('change', e => this.handleFileSelect(e, () => {}), false);
        (input.click)();
    }

    render() {
        return (<div>
            {this.props.common.icon && (<img src={this.props.common.icon} className={this.props.classes.logo} alt="logo"/>)}
            {this.props.common.readme &&
                (<Fab size="small" color="primary" aria-label="Help" className={this.props.classes.buttons} onClick={() => {
                    const win = window.open(this.props.common.readme, '_blank');
                    win.focus();
                }}><IconHelp /></Fab>)}
            <Fab size="small" color="primary" aria-label="Load config" className={this.props.classes.buttons} title={I18n.t('Load configuration from file')} onClick={() => this.upload()}><IconUpload /></Fab>
            <Fab size="small" color="primary" aria-label="Save config" className={this.props.classes.buttons} title={I18n.t('Save configuration to file')} onClick={() => this.download()}><IconDownload /></Fab>
        </div>);
    }
}

Logo.propTypes = {
    common: PropTypes.object.isRequired,
    native: PropTypes.object.isRequired,
    instance: PropTypes.number.isRequired,
    onError: PropTypes.func,
    onLoad: PropTypes.func,
};

export default withStyles(styles)(Logo);
