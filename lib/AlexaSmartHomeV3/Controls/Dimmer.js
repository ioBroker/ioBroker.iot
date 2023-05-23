const Capabilities = require('../Alexa/Capabilities');
const AdjustableControl = require('./AdjustableControl');
const Utils = require('../Helpers/Utils');
const Properties = require('../Alexa/Properties');
const AdapterProvider = require('../Helpers/AdapterProvider');

/**
 * @class
 */
class Dimmer extends AdjustableControl {

    get categories() {
        return ['LIGHT'];
    }

    adjustableProperties() {
        return [Properties.Brightness];
    }

    initCapabilities() {
        this._powerControllerCapability = new Capabilities.PowerController();
        this._powerState = this._powerControllerCapability.powerState;

        this._brightnessCapability = new Capabilities.BrightnessController();
        this._brightness = this._brightnessCapability.brightness;

        let result = [this._powerControllerCapability, this._brightnessCapability];
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
        } else {
            // set power
            const powerValue = value !== 0;

            // only do this on different IDs for brightness and power
            if (this._brightness.setId !== this._powerState.setId) {
                await AdapterProvider.setState(this._powerState.setId, powerValue);
            }
            this._powerState.currentValue = powerValue;
        }
    }

    async getOrRetrieveCurrentValue(property) {
        if (property.currentValue === undefined) {
            property.currentValue = await AdapterProvider.getState(property.getId);

            // convert non zero brightness to power = true
            if (property.propertyName === this._powerState.propertyName && property.getId === this._brightness.getId) {
                property.currentValue = property.currentValue !== 0;
            }
        }

        if (property.currentValue === undefined) {
            throw new Error(`unable to retrieve ${property.getId}`);
        }

        return property.currentValue;
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
                setState: this.states[map.on_set] || this.states[map.set],
                getState: this.states[map.on_actual] || this.states[map.on_set] || this.states[map.set],
                alexaSetter: function (alexaValue) {
                    return alexaValue === Properties.PowerState.ON;
                },
                alexaGetter: function (value) {
                    return value ? Properties.PowerState.ON : Properties.PowerState.OFF;
                }
            }
        }

        if (property.propertyName === Properties.Brightness.propertyName) {
            // const range = Utils.configuredRangeOrDefault(this.states[map.set]);

            return {
                setState: this.states[map.set],
                getState: this.states[map.actual],
                alexaSetter: function (alexaValue) {
                    return Utils.denormalize_0_100(alexaValue, this.valuesRangeMin, this.valuesRangeMax);
                },
                alexaGetter: function (value) {
                    return Utils.normalize_0_100(value, this.valuesRangeMin, this.valuesRangeMax);
                },
            };
        }
    }
}

module.exports = Dimmer;