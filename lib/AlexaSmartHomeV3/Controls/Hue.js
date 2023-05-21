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

        this._powerControllerCapability = new Capabilities.PowerController();
        this._power = this._powerControllerCapability.properties[0];

        const map = this.statesMap;

        // if the state BRIGHTNESS configured
        if (this.states[map['BRIGHTNESS']]) {
            this._brightnessCapability = new Capabilities.BrightnessController();
            this._brightness = this._brightnessCapability.properties[0];
        } else {
            this._brightnessCapability = undefined;
            this._brightness = undefined;
        }

        // if the state TEMPERATURE configured
        if (this.states[map['TEMPERATURE']]) {
            // this._colorTemperatureCapability = new Capabilities.ColorTemperatureController();
            // this._colorTemperatureInKelvin = this._colorTemperatureCapability.properties[0];
        } else {
            this._colorTemperatureCapability = undefined;
            this._colorTemperatureInKelvin = undefined;
        }

        let result = [this._powerControllerCapability, new Capabilities.ColorController()];

        if (this._brightnessCapability) {
            result.push(this._brightnessCapability);
        }
        if (this._colorTemperatureInKelvin) {
            result.push(this._colorTemperatureInKelvin);
        }

        for (const property of result.flatMap(item => item.properties)) {
            property.init(this.composeInitObject(property))
        }

        return result;
    }

    async setState(property, value) {
        // set the property itself 
        await AdapterProvider.setState(property.setId, value);
        property.currentValue = value;

        if (property.propertyName === Properties.PowerState.propertyName) {
            if (this._brightness) {
                // set brightness
                if (value) {
                    // set byOn to the configured value or 100 otherwise
                    let byOn = this.states[this.statesMap.set].smartName?.byON;
                    byOn = isNaN(byOn) ? 100 : parseInt(byOn);
                    await AdapterProvider.setState(this._brightness.setId, byOn);
                    this._brightness.currentValue = byOn;
                } else { // set brightness to 0 on power OFF
                    await AdapterProvider.setState(this._brightness.setId, 0);
                    this._brightness.currentValue = 0;
                }
            }
        }

        if (property.propertyName === Properties.BrightnessController.propertyName) {
            // set power
            const powerValue = value !== 0;

            // only do this on different IDs for brightness and power
            if (this._brightness.setId !== this._power.setId) {
                await AdapterProvider.setState(this._power.setId, powerValue);
            }
            this._power.currentValue = powerValue;
        }
    }

    composeInitObject(property) {
        /*
            Device of type 'dimmer' can be switched 'ON'/'OFF' and its brightness can be set to a value between 0 and 100.

            If there is no 'ON_SET' state available:
            - switching control 'OFF' is done via setting its brightness to 0
            - switching control 'ON' is done via setting its brightness to the configured 'byOn' value or to the last known brightness.
        */

        const map = this.statesMap;


        if (property.propertyName === Properties.PowerState.propertyName) {
            return {
                setState: this.states[map.on] || this.states[map.brightness],
                getState: this.states[map.on_actual] || this.states[map.on] || this.states[map.brightness],
                alexaSetter: function (alexaValue) {
                    return alexaValue === Properties.PowerState.ON;
                },
                alexaGetter: function (value) {
                    return value ? Properties.PowerState.ON : Properties.PowerState.OFF;
                }
            }
        }

        if (property.propertyName === Properties.Brightness.propertyName) {
            const range = Utils.configuredRangeOrDefault(this.states[map.brightness]);

            return {
                setState: this.states[map.brightness],
                getState: this.states[map.brightness],
                alexaSetter: function (alexaValue) {
                    return Utils.denormalize_0_100(alexaValue, range.min, range.max);
                },
                alexaGetter: function (value) {
                    return Utils.normalize_0_100(value, range.min, range.max);
                },
            };
        }
    }
}

module.exports = Hue;