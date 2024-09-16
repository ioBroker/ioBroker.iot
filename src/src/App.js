import React from 'react';
import { ThemeProvider, StyledEngineProvider } from '@mui/material/styles';

import {
    AppBar,
    Tabs,
    Tab,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Button,
} from '@mui/material';

import {
    GenericApp, I18n,
    Loader, AdminConnection,
} from '@iobroker/adapter-react-v5';

import TabOptions from './Tabs/Options';
import TabExtended from './Tabs/Extended';
import TabServices from './Tabs/Services';
import TabEnums from './Tabs/Enums';
import TabAlexaSmartNames from './Tabs/AlexaSmartNames';
import TabAlexa3SmartNames from './Tabs/Alexa3SmartNames';
import TabAlisaSmartNames from './Tabs/AlisaSmartNames';
import TabGoogleSmartNames from './Tabs/GoogleSmartNames';

const styles = {
    root: {},
    tabContent: {
        padding: 10,
        height: 'calc(100% - 64px - 48px - 20px)',
        overflow: 'auto',
    },
    tabContentIFrame: {
        padding: 10,
        height: 'calc(100% - 64px - 48px - 20px - 38px)',
        overflow: 'auto',
    },
    selected: theme => ({
        color: theme.palette.mode === 'dark' ? undefined : '#FFF !important',
    }),
    indicator: theme => ({
        backgroundColor: theme.palette.mode === 'dark' ? theme.palette.secondary.main : '#FFF',
    }),
};

class App extends GenericApp {
    constructor(props) {
        const extendedProps = { ...props };
        extendedProps.encryptedFields = ['pass'];
        extendedProps.Connection = AdminConnection;
        extendedProps.translations = {
            en: require('./i18n/en'),
            de: require('./i18n/de'),
            ru: require('./i18n/ru'),
            pt: require('./i18n/pt'),
            nl: require('./i18n/nl'),
            fr: require('./i18n/fr'),
            it: require('./i18n/it'),
            es: require('./i18n/es'),
            pl: require('./i18n/pl'),
            uk: require('./i18n/uk'),
            'zh-cn': require('./i18n/zh-cn'),
        };

        extendedProps.sentryDSN = window.sentryDSN;
        // extendedProps.socket = {
        //     protocol: 'http:',
        //     host: '192.168.178.45',
        //     port: 8081,
        // };

        super(props, extendedProps);

        Object.assign(this.state, { selectedTab: window.localStorage.getItem(`${this.adapterName}.${this.instance}.selectedTab`) || 'options' });
    }

    onConnectionReady() {
        this.socket.getState(`${this.adapterName}.${this.instance}.info.ackTempPassword`)
            .then(state => {
                if (!state || !state.val) {
                    this.setState({ showAckTempPasswordDialog: true });
                }
            });
    }

    renderAckTempPasswordDialog() {
        if (!this.state.showAckTempPasswordDialog) {
            return null;
        }
        return <Dialog
            open={!0}
            onClose={() => this.setState({ showAckTempPasswordDialog: false }, () => setTimeout(() => this.setState({ showAckTempPasswordDialog: true }), 1000))}
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description"
        >
            <DialogTitle id="alert-dialog-title">{I18n.t('Information: The skill linking process was changed!')}</DialogTitle>
            <DialogContent>
                <DialogContentText id="alert-dialog-description">
                    {I18n.t('The linking process has been changed for a few months.')}
                    {I18n.t('Now there is no temporary password that will be sent by email.')}
                    <br />
                    <br />
                    <b>{I18n.t('The password is equal with ioBroker.pro and with password that was entered here in the settings!')}</b>
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button
                    color="grey"
                    variant="contained"
                    onClick={() => this.setState({ showAckTempPasswordDialog: false }, () => setTimeout(() => this.setState({ showAckTempPasswordDialog: true }), 1000))}
                    autoFocus
                >
                    {I18n.t('Not understood')}
                </Button>
                <Button
                    variant="contained"
                    onClick={() =>
                        this.socket.setState(`${this.adapterName}.${this.instance}.info.ackTempPassword`, { val: true, ack: true })
                            .then(() =>
                                this.setState({ showAckTempPasswordDialog: false }))}
                    color="primary"
                    autoFocus
                >
                    {I18n.t('Roger that')}
                </Button>
            </DialogActions>
        </Dialog>;
    }

    render() {
        if (!this.state.loaded) {
            return <StyledEngineProvider injectFirst>
                <ThemeProvider theme={this.state.theme}>
                    <Loader themeType={this.state.themeType} />
                </ThemeProvider>
            </StyledEngineProvider>;
        }

        return <StyledEngineProvider injectFirst>
            <ThemeProvider theme={this.state.theme}>
                <div className="App" style={{ background: this.state.theme.palette.background.default, color: this.state.theme.palette.text.primary }}>
                    <AppBar position="static">
                        <Tabs
                            value={this.state.selectedTab || 'options'}
                            onChange={(e, value) => {
                                this.setState({ selectedTab: value });
                                window.localStorage.setItem(`${this.adapterName}.${this.instance}.selectedTab`, value);
                            }}
                            variant="scrollable"
                            scrollButtons="auto"
                            sx={{ '& .MuiTabs-indicator': styles.indicator }}
                        >
                            <Tab value="options" sx={{ '&.Mui-selected': styles.selected }} label={I18n.t('Options')} data-name="options" />
                            <Tab value="enums" sx={{ '&.Mui-selected': styles.selected }} label={I18n.t('Smart enums')} data-name="enums" />
                            {this.state.native.amazonAlexa && <Tab value="alexa" sx={{ '&.Mui-selected': styles.selected }} selected={this.state.selectedTab === 'alexa'} label={I18n.t('Alexa devices')} data-name="alexa" />}
                            {this.state.native.amazonAlexa && this.state.native.amazonAlexaV3 && <Tab value="alexa3" sx={{ '&.Mui-selected': styles.selected }} selected={this.state.selectedTab === 'alexa3'} label={`${I18n.t('Alexa devices')} v3`} data-name="alexa3" />}
                            {this.state.native.googleHome && <Tab value="google" sx={{ '&.Mui-selected': styles.selected }} selected={this.state.selectedTab === 'google'} label={I18n.t('Google devices')} data-name="google" />}
                            {this.state.native.yandexAlisa && <Tab value="alisa" sx={{ '&.Mui-selected': styles.selected }} selected={this.state.selectedTab === 'alisa'} label={I18n.t('Alisa devices')} data-name="alisa" />}
                            <Tab value="extended" sx={{ '&.Mui-selected': styles.selected }} label={I18n.t('Extended options')} data-name="extended" />
                            <Tab value="services" sx={{ '&.Mui-selected': styles.selected }} label={I18n.t('Services and IFTTT')} data-name="services" />
                        </Tabs>
                    </AppBar>

                    <div style={this.isIFrame ? styles.tabContentIFrame : styles.tabContent}>
                        {(this.state.selectedTab === 'options' || !this.state.selectedTab) && <TabOptions
                            key="options"
                            common={this.common}
                            theme={this.state.theme}
                            socket={this.socket}
                            native={this.state.native}
                            onError={text => this.setState({ errorText: (text || text === 0) && typeof text !== 'string' ? text.toString() : text })}
                            onLoad={native => this.onLoadConfig(native)}
                            instance={this.instance}
                            adapterName={this.adapterName}
                            changed={this.state.changed}
                            onChange={(attr, value, cb) => this.updateNativeValue(attr, value, cb)}
                        />}
                        {this.state.selectedTab === 'enums' && <TabEnums
                            key="enums"
                            theme={this.state.theme}
                            common={this.common}
                            socket={this.socket}
                            native={this.state.native}
                            onError={text => this.setState({ errorText: (text || text === 0) && typeof text !== 'string' ? text.toString() : text })}
                            instance={this.instance}
                            adapterName={this.adapterName}
                        />}
                        {this.state.selectedTab === 'alexa' && <TabAlexaSmartNames
                            key="alexa"
                            themeType={this.state.themeType}
                            theme={this.state.theme}
                            common={this.common}
                            socket={this.socket}
                            native={this.state.native}
                            onError={text => this.setState({ errorText: (text || text === 0) && typeof text !== 'string' ? text.toString() : text })}
                            adapterName={this.adapterName}
                            instance={this.instance}
                        />}
                        {this.state.selectedTab === 'alexa3' && <TabAlexa3SmartNames
                            key="alexa3"
                            themeType={this.state.themeType}
                            theme={this.state.theme}
                            common={this.common}
                            socket={this.socket}
                            native={this.state.native}
                            onError={text => this.setState({ errorText: (text || text === 0) && typeof text !== 'string' ? text.toString() : text })}
                            adapterName={this.adapterName}
                            instance={this.instance}
                        />}
                        {this.state.selectedTab === 'google' && <TabGoogleSmartNames
                            key="google"
                            themeType={this.state.themeType}
                            theme={this.state.theme}
                            common={this.common}
                            socket={this.socket}
                            native={this.state.native}
                            onError={text => this.setState({ errorText: (text || text === 0) && typeof text !== 'string' ? text.toString() : text })}
                            adapterName={this.adapterName}
                            instance={this.instance}
                        />}
                        {this.state.selectedTab === 'alisa' && <TabAlisaSmartNames
                            key="alisa"
                            themeType={this.state.themeType}
                            theme={this.state.theme}
                            common={this.common}
                            socket={this.socket}
                            native={this.state.native}
                            onError={text => this.setState({ errorText: (text || text === 0) && typeof text !== 'string' ? text.toString() : text })}
                            adapterName={this.adapterName}
                            instance={this.instance}
                        />}
                        {this.state.selectedTab === 'extended' && <TabExtended
                            key="extended"
                            common={this.common}
                            theme={this.state.theme}
                            socket={this.socket}
                            native={this.state.native}
                            onError={text => this.setState({ errorText: (text || text === 0) && typeof text !== 'string' ? text.toString() : text })}
                            instance={this.instance}
                            adapterName={this.adapterName}
                            onChange={(attr, value) => this.updateNativeValue(attr, value)}
                        />}
                        {this.state.selectedTab === 'services' && <TabServices
                            key="services"
                            theme={this.state.theme}
                            common={this.common}
                            socket={this.socket}
                            native={this.state.native}
                            onError={text => this.setState({ errorText: (text || text === 0) && typeof text !== 'string' ? text.toString() : text })}
                            instance={this.instance}
                            adapterName={this.adapterName}
                            onShowError={error => this.showError(error)}
                            onChange={(attr, value) => this.updateNativeValue(attr, value)}
                        />}
                    </div>
                    {this.renderError()}
                    {this.renderSaveCloseButtons()}
                    {this.renderAckTempPasswordDialog()}
                </div>
            </ThemeProvider>
        </StyledEngineProvider>;
    }
}

export default App;
