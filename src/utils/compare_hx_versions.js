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

// 新增：判断当前 HBuilderX 版本是否大于等于目标版本号
function isHBuilderXVersionAtLeast(version, targetVersion) {
    try {
        const normalizeVersion = (value) => {
            if (typeof value !== 'string') {
                return [0];
            }
            const match = value.trim().match(/^(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
            if (!match) {
                return [0];
            }
            return match.slice(1).filter(Boolean).map(Number);
        };

        const current = normalizeVersion(version);
        const target = normalizeVersion(targetVersion);
        const maxLength = Math.max(current.length, target.length);

        for (let i = 0; i < maxLength; i++) {
            const currentPart = current[i] || 0;
            const targetPart = target[i] || 0;
            if (currentPart > targetPart) {
                return true;
            }
            if (currentPart < targetPart) {
                return false;
            }
        }
        return true;
    } catch (error) {
        return false;
    }
};
// console.log(isHBuilderXVersionAtLeast("5.32.2026092302-dev", "5.31"));
// console.log(isHBuilderXVersionAtLeast("5.31.2026092213-alpha", "5.31"));
// console.log(isHBuilderXVersionAtLeast("5.26", "5.31"));

module.exports.isHBuilderXVersionAtLeast = isHBuilderXVersionAtLeast;

