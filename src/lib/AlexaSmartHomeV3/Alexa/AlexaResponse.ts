import { v4 as uuidv4 } from 'uuid';
import * as Utils from '../Helpers/Utils';
import type {
    AlexaV3Capability,
    AlexaV3ContextProperty,
    AlexaV3Directive,
    AlexaV3DirectiveType,
    AlexaV3DiscoverAppliance,
    AlexaV3EndpointID,
    AlexaV3Namespace,
    AlexaV3Payload,
    AlexaV3ReportedState,
    AlexaV3Request,
} from '../types';

/**
 * Helper class to generate an AlexaResponse.
 */
export default class AlexaResponse {
    public context?: {
        properties: AlexaV3ReportedState[];
    };

    public iobVersion = '1';

    public readonly event?: AlexaV3Directive;

    static ErrorResponseName: AlexaV3DirectiveType = 'ErrorResponse';

    static isErrorResponse(response: AlexaResponse): boolean {
        return response?.event?.header?.name === AlexaResponse.ErrorResponseName;
    }

    static errorResponse(messageId: string, payload: any): AlexaResponse {
        return new AlexaResponse({
            name: AlexaResponse.ErrorResponseName,
            payload,
            messageId,
        });
    }

    static endpointUnreachable(messageId: string): AlexaResponse {
        return AlexaResponse.errorResponse(messageId, {
            type: 'ENDPOINT_UNREACHABLE',
            message: 'Unable to reach endpoint.',
        });
    }

    static throttlingException(messageId: string): AlexaResponse {
        return AlexaResponse.errorResponse(messageId, {
            type: 'THROTTLING_EXCEPTION',
            message: 'Unable to reach endpoint.',
        });
    }

    static directiveNotSupportedByControl(
        controlName: string,
        namespace: AlexaV3Namespace,
        messageId: string,
        payloadVersion: string,
    ): AlexaResponse {
        return AlexaResponse.errorResponse(messageId, {
            type: 'INTERNAL_ERROR',
            message: `Control ${controlName} doesn't support the ${namespace} with payloadVersion ${payloadVersion}`,
        });
    }

    static directiveNotSupportedByDevice(
        deviceName: string,
        namespace: AlexaV3Namespace,
        messageId: string,
        payloadVersion: string,
    ): AlexaResponse {
        return AlexaResponse.errorResponse(messageId, {
            type: 'INTERNAL_ERROR',
            message: `Device ${deviceName} doesn't support the ${namespace} with payloadVersion ${payloadVersion}`,
        });
    }

    static nonExistingEndpoint(messageId: string, endpointId: AlexaV3EndpointID | undefined): AlexaResponse {
        return AlexaResponse.errorResponse(messageId, {
            type: 'INTERNAL_ERROR',
            message: `No endpoint with id ${endpointId} found`,
        });
    }

    /**
     * Composes Alexa respond on a successfully processed Alexa directive to change the capability's value of a device
     */
    static handled(event: AlexaV3Request, propertyName: string, value: any, propertyInstance?: string): AlexaResponse {
        const response = new AlexaResponse({
            correlationToken: event?.directive?.header?.correlationToken,
            token: event?.directive?.endpoint?.scope?.token,
            endpointId: event?.directive?.endpoint?.endpointId,
            messageId: event?.directive?.header?.messageId,
        });

        response.addContextProperty({
            namespace: event?.directive?.header?.namespace,
            name: propertyName,
            instance: propertyInstance,
            value,
        });

        return response;
    }

    /**
     * Constructor for an Alexa Response.
     *
     * @param opts Contains initialization options for the response
     */
    constructor(opts?: {
        context?: {
            properties: AlexaV3ReportedState[];
        };
        namespace?: AlexaV3Namespace;
        name?: AlexaV3DirectiveType;
        messageId?: string;
        correlationToken?: string;
        payloadVersion?: '3';
        token?: string;
        endpointId?: string;
        payload?: AlexaV3Payload;
        changeCauseType?: 'APP_INTERACTION' | 'PHYSICAL_INTERACTION' | 'VOICE_INTERACTION';
        event?: AlexaV3Directive;
    }) {
        opts ||= {};

        if (opts.context !== undefined) {
            this.context = Utils.defaultIfNullOrEmpty(opts.context, undefined);
        }

        if (opts.event !== undefined) {
            this.event = Utils.defaultIfNullOrEmpty(opts.event, undefined);
        } else {
            this.event = {
                header: {
                    namespace: Utils.defaultIfNullOrEmpty<AlexaV3Namespace>(opts.namespace, 'Alexa'),
                    name: Utils.defaultIfNullOrEmpty<AlexaV3DirectiveType>(opts.name, 'Response'),
                    messageId: Utils.defaultIfNullOrEmpty(opts.messageId, uuidv4()),
                    correlationToken: Utils.defaultIfNullOrEmpty(opts.correlationToken, undefined),
                    payloadVersion: Utils.defaultIfNullOrEmpty<'3'>(opts.payloadVersion, '3'),
                },
                endpoint: {
                    scope: {
                        type: 'BearerToken',
                        token: Utils.defaultIfNullOrEmpty(opts.token, 'INVALID'),
                    },
                    endpointId: Utils.defaultIfNullOrEmpty(opts.endpointId, 'INVALID'),
                },
                payload: Utils.defaultIfNullOrEmpty(opts.payload, {}),
            };

            if (opts.changeCauseType) {
                this.event.payload.change = {
                    cause: {
                        type: opts.changeCauseType,
                    },
                    properties: [],
                };
            }
        }

        if (!this.event) {
            throw new Error('Event is not defined');
        }

        // No endpoint in an AcceptGrant or Discover request
        if (this.event.header.name === 'AcceptGrant.Response' || this.event.header.name === 'Discover.Response') {
            delete this.event.endpoint;
        }
    }

    addContext(): void {
        this.context ||= { properties: [] };
    }

    /**
     * Add a property to the context.
     *
     * @param opts Contains options for the property.
     */
    addContextProperty(opts: {
        namespace?: AlexaV3Namespace;
        instance?: string;
        name?: string;
        value?: any;
        timeOfSample?: string;
        uncertaintyInMilliseconds?: number;
    }): void {
        this.addContext();

        const property = {
            namespace: Utils.defaultIfNullOrEmpty(opts.namespace, 'Alexa.EndpointHealth'),
            instance: Utils.defaultIfNullOrEmpty(opts.instance, undefined),
            name: Utils.defaultIfNullOrEmpty(opts.name, 'connectivity'),
            value: Utils.defaultIfNullOrEmpty(opts.value, { value: 'OK' }),
            timeOfSample: Utils.defaultIfNullOrEmpty(opts.timeOfSample, new Date().toISOString()),
            uncertaintyInMilliseconds: Utils.defaultIfNullOrEmpty(opts.uncertaintyInMilliseconds, 0),
        };

        if (!property.instance) {
            delete property.instance;
        }

        this.context!.properties.push(property);
    }

    /**
     * Add a property to the payload.
     *
     * @param opts Contains options for the property.
     */
    addPayloadChangeProperty(opts: AlexaV3ContextProperty): void {
        opts ||= {} as AlexaV3ContextProperty;

        const property = {
            namespace: Utils.defaultIfNullOrEmpty(opts.namespace, 'Alexa.EndpointHealth'),
            instance: Utils.defaultIfNullOrEmpty(opts.instance, undefined),
            name: Utils.defaultIfNullOrEmpty(opts.name, 'connectivity'),
            value: Utils.defaultIfNullOrEmpty(opts.value, { value: 'OK' }),
            timeOfSample: Utils.defaultIfNullOrEmpty(opts.timeOfSample, new Date().toISOString()),
            uncertaintyInMilliseconds: Utils.defaultIfNullOrEmpty(opts.uncertaintyInMilliseconds, 0),
        };

        if (!property.instance) {
            delete property.instance;
        }

        if (!this.event) {
            throw new Error('Event is not defined');
        }
        this.event.payload.change ||= { properties: [], cause: { type: 'APP_INTERACTION' } };

        this.event.payload.change.properties.push(property);
    }

    static alexaCapability(): AlexaV3Capability[] {
        return [
            {
                type: 'AlexaInterface',
                interface: 'Alexa',
                version: '3',
            },
        ];
    }

    /**
     * Adds an endpoint to the payload.
     *
     * @param opts Contains options for the endpoint.
     */
    addPayloadEndpoint(opts: AlexaV3DiscoverAppliance): void {
        if (!this.event) {
            throw new Error('Event is not defined');
        }

        this.event.payload.endpoints ||= [];

        opts ||= {} as AlexaV3DiscoverAppliance;

        // construct the proper structure expected for the endpoint
        const endpoint: AlexaV3DiscoverAppliance = {
            endpointId: Utils.defaultIfNullOrEmpty(opts.endpointId, 'dummy-endpoint-001'),
            manufacturerName: Utils.defaultIfNullOrEmpty(opts.manufacturerName, 'ioBroker Group'),
            description: Utils.defaultIfNullOrEmpty(opts.description, 'Device controlled by ioBroker'),
            friendlyName: Utils.defaultIfNullOrEmpty(opts.friendlyName, 'ioBroker Stub Endpoint'),
            displayCategories: Utils.defaultIfNullOrEmpty(opts.displayCategories, ['OTHER']),
            capabilities: AlexaResponse.alexaCapability().concat(
                Utils.defaultIfNullOrEmpty<AlexaV3Capability[]>(opts.capabilities, []),
            ),
            cookie: undefined,
        };

        if (Object.prototype.hasOwnProperty.call(opts, 'cookie')) {
            endpoint.cookie = Utils.defaultIfNullOrEmpty<Record<string, string>>(opts.cookie, {});
        }

        this.event.payload.endpoints.push(endpoint);
    }

    /**
     * Creates a capability for an endpoint within the payload.
     *
     * @param opts Contains options for the endpoint capability.
     */
    asEndpointCapability(opts?: AlexaV3Capability): AlexaV3Capability {
        opts ||= {} as AlexaV3Capability;

        const response: AlexaV3Capability = {
            type: Utils.defaultIfNullOrEmpty(opts.type, 'AlexaInterface'),
            interface: Utils.defaultIfNullOrEmpty(opts.interface, 'Alexa'),
            version: Utils.defaultIfNullOrEmpty(opts.version, '3'),
            properties: Utils.defaultIfNullOrEmpty<{
                supported: { name: string }[];
                proactivelyReported?: boolean;
                retrievable?: boolean;
                nonControllable?: boolean;
            }>(
                opts.properties,
                {} as {
                    supported: { name: string }[];
                    proactivelyReported?: boolean;
                    retrievable?: boolean;
                    nonControllable?: boolean;
                },
            ),
            // not all capabilities have the following ones
            instance: Utils.defaultIfNullOrEmpty(opts.instance, undefined),
            configuration: Utils.defaultIfNullOrEmpty(opts.configuration, undefined),
            semantics: Utils.defaultIfNullOrEmpty(opts.semantics, undefined),
            capabilityResources: Utils.defaultIfNullOrEmpty(opts.capabilityResources, undefined),
            supportsDeactivation: Utils.defaultIfNullOrEmpty(opts.supportsDeactivation, undefined),
        };

        if (!response.instance) {
            delete response.instance;
        }
        if (!response.configuration) {
            delete response.configuration;
        }
        if (!response.semantics) {
            delete response.semantics;
        }
        if (!response.capabilityResources) {
            delete response.capabilityResources;
        }
        if (response.supportsDeactivation === undefined) {
            delete response.supportsDeactivation;
        }
        if (response.properties && !Object.keys(response.properties).length) {
            delete response.properties;
        }

        return response;
    }

    /**
     * Get the composed Alexa Response.
     */
    get(): AlexaResponse {
        return this;
    }
}
