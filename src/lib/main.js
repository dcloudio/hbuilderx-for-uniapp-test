const hx = require('hbuilderx');
const os = require('os');

const ui_formDialog = require("./ui_formDialog.js");
const ui_vue = require("./ui_vue.js");
const api_getMobileList = require("./api_getMobileList.js");

const compareHBuilderXVersions = require('../utils/compare_hx_versions.js');
const hxVersion = hx.env.appVersion;

// 版本判断：判断是否支持safari和firefox，因为firefox和safari自动化测试仅支持3.2.10+版本
const hxVersionForDiff = hxVersion.replace('-alpha', '').replace('-dev', '').replace(/.\d{10}/, '');
const cmpVerionForVue = compareHBuilderXVersions(hxVersionForDiff, '4.40');

// 测试设备
global.global_devicesList = {};
global.global_uniSettings = {};

/**
 * @description 内部使用。返回具体的测试设备信息
 */
async function get_uniTestPlatformInfo(platform, deviceID) {
    let uniTestPlatformInfo = "";
    if (platform == "h5") return 'web chrome';
    if (platform == "h5-safari") return 'web safari';
    if (platform == "h5-firefox") return 'web firefox';

    try{
        if (!platform.toLowerCase().includes("android") && !platform.toLowerCase().includes("ios")) {
            return platform;
        };
        let phoneOS = platform.toLowerCase();
        if (phoneOS == "ios") {
            phoneOS = "ios_simulator";
        };
        for (let s of global_devicesList[phoneOS]) {
            if (s.udid == deviceID && phoneOS == "android") {
                uniTestPlatformInfo = s.platform + " " + s.version;
                break;
            };
            if (s.udid == deviceID && phoneOS == "ios_simulator") {
                uniTestPlatformInfo = s.platform + " " + s.version;
                // uniTestPlatformInfo = s.platform + " " + s.name;
                break;
            };
        };
        return uniTestPlatformInfo;
    }catch(e){
        return platform;
    };
};


/**
 * @description 在webviewdialog内选择要测试的设备
 *  - 如果当前连接的设备只有一个，则不弹出测试设备选择窗口，直接运行。
 * @description {Sting} testPlatform [ios|android|all]
 * @return {Array} 手机设备列表，必须是数组，数组元素格式：['android:udid', 'ios:udid']
 */
async function getTestDevices(testPlatform) {
    // 从测试设备选择窗口获取测试设备
    // 数据格式：[
    //     "ios:A8790C48-4986-4303-B235-D8AFA95402D4",
    //     "android:712KPQJ1103860","mp:mp-weixin","h5:h5-chrome","h5:h5-firefox","h5:h5-safari"
    // ]

    let selected = "";
    let uiSettings = {};
    // console.log("======", cmpVerionForVue);
    // selected = await ui_formDialog(testPlatform);

    if (cmpVerionForVue < 0) {
        let _result = await ui_vue(testPlatform);
        if (Array.isArray(_result) && _result.length == 2) {
            [selected, uiSettings] = _result;
            if (uiSettings && Object.keys(uiSettings).length > 0) {
                global.global_uniSettings = uiSettings;
            };
        } else {
            selected = _result;
        };
    } else {
        selected = await ui_formDialog(testPlatform);
    };
    console.error("[_result_]", selected, uiSettings);

    // return [];
    return selected;
};


module.exports = {
    get_uniTestPlatformInfo,
    getTestDevices
};
