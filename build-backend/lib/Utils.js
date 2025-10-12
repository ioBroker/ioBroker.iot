"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Utils {
    static fixAdminUI(obj) {
        if (obj?.common) {
            if (!obj.common.adminUI) {
                if (obj.common.noConfig) {
                    obj.common.adminUI = obj.common.adminUI || {};
                    obj.common.adminUI.config = 'none';
                }
                else if (obj.common.jsonConfig) {
                    obj.common.adminUI = obj.common.adminUI || {};
                    obj.common.adminUI.config = 'json';
                }
                else if (obj.common.materialize) {
                    obj.common.adminUI = obj.common.adminUI || {};
                    obj.common.adminUI.config = 'materialize';
                }
                else {
                    obj.common.adminUI = obj.common.adminUI || {};
                    obj.common.adminUI.config = 'html';
                }
                if (obj.common.jsonCustom) {
                    obj.common.adminUI = obj.common.adminUI || {};
                    obj.common.adminUI.custom = 'json';
                }
                else if (obj.common.supportCustoms) {
                    obj.common.adminUI = obj.common.adminUI || {};
                    obj.common.adminUI.custom = 'json';
                }
                if (obj.common.materializeTab && obj.common.adminTab) {
                    obj.common.adminUI = obj.common.adminUI || {};
                    obj.common.adminUI.tab = 'materialize';
                }
                else if (obj.common.adminTab) {
                    obj.common.adminUI = obj.common.adminUI || {};
                    obj.common.adminUI.tab = 'html';
                }
                if (obj.common.adminUI) {
                    console.warn(`Please add to "${obj._id.replace(/\.\d+$/, '')}" common.adminUI=${JSON.stringify(obj.common.adminUI)}`);
                }
            }
            else {
                let changed = false;
                if (obj.common.materializeTab && obj.common.adminTab) {
                    if (obj.common.adminUI.tab !== 'materialize') {
                        obj.common.adminUI.tab = 'materialize';
                        changed = true;
                    }
                }
                else if (obj.common.adminTab) {
                    if (obj.common.adminUI.tab !== 'html' && obj.common.adminUI.tab !== 'materialize') {
                        obj.common.adminUI.tab = 'html';
                        changed = true;
                    }
                }
                if (obj.common.jsonCustom || obj.common.supportCustoms) {
                    if (obj.common.adminUI.custom !== 'json') {
                        obj.common.adminUI.custom = 'json';
                        changed = true;
                    }
                }
                if (obj.common.noConfig) {
                    if (obj.common.adminUI.config !== 'none') {
                        obj.common.adminUI.config = 'none';
                        changed = true;
                    }
                }
                else if (obj.common.jsonConfig) {
                    if (obj.common.adminUI.config !== 'json') {
                        obj.common.adminUI.config = 'json';
                        changed = true;
                    }
                    obj.common.adminUI.config = 'json';
                }
                else if (obj.common.materialize) {
                    if (obj.common.adminUI.config !== 'materialize') {
                        if (!obj.common.adminUI.config) {
                            obj.common.adminUI.config = 'materialize';
                            changed = true;
                        }
                    }
                }
                else if (!obj.common.adminUI.config) {
                    obj.common.adminUI.config = 'html';
                    changed = true;
                }
                if (changed) {
                    console.warn(`Please modify "${obj._id.replace(/\.\d+$/, '')}" common.adminUI=${JSON.stringify(obj.common.adminUI)}`);
                }
            }
        }
    }
}
exports.default = Utils;
//# sourceMappingURL=Utils.js.map