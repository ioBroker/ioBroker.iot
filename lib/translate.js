module.exports = function (dictionary, language, word) {
    let _word = (word || '').toString().toLowerCase();
    for (let r = 0; r < dictionary.length; r++) {
        for (let l in dictionary[r]) {
            if (dictionary[r].hasOwnProperty(l)) {
                let words = dictionary[r][l].toLowerCase().split('/');
                if (words.includes(_word)) {
                    if (dictionary[r][language]) {
                        return dictionary[r][language].split('/')[0];
                    } else {
                        return dictionary[r].en.split('/')[0];
                    }
                }
            }
        }
    }

    return word;
};
