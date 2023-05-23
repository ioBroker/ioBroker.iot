const Capabilities = require('../Alexa/Capabilities');
const Utils = require('../Helpers/Utils');
const Properties = require('../Alexa/Properties');
const Control = require('./Control');
const AdapterProvider = require('../Helpers/AdapterProvider');

/**
 * @class
 */
class Hue extends Control {

    get categories() {
        return ['LIGHT'];
    }

    initCapabilities() {

        const map = this.statesMap;
        const result = [new Capabilities.ColorController()];

        // if the state DIMMER or BRIGHTNESS configured
        if (this.states[map.dimmer] || this.states[map.brightness]) {
            this._brightnessCapability = new Capabilities.BrightnessController();
            this._brightness = this._brightnessCapability.brightness;
            result.push(this._brightnessCapability);
        }

        // if the state TEMPERATURE configured
        if (this.states[map.temperature]) {
            this._colorTemperatureCapability = new Capabilities.ColorTemperatureController();
            this._colorTemperatureInKelvin = this._colorTemperatureCapability.colorTemperatureInKelvin;
            result.push(this._colorTemperatureCapability);
        }

        // if the state ON, DIMMER or BRIGHTNESS configured
        if (this.states[map.on] || this._brightness) {
            this._powerControllerCapability = new Capabilities.PowerController();
            this._powerState = this._powerControllerCapability.powerState;
            result.push(this._powerControllerCapability);
        }

        for (const property of result.flatMap(item => item.properties)) {
            property.init(this.composeInitObject(property))
        }

        return result;
    }

    async getOrRetrieveCurrentValue(property) {
        const map = this.statesMap;

        if (property.currentValue === undefined) {
            property.currentValue = await AdapterProvider.getState(property.getId);
            // convert non zero brightness to power = true
            if (property.propertyName === Properties.PowerState.propertyName && !this.states[map.on]) {
                property.currentValue = property.currentValue !== 0;
            }

            if (property.propertyName === Properties.Color.propertyName) {
                property.currentValue = {
                    hue: property.currentValue,
                    saturation: property.hal.saturation,
                    brightness: property.hal.brightness
                };
            }
        }

        if (property.currentValue === undefined) {
            throw new Error(`unable to retrieve ${property.getId}`);
        }

        return property.currentValue;
    }

    async setState(property, value) {

        const map = this.statesMap;

        if (property.propertyName === Properties.PowerState.propertyName) {
            if (this.states[map.on]) {
                await AdapterProvider.setState(property.setId, value);
                property.currentValue = value;
            } else {
                if (value) { // set brightness
                    // set byOn to the configured value or range.max otherwise
                    const range = Utils.configuredRangeOrDefault(this.states[map.dimmer] || this.states[map.brightness]);
                    let byOn = (this.states[map.dimmer] || this.states[map.brightness])?.smartName?.byON;
                    byOn = isNaN(byOn) ? range.max : parseInt(byOn);
                    await AdapterProvider.setState(this._brightness.setId, byOn);
                    this._brightness.currentValue = byOn;
                    this._powerState.currentValue = true;
                } else { // set brightness to 0 on power OFF
                    await AdapterProvider.setState(this._brightness.setId, 0);
                    this._brightness.currentValue = 0;
                    this._powerState.currentValue = false;
                }
            }
        }

        if (property.propertyName === Properties.Brightness.propertyName
            || property.propertyName === Properties.ColorTemperatureInKelvin.propertyName) {
            await AdapterProvider.setState(property.setId, value);
            property.currentValue = value;
        }

        if (property.propertyName === Properties.Color.propertyName) {
            await AdapterProvider.setState(property.setId, value.hue);
            property.currentValue = value;
        }

    }

    composeInitObject(property) {

        const map = this.statesMap;

        if (property.propertyName === Properties.PowerState.propertyName) {
            return {
                setState: this.states[map.on] || this.states[map.dimmer] || this.states[map.brightness],
                getState: this.states[map.on] || this.states[map.dimmer] || this.states[map.brightness],
                alexaSetter: function (alexaValue) {
                    return alexaValue === Properties.PowerState.ON;
                },
                alexaGetter: function (value) {
                    return value ? Properties.PowerState.ON : Properties.PowerState.OFF;
                }
            }
        }

        if (property.propertyName === Properties.Brightness.propertyName) {
            return {
                setState: this.states[map.dimmer] || this.states[map.brightness],
                getState: this.states[map.dimmer] || this.states[map.brightness],
                alexaSetter: function (alexaValue) {
                    return Utils.denormalize_0_100(alexaValue, this.valuesRangeMin, this.valuesRangeMax);
                },
                alexaGetter: function (value) {
                    return Utils.normalize_0_100(value, this.valuesRangeMin, this.valuesRangeMax);
                },
            };
        }

        if (property.propertyName === Properties.Color.propertyName) {
            return {
                setState: this.states[map.hue],
                getState: this.states[map.hue],
            };
        }

        if (property.propertyName === Properties.ColorTemperatureInKelvin.propertyName) {
            return {
                setState: this.states[map.temperature],
                getState: this.states[map.temperature]
            };
        }
    }
}

module.exports = Hue;