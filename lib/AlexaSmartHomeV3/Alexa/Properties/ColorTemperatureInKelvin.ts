import AdjustableProperty from './AdjustableProperty';
import type { AlexaV3DirectiveName, AlexaV3DirectiveType, AlexaV3DirectiveValue, AlexaV3Request } from '../../types';

export default class ColorTemperatureInKelvin extends AdjustableProperty {
    static _colorTemperatureTable = [2200, 2700, 4000, 5500, 7000];

    static matches(event: AlexaV3Request): boolean {
        return event?.directive?.header?.namespace === 'Alexa.ColorTemperatureController';
    }

    static directive(event: AlexaV3Request): AlexaV3DirectiveName {
        return [
            ColorTemperatureInKelvin.INCREASE_COLOR_TEMPERATURE,
            ColorTemperatureInKelvin.DECREASE_COLOR_TEMPERATURE,
        ].includes(event?.directive?.header?.name)
            ? AdjustableProperty.ADJUST
            : AdjustableProperty.SET;
    }

    matches(event: AlexaV3Request): boolean {
        return (
            ColorTemperatureInKelvin.matches(event) &&
            [
                ColorTemperatureInKelvin.SET_COLOR_TEMPERATURE,
                ColorTemperatureInKelvin.INCREASE_COLOR_TEMPERATURE,
                ColorTemperatureInKelvin.DECREASE_COLOR_TEMPERATURE,
            ].includes(event?.directive?.header?.name)
        );
    }

    get colorTemperatureTable(): number[] {
        return ColorTemperatureInKelvin._colorTemperatureTable;
    }

    alexaDirectiveValue(event: AlexaV3Request): AlexaV3DirectiveValue {
        if (ColorTemperatureInKelvin.SET_COLOR_TEMPERATURE === event?.directive?.header?.name) {
            return super.alexaDirectiveValue(event);
        }

        if (ColorTemperatureInKelvin.INCREASE_COLOR_TEMPERATURE === event?.directive?.header?.name) {
            return 1;
        }

        if (ColorTemperatureInKelvin.DECREASE_COLOR_TEMPERATURE === event?.directive?.header?.name) {
            return -1;
        }
    }

    static get SET_COLOR_TEMPERATURE(): AlexaV3DirectiveType {
        return 'SetColorTemperature';
    }

    static get INCREASE_COLOR_TEMPERATURE(): AlexaV3DirectiveType {
        return 'IncreaseColorTemperature';
    }

    static get DECREASE_COLOR_TEMPERATURE(): AlexaV3DirectiveType {
        return 'DecreaseColorTemperature';
    }
}
