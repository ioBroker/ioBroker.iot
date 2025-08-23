import { ContactSensor as ContactSensorCapabilities } from '../Alexa/Capabilities/ContactSensor';
import type { Base as CapabilitiesBase } from '../Alexa/Capabilities/Base';
import ReadOnlyDetector from './ReadOnlyDetector';
import type { AlexaV3Category } from '../types';

export default class ContactSensor extends ReadOnlyDetector {
    get capability(): CapabilitiesBase | undefined {
        return new ContactSensorCapabilities();
    }

    get categories(): AlexaV3Category[] {
        return ['CONTACT_SENSOR'];
    }
}
