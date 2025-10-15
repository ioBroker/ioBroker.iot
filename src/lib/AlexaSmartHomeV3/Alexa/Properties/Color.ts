import Base, { type ControlStateInitObject } from './Base';
import type { AlexaV3DirectiveValue, AlexaV3Request } from '../../types';
import { rgbw2hal, rgb2hal, rgbwToHex, hal2rgbw, hal2rgb } from '../../Helpers/Utils';

export default class Color extends Base {
    private _hal: {
        hue: string;
        saturation?: string;
        brightness?: string;
    } = {
        hue: '',
        saturation: '',
        brightness: '',
    };

    constructor(opts: ControlStateInitObject) {
        super(opts, true);
        if (!opts?.hal) {
            throw new Error('Hue control requires hal object with hue, saturation, and brightness properties');
        }
        this.hal = opts.hal;
        this._setId = opts.hal.hue;
        this._getId = opts.hal.hue;
    }

    matches(event: AlexaV3Request): boolean {
        return Color.matches(event) && event?.directive?.header?.name === 'SetColor';
    }

    set hal(value: { hue: string; saturation?: string; brightness?: string }) {
        this._hal = value;
    }

    get hal(): {
        hue: string;
        saturation?: string;
        brightness?: string;
    } {
        return this._hal;
    }

    alexaValue(value: ioBroker.StateValue | undefined): AlexaV3DirectiveValue {
        if (typeof value === 'string') {
            // It could be hex color #RRGGBB or #RRGGBBAA or rgb(r,g,b) or rgba(r,g,b,a)
            if (value.startsWith('#')) {
                // If #rrggbbaa
                if (value.length === 9) {
                    return rgbw2hal(value);
                }
                return rgb2hal(value);
            }
            if (value.startsWith('rgba')) {
                return rgbw2hal(rgbwToHex(value));
            }
            if (value.startsWith('rgb')) {
                return rgb2hal(rgbwToHex(value));
            }
        }
        return undefined;
    }

    value(alexaValue: AlexaV3DirectiveValue): ioBroker.StateValue | undefined {
        if (typeof alexaValue === 'object' && alexaValue !== null) {
            if ('hue' in alexaValue && 'saturation' in alexaValue) {
                return hal2rgb(alexaValue as { hue: number; saturation: number; brightness: number });
            }
        }
        return undefined;
    }
}
