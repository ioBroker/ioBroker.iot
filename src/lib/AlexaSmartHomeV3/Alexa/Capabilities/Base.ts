import { className } from '../../Helpers/Utils';
import type {
    AlexaV3Capability,
    AlexaV3DirectiveValue,
    AlexaV3EndpointID,
    AlexaV3Namespace,
    AlexaV3Request,
} from '../../types';
import type { Base as PropertiesBase } from '../Properties/Base';

export abstract class Base {
    protected _properties: PropertiesBase[];

    protected constructor() {
        this._properties = [];
    }

    get name(): string {
        return `${this.constructor.name}`;
    }

    get namespace(): AlexaV3Namespace {
        return `Alexa.${this.constructor.name}` as AlexaV3Namespace;
    }

    reportValue(value: number | boolean): any {
        return value;
    }

    /**
     * Checks whether the capability instance matches, i.e. can handle the event Alexa sends to the skill
     *
     * @param event Contains the Alexa event.
     */
    matches(event: AlexaV3Request): boolean {
        return (
            event?.directive?.header?.namespace === this.namespace &&
            event?.directive?.header?.payloadVersion === this.version
        );
    }

    static get namespace(): AlexaV3Namespace {
        return `Alexa.${className(this.toString())}` as AlexaV3Namespace;
    }

    /**
     * Checks whether the capability object matches, i.e., can handle the event Alexa sends to the skill
     *
     * @param event Contains the Alexa event.
     */
    static matches(event: AlexaV3Request): boolean {
        return event?.directive?.header?.namespace === this.namespace;
    }

    get properties(): PropertiesBase[] {
        return this._properties;
    }

    /**
     *
     * @param event Contains the Alexa event.
     * @returns Property to handle on Alexa directive
     */
    property(event: AlexaV3Request): PropertiesBase | undefined {
        return this.properties.find(p => p.matches(event));
    }

    /**
     * Returns object containing all the properties of the smart device capability as it expected by Alexa during discovery
     */
    get discoverableProperties(): {
        supported: { name: string }[];
        proactivelyReported: boolean;
        retrievable: boolean;
    } {
        return {
            supported: this.properties.map(p => {
                return { name: p.propertyName };
            }),
            proactivelyReported: this.proactivelyReported,
            retrievable: this.retrievable,
        };
    }

    /**
     * Returns whether the smart device proactively reports state changes
     */
    get proactivelyReported(): boolean {
        return true;
    }

    /**
     * Returns whether the smart device handles Alexa ReportState directives
     */
    get retrievable(): boolean {
        return true;
    }

    get version(): string {
        return '3';
    }

    /**
     * Returns response to Alexa Discovery directive
     */
    get alexaResponse(): AlexaV3Capability {
        return {
            interface: this.namespace,
            version: this.version,
            properties: this.discoverableProperties,
        };
    }

    propertyName(event: AlexaV3Request): string | undefined {
        return this.property(event)?.propertyName;
    }

    /**
     * Extracts value to be set on the smart device sent in an Alexa directive
     */
    alexaValue(_event: AlexaV3Request): AlexaV3DirectiveValue {
        throw new Error(`Method alexaValue is not implemented in ${this.name} capability`);
    }

    /**
     * Extracts endpoint id sent in an Alexa directive
     */
    static endpointId(event: AlexaV3Request): AlexaV3EndpointID | undefined {
        return event.directive.endpoint?.endpointId;
    }
}

export default Base;
