import Speaker from '../Alexa/Capabilities/Speaker';
import Properties from '../Alexa/Properties';
import type { Base as PropertiesBase } from '../Alexa/Properties/Base';
import { Volume as PropertiesVolume } from '../Alexa/Properties/Volume';
import AdapterProvider from '../Helpers/AdapterProvider';
import { denormalize_0_100, normalize_0_100 } from '../Helpers/Utils';
import AdjustableControl from './AdjustableControl';
import type { Base as CapabilitiesBase } from '../Alexa/Capabilities/Base';
import type { AlexaV3Category, AlexaV3DirectiveValue, IotExternalDetectorState } from '../types';

export default class Volume extends AdjustableControl {
    private _speaker: Speaker | undefined;
    private _lastVolume: ioBroker.StateValue | undefined;

    get categories(): AlexaV3Category[] {
        return ['SPEAKER'];
    }

    adjustableProperties(): (typeof PropertiesBase)[] {
        return [PropertiesVolume];
    }

    initCapabilities(): CapabilitiesBase[] {
        this._speaker = new Speaker();
        const result = [this._speaker];
        for (const property of result.flatMap(item => item.properties)) {
            const intiOption = this.composeInitObject(property);
            if (intiOption) {
                property.init(intiOption);
            }
        }

        return result;
    }

    async setState(property: PropertiesBase, value: ioBroker.StateValue | undefined): Promise<void> {
        // set the property itself
        await AdapterProvider.setState(property.setId, value!);
        property.currentValue = value;

        if (property.propertyName === Properties.Muted.propertyName) {
            if (!this._speaker) {
                throw new Error('Muted property name is missing');
            }
            // set volume
            if (value) {
                // set volume to 0 on MUTED true
                await AdapterProvider.setState(this._speaker.volume.setId, 0);
                this._lastVolume = this._speaker.volume.currentValue;
                this._speaker.volume.currentValue = 0;
            } else {
                // set volume to the last known, configured or 20 otherwise on MUTED false
                if (this._lastVolume === undefined) {
                    const smartName = this.states[this.statesMap.set]!.smartName;
                    if (typeof smartName === 'object' && smartName && smartName.byON !== undefined) {
                        this._lastVolume = smartName.byON;
                    }
                    this._lastVolume =
                        this._lastVolume === undefined || isNaN(this._lastVolume as unknown as number)
                            ? denormalize_0_100(
                                  20,
                                  this._speaker.volume.valuesRangeMin as number,
                                  this._speaker.volume.valuesRangeMax as number,
                              )
                            : parseInt(this._lastVolume as string, 10);
                }
                await AdapterProvider.setState(this._speaker.volume.setId, this._lastVolume as number);
                this._speaker.volume.currentValue = this._lastVolume;
            }
        } else {
            // set muted
            const muted = value === 0;
            // only on different IDs for volume and muted
            if (this._speaker!.volume.setId !== this._speaker!.muted.setId) {
                await AdapterProvider.setState(this._speaker!.muted.setId, muted);
            }
            this._speaker!.muted.currentValue = muted;
        }
    }

    async getOrRetrieveCurrentValue(property: PropertiesBase): Promise<ioBroker.StateValue> {
        if (property.currentValue === undefined) {
            property.currentValue = await AdapterProvider.getState(property.getId);

            // convert non zero volumes to muted = false
            if (
                property.propertyName === this._speaker!.muted.propertyName &&
                property.getId === this._speaker!.volume.getId
            ) {
                property.currentValue = property.currentValue === 0;
            }
        }

        if (property.currentValue === undefined) {
            throw new Error(`unable to retrieve ${property.getId}`);
        }

        return property.currentValue;
    }

    composeInitObject(property: PropertiesBase):
        | {
              setState: IotExternalDetectorState;
              getState: IotExternalDetectorState;
              alexaSetter?: (alexaValue: AlexaV3DirectiveValue) => ioBroker.StateValue | undefined;
              alexaGetter?: (value: ioBroker.StateValue | undefined) => AlexaV3DirectiveValue;
          }
        | undefined {
        const map = this.statesMap;

        if (property.propertyName === Properties.Volume.propertyName) {
            return {
                setState: this.states[map.set]!,
                getState: this.states[map.actual] || this.states[map.set]!,
                alexaSetter: function (
                    this: PropertiesBase,
                    alexaValue: AlexaV3DirectiveValue,
                ): ioBroker.StateValue | undefined {
                    return denormalize_0_100(
                        alexaValue as number,
                        this.valuesRangeMin as number,
                        this.valuesRangeMax as number,
                    );
                },
                alexaGetter: function (
                    this: PropertiesBase,
                    value: ioBroker.StateValue | undefined,
                ): AlexaV3DirectiveValue {
                    return normalize_0_100(
                        value as number,
                        this.valuesRangeMin as number,
                        this.valuesRangeMax as number,
                    );
                },
            };
        }

        if (property.propertyName === Properties.Muted.propertyName) {
            return {
                setState: this.states[map.mute] || this.states[map.set]!,
                getState: this.states[map.mute] || this.states[map.set]!,
                alexaSetter: function (alexaValue: AlexaV3DirectiveValue): ioBroker.StateValue | undefined {
                    return alexaValue as boolean;
                },
                alexaGetter: function (value: ioBroker.StateValue | undefined): AlexaV3DirectiveValue {
                    return value as boolean;
                },
            };
        }
    }
}
