class AdapterProvider {
    /**
     * @type {Object}
     */
    static adapterInstance;
    /**
     * @param {Object} adapter
     */
    static init(adapter) {
        AdapterProvider.adapterInstance = adapter;
    }
    static get() {
        return AdapterProvider.adapterInstance;
    }

    /**
    * Sets iobroker state to the passed on value
    * @async
    * @param {string} id - id of the state to write the value to
    * @param {*} value - value to set the provided state to
    * @returns {Promise<Object>} - Object returned by the iobroker setForeignStateAsync function
    */
    static async setState(id, value) {
        await AdapterProvider.get().setForeignStateAsync(id, value, false);
        AdapterProvider.get().log.silly(`[AlexaV3::AdapterProvider]: set [${id}] to [${value}]`);
    }
    /**
     * @param {string} id
     * @returns {Promise<Object>} - Object's val returned by the iobroker getForeignStateAsync function
     */
    static async getState(id) {
        const state = await AdapterProvider.get().getForeignStateAsync(id);
        return state.val;
    }

    static async subscribe(id) {
        await AdapterProvider.get().subscribeForeignStatesAsync(id);
    }

    static async unsubscribe(id) {
        await AdapterProvider.get().unsubscribeForeignStatesAsync(id);
    }

}

module.exports = AdapterProvider;