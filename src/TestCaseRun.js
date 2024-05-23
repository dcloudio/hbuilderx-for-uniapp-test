const hx = require('hbuilderx');
const os = require('os');
const fs = require('fs');
const path = require('path');
const process = require('process');

const get_test_port = require("./lib/get_test_port.js");
const cmp_hx_version = require('./lib/cmp_version.js');
const hxVersion = hx.env.appVersion;

// 版本判断：判断是否支持safari和firefox，因为firefox和safari自动化测试仅支持3.2.10+版本
const hxVersionForDiff = hxVersion.replace('-alpha', '').replace(/.\d{8}/, '');
const cmpVerionForH5 = cmp_hx_version(hxVersionForDiff, '3.2.10');

let config = require('./config.js');

const {
    isUniAppCli,
    isUniAppX,
    writeFile,
    mkdirsSync,
    getFileNameForDate,
    getPluginConfig,
    runCmd,
    createOutputViewForHyperLinks,
    createOutputChannel,
    hxShowMessageBox,
    checkNode,
    checkCustomTestEnvironmentDependency,
    checkUtsProject,
    readUniappManifestJson
} = require('./lib/utils.js');

const Initialize = require('./Initialize.js');

const {
    getTestDevices,
    get_uniTestPlatformInfo
} = require('./lib/showTestDeviceWindows.js');

const osName = os.platform();

// 检查本机是否安装node: 当本机未安装node时，将使用HBuilderX内置的node运行自动化测试。反之，本机安装了node，则使用本机的node。
let nodeStatus;

// 是否是uniapp-cli项目
var is_uniapp_cli = false;

// 是否是uniapp vue3项目
var is_uniapp_3 = false;

// 判断是否是uniapp-x项目
var is_uniapp_x = false;

// 是否全部停止测试运行
var isStopAllTest = false;

// 配置项：获取用户是否设置使用内置Node版本进行uni-app编译
var isUseBuiltNodeCompileUniapp;

// 配置项：获取用户是否设置使用HBuilderX内置的Node运行jest测试程序
var isUseBuiltNodeRunJest;

// 临时变量，判断是否是uts项目
var is_uts_project = false;

// 是否正在调试，当勾选后，将会在控制台输出更多日志
var isDebug = false;

// unicloud服务信息
let unicloud_spaces_info = [];

class Common {
    /**
     * @description 检查电脑环境
     *  - 检查电脑本机是否安装node
     *  - 检查插件运行，相关依赖是否安装完整
     *  - 检查是否安装uniapp-cli、launcher
     * @param {String} platform - 测试平台，ios|android|h5|mp-weixin
     * @param {String} projectPath - 项目路径，用于判断uniapp-cli环境
     */
    async checkAndSetEnv(platform = undefined, projectPath) {
        let testEnv = true;
        if (nodeStatus == undefined || nodeStatus == 'N') {
            nodeStatus = await checkNode().catch(error => {
                createOutputChannel(config.i18n.msg_env_node_check, "error");
                return error;
            });
        };

        // 检查插件依赖
        let init = new Initialize();
        if (is_uniapp_cli) {
            testEnv = await init.checkUniappCliProject(projectPath);
        } else {
            testEnv = await init.checkPluginDependencies();
        };

        // 检查测试报告目录是否存在，如不存在则创建
        await mkdirsSync(config.testReportOutPutDir);

        // 检查uts cache目录，如不存在则自动创建
        if (is_uts_project) {
            await mkdirsSync(config.UTS_USER_DATA_PATH);
        };

        // 检查是否安装uniapp-cli、launcher
        var plugin_list = {};

        // check：运行自动化测试需要安装的插件
        if (is_uniapp_3) {
            plugin_list["uniapp-cli-vite"] = config.UNI_CLI_VITE_PATH;
        } else {
            plugin_list["uniapp-cli"] = config.UNI_CLI_PATH;
        };

        if (["android", "ios", "all"].includes(platform)) {
            plugin_list["launcher"] = config.LAUNCHER_ANDROID;
        };

        if (is_uts_project) {
            plugin_list["uniapp-runextension"] = config.UNIAPP_RUNEXTENSION_PATH;
            plugin_list["uniapp-uts-v1"] = config.UNIAPP_UTS_V1_PATH;
            plugin_list["uts-development-android"] = config.UTS_DEVELOPMENT_ANDROID_PATH;
        };

        if (is_uniapp_x) {
            plugin_list["uniappx-launcher"] = config.UNIAPP_X_LAUNCHER_PATH;
        };

        // 判断是否安装测试环境必须的插件
        for (let e of Object.keys(plugin_list)) {
            if (!fs.existsSync(plugin_list[e])) {
                testEnv = false;
                const pluginDisplayName = config.HX_PLUGINS_DISPLAYNAME_LIST[e] ? config.HX_PLUGINS_DISPLAYNAME_LIST[e] : e;
                const log_for_plugin = `[提示]：测试环境检查，未安装 ${e} 。点击菜单【工具 - 插件安装】，安装【${pluginDisplayName}】插件。`;
                createOutputChannel(log_for_plugin, 'info');
            };
        };

        if (testEnv == false && is_uniapp_x) {
            createOutputChannel(config.i18n.msg_warning_uniappx_env, 'info');
        };
        if (testEnv == false && is_uts_project) {
            createOutputChannel(config.i18n.msg_warning_uts_env, 'info');
        };

        // 检查测试报告
        let userSet = await getPluginConfig("hbuilderx-for-uniapp-test.testReportOutPutDir");
        if ((userSet == undefined || userSet.trim() == '') && (osName == 'win32')) {
            createOutputChannel(config.i18n.msg_warning_test_report_path_check, 'info');
            return false;
        };
        isDebug = await getPluginConfig("hbuilderx-for-uniapp-test.isDebug");
        return testEnv;
    };

    /**
     * @description 检查并设置UTS运行环境（ios和android）
     */
    async checkAndSetUTSTestEnv() {
        let path_gradleHome = await getPluginConfig('uts-development-android.gradleHome');
        if (path_gradleHome != undefined && path_gradleHome.trim() != "" && fs.existsSync(path_gradleHome)) {
            config.UTS_GRADLE_HOME = path_gradleHome;
        };

        let path_Android_sdkDir = await getPluginConfig('uts-development-android.sdkDir');
        if (path_Android_sdkDir != undefined && path_Android_sdkDir.trim() != "" && fs.existsSync(path_Android_sdkDir)) {
            config.UTS_JDK_PATH = path_Android_sdkDir;
        };
    };

    /**
     * @description 获取unicloud服务信息
     * @param {String} projectPath
     * @param {Object} param
     */
    async getProjectUniCloudInfo(projectPath, param) {
        unicloud_spaces_info = [];
        if ( !fs.existsSync(path.join(projectPath, "uniCloud-tcb")) && !fs.existsSync(path.join(projectPath, "uniCloud-aliyun")) && !fs.existsSync(path.join(projectPath, "uniCloud-alipay")) ) {
            return;
        };

        let workspaceFolder = param.workspaceFolder;
        if (!workspaceFolder) {
            workspaceFolder = param.document.workspaceFolder
        };
        if (!workspaceFolder) { return };

        let uniCloud_info = await hx.unicloud.getExistsUnicloudAndBindSpace({"workspaceFolder": workspaceFolder});
        let allSpaces = uniCloud_info.allSpaces;
        if (allSpaces && allSpaces.length > 0) {
            unicloud_spaces_info = allSpaces
        };
    };

    /**
     * 获取项目管理器选中的信息，并推测项目类型（比如是否是uniapp-cli、是否是uniapp-x）
     * @param {Object} param
     * @returns {Object}
     */
    async getProjectInfo(param) {
        let projectType, projectName, projectPath, selectedFile;
        let projectVueVersion = "2";
        try {
            projectName = param.workspaceFolder.name;
            projectType = param.workspaceFolder.nature;
            projectPath = param.workspaceFolder.uri.fsPath;
            selectedFile = param.fsPath;
        } catch (e) {
            projectName = param.document.workspaceFolder.name;
            projectPath = param.document.workspaceFolder.uri.fsPath;
            selectedFile = param.document.uri.fsPath;
            projectType = param.document.workspaceFolder.nature;
        };

        await this.getProjectUniCloudInfo(projectPath, param);

        // 判断项目类型：uni-app普通项目、uniapp-cli项目
        is_uniapp_cli = await isUniAppCli(projectPath);

        // 判断项目类型 uni-app普通项目、uni-appx项目
        is_uniapp_x = await isUniAppX(projectPath);
        console.error("是否是uniapp-x", is_uniapp_x);

        // 非uni-app-x项目，才需要判断这些。uni-app-x默认就是vue3
        if (!is_uniapp_x) {
            // 从manifest.json获取 vueVersion
            let file_data = await readUniappManifestJson(projectPath, is_uniapp_cli, "vueVersion");
            let { data } = file_data;

            // 判断项目是vue2 还是vue3
            is_uniapp_3 = data == "3" ? true : false;

            // 判断项目是否是uts项目
            is_uts_project = await checkUtsProject(projectPath, is_uniapp_cli);
        };

        if (is_uniapp_x) {
            is_uniapp_3 = true;
            is_uts_project = true;
        };

        return {
            "projectName": projectName,
            "projectPath": projectPath,
            "projectType": projectType,
            "selectedFile": selectedFile,
            "projectVueVersion": projectVueVersion
        };
    };

    // 获取测试报告目录
    async getReportOutputDir(projectName, testPlatform) {
        // 创建默认的测试报告目录
        let projectReportDir = path.join(config.testReportOutPutDir, projectName, testPlatform);
        mkdirsSync(projectReportDir);

        let userSet = await getPluginConfig("hbuilderx-for-uniapp-test.testReportOutPutDir");
        if (userSet != undefined && userSet.trim() != '') {
            if (!fs.existsSync(userSet)) {
                createOutputChannel(config.i18n.invalid_custom_test_report_path, 'error');
                return false;
            };
        } else {
            return projectReportDir;
        };

        let UserProjectReportDir = path.join(userSet, projectName, testPlatform);
        mkdirsSync(UserProjectReportDir);
        return UserProjectReportDir;
    };

    // 用于【全部平台】测试停止运行
    async stopAllTestRun(MessagePrefix) {
        let outputView = hx.window.createOutputView({
            id: "hbuilderx.uniapp.test",
            title: "uni-app自动化测试"
        });
        outputView.show();

        let msg = "您选择了【全部平台】测试，如需停止后续测试，请点击: ";
        outputView.appendLine({
            line: msg + "全部停止\n",
            level: "info",
            hyperlinks:[
                {
                    linkPosition: {
                        start: msg.length,
                        end: (msg + '全部停止').length
                    },
                    onOpen: function() {
                        isStopAllTest = true;
                    }
                }
            ]
        });
    };

    /**
     * @description 控制台打印测试报告某些信息
     * @param {String} outputFile - 测试报告路径
     */
    async printTestReport(consoleMessagePrefix, outputFile) {
        try {
            let report = require(outputFile);
            let {
                numTotalTestSuites,
                numRuntimeErrorTestSuites,
                numPassedTestSuites,
                numFailedTestSuites
            } = report;
            let msg = `${consoleMessagePrefix}测试用例总计：${numTotalTestSuites}，运行通过 ${numPassedTestSuites}，运行失败 ${numFailedTestSuites}，运行异常 ${numRuntimeErrorTestSuites}`;
            createOutputChannel(msg);
        } catch (e) { };
    };
};


class RunTest extends Common {
    constructor() {
        super();
        this.projectName = '';
        this.projectPath = '';
        this.UNI_AUTOMATOR_CONFIG = '';
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
     * @description 修改测试配置文件env.js， ios和android测试需要在env.js指定设备ID
     * @param {String} testPlatform
     * @param {String} deviceId - 设备信息，数据格式 ios:xxxxxx  android:xxxxxx
     */
    async editEnvjsFile(testPlatform, deviceId) {
        let env_js_path = this.UNI_AUTOMATOR_CONFIG;
        try {
            delete require.cache[require.resolve(env_js_path)];
            var envjs = require(env_js_path);
        } catch (e) {
            createOutputChannel(`${env_js_path} 测试配置文件, 可能存在语法错误，请检查。`, 'error')
            return false;
        };

        if (testPlatform.includes("h5")) return true;
        if (testPlatform == "mp-weixin") {
            let weixin_executablePath = envjs?.["mp-weixin"]?.executablePath;
            if (!weixin_executablePath || weixin_executablePath == "" || !fs.existsSync(weixin_executablePath)) {
                createOutputChannel(`${env_js_path} 测试配置文件, 请检查mp-weixin节点下的executablePath`, 'error')
                return false;
            };
            return true;
        };

        let launcherExecutablePath;
        if (testPlatform == 'android') {
            launcherExecutablePath = is_uniapp_x ? config.UNIAPP_X_LAUNCHER_ANDROID : config.LAUNCHER_ANDROID;
        };

        // ios真机、模拟器，所需的文件不一样。由于uni-app测试框架不支持ios真机。这里暂不区分。
        if (testPlatform == 'ios') {
            launcherExecutablePath = is_uniapp_x ? config.UNIAPP_X_LAUNCHER_IOS : config.LAUNCHER_IOS;;
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
        let oldPhoneData = is_uniapp_x
            ? envjs['app-plus']['uni-app-x']?.[testPlatform]
            : envjs['app-plus'][testPlatform];

        if (oldPhoneData == undefined || typeof oldPhoneData != 'object') {
            oldPhoneData = {};
        };

        let { id,executablePath } = oldPhoneData;
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
                envjs['app-plus'][testPlatform]['id'] = deviceId;
                if (isCustomRuntime == false || isCustomRuntime == undefined) {
                    envjs['app-plus'][testPlatform]['executablePath'] = launcherExecutablePath;
                };
            };
            // 将修改的配置写入文件
            let tmp_data = JSON.stringify(envjs, null, 4);
            let lastContent = `module.exports = ${tmp_data}`;
            let writeResult = await writeFile(env_js_path, lastContent);

            if (writeResult != 'success') {
                createOutputChannel(`将测试设备（ $deviceInfo ）信息写入 ${envjs} 文件时失败，终止后续操作。`, 'warning');
                return false;
            };
        };
        return true;
    };

    /**
     * @description 修改jest.config.js testMatch字段
     * @param {String} scope - 测试范围，全部测试|单一用例测试
     * @param {Object} proj - 项目信息
     */
    async modifyJestConfigJSFile(scope, proj) {
        // 读取jest.config.js
        let jest_config_js_path = path.join(this.projectPath, 'jest.config.js');
        delete require.cache[require.resolve(jest_config_js_path)];
        try{
            var jestConfigContent = require(jest_config_js_path);
        }catch(e){
            createOutputChannel(`测试配置文件 ${jest_config_js_path} 应用异常，请检查。`, 'error');
            return false;
        };

        // 插件配置项：是否自动修改jest.config.js文件中的testMatch
        let userConfig = await getPluginConfig('hbuilderx-for-uniapp-test.AutomaticModificationTestMatch');
        if (userConfig == false) return;

        let { projectPath, selectedFile } = proj;
        let projectTestMatch = is_uniapp_cli
            ? "<rootDir>/src/pages/**/*test.[jt]s?(x)"
            : "<rootDir>/pages/**/*test.[jt]s?(x)";

        // one：代指仅测试单条用例
        if (scope == 'one') {
            let testcase_file_relative_path = selectedFile.slice(projectPath.length + 1);
            projectTestMatch = `<rootDir>/${testcase_file_relative_path}`;

            // 用于特定测试项目：dcloud-uts和uni-api
            let test_js_path = path.basename(selectedFile) + ".test.js";
            if (testcase_file_relative_path.substr(0,19) == "pages/autotest/uni-" && fs.existsSync(path.join(selectedFile, test_js_path))) {
                projectTestMatch = `<rootDir>/${testcase_file_relative_path}/${test_js_path}`;
            };
        };

        let oldTestMatch = jestConfigContent["testMatch"];
        if (!Array.isArray(oldTestMatch)) {
            createOutputChannel(`${jest_config_js_path} 测试配置文件, testMatch字段，应为数组类型，请检查。`, 'error')
            return false;
        };

        try {
            if (oldTestMatch[0] == projectTestMatch) {
                return true;
            };
            let jestFileContent = fs.readFileSync(jest_config_js_path, 'utf-8');

            // 替换: testMatch，此项决定了测试范围
            let replaceText = `testMatch: ["${projectTestMatch}"]`;
            let lastContent = jestFileContent.replace(/testMatch\s*:{1}\s*\[\S*\]/gi, replaceText);

            let writeResult = await writeFile(jest_config_js_path, lastContent);
            if (writeResult != 'success') {
                createOutputChannel(`${jest_config_js_path} 修改测试配置文件失败，终止后续操作，请检查此文件。`, 'warning');
                return false;
            };
            return true;
        } catch (e) {
            createOutputChannel(`${jest_config_js_path} 修改测试配置文件异常，终止后续操作，请检查此文件。具体错误：${e}`, 'warning');
            return false;
        };
    };

    /**
     * @description 测试运行执行方法, 用于运行单条测试用例
     * @param {String} testPlatform - 测试平台, ios|android|h5|mp-weixin
     * @param {String} deviceId - 手机设备iD （主要用户控制台日志打印）
     */
    async run_a_test(testPlatform, deviceId) {

        let result = await this.editEnvjsFile(testPlatform, deviceId).catch(error => {
            console.error("[error]....", error);
            createOutputChannel(`${testPlatform}，修改项目下测试配置文件 env.js出错，请检查！`, 'error');
            return false;
        });
        if (result == false) return;

        // 测试报告输出文件
        let ouputDir = await this.getReportOutputDir(this.projectName, testPlatform);
        if (ouputDir == false) return;

        let filename = getFileNameForDate();
        let outputFile = deviceId
            ? path.join(ouputDir, `${deviceId}-${filename}.json`)
            : path.join(ouputDir, `${filename}.json`);

        // 解决控制台[]内内容太长的问题
        let clgDeviceId = deviceId;
        if (deviceId && deviceId.length >= 8) {
            clgDeviceId = clgDeviceId.replace(clgDeviceId.substring(6), '..');
        };

        let consoleMessagePrefix = deviceId
            ? `[${this.projectName}:${testPlatform}-${clgDeviceId}]`
            : `[${this.projectName}:${testPlatform}]`;
        createOutputChannel(`${consoleMessagePrefix}开始在 ${testPlatform} 平台运行测试 ....`, 'info');
        createOutputChannel(`${consoleMessagePrefix}测试运行日志，请在【uni-app自动化测试 - 运行日志】控制台查看。`, 'info');

        // 环境变量：用于传递给编译器。用于最终测试报告展示
        let uniTestPlatformInfo = await get_uniTestPlatformInfo(testPlatform, deviceId);

        // 环境变量：UNI_OS_NAME字段用于android、ios平台测试
        let UNI_OS_NAME;
        let UNI_PLATFORM = testPlatform;
        if (testPlatform == 'ios' || testPlatform == 'android') {
            UNI_OS_NAME = testPlatform;
            UNI_PLATFORM = 'app-plus';
        };
        if (testPlatform.substring(0, 3) == "h5-") {
            UNI_PLATFORM = "h5";
        };

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
        if (is_uts_project) {
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
            if (testPlatform == 'ios' || testPlatform == 'android') {
                cmdOpts.env.UNI_UTS_PLATFORM = `app-${testPlatform}`;
            };
            if (testPlatform.substring(0, 2) == "mp") {
                cmdOpts.env.UNI_UTS_PLATFORM = testPlatform;
            };
        };

        // HBuilderX 3.2.10+，h5测试增加safari和firefox支持
        if (testPlatform == "h5-firefox") {
            cmdOpts.env.BROWSER = "firefox";
        };
        if (testPlatform == "h5-safari" || testPlatform == "h5-webkit") {
            cmdOpts.env.BROWSER = "webkit";
        };
        if (testPlatform == "h5-chrome") {
            cmdOpts.env.BROWSER = "chromium";
        };

        // 当用户设置使用内置Node编译uni-app项目时，则输入UNI_NODE_PATH
        if (isUseBuiltNodeCompileUniapp) {
            cmdOpts["env"]["UNI_NODE_PATH"] = config.HBuilderX_BuiltIn_Node_Path;
        } else {
            createOutputChannel(config.i18n.msg_env_hx_built_in_node, 'info');
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

        if (['android', 'ios'].includes(UNI_OS_NAME)) {
            cmdOpts["env"]["UNI_OS_NAME"] = UNI_OS_NAME;
        };

        if (testPlatform == 'mp-weixin') {
            createOutputChannel(`${consoleMessagePrefix}${config.i18n.weixin_tools_running_tips}`, 'warning');
        };

        // 当用户设置使用内置Node运行jest时
        let jest_for_node = "node";
        if (isUseBuiltNodeRunJest) {
            jest_for_node = config.HBuilderX_BuiltIn_Node_Path;
        };

        let testInfo = {"projectName": this.projectName, "testPlatform": testPlatform, "deviceId": deviceId};
        let testResult = await runCmd(jest_for_node, cmd, cmdOpts, testInfo, isDebug);

        if (testResult == 'run_end') {
            // 不要改此处的文本
            if (fs.existsSync(outputFile)) {
                createOutputViewForHyperLinks(`${consoleMessagePrefix}测试报告:${outputFile}`, 'info');
                await this.printTestReport(consoleMessagePrefix, outputFile);
                createOutputChannel(`${consoleMessagePrefix}测试运行结束。\n`, "success");
            } else {
                createOutputChannel(`${consoleMessagePrefix}测试运行结束。详细日志请参考运行日志。\n`, "error");
            };
        };
    };

    /**
     * @description 运行测试
     * @param {Object} testPlatform [iOS|android|all]
     * @param {Object} testDevicesList
     */
    async run_more_test(testPlatform, testDevicesList) {
        if (isStopAllTest) {return};
        if (testPlatform == 'all') {
            if (isStopAllTest) {return};
        };
        if (testDevicesList.length && testDevicesList != 'noSelected') {
            for (let s of testDevicesList) {
                if (isStopAllTest) {break};
                let plat = s.split(':')[0];

                // 当plat=mp|h5时，deviceId取值为h5-chrome,mp-weixin
                let deviceId = s.split(':')[1];
                if (['h5','mp'].includes(plat)) {
                    plat= deviceId;
                    await this.run_a_test(plat);
                } else {
                    await this.run_a_test(plat, deviceId);
                };
            };
        };
        if (isStopAllTest) {
            createOutputChannel(`【全部平台】测试，后续测试已停止\n`, 'success');
        };
    };

    /**
     * @description 测试用例运行主入口文件
     * @param {Object} param 项目管理器或编辑器选中的信息
     * @param {String} UNI_PLATFORM 测试平台: android | ios | all | mp-weixin | h5-browserName
     * @param {String} scope 测试用例的运行范围：all（运行全部测试用例） | one（运行单个测试用例）
     */
    async main(param, UNI_PLATFORM, scope = "all") {
        // 增加版本判断：firefox和safari测试，仅支持HBuilderX 3.2.10+版本
        if (cmpVerionForH5 > 0 && UNI_PLATFORM.includes('h5-firefox', 'h5-safari')) {
            createOutputChannel(config.i18n.env_h5_test_version_prompt ,'warning');
            return;
        };

        // 初始化变量，用于停止测试
        this.StopAllTest = false;

        // 判断：项目信息。必须在项目管理器、或编辑器选中项目
        if (param == null) {
            hx.window.showErrorMessage("请在项目管理器选中项目后再试。", ["我知道了"]);
            return;
        };

        // 判断：操作系统, uni-app iOS测试，不支持windows
        if (osName != 'darwin' && UNI_PLATFORM == 'ios') {
            hxShowMessageBox('提醒', config.i18n.env_win32_not_support_ios_testing);
            return;
        };

        // 判断：HBuilderX路径空格
        if (config.HBuilderX_PATH.indexOf(" ") != -1) {
            createOutputChannel(config.i18n.hx_install_path_space_prompt, 'warning');
            return;
        };

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
        let env = await this.checkAndSetEnv(UNI_PLATFORM, projectPath);
        if (!env) return;

        // 运行：到iOS和android
        if (['all', 'ios', 'android'].includes(UNI_PLATFORM) && is_uts_project){
            let checkUTS = await this.checkAndSetUTSTestEnv();
            if (checkUTS == false) return;
        };

        let testPhoneList = [];
        if (['all', 'ios', 'android'].includes(UNI_PLATFORM)) {
            // 选择要运行的设备
            testPhoneList = await getTestDevices(UNI_PLATFORM);

            // 异常判断
            if (testPhoneList == 'error') {
                hxShowMessageBox('测试提醒', '选择设备时错误，请联系插件作者', ['关闭']).then( btn => {});
                return;
            };

            // 当选择了【全部平台】测试，但是没有选择任何设备，直接关闭。
            if ((testPhoneList == 'noSelected' || JSON.stringify(testPhoneList) == '[]') && UNI_PLATFORM == 'all') {
                createOutputChannel(`您选择了【${UNI_PLATFORM}】测试，但是未选择任何设备，测试中止。`, 'warning');
                return;
            };

            // 判断选择的手机设备
            if (testPhoneList.length == 0 && ['ios', 'android'].includes(UNI_PLATFORM)) {
                createOutputChannel(`您选择了【${UNI_PLATFORM}】测试，但是未选择相关手机设备，测试中止。`, 'warning');
                return;
            };
        };

        if (UNI_PLATFORM == 'all') {
            let pmsg = Array.isArray(testPhoneList) ? testPhoneList.join(' ') : '';
            createOutputChannel(`您选择了【全部平台】测试，将依次运行测试到： ${pmsg}`, 'success');
            this.stopAllTestRun();
        };

        // 修改测试范围: 即全部测试、仅测试某个页面
        let proj = {
            "projectPath": projectPath,
            "selectedFile": selectedFile
        };
        let changeResult = await this.modifyJestConfigJSFile(scope, proj);
        if (changeResult == false) return;

        switch (UNI_PLATFORM) {
            case 'h5':
                // h5: 仅代表chrome
                this.run_a_test('h5');
                break;
            case 'h5-chrome':
                // 兼容，不可删除
                this.run_a_test('h5-chrome');
                break;
            case 'h5-safari':
                this.run_a_test('h5-safari');
                break;
            case 'h5-firefox':
                this.run_a_test('h5-firefox');
                break;
            case 'mp-weixin':
                this.run_a_test('mp-weixin');
                break;
            case 'ios':
                this.run_more_test('ios', testPhoneList);
                break;
            case 'android':
                this.run_more_test('android', testPhoneList);
                break;
            case 'all':
                this.run_more_test('all', testPhoneList);
                break;
            default:
                break;
        }
    };
}

module.exports = {
    RunTest
};
