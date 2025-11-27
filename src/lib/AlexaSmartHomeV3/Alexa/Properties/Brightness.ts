import AdjustableProperty from './AdjustableProperty';
import type { AlexaV3DirectiveValue, AlexaV3Request } from '../../types';

export default class Brightness extends AdjustableProperty {
    #valueOn: number | null = null;

    matches(event: AlexaV3Request): boolean {
        if (Brightness.matches(event)) {
            return true;
        }
        return (
            (this._multiPurposeProperty || this._handleSimilarEvents) &&
            event?.directive?.header?.namespace === 'Alexa.PowerController'
        );
    }

    alexaDirectiveValue(event: AlexaV3Request): AlexaV3DirectiveValue {
        if (event?.directive?.header?.namespace === 'Alexa.PowerController') {
            if (event?.directive?.header.name === 'TurnOn') {
                if (
                    // If we have no dedicated power switch
                    this._multiPurposeProperty ||
                    // Or current value is 0 and the lamp is turned ON
                    (this._handleSimilarEvents &&
                        (typeof this._onValueInPercent === 'number' ||
                            this.currentValue === undefined ||
                            this.currentValue === null ||
                            this.currentValue <= this.valuesRangeMin))
                ) {
                    // Assume full brightness on TurnOn
                    // set byOn to the configured value or 100 otherwise
                    if (this._onValueInPercent !== undefined) {
                        if (this._onValueInPercent === 'stored') {
                            this.#valueOn ||= 100;
                        } else if (this._onValueInPercent === 'omit') {
                            // Do not change brightness on TurnOn
                            return undefined;
                        } else {
                            this.#valueOn = this._onValueInPercent;
                        }

                        return this.#valueOn < this._offValue ? 100 : this.#valueOn;
                    }
                    if (this.#valueOn && this.#valueOn > this._offValue) {
                        return this.#valueOn;
                    }
                    return 100;
                }
            } else if (event?.directive?.header.name === 'TurnOff') {
                // If we have a dedicated power state, we do not change brightness on TurnOff
                if (this._multiPurposeProperty) {
                    // Assume zero brightness on TurnOff if we do not have a dedicated power state
                    return 0;
                }
            }

            return undefined;
        }

        if (Brightness.directive(event) === Brightness.SET) {
            const value = super.alexaDirectiveValue(event);
            // remember last brightness > 0
            if ((value as number) >= this._offValue) {
                this.#valueOn = value as number;
            }
            return value;
        }

        return event.directive.payload.brightnessDelta;
    }

    /** Converts an Alexa value to an ioBroker value */
    value(alexaValue: AlexaV3DirectiveValue): ioBroker.StateValue | undefined {
        // Convert alexa value 0-100 to ioBroker value min-max
        if (typeof alexaValue === 'number') {
            const value =
                (this.valueRealMin as number) +
                (((this.valueRealMax as number) - (this.valueRealMin as number)) * alexaValue) / 100;
            return Math.round(value);
        }
        return undefined;
    }

    /** Converts an ioBroker value to an Alexa value */
    alexaValue(value: ioBroker.StateValue | undefined): AlexaV3DirectiveValue {
        // Convert ioBroker Value min-max to Alexa value 0-100
        if (typeof value === 'number') {
            const alexaValue =
                ((value - (this.valueRealMin as number)) * 100) /
                ((this.valueRealMax as number) - (this.valueRealMin as number));
            return Math.round(alexaValue);
        }
        return undefined;
    }
}
