const AdmZip = require('adm-zip');
const { loadEnvConfig } = require('./edit_env_js_file.js');
let config = require('./config.js');

/**
 * iOS真机测试辅助类
 * 用于处理iOS真机测试相关的配置和信息获取
 */
class IOSDeviceHelper {
    /**
     * @description 获取iOS真机测试需要的IPA路径
     * @param {Boolean} is_uniapp_x 是否是uniapp-x项目
     * @param {Boolean} is_uniapp_x_vapor 是否是蒸汽模式
     * @returns {String} IPA文件路径
     */
    async get_ios_ipa_path(is_uniapp_x, is_uniapp_x_vapor, env_js_file_path) {
        let ipa_file_path = config.LAUNCHER_IOS_IPA;
        if (is_uniapp_x) {
            ipa_file_path = config.UNIAPP_X_LAUNCHER_IOS_IPA;
        };
        if (is_uniapp_x_vapor) {
            ipa_file_path = config.UNIAPP_X_VAPOR_LAUNCHER_IOS_IPA;
        };

        try {
            let envJsFileData = loadEnvConfig(env_js_file_path);
            if (!envJsFileData) {
                console.error("[自动化测试] env.js 测试配置文件, 可能存在语法错误，请检查。");
                return false;
            };
            const isCustomRuntime = envJsFileData["is-custom-runtime"];
            if (isCustomRuntime === true) {
                ipa_file_path = envJsFileData["app-plus"]["ios"]["executablePath"];
                if (is_uniapp_x) {
                    ipa_file_path = envJsFileData["app-plus"]["uni-app-x"]["ios"]["executablePath"];
                };
            };
        } catch (error) {
            console.error("[自动化测试] get_ios_ipa_path 错误:", error);
        };
        return ipa_file_path;
    };

    /**
     * @description 从IPA包中读取UTS基础信息
     * @param {String} ipa_file_path IPA文件路径
     * @returns {Object|null} UTS信息对象或null
     */
    async get_uts_base_info(is_uniapp_x, ipa_file_path) {
        let ipa_package_name = is_uniapp_x ? "UniAppX.app" : "HBuilder.app";
        try {
            const zip = new AdmZip(ipa_file_path);
            const utsInfoJsonPath = 'Payload/' + ipa_package_name + '/Frameworks/DCloudUTSFoundation.framework/uts-info.json';
            const utsInfoJson = zip.readAsText(utsInfoJsonPath);
            if (!utsInfoJson) {
                console.error("[自动化测试] 未找到uts-info.json文件");
                return null;
            }
            const utsInfoJsonParse = JSON.parse(utsInfoJson);
            return {
                ...utsInfoJsonParse
            };
        } catch (error) {
            console.error("[自动化测试] 读取uts-info.json失败:", error);
            return null;
        }
    };

    /**
     * @description 获取HX使用的基础类型（standard或custom）
     * @param {String} env_js_file_path env.js文件路径
     * @returns {String|Boolean} 基础类型或false（配置错误时）
     */
    async get_hx_use_base_type(env_js_file_path) {
        let base_type = "standard";
        let envJsFileData = loadEnvConfig(env_js_file_path);
        if (!envJsFileData) {
            console.error("[自动化测试] env.js 测试配置文件, 可能存在语法错误，请检查。");
            return false;
        };
        const isCustomRuntime = envJsFileData["is-custom-runtime"];
        if (isCustomRuntime === true) {
            base_type = "custom";
        };
        return base_type;
    };
}

module.exports = IOSDeviceHelper;
