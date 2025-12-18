const hx = require('hbuilderx');
const os = require('os');
const fs = require('fs');
const path = require('path');
const process = require('process');

const get_test_port = require("./utils/get_test_port.js");
const compareHBuilderXVersions = require('./utils/compare_hx_versions.js');
const hxVersion = hx.env.appVersion;

// 版本判断：判断是否支持safari和firefox，因为firefox和safari自动化测试仅支持3.2.10+版本
const hxVersionForDiff = hxVersion.replace('-alpha', '').replace(/.\d{10}/, '');
const cmpVerionForH5 = compareHBuilderXVersions(hxVersionForDiff, '3.2.10');

let config = require('./core/config.js');

const getProjectUnicloudData = require("./core/get_project_unicloud_data.js");
const {
    isUniAppCli,
    isUniAppX,
    getPluginConfig,
    runCmd,
    createOutputViewForHyperLinks,
    createOutputChannel,
    hxShowMessageBox,
    checkCustomTestEnvironmentDependency,
    checkUtsProject,
    readUniappManifestJson
} = require('./core/core.js');

const {
    checkNode
} = require('./utils/utils_public.js');

const {
    mkdirsSync,
    getFileNameForDate
} = require('./utils/utils_files.js');

const editEnvjsFile = require('./core/edit_env_js_file.js');
const modifyJestConfigJSFile = require('./core/edit_jest_config_js_file.js');

const Initialize = require('./Initialize.js');

const {
    getTestDevices,
    get_uniTestPlatformInfo
} = require('./lib/main.js');

const osName = os.platform();

// Constants for platform types
const PLATFORM_TYPES = {
    IOS: 'ios',
    ANDROID: 'android',
    HARMONY: 'harmony',
    H5_CHROME: 'h5-chrome',
    H5_SAFARI: 'h5-safari',
    H5_FIREFOX: 'h5-firefox',
    MP_WEIXIN: 'mp-weixin',
    ALL: 'all'
};

const WEB_PLATFORM_MAP = {
    'web-chrome': 'h5-chrome',
    'web-safari': 'h5-safari',
    'web-firefox': 'h5-firefox'
};

const BROWSER_MAP = {
    'h5-firefox': 'firefox',
    'h5-safari': 'webkit',
    'h5-webkit': 'webkit',
    'h5-chrome': 'chromium'
};

// Module-level state (to be refactored into class properties)
const moduleState = {
    nodeStatus: undefined,
    isUniappCli: false,
    isUniapp3: false,
    isUniappX: false,
    isStopAllTest: false,
    isUseBuiltNodeCompileUniapp: undefined,
    isUseBuiltNodeRunJest: undefined,
    isUtsProject: false,
    isDebug: false,
    unicloudSpacesInfo: [],
    isPrintReportTips: false
};

// Legacy global variable references (for backward compatibility)
let nodeStatus;
var is_uniapp_cli = false;
var is_uniapp_3 = false;
var is_uniapp_x = false;
var isStopAllTest = false;
var isUseBuiltNodeCompileUniapp;
var isUseBuiltNodeRunJest;
var is_uts_project = false;
var isDebug = false;
let unicloud_spaces_info = [];
let is_print_report_tips = false;

class Common {
    /**
     * @description 检查测试环境并设置必要的配置
     *  - 检查本机是否安装node
     *  - 检查插件依赖是否安装完整
     *  - 检查必需插件（uniapp-cli、launcher等）
     * @param {String} platform - 测试平台
     * @param {String} projectPath - 项目路径
     * @returns {Promise<Boolean>} 环境检查通过返回true
     */
    async checkAndSetEnv(platform = undefined, projectPath) {
        // 检查Node.js环境
        await this.checkNodeEnvironment();

        // 检查项目依赖
        const testEnv = await this.checkProjectDependencies(projectPath);

        // 创建必需的目录
        await this.ensureRequiredDirectories();

        // 验证HBuilderX插件
        const requiredPlugins = this.getRequiredPlugins(platform);
        this.validateRequiredPlugins(requiredPlugins);

        // 加载调试配置
        isDebug = await getPluginConfig("hbuilderx-for-uniapp-test.isDebug");
        
        return testEnv;
    };

    /**
     * @description 检查Node.js环境
     * @returns {Promise<void>}
     */
    async checkNodeEnvironment() {
        if (nodeStatus === undefined || nodeStatus === 'N') {
            nodeStatus = await checkNode().catch(error => {
                createOutputChannel(config.i18n.msg_env_node_check, "error");
                return error;
            });
        }
    };

    /**
     * @description 检查项目依赖
     * @param {String} projectPath - 项目路径
     * @returns {Promise<Boolean>}
     */
    async checkProjectDependencies(projectPath) {
        const init = new Initialize();
        
        if (is_uniapp_cli) {
            return await init.checkUniappCliProject(projectPath);
        } else {
            return await init.checkPluginDependencies();
        }
    };

    /**
     * @description 确保必需的目录存在
     * @returns {Promise<void>}
     */
    async ensureRequiredDirectories() {
        // 创建测试报告目录
        await mkdirsSync(config.testReportOutPutDir);

        // 创建UTS缓存目录（如需要）
        if (is_uts_project) {
            await mkdirsSync(config.UTS_USER_DATA_PATH);
        }
    };

    /**
     * @description 获取平台所需的插件列表
     * @param {String} platform - 测试平台
     * @returns {Object} 插件名称和路径的映射
     */
    getRequiredPlugins(platform) {
        const plugins = {};

        // uni-app CLI插件
        if (is_uniapp_3) {
            plugins["uniapp-cli-vite"] = config.UNI_CLI_VITE_PATH;
        } else {
            plugins["uniapp-cli"] = config.UNI_CLI_PATH;
        }

        // Launcher插件（移动平台）
        const mobilePlatforms = [PLATFORM_TYPES.ANDROID, PLATFORM_TYPES.IOS, PLATFORM_TYPES.ALL];
        if (mobilePlatforms.includes(platform)) {
            plugins["launcher"] = config.LAUNCHER_ANDROID;
        }

        // uni-app X 专用插件
        if (is_uniapp_x) {
            plugins["uniappx-launcher"] = config.UNIAPP_X_LAUNCHER_PATH;
        }

        // UTS项目插件
        if (is_uts_project || is_uniapp_x) {
            plugins["uniapp-uts-v1"] = config.UNIAPP_UTS_V1_PATH;
        }

        // Android平台额外插件
        if ([PLATFORM_TYPES.ANDROID, PLATFORM_TYPES.ALL].includes(platform)) {
            plugins["uniapp-runextension"] = config.UNIAPP_RUNEXTENSION_PATH;
            plugins["uts-development-android"] = config.UTS_DEVELOPMENT_ANDROID_PATH;
        }

        return plugins;
    };

    /**
     * @description 验证必需插件是否已安装
     * @param {Object} pluginList - 插件列表
     * @returns {Boolean} 所有插件都已安装返回true
     */
    validateRequiredPlugins(pluginList) {
        let allPluginsInstalled = true;

        for (const [pluginName, pluginPath] of Object.entries(pluginList)) {
            if (!fs.existsSync(pluginPath)) {
                allPluginsInstalled = false;
                const displayName = config.HX_PLUGINS_DISPLAYNAME_LIST[pluginName] || pluginName;
                const message = `[提示]：测试环境检查，未安装 ${pluginName}。点击菜单【工具 - 插件安装】，安装【${displayName}】插件。`;
                createOutputChannel(message, 'info');
            }
        }

        // 显示特定项目类型的警告
        if (!allPluginsInstalled) {
            if (is_uniapp_x) {
                createOutputChannel(config.i18n.msg_warning_uniappx_env, 'info');
            }
            if (is_uts_project) {
                createOutputChannel(config.i18n.msg_warning_uts_env, 'info');
            }
        }

        return allPluginsInstalled;
    };

    /**
     * @description 检查并设置UTS测试环境（适用于iOS和Android平台）
     * @returns {Promise<void>}
     */
    async checkAndSetUTSTestEnv() {
        // 设置Gradle路径
        const gradleHome = await this.getValidConfigPath('uts-development-android.gradleHome');
        if (gradleHome) {
            config.UTS_GRADLE_HOME = gradleHome;
        }

        // 设置Android SDK路径
        const androidSdkDir = await this.getValidConfigPath('uts-development-android.sdkDir');
        if (androidSdkDir) {
            config.UTS_JDK_PATH = androidSdkDir;
        }
    };

    /**
     * @description 获取有效的配置路径（存在且非空）
     * @param {String} configKey - 配置键名
     * @returns {Promise<String|null>} 有效路径或null
     */
    async getValidConfigPath(configKey) {
        const configPath = await getPluginConfig(configKey);
        
        if (configPath && configPath.trim() !== "" && fs.existsSync(configPath)) {
            return configPath;
        }
        
        return null;
    };

    /**
     * @description 获取uniCloud服务空间信息
     * @param {String} projectPath - 项目路径
     * @param {Object} param - 项目参数对象
     * @returns {Promise<void>}
     */
    async getProjectUniCloudInfo(projectPath, param) {
        unicloud_spaces_info = [];

        // 检查是否存在uniCloud目录
        if (!this.hasUniCloudDirectory(projectPath)) {
            return;
        }

        // 获取工作区文件夹
        const workspaceFolder = this.extractWorkspaceFolder(param);
        if (!workspaceFolder) {
            return;
        }

        // 获取uniCloud数据
        try {
            unicloud_spaces_info = await getProjectUnicloudData(workspaceFolder);
        } catch (error) {
            console.error("[自动化测试] 获取uniCloud数据异常:", error);
        }
    };

    /**
     * @description 检查项目是否包含uniCloud目录
     * @param {String} projectPath - 项目路径
     * @returns {Boolean}
     */
    hasUniCloudDirectory(projectPath) {
        const uniCloudDirs = ["uniCloud-tcb", "uniCloud-aliyun", "uniCloud-alipay", "uniCloud-dcloud"];
        return uniCloudDirs.some(dir => fs.existsSync(path.join(projectPath, dir)));
    };

    /**
     * @description 从参数对象中提取工作区文件夹
     * @param {Object} param - 参数对象
     * @returns {Object|null} 工作区文件夹对象或null
     */
    extractWorkspaceFolder(param) {
        return param.workspaceFolder || param.document?.workspaceFolder || null;
    };

    /**
     * @description 获取项目信息并检测项目类型
     * @param {Object} param - 项目管理器或编辑器提供的参数
     * @returns {Promise<Object>} 项目信息对象
     */
    async getProjectInfo(param) {
        // 提取基本项目信息
        const basicInfo = this.extractBasicProjectInfo(param);
        
        // 获取uniCloud配置
        await this.getProjectUniCloudInfo(basicInfo.projectPath, param);

        // 检测项目类型
        await this.detectProjectTypes(basicInfo.projectPath);

        if (isDebug) {
            console.error("[自动化测试] 项目类型检测 - uni-app-x:", is_uniapp_x);
        }

        return {
            projectName: basicInfo.projectName,
            projectPath: basicInfo.projectPath,
            projectType: basicInfo.projectType,
            selectedFile: basicInfo.selectedFile,
            projectVueVersion: basicInfo.projectVueVersion
        };
    };

    /**
     * @description 提取基本项目信息
     * @param {Object} param - 参数对象
     * @returns {Object} 基本项目信息
     */
    extractBasicProjectInfo(param) {
        let projectInfo = {
            projectType: '',
            projectName: '',
            projectPath: '',
            selectedFile: '',
            projectVueVersion: "2"
        };

        try {
            // 优先从workspaceFolder获取
            projectInfo.projectName = param.workspaceFolder.name;
            projectInfo.projectType = param.workspaceFolder.nature;
            projectInfo.projectPath = param.workspaceFolder.uri.fsPath;
            projectInfo.selectedFile = param.fsPath;
        } catch (e) {
            // 回退到document.workspaceFolder
            projectInfo.projectName = param.document.workspaceFolder.name;
            projectInfo.projectPath = param.document.workspaceFolder.uri.fsPath;
            projectInfo.selectedFile = param.document.uri.fsPath;
            projectInfo.projectType = param.document.workspaceFolder.nature;
        }

        return projectInfo;
    };

    /**
     * @description 检测项目类型（CLI、uni-app X、Vue版本等）
     * @param {String} projectPath - 项目路径
     * @returns {Promise<void>}
     */
    async detectProjectTypes(projectPath) {
        // 检测是否为CLI项目
        is_uniapp_cli = await isUniAppCli(projectPath);

        // 检测是否为uni-app X项目
        is_uniapp_x = await isUniAppX(projectPath);

        // uni-app X项目默认使用Vue3和UTS
        if (is_uniapp_x) {
            is_uniapp_3 = true;
            is_uts_project = true;
            return;
        }

        // 非uni-app X项目需要检测Vue版本和UTS
        await this.detectVueVersionAndUTS(projectPath);
    };

    /**
     * @description 检测Vue版本和UTS支持
     * @param {String} projectPath - 项目路径
     * @returns {Promise<void>}
     */
    async detectVueVersionAndUTS(projectPath) {
        // 读取Vue版本
        const manifestData = await readUniappManifestJson(projectPath, is_uniapp_cli, "vueVersion");
        const vueVersion = manifestData?.data;
        is_uniapp_3 = vueVersion === "3";

        // 检测UTS项目
        is_uts_project = await checkUtsProject(projectPath, is_uniapp_cli);
    };

    /**
     * @description 获取测试报告输出目录
     * @param {String} projectName - 项目名称
     * @param {String} testPlatform - 测试平台
     * @returns {Promise<String|Boolean>} 报告目录路径，失败返回false
     */
    async getReportOutputDir(projectName, testPlatform) {
        // 尝试使用用户自定义目录
        const customDir = await this.getCustomReportDirectory(projectName, testPlatform);
        if (customDir !== null) {
            return customDir;
        }

        // 使用默认目录
        return this.getDefaultReportDirectory(projectName, testPlatform);
    };

    /**
     * @description 获取用户自定义的测试报告目录
     * @param {String} projectName - 项目名称
     * @param {String} testPlatform - 测试平台
     * @returns {Promise<String|null|Boolean>} 目录路径、null（未配置）或false（配置无效）
     */
    async getCustomReportDirectory(projectName, testPlatform) {
        const customPath = (await getPluginConfig("hbuilderx-for-uniapp-test.testReportOutPutDir"))?.trim();
        
        if (!customPath) {
            return null;
        }

        // 验证自定义路径是否存在
        if (!fs.existsSync(customPath)) {
            createOutputChannel(config.i18n.invalid_custom_test_report_path);
            return false;
        }

        // 创建项目特定的报告目录
        const reportDir = path.join(customPath, projectName, testPlatform);
        mkdirsSync(reportDir);
        return reportDir;
    };

    /**
     * @description 获取默认测试报告目录
     * @param {String} projectName - 项目名称
     * @param {String} testPlatform - 测试平台
     * @returns {String} 报告目录路径
     */
    getDefaultReportDirectory(projectName, testPlatform) {
        // 首次使用默认目录时显示提示
        if (!is_print_report_tips) {
            is_print_report_tips = true;
            createOutputChannel(config.i18n.msg_warning_test_report_path_tips);
        }

        const reportDir = path.join(config.testReportOutPutDir, projectName, testPlatform);
        mkdirsSync(reportDir);
        return reportDir;
    };

    /**
     * @description 显示【全部平台】测试停止控制界面
     * @param {String} MessagePrefix - 消息前缀（未使用但保留兼容性）
     * @returns {Promise<void>}
     */
    async stopAllTestRun(MessagePrefix) {
        const outputView = hx.window.createOutputView({
            id: "hbuilderx.uniapp.test",
            title: "uni-app自动化测试"
        });
        outputView.show();

        const message = "您选择了【全部平台】测试，如需停止后续测试，请点击: ";
        const stopText = "全部停止";
        
        outputView.appendLine({
            line: `${message}${stopText}\n`,
            level: "info",
            hyperlinks: [{
                linkPosition: {
                    start: message.length,
                    end: message.length + stopText.length
                },
                onOpen: () => {
                    isStopAllTest = true;
                }
            }]
        });
    };

    /**
     * @description 在控制台打印测试报告摘要信息
     * @param {String} consoleMessagePrefix - 控制台消息前缀
     * @param {String} outputFile - 测试报告文件路径
     * @returns {Promise<void>}
     */
    async printTestReportSummary(consoleMessagePrefix, outputFile) {
        try {
            // 清除require缓存以获取最新报告数据
            delete require.cache[require.resolve(outputFile)];
            const report = require(outputFile);
            
            const {
                numTotalTestSuites = 0,
                numRuntimeErrorTestSuites = 0,
                numPassedTestSuites = 0,
                numFailedTestSuites = 0
            } = report;
            
            const summaryMessage = this.formatTestSummary(
                consoleMessagePrefix,
                numTotalTestSuites,
                numPassedTestSuites,
                numFailedTestSuites,
                numRuntimeErrorTestSuites
            );
            
            createOutputChannel(summaryMessage);
        } catch (error) {
            // 静默失败 - 报告文件可能尚未生成或格式不正确
            console.error('[自动化测试] 读取测试报告失败:', error.message);
        }
    };

    /**
     * @description 格式化测试摘要消息
     * @param {String} prefix - 消息前缀
     * @param {Number} total - 总测试套件数
     * @param {Number} passed - 通过测试套件数
     * @param {Number} failed - 失败测试套件数
     * @param {Number} errors - 异常测试套件数
     * @returns {String} 格式化的摘要消息
     */
    formatTestSummary(prefix, total, passed, failed, errors) {
        return `${prefix}测试用例总计：${total}，` +
               `运行通过 ${passed}，运行失败 ${failed}，运行异常 ${errors}`;
    };

    /**
     * @description 检测uni-app X项目是否使用DOM2模式
     * @param {String} projectPath - 项目路径
     * @param {Boolean} isUniappCli - 是否为CLI项目
     * @returns {Promise<Boolean>} 使用DOM2返回true
     */
    async uniapp_x_is_dom2(projectPath, isUniappCli) {
        try {
            const manifestData = await readUniappManifestJson(projectPath, isUniappCli, "uni-app-x");
            return manifestData?.data?.vapor || false;
        } catch (error) {
            if (isDebug) {
                console.error("[自动化测试] 检测DOM2模式失败:", error);
            }
            return false;
        }
    }
};


class RunTest extends Common {
    constructor() {
        super();
        this.projectName = '';
        this.projectPath = '';
        this.UNI_AUTOMATOR_CONFIG = '';
        this.raw_argv_uni_platform = "";
    };

    /**
     * @description 设置自定义测试环境变量, 如下: NODE_LIB_PATH、CROSS_ENV_PATH、JEST_PATH
     */
    async setTestCustomEnvironmentVariables() {
        // 配置项：获取用户是否设置使用内置Node版本进行uni-app编译
        isUseBuiltNodeCompileUniapp = await getPluginConfig('hbuilderx-for-uniapp-test.uniappCompileNodeType');

        // 配置项：获取用户是否设置使用内置Node版本进行jest测试
        isUseBuiltNodeRunJest = await getPluginConfig('hbuilderx-for-uniapp-test.jestNodeType');

        let isCustom = await checkCustomTestEnvironmentDependency();
        if (isCustom) {
            config.NODE_LIB_PATH = isCustom;
            config.CROSS_ENV_PATH = path.join(isCustom, "cross-env/src/bin/cross-env.js");
            config.JEST_PATH = path.join(isCustom, "jest/bin/jest.js");
        };
    };

    /**
     * @description 将测试平台名称标准化为显示名称
     * @param {String} testPlatform - 测试平台标识
     * @returns {String} 标准化的平台显示名称
     */
    normalizePlatformDisplayName(testPlatform) {
        const platformName = testPlatform;
        // 将 h5-* 格式转换为 web-* 格式以保持一致性
        if (platformName.startsWith('h5-')) {
            return platformName.replace('h5-', 'web-');
        }
        return platformName;
    };

    /**
     * @description 生成控制台消息前缀
     * @param {String} testPlatform - 测试平台
     * @param {String} deviceId - 设备ID（可选）
     * @returns {String} 格式化的消息前缀
     */
    async getConsoleMessagePrefix(testPlatform, deviceId) {
        // 截断过长的设备ID以保持日志整洁
        const truncatedDeviceId = this.truncateDeviceId(deviceId);
        
        if (deviceId) {
            return `[${this.projectName}:${testPlatform}-${truncatedDeviceId}]`;
        }
        return `[${this.projectName}:${testPlatform}]`;
    };

    /**
     * @description 截断设备ID以适应控制台显示
     * @param {String} deviceId - 设备ID
     * @returns {String} 截断后的设备ID
     */
    truncateDeviceId(deviceId) {
        if (!deviceId || deviceId.length < 8) {
            return deviceId;
        }
        return deviceId.substring(0, 6) + '..';
    };

    /**
     * @description 根据测试平台设置UNI_OS_NAME和UNI_PLATFORM环境变量
     * @param {String} testPlatform - 测试平台标识
     * @returns {Promise<{UNI_OS_NAME: String|undefined, UNI_PLATFORM: String}>}
     */
    async setPlatformEnvironmentVariables(testPlatform) {
        let uniOsName;
        let uniPlatform = testPlatform;

        // 移动应用平台
        if (testPlatform === PLATFORM_TYPES.IOS || testPlatform === PLATFORM_TYPES.ANDROID) {
            uniOsName = testPlatform;
            uniPlatform = 'app-plus';
        } 
        // Harmony平台
        else if (testPlatform === PLATFORM_TYPES.HARMONY) {
            uniOsName = 'harmony';
            uniPlatform = 'app-harmony';
        } 
        // H5/Web平台
        else if (testPlatform.startsWith('h5-')) {
            uniPlatform = 'h5';
        }
        
        return { 
            UNI_OS_NAME: uniOsName, 
            UNI_PLATFORM: uniPlatform 
        };
    };

    /**
     * @description 从env.js中加载自定义环境变量
     * @param {Object} cmdOpts - 命令选项对象，包含环境变量
     * @param {String} configPath - 配置文件路径（备用参数）
     * @returns {Boolean} 加载成功返回true，失败返回false
     */
    loadCustomEnv(cmdOpts, configPath) {
        const envJsPath = this.UNI_AUTOMATOR_CONFIG || configPath;
        
        try {
            // 清除require缓存以获取最新配置
            delete require.cache[require.resolve(envJsPath)];
            const envConfig = require(envJsPath);
            const customEnv = envConfig.UNI_TEST_CUSTOM_ENV;
            
            // 验证自定义环境变量是否为对象
            if (this.isPlainObject(customEnv)) {
                this.mergeCustomEnvironmentVariables(cmdOpts.env, customEnv);
            }
            
            return true;
        } catch (error) {
            createOutputChannel(
                `${envJsPath} 测试配置文件可能存在语法错误，请检查。错误详情: ${error.message}`, 
                'error'
            );
            return false;
        }
    };

    /**
     * @description 检查是否为纯对象
     * @param {*} obj - 要检查的对象
     * @returns {Boolean}
     */
    isPlainObject(obj) {
        return obj != null && Object.prototype.toString.call(obj) === '[object Object]';
    };

    /**
     * @description 合并自定义环境变量到命令选项
     * @param {Object} targetEnv - 目标环境变量对象
     * @param {Object} customEnv - 自定义环境变量对象
     */
    mergeCustomEnvironmentVariables(targetEnv, customEnv) {
        Object.entries(customEnv).forEach(([key, value]) => {
            if (isDebug) {
                console.log(`[自动化测试] 设置自定义环境变量: ${key} = ${value}`);
            }
            targetEnv[key] = value;
        });
    };

    /**
     * @description 选择要运行测试的移动设备
     * @param {String} testPlatform - 测试平台
     * @returns {Promise<Array|undefined>} 设备列表或undefined（错误情况）
     */
    async selectTestDevices(testPlatform) {
        const deviceList = await getTestDevices(testPlatform);
        
        if (isDebug) {
            console.error("[自动化测试] 连接的设备:", deviceList);
            console.error("[自动化测试] 全局设置:", global_uniSettings);
        }

        // 处理设备选择错误
        if (deviceList === "-1") {
            return undefined;
        }

        if (deviceList === 'error') {
            await hxShowMessageBox('测试提醒', '选择设备时发生错误，请联系插件作者', ['关闭']);
            return undefined;
        }

        // 验证设备选择
        return this.validateDeviceSelection(deviceList, testPlatform);
    };

    /**
     * @description 验证设备选择是否有效
     * @param {Array|String} deviceList - 设备列表
     * @param {String} testPlatform - 测试平台
     * @returns {Array|undefined}
     */
    validateDeviceSelection(deviceList, testPlatform) {
        const isNoDeviceSelected = deviceList === 'noSelected' || 
                                   JSON.stringify(deviceList) === '[]';
        
        // 全部平台测试但未选择设备
        if (isNoDeviceSelected && testPlatform === PLATFORM_TYPES.ALL) {
            createOutputChannel(
                `您选择了【${testPlatform}】测试，但是未选择任何设备，测试中止。`, 
                'warning'
            );
            return undefined;
        }

        // 移动平台测试但未选择设备
        const isMobilePlatform = [PLATFORM_TYPES.IOS, PLATFORM_TYPES.ANDROID].includes(testPlatform);
        if (isMobilePlatform && (!deviceList || deviceList.length === 0)) {
            createOutputChannel(
                `您选择了【${testPlatform}】测试，但是未选择相关手机设备，测试中止。`, 
                'warning'
            );
            return undefined;
        }

        return deviceList;
    };

    /**
     * @description 测试运行执行方法
     * @param {String} testPlatform - 测试平台, ios|android|h5|mp-weixin
     * @param {String} deviceId - 手机设备iD （主要用户控制台日志打印）
     */
    async run_uni_test(testPlatform, deviceId) {

        let envJSArgs = {
            "is_uniapp_x": is_uniapp_x
        };
        let result = await editEnvjsFile(this.UNI_AUTOMATOR_CONFIG, testPlatform, deviceId, envJSArgs).catch(error => {
            console.error("[error]....", error);
            createOutputChannel(`${testPlatform}，修改项目下测试配置文件 env.js出错，请检查！`, 'error');
            return false;
        });
        if (result == false) return;

        // 测试报告输出文件
        const ouputDir = await this.getReportOutputDir(this.projectName, testPlatform);
        if (ouputDir == false) return;

        const filename = getFileNameForDate();
        const filePrefix = deviceId ? `${deviceId}-` : '';
        let outputFile = path.join(ouputDir, `${filePrefix}${filename}.json`);

        // 环境变量：用于传递给编译器。用于最终测试报告展示
        let uniTestPlatformInfo = await get_uniTestPlatformInfo(testPlatform, deviceId);

        // 环境变量：UNI_OS_NAME字段用于android、ios平台测试
        const { UNI_OS_NAME, UNI_PLATFORM } = await this.setPlatformEnvironmentVariables(testPlatform);

        // 环境变量：测试端口
        let UNI_AUTOMATOR_PORT = await get_test_port().catch(() => {
            return 9520;
        });

        // 环境变量：命令行运行
        let cmdOpts = {
            cwd: this.projectPath,
            env: {
                "HOME": process.env.HOME,
                "PATH": process.env.PATH,
                "NODE_PATH": config.NODE_LIB_PATH,
                "NO_COLOR": true,
                "UNI_CLI_PATH": config.UNI_CLI_PATH,
                "UNI_AUTOMATOR_CONFIG": this.UNI_AUTOMATOR_CONFIG,
                "UNI_PLATFORM": UNI_PLATFORM,
                "HX_Version": hxVersion,
                "uniTestProjectName": this.projectName,
                "uniTestPlatformInfo": uniTestPlatformInfo,
                "UNI_AUTOMATOR_PORT": UNI_AUTOMATOR_PORT,
                "HX_CONFIG_ADB_PATH": "",
                // "LANG": "en_US.UTF-8",
                // "LC_ALL": "en_US.UTF-8"
                // "UNI_APP_X": false
            },
            maxBuffer: 2000 * 1024
        };

        let is_dom2 = await this.uniapp_x_is_dom2(this.projectPath, is_uniapp_cli);
        if (typeof is_dom2 === 'boolean' && is_dom2) {
            cmdOpts["env"]["UNI_APP_X_DOM2"] = true;
        };

        if (['android', 'ios', "harmony"].includes(UNI_OS_NAME)) {
            cmdOpts["env"]["UNI_OS_NAME"] = UNI_OS_NAME;
        };

        // 2024/9/20 在env.js中扩展UNI_TEST_CUSTOM_ENV字段，从中读取自定义环境变量，并传递给自动化测试框架
        const _loadResult = this.loadCustomEnv(cmdOpts, this.UNI_AUTOMATOR_CONFIG)
        if (!_loadResult) {
            createOutputChannel(`${this.UNI_AUTOMATOR_CONFIG} 测试配置文件, 可能存在语法错误，请检查。`, 'error');
            return;
        };

        // 2025-03-31 hello-uniapp-x项目，增加下列环境变量，以便测试unipush
        if (testPlatform == 'harmony') {
            const envKeys = ["UNI_getui_appid", "UNI_harmony_client_id", "UNI_getui_verify_appid"];
            envKeys.forEach(key => {
                if (cmdOpts["env"]?.[key] === undefined) {
                    cmdOpts["env"][key] = "";
                }
            });
        };

        // 配置项：获取用户是否设置使用内置adb路径
        const hx_config_adb_path = await getPluginConfig('adb.path');
        if (hx_config_adb_path && fs.existsSync(hx_config_adb_path)) {
            cmdOpts.env.HX_CONFIG_ADB_PATH = hx_config_adb_path;
        };

        // 配置项：UNIAPPX_KOTLIN_COMPILER_MEMORY
        const hx_config__uniappx_kotlin_compiler_memory = await getPluginConfig('uniappx.kotlin.compiler.memory');
        if (hx_config__uniappx_kotlin_compiler_memory && /^\d+$/.test(hx_config__uniappx_kotlin_compiler_memory)) {
            cmdOpts.env.UNIAPPX_KOTLIN_COMPILER_MEMORY = hx_config__uniappx_kotlin_compiler_memory;
        };

        // console.error("unicloud_spaces_info =>", JSON.stringify(unicloud_spaces_info));
        if (unicloud_spaces_info.length > 0) {
            cmdOpts.env.UNI_CLOUD_SPACES = JSON.stringify(unicloud_spaces_info);
        };

        // automator:* 用于uniapp编译器，可以输出更多详细的自动化测试日志
        if (isDebug) {
            cmdOpts.env.DEBUG = "automator:*";
        };

        // 是否是vue3，决定UNI_CLI_PATH值
        if (is_uniapp_3) {
            cmdOpts.env.UNI_CLI_PATH = config.UNI_CLI_VITE_PATH;
            config.UNI_CLI_ENV = path.join(config.UNI_CLI_VITE_PATH, 'node_modules/@dcloudio/uni-automator/dist/environment.js');
            config.UNI_CLI_teardown = path.join(config.UNI_CLI_VITE_PATH, 'node_modules/@dcloudio/uni-automator/dist/teardown.js');
        };

        // 判断是否是uts项目，如果是，则传递uts需要的变量
        if (is_uts_project || testPlatform == 'harmony') {
            cmdOpts.env.JDK_PATH = config.UTS_JDK_PATH;
            cmdOpts.env.GRADLE_HOME = config.UTS_GRADLE_HOME;
            cmdOpts.env.APP_ROOT = config.UTS_APP_ROOT;
            cmdOpts.env.HX_APP_ROOT = config.UTS_APP_ROOT;
            cmdOpts.env.USER_DATA_PATH = config.UTS_USER_DATA_PATH;

            // 2023-01-31 如下两个参数，暂时无用。以后可能用得到。先不清除。
            cmdOpts.env.UNIAPP_RUNEXTENSION_PATH = config.UNIAPP_RUNEXTENSION_PATH;
            cmdOpts.env.UNIAPP_UTS_V1_PATH = config.UNIAPP_UTS_V1_PATH;

            // HBulderX 3.98+，增加UNI_UTS_PLATFORM
            if (testPlatform.substring(0, 2) == "h5") {
                cmdOpts.env.UNI_UTS_PLATFORM = "web";
            };
            if (["ios", "android", "harmony"].includes(testPlatform)) {
                cmdOpts.env.UNI_UTS_PLATFORM = `app-${testPlatform}`;
            };
            if (testPlatform.substring(0, 2) == "mp") {
                cmdOpts.env.UNI_UTS_PLATFORM = testPlatform;
            };
        };

        // HBuilderX 3.2.10+，h5测试增加safari和firefox支持
        if (BROWSER_MAP[testPlatform]) {
            cmdOpts.env.BROWSER = BROWSER_MAP[testPlatform];
        };

        // 当用户设置使用内置Node编译uni-app项目时，则输入UNI_NODE_PATH
        if (isUseBuiltNodeCompileUniapp) {
            cmdOpts["env"]["UNI_NODE_PATH"] = config.HBuilderX_BuiltIn_Node_Path;
        } else {
            createOutputChannel(config.i18n.msg_env_hx_built_in_node, 'info');
        };
        // 当用户设置使用内置Node运行jest时
        let jest_for_node = "node";
        if (isUseBuiltNodeRunJest) {
            jest_for_node = config.HBuilderX_BuiltIn_Node_Path;
        };

        // node: 当本机未安装node时，将使用HBuilderX内置的node运行自动化测试。反之，本机安装了node，则使用本机的node。
        if (nodeStatus == 'N' || nodeStatus == undefined) {
            let symbols = osName == 'darwin' ? ":" : ";";
            let PATH = process.env.PATH + symbols + config.HBuilderX_BuiltIn_Node_Dir
            cmdOpts["env"]["PATH"] = PATH;
        };

        // 适用于uni-app普通项目
        let cmd = [
            `${config.JEST_PATH}`, "-i", "--forceExit", "--json",
            `--outputFile="${outputFile}"`,
            `--env="${config.UNI_CLI_ENV}"`, `--globalTeardown="${config.UNI_CLI_teardown}"`
        ];

        // 适用于uniapp-cli项目
        if (is_uniapp_cli) {
            delete cmdOpts.env.NODE_PATH;
            delete cmdOpts.env.UNI_CLI_PATH;
            let cliJest = path.join(this.projectPath, 'node_modules/jest/bin/jest.js');
            cmd = [
                `${cliJest}`, "-i", "--forceExit", "--json",
                `--outputFile="${outputFile}"`
            ];
        };

        let platformDisplayName = this.normalizePlatformDisplayName(testPlatform);
        let consoleMsgPrefix = await this.getConsoleMessagePrefix(platformDisplayName, deviceId);
        createOutputChannel(`${consoleMsgPrefix}开始在 ${tpl} 平台运行测试 ....`, 'info');
        createOutputChannel(`${consoleMsgPrefix}测试运行日志，请在【uni-app自动化测试 - 运行日志】控制台查看。`, 'info');

        if (testPlatform == 'mp-weixin') {
            createOutputChannel(`${consoleMsgPrefix}${config.i18n.weixin_tools_running_tips}`, 'warning');
        };

        let testInfo = {"projectName": this.projectName, "testPlatform": testPlatform, "deviceId": deviceId};
        let testResult = await runCmd(jest_for_node, cmd, cmdOpts, testInfo, isDebug);

        if (testResult == 'run_end') {
            // 不要改此处的文本
            if (fs.existsSync(outputFile)) {
                createOutputViewForHyperLinks(`${consoleMsgPrefix}测试报告:${outputFile}`, 'info');
                await this.printTestReportSummary(consoleMsgPrefix, outputFile);
                createOutputChannel(`${consoleMsgPrefix}测试运行结束。\n`, "success");
            } else {
                createOutputChannel(`${consoleMsgPrefix}测试运行结束。详细日志请参考运行日志。\n`, "error");
            };
        };
    };

    /**
     * @description 在多个设备上运行测试
     * @param {String} testPlatform - 测试平台 [iOS|android|all]
     * @param {Array} testDevicesList - 测试设备列表
     * @returns {Promise<void>}
     */
    async runTestOnMultipleDevices(testPlatform, testDevicesList) {
        if (isStopAllTest) {
            return;
        }

        if (!testDevicesList || testDevicesList === 'noSelected' || testDevicesList.length === 0) {
            return;
        }

        for (const deviceInfo of testDevicesList) {
            if (isStopAllTest) {
                break;
            }

            const { platform, deviceId } = this.parseDeviceInfo(deviceInfo);
            
            // H5和小程序平台不需要设备ID
            if (['h5', 'mp'].includes(platform)) {
                await this.run_uni_test(deviceId);
            } else {
                await this.run_uni_test(platform, deviceId);
            }
        }

        if (isStopAllTest) {
            createOutputChannel(`【全部平台】测试，后续测试已停止\n`, 'success');
        }
    };

    /**
     * @description 解析设备信息字符串
     * @param {String} deviceInfo - 格式: "platform:deviceId" 或 "platform:h5-chrome"
     * @returns {{platform: String, deviceId: String}}
     */
    parseDeviceInfo(deviceInfo) {
        const parts = deviceInfo.split(':');
        const platform = parts[0];
        // 处理设备ID可能包含冒号的情况（如iOS设备）
        const deviceId = parts.slice(1).join(':');
        
        return { platform, deviceId };
    };

    /**
     * @description 运行测试前的环境和参数验证
     * @param {String} uniPlatform - 测试平台
     * @param {Object} param - 项目参数
     * @returns {Promise<Boolean>} 验证通过返回true，否则返回undefined
     */
    async validateTestEnvironment(uniPlatform, param) {
        // 验证H5浏览器版本要求
        if (!this.validateBrowserVersionRequirement(uniPlatform)) {
            return undefined;
        }

        // 验证项目选择
        if (!this.validateProjectSelection(param)) {
            return undefined;
        }

        // 验证操作系统兼容性
        if (!this.validateOSCompatibility(uniPlatform)) {
            return undefined;
        }

        // 验证HBuilderX安装路径
        if (!this.validateHBuilderXPath()) {
            return undefined;
        }

        return true;
    };

    /**
     * @description 验证浏览器版本要求
     * @param {String} platform - 测试平台
     * @returns {Boolean}
     */
    validateBrowserVersionRequirement(platform) {
        const requiresNewVersion = [PLATFORM_TYPES.H5_FIREFOX, PLATFORM_TYPES.H5_SAFARI].includes(platform);
        if (requiresNewVersion && cmpVerionForH5 < 0) {
            createOutputChannel(config.i18n.env_h5_test_version_prompt, 'warning');
            return false;
        }
        return true;
    };

    /**
     * @description 验证项目选择
     * @param {Object} param - 项目参数
     * @returns {Boolean}
     */
    validateProjectSelection(param) {
        if (!param) {
            hx.window.showErrorMessage("请在项目管理器选中项目后再试。", ["我知道了"]);
            return false;
        }
        return true;
    };

    /**
     * @description 验证操作系统兼容性
     * @param {String} platform - 测试平台
     * @returns {Boolean}
     */
    validateOSCompatibility(platform) {
        if (osName !== 'darwin' && platform === PLATFORM_TYPES.IOS) {
            hxShowMessageBox('提醒', config.i18n.env_win32_not_support_ios_testing);
            return false;
        }
        return true;
    };

    /**
     * @description 验证HBuilderX安装路径
     * @returns {Boolean}
     */
    validateHBuilderXPath() {
        if (config.HBuilderX_PATH.indexOf(" ") !== -1) {
            createOutputChannel(config.i18n.hx_install_path_space_prompt, 'warning');
            return false;
        }
        return true;
    };

    /**
     * @description 测试用例运行主入口文件
     * @param {Object} param 项目管理器或编辑器选中的信息
     * @param {String} UNI_PLATFORM 测试平台: android | ios | all | mp-weixin | web-browser
     * @param {String} scope 测试用例的运行范围：all（运行全部测试用例） | one（运行单个测试用例）
     */
    async main(param, UNI_PLATFORM, scope = "all") {
        // console.log("[main] ->", param, UNI_PLATFORM, scope);
        // 初始化变量，用于停止测试
        this.StopAllTest = false;

        // 注意：以前叫h5, 后来uni-app x测试改成web。 为了兼容以前的命令行参数，不做修改。
        this.raw_argv_uni_platform = UNI_PLATFORM;
        const argv_uniPlatform = WEB_PLATFORM_MAP[UNI_PLATFORM] || UNI_PLATFORM;
        
        if (isDebug) {
            console.error("[自动化测试] 运行平台参数 argv_uniPlatform =", argv_uniPlatform);
        }

        let beforeResult = await this.validateTestEnvironment(argv_uniPlatform, param);
        if (beforeResult != true) return;

        // 获取项目名称、项目路径、uni-app Vue版本
        let {
            projectName,
            projectPath,
            selectedFile,
            projectVueVersion
        } = await this.getProjectInfo(param);
        this.projectPath = projectPath;
        this.projectName = projectName;
        this.projectVueVersion = projectVueVersion;
        this.UNI_AUTOMATOR_CONFIG = path.join(this.projectPath, 'env.js');

        // 设置自定义的测试环境变量， 如果无，则使用默认值
        await this.setTestCustomEnvironmentVariables();

        // 检查：HBuilderX测试环境，包含插件是否安装完整、测试依赖库是否安装等
        let env = await this.checkAndSetEnv(argv_uniPlatform, projectPath);
        if (!env) return;

        // 运行：到iOS和android
        if (['all', 'android'].includes(argv_uniPlatform) && is_uts_project){
            let checkUTS = await this.checkAndSetUTSTestEnv();
            if (checkUTS == false) return;
        };

        let testPhoneList = [];
        if (['all', 'ios', 'android', 'harmony'].includes(argv_uniPlatform)) {
            const sResult = await this.selectTestDevices(argv_uniPlatform);
            // console.error("=====>", sResult);
            if (sResult == undefined || sResult == "noSelected") return;
            testPhoneList = sResult;
        };

        if (argv_uniPlatform == 'all') {
            // let pmsg = Array.isArray(testPhoneList) ? testPhoneList.join(' ') : '';
            createOutputChannel(`您选择了【全部平台】测试，将依次运行测试到各个平台 ......`, 'success');
            this.stopAllTestRun();
        };

        // 修改测试范围: 即全部测试、仅测试某个页面
        let proj = {
            "projectPath": projectPath,
            "selectedFile": selectedFile,
            "is_uniapp_cli": is_uniapp_cli
        };
        let changeResult = await modifyJestConfigJSFile(scope, proj);
        if (changeResult == false) return;

        // 注意：以前叫h5, 后来uni-app x要求改名为web。为了兼容以前的命令行参数，虽然入参是web，但是转化为h5。
        // 根据平台类型执行相应的测试
        await this.executePlatformTest(argv_uniPlatform, testPhoneList);
    };

    /**
     * @description 根据平台类型执行测试
     * @param {String} platform - 测试平台
     * @param {Array} deviceList - 设备列表（用于移动平台）
     * @returns {Promise<void>}
     */
    async executePlatformTest(platform, deviceList) {
        // Web平台测试
        const webPlatforms = ['h5', PLATFORM_TYPES.H5_CHROME, PLATFORM_TYPES.H5_SAFARI, PLATFORM_TYPES.H5_FIREFOX];
        if (webPlatforms.includes(platform)) {
            // h5兼容旧版本，默认使用chrome
            const actualPlatform = platform === 'h5' ? PLATFORM_TYPES.H5_CHROME : platform;
            await this.run_uni_test(actualPlatform);
            return;
        }

        // 小程序平台测试
        if (platform === PLATFORM_TYPES.MP_WEIXIN) {
            await this.run_uni_test(platform);
            return;
        }

        // 移动平台测试（需要设备列表）
        const mobilePlatforms = [
            PLATFORM_TYPES.IOS, 
            PLATFORM_TYPES.ANDROID, 
            PLATFORM_TYPES.HARMONY, 
            PLATFORM_TYPES.ALL
        ];
        if (mobilePlatforms.includes(platform)) {
            await this.runTestOnMultipleDevices(platform, deviceList);
            return;
        }

        // 未知平台
        if (isDebug) {
            console.warn(`[自动化测试] 未知的测试平台: ${platform}`);
        }
    };
}

module.exports = {
    RunTest
};
