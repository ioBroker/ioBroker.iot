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
        const valuesRangeMin = this.valuesRangeMin;
        const valuesRangeMax = this.valuesRangeMax;


        if (property.propertyName === Properties.PowerState.propertyName) {
            return new StateProxy({
                setId: setPower?.id || setTemperature.id,
                getId: getPower?.id || setPower?.id,
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
                setId: setTemperature.id,
                getId: getTemperature?.id,
            })
        }

        if (property.propertyName === Properties.TargetSetpoint.propertyName) {
            return new StateProxy({
                setId: setTemperature.id,
                getId: getTemperature?.id,
                alexaSetter: function (alexaValue) {
                    return Utils.ensureValueInRange(alexaValue, valuesRangeMin, valuesRangeMax);
                },
                alexaGetter: function (value) {
                    return value;
                }
            })
        }

        if (property.propertyName === Properties.ThermostatMode.propertyName) {
            const proxy = new StateProxy({
                setId: mode?.id || 'not-defined',
                getId: mode?.id || 'not-defined',
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