const https = require('https');
const Controls = require('../../lib/AlexaSmartHomeV3/Controls');

class AdapterMock {
    constructor() {
        this.log = {
            silly: this.nop,
            debug: this.nop,
            info: this.nop,
            warn: this.nop,
            error: this.nop
        }
    }

    nop() {
        // left blank intentionally
    }

    async getObjectViewAsync() {
        return { rows: [] };
    }
    async setStateAsync() {
        return {}
    }

    async setForeignStateAsync() {
        return {}
    }

    async getForeignStateAsync(id) {
        if (id.includes('Lampe')) {
            return { val: true }
        }

        // 875 of 500..1000 range corresponds to 75 of 0..100 range
        if (id.includes('Dimmer')) {
            return { val: 875 }
        }

        if (id.includes('Temperature')) {
            return { val: 21.5 }
        }
    }

    async subscribeForeignStatesAsync(id) {
        return;
    }

    async unsubscribeForeignStatesAsync(id) {
        return;
    }
}

module.exports = {
    resetCurrentValues: function (deviceManager) {
        deviceManager
            .endpoints
            .flatMap(e => e.controls)
            .flatMap(c => c.allCapabilities)
            .flatMap(c => c.properties)
            .map(p => p.stateProxy.currentValue)
            .forEach(v => v = undefined);
    },

    adapterMock: function () {
        return new AdapterMock()
    },

    temperatureControl: function () {
        return new Controls.Temperature(require('./Resources/temperature.json'));
    },

    thermostatControl: function () {
        return new Controls.Thermostat(require('./Resources/thermostat.json'));
    },

    dimmerControl: function () {
        return new Controls.Dimmer(require('./Resources/dimmer.json'));
    },

    lightControl: function () {
        return new Controls.Light(require('./Resources/light.json'));
    },

    getSample: async function (sample_json_name) {
        let options = {
            hostname: 'raw.githubusercontent.com',
            port: 443,
            path: '/alexa/alexa-smarthome/master/sample_messages/' + sample_json_name,
            headers: { 'Content-Type': 'application/json' }
        };

        let json_string = '';
        return new Promise((resolve, reject) => {
            let req = https.request(options, (res) => {
                res.setEncoding('utf8');
                res.on('data', (data) => {
                    json_string += data;
                });

                res.on('end', () => {
                    resolve(JSON.parse(json_string));
                });

                req.on('error', (e) => {
                    reject(e);
                });

            });

            req.end();
        })
    }
}

