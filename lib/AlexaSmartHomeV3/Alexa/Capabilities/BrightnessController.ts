import Base from './Base';
import type { Base as PropertiesBase } from '../Properties/Base';
import Brightness from '../Properties/Brightness';

export default class BrightnessController extends Base {
    private _brightness: Brightness | undefined;

    initProperties(): PropertiesBase[] {
        this._brightness = new Brightness();
        return [this._brightness];
    }

    get brightness(): PropertiesBase {
        return this._brightness!;
    }
}
