const hx = require('hbuilderx');
const os = require('os');

const {
    getHarmonyDeivcesListFormCmd
} = require("./cmd_devices.js");

const osName = os.platform();

// 全局：测试设备
global.global_devicesList = {};

var extension_launcher = undefined;
const HBUILDERV_FEATURES_EXTENSION_ID = "dcloud.hbuilderx-uniapp-features";
let extension_features_api;
let extension_features_api_promise;

/** 获取 HBuilderV 内置 uni-app x CLI 公共 API。 */
async function getHBuilderVFeaturesApi() {
    if (extension_features_api) {
        return extension_features_api;
    };
    if (extension_features_api_promise) {
        return extension_features_api_promise;
    };

    extension_features_api_promise = (async function() {
        let extension = hx.extensions && hx.extensions.getExtension
            ? hx.extensions.getExtension(HBUILDERV_FEATURES_EXTENSION_ID)
            : undefined;
        if (!extension) {
            return undefined;
        };
        let api = extension.exports;
        if (!api && typeof extension.activate == "function") {
            api = await extension.activate();
        };
        if (!api || api.version !== 1 || !api.cli ||
            typeof api.cli.createClient !== "function" ||
            typeof api.cli.createCommand !== "function") {
            return undefined;
        };
        extension_features_api = api;
        return api;
    })().catch(function(error) {
        console.error("获取 HBuilderV uni-app x CLI 公共 API 失败：", error);
        return undefined;
    });
    return extension_features_api_promise;
};

/** 去除 CLI JSON 输出中的时间戳和 ANSI 控制字符。 */
function stripCliDecorations(value) {
    return String(value || "")
        .replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, "")
        .replace(/^\d{1,2}:\d{2}:\d{2}\.\d{3}\s+/, "")
        .trim();
};

/** 从带时间戳的 CLI 输出中提取 JSON 载荷。 */
function parseCliJsonPayloads(value) {
    let payloads = [];
    let lines = String(value || "").split(/\r?\n/);
    for (let line of lines) {
        let normalized = stripCliDecorations(line);
        if (!normalized || (normalized[0] !== "{" && normalized[0] !== "[")) {
            continue;
        };
        try {
            payloads.push(JSON.parse(normalized));
        } catch (error) {
            // CLI 日志可能包含尚未完成的 JSON 行，继续尝试其它输出。
        };
    };
    if (payloads.length == 0) {
        let normalized = stripCliDecorations(value);
        try {
            if (normalized[0] == "{" || normalized[0] == "[") {
                payloads.push(JSON.parse(normalized));
            };
        } catch (error) {
            // 解析失败时由调用方按空设备列表处理。
        };
    };
    return payloads;
};

/** 将 CLI 设备载荷转换为现有设备列表使用的结构。 */
function normalizeCliDevices(payload, deviceType) {
    let devices = [];
    if (Array.isArray(payload)) {
        devices = payload;
    } else if (payload && Array.isArray(payload.devices)) {
        devices = payload.devices;
    } else if (payload && Array.isArray(payload.data)) {
        devices = payload.data;
    };
    return devices.map(function(item) {
        if (typeof item == "string") {
            let device = { name: item, version: "", udid: item };
            if (deviceType) {
                device.device_type = deviceType;
            };
            return device;
        };
        if (!item || typeof item != "object") {
            return undefined;
        };
        let device = Object.assign({}, item);
        let udid = device.udid || device.uuid || device.deviceId || device.id || device.serialNumber;
        if (!device.udid && udid) {
            device.udid = udid;
        };
        if (!device.name) {
            device.name = device.deviceName || device.model || udid || "";
        };
        if (!device.version) {
            device.version = device.systemVersion || device.runtimeVersion || "";
        };
        if (deviceType) {
            device.device_type = deviceType;
        };
        return device;
    }).filter(function(item) {
        return item != undefined;
    });
};

/** 通过 HBuilderV 公共 CLI API 获取 Android、iOS 和 Harmony 设备。 */
async function getDevicesFormCli(testPlatform) {
    let api = await getHBuilderVFeaturesApi();
    if (!api) {
        return undefined;
    };

    let queryList = [];
    if (testPlatform == "all" || testPlatform == "ios") {
        queryList.push({ platform: "ios-simulator", key: "ios_simulator", deviceType: "模拟器" });
        queryList.push({ platform: "ios-iPhone", key: "ios_phone", deviceType: "真机" });
    };
    if (testPlatform == "all" || testPlatform == "android") {
        queryList.push({ platform: "android", key: "android", deviceType: "" });
    };
    if (testPlatform == "all" || testPlatform == "harmony") {
        queryList.push({ platform: "app-harmony", key: "harmony", deviceType: "" });
    };
    if (queryList.length == 0) {
        return undefined;
    };

    let successCount = 0;
    await Promise.all(queryList.map(async function(query) {
        try {
            let client = api.cli.createClient();
            let command = api.cli.createCommand("devices", "list")
                .option("--platform", query.platform)
                .booleanOption("--json", true);
            let result = await client.execute(command, {
                timeout: 15000,
                maxBuffer: 2 * 1024 * 1024
            });
            if (!result || result.code !== 0) {
                return;
            };
            let payloads = parseCliJsonPayloads(result.stdout);
            let devices = [];
            for (let payload of payloads) {
                devices = devices.concat(normalizeCliDevices(payload, query.deviceType));
            };
            global_devicesList[query.key] = devices;
            successCount++;
        } catch (error) {
            console.error("获取 " + query.platform + " 设备失败：", error);
        };
    }));
    return successCount > 0 ? global_devicesList : undefined;
};


async function api_getMobileList(testPlatform, isRefresh="N", deviceType = "") {
    hx.window.setStatusBarMessage("hbuilderx-for-uniapp-test: 正在获取测试设备列表...", 5000, 'info');
    // console.log("============", testPlatform, global_devicesList, global_devicesList["harmony"]);

    if (isRefresh == "N") {
        if (testPlatform == "all" &&
            global_devicesList["ios_simulator"] != undefined &&
            global_devicesList["ios_phone"] != undefined &&
            global_devicesList["android"] != undefined &&
            global_devicesList["harmony"] != undefined) {
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

    let result = {};
    let is_error = false;
    try {
        result = await getDevicesFormCli(testPlatform);
        console.log("[获取测试设备]--->", JSON.stringify(result, null, 4), is_error);
        if (result == undefined) {
            if (testPlatform == "harmony" && isRefresh == "Y") {
                let h_tmp = await getHarmonyDeivcesListFormCmd();
                global_devicesList["harmony"] = h_tmp;
                result = global_devicesList;
            };
        };
    } catch (error) {
        console.error(error);
        is_error = true
    };

    // console.error("------[所有的设备]------", result);
    return result;
};

module.exports = api_getMobileList;
