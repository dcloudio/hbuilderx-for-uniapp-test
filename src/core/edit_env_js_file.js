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

const PLATFORM = {
    H5: 'h5',
    ANDROID: 'android',
    IOS: 'ios',
    HARMONY: 'harmony',
    MP_WEIXIN: 'mp-weixin'
};

/**
 * @description 创建日志记录器
 * @param {String} terminalId - 终端ID
 * @returns {Function} 日志记录函数
 */
function createLogger(terminalId) {
    if (!terminalId) {
        return createOutputChannel;
    }
    return async function(message, status = 'Info') {
        await hx.cliconsole.log({ clientId: terminalId, msg: message, status });
    };
}

/**
 * @description 加载env.js配置文件
 * @param {String} envJsPath - 配置文件路径
 * @returns {Object|null} 配置对象，加载失败返回null
 */
function loadEnvConfig(envJsPath) {
    try {
        delete require.cache[require.resolve(envJsPath)];
        return require(envJsPath);
    } catch (e) {
        return null;
    }
}

/**
 * @description 获取启动器路径
 * @param {String} testPlatform - 测试平台
 * @param {Boolean} isUniappX - 是否为uni-app x项目
 * @param {Object} envjs - env.js配置对象
 * @returns {Promise<String>} 启动器路径
 */
async function getLauncherPath(testPlatform, isUniappX, envjs) {
    const launcherConfig = {
        [PLATFORM.ANDROID]: {
            uniappX: config.UNIAPP_X_LAUNCHER_ANDROID,
            normal: config.LAUNCHER_ANDROID
        },
        // ios真机、模拟器，所需的文件不一样。由于uni-app测试框架不支持ios真机。这里暂不区分。
        [PLATFORM.IOS]: {
            uniappX: config.UNIAPP_X_LAUNCHER_IOS,
            normal: config.LAUNCHER_IOS
        }
    };

    if (launcherConfig[testPlatform]) {
        const platformConfig = launcherConfig[testPlatform];
        return isUniappX ? platformConfig.uniappX : platformConfig.normal;
    }

    // harmony自动化测试，需要获取devEco的路径。需求来源: 马权、王振法
    if (testPlatform === PLATFORM.HARMONY) {
        const harmonyPath = getHarmonyExecutablePath(envjs, isUniappX, testPlatform);
        if (harmonyPath) {
            return harmonyPath;
        }
        return await getPluginConfig("harmony.devTools.path");
    }

    return "";
}

/**
 * @description 获取鸿蒙平台的executablePath
 * @param {Object} envjs - env.js配置对象
 * @param {Boolean} isUniappX - 是否为uni-app x项目
 * @param {String} testPlatform - 测试平台
 * @returns {String} 可执行文件路径
 */
function getHarmonyExecutablePath(envjs, isUniappX, testPlatform) {
    try {
        if (isUniappX) {
            return envjs['app-plus']['uni-app-x'][testPlatform]['executablePath'];
        }
        return envjs['app-plus'][testPlatform]['executablePath'];
    } catch (error) {
        return "";
    }
}

/**
 * @description 获取平台配置节点的引用
 * @param {Object} envjs - env.js配置对象
 * @param {Boolean} isUniappX - 是否为uni-app x项目
 * @returns {Object} 平台配置节点
 */
function getPlatformConfigNode(envjs, isUniappX) {
    if (!envjs['app-plus']) {
        envjs['app-plus'] = {};
    }
    if (isUniappX) {
        if (!envjs['app-plus']['uni-app-x']) {
            envjs['app-plus']['uni-app-x'] = {};
        }
        return envjs['app-plus']['uni-app-x'];
    }
    return envjs['app-plus'];
}

/**
 * @description 更新版本信息
 * @param {Object} envjs - env.js配置对象
 * @param {Boolean} isUniappX - 是否为uni-app x项目
 */
function updateVersionInfo(envjs, isUniappX) {
    if (!envjs['app-plus']) {
        envjs['app-plus'] = {};
    }
    if (isUniappX) {
        const oldVersion = envjs['app-plus']?.['uni-app-x']?.version;
        const targetVersion = config.UNIAPP_X_LAUNCHER_VERSION_TXT;
        if (!oldVersion || oldVersion.trim() === '' || oldVersion !== targetVersion) {
            envjs['app-plus']['uni-app-x'] = {};
            envjs['app-plus']['uni-app-x']['version'] = targetVersion;
        }
    } else {
        const oldVersion = envjs['app-plus']['version'];
        const targetVersion = config.LAUNCHER_VERSION_TXT;
        if (!oldVersion || oldVersion.trim() === '' || oldVersion !== targetVersion) {
            envjs['app-plus']['version'] = targetVersion;
        }
    }
}

/**
 * @description 获取旧的设备配置数据
 * @param {Object} envjs - env.js配置对象
 * @param {Boolean} isUniappX - 是否为uni-app x项目
 * @param {String} testPlatform - 测试平台
 * @returns {Object} 设备配置数据
 */
function getOldPhoneData(envjs, isUniappX, testPlatform) {
    try {
        const data = isUniappX
            ? envjs['app-plus']['uni-app-x']?.[testPlatform]
            : envjs['app-plus'][testPlatform];
        return (data && typeof data === 'object') ? data : {};
    } catch (error) {
        return {};
    }
}

/**
 * @description 更新设备配置
 * @param {Object} envjs - env.js配置对象
 * @param {Boolean} isUniappX - 是否为uni-app x项目
 * @param {String} testPlatform - 测试平台
 * @param {String} deviceId - 设备ID
 * @param {String} launcherPath - 启动器路径
 * @param {Boolean} isCustomRuntime - 是否自定义基座
 */
function updateDeviceConfig(envjs, isUniappX, testPlatform, deviceId, launcherPath, isCustomRuntime) {
    const configNode = getPlatformConfigNode(envjs, isUniappX);

    if (!configNode[testPlatform]) {
        configNode[testPlatform] = {};
    }

    configNode[testPlatform]['id'] = deviceId;

    // 设置自动化测试基座类型：自定义基座、标准基座。自定义基座需要用户手动设置基座路径。不再修改executablePath路径。
    // 当isCustomRuntime = false 和 undefined 时，默认修改executablePath为标准基座路径
    if (!isCustomRuntime) {
        configNode[testPlatform]['executablePath'] = launcherPath;
    }
}

/**
 * @description 将配置写入文件
 * @param {String} envJsPath - 配置文件路径
 * @param {Object} envjs - 配置对象
 * @returns {Promise<Boolean>} 写入是否成功
 */
async function writeEnvConfig(envJsPath, envjs) {
    const jsonData = JSON.stringify(envjs, null, 4);
    const content = `module.exports = ${jsonData}`;
    const result = await fsWriteFile(envJsPath, content);
    return result === 'success';
}

/**
 * @description 处理微信小程序平台配置
 * @param {Object} envjs - env.js配置对象
 * @param {String} envJsPath - 配置文件路径
 * @param {Function} logger - 日志函数
 * @returns {Promise<Boolean>} 处理结果
 */
async function handleWeixinPlatform(envjs, envJsPath, logger) {
    const weixinPath = envjs?.[PLATFORM.MP_WEIXIN]?.executablePath;
    if (!weixinPath || !fs.existsSync(weixinPath)) {
        const errorMsg = `${envJsPath}, 请检查mp-weixin节点下的executablePath, 建议配置微信小程序路径。${config.i18n.weixin_tool_path_tips}`;
        await logger(errorMsg, 'error');
        return false;
    }
    return true;
}

/**
 * @description 修改测试配置文件env.js， ios和android测试需要在env.js指定设备ID
 *
 * @param {String} envJsPath - 测试配置文件路径
 * @param {String} testPlatform - 测试平台，如：ios、android、mp-weixin、harmony
 * @param {String} deviceId - 设备信息，数据格式 ios:xxxxxx  android:xxxxxx
 * @param {Object} uniProjectInfo - uni-app项目信息
 * @param {String} terminalId - 终端ID
 *
 * @returns {Promise<Boolean>} - 修改成功返回true，失败返回false
 */
async function editEnvjsFile(envJsPath = "", testPlatform = "", deviceId = "", uniProjectInfo = {}, terminalId) {
    const { is_uniapp_x: isUniappX } = uniProjectInfo;
    const logger = createLogger(terminalId);

    if (terminalId) {
        await logger(`[uniapp.test] 修改测试配置文件: ${envJsPath}`);
    }

    const envjs = loadEnvConfig(envJsPath);
    if (!envjs) {
        await logger(`${envJsPath} 测试配置文件, 可能存在语法错误，请检查。`);
        return false;
    }

    // H5平台无需修改配置
    if (testPlatform.includes(PLATFORM.H5)) {
        return true;
    }

    // 微信小程序平台特殊处理
    if (testPlatform === PLATFORM.MP_WEIXIN) {
        return await handleWeixinPlatform(envjs, envJsPath, logger);
    }

    const launcherPath = await getLauncherPath(testPlatform, isUniappX, envjs);
    const isCustomRuntime = envjs["is-custom-runtime"];

    updateVersionInfo(envjs, isUniappX);

    const oldPhoneData = getOldPhoneData(envjs, isUniappX, testPlatform);
    const { id: oldId, executablePath: oldPath } = oldPhoneData;

    // 检查是否需要更新配置
    const needsUpdate = oldId !== deviceId || oldPath !== launcherPath;
    if (!needsUpdate) {
        return true;
    }

    updateDeviceConfig(envjs, isUniappX, testPlatform, deviceId, launcherPath, isCustomRuntime);

    const writeSuccess = await writeEnvConfig(envJsPath, envjs);
    if (!writeSuccess) {
        await logger(`将测试设备（ ${deviceId} ）信息写入 ${envJsPath} 文件时失败，终止后续操作。`, 'warning');
        return false;
    }

    return true;
}

module.exports = editEnvjsFile;
