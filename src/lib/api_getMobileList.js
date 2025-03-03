const hx = require('hbuilderx');
const os = require('os');

const {
    getHarmonyDeivcesListFormCmd
} = require("./cmd_devices.js");

const osName = os.platform();

// 测试设备
global.global_devicesList = {};

var extension_launcher = undefined;

/**
 * @description 通过Api hx.app.getMobileList, 获取当前电脑连接的手机设备
 * @description {Sting} testPlatform [ios|android|all]
 * @returns {Object} 手机列表 {"ios": [], "android": []}
 */
let PLATFORM_ANDROID = 0x00000001;
let PLATFORM_ANDROID_SIMULATOR = 0x00000002;
let PLATFORM_IOS = 0x00000004;
let PLATFORM_IOS_SIMULATOR = 0x00000008;
let PLATFORM_ALL = 0x00000010;
async function getMobileList(testPlatform, isRefresh="N") {
    let deviceType = PLATFORM_ALL;
    if (testPlatform == 'ios') {
        deviceType = PLATFORM_IOS_SIMULATOR;
    };
    if (testPlatform == 'android') {
        deviceType = PLATFORM_ANDROID | PLATFORM_ANDROID_SIMULATOR;
    };
    if (testPlatform == 'all') {
        deviceType = osName == 'darwin' ? PLATFORM_ANDROID | PLATFORM_ANDROID_SIMULATOR | PLATFORM_IOS_SIMULATOR :
            PLATFORM_ANDROID | PLATFORM_ANDROID_SIMULATOR;
    };
    let platform = {
        "platform": deviceType
    };
    let data = await hx.app.getMobileList(platform).then(data => {
        return data;
    });

    try{
        // 先这样，后期在区分修改
        if (data.hasOwnProperty("android_simulator")) {
            data["android"] = [...data["android"], ...data["android_simulator"]]
        };
    }catch(e){};

    try {
        let {ios_simulator} = data;
        if (ios_simulator != undefined && ios_simulator.length) {
            let tmp = ios_simulator.filter(n => {
                return !(n.name).includes('Apple Watch') && !(n.name).includes('iPad') && !(n.name)
                    .includes('Apple TV') && !(n.name).includes('iPod touch');
            });
            data['ios_simulator'] = tmp.reverse();
        };
        global_devicesList = data;
        return data;
    } catch (e) {
        global_devicesList = data;
        return data;
    }
};

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
        let ios_simulator_list = await extension_launcher.getDevices({ platform:'IOS_SIMULATOR'});
        if (ios_simulator_list && ios_simulator_list.length > 0){
            global_devicesList["ios_simulator"] = ios_simulator_list;
        };
    };
    if (testPlatform == "all" || testPlatform == 'android') {
        let _android_list = await extension_launcher.getDevices({ platform:'android'});
        if (_android_list && _android_list.length > 0){
            global_devicesList["android"] = _android_list;
        };
    };
    if (testPlatform == "all" || testPlatform == 'harmony') {
        let _harmony_list = await extension_launcher.getDevices({ platform:'app-harmony'});
        if (_harmony_list && _harmony_list.length > 0){
            global_devicesList["harmony"] = _harmony_list;
        };
    };
    return global_devicesList;
};


async function api_getMobileList(testPlatform, isRefresh="N") {
    hx.window.setStatusBarMessage("hbuilderx-for-uniapp-test: 正在获取测试设备列表...", 5000, 'info');
    // console.log("============", testPlatform, global_devicesList)

    if (isRefresh == "N") {
        if (testPlatform == "all" &&
            global_devicesList["ios_simulator"] != undefined &&
            global_devicesList["android"] != undefined) {
            return global_devicesList;
        };
        if (testPlatform == "ios" && global_devicesList["ios_simulator"] != undefined) {
            return global_devicesList;
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

    if (is_error) {
        try {
            result = await getMobileList(testPlatform, isRefresh);
        } catch (error) {}
    };
    return result;
};

module.exports = api_getMobileList;
