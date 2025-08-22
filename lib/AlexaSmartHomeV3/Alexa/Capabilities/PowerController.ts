import PowerState from '../Properties/PowerState';
import Base from './Base';
import type { Base as PropertiesBase } from '../Properties/Base';

export default class PowerController extends Base {
    private _powerState: PowerState | undefined;

    initProperties(): PropertiesBase[] {
        this._powerState = new PowerState();
        return [this._powerState];
    }

    get powerState(): PropertiesBase {
        return this._powerState!;
    }
}
