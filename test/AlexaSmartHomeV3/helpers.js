const https = require('https');
const addFormats = require('ajv-formats');
const Ajv = require('ajv-draft-04');
const Controls = require('../../build/lib/AlexaSmartHomeV3/Controls').default;

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
let schema;

class AdapterMock {
    constructor() {
        this.log = {
            silly: this.nop,
            debug: this.nop,
            info: this.nop,
            warn: this.nop,
            error: this.nop,
        };
        this.config = {
            functionFirst: false,
            concatWord: '',
        };
    }

    nop() {
        // left blank intentionally
    }

    get namespace() {
        return 'iot.0';
    }

    async getObjectViewAsync() {
        return { rows: [] };
    }

    async setStateAsync() {
        return {};
    }

    async setForeignStateAsync() {
        return {};
    }

    async setState() {
        return {};
    }

    async getForeignStateAsync(id) {
        if (id.includes('Lampe')) {
            return { val: true };
        }

        // 875 of 500..1000 range corresponds to 75 of 0..100 range
        if (id.includes('Dimmer')) {
            return { val: 875 };
        }

        if (id.includes('Blinds')) {
            return { val: 25 };
        }

        if (id.includes('Temperature')) {
            return { val: 21.5 };
        }

        if (id.includes('Volume')) {
            return { val: 35 };
        }

        if (id.includes('Thermostat')) {
            return { val: 23.5 };
        }

        if (id.includes('AirCondition.SET')) {
            return { val: 23.5 };
        }

        if (id.includes('RgbLamp.RGB')) {
            return { val: '#a82c66' };
        }

        if (id.includes('RgbLamp.BRIGHTNESS')) {
            return { val: 65 };
        }

        if (id.includes('RgbLamp.TEMPERATURE')) {
            return { val: 5000 };
        }

        if (id.includes('RgbLamp.ON')) {
            return { val: true };
        }

        if (id.includes('RgbLamp.ACTUAL')) {
            return { val: true };
        }

        if (id.includes('Lamp.BRIGHTNESS')) {
            return { val: 22 };
        }

        if (id.includes('Lamp.HUE')) {
            return { val: 330.5 };
        }

        if (id.includes('Lamp.TEMPERATURE')) {
            return { val: 2200 };
        }

        if (id.includes('AirCondition.MODE')) {
            // OFF
            return { val: 4 };
        }

        if (id.includes('Motion')) {
            return { val: true };
        }

        if (id.includes('Door')) {
            return { val: true };
        }

        if (id.includes('Gate')) {
            return { val: false };
        }

        if (id.includes('Lock')) {
            return { val: true };
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
        deviceManager.endpoints
            .flatMap(e => e.controls)
            .flatMap(c => c.allCapabilities)
            .flatMap(c => c.properties)
            .map(p => p.currentValue)
            .forEach(v => (v = undefined));
    },

    adapterMock: function () {
        return new AdapterMock();
    },

    temperatureControl: function () {
        return new Controls.Temperature(require('./Resources/temperature.json'));
    },

    thermostatControl: function () {
        return new Controls.Thermostat(require('./Resources/thermostat.json'));
    },

    airConditionControl: function () {
        return new Controls.AirCondition(require('./Resources/airCondition.json'));
    },

    hueControl: function () {
        return new Controls.Hue(require('./Resources/hue.json'));
    },

    rgbSingleControl: function () {
        return new Controls.RgbSingle(require('./Resources/rgbSingle.json'));
    },

    powerControl: function () {
        return new Controls.Socket(require('./Resources/power.json'));
    },

    dimmerControl: function () {
        return new Controls.Dimmer(require('./Resources/dimmer.json'));
    },

    blindsControl: function () {
        return new Controls.Blind(require('./Resources/blinds.json'));
    },

    vacuumCleanerControl: function () {
        return new Controls.VacuumCleaner(require('./Resources/vacuumCleaner.json'));
    },

    volumeControl: function () {
        return new Controls.Volume(require('./Resources/volume.json'));
    },

    volumeGroupControl: function () {
        return new Controls.VolumeGroup(require('./Resources/volumeGroup.json'));
    },

    lightControl: function () {
        return new Controls.Light(require('./Resources/light.json'));
    },

    motionControl: function () {
        return new Controls.Motion(require('./Resources/motion.json'));
    },

    doorControl: function () {
        return new Controls.Door(require('./Resources/door.json'));
    },

    gateControl: function () {
        return new Controls.Gate(require('./Resources/gate.json'));
    },

    lockControl: function () {
        return new Controls.Lock(require('./Resources/lock.json'));
    },

    sceneControl: function () {
        return new Controls.Scene(require('./Resources/scene.json'));
    },

    thermostatControllerAdjustTargetTemperatureRequest: function () {
        return require('./Resources/ThermostatController.AdjustTargetTemperature.request.json');
    },

    thermostatControllerSetTargetTemperatureRequest: function () {
        return require('./Resources/ThermostatController.SetTargetTemperature.request.json');
    },

    thermostatControllerSetThermostatModeRequest: function () {
        return require('./Resources/ThermostatController.SetThermostatMode.request.json');
    },

    modeControllerSetGatePositionRequest: function () {
        return require('./Resources/ModeController.SetGatePosition.request.json');
    },

    getSample: async function (sample_json_name) {
        const options = {
            hostname: 'raw.githubusercontent.com',
            port: 443,
            path: `/alexa/alexa-smarthome/master/sample_messages/${sample_json_name}`,
            headers: { 'Content-Type': 'application/json' },
        };

        let jsonString = '';
        return new Promise((resolve, reject) => {
            const req = https.request(options, res => {
                res.setEncoding('utf8');
                res.on('data', data => {
                    jsonString += data;
                });

                res.on('end', () => {
                    resolve(JSON.parse(jsonString));
                });

                req.on('error', e => {
                    reject(e);
                });
            });

            req.end();
        });
    },

    getSchema: async function () {
        // https://github.com/alexa-samples/alexa-smarthome/blob/master/validation_schemas/alexa_smart_home_message_schema.json
        const options = {
            hostname: 'raw.githubusercontent.com',
            port: 443,
            path: `/alexa-samples/alexa-smarthome/refs/heads/master/validation_schemas/alexa_smart_home_message_schema.json`,
            headers: { 'Content-Type': 'application/json' },
        };

        let jsonString = '';
        return new Promise((resolve, reject) => {
            const req = https.request(options, res => {
                res.setEncoding('utf8');
                res.on('data', data => {
                    jsonString += data;
                });

                res.on('end', () => {
                    resolve(JSON.parse(jsonString));
                });

                req.on('error', e => {
                    reject(e);
                });
            });

            req.end();
        });
    },

    validateAnswer: async function (response) {
        // because of the error in code.js: node_modules/ajv/dist/vocabularies/code.js
        // function usePattern({ gen, it: { opts } }, pattern) {
        //     const u = opts.unicodeRegExp ? "u" : "";
        //     const { regExp } = opts.code;
        //     let rx;
        //     try {
        //         // IMPORTANT!!!!!
        //         pattern = pattern.replace("\\_", "_") // escape backslashes
        //         rx = regExp(pattern, u);
        //     } catch (e) {
        //         throw new Error(`Invalid regular expression: /${pattern}/: ${e.message}`)
        //     }
        //     return gen.scopeValue("pattern", {
        //         key: rx.toString(),
        //         ref: rx,
        //         code: (0, codegen_1._) `${regExp.code === "new RegExp" ? newRegExp : (0, util_2.useFunc)(gen, regExp)}(${pattern}, ${u})`,
        //     });
        // }

        // We cannot execute it in the cloud, so we disable it for tests
        /*
        schema ||= await module.exports.getSchema();
        const validate = ajv.compile(schema);

        response = JSON.parse(JSON.stringify(response)); // deep clone
        delete response.iobVersion;
        if (response.event?.payload?.endpoints?.[0]?.capabilities?.find(c => c.interface === 'Alexa.ThermostatController')) {
            const pos = response.event.payload.endpoints[0].capabilities.findIndex(
                c => c.interface === 'Alexa.ThermostatController',
            );
            // we have random values in the thermostat, so set them to a fixed value for validation
            response.event.payload.endpoints[0].capabilities[pos].version = '3';
        }

        const valid = validate(response);
        if (!valid) {
            console.warn(`Invalid jsonConfig: ${JSON.stringify(validate.errors, null, 2)}`);
            return validate.errors;
        }*/
        return null;
    },
};
