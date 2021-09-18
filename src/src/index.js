import React from 'react';
import ReactDOM from 'react-dom';
import { MuiThemeProvider} from '@material-ui/core/styles';
import './index.css';
import App from './App';
import * as serviceWorker from './serviceWorker';
import {version} from '../package.json';
import theme from '@iobroker/adapter-react/Theme';
import Utils from '@iobroker/adapter-react/Components/Utils';

window.adapterName = 'iot';
window.sentryDSN = 'https://5ad729dbed504d15aa8bde423cae9a8e@sentry.iobroker.net/57';

let themeName = Utils.getThemeName();

console.log(`iobroker.${window.adapterName}@${version} using theme "${themeName}"`);

function build() {
    return ReactDOM.render(
        <MuiThemeProvider theme={theme(themeName)}>
            <App
                onThemeChange={_theme => {
                    themeName = _theme;
                    build();
                }}
            />
        </MuiThemeProvider>,
        document.getElementById('root')
    );
}

build();

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
serviceWorker.unregister();
