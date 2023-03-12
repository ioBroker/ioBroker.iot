const Endpoint = require('./Endpoint');
const Helpers = require('./Helpers');
const directives = require('./Directives');
const capabilities = require('./Capabilities');

class EndpointManager {
    constructor(adapter, lang) {
        this.adapter = adapter;
        this.lang = lang;
        this.knownEndpoints = []
        this.collectEndpoints();
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
        // collect all iobroker controls in terms of iobroker type detector (https://github.com/ioBroker/ioBroker.type-detector)
        let controls = await Helpers.controls(this.adapter);

        // The following logic performs the mapping of controls to endpoints:
        // - first, controls located in the same room and having the same functinality are merged to a single endpoint
        // - then, controls located in the same room with no functionality are merged to a single endpoint
        // - finally, each control with no room and no functionality represents a separate endpoint

        // as long as not all controls mapped to endpoints...
        while (controls.length) {
            // take the next control
            let control = controls.shift();

            // if there is no room assigned...
            if (!control.room) {
                // map it to a separate endpoint
                let endpoint = new Endpoint({
                    id: control.object.id,
                    capabilities: [],
                    friendlyName: '',
                    displayCategories: []
                })

                this.addEndpoint(endpoint);
            } else { // if it's in a room
                // find all the other controls in the same room
                let inTheSameRoom = controls.filter(c => c.room?.id == control.room.id);
            }

        }

    }

}

module.exports = EndpointManager;