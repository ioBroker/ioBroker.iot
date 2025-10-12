import Base from './Base';
import ColorTemperatureInKelvin from '../Properties/ColorTemperatureInKelvin';
import type { ControlStateInitObject } from '../Properties/Base';

export default class ColorTemperatureController extends Base {
    private readonly _colorTemperatureInKelvin: ColorTemperatureInKelvin;

    constructor(opts: ControlStateInitObject) {
        super();
        this._colorTemperatureInKelvin = new ColorTemperatureInKelvin(opts);
        this._properties = [this._colorTemperatureInKelvin];
    }

    get colorTemperatureInKelvin(): ColorTemperatureInKelvin {
        return this._colorTemperatureInKelvin;
    }
}
