const Capabilities = require('./Capabilities');
const StateProxy = require('./Capabilities/StateProxy');

let newInstanceIfDoesntExist = function (capabilityName, capabilitiesCollection) {
    let capability = capabilitiesCollection.find(c => c.name === capabilityName)
    if (!capability) {
        capability = new (Capabilities[capabilityName])()
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
        let ON = Capabilities.PowerController.ON;
        let OFF = Capabilities.PowerController.OFF;

        for (const ctrl of controls) {
            switch (ctrl.type) {
                case 'blind':
                    break;

                case 'light':
                    {
                        /*
                            Control of type 'light' can be switched 'ON' and 'OFF'. Usually the same address (iobroker state id) can be used to obtain the current
                            state of the control. 
                            Corresponds to the Alexa PowerController capability.
                        */

                        // this state is a mandatory one for the control, so it exists
                        let setPower = ctrl.states.find(s => s.name === 'SET');
                        // this one is optional
                        let getPower = ctrl.states.find(s => s.name === 'ON_ACTUAL');

                        // PowerController
                        let capability = newInstanceIfDoesntExist(Capabilities.PowerController.name, capabilitiesCollection);
                        capability.addStateProxy(new StateProxy({
                            setState: setPower.id,
                            getState: getPower?.id,
                            setter: function (alexaValue) {
                                return alexaValue === ON
                            },
                            getter: function (value) {
                                return value ? ON : OFF
                            }
                        }))
                    }

                    break;


                case 'dimmer':
                    {
                        /*
                            Control of type 'dimmer' can be switched 'ON'/'OFF' and its brightness can be set to a value between 0 and 100. 
        
                            If there is no 'ON_SET' state available:
                            - switching control 'OFF' is done via setting its brightness to 0
                            - switching control 'ON' is done via setting its brightness to the configured 'byOn' value or to the last known brigthness.
        
                            This control is represented by the Alexa PowerController and BrightnessController capabilities.
                        */

                        // this state is a mandatory one for the control, so it exists
                        let setBrightness = ctrl.states.find(s => s.name === 'SET');
                        // these ones are all optional
                        let getBrightness = ctrl.states.find(s => s.name === 'ACTUAL');
                        let setPower = ctrl.states.find(s => s.name === 'ON_SET');
                        let getPower = ctrl.states.find(s => s.name === 'ON_ACTUAL');

                        // PowerController
                        let capability = newInstanceIfDoesntExist(Capabilities.PowerController.name, capabilitiesCollection);

                        // set byOn to the configured value or 100 otherwise
                        let byOn = setBrightness.smartName?.byON;
                        byOn = isNaN(byOn) ? 100 : parseInt(byOn);

                        capability.addStateProxy(new StateProxy({
                            setState: setPower?.id || setBrightness.id,
                            getState: getPower?.id || setPower?.id,
                            setter: setPower
                                ?
                                // in case of a dedicated switch state just convert ON and OFF to a boolean
                                function (alexaValue) {
                                    return alexaValue === ON;
                                }
                                :
                                // if there is no dedicated switch state, 
                                // then the ON is implemented by setting the control to the 'byOn' value
                                // and the OFF is implemented by setting the control to 0
                                function (alexaValue) {
                                    return alexaValue === ON ? byOn : 0;
                                },
                            getter: (setPower || getPower)
                                ?
                                // in case of a dedicated switch state just convert its boolean value to ON or OFF
                                function (value) {
                                    return value ? ON : OFF;
                                }
                                :
                                // if there is no dedicated switch state, then the ON is defined as (brightness > 0)
                                function (value) {
                                    return value > 0 ? ON : OFF;
                                }
                        }))

                        // BrightnessController
                        capability = newInstanceIfDoesntExist(Capabilities.BrightnessController.name, capabilitiesCollection);
                        capability.addStateProxy(new StateProxy({
                            setState: setBrightness.id,
                            getState: getBrightness?.id,
                        }))
                    }
                    break;
            }
        }


        return capabilitiesCollection;
    }
}

module.exports = CapabilityFactory;