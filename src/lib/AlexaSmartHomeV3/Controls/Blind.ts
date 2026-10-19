import RangeController from '../Alexa/Capabilities/RangeController';
import EndpointHealth from '../Alexa/Capabilities/EndpointHealth';
import RangeValue from '../Alexa/Properties/RangeValue';
import AdjustableControl from './AdjustableControl';
import type { Base as PropertiesBase } from '../Alexa/Properties/Base';
import type {
    AlexaV3ActionMapping,
    AlexaV3Category,
    AlexaV3DirectiveValue,
    AlexaV3Namespace,
    AlexaV3Request,
    IotExternalPatternControl,
} from '../types';

const INSTANCE = 'Blind.Lift';
// Alexa values in percent; level.blind: min = fully closed, max = fully open
const CLOSED = 0;
const OPEN = 100;

function setRangeValue(actions: string[], rangeValue: number): AlexaV3ActionMapping {
    return { '@type': 'ActionsToDirective', actions, directive: { name: 'SetRangeValue', payload: { rangeValue } } };
}

/**
 * Amazon's model for blinds: Alexa.RangeController with the instance "Blind.Lift" and semantics.
 * With it Alexa understands "open/close the blind" and knows that 0 % means closed and 100 % means open.
 *
 * @see https://developer.amazon.com/en-US/docs/alexa/device-apis/alexa-rangecontroller.html#discover-blinds
 */
class BlindLiftController extends RangeController {
    // the base class derives the namespace from the class name
    get namespace(): AlexaV3Namespace {
        return 'Alexa.RangeController';
    }

    get alexaResponse(): RangeController['alexaResponse'] {
        return {
            interface: this.namespace,
            instance: this.instance,
            version: this.version,
            properties: this.discoverableProperties,
            capabilityResources: {
                friendlyNames: [{ '@type': 'asset', value: { assetId: 'Alexa.Setting.Opening' } }],
            },
            configuration: {
                supportedRange: { minimumValue: CLOSED, maximumValue: OPEN, precision: 1 },
                unitOfMeasure: 'Alexa.Unit.Percent',
            },
            // no stateMappings: they only serve state queries, and Discovery sends retrievable = false
            semantics: {
                actionMappings: [
                    setRangeValue(['Alexa.Actions.Close', 'Alexa.Actions.Lower'], CLOSED),
                    setRangeValue(['Alexa.Actions.Open', 'Alexa.Actions.Raise'], OPEN),
                ],
            },
        };
    }
}

export default class Blind extends AdjustableControl {
    constructor(detectedControl: IotExternalPatternControl) {
        super(detectedControl);
        this._supported = [new BlindLiftController({ ...this.percentageInitObject(), instance: INSTANCE })];
        const health = this.connectivityInitObject();
        if (health) {
            this._supported.push(new EndpointHealth(health));
        }
    }

    get categories(): AlexaV3Category[] {
        return ['INTERIOR_BLIND'];
    }

    adjustableProperties(): (typeof PropertiesBase)[] {
        return [RangeValue];
    }

    /**
     * "Alexa, blind down/up" without an amount arrives as AdjustRangeValue with rangeValueDeltaDefault = true
     * and rangeValueDelta = -1/+1. For a blind this means fully closed/open.
     * An explicit amount ("lower the blind by 10 percent") stays relative.
     */
    async adjustValue(event: AlexaV3Request, property: PropertiesBase): Promise<AlexaV3DirectiveValue> {
        const { rangeValueDelta, rangeValueDeltaDefault } = event.directive.payload;
        if (rangeValueDeltaDefault && rangeValueDelta) {
            const target = rangeValueDelta < 0 ? CLOSED : OPEN;
            await this.setState(property, property.value(target) as ioBroker.StateValue);
            return target;
        }
        return super.adjustValue(event, property);
    }
}
