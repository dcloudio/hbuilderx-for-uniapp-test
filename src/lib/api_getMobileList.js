const hx = require('hbuilderx');
const os = require('os');

const {
    getHarmonyDeivcesListFormCmd
} = require("./cmd_devices.js");

const osName = os.platform();

// 全局：测试设备
global.global_devicesList = {};

var extension_launcher = undefined;

/**
 * @param {String} testPlatform
 *
 */
async function getDevicesFormLauncher(testPlatform, isRefresh) {
    // {
    //     "iOS-iPhone": iphoneLauncher,
    //     "android": androidLauncher,
    //     "IOS_SIMULATOR": iossimLauncher,
    //     "app-harmony": harmonyLauncher,
    //     "mp-harmony": harmonyASLauncher,
    // }
    if (extension_launcher == undefined) {
        extension_launcher = hx.extensions.getExtension("launcher");;
    };
    if (extension_launcher == undefined) {
        return global_devicesList;
    };
    if (testPlatform == "all" || testPlatform == 'ios') {
        let ios_simulator_list = await extension_launcher.getDevices({ platform:'IOS_SIMULATOR'}, true);
        let ios_phone_list = await extension_launcher.getDevices({ platform:'iOS-iPhone'}, true);
        // console.error("[IOS]", ios_simulator_list, ios_phone_list);
        if (ios_simulator_list && ios_simulator_list.length > 0){
            let tmp_ios_simulator_list = ios_simulator_list.map(function(v) {
                return Object.assign(v, {"device_type": "模拟器"})
            });
            global_devicesList["ios_simulator"] = tmp_ios_simulator_list;
        };
        if (ios_phone_list && ios_phone_list.length > 0){
            let tmp_ios_phone_list = ios_phone_list.map(function(v) {
                return Object.assign(v, {"device_type": "真机"})
            });
            global_devicesList["ios_phone"] = tmp_ios_phone_list;
        };
    };
    if (testPlatform == "all" || testPlatform == 'android') {
        let _android_list = await extension_launcher.getDevices({ platform:'android'}, true);
        if (_android_list && _android_list.length > 0){
            global_devicesList["android"] = _android_list;
        };
    };
    if (testPlatform == "all" || testPlatform == 'harmony') {
        let _harmony_list = await extension_launcher.getDevices({ platform:'app-harmony'}, true);
        if (_harmony_list && _harmony_list.length > 0){
            global_devicesList["harmony"] = _harmony_list;
        };
    };
    return global_devicesList;
};


async function api_getMobileList(testPlatform, isRefresh="N", deviceType = "") {
    hx.window.setStatusBarMessage("hbuilderx-for-uniapp-test: 正在获取测试设备列表...", 5000, 'info');
    // console.log("============", testPlatform, global_devicesList, global_devicesList["harmony"]);

    if (isRefresh == "N") {
        if (testPlatform == "all" &&
            global_devicesList["ios_simulator"] != undefined &&
            global_devicesList["ios_phone"] != undefined &&
            global_devicesList["android"] != undefined) {
            return global_devicesList;
        };
        if (testPlatform == "ios") {
            if (global_devicesList["ios_simulator"] != undefined && deviceType == "") {
                return global_devicesList;
            };
            if (global_devicesList["ios_phone"] != undefined && deviceType == "真机") {
                return global_devicesList;
            };
        };
        if (testPlatform == "android" && global_devicesList["android"] != undefined) {
            return global_devicesList;
        };
        if (testPlatform == "harmony" && global_devicesList["harmony"] != undefined) {
            return global_devicesList;
        };
    };

    if (testPlatform == "harmony" && isRefresh == "Y") {
        let h_tmp = await getHarmonyDeivcesListFormCmd();
        global_devicesList["harmony"] = h_tmp;
        return global_devicesList;
    };

    let result = {};
    let is_error = false;
    try {
        result = await getDevicesFormLauncher(testPlatform, isRefresh);
    } catch (error) {
        console.error(error);
        is_error = true
    };
    // console.log("--->", result, is_error);
    // console.error("------[所有的设备]------", result);
    return result;
};

module.exports = api_getMobileList;
