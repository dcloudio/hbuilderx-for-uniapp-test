const os = require('os');

const ui_vue = require("./ui_vue.js");
const api_getMobileList = require("./api_getMobileList.js");
const { showIosCertDialog, validateIosCert } = require('./ui_ios_cert.js');

const { get_ios_device_type, createOutputChannel } = require('../core/core.js');

// 全局：测试设备
global.global_devicesList = {};

// 全局：测试配置
global.global_uniSettings = {};

// 全局：iOS证书信息（含密码，仅本次启动有效）
global.global_iosCertInfo = null;

/**
 * @description 内部使用。返回具体的测试设备信息
 */
async function get_uniTestPlatformInfo(platform, deviceID) {
    console.error("[get_uniTestPlatformInfo] uniTestPlatformInfo = ", platform);
    let uniTestPlatformInfo = "";
    if (platform == "h5") return 'web chrome';
    if (platform == "h5-chrome") return 'web chrome';
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
async function getTestDevices(testPlatform, projectPath="") {
    // 从测试设备选择窗口获取测试设备
    // 数据格式：[
    //     "ios:A8790C48-4986-4303-B235-D8AFA95402D4",
    //     "android:712KPQJ1103860","mp:mp-weixin","h5:h5-chrome","h5:h5-firefox","h5:h5-safari"
    // ]

    let selected = "";
    let uiSettings = {};

    // 设备选择
    let _result = await ui_vue(testPlatform, projectPath);
    if (Array.isArray(_result) && _result.length == 2) {
        [selected, uiSettings] = _result;
        if (uiSettings && Object.keys(uiSettings).length > 0) {
            global.global_uniSettings = uiSettings;
        };
    } else {
        selected = _result;
    };

    console.error("[_result_]", selected, uiSettings);

    // 检查是否有iOS真机，若有则弹出证书信息窗口
    if (Array.isArray(selected) && selected.length > 0) {
        const iosDevices = selected.filter(d => d.startsWith('ios:'));
        if (iosDevices.length > 0) {
            const hasRealDevice = await Promise.all(
                iosDevices.map(d => get_ios_device_type(d.split(':')[1]))
            ).then(types => types.some(t => t === '真机'));
            if (hasRealDevice) {
                const certInfo = await showIosCertDialog();
                if (!certInfo) return [];
                global.global_iosCertInfo = certInfo;
            }
        }
    }

    // return [];
    return selected;
};


module.exports = {
    get_uniTestPlatformInfo,
    getTestDevices,
    validateIosCert
};
