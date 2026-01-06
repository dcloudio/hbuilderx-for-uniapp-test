const { exec } = require('child_process');
const os = require('os');
const hx = require('hbuilderx');
const { createOutputChannel } = require('../core/core.js');

/**
 * @description 执行shell命令
 */
async function execCommand(command) {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                resolve(null);
            } else {
                resolve(stdout.trim());
            }
        });
    });
}

/**
 * @description 检查设备网络状态
 * @param {String} platform 平台 android|ios|harmony
 * @param {String} deviceId 设备ID
 */
async function checkPhoneDeviceNetworkStatus(platform, deviceId) {
    let isConnected = true;
    let deviceWlanData = "";

    try {
        if (platform === 'android') {
            // Check WiFi
            deviceWlanData = await execCommand(`adb -s ${deviceId} shell ifconfig wlan0`);
        } else if (platform === 'harmony') {
            deviceWlanData = await execCommand(`hdc -t ${deviceId} shell ifconfig wlan0`);
        };

        if (deviceWlanData != "") {
            const isCheckInetAddr = deviceWlanData.includes("inet addr:");
            if (!isCheckInetAddr) {
                isConnected = false;
            };
        };
    } catch (e) {
        console.error("Network check failed:", e);
    };
    return isConnected;
};

// checkPhoneDeviceNetworkStatus('android', 'xxx');


/**
 * @description 检测当前连接的电脑，有没有开启全局代理
 */
async function checkComputerProxyStatus() {
    const osName = os.platform();
    let isProxyEnabled = false;

    try {
        if (osName === 'darwin') {
            // macOS
            const proxyState = await execCommand('scutil --proxy');
            if (proxyState) {
                // Check for HTTPEnable : 1 or HTTPSEnable : 1 or SOCKSProxy
                if (proxyState.includes('HTTPEnable : 1') ||
                    proxyState.includes('HTTPSEnable : 1') ||
                    proxyState.includes('SOCKSEnable : 1')) {
                    isProxyEnabled = true;
                }
            }
        } else if (osName === 'win32') {
            // Windows
            const cmd = 'reg query "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable';
            const proxyState = await execCommand(cmd);
            if (proxyState) {
                // Look for 0x1
                if (proxyState.includes('0x1')) {
                    isProxyEnabled = true;
                }
            };
        };
    } catch (e) {
        console.error("Proxy check failed:", e);
    };
    return isProxyEnabled;
};

// checkComputerProxyStatus()


async function checkNetworkStatus(testPlatform, deviceId, consoleMsgPrefix, terminal_id = "") {
    let _colorS = "";
    let _colorE = "";
    if (terminal_id) {
        _colorS = "\x1b[31m";
        _colorE = "\x1b[0m";
    };

    if (["android", "harmony"].includes(testPlatform.toLowerCase())) {

        let logger = createOutputChannel;
        if (terminal_id) {
            logger = async function (message) {
                await hx.cliconsole.log({ clientId: terminal_id, msg: message, status: 'Info' });
            };
        };

        // 检查网络状态
        let deviceNetworkStatus = await checkPhoneDeviceNetworkStatus(testPlatform, deviceId);
        if (deviceNetworkStatus === false) {
            await logger(`${_colorS}${consoleMsgPrefix}检测到 [手机设备] 未开启网络(WiFi)，uni-app 测试框架可能跟设备socket通信失败。如果确认已开启WI-FI，请忽略警告。${_colorE}`, 'warning');
        };

        // 检查本机是否开启代理
        let isProxyEnabled = await checkComputerProxyStatus();
        if (isProxyEnabled === true) {
            await logger(`${_colorS}${consoleMsgPrefix}检测到 [电脑] 开启了代理(VPN)，uni-app 测试框架可能跟设备socket通信失败。如果确认无影响，请忽略警告。${_colorE}`, 'warning');
        };
    };
};

module.exports = checkNetworkStatus;