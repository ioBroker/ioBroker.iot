class IotProxy {
    static device;
    static stateChangedTopic;

    static init(device, clientId) {
        IotProxy.device = device;
        IotProxy.stateChangedTopic = `response/${clientId}/stateChange`;
    }
    static publishStateChange(stateChange) {
        return IotProxy.publish(IotProxy.stateChangedTopic, stateChange);
    }

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