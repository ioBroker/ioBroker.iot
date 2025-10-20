import type { AlexaV3Category, IotExternalPatternControl } from '../types';
import MotionSensor from '../Alexa/Capabilities/MotionSensor';
import ReadOnlyDetector from './ReadOnlyDetector';
import type { Base as CapabilitiesBase } from '../Alexa/Capabilities/Base';
import EndpointHealth from '../Alexa/Capabilities/EndpointHealth';

export default class Motion extends ReadOnlyDetector {
    constructor(detectedControl: IotExternalPatternControl) {
        super(detectedControl);
        this._supported = [this.capability, new EndpointHealth(this.connectivityInitObject(true)!)];
    }

    get capability(): CapabilitiesBase {
        return new MotionSensor(this.detectedStateInitObject());
    }

    get categories(): AlexaV3Category[] {
        return ['MOTION_SENSOR'];
    }
}
