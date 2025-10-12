"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Capabilities_1 = __importDefault(require("../Alexa/Capabilities"));
const Utils_1 = require("../Helpers/Utils");
const Properties_1 = __importDefault(require("../Alexa/Properties"));
const PowerState_1 = __importDefault(require("../Alexa/Properties/PowerState"));
const Brightness_1 = __importDefault(require("../Alexa/Properties/Brightness"));
const AdapterProvider_1 = __importDefault(require("../Helpers/AdapterProvider"));
const AdjustableControl_1 = __importDefault(require("./AdjustableControl"));
const Color_1 = __importDefault(require("../Alexa/Properties/Color"));
const ColorTemperatureInKelvin_1 = __importDefault(require("../Alexa/Properties/ColorTemperatureInKelvin"));
class Hue extends AdjustableControl_1.default {
    _powerControllerCapability;
    _powerState;
    _brightnessCapability;
    _brightness;
    _colorTemperatureCapability;
    get categories() {
        return ['LIGHT'];
    }
    adjustableProperties() {
        return [Properties_1.default.ColorTemperatureInKelvin];
    }
    initCapabilities() {
        const map = this.statesMap;
        const result = [new Capabilities_1.default.ColorController()];
        // if the state DIMMER or BRIGHTNESS configured
        if (this.states[map.dimmer] || this.states[map.brightness]) {
            this._brightnessCapability = new Capabilities_1.default.BrightnessController();
            this._brightness = this._brightnessCapability.brightness;
            result.push(this._brightnessCapability);
        }
        // if the state TEMPERATURE configured
        if (this.states[map.temperature]) {
            this._colorTemperatureCapability = new Capabilities_1.default.ColorTemperatureController();
            result.push(this._colorTemperatureCapability);
        }
        // if the state ON, DIMMER or BRIGHTNESS configured
        if (this.states[map.on] || this._brightness) {
            this._powerControllerCapability = new Capabilities_1.default.PowerController();
            this._powerState = this._powerControllerCapability.powerState;
            result.push(this._powerControllerCapability);
        }
        for (const property of result.flatMap(item => item.properties)) {
            const initObj = this.composeInitObject(property);
            if (initObj) {
                property.init(initObj);
            }
        }
        return result;
    }
    async getOrRetrieveCurrentValue(property) {
        const map = this.statesMap;
        if (property.currentValue === undefined) {
            property.currentValue = await AdapterProvider_1.default.getState(property.getId);
            // convert the non-zero brightness to power = true
            if (property.propertyName === Properties_1.default.PowerState.propertyName && !this.states[map.on]) {
                property.currentValue = property.currentValue !== 0;
            }
            if (property.propertyName === Properties_1.default.Color.propertyName) {
                // @ts-expect-error special case for Color property
                property.currentValue = {
                    hue: property.currentValue,
                    saturation: property.hal.saturation,
                    brightness: property.hal.brightness,
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
        if (property.propertyName === PowerState_1.default.propertyName) {
            if (this.states[map.on]) {
                await AdapterProvider_1.default.setState(property.setId, value ?? false);
                property.currentValue = value;
            }
            else {
                if (value) {
                    // set brightness
                    // set byOn to the configured value or range.max otherwise
                    const range = (0, Utils_1.configuredRangeOrDefault)(this.states[map.dimmer] || this.states[map.brightness]);
                    const smartName = (this.states[map.dimmer] || this.states[map.brightness])?.smartName;
                    let byOn;
                    if (smartName && typeof smartName === 'object') {
                        byOn = smartName.byON;
                    }
                    byOn =
                        byOn === null || byOn === undefined || isNaN(byOn)
                            ? range.max
                            : parseFloat(byOn);
                    await AdapterProvider_1.default.setState(this._brightness.setId, byOn);
                    this._brightness.currentValue = byOn;
                    this._powerState.currentValue = true;
                }
                else {
                    // set brightness to 0 on power OFF
                    await AdapterProvider_1.default.setState(this._brightness.setId, 0);
                    this._brightness.currentValue = 0;
                    this._powerState.currentValue = false;
                }
            }
        }
        else if (property.propertyName === Brightness_1.default.propertyName) {
            await AdapterProvider_1.default.setState(property.setId, value ?? 0);
            property.currentValue = value;
        }
        else if (property.propertyName === Color_1.default.propertyName) {
            const colorProperty = property;
            const hueValue = value;
            await AdapterProvider_1.default.setState(colorProperty.hal.hue, hueValue.hue);
            if (colorProperty.hal.saturation) {
                await AdapterProvider_1.default.setState(colorProperty.hal.saturation, hueValue.saturation);
            }
            // do not set brightness
            // https://developer.amazon.com/en-US/docs/alexa/device-apis/alexa-colorcontroller.html
            // Important: For the best user experience, when you make a color change, maintain the current brightness setting of the endpoint.
            // For example, if a light bulb is currently set to white at 0.5 brightness, and a user requests a color change to red,
            // the SetColor directive specifies hue = 0, saturation = 1, and brightness = 1. Here, set the hue to 0, the saturation to 1,
            // and ignore the brightness value of 1 in the directive. Instead, maintain the current brightness value of 0.5.
            property.currentValue = value;
        }
        else if (property.propertyName === ColorTemperatureInKelvin_1.default.propertyName) {
            await AdapterProvider_1.default.setState(property.setId, value ?? 2200);
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
        if (property.propertyName === Properties_1.default.PowerState.propertyName) {
            return {
                setState: this.states[map.on] || this.states[map.dimmer] || this.states[map.brightness],
                getState: this.states[map.on] || this.states[map.dimmer] || this.states[map.brightness],
                alexaSetter: function (alexaValue) {
                    return alexaValue === PowerState_1.default.ON;
                },
                alexaGetter: function (value) {
                    return value ? PowerState_1.default.ON : PowerState_1.default.OFF;
                },
            };
        }
        if (property.propertyName === Brightness_1.default.propertyName) {
            return {
                setState: this.states[map.dimmer] || this.states[map.brightness],
                getState: this.states[map.dimmer] || this.states[map.brightness],
                alexaSetter: function (alexaValue) {
                    return ((0, Utils_1.denormalize_0_100)(alexaValue, this.valuesRangeMin, this.valuesRangeMax) ?? 0);
                },
                alexaGetter: function (value) {
                    return (0, Utils_1.normalize_0_100)(value, this.valuesRangeMin, this.valuesRangeMax);
                },
            };
        }
        if (property.propertyName === Properties_1.default.Color.propertyName) {
            return {
                hal: {
                    hue: this.states[map.hue].id,
                    saturation: this.states[map.saturation]?.id,
                    brightness: (this.states[map.dimmer] || this.states[map.brightness])?.id,
                },
            };
        }
        if (property.propertyName === Properties_1.default.ColorTemperatureInKelvin.propertyName) {
            return {
                setState: this.states[map.temperature],
                getState: this.states[map.temperature],
                alexaSetter: function (alexaValue) {
                    if (alexaValue === 1) {
                        // increase directive
                        const closest = (0, Utils_1.closestFromList)(this.currentValue || this.colorTemperatureTable[0], this.colorTemperatureTable);
                        let index = this.colorTemperatureTable.indexOf(closest) + 1;
                        index =
                            index >= this.colorTemperatureTable.length ? this.colorTemperatureTable.length - 1 : index;
                        return this.colorTemperatureTable[index];
                    }
                    if (alexaValue === -1) {
                        // decrease directive
                        const closest = (0, Utils_1.closestFromList)(this.currentValue || this.colorTemperatureTable[0], this.colorTemperatureTable);
                        let index = this.colorTemperatureTable.indexOf(closest) - 1;
                        index = index < 0 ? 0 : index;
                        return this.colorTemperatureTable[index];
                    }
                    return alexaValue;
                },
                alexaGetter: function (value) {
                    return value;
                },
            };
        }
    }
}
exports.default = Hue;
//# sourceMappingURL=Hue.js.map