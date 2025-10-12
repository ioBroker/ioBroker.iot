"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const PowerController_1 = __importDefault(require("../Alexa/Capabilities/PowerController"));
const BrightnessController_1 = __importDefault(require("../Alexa/Capabilities/BrightnessController"));
const AdjustableControl_1 = __importDefault(require("./AdjustableControl"));
const Utils_1 = require("../Helpers/Utils");
const PowerState_1 = __importDefault(require("../Alexa/Properties/PowerState"));
const Brightness_1 = __importDefault(require("../Alexa/Properties/Brightness"));
const AdapterProvider_1 = __importDefault(require("../Helpers/AdapterProvider"));
class Dimmer extends AdjustableControl_1.default {
    _powerControllerCapability;
    _powerState;
    _brightnessCapability;
    _brightness;
    get categories() {
        return ['LIGHT'];
    }
    adjustableProperties() {
        return [Brightness_1.default];
    }
    initCapabilities() {
        this._powerControllerCapability = new PowerController_1.default();
        this._powerState = this._powerControllerCapability.powerState;
        this._brightnessCapability = new BrightnessController_1.default();
        this._brightness = this._brightnessCapability.brightness;
        const result = [this._powerControllerCapability, this._brightnessCapability];
        for (const property of result.flatMap(item => item.properties)) {
            const initObj = this.composeInitObject(property);
            if (initObj) {
                property.init(initObj);
            }
        }
        return result;
    }
    async setState(property, value) {
        // set the property itself
        await AdapterProvider_1.default.setState(property.setId, value);
        property.currentValue = value;
        const valuesRange = (0, Utils_1.configuredRangeOrDefault)(this.states[this.statesMap.set]);
        // todo: use adapter.config.deviceOffLevel
        // If
        if (property.propertyName === PowerState_1.default.propertyName) {
            // set brightness
            if (value) {
                const smartName = this.states[this.statesMap.set].smartName;
                let byOn;
                if (smartName && typeof smartName === 'object') {
                    byOn = smartName.byON;
                }
                // set byOn to the configured value or 100 otherwise
                byOn =
                    byOn === undefined || byOn === null || isNaN(byOn)
                        ? valuesRange.max
                        : parseFloat(byOn);
                await AdapterProvider_1.default.setState(this._brightness.setId, byOn);
                this._brightness.currentValue = byOn;
            }
            else {
                // set brightness to 0 on power OFF
                await AdapterProvider_1.default.setState(this._brightness.setId, valuesRange.min);
                this._brightness.currentValue = valuesRange.min;
            }
        }
        else {
            // set power
            const powerValue = value !== valuesRange.min;
            // only do this on different IDs for brightness and power
            if (this._brightness.setId !== this._powerState.setId) {
                await AdapterProvider_1.default.setState(this._powerState.setId, powerValue);
            }
            this._powerState.currentValue = powerValue;
        }
    }
    async getOrRetrieveCurrentValue(property) {
        if (property.currentValue === undefined) {
            property.currentValue = await AdapterProvider_1.default.getState(property.getId);
            const valuesRange = (0, Utils_1.configuredRangeOrDefault)(this.states[this.statesMap.set]);
            // convert non-zero brightness to power = true
            if (property.propertyName === this._powerState.propertyName && property.getId === this._brightness.getId) {
                property.currentValue = property.currentValue !== valuesRange.min;
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
        if (property.propertyName === PowerState_1.default.propertyName) {
            return {
                setState: this.states[map.on_set] || this.states[map.set],
                getState: this.states[map.on_actual] || this.states[map.on_set] || this.states[map.set],
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
                setState: this.states[map.set],
                getState: this.states[map.actual],
                alexaSetter: function (alexaValue) {
                    return ((0, Utils_1.denormalize_0_100)(alexaValue, this.valuesRangeMin, this.valuesRangeMax) ?? 0);
                },
                alexaGetter: function (value) {
                    return (0, Utils_1.normalize_0_100)(value, this.valuesRangeMin, this.valuesRangeMax);
                },
            };
        }
    }
}
exports.default = Dimmer;
//# sourceMappingURL=Dimmer.js.map