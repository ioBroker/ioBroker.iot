import React from 'react';
import ReactDOM from 'react-dom';
import * as Sentry from '@sentry/browser';
import * as SentryIntegrations from '@sentry/integrations';
import { MuiThemeProvider} from '@material-ui/core/styles';
import './index.css';
import App from './App';
import * as serviceWorker from './serviceWorker';
import {version} from '../package.json';

import createTheme from '@iobroker/adapter-react/createTheme';

let theme = 'light';
console.log('iobroker.iot@' + version);

function build() {
    return ReactDOM.render(<MuiThemeProvider theme={createTheme(theme)}>
        <App onThemeChange={_theme => {
            theme = _theme;
            build();
        }}/>
    </MuiThemeProvider>, document.getElementById('root'));
}

Sentry.init({
    dsn: "https://8f4cd4fe94f94e2a88e9da0f033f27fc@sentry.iobroker.net/57",
    release: 'iobroker.iot@' + version,
    integrations: [
        new SentryIntegrations.Dedupe()
    ]
});


build();

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
serviceWorker.unregister();
