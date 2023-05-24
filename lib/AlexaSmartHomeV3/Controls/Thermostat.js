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

    initCapabilities() {
        let result = [new Capabilities.TemperatureSensor(), new Capabilities.ThermostatController()];
        const map = this.statesMap;
        // if the state POWER is present, then we can switch it ON/OFF
        if (this.states[map.power]) {
            result.push(new Capabilities.PowerController());
        }

        for (const property of result.flatMap(item => item.properties)) {
            property.init(this.composeInitObject(property));
        }

        return result;
    }

    composeInitObject(property) {
        const map = this.statesMap;

        if (property.propertyName === Properties.PowerState.propertyName) {
            return {
                setState: this.states[map.power] || this.states[map.set],
                getState: this.states[map.power] || this.states[map.set],
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
                setState: this.states[map.set],
                getState: this.states[map.actual] || this.states[map.set],
            };
        }

        if (property.propertyName === Properties.TargetSetpoint.propertyName) {
            return {
                setState: this.states[map.set],
                getState: this.states[map.actual] || this.states[map.set],
                alexaSetter: function (alexaValue) {
                    return Utils.ensureValueInRange(alexaValue, this.valuesRangeMin, this.valuesRangeMax);
                },
                alexaGetter: function (value) {
                    return value;
                },
            };
        }

        if (property.propertyName === Properties.ThermostatMode.propertyName) {
            const initObject = {
                setState: this.states[map.mode] || { id: undefined },
                getState: this.states[map.mode] || { id: undefined },
                alexaSetter: function (alexaValue) {
                    return 0;
                },
                alexaGetter: function (value) {
                    return Properties.ThermostatMode.AUTO;
                },
                supportedModes: [Properties.ThermostatMode.AUTO]
            };
            return initObject;
        }
    }
}

module.exports = Thermostat;