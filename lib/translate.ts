export default function translate(
    dictionary: ioBroker.Translated[],
    language: ioBroker.Languages,
    word: string,
): string {
    const _word = (word || '').toString().toLowerCase();
    for (let r = 0; r < dictionary.length; r++) {
        for (const l in dictionary[r]) {
            if (Object.prototype.hasOwnProperty.call(dictionary[r], l)) {
                const words = dictionary[r][l as ioBroker.Languages]!.toLowerCase().split('/');
                if (words.includes(_word)) {
                    if (dictionary[r][language]) {
                        return dictionary[r][language]!.split('/')[0];
                    }
                    return dictionary[r].en.split('/')[0];
                }
            }
        }
    }

    return word;
}
