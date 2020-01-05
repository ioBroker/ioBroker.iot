import React from 'react';
import {withStyles} from '@material-ui/core/styles';
import AppBar from '@material-ui/core/AppBar';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import GenericApp from '@iobroker/adapter-react/GenericApp';
import Loader from '@iobroker/adapter-react/Components/Loader'

import I18n from '@iobroker/adapter-react/i18n';
import TabOptions from './Tabs/Options';
import TabExtended from './Tabs/Extended';
import TabServices from './Tabs/Services';
import TabEnums from './Tabs/Enums';
import TabAlexaSmartNames from './Tabs/AlexaSmartNames';
import TabAlisaSmartNames from './Tabs/AlisaSmartNames';
import TabGoogleSmartNames from './Tabs/GoogleSmartNames';

const styles = theme => ({
    root: {},
    tabContent: {
        padding: 10,
        height: 'calc(100% - 64px - 48px - 20px)',
        overflow: 'auto'
    },
    tabContentIFrame: {
        padding: 10,
        height: 'calc(100% - 64px - 48px - 20px - 38px)',
        overflow: 'auto'
    }
});

class App extends GenericApp {
    constructor(props) {
        const extendedProps = {...props};
        extendedProps.encryptedFields = ['pass'];
        extendedProps.translations = {
            'en': require('./i18n/en'),
            'de': require('./i18n/de'),
            'ru': require('./i18n/ru'),
            'pt': require('./i18n/pt'),
            'nl': require('./i18n/nl'),
            'fr': require('./i18n/fr'),
            'it': require('./i18n/it'),
            'es': require('./i18n/es'),
            'pl': require('./i18n/pl'),
            'zh-cn': require('./i18n/zh-cn'),
        };
        // get actual port
        extendedProps.socket = extendedProps.socket || {};
        extendedProps.socket.port = parseInt(window.location.port, 10);
        // for debug purposes
        if (extendedProps.socket.port === 3000) {
            extendedProps.socket.port = 8081;
        }
        super(extendedProps);
    }

    getSelectedTab() {
        const tab = this.state.selectedTab;
        if (!tab || tab === 'options') {
            return 0;
        } else
        if (tab === 'enums') {
            return 1;
        } else
        if (tab === 'alexa') {
            return 2;
        } else
        if (tab === 'google') {
            const offset = (this.state.native.amazonAlexa ? 1 : 0);
            return 2 + offset;
        }
        if (tab === 'alisa') {
            const offset = (this.state.native.amazonAlexa ? 1 : 0) + (this.state.native.googleHome ? 1 : 0);
            return 2 + offset;
        } else
        if (tab === 'extended') {
            const offset = (this.state.native.amazonAlexa ? 1 : 0) + (this.state.native.googleHome ? 1 : 0) + (this.state.native.yandexAlisa ? 1 : 0);
            return 2 + offset;
        } else
        if (tab === 'services') {
            const offset = (this.state.native.amazonAlexa ? 1 : 0) + (this.state.native.googleHome ? 1 : 0) + (this.state.native.yandexAlisa ? 1 : 0);
            return 3 + offset;
        }
    }

    render() {
        if (!this.state.loaded) {
            return (<Loader theme={this.state.themeType}/>);
        }

        return (
            <div className="App">
                <AppBar position="static">
                    <Tabs value={this.getSelectedTab()} onChange={(e, index) => this.selectTab(e.target.parentNode.dataset.name, index)}>
                        <Tab label={I18n.t('Options')} data-name="options" />
                        <Tab label={I18n.t('Smart enums')} data-name="enums" />
                        {this.state.native.amazonAlexa && <Tab selected={this.state.selectedTab === 'alexa'} label={I18n.t('Alexa devices')} data-name="alexa" />}
                        {this.state.native.googleHome && <Tab selected={this.state.selectedTab === 'google'} label={I18n.t('Google devices')} data-name="google" />}
                        {this.state.native.yandexAlisa && <Tab selected={this.state.selectedTab === 'alisa'} label={I18n.t('Alisa devices')} data-name="alisa" />}
                        <Tab label={I18n.t('Extended options')} data-name="extended" />
                        <Tab label={I18n.t('Services and IFTTT')} data-name="services" />
                    </Tabs>
                </AppBar>

                <div className={this.isIFrame ? this.props.classes.tabContentIFrame : this.props.classes.tabContent}>
                    {(this.state.selectedTab === 'options' || !this.state.selectedTab) && (<TabOptions
                        key="options"
                        common={this.common}
                        socket={this.socket}
                        native={this.state.native}
                        onError={text => this.setState({errorText: text})}
                        onLoad={native => this.onLoadConfig(native)}
                        instance={this.instance}
                        adapterName={this.adapterName}
                        onChange={(attr, value, cb) => this.updateNativeValue(attr, value, cb)}
                    />)}
                    {this.state.selectedTab === 'enums' && (<TabEnums
                        key="enums"
                        common={this.common}
                        socket={this.socket}
                        native={this.state.native}
                        onError={text => this.setState({errorText: text})}
                        instance={this.instance}
                        adapterName={this.adapterName}
                    />)}
                    {this.state.selectedTab === 'alexa' && (<TabAlexaSmartNames
                        key="alexa"
                        common={this.common}
                        socket={this.socket}
                        native={this.state.native}
                        onError={text => this.setState({errorText: text})}
                        adapterName={this.adapterName}
                        instance={this.instance}
                    />)}
                        {this.state.selectedTab === 'google' && (<TabGoogleSmartNames
                        key="google"
                        common={this.common}
                        socket={this.socket}
                        native={this.state.native}
                        onError={text => this.setState({errorText: text})}
                        adapterName={this.adapterName}
                        instance={this.instance}
                    />)}
                    {this.state.selectedTab === 'alisa' && (<TabAlisaSmartNames
                        key="alisa"
                        common={this.common}
                        socket={this.socket}
                        native={this.state.native}
                        onError={text => this.setState({errorText: text})}
                        adapterName={this.adapterName}
                        instance={this.instance}
                    />)}
                    {this.state.selectedTab === 'extended' && (<TabExtended
                        key="extended"
                        common={this.common}
                        socket={this.socket}
                        native={this.state.native}
                        onError={text => this.setState({errorText: text})}
                        instance={this.instance}
                        adapterName={this.adapterName}
                        onChange={(attr, value) => this.updateNativeValue(attr, value)}
                    />)}
                    {this.state.selectedTab === 'services' && (<TabServices
                        key="services"
                        common={this.common}
                        socket={this.socket}
                        native={this.state.native}
                        onError={text => this.setState({errorText: text})}
                        instance={this.instance}
                        adapterName={this.adapterName}
                        onShowError={error => this.showError(error)}
                        onChange={(attr, value) => this.updateNativeValue(attr, value)}
                    />)}
                </div>
                {this.renderError()}
                {this.renderSaveCloseButtons()}
            </div>
        );
    }
}

export default withStyles(styles)(App);
