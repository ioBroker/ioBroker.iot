import Base from './Base';
import type { Base as PropertiesBase } from '../Properties/Base';
import ColorTemperatureInKelvin from '../Properties/ColorTemperatureInKelvin';

export default class ColorTemperatureController extends Base {
    private _colorTemperatureInKelvin: ColorTemperatureInKelvin | undefined;

    initProperties(): PropertiesBase[] {
        this._colorTemperatureInKelvin = new ColorTemperatureInKelvin();
        return [this._colorTemperatureInKelvin];
    }

    get colorTemperatureInKelvin(): PropertiesBase {
        return this._colorTemperatureInKelvin!;
    }
}
