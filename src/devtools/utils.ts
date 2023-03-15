/**
 * Word Count
 *
 * Word count in respect of CJK characters.
 *
 * Copyright (c) 2015 - 2016 by Hsiaoming Yang.
 * 
 * https://github.com/yuehu/word-count
 */
var pattern = /[a-zA-Z0-9_\u0392-\u03c9\u00c0-\u00ff\u0600-\u06ff\u0400-\u04ff]+|[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\u3040-\u309f\uac00-\ud7af]+/g;
export function countWord(data: string): number {
    var m = data.match(pattern);
    var count = 0;
    if (!m) {
        return 0;
    }
    for (var i = 0; i < m.length; i++) {
        if (m[i].charCodeAt(0) >= 0x4e00) {
            count += m[i].length;
        } else {
            count += 1;
        }
    }
    return count;
};

export type EstimationMethod = "average" | "words" | "chars" | "max" | "min";
export function estimateTokens(text: string, method: EstimationMethod = "max"): number | string {
    // method can be "average", "words", "chars", "max", "min", defaults to "max"
    const wordCount: number = text.split(" ").length;
    const charCount: number = text.length;
    const tokensCountWordEst: number = wordCount / 0.75;
    const tokensCountCharEst: number = charCount / 4.0;
    let output: number = 0;

    switch (method) {
        case "average":
            output = (tokensCountWordEst + tokensCountCharEst) / 2;
            break;
        case "words":
            output = tokensCountWordEst;
            break;
        case "chars":
            output = tokensCountCharEst;
            break;
        case "max":
            output = Math.max(tokensCountWordEst, tokensCountCharEst);
            break;
        case "min":
            output = Math.min(tokensCountWordEst, tokensCountCharEst);
            break;
        default:
            // return invalid method message
            return "Invalid method. Use 'average', 'words', 'chars', 'max', or 'min'.";
    }

    return Math.ceil(output);
}