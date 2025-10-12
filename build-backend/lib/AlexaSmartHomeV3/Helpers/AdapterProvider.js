"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class AdapterProvider {
    static adapterInstance;
    static init(adapter) {
        AdapterProvider.adapterInstance = adapter;
    }
    static get() {
        return AdapterProvider.adapterInstance;
    }
    /**
     * Sets iobroker state to the passed on value
     *
     * @param id - id of the state to write the value to
     * @param value - value to set the provided state to
     */
    static async setState(id, value) {
        await AdapterProvider.get().setForeignStateAsync(id, value, false);
        AdapterProvider.get().log.silly(`[AlexaV3::AdapterProvider]: set [${id}] to [${value}]`);
    }
    /**
     * @param id State id to get the value from
     * @returns Object's val returned by the iobroker getForeignStateAsync function
     */
    static async getState(id) {
        const state = await AdapterProvider.get().getForeignStateAsync(id);
        return state?.val;
    }
    static async subscribe(id) {
        await AdapterProvider.get().subscribeForeignStatesAsync(id);
    }
    static async unsubscribe(id) {
        await AdapterProvider.get().unsubscribeForeignStatesAsync(id);
    }
}
exports.default = AdapterProvider;
//# sourceMappingURL=AdapterProvider.js.map