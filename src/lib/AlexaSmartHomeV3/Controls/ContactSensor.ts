import { ContactSensor as ContactSensorCapabilities } from '../Alexa/Capabilities/ContactSensor';
import type { Base as CapabilitiesBase } from '../Alexa/Capabilities/Base';
import ReadOnlyDetector from './ReadOnlyDetector';
import type { AlexaV3Category, IotExternalPatternControl } from '../types';

export default class ContactSensor extends ReadOnlyDetector {
    constructor(detectedControl: IotExternalPatternControl) {
        super(detectedControl);
        this._supported = [this.capability];
    }

    get capability(): CapabilitiesBase {
        return new ContactSensorCapabilities(this.detectedStateInitObject());
    }

    get categories(): AlexaV3Category[] {
        return ['CONTACT_SENSOR'];
    }
}
