import type { AlexaV3Category, IotExternalPatternControl } from '../types';
import MotionSensor from '../Alexa/Capabilities/MotionSensor';
import ReadOnlyDetector from './ReadOnlyDetector';
import type { Base as CapabilitiesBase } from '../Alexa/Capabilities/Base';

export default class Motion extends ReadOnlyDetector {
    constructor(detectedControl: IotExternalPatternControl) {
        super(detectedControl);
        this._supported = [this.capability];
    }

    get capability(): CapabilitiesBase {
        return new MotionSensor(this.detectedStateInitObject());
    }

    get categories(): AlexaV3Category[] {
        return ['MOTION_SENSOR'];
    }
}
