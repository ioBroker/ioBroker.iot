const Capabilities = require('../Alexa/Capabilities');
const StateProxy = require('../Helpers/StateProxy');
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
        let result = [
            {
                capability: new Capabilities.TemperatureSensor(),
                properties: []
            },
            {
                capability: new Capabilities.ThermostatController(),
                properties: []
            }
        ]

        // if the state POWER is present, then we can switch it ON/OFF
        const supportsSwitchingOnOff = ctrl.states.find(s => s.name === 'POWER') !== undefined;
        if (supportsSwitchingOnOff) {
            result.push({
                capability: new Capabilities.PowerController(),
                properties: []
            })
        }

        for (const item of result) {
            for (const property of item.capability.properties) {
                item.properties.push({
                    property: property,
                    stateProxy: this.stateProxy(ctrl, property)
                })
            }
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

    stateProxy(ctrl, property) {

        // this state is a mandatory one for the control, so it exists
        const setTemperature = ctrl.states.find(s => s.name === 'SET');
        // these are all optional
        const getTemperature = ctrl.states.find(s => s.name === 'ACTUAL');
        const setPower = ctrl.states.find(s => s.name === 'POWER');
        const getPower = setPower;
        const mode = ctrl.states.find(s => s.name === 'MODE');


        if (property.propertyName === Properties.PowerState.propertyName) {
            return new StateProxy({
                setState: setPower || setTemperature,
                getState: getPower || setPower || setTemperature,
                alexaSetter: function (alexaValue) {
                    return alexaValue === Properties.PowerState.ON;
                },
                alexaGetter: function (value) {
                    return value ? Properties.PowerState.ON : Properties.PowerState.OFF;
                }
            })
        }

        if (property.propertyName === Properties.Temperature.propertyName) {
            return new StateProxy({
                setState: setTemperature,
                getState: getTemperature,
            })
        }

        if (property.propertyName === Properties.TargetSetpoint.propertyName) {
            const proxy = new StateProxy({
                setState: setTemperature,
                getState: getTemperature
            });

            return new StateProxy({
                setState: setTemperature,
                getState: getTemperature,
                alexaSetter: function (alexaValue) {
                    return Utils.ensureValueInRange(alexaValue, proxy.valuesRangeMin, proxy.valuesRangeMax);
                },
                alexaGetter: function (value) {
                    return value;
                }
            })
        }

        if (property.propertyName === Properties.ThermostatMode.propertyName) {
            const proxy = new StateProxy({
                setState: mode || { id: 'not-defined' },
                getState: mode || { id: 'not-defined' },
                alexaSetter: function (alexaValue) {
                    return Properties.ThermostatMode.AUTO;
                },
                alexaGetter: function (value) {
                    return Properties.ThermostatMode.AUTO;
                }

            })
            // set mode to be AUTO for thermostats without mode at all
            proxy.currentValue = mode ? undefined : Properties.ThermostatMode.AUTO;
            return proxy;
        }
    }
}

module.exports = Thermostat;