const {
    exec
} = require('child_process');
const fs = require("fs");
const os = require("os");
const path = require("path");
const hx = require('hbuilderx');

const appRoot = hx.env.appRoot;
const osName = os.platform();

var adbPath = "adb";
var hdcPath = "hdc";

/**
 * @description 获取插件配置
 */
async function getPluginConfig(options) {
    let config = await hx.workspace.getConfiguration();
    return config.get(options);
};

/**
 * @description 获取的adb路径。如果设置中用户配置了adb，则使用用户配置的数据。
 */
async function getAdbPath() {
    const hx_config_adb_path = await getPluginConfig('adb.path');
    if (hx_config_adb_path && fs.existsSync(hx_config_adb_path)) {
        adbPath = hx_config_adb_path;
        return;
    };

    let plugin_dir = path.join(appRoot, "plugins");
    let adb_releative_path = path.join("tools", "adbs", "adb");
    if (osName == "win32") {
        adb_releative_path = path.join("tools", "adbs", "adb.exe");
    };
    let path_1 = path.join(plugin_dir, "launcher-tools", adb_releative_path);
    let path_2 = path.join(plugin_dir, "launcher", adb_releative_path);
    if (fs.existsSync( path_1)) {
        adbPath = path_1;
    };
    if (fs.existsSync( path_2)) {
        adbPath = path_2;
    };
};

/**
 * @description 获取hdc路径
 */
async function getHdcPath() {
    const harmony_devTools_dir = await getPluginConfig('harmony.devTools.path');
    let cfg_hdcPath = path.join(harmony_devTools_dir, "Contents/sdk/default/openharmony/toolchains/hdc");
    if (osName == "win32") {
        cfg_hdcPath = path.join(harmony_devTools_dir, "sdk/default/openharmony/toolchains/hdc.exe");
    }
    // console.log("--> cfg_hdcPath", cfg_hdcPath);
    if (harmony_devTools_dir && fs.existsSync(cfg_hdcPath)) {
        hdcPath = cfg_hdcPath;
    };
    return;
};

/**
 * @description 运行cmd命令行
 * @param {string} cmd
 */
function runCmdAsync(programPath, cmd, format="array") {
    cmd = programPath + " " + cmd;
    return new Promise((resolve, reject) => {
        exec(cmd, {
            env: { ...process.env }
        }, function(error, stdout, stderr) {
            if (error) {
                console.error(`执行命令时出错： ${error}`);
                reject(error);
                return;
            };
            // console.log("cmd output =", stdout);
            let lines = stdout.trim().split('\n');
            if (format == "format") {
                lines = stdout.trim();
            };
            resolve(lines);
        });
    });
};

/**
 * @description 获取Android 设备操作系统版本号
 * @param {Object} serno android设备序列号
 */
async function getAndroidDeviceOSInfo(serno) {
    const cmd = `-s ${serno} shell getprop ro.build.version.release`;
    try{
        let stdout = await runCmdAsync(adbPath, cmd);
        if (stdout.length > 0){
            stdout = stdout[0].trim();
        };
        if (/^\d+(\.\d+){0,2}$/.test(stdout)) {
            return stdout;
        };
        return "error";
    }catch(e){
        return "error";
    };
};

/**
 * @description 获取Android 设备列表
 * @return {Array}
 */
async function getAndroidDeivcesListFormCmd() {
    await getAdbPath();
    let devices = [];
    try {
        const output = await runCmdAsync(adbPath, "devices -l");
        for (let i = 1; i < output.length; i++) {
            const [deviceInfo, state] = output[i].split(' device ');
            const serno = deviceInfo.split(' ')[0];
            if (serno.length > 0) {
                const osInfo = await getAndroidDeviceOSInfo(serno);
                if (osInfo != 'error') {
                    devices.push({"version": osInfo, "udid": serno});
                }
            };
        };
        return devices;
    } catch (error) {
        return [];
    };
};

/**
 * @description 获取Harmony 设备列表
 * @return {Array}
 */
async function getHarmonyDeivcesListFormCmd() {
    await getHdcPath();
    let devices = [];

    try {
        const output = await runCmdAsync(hdcPath, "list targets -v");
        for (let s of output) {
            if (s && s.includes("localhost") && s.includes("Connected")) {
                const serno = s.split('\t')[0];
                let name = "";
                if (serno) {
                    name = await runCmdAsync(hdcPath, `-t ${serno} shell param get const.product.name`, 'string');
                };
                devices.push({"name": name, "version": "", "udid": serno});
            };
        };
        // console.log(devices);
        return devices;
    } catch (error) {
        return [];
    };
};

module.exports = {
    getAndroidDeivcesListFormCmd,
    getHarmonyDeivcesListFormCmd
};
