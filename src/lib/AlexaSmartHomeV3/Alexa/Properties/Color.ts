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

    constructor(opts: ControlStateInitObject) {
        super(opts, true);
        if (!opts.hal) {
            throw new Error('Color control requires hal object with hue, saturation, and brightness properties');
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
}
