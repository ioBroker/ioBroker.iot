const Capabilities = require('../Alexa/Capabilities');
const Control = require('./Control');
const Utils = require('../Helpers/Utils');
const Properties = require('../Alexa/Properties');

/**
 * @class
 */
class Thermostat extends Control {
    get categories() {
        return ['THERMOSTAT', 'TEMPERATURE_SENSOR']
    }

    initCapabilities(ctrl) {
        let result = [new Capabilities.TemperatureSensor(), new Capabilities.ThermostatController()];

        // if the state POWER is present, then we can switch it ON/OFF
        const supportsSwitchingOnOff = ctrl.states.find(s => s.name === 'POWER') !== undefined;
        if (supportsSwitchingOnOff) {
            result.push(new Capabilities.PowerController());
        }

        for (const property of result.flatMap(item => item.properties)) {
            property.init(this.composeInitObject(ctrl, property));
        }

        return result;
    }

    valueSetter(event) {
        if (Properties.TargetSetpoint.matches(event)
            && Properties.TargetSetpoint.directive(event) === Properties.TargetSetpoint.ADJUST) {
            return this.adjustValue.bind(this);
        }
        return super.valueSetter(event);
    }

    composeInitObject(ctrl, property) {
        // this state is a mandatory one for the control, so it exists
        const setTemperature = ctrl.states.find(s => s.name === 'SET');
        // these are all optional
        const getTemperature = ctrl.states.find(s => s.name === 'ACTUAL');
        const setPower = ctrl.states.find(s => s.name === 'POWER');
        const getPower = setPower;
        const mode = ctrl.states.find(s => s.name === 'MODE');

        if (property.propertyName === Properties.PowerState.propertyName) {
            return {
                setState: setPower || setTemperature,
                getState: getPower || setPower || setTemperature,
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
                setState: setTemperature,
                getState: getTemperature,
            };
        }

        if (property.propertyName === Properties.TargetSetpoint.propertyName) {
            const range = Utils.configuredRangeOrDefault(setTemperature);
            return {
                setState: setTemperature,
                getState: getTemperature,
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
                setState: mode || { id: undefined },
                getState: mode || { id: undefined },
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