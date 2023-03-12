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
