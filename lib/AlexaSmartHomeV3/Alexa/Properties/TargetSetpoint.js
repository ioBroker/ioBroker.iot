const Base = require('./Base');

class TargetSetpoint extends Base {
    static matches(event) {
        return event?.directive?.header?.name === 'SetTargetTemperature' || event?.directive?.header?.name === 'AdjustTargetTemperature';
    }

    matches(event) {
        return TargetSetpoint.matches(event);
    }

    static directive(event) {
        return event.directive.header.name === 'AdjustTargetTemperature' ? TargetSetpoint.ADJUST : TargetSetpoint.SET;
    }

    alexaValue(event) {
        return TargetSetpoint.directive(event) === TargetSetpoint.SET ? event.directive.payload.targetSetpoint.value : event.directive.payload.targetSetpointDelta.value;
    }

    reportValue(value) {
        return {
            value: value,
            scale: TargetSetpoint.CELSIUS_SCALE,
        };
    }
}

module.exports = TargetSetpoint;