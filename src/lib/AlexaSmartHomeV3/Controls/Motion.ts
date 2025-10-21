import type { AlexaV3Category, AlexaV3DirectiveValue, IotExternalPatternControl } from '../types';
import MotionSensor from '../Alexa/Capabilities/MotionSensor';
import ReadOnlyDetector from './ReadOnlyDetector';
import type { Base as CapabilitiesBase } from '../Alexa/Capabilities/Base';
import EndpointHealth from '../Alexa/Capabilities/EndpointHealth';
import type { ControlStateInitObject } from '../Alexa/Properties/Base';

export default class Motion extends ReadOnlyDetector {
    constructor(detectedControl: IotExternalPatternControl) {
        super(detectedControl);
        this._supported = [this.capability];
        const illuminanceState = this.illuminanceStateInitObject();
        if (illuminanceState) {
            // this._supported.push(new IlluminanceSensor(illuminanceState));
        }

        this._supported.push(new EndpointHealth(this.connectivityInitObject(true)!));
    }

    protected illuminanceStateInitObject(): ControlStateInitObject {
        const map = this.statesMap;
        return {
            setState: this.states[map.second]!,
            getState: this.states[map.second]!,
            alexaSetter: function (_alexaValue: AlexaV3DirectiveValue): ioBroker.StateValue | undefined {
                // should be never called
                return 0;
            },
            alexaGetter: function (value: ioBroker.StateValue | undefined): AlexaV3DirectiveValue {
                return value as number;
            },
        };
    }

    get capability(): CapabilitiesBase {
        return new MotionSensor(this.detectedStateInitObject());
    }

    get categories(): AlexaV3Category[] {
        return ['MOTION_SENSOR'];
    }
}
