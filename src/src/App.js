import React from 'react';
import {withStyles} from '@material-ui/core/styles';
import AppBar from '@material-ui/core/AppBar';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import Loader from './Components/Loader'
import I18n from './i18n';

import GenericApp from './GenericApp';
import TabOptions from './Tabs/Options';
import TabEnums from './Tabs/Enums';
import TabAlexaSmartNames from './Tabs/AlexaSmartNames';

const styles = theme => ({
    root: {},
    tabContent: {
        padding: 10,
        height: 'calc(100% - 64px - 48px - 20px)',
        overflow: 'auto'
    }
});

class App extends GenericApp {
    render() {
        if (!this.state.loaded) {
            return (<Loader theme={this.state.themeType}/>);
        }

        return (
            <div className="App">
                <AppBar position="static">
                    <Tabs value={this.state.selectedTab} onChange={(e, value) =>
                        this.setState({selectedTab: value})}>
                        <Tab label={I18n.t('Options')}/>
                        <Tab label={I18n.t('Smart devices')}/>
                        <Tab label={I18n.t('Smart enums')}/>
                        <Tab label={I18n.t('Extended options')}/>
                        <Tab label={I18n.t('Services and IFTTT')}/>
                    </Tabs>
                </AppBar>
                <div className={this.props.classes.tabContent}>
                    {this.state.selectedTab === 0 && (<TabOptions
                        common={this.common}
                        socket={this.socket}
                        native={this.state.native}
                        onError={text => this.setState({errorText: text})}
                        onLoad={native => this.onLoadConfig(native)}
                        instance={this.instance}
                        onChange={(attr, value) => {
                            const native = JSON.parse(JSON.stringify(this.state.native));
                            if (native[attr] !== value) {
                                native[attr] = value;
                                this.setState({native, changed: this.getIsChanged(native)});
                            }
                        }}
                    />)}
                    {this.state.selectedTab === 1 && (<TabAlexaSmartNames
                        common={this.common}
                        socket={this.socket}
                        native={this.state.native}
                        onError={text => this.setState({errorText: text})}
                        instance={this.instance}
                    />)}
                    {this.state.selectedTab === 2 && (<TabEnums
                        common={this.common}
                        socket={this.socket}
                        native={this.state.native}
                        onError={text => this.setState({errorText: text})}
                        instance={this.instance}
                    />)}
                </div>
                {this.renderError()}
                {this.renderSaveCloseButtons()}
            </div>
        );
    }
}

export default withStyles(styles)(App);
