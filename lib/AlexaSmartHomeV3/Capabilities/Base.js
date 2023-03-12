const AlexaResponse = require('../AlexaResponse');

class Base {
    constructor() {
        this.stateProxies = []
    }

    get namespace() {
        return `Alexa.${this.constructor.name}`
    }

    /**
     * Checks whether the capability matches, i.e. can handle the event Alexa sends to the skill
     * @param event Contains the Alexa event.
     * @returns {boolean} 
     */
    matches(event) {
        return event?.directive?.header?.namespace === this.namespace;
    }

    /**
     * Returns object containing all the properties of the smart device capability as it expected by Alexa
     * @returns {object} 
     */
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

    /**
     * Returns whether the smart device proactively reports state changes 
     * @returns {boolean} 
     */
    get proactivelyReported() {
        return false;
    }

    /**
     * Returns whether the smart device handles Alexa ReportState directives
     * @returns {boolean} 
     */
    get retrievable() {
        return false;
    }

    /**
     * Returns response to Alexa Discovery directive
     * @returns {object} 
     */
    get alexaResponse() {
        return {
            interface: this.namespace,
            properties: this.properties
        };
    }

    get propertyName() {
        return 'not-defined'
    }

    /**
     * Extracts value to be set on the smart device sent in an Alexa directive
     * @returns {object} 
     */    
    alexaValue(event) {
        return event.directive.payload[this.propertyName]
    }

    addStateProxy(proxy) {
        this.stateProxies.push(proxy)
    }

    /**
     * Extracts endpoint id sent in an Alexa directive
     * @returns {string} 
     */  
    endpointId(event) {
        return event.directive.endpoint.endpointId;
    }

    directive(event) {
        return 'SET'
    }

    /**
     * Handles an Alexa directive, i.e., sets a state to a value or reports the value to Alexa
     */  
    async handle(event) {
        const alexaValue = this.alexaValue(event)
        const endpointId = this.endpointId(event)
        // const namespace = this.namespace
        const namespace = this.namespace
        const propertyName = this.propertyName
        // const directive = this.directive(event)

        // TODO: perform required action and check for errors. Dummy success for now.
        const success = true;

        if (!success) {
            return AlexaResponse.errorResponse({
                type: 'ENDPOINT_UNREACHABLE',
                message: "Unable to reach endpoint."
            }).get();
        }

        const response = new AlexaResponse({
            correlationToken: event.directive.header.correlationToken,
            token: event.directive.endpoint.scope.token,
            endpointId: endpointId
        });
        response.addContextProperty({
            namespace: namespace,
            name: propertyName,
            value: alexaValue
        });

        return response.get();
    }

    equals(capability) {
        return this.namespace === capability.namespace
    }

}

module.exports = Base;