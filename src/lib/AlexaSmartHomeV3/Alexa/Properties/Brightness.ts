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
                        (this.currentValue === undefined ||
                            this.currentValue === null ||
                            this.currentValue <= this.valuesRangeMin))
                ) {
                    // Assume full brightness on TurnOn
                    const smartName = this.getSetState()!.smartName;
                    let byOn: string | number | undefined | null;
                    if (smartName && typeof smartName === 'object') {
                        byOn = smartName.byON;
                    }
                    // set byOn to the configured value or 100 otherwise
                    if (byOn === undefined || byOn === null || isNaN(byOn as number)) {
                        if (this.#valueOn === null || byOn !== 'stored') {
                            this.#valueOn = 100;
                        }
                        return this.#valueOn;
                    }

                    // byOn is in percent, so convert it to the configured range
                    this.#valueOn = parseFloat(byOn as string);
                    return this.#valueOn;
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
}
