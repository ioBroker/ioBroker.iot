import type { AlexaV3Category } from '../types';
import MotionSensor from '../Alexa/Capabilities/MotionSensor';
import ReadOnlyDetector from './ReadOnlyDetector';
import type { Base as CapabilitiesBase } from '../Alexa/Capabilities/Base';

export default class Motion extends ReadOnlyDetector {
    get capability(): CapabilitiesBase | undefined {
        return new MotionSensor();
    }

    get categories(): AlexaV3Category[] {
        return ['MOTION_SENSOR'];
    }
}
