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
     * @param {string} login
     */
    static init(device, clientId, login) {
        IotProxy.device = device;
        IotProxy.stateChangedTopic = `response/${clientId}/changeReport`;
        this.login = login;
    }
    /**
     * @param {Object} stateChange
     */
    static publishStateChange(stateChange) {
        // replace INVALID token with the client id
        stateChange.event.endpoint.scope.token = this.login;
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