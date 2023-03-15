const Device = require('./Device')
/**
 * iobroker 'light' and 'dimmer' devices are merged to the same device or endpoint from Alexa's perspective if they're in the same room,
 * e.g., 'living room', and have the same function assigned, e.g., 'light'.
 * If an Alexa directive to 'turn light in the living room off' comes in, then the 'light' is set to false and
 * the 'dimmer' to 0.
 * Alexa directive to 'set brightness to 50% in living room' would result in setting the 'light' to true and
 * the 'dimmer' to 50.
 * This might also lead to a case where not all devices could be changed due to some error or the current states of devices
 * are contradicting from the Alexa's perspective, e.g., the current state of 'light' is true, 
 * but the current state of the 'light dimmer' is 0. 
 * In such situations the logic is as follows: 
 * - if the state of at least one device could be changed according to the Alexa directive, the Alexa directive processing considered to be successful
 * - if the state of at least one device is 'ON' (true, brightness > 0, etc.), the state of the Alexa's endpoint is 'ON'
 *
 * This class hides the different iobroker real devices from Alexa and makes them appear as a single endpoint.
 * @class
 */
class Dimmer extends Device {
    constructor() {
        super();
    }

}

module.exports = Dimmer;