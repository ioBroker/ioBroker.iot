import Speaker from '../Alexa/Capabilities/Speaker';
import Properties from '../Alexa/Properties';
import type { Base as PropertiesBase, ControlStateInitObject } from '../Alexa/Properties/Base';
import { Volume as PropertiesVolume } from '../Alexa/Properties/Volume';
import AdapterProvider from '../Helpers/AdapterProvider';
import { denormalize_0_100, normalize_0_100 } from '../Helpers/Utils';
import AdjustableControl from './AdjustableControl';
import type { AlexaV3Category, AlexaV3DirectiveValue, IotExternalPatternControl } from '../types';

export default class Volume extends AdjustableControl {
    private readonly _speaker: Speaker;
    private _lastVolume: ioBroker.StateValue | undefined;

    constructor(detectedControl: IotExternalPatternControl) {
        super(detectedControl);

        this._speaker = new Speaker(this.composeInitObjectVolume(), this.composeInitObjectMuted());
        this._supported = [this._speaker];
    }

    get categories(): AlexaV3Category[] {
        return ['SPEAKER'];
    }

    adjustableProperties(): (typeof PropertiesBase)[] {
        return [PropertiesVolume];
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
            if (this._speaker.volume.setId !== this._speaker.muted.setId) {
                await AdapterProvider.setState(this._speaker.muted.setId, muted);
            }
            this._speaker.muted.currentValue = muted;
        }
    }

    protected async getOrRetrieveCurrentValue(property: PropertiesBase): Promise<ioBroker.StateValue> {
        if (property.currentValue === undefined) {
            property.currentValue = await AdapterProvider.getState(property.getId);

            // convert non zero volumes to muted = false
            if (
                property.propertyName === this._speaker.muted.propertyName &&
                property.getId === this._speaker.volume.getId
            ) {
                property.currentValue = property.currentValue === 0;
            }
        }

        if (property.currentValue === undefined) {
            throw new Error(`unable to retrieve ${property.getId}`);
        }

        return property.currentValue;
    }

    private composeInitObjectVolume(): ControlStateInitObject {
        const map = this.statesMap;

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
                return normalize_0_100(value as number, this.valuesRangeMin as number, this.valuesRangeMax as number);
            },
        };
    }

    private composeInitObjectMuted(): ControlStateInitObject {
        const map = this.statesMap;

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
