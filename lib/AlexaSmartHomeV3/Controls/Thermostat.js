const Capabilities = require('../Alexa/Capabilities');
const AdjustableControl = require('./AdjustableControl');
const Utils = require('../Helpers/Utils');
const Properties = require('../Alexa/Properties');

/**
 * @class
 */
class Thermostat extends AdjustableControl {

    get categories() {
        return ['THERMOSTAT', 'TEMPERATURE_SENSOR']
    }

    adjustableProperties() {
        return [Properties.TargetSetpoint];
    }

    initCapabilities(ctrl) {
        let result = [new Capabilities.TemperatureSensor(), new Capabilities.ThermostatController()];
        const states = this.states(ctrl);
        const map = this.statesMap();
        // if the state POWER is present, then we can switch it ON/OFF
        if (states[map.power]) {
            result.push(new Capabilities.PowerController());
        }

        for (const property of result.flatMap(item => item.properties)) {
            property.init(this.composeInitObject(ctrl, property));
        }

        return result;
    }

    composeInitObject(ctrl, property) {
        const states = this.states(ctrl);
        const map = this.statesMap();

        if (property.propertyName === Properties.PowerState.propertyName) {
            return {
                setState: states[map.power] || states[map.set],
                getState: states[map.power] || states[map.set],
                alexaSetter: function (alexaValue) {
                    return alexaValue === Properties.PowerState.ON;
                },
                alexaGetter: function (value) {
                    return value ? Properties.PowerState.ON : Properties.PowerState.OFF;
                },
            };
        }

        if (property.propertyName === Properties.Temperature.propertyName) {
            return {
                setState: states[map.set],
                getState: states[map.actual],
            };
        }

        if (property.propertyName === Properties.TargetSetpoint.propertyName) {
            const range = Utils.configuredRangeOrDefault(states[map.set]);
            return {
                setState: states[map.set],
                getState: states[map.actual],
                alexaSetter: function (alexaValue) {
                    return Utils.ensureValueInRange(alexaValue, range.min, range.max);
                },
                alexaGetter: function (value) {
                    return value;
                },
            };
        }

        if (property.propertyName === Properties.ThermostatMode.propertyName) {
            const initObject = {
                setState: states[map.mode] || { id: undefined },
                getState: states[map.mode] || { id: undefined },
                alexaSetter: function (alexaValue) {
                    return Properties.ThermostatMode.AUTO;
                },
                alexaGetter: function (value) {
                    return Properties.ThermostatMode.AUTO;
                },
            };
            return initObject;
        }
    }
}

module.exports = Thermostat;