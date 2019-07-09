import React, {Component} from 'react';
import Connection from './Connection';
import {PROGRESS} from './Connection';
import I18n from './i18n';
import DialogError from './Dialogs/Error';
import Toolbar from '@material-ui/core/Toolbar';
import Fab from '@material-ui/core/Fab';
import Snackbar from '@material-ui/core/Snackbar';
import IconButton from '@material-ui/core/IconButton';

import {MdSave as IconSave} from 'react-icons/md'
import {MdClose as IconClose} from 'react-icons/md'

import Theme from './Theme';

class GenericApp extends Component {
    constructor(props) {
        super(props);

        // extract instance from URL
        this.instance = parseInt(window.location.search.slice(1), 10) || 0;
        // extract adapter name from URL
        const tmp = window.location.pathname.split('/');
        this.adapterName = tmp[tmp.length - 2] || 'iot';
        this.instanceId  = 'system.adapter.' + this.adapterName + '.' + this.instance;

        this.state = {
            selectedTab: window.localStorage[this.adapterName + '-adapter'] || '',
            selectedTabNum: -1,
            native: {},
            errorText: '',
            changed: false,
            connected: false,
            loaded: false,
            themeType: 'light',
            toast: ''
        };

        try {
            this.isIFrame = window.self !== window.top;
        } catch (e) {
            this.isIFrame = true;
        }

        this.savedNative = {}; // to detect if the config changed

        this.socket = new Connection({
            onProgress: progress => {
                if (progress === PROGRESS.CONNECTING) {
                    this.setState({connected: false});
                } else if (progress === PROGRESS.READY) {
                    this.setState({connected: true});
                } else {
                    this.setState({connected: true});
                }
            },
            onReady: (objects, scripts) => {
                I18n.setLanguage(this.socket.systemLang);
                this.socket.getObject(this.instanceId)
                    .then(obj => {
                        this.common = obj.common;
                        this.setState({native: obj.native, loaded: true});
                    });
            },
            onError: err => {
                console.error(err);
            }
        });
    }

    selectTab(tab, index) {
        window.localStorage[this.adapterName + '-adapter'] = tab;
        this.setState({selectedTab: tab, selectedTabNum: index})
    }

    onSave(isClose) {
        let oldObj;
        this.socket.getObject(this.instanceId)
            .then(_oldObj => {
                oldObj = _oldObj || {};

                for (const a in this.state.native) {
                    if (this.state.native.hasOwnProperty(a)) {
                        oldObj.native[a] = this.state.native[a];
                    }
                }

                if (this.state.common) {
                    for (const b in this.state.common) {
                        if (this.state.common.hasOwnProperty(b)) {
                            oldObj.common[b] = this.state.common[b];
                        }
                    }
                }

                return this.socket.setObject(this.instanceId, oldObj);
            })
            .then(() => {
                this.savedNative = oldObj.native;
                this.setState({changed: false});
                isClose && GenericApp.onClose();
            });
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

    static onClose() {
        if (typeof window.parent !== 'undefined' && window.parent) {
            try {
                if (window.parent.$iframeDialog && typeof window.parent.$iframeDialog.close === 'function') {
                    window.parent.$iframeDialog.close();
                } else {
                    window.parent.postMessage('close', '*');
                }
            } catch (e) {
                window.parent.postMessage('close', '*');
            }
        }
    }

    renderError() {
        if (!this.state.errorText) return null;
        return (<DialogError text={this.state.text} onClose={() => this.setState({errorText: ''})}/>);
    }

    getIsChanged(native) {
        native = native || this.state.native;
        return JSON.stringify(native) !== JSON.stringify(this.savedNative);
    }

    onLoadConfig(newNative) {
        if (JSON.stringify(newNative) !== JSON.stringify(this.state.native)) {
            this.setState({native: newNative, changed: this.getIsChanged(newNative)})
        }
    }

    renderSaveCloseButtons() {
        const buttonStyle = {
            borderRadius: Theme.saveToolbar.button.borderRadius || 3,
            height: Theme.saveToolbar.button.height || 32,
        };

        return (
            <Toolbar position="absolute" style={{bottom: this.isIFrame ? 38 : 0, left: 0, right: 0, position: 'absolute', background: Theme.saveToolbar.background}}>
                <Fab variant="extended" aria-label="Save" disabled={!this.state.changed} onClick={() => this.onSave(false)} style={buttonStyle}>
                    <IconSave />{I18n.t('Save')}
                </Fab>
                <Fab variant="extended" aria-label="Save and close" disabled={!this.state.changed} onClick={() => this.onSave(true)} style={Object.assign({}, buttonStyle, {marginLeft: 10})}>
                    <IconSave />{I18n.t('Save and close')}
                </Fab>
                <div style={{flexGrow: 1}}/>
                <Fab variant="extended" aria-label="Close" onClick={() => GenericApp.onClose()} style={buttonStyle}>
                    <IconClose />{I18n.t('Close')}
                </Fab>
            </Toolbar>)
    }

    updateNativeValue(attr, value) {
        const native = JSON.parse(JSON.stringify(this.state.native));
        if (native[attr] !== value) {
            native[attr] = value;
            const changed = this.getIsChanged(native);
            this.setState({native, changed});
        }
    }

    showError(text) {
        this.setState({errorText: text});
    }

    showToast(toast) {
        this.setState({toast});
    }

    render() {
        return null;
    }
}

export default GenericApp;
