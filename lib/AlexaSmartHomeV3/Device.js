const Helpers = require('./Helpers')
const { v4: uuidv4 } = require('uuid');

/**
 * This class hides the different iobroker controls from Alexa and makes them appear as a single endpoint.
 * Due to differencies in Alexa's and iobroker's endpoint/devices concepts, we have to merge some of the
 * by the type-detector detected controls to a single device, so that multiple controls are considered 
 * to be the same endpoint from Alexa's perspective.
 * This leads to a situation where while Alexa beleives controlling a single endpoint by sending a directive 
 * to change the endpoint's state, in reality the states of multiple controls are changed.
 *
 * @class
 */
class Device {
    constructor(opts) {
        this.id = Helpers.defaultIfNullOrEmpty((opts.id || '').replace(' ', '-'), uuidv4());
        this.friendlyName = Helpers.defaultIfNullOrEmpty(opts.friendlyName, uuidv4());
        this.controls = Helpers.defaultIfNullOrEmpty(opts.controls, []);
    }

    async handle(event) {
        const promises = []
        this.controls.forEach(control => promises.push(control.handle(event)))
        const results = await Promise.allSettled(promises);

        const fulfilled = results.find(item => item.status === 'fulfilled');
        // @ts-ignore
        return fulfilled !== undefined ? fulfilled.value : results[0].reason;
    }

    async reportState() {
        const promises = []
        this.controls.forEach(control => promises.push(control.reportState()))
        const results = await Promise.allSettled(promises);
        // @ts-ignore
        const properties = results.filter(item => item.status === 'fulfilled').flatMap(item => item.value);
        return Helpers.distinctByPropertyName(properties, 'namespace');
    }

    get capabilities() {
        const allCapabilities = this.controls.flatMap(item => item.supported).map(item => item.capability);
        return Helpers.distinctByPropertyName(allCapabilities, 'namespace');
    }

    get displayCategories() {
        return Array.from(new Set(this.controls.flatMap(item => item.categories)));
    }
}

module.exports = Device;