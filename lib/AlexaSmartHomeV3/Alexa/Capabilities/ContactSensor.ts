import Base from './Base';
import Properties from '../Properties';
import type { Base as PropertiesBase } from '../Properties/Base';

export class ContactSensor extends Base {
    initProperties(): PropertiesBase[] {
        return [new Properties.DetectionState()];
    }
}

export default ContactSensor;
