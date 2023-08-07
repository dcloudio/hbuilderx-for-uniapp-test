const {
    exec
} = require('child_process');
const fs = require("fs");
const path = require("path");
const hx = require('hbuilderx');

const appRoot = hx.env.appRoot;
var adbPath = "adb";

/**
 * @description 获取hx自带的adb路径
 */
async function getAdbPath() {
    let plugin_dir = path.join(appRoot, "plugins");
    let adb_releative_path = path.join("tools", "adbs", "adb");

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
 * @description 运行cmd命令行
 * @param {string} cmd
 */
function runADBCmdAsync(cmd) {
    cmd = adbPath + " " + cmd;
    return new Promise((resolve, reject) => {
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                console.error(`执行命令时出错： ${error}`);
                reject(error);
                return;
            }
            const lines = stdout.trim().split('\n');
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
        let stdout = await runADBCmdAsync(cmd);
        if (stdout.length > 0){
            stdout = stdout[0].trim();
        };
        if (/^\d+\.\d+\.\d+$/.test(stdout)) {
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
        const output = await runADBCmdAsync("devices -l");
        for (let i = 1; i < output.length; i++) {
            const [deviceInfo, state] = output[i].split(' device ');
            const serno = deviceInfo.split(' ')[0];
            if (serno.length > 0) {
                const osInfo = await getAndroidDeviceOSInfo(serno);
                if (osInfo != 'error') {
                    devices.push({"version": osInfo, "uuid": serno});
                }
            };
        };
        return devices;
    } catch (error) {
        return [];
    };
};

module.exports = getAndroidDeivcesListFormCmd;
