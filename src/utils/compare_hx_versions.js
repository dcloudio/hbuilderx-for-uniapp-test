/**
 * @description 比较版本号
 * @param {Object} a
 * @param {Object} b
 * @returns {number} 返回值：
 *      a < b => 1
 *      a > b => -1
 *      a == b => 0
 */
function compareHBuilderXVersions(a, b) {
    try {
        let i = 0;
        const arr1 = a.split('.');
        const arr2 = b.split('.');
        while (true) {
            const s1 = arr1[i];
            const s2 = arr2[i++];
            if (s1 === undefined || s2 === undefined) {
                return arr2.length - arr1.length;
            }
            if (s1 === s2) continue;
            return s2 - s1;
        }
    } catch (error) {
        return 0;
    };
    return 0;
};

module.exports = compareHBuilderXVersions;

// let ver = "2.77.10.2025081505-alpha";
// ver = ver.replace('-alpha', '').replace(/.\d{10}/, '')
// console.log(ver)
// console.log(compareHBuilderXVersions(ver, '3.2.10'))
