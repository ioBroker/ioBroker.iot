module.exports = function (dictionary, language, word) {
    var _word = word.toLowerCase();
    for (var r = 0; r < dictionary.length; r++) {
        for (var l in dictionary[r]) {
            if (dictionary[r].hasOwnProperty(l)) {
                var words = dictionary[r][l].toLowerCase().split('/');
                if (words.indexOf(_word) !== -1) {
                    return dictionary[r][language].split('/')[0];
                }
            }
        }
    }
    return word;
};