import AlexaResponse from '../Alexa/AlexaResponse';
import { firstLower, className, ensureValueInRange_0_100, denormalize_0_100, normalize_0_100 } from '../Helpers/Utils';
import Logger from '../Helpers/Logger';
import AdapterProvider from '../Helpers/AdapterProvider';
import type { ControlStateInitObject, Base as PropertiesBase } from '../Alexa/Properties/Base';
import PowerState from '../Alexa/Properties/PowerState';
import DetectionState from '../Alexa/Properties/DetectionState';
import type {
    AlexaV3Category,
    AlexaV3DirectiveValue,
    AlexaV3ReportedState,
    AlexaV3Request,
    IotExternalDetectorState,
    IotExternalPatternControl,
} from '../types';
import type { Base as CapabilitiesBase } from '../Alexa/Capabilities/Base';

/**
 * Represents the base functionality for a control in a smart device. A smart device has at least one control.
 * The specific functionality, natively supported capabilities, etc. are defined in derived classes.
 */
export default class Control {
    static stateKeys = [
        'SET',
        'ACTUAL',
        'ON_SET',
        'ON_ACTUAL',
        'POWER',
        'MODE',
        'HUE',
        'DIMMER',
        'BRIGHTNESS',
        'SATURATION',
        'TEMPERATURE',
        'ON',
        'MUTE',
    ];
    protected readonly log: Logger;
    private readonly _supported: CapabilitiesBase[];
    private readonly _enforced: CapabilitiesBase[];
    private readonly _states: Record<string, IotExternalDetectorState | undefined> = {};

    /**
     * @constructor
     * @param detectedControl - The detected control in terms of iobroker type detector.
     */
    constructor(detectedControl: IotExternalPatternControl) {
        this.initStates(detectedControl);
        this._supported = this.initCapabilities();
        this._enforced = this.initEnforcedCapabilities();
        this.log = new Logger(this);
        this.log.silly(`created instance`);
    }
    /**
     * This function maps a passed on control to an array of objects. Each object contains an Alexa capability the control natively supports
     * and at least one property. Every property is initialized with corresponding iobroker state ids and value converters from Alexa to iobroker types
     * and vice versa.
     *
     * @returns Array of objects with natively supported Alexa capabilities and correspondingly configured instances of StateProxies
     */
    initCapabilities(): CapabilitiesBase[] {
        return [];
    }
    /**
     * This function maps a passed on control to an array of objects. Each object contains an Alexa capability the control can handle even
     * though not natively supported (e.g., the light control can handle the Alexa BrightnessController directive by switching
     * itself `ON` on brightness > 0 and `OFF` on brightness == 0)
     * Every capability has at least one property with set up iobroker state ids and value converters from Alexa to iobroker types
     * and vice versa.
     *
     * @returns Array of objects with natively supported Alexa capabilities and correspondingly configured instances of StateProxies
     */
    initEnforcedCapabilities(): CapabilitiesBase[] {
        return [];
    }

    get allCapabilities(): CapabilitiesBase[] {
        return this.supported.concat(this.enforced);
    }

    static get type(): string {
        return firstLower(className(this.toString()));
    }
    /**
     * Getter for Alexa categories
     */
    get categories(): AlexaV3Category[] {
        return ['OTHER'];
    }

    get name(): string {
        return `${this.constructor.name}`;
    }
    /**
     * Getter for _supported
     */
    get supported(): CapabilitiesBase[] {
        return this._supported;
    }
    /**
     * Getter for _enforced
     */
    get enforced(): CapabilitiesBase[] {
        return this._enforced;
    }
    /**
     * This function returns whether the control natively supports the passed on Alexa directive.
     *
     * @param event The event containing the Alexa directive as it comes from AWS Alexa Service
     * @returns True if the control natively supports the directive, false - otherwise
     */
    supports(event: AlexaV3Request): boolean {
        return this.supported.find(capability => capability.matches(event)) !== undefined;
    }
    /**
     * This function returns whether the control though doesn't natively support the passed on Alexa directive, but able to handle it.
     *
     * @param event The event containing the Alexa directive as it comes from AWS Alexa Service
     * @returns True if the control can handle the directive, false - otherwise
     */
    canHandle(event: AlexaV3Request): boolean {
        return this.enforced.find(capability => capability.matches(event)) !== undefined;
    }
    /**
     * This function processes an Alexa directive. Usually the result of the processing is setting an iobroker state to some value
     * as a reaction to an interaction with Alexa via voice, app, etc.
     *
     * @param event The event containing the Alexa directive as it comes from AWS Alexa Service
     * @returns Object containing the response to be sent to Alexa Service
     */
    async handle(event: AlexaV3Request): Promise<AlexaResponse> {
        this.log.debug(`handling Alexa event`);
        this.log.silly(`${JSON.stringify(event)}`);

        const property = this.allCapabilities
            .flatMap(item => item.properties)
            .find(property => property.matches(event));

        if (property) {
            let alexaValue: AlexaV3DirectiveValue;
            try {
                const setter = this.valueSetter(event);
                alexaValue = await setter(event, property);
            } catch (error) {
                this.log.debug(`${error}`);
                this.log.error(`failed handling Alexa event`);

                // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
                return Promise.reject(AlexaResponse.endpointUnreachable(event.directive.header.messageId).get());
            }

            // even though the handler successfully processed the Alexa event,
            // we return an error here for ENFORCED capabilities, to prevent
            // reporting multiple successes for the same capability and
            // running into a situation of returning a wrong value back to Alexa
            if (this.enforced.find(capability => capability.matches(event))) {
                // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
                return Promise.reject(
                    AlexaResponse.directiveNotSupportedByControl(
                        this.name,
                        event?.directive?.header?.namespace,
                        event?.directive?.header?.messageId,
                        event?.directive?.header?.payloadVersion,
                    ).get(),
                );
            }

            const response = AlexaResponse.handled(
                event,
                property.propertyName,
                property.reportValue(alexaValue),
                property.instance,
            );

            // though the processed directive required to change a single value, the response must contain values of all "relevant" properties
            // Please refer to this for details: https://developer.amazon.com/en-US/docs/alexa/device-apis/alexa-thermostatcontroller.html#settargettemperature-response-event

            // TODO: add values of relevant properties to response

            this.log.silly(`${JSON.stringify(response.get())}`);
            return response.get();
        }

        const errorResponse = AlexaResponse.directiveNotSupportedByControl(
            this.name,
            event?.directive?.header?.namespace,
            event?.directive?.header?.messageId,
            event?.directive?.header?.payloadVersion,
        );
        this.log.silly(`${JSON.stringify(errorResponse.get())}`);
        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
        return Promise.reject(errorResponse.get());
    }

    valueSetter(
        _event: AlexaV3Request,
    ): (event: AlexaV3Request, property: PropertiesBase) => Promise<AlexaV3DirectiveValue> {
        return this.setValue.bind(this);
    }

    async setValue(event: AlexaV3Request, property: PropertiesBase): Promise<AlexaV3DirectiveValue> {
        // extract alexa value from event
        const alexaValue = property.alexaDirectiveValue(event);

        // convert alexa value to iobroker value
        let value = property.value(alexaValue);

        // if set, the device could support toggle
        if (event.currentState) {
            // console.error(`----------------------------------- command: ${value}, current value: ${JSON.stringify(event.currentState)}`);
            const state = event.currentState.find(item => item.name === property.propertyName);
            if (state && value === true) {
                // it could support toggle.
                // get current value
                const current = property.value(state.value);
                if (current === true) {
                    // turn off
                    value = false;
                } else if (current !== false) {
                    const currentValue = await this.getOrRetrieveCurrentValue(property);
                    if (currentValue === true) {
                        // turn off
                        value = false;
                    }
                }
            }
        }

        // set iobroker state
        await this.setState(property, value!);

        property.currentValue = value;
        // return value as expected by Alexa
        return property.alexaValue(value);
    }

    async adjustValue(event: AlexaV3Request, property: PropertiesBase): Promise<AlexaV3DirectiveValue> {
        // extract Alexa delta value from event
        const delta = property.alexaDirectiveValue(event);
        // get current value
        const currentValue = await this.getOrRetrieveCurrentValue(property);
        // convert the current value to Alexa value
        const valueToAdjust = property.alexaValue(currentValue);
        // adjust Alexa value
        const adjustedValue = ensureValueInRange_0_100(
            parseFloat((valueToAdjust as string) || '0') + parseFloat((delta as string) || '0'),
        );
        // convert adjusted value to iobroker value
        const value = property.value(adjustedValue);

        // set iobroker state
        await this.setState(property, value as ioBroker.StateValue);

        return adjustedValue;
    }

    async getOrRetrieveCurrentValue(property: PropertiesBase): Promise<ioBroker.StateValue> {
        if (property.currentValue === undefined) {
            property.currentValue = await AdapterProvider.getState(property.getId);
        }

        if (property.currentValue === undefined) {
            throw new Error(`unable to retrieve ${property.getId}`);
        }

        return property.currentValue;
    }

    async reportState(): Promise<AlexaV3ReportedState[]> {
        this.log.debug(`reporting state`);

        const propertiesToReport: AlexaV3ReportedState[] = [];

        for (const capability of this.supported) {
            for (const property of capability.properties) {
                try {
                    await this.getOrRetrieveCurrentValue(property);

                    const toReport: AlexaV3ReportedState = {
                        namespace: capability.namespace,
                        instance: property.instance,
                        name: property.propertyName,
                        value: property.reportValue(property.alexaValue(property.currentValue)),
                    };

                    if (!toReport.instance) {
                        delete toReport.instance;
                    }

                    propertiesToReport.push(toReport);
                } catch (error) {
                    this.log.error(`failed reporting state for property ${property.propertyName} of ${this.name}`);
                    this.log.debug(`${error}`);
                }
            }
        }

        this.log.debug(`${JSON.stringify(propertiesToReport)}`);
        return propertiesToReport;
    }

    toString(): string {
        return `${this.constructor.name}`;
    }

    initStates(ctrl: IotExternalPatternControl): void {
        for (const stateKey of Control.stateKeys) {
            this._states[stateKey] = ctrl.states.find(s => s.name === stateKey);
        }
    }

    get states(): Record<string, IotExternalDetectorState | undefined> {
        return this._states;
    }

    get statesMap(): Record<string, string> {
        const map: Record<string, string> = {};
        for (const stateKey of Control.stateKeys) {
            map[stateKey.toLowerCase()] = stateKey;
        }
        return map;
    }

    async setState(property: PropertiesBase, value: ioBroker.StateValue): Promise<void> {
        await AdapterProvider.setState(property.setId, value);
        property.currentValue = value;
    }

    //-------------------------------------------------------
    // standard property init objects
    //

    blankInitObject(): ControlStateInitObject {
        // const states = this.initStates(ctrl);
        const map = this.statesMap;
        return {
            setState: this.states[map.actual]!,
            getState: this.states[map.actual]!,
        };
    }

    powerStateInitObject(): ControlStateInitObject {
        // const states = this.initStates(ctrl);
        const map = this.statesMap;

        return {
            setState: this.states[map.set]!,
            getState: this.states[map.actual]!,
            alexaSetter: function (alexaValue) {
                return alexaValue === PowerState.ON;
            },
            alexaGetter: function (value) {
                return value ? PowerState.ON : PowerState.OFF;
            },
        };
    }

    detectedStateInitObject(): ControlStateInitObject {
        const map = this.statesMap;
        return {
            setState: this.states[map.actual]!,
            getState: this.states[map.actual]!,
            alexaSetter: function (_alexaValue: AlexaV3DirectiveValue): ioBroker.StateValue | undefined {
                // should be never called
                return 0;
            },
            alexaGetter: function (value: ioBroker.StateValue | undefined): AlexaV3DirectiveValue {
                return value ? DetectionState.DETECTED : DetectionState.NOT_DETECTED;
            },
        };
    }

    percentageInitObject(): ControlStateInitObject {
        const map = this.statesMap;
        // const range = configuredRangeOrDefault(this.states[map.set]);
        return {
            setState: this.states[map.set]!,
            getState: this.states[map.actual]!,
            alexaSetter: function (this: PropertiesBase, alexaValue: AlexaV3DirectiveValue): ioBroker.StateValue {
                return (
                    denormalize_0_100(
                        alexaValue as number,
                        this.valuesRangeMin as number,
                        this.valuesRangeMax as number,
                    ) || 0
                );
            },
            alexaGetter: function (
                this: PropertiesBase,
                value: ioBroker.StateValue | undefined,
            ): AlexaV3DirectiveValue {
                return normalize_0_100(value as number, this.valuesRangeMin as number, this.valuesRangeMax as number);
            },
        };
    }
}
