const Endpoint = require('./Endpoint');
const Helpers = require('./Helpers');
const directives = require('./Directives');
const capabilities = require('./Capabilities');

class EndpointManager {
    constructor(adapter, lang) {
        this.adapter = adapter;
        this.lang = lang;
        this.knownEndpoints = []
        //this.collectEndpoints();
    }

    matchDirective(event) {
        let name = Object.keys(directives).find(key =>
            directives[key].matches(event)
        )

        return name ? new directives[name] : null;
    }

    get endpoints() {
        return this.knownEndpoints
    }


    endpointById(id) {
        return this.knownEndpoints.find(endpoint => endpoint.id === id)
    }

    addEndpoint(endpoint) {
        this.knownEndpoints.push(endpoint)
    }

    async collectEndpoints() {
        let controls = await Helpers.controls(this.adapter);

        return controls;
    }

}

module.exports = EndpointManager;