const AlexaResponse = require('../AlexaResponse');

class Base {
    constructor() {
    }

    get namespace() {
        // let classNameRegEx = /(?:\S+\s+){1}([a-zA-Z_$][0-9a-zA-Z_$]*)/;
        // return 'Alexa.' + classNameRegEx.exec(this.toString())[1];
        return `Alexa.${this.constructor.name}`
    }

    get properties() {
        return {
            supported: [
                {
                    name: this.propertyName
                }
            ],
            proactivelyReported: this.proactivelyReported,
            retrievable: this.retrievable
        };
    }

    get proactivelyReported() {
        return false;
    }

    get retrievable() {
        return false;
    }

    get alexaResponse() {
        return {
            interface: this.namespace,
            properties: this.properties
        };
    }

    get propertyName() {
        return 'not-defined'
    }

    value(event) {
        return event.directive.payload[this.propertyName]
    }

    endpointId(event) {
        return event.directive.endpoint.endpointId;
    }

    directive(event) {
        return 'SET'
    }

    async handle(event) {

        const value = this.value(event);
        const endpoint_id = this.endpointId(event);
        const namespace = this.namespace
        const property_name = this.propertyName
        const directive = this.directive(event)

        // Check for an error when setting the state
        const state_set = false;

        if (!state_set) {
            return AlexaResponse.errorResponse({
                type: 'ENDPOINT_UNREACHABLE',
                message: "Unable to reach endpoint."
            }).get();
        }

        const response = new AlexaResponse({
            correlationToken: event.directive.header.correlationToken,
            token: event.directive.endpoint.scope.token,
            endpointId: endpoint_id
        });
        response.addContextProperty({
            namespace: namespace,
            name: property_name,
            value: value
        });

        return response.get();
    }
}

module.exports = Base;