import Base, { type ControlStateInitObject } from './Base';
import type { AlexaV3Request } from '../../types';

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

    init(opts: ControlStateInitObject): void {
        if (!opts.hal) {
            throw new Error('Color control requires hal object with hue, saturation, and brightness properties');
        }
        this.hal = opts.hal;
        this._setId = opts.hal.hue;
        this._getId = opts.hal.hue;

        if (opts.alexaSetter) {
            this._alexaSetter = opts.alexaSetter;
        }
        if (opts.alexaGetter) {
            this._alexaGetter = opts.alexaGetter;
        }
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
}
