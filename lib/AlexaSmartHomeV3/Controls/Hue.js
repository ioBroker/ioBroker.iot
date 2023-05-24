const Capabilities = require('../Alexa/Capabilities');
const Utils = require('../Helpers/Utils');
const Properties = require('../Alexa/Properties');
const AdapterProvider = require('../Helpers/AdapterProvider');
const AdjustableControl = require('./AdjustableControl');

/**
 * @class
 */
class Hue extends AdjustableControl {

    get categories() {
        return ['LIGHT'];
    }

    adjustableProperties() {
        return [Properties.ColorTemperatureInKelvin];
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
            await AdapterProvider.setState(property.hal.hue, value.hue);
            if (property.hal.saturation) {
                await AdapterProvider.setState(property.hal.saturation, value.saturation);
            }
            
            // do not set brightness
            
            // https://developer.amazon.com/en-US/docs/alexa/device-apis/alexa-colorcontroller.html
            // Important: For the best user experience, when you make a color change, maintain the current brightness setting of the endpoint. 
            // For example, if a light bulb is currently set to white at 0.5 brightness, and a user requests a color change to red, 
            // the SetColor directive specifies hue = 0, saturation = 1, and brightness = 1. Here, set the hue to 0, the saturation to 1, 
            // and ignore the brightness value of 1 in the directive. Instead, maintain the current brightness value of 0.5.
            
            property.currentValue = value;
        }

    }

    async adjustValue(event, property) {
        // extract Alexa delta value from event
        const delta = property.alexaDirectiveValue(event);
        
        // convert delta to iobroker value
        const value = property.value(delta);

        // set iobroker state
        await this.setState(property, value);

        return value;
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
                hal: {
                    hue: this.states[map.hue].id,
                    saturation: this.states[map.saturation]?.id,
                    brightness: (this.states[map.dimmer] || this.states[map.brightness])?.id
                }                
            };
        }

        if (property.propertyName === Properties.ColorTemperatureInKelvin.propertyName) {
            return {
                setState: this.states[map.temperature],
                getState: this.states[map.temperature],
                alexaSetter: function (alexaValue) {

                    if (alexaValue === 1) { // increase directive
                        const closest = Utils.closestFromList(this.currentValue || this.colorTemperatureTable[0], this.colorTemperatureTable);
                        let index = this.colorTemperatureTable.indexOf(closest) + 1;
                        index = index >= this.colorTemperatureTable.length ? this.colorTemperatureTable.length - 1 : index;
                        return this.colorTemperatureTable[index];
                    }
                    if (alexaValue === -1) { // decrease directive
                        const closest = Utils.closestFromList(this.currentValue || this.colorTemperatureTable[0], this.colorTemperatureTable);
                        let index = this.colorTemperatureTable.indexOf(closest) - 1;
                        index = index < 0 ? 0 : index;
                        return this.colorTemperatureTable[index];
                    }
                    
                    return alexaValue;
                },
                alexaGetter: function (value) {
                    return value;
                }
            };
        }
    }
}

module.exports = Hue;