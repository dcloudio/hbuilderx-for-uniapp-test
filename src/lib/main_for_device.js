const hx = require('hbuilderx');
const os = require('os');

const ui_formDialog = require("./ui_formDialog.js");
const api_getMobileList = require("./api_getMobileList.js");

// 测试设备
global.global_devicesList = [];

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
            if (s.uuid == deviceID && phoneOS == "android") {
                uniTestPlatformInfo = s.platform + " " + s.version;
                break;
            };
            if (s.uuid == deviceID && phoneOS == "ios_simulator") {
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
 * @return {Array} 手机设备列表，必须是数组，数组元素格式：['android:uuid', 'ios:uuid']
 */
async function getTestDevices(testPlatform) {
    global_devicesList = await api_getMobileList(testPlatform);
    // 如果当前连接的Android设备只有一个，则不弹出测试设备选择窗口，直接运行。
    if (testPlatform == 'android') {
        let {
            android,
            android_simulator
        } = global_devicesList;
        let allAndroid = [...android, ...android_simulator];
        if (allAndroid.length == 1) {
            let one = 'android:' + allAndroid[0]['name'];
            return [one];
        };
    };

    // 从测试设备选择窗口获取测试设备
    // 数据格式：["ios:A8790C48-4986-4303-B235-D8AFA95402D4","android:712KPQJ1103860","mp:mp-weixin","h5:h5-chrome","h5:h5-firefox","h5:h5-safari"]
    let selected = await ui_formDialog(testPlatform);
    return selected;
};


module.exports = {
    get_uniTestPlatformInfo,
    getTestDevices
};
