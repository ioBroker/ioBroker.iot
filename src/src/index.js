import React from 'react';
import ReactDOM from 'react-dom';
import * as Sentry from '@sentry/browser';
import * as SentryIntegrations from '@sentry/integrations';
import { MuiThemeProvider} from '@material-ui/core/styles';
import './index.css';
import App from './App';
import * as serviceWorker from './serviceWorker';

import createTheme from '@iobroker/adapter-react/createTheme';

let theme = 'light';

function build() {
    return ReactDOM.render(<MuiThemeProvider theme={createTheme(theme)}>
        <App onThemeChange={_theme => {
            theme = _theme;
            build();
        }}/>
    </MuiThemeProvider>, document.getElementById('root'));
}

Sentry.init({
    dsn: "https://504499a725eb4898930d3b9e9da95740@sentry.iobroker.net/56",
    integrations: [
        new SentryIntegrations.Dedupe()
    ]
});


build();

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
serviceWorker.unregister();
