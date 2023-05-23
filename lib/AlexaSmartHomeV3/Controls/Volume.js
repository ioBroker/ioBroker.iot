const Capabilities = require('../Alexa/Capabilities');
const Properties = require('../Alexa/Properties');
const AdapterProvider = require('../Helpers/AdapterProvider');
const Utils = require('../Helpers/Utils');
const AdjustableControl = require('./AdjustableControl');

/**
 * @class
 */
class Volume extends AdjustableControl {
    get categories() {
        return ['SPEAKER'];
    }

    adjustableProperties() {
        return [Properties.Volume];
    }

    initCapabilities() {
        this._speaker = new Capabilities.Speaker();
        let result = [this._speaker];
        for (const property of result.flatMap(item => item.properties)) {
            property.init(this.composeInitObject(property))
        }

        return result;
    }

    async setState(property, value) {
        // set the property itself 
        await AdapterProvider.setState(property.setId, value);
        property.currentValue = value;

        if (property.propertyName === Properties.Muted.propertyName) {
            // set volume
            if (value) { // set volume to 0 on MUTED true
                await AdapterProvider.setState(this._speaker.volume.setId, 0);
                this._lastVolume = this._speaker.volume.currentValue
                this._speaker.volume.currentValue = 0;
            } else { // set volume to the last known, configured or 20 otherwise on MUTED false
                if (!this._lastVolume) {
                    this._lastVolume = this.states[this.statesMap.set].smartName?.byON;
                    this._lastVolume = isNaN(this._lastVolume) ?
                        Utils.denormalize_0_100(20, this._speaker.volume.valuesRangeMin, this._speaker.volume.valuesRangeMax) : parseInt(this._lastVolume);
                }
                await AdapterProvider.setState(this._speaker.volume.setId, this._lastVolume);
                this._speaker.volume.currentValue = this._lastVolume;
            }
        } else { // set muted
            const muted = value === 0;
            // only on different IDs for volume and muted
            if (this._speaker.volume.setId !== this._speaker.muted.setId) {
                await AdapterProvider.setState(this._speaker.muted.setId, muted);
            }
            this._speaker.muted.currentValue = muted;
        }
    }

    async getOrRetrieveCurrentValue(property) {
        if (property.currentValue === undefined) {
            property.currentValue = await AdapterProvider.getState(property.getId);

            // convert non zero volumes to muted = false    
            if (property.propertyName === this._speaker.muted.propertyName && property.getId === this._speaker.volume.getId) {
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

        if (property.propertyName === Properties.Volume.propertyName) {
            // const range = Utils.configuredRangeOrDefault(this.states[map.set]);
            return {
                setState: this.states[map.set],
                getState: this.states[map.actual] || this.states[map.set],
                alexaSetter: function (alexaValue) {
                    return Utils.denormalize_0_100(alexaValue, this.valuesRangeMin, this.valuesRangeMax);
                },
                alexaGetter: function (value) {
                    return Utils.normalize_0_100(value, this.valuesRangeMin, this.valuesRangeMax);
                }
            }
        }

        if (property.propertyName === Properties.Muted.propertyName) {
            // const range = Utils.configuredRangeOrDefault(this.states[map.set]);

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

module.exports = Volume;