class IotProxy {
    /**
     * @type {Object}
     */
    static device;
    /**
     * @type {string}
     */
    static stateChangedTopic;

    /**
     * @param {Object} device
     * @param {string} clientId
     */
    static init(device, clientId) {
        IotProxy.device = device;
        IotProxy.stateChangedTopic = `response/${clientId}/stateChange`;
        this.clientId = clientId;
    }
    /**
     * @param {Object} stateChange
     */
    static publishStateChange(stateChange) {
        // replace INVALID token with client id
        stateChange.event.endpoint.scope.token = this.clientId; 
        return IotProxy.publish(IotProxy.stateChangedTopic, stateChange);
    }

    /**
     * @param {string} topic
     * @param {string} message
     */
    static publish(topic, message) {
        if (typeof message !== 'string') {
            message = JSON.stringify(message);
        }
        setTimeout(() => {
            IotProxy.device.publish(topic, message, { qos: 0 }, (error, result) => { });
        }, 100);
    }
}

module.exports = IotProxy;