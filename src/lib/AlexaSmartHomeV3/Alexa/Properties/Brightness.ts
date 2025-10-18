import AdjustableProperty from './AdjustableProperty';
import type { AlexaV3DirectiveValue, AlexaV3Request } from '../../types';

export default class Brightness extends AdjustableProperty {
    #valueOn: number | null = null;

    matches(event: AlexaV3Request): boolean {
        if (Brightness.matches(event)) {
            return true;
        }
        return this._multiPurposeProperty && event?.directive?.header?.namespace === 'Alexa.PowerController';
    }

    alexaDirectiveValue(event: AlexaV3Request): AlexaV3DirectiveValue {
        if (event?.directive?.header?.namespace === 'Alexa.PowerController') {
            if (event?.directive?.header.name === 'TurnOn') {
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
            } else if (event?.directive?.header.name === 'TurnOff') {
                // If we have a dedicated power state, we do not change brightness on TurnOff ??
                // Assume zero brightness on TurnOff
                return 0;
            }
        }

        if (Brightness.directive(event) === Brightness.SET) {
            const value = super.alexaDirectiveValue(event);
            // remember last brightness > 0
            if ((value as number) >= this._offValue) {
                this.#valueOn = value as number;
            }
            return value;
        }

        return Brightness.directive(event) === Brightness.SET
            ? super.alexaDirectiveValue(event)
            : event.directive.payload.brightnessDelta;
    }
}
