"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Speaker_1 = __importDefault(require("../Alexa/Capabilities/Speaker"));
const Properties_1 = __importDefault(require("../Alexa/Properties"));
const Volume_1 = require("../Alexa/Properties/Volume");
const AdapterProvider_1 = __importDefault(require("../Helpers/AdapterProvider"));
const Utils_1 = require("../Helpers/Utils");
const AdjustableControl_1 = __importDefault(require("./AdjustableControl"));
class Volume extends AdjustableControl_1.default {
    _speaker;
    _lastVolume;
    get categories() {
        return ['SPEAKER'];
    }
    adjustableProperties() {
        return [Volume_1.Volume];
    }
    initCapabilities() {
        this._speaker = new Speaker_1.default();
        const result = [this._speaker];
        for (const property of result.flatMap(item => item.properties)) {
            const intiOption = this.composeInitObject(property);
            if (intiOption) {
                property.init(intiOption);
            }
        }
        return result;
    }
    async setState(property, value) {
        // set the property itself
        await AdapterProvider_1.default.setState(property.setId, value);
        property.currentValue = value;
        if (property.propertyName === Properties_1.default.Muted.propertyName) {
            if (!this._speaker) {
                throw new Error('Muted property name is missing');
            }
            // set volume
            if (value) {
                // set volume to 0 on MUTED true
                await AdapterProvider_1.default.setState(this._speaker.volume.setId, 0);
                this._lastVolume = this._speaker.volume.currentValue;
                this._speaker.volume.currentValue = 0;
            }
            else {
                // set volume to the last known, configured or 20 otherwise on MUTED false
                if (this._lastVolume === undefined) {
                    const smartName = this.states[this.statesMap.set].smartName;
                    if (typeof smartName === 'object' && smartName && smartName.byON !== undefined) {
                        this._lastVolume = smartName.byON;
                    }
                    this._lastVolume =
                        this._lastVolume === undefined || isNaN(this._lastVolume)
                            ? (0, Utils_1.denormalize_0_100)(20, this._speaker.volume.valuesRangeMin, this._speaker.volume.valuesRangeMax)
                            : parseInt(this._lastVolume, 10);
                }
                await AdapterProvider_1.default.setState(this._speaker.volume.setId, this._lastVolume);
                this._speaker.volume.currentValue = this._lastVolume;
            }
        }
        else {
            // set muted
            const muted = value === 0;
            // only on different IDs for volume and muted
            if (this._speaker.volume.setId !== this._speaker.muted.setId) {
                await AdapterProvider_1.default.setState(this._speaker.muted.setId, muted);
            }
            this._speaker.muted.currentValue = muted;
        }
    }
    async getOrRetrieveCurrentValue(property) {
        if (property.currentValue === undefined) {
            property.currentValue = await AdapterProvider_1.default.getState(property.getId);
            // convert non zero volumes to muted = false
            if (property.propertyName === this._speaker.muted.propertyName &&
                property.getId === this._speaker.volume.getId) {
                property.currentValue = property.currentValue === 0;
            }
        }
        if (property.currentValue === undefined) {
            throw new Error(`unable to retrieve ${property.getId}`);
        }
        return property.currentValue;
    }
    composeInitObject(property) {
        const map = this.statesMap;
        if (property.propertyName === Properties_1.default.Volume.propertyName) {
            return {
                setState: this.states[map.set],
                getState: this.states[map.actual] || this.states[map.set],
                alexaSetter: function (alexaValue) {
                    return (0, Utils_1.denormalize_0_100)(alexaValue, this.valuesRangeMin, this.valuesRangeMax);
                },
                alexaGetter: function (value) {
                    return (0, Utils_1.normalize_0_100)(value, this.valuesRangeMin, this.valuesRangeMax);
                },
            };
        }
        if (property.propertyName === Properties_1.default.Muted.propertyName) {
            return {
                setState: this.states[map.mute] || this.states[map.set],
                getState: this.states[map.mute] || this.states[map.set],
                alexaSetter: function (alexaValue) {
                    return alexaValue;
                },
                alexaGetter: function (value) {
                    return value;
                },
            };
        }
    }
}
exports.default = Volume;
//# sourceMappingURL=Volume.js.map