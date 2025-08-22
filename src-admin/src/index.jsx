import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { unregister } from './serviceWorker';
import pack from '../package.json';

window.adapterName = 'iot';
window.sentryDSN = 'https://5ad729dbed504d15aa8bde423cae9a8e@sentry.iobroker.net/57';

console.log(`iobroker.${window.adapterName}@${pack.version}`);

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
unregister();
