class AdapterProvider {
    static adapterInstance;
    static init(adapter) {
        AdapterProvider.adapterInstance = adapter;
    }
    static get() {
        return AdapterProvider.adapterInstance;
    }
}

module.exports = AdapterProvider;