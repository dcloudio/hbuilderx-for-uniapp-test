const fs = require('fs');
const hx = require('hbuilderx');
let config = require('./config.js');
const {
    createOutputChannel,
    getPluginConfig
} = require('./core.js');

const {
    fsWriteFile
} = require('../utils/utils_files.js');

/**
 * @description 修改测试配置文件env.js， ios和android测试需要在env.js指定设备ID
 *
 * @param {String} env_js_path - 测试配置文件路径
 * @param {String} testPlatform - 测试平台，如：ios、android、mp-weixin、harmony
 * @param {String} deviceId - 设备信息，数据格式 ios:xxxxxx  android:xxxxxx
 * @param {Object} uniProjectInfo - uni-app项目信息
 *
 * @returns {Boolean} - 修改成功返回true，失败返回false
 */
async function editEnvjsFile(env_js_path="", testPlatform="", deviceId="", uniProjectInfo={}, terminal_id) {
    let { is_uniapp_x } = uniProjectInfo;
    // console.log("===========", is_uniapp_x);
    let logger = createOutputChannel;
    if (terminal_id) {
        logger = async function (message) {
            await hx.cliconsole.log({ clientId: terminal_id, msg: message, status: 'Info' });
        };
        await logger(`[uniapp.test] 修改测试配置文件: ${env_js_path}`);
    };

    try {
        delete require.cache[require.resolve(env_js_path)];
        var envjs = require(env_js_path);
    } catch (e) {
        await logger(`${env_js_path} 测试配置文件, 可能存在语法错误，请检查。`);
        return false;
    };
    if (testPlatform.includes("h5")) return true;

    if (testPlatform == "mp-weixin") {
        const weixin_executablePath = envjs?.["mp-weixin"]?.executablePath;
        if (!weixin_executablePath || !fs.existsSync(weixin_executablePath)) {
            const _e_msg = `${env_js_path}, 请检查mp-weixin节点下的executablePath, 建议配置微信小程序路径。${config.i18n.weixin_tool_path_tips}`;
            await logger( _e_msg, 'error');
            return false;
        };
        return true;
    };

    let launcherExecutablePath = "";
    if (testPlatform == 'android') {
        launcherExecutablePath = is_uniapp_x ? config.UNIAPP_X_LAUNCHER_ANDROID : config.LAUNCHER_ANDROID;
    };

    // ios真机、模拟器，所需的文件不一样。由于uni-app测试框架不支持ios真机。这里暂不区分。
    if (testPlatform == 'ios') {
        launcherExecutablePath = is_uniapp_x ? config.UNIAPP_X_LAUNCHER_IOS : config.LAUNCHER_IOS;;
    };

    // harmony自动化测试，需要获取devEco的路径。需求来源: 马权、王振法
    if (testPlatform == 'harmony') {
        try {
            if (is_uniapp_x) {
                launcherExecutablePath = envjs['app-plus']['uni-app-x'][testPlatform]['executablePath'];
            } else {
                launcherExecutablePath = envjs['app-plus'][testPlatform]['executablePath'];
            };
        } catch (error) {};
        if (launcherExecutablePath == undefined || launcherExecutablePath == "") {
            launcherExecutablePath = await getPluginConfig("harmony.devTools.path");
        };
    };

    // 设置自动化测试基座类型：自定义基座、标准基座。自定义基座需要用户手动设置基座路径。不再修改executablePath路径。
    // 当isCustomRuntime = false 和 undefined 时，默认修改executablePath为标准基座路径
    let isCustomRuntime = envjs["is-custom-runtime"];

    if (is_uniapp_x) {
        let oldLauncherVersion = envjs["app-plus"]?.["uni-app-x"]?.version;
        if (oldLauncherVersion == undefined || oldLauncherVersion.trim() == '' || oldLauncherVersion != config.UNIAPP_X_LAUNCHER_VERSION_TXT) {
            envjs['app-plus']['uni-app-x'] = {};
            envjs['app-plus']['uni-app-x']['version'] = config.UNIAPP_X_LAUNCHER_VERSION_TXT;
        };
    } else {
        let oldLauncherVersion = envjs['app-plus']['version'];
        if (oldLauncherVersion.trim() == '' || oldLauncherVersion == undefined || oldLauncherVersion != config.LAUNCHER_VERSION_TXT) {
            envjs['app-plus']['version'] = config.LAUNCHER_VERSION_TXT;
        };
    };

    let oldPhoneData = is_uniapp_x ?
        envjs['app-plus']['uni-app-x']?.[testPlatform] :
        envjs['app-plus'][testPlatform];

    if (oldPhoneData == undefined || typeof oldPhoneData != 'object') {
        oldPhoneData = {};
    };

    let {id,executablePath} = oldPhoneData;
    // console.log("=======", oldPhoneData, launcherExecutablePath);

    if (id != deviceId || executablePath != launcherExecutablePath) {
        if (is_uniapp_x) {
            if (envjs['app-plus']['uni-app-x'][testPlatform] == undefined) {
                envjs['app-plus']['uni-app-x'][testPlatform] = {};
            };
            envjs['app-plus']['uni-app-x'][testPlatform]["id"] = deviceId;
            if (isCustomRuntime == false || isCustomRuntime == undefined) {
                envjs['app-plus']['uni-app-x'][testPlatform]["executablePath"] = launcherExecutablePath;
            };
        } else {
            if (envjs['app-plus'][testPlatform] == undefined) {
                envjs['app-plus'][testPlatform] = {};
            };
            envjs['app-plus'][testPlatform]['id'] = deviceId;
            if (isCustomRuntime == false || isCustomRuntime == undefined) {
                envjs['app-plus'][testPlatform]['executablePath'] = launcherExecutablePath;
            };
        };
        // 将修改的配置写入文件
        let tmp_data = JSON.stringify(envjs, null, 4);
        let lastContent = `module.exports = ${tmp_data}`;
        let writeResult = await fsWriteFile(env_js_path, lastContent);

        if (writeResult != 'success') {
            await logger(`将测试设备（ $deviceInfo ）信息写入 ${envjs} 文件时失败，终止后续操作。`, 'warning');
            return false;
        };
    };
    return true;
};

module.exports = editEnvjsFile;
