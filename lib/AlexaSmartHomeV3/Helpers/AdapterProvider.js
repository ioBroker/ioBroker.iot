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
        return await AdapterProvider.get().setForeignStateAsync(id, value, false);
    }
    /**
     * @param {string} id
     * @returns {Promise<Object>} - Object's val returned by the iobroker getForeignStateAsync function
     */
    static async getState(id) {
        const state = await AdapterProvider.get().getForeignStateAsync(id);
        return state.val;
    }
}

module.exports = AdapterProvider;