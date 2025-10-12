"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = translate;
function translate(dictionary, language, word) {
    const _word = (word || '').toString().toLowerCase();
    for (let r = 0; r < dictionary.length; r++) {
        for (const l in dictionary[r]) {
            if (Object.prototype.hasOwnProperty.call(dictionary[r], l)) {
                const words = dictionary[r][l].toLowerCase().split('/');
                if (words.includes(_word)) {
                    if (dictionary[r][language]) {
                        return dictionary[r][language].split('/')[0];
                    }
                    return dictionary[r].en.split('/')[0];
                }
            }
        }
    }
    return word;
}
//# sourceMappingURL=translate.js.map