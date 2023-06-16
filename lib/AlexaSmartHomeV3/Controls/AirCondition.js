const Capabilities = require('../Alexa/Capabilities');
const AdjustableControl = require('./AdjustableControl');
const Utils = require('../Helpers/Utils');
const Properties = require('../Alexa/Properties');
const AdapterProvider = require('../Helpers/AdapterProvider');

/**
 * @class
 */
class AirCondition extends AdjustableControl {
    get categories() {
        return ['AIR_CONDITIONER']
    }

    adjustableProperties() {
        return [Properties.TargetSetpoint];
    }

    get dedicatedOnOff() {
        return this.states[this.statesMap.power] !== undefined;
    }

    initCapabilities() {
        this._thermostatController = new Capabilities.ThermostatController();
        this._thermostatMode = this._thermostatController.thermostatMode;
        this._powerController = new Capabilities.PowerController();
        this._powerState = this._powerController.powerState;
        let result = [new Capabilities.TemperatureSensor(), this._thermostatController, this._powerController];
        for (const property of result.flatMap(item => item.properties)) {
            property.init(this.composeInitObject(property));
        }
        return result;
    }

    async setState(property, value) {
        // if we set power ON/OFF via thermostat mode
        if (property.propertyName === Properties.PowerState.propertyName && !this.dedicatedOnOff) {
            // set the mode to the last known value or AUTO by switching power ON
            if (value) {
                this._lastKnownMode = this._lastKnownMode || this._thermostatMode.supportedModesAsEnum[Properties.ThermostatMode.AUTO];
                await AdapterProvider.setState(this._thermostatMode.setId, this._lastKnownMode);
                this._thermostatMode.currentValue = this._lastKnownMode;
                this._powerState.currentValue = true;

            } else { // set mode to OFF
                const modeOffValue = this._thermostatMode.supportedModesAsEnum[Properties.ThermostatMode.OFF];
                await AdapterProvider.setState(this._thermostatMode.setId, modeOffValue);
                this._thermostatMode.currentValue = this._lastKnownMode;
                this._powerState.currentValue = false;
            }
        } else {
            // just set the property
            await AdapterProvider.setState(property.setId, value);
            property.currentValue = value;

            if (property.propertyName === Properties.ThermostatMode.propertyName) {
                this._lastKnownMode = value;
                if (!this.dedicatedOnOff) {
                    this._powerState.currentValue = value !== this._thermostatMode.supportedModesAsEnum[Properties.ThermostatMode.OFF];
                }

            }
        }
    }

    async getOrRetrieveCurrentValue(property) {
        if (property.currentValue === undefined) {
            property.currentValue = await AdapterProvider.getState(property.getId);

            // convert mode != OFF to power = true
            if (property.propertyName === this._powerState.propertyName && !this.dedicatedOnOff) {
                property.currentValue = property.currentValue !== this._thermostatMode.supportedModesAsEnum[Properties.ThermostatMode.OFF];
            }
        }

        if (property.currentValue === undefined) {
            throw new Error(`unable to retrieve ${property.getId}`);
        }

        return property.currentValue;
    }

    composeInitObject(property) {
        const map = this.statesMap;

        if (property.propertyName === Properties.PowerState.propertyName) {

            return {
                setState: this.states[map.power] || this.states[map.mode],
                getState: this.states[map.power] || this.states[map.mode],
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
            // const range = Utils.configuredRangeOrDefault(this.states[map.set]);
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
                setState: this.states[map.mode],
                getState: this.states[map.mode],
                alexaSetter: function (alexaValue) {
                    return this.supportedModesAsEnum[alexaValue];
                },
                alexaGetter: function (value) {
                    return this.supportedModesAsEnum[value];
                },
                supportedModes: [
                    Properties.ThermostatMode.AUTO,
                    Properties.ThermostatMode.COOL,
                    Properties.ThermostatMode.ECO,
                    Properties.ThermostatMode.HEAT,
                    Properties.ThermostatMode.OFF,
                ],
            };
            return initObject;
        }
    }
}

module.exports = AirCondition;