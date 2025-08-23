import Properties from '../Properties';
import Base from './Base';
import type { Base as PropertiesBase } from '../Properties/Base';

export default class LockController extends Base {
    initProperties(): PropertiesBase[] {
        return [new Properties.LockState()];
    }
}
