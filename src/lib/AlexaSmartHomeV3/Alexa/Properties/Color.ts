import Base, { type ControlStateInitObject } from './Base';
import type { AlexaV3DirectiveValue, AlexaV3Request, IotExternalDetectorState } from '../../types';
import { rgb2hal, rgbw2hal, rgbwToHex, hal2rgb } from '../../Helpers/Utils';

interface DedicatedRGB {
    red: IotExternalDetectorState;
    green: IotExternalDetectorState;
    blue: IotExternalDetectorState;
    white?: IotExternalDetectorState;
}

interface DedicatedRGBW extends DedicatedRGB {
    white: IotExternalDetectorState;
}

export default class Color extends Base {
    private readonly _hal:
        | {
              hue: IotExternalDetectorState;
              saturation?: IotExternalDetectorState;
              brightness?: IotExternalDetectorState;
          }
        | undefined = undefined;
    private readonly _rgbw: IotExternalDetectorState | DedicatedRGBW | undefined = undefined;
    private readonly _rgb: IotExternalDetectorState | DedicatedRGB | undefined = undefined;

    constructor(opts: ControlStateInitObject) {
        super(opts, true);
        if (!opts?.hal && !opts?.rgbw && !opts?.rgb) {
            throw new Error('Hue control requires hal object with hue, saturation, and brightness properties');
        }
        if (opts?.hal) {
            this._hal = opts.hal;
            this._setId = opts.hal.hue.id;
            this._getId = opts.hal.hue.id;
        } else if (opts?.rgbw) {
            this._rgbw = opts.rgbw;
            const rgbObject = this._rgbw as DedicatedRGBW;
            if (!rgbObject.red) {
                this._setId = (this._rgbw as IotExternalDetectorState).id;
                this._getId = (this._rgbw as IotExternalDetectorState).id;
            }
        } else if (opts?.rgb) {
            this._rgb = opts.rgb;
            const rgbObject = this._rgb as DedicatedRGBW;
            if (!rgbObject.red) {
                this._setId = (this._rgb as IotExternalDetectorState).id;
                this._getId = (this._rgb as IotExternalDetectorState).id;
            }
        }
    }

    matches(event: AlexaV3Request): boolean {
        return Color.matches(event) && event?.directive?.header?.name === 'SetColor';
    }

    /** Return IDs for HAL */
    get hal():
        | {
              hue: string;
              saturation?: string;
              brightness?: string;
          }
        | undefined {
        if (!this._hal?.hue) {
            return undefined;
        }
        return {
            hue: this._hal.hue.id,
            saturation: this._hal.saturation?.id,
            brightness: this._hal.brightness?.id,
        };
    }

    alexaValue(value: ioBroker.StateValue | undefined):
        | {
              hue: number;
              saturation: number;
              brightness: number;
          }
        | undefined {
        if (typeof value === 'string') {
            // It could be hex color #RRGGBB or #RRGGBBAA or rgb(r,g,b) or rgba(r,g,b,a)
            if (value.startsWith('#')) {
                // If #rrggbbaa
                // if (value.length === 9) {
                //     return rgbw2hal(value);
                // }
                return rgb2hal(rgbwToHex(value).substring(0, 7));
            }
            if (value.startsWith('rgba')) {
                return rgbw2hal(rgbwToHex(value));
            }
            if (value.startsWith('rgb')) {
                return rgb2hal(rgbwToHex(value));
            }
        } else if (value && typeof value === 'object' && (value as any).hue !== undefined) {
            return value as unknown as { hue: number; saturation: number; brightness: number };
        }
        return undefined;
    }

    value(alexaValue: AlexaV3DirectiveValue): ioBroker.StateValue | undefined {
        if (typeof alexaValue === 'object' && alexaValue !== null) {
            const hslValue = alexaValue as { hue: number; saturation: number; brightness: number };
            if ('hue' in hslValue && 'saturation' in hslValue) {
                if (this._rgbw) {
                    return `${hal2rgb(hslValue)}ff`;
                }
                return hal2rgb(hslValue);
            }
        }
        return undefined;
    }
}
