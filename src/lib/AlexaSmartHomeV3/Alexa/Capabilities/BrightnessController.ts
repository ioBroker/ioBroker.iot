import Base from './Base';
import Brightness from '../Properties/Brightness';
import type { ControlStateInitObject } from '../Properties/Base';

export default class BrightnessController extends Base {
    readonly #brightness: Brightness;

    constructor(opts: ControlStateInitObject) {
        super();
        this.#brightness = new Brightness(opts);
        this._properties = [this.#brightness];
    }

    get brightness(): Brightness {
        return this.#brightness;
    }
}
