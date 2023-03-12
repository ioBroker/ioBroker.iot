const capabilities = require('./Capabilities');
const StateContainer = require('./Capabilities/StateContainer');

let newInstanceIfDoesntExist = function (capabilityName, capabilitiesCollection) {
    let capability = capabilitiesCollection.find(c => c.namespace === capabilityName)
    if (!capability) {
        capability = new (capabilities[capabilityName])()
        capabilitiesCollection.push(capability)
    }

    return capability;
}

class CapabilityFactory {
    /**
     * Tries to map the given list of controls to a set of Alexa capabilities
     * @param controls List containing detected controls.
     * @returns {Object} Matched capability instances list, empty list otherwise
     */
    static map(controls) {
        let capabilitiesCollection = []
        let capability;
        let setState;
        let getState;


        for (const ctrl of controls) {
            switch (ctrl.type) {
                case 'blind':
                    break;

                case 'light':
                    /* 
                        Control of type 'light' can be switched 'ON' and 'OFF'. Usually the same address (iobroker state id) can be used to obtain the current
                        state of the control. 
                        Corresponds to the Alexa PowerController capability.
                    */

                    // must have SET state
                    if (!ctrl.states.find(s => s.name === 'SET')) {
                        continue;
                    }

                    setState = ctrl.states.find(s => s.name === 'SET');
                    getState = ctrl.states.find(s => s.name === 'ON_ACTUAL');

                    // PowerController
                    capability = newInstanceIfDoesntExist('PowerController', capabilitiesCollection);
                    capability.addStateContainer(new StateContainer({
                        setStateId: setState.id,
                        getStateId: getState?.id || setState.id,
                        valuesMap: {
                            'ON': true,
                            'OFF': false
                        }
                    }))

                    break;


                case 'dimmer':
                    /* 
                        Control of type 'dimmer' can be switched 'ON'/'OFF' and its brightness can be set to a value between 0 and 100. 
    
                        If there is no 'ON_SET' state available:
                        - switching control 'OFF' is done via setting its brightness to 0
                        - switching control 'ON' is done via setting its brightness to the configured 'byOn' value or to the last known brigthness.
    
                        This control is represented by the Alexa PowerController and BrightnessController capabilities.
                    */

                    // must have SET state
                    if (!ctrl.states.find(s => s.name === 'SET')) {
                        continue;
                    }

                    setState = ctrl.states.find(s => s.name === 'SET');
                    getState = ctrl.states.find(s => s.name === 'ACTUAL');
                    let onSetState = ctrl.states.find(s => s.name === 'ON_SET');
                    let onGetState = ctrl.states.find(s => s.name === 'ON_ACTUAL');

                    // PowerController
                    capability = newInstanceIfDoesntExist('PowerController', capabilitiesCollection);
                    capability.addStateContainer(new StateContainer({
                        setStateId: onSetState?.id || setState.id,
                        getStateId: onGetState?.id || onSetState?.id || function (cpblt) {

                            // if there is no dedicated ON/OFF switch, then the ON is defined as (brightness value > 0)
                            // the function gets the capability instance as parameter on execution
                            return 'OFF';

                        },

                        // TODO: byOn
                        valuesMap: {
                            'ON': onSetState ? true : true,
                            'OFF': false
                        }
                    }))

                    // BrightnessController
                    capability = newInstanceIfDoesntExist('BrightnessController', capabilitiesCollection);
                    capability.addStateContainer(new StateContainer({
                        setStateId: setState.id,
                        getStateId: getState?.id || setState.id,
                    }))

                    break;
            }
        }


        return capabilitiesCollection;
    }
}

module.exports = CapabilityFactory;