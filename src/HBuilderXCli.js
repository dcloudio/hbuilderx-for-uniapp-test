const hx = require('hbuilderx');
const os = require('os');
const fs = require('fs');
const path = require('path');
const process = require('process');

const get_test_port = require("./utils/get_test_port.js");
const hxVersion = hx.env.appVersion;

let config = require('./core/config.js');

const api_getMobileList = require("./lib/api_getMobileList.js");
const getProjectUnicloudData = require("./core/get_project_unicloud_data.js");
const {
    isUniAppCli,
    isUniAppX,
    getPluginConfig,
    runCmdForHBuilderXCli,
    checkCustomTestEnvironmentDependency,
    checkUtsProject,
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

// unicloud服务信息
let unicloud_spaces_info = [];

class Common {
    async print_cli_log(msg) {
        let MsgPrefix = "[uniapp.test] ";
        await hx.cliconsole.log({ clientId: this.terminal_id, msg: MsgPrefix + msg, status: "Info" });
    };

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
            try {
                nodeStatus = await checkNode();
            } catch (error) {
                await this.print_cli_log(config.i18n.msg_env_node_check);
                nodeStatus = error;
            }
        };

        // 检查插件依赖
        let init = new Initialize();
        if (is_uniapp_cli) {
            testEnv = await init.checkUniappCliProject(projectPath, this.terminal_id);
        } else {
            testEnv = await init.checkPluginDependencies(false, this.terminal_id);
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

        if (is_uniapp_x) {
            plugin_list["uniappx-launcher"] = config.UNIAPP_X_LAUNCHER_PATH;
        };

        if (is_uts_project || is_uniapp_x) {
            plugin_list["uniapp-uts-v1"] = config.UNIAPP_UTS_V1_PATH;
        };

        if (["android", "all"].includes(platform)) {
            plugin_list["uniapp-runextension"] = config.UNIAPP_RUNEXTENSION_PATH;
            plugin_list["uts-development-android"] = config.UTS_DEVELOPMENT_ANDROID_PATH;
        };

        // 判断是否安装测试环境必须的插件
        let uni_plugin_check = true;
        for (let e of Object.keys(plugin_list)) {
            if (fs.existsSync(plugin_list[e]) == false) {
                uni_plugin_check = false;
                const pluginDisplayName = config.HX_PLUGINS_DISPLAYNAME_LIST[e] ? config.HX_PLUGINS_DISPLAYNAME_LIST[e] : e;
                const log_for_plugin = `[提示]：测试环境检查，未安装 ${e} 。点击菜单【工具 - 插件安装】，安装【${pluginDisplayName}】插件。`;
                await this.print_cli_log(log_for_plugin);
            };
        };

        if (uni_plugin_check == false && is_uniapp_x) {
            await this.print_cli_log(config.i18n.msg_warning_uniappx_env);
        };
        if (uni_plugin_check == false && is_uts_project) {
            await this.print_cli_log(config.i18n.msg_warning_uts_env);
        };

        // 检查测试报告
        let userSet = await getPluginConfig("hbuilderx-for-uniapp-test.testReportOutPutDir");
        if ((userSet == undefined || userSet.trim() == '') && (osName == 'win32')) {
            await this.print_cli_log(config.i18n.msg_warning_test_report_path_check);
            return false;
        };
        this.isDebug = await getPluginConfig("hbuilderx-for-uniapp-test.isDebug");
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
     * @param {String} projectPath - 项目路径
     * @param {Object} param - 参数
     */
    async getProjectUniCloudInfo(projectPath, workspaceFolder) {
        unicloud_spaces_info = [];
        const uniCloudDirs = ["uniCloud-tcb", "uniCloud-aliyun", "uniCloud-alipay", "uniCloud-dcloud"];
        const uniCloudExists = uniCloudDirs.some(dir => fs.existsSync(path.join(projectPath, dir)));
        if (!uniCloudExists) {
            return;
        };
        try {
            unicloud_spaces_info = await getProjectUnicloudData(workspaceFolder);
        } catch (error) {
            await this.print_cli_log("[自动化测试] 执行getProjectUnicloudData异常" + error, "Error");
        };
    };

    /**
     * 获取项目管理器选中的信息，并推测项目类型（比如是否是uniapp-cli、是否是uniapp-x）
     * @param {Object} param
     * @returns {Object}
     */
    async getProjectInfo(projectPath) {
        // 获取当前项目的workspaceFolder
        let workspaceFolder = await hx.workspace.getWorkspaceFolder(projectPath);
        this.projectVueVersion = workspaceFolder.vueVersion;
        await this.getProjectUniCloudInfo(projectPath, workspaceFolder);

        // 判断项目类型：uni-app普通项目、uniapp-cli项目
        is_uniapp_cli = await isUniAppCli(projectPath);

        // 判断项目类型 uni-app普通项目、uni-appx项目
        is_uniapp_x = await isUniAppX(projectPath);
        console.error("是否是uniapp-x", is_uniapp_x);

        // 非uni-app-x项目，判断项目是vue2 还是vue3, 是否是uts项目
        if (!is_uniapp_x) {
            is_uniapp_3 = workspaceFolder.vueVersion == "3" ? true : false;
            is_uts_project = await checkUtsProject(projectPath, is_uniapp_cli);
        };
        if (is_uniapp_x) {
            is_uniapp_3 = true;
            is_uts_project = true;
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
                await this.print_cli_log(config.i18n.invalid_custom_test_report_path);
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
            let msg = `${consoleMessagePrefix}测试用例总计：${numTotalTestSuites}，` +
                `运行通过 ${numPassedTestSuites}，运行失败 ${numFailedTestSuites}，运行异常 ${numRuntimeErrorTestSuites}`;
            await this.print_cli_log(msg);
        } catch (e) { };
    };
};


class RunTestForHBuilderXCli extends Common {
    constructor() {
        super();
        this.isDebug = false;
        this.consoleMsgPrefix = "[uniapp.test] ";
        this.terminal_id = "";
        this.projectName = '';
        this.projectPath = '';
        this.selectedFile = '';
        this.projectVueVersion = "2";
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
     * @description 测试运行执行方法
     * @param {String} testPlatform - 测试平台, ios|android|h5|mp-weixin
     * @param {String} deviceId - 手机设备iD （主要用户控制台日志打印）
     */
    async run_uni_test(testPlatform, deviceId) {

        let envJSArgs = {
            "is_uniapp_x": is_uniapp_x
        };

        let result;
        try {
            result = await editEnvjsFile(this.UNI_AUTOMATOR_CONFIG, testPlatform, deviceId, envJSArgs, this.terminal_id);
        } catch (error) {
            console.error("[error]....", error);
            result = false;
        };
        let envMsg = result ? "成功" : "失败";
        await this.print_cli_log(`修改项目下测试配置文件 env.js ${envMsg}！`);

        // 测试报告输出文件
        let ouputDir = "";
        try {
            ouputDir = await this.getReportOutputDir(this.projectName, testPlatform);
            await this.print_cli_log(`测试报告输出目录: ${ouputDir}`);
            if (ouputDir == false) return;
        } catch (error) {
            await this.print_cli_log(`获取测试报告输出目录异常: ${error}`);
        };

        let filename = getFileNameForDate();
        let outputFile = deviceId
            ? path.join(ouputDir, `${deviceId}-${filename}.json`)
            : path.join(ouputDir, `${filename}.json`);
        await this.print_cli_log(`开始在 ${testPlatform} 平台运行测试 ....`);

        // 环境变量：用于传递给编译器。用于最终测试报告展示
        let uniTestPlatformInfo = await get_uniTestPlatformInfo(testPlatform, deviceId);

        // 环境变量：UNI_OS_NAME字段用于android、ios平台测试
        let UNI_OS_NAME;
        let UNI_PLATFORM = testPlatform;
        if (testPlatform == 'ios' || testPlatform == 'android') {
            UNI_OS_NAME = testPlatform;
            UNI_PLATFORM = 'app-plus';
        };
        if (testPlatform == 'harmony') {
            UNI_OS_NAME = 'harmony';
            UNI_PLATFORM = 'app-harmony';
        };
        if (testPlatform.substring(0, 3) == "h5-") {
            UNI_PLATFORM = "h5";
        };

        // 环境变量：测试端口
        let UNI_AUTOMATOR_PORT = await get_test_port().catch(() => {
            return 9520;
        });
        await this.print_cli_log(`分配测试端口: ${UNI_AUTOMATOR_PORT}`);

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

        // 2024/9/20 在env.js中扩展UNI_TEST_CUSTOM_ENV字段，从中读取自定义环境变量，并传递给自动化测试框架
        try {
            let env_js_path = this.UNI_AUTOMATOR_CONFIG;
            delete require.cache[require.resolve(env_js_path)];
            var envjs = require(env_js_path);
            let UNI_TEST_CUSTOM_ENV = envjs.UNI_TEST_CUSTOM_ENV;
            if (UNI_TEST_CUSTOM_ENV != undefined && Object.prototype.toString.call(UNI_TEST_CUSTOM_ENV) === '[object Object]') {
            	Object.entries(UNI_TEST_CUSTOM_ENV).forEach(([key, value]) => {
            	    console.log(key, value);
                    cmdOpts["env"][key] = value;
            	});
            };
        } catch (e) {
            await this.print_cli_log(`${env_js_path} 测试配置文件, 可能存在语法错误，请检查。`)
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
        if (this.isDebug) {
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
            await this.print_cli_log(config.i18n.msg_env_hx_built_in_node);
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

        if (['android', 'ios', "harmony"].includes(UNI_OS_NAME)) {
            cmdOpts["env"]["UNI_OS_NAME"] = UNI_OS_NAME;
        };

        if (testPlatform == 'mp-weixin') {
            await this.print_cli_log(`${config.i18n.weixin_tools_running_tips}`);
        };

        // 当用户设置使用内置Node运行jest时
        let jest_for_node = "node";
        if (isUseBuiltNodeRunJest) {
            jest_for_node = config.HBuilderX_BuiltIn_Node_Path;
        };

        let testInfo = {"projectName": this.projectName, "testPlatform": testPlatform, "deviceId": deviceId};
        let testResult = await runCmdForHBuilderXCli(jest_for_node, cmd, cmdOpts, testInfo, '[uniapp.test] ', this.terminal_id);

        if (testResult == 'run_end') {
            // 不要改此处的文本
            if (fs.existsSync(outputFile)) {
                await this.print_cli_log(`测试报告:${outputFile}`);
                await this.printTestReport(this.consoleMsgPrefix, outputFile);
                await this.print_cli_log(`测试运行结束。\n`);
            } else {
                await this.print_cli_log(`测试运行结束。详细日志请参考运行日志。\n`);
            };
        };
    };

    /**
     * @description 运行测试，适用于选择多个设备后执行
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
                // let deviceId = s.split(':')[1];
                let deviceId = s.split(':').slice(1).join(':');
                if (['h5','mp'].includes(plat)) {
                    plat= deviceId;
                    await this.run_uni_test(plat);
                } else {
                    await this.run_uni_test(plat, deviceId);
                };
            };
        };
        if (isStopAllTest) {
            await this.print_cli_log(`【全部平台】测试，后续测试已停止\n`);
        };
    };

    async getTestDevicesList(testPlatform) {
        let data = await api_getMobileList(testPlatform, "Y");
        await this.print_cli_log(`${testPlatform}，设备列表: \n ${JSON.stringify(data, null, 2)}`);

        if (JSON.stringify(data) == '{}') {
            await this.print_cli_log(`未检测到可用的测试设备，测试中止。`);
            return [];
        };

        let result = data[testPlatform];
        if (testPlatform == "ios") {
            result = data["ios_simulator"];
        };

        if (result == undefined || result.length == 0) {
            await this.print_cli_log(`未检测到可用的测试设备，测试中止。`);
            return [];
        };
        let last_result = [];
        for (const el of result) {
            if (testPlatform == "android" || testPlatform == "ios" || testPlatform == "harmony") {
                last_result.push(`${testPlatform}:${el.udid}`);
            };
        };
        return last_result;
    };
    /**
     * @description 测试用例运行主入口文件
     * @param {Object} param cli传递的参数信息
     */
    async main(params, terminalID, uni_platformName) {
        this.terminal_id = terminalID;
        await hx.cliconsole.log({ clientId: this.terminal_id, msg: "[uniapp.test] ....... 开始运行测试 ......", status: 'Info' });

        let argv_uni_platform = uni_platformName;
        let argv_device_id = params.device_id || '';
        this.projectPath = params.project;
        this.selectedFile = params.testcaseFile || '';
        
        this.projectName = path.basename(this.projectPath);
        this.UNI_AUTOMATOR_CONFIG = path.join(this.projectPath, 'env.js');
        await hx.cliconsole.log({ clientId: this.terminal_id, msg: "[uniapp.test] 测试项目：" + this.projectPath, status: 'Info' });

        argv_uni_platform = {
            "web-chrome": "h5-chrome",
            "web-safari": "h5-safari",
            "web-firefox": "h5-firefox"
        }[argv_uni_platform] || argv_uni_platform;
        await this.print_cli_log("测试平台：" + argv_uni_platform);

        // 判断：操作系统, uni-app iOS测试，不支持windows
        if (osName != 'darwin' && argv_uni_platform == 'ios') {
            await this.print_cli_log(config.i18n.env_win32_not_support_ios_testing);
            return;
        };

        // 获取项目名称、项目路径、uni-app Vue版本
        await this.getProjectInfo(this.projectPath);
        this.UNI_AUTOMATOR_CONFIG = path.join(this.projectPath, 'env.js');

        // 设置自定义的测试环境变量， 如果无，则使用默认值
        await this.setTestCustomEnvironmentVariables();

        // 检查：HBuilderX测试环境，包含插件是否安装完整、测试依赖库是否安装等
        let env = await this.checkAndSetEnv(argv_uni_platform, this.projectPath);
        await this.print_cli_log(`测试环境检查结果: ${env}`);
        if (!env) return;

        // 运行：到iOS和android
        if (['all', 'android'].includes(argv_uni_platform) && is_uts_project){
            let checkUTS = await this.checkAndSetUTSTestEnv();
            if (checkUTS == false) {
                await this.print_cli_log(config.i18n.msg_warning_uts_env);
                return;
            };
        };

        let testPhoneList = [];
        if (['all', 'ios', 'android', 'harmony'].includes(argv_uni_platform) && argv_device_id == '') {
            await this.print_cli_log(`开始获取可用的测试设备列表 ..... `);
            // 选择要运行的设备
            testPhoneList = await this.getTestDevicesList(argv_uni_platform);
            if (testPhoneList.length == 0) return;
            if (testPhoneList.length > 1) {
                await this.print_cli_log(`检测到多个测试设备，默认只运行第一个设备 ..... `);
                testPhoneList = testPhoneList[0];
            };
            await this.print_cli_log(`可用的测试设备列表: ${testPhoneList}`);
            console.error("[自动化测试连接的设备]--->", testPhoneList);
        };
        if (argv_device_id != '' && ['ios', 'android', 'harmony'].includes(argv_uni_platform) ) {
            testPhoneList = [`${argv_uni_platform}:${argv_device_id}`];
            await this.print_cli_log(`指定的测试设备列表: ${testPhoneList}`);
        };

        if (argv_uni_platform == 'all') {
            let pmsg = Array.isArray(testPhoneList) ? testPhoneList.join(' ') : '';
            await this.print_cli_log(`您选择了【全部平台】测试，将依次运行测试到： ${pmsg}`);
            this.stopAllTestRun();
        };

        // 修改测试范围: 即全部测试、仅测试某个页面
        let proj = {
            "projectPath": this.projectPath,
            "selectedFile": this.selectedFile,
            "is_uniapp_cli": is_uniapp_cli
        };
        if (this.selectedFile != undefined && this.selectedFile.trim() != '') {
            proj["selectedFile"] = path.join(this.projectPath, this.selectedFile);
        };
        await this.print_cli_log(`jest.config.js测试范围检查，测试文件: ${this.selectedFile || '全部测试'}`);
        let scope = "all";
        if (this.selectedFile != undefined && this.selectedFile.trim() != '') {
            scope = 'one';
        };

        // 检查项目下jest.config.js和env.js文件是否存在，如果不存在，则创建
        const jest_config_js_path = path.join(this.projectPath, 'jest.config.js');
        const env_js_path = path.join(this.projectPath, 'env.js');

        let jse = new Initialize();
        if (!fs.existsSync(jest_config_js_path)) {
            await jse.CreateTestEnvConfigFile(this.projectPath, "jest.config.js", this.terminal_id)
        };
        if (!fs.existsSync(env_js_path)) {
            await jse.CreateTestEnvConfigFile(this.projectPath, "env.js", this.terminal_id)
        };

        let changeResult = await modifyJestConfigJSFile(scope, proj, this.terminal_id);
        await this.print_cli_log(`jest.config.js 测试范围检查，结果: ${changeResult}`);
        if (changeResult == false) return;

        switch (argv_uni_platform) {
            case 'h5':
                // h5: 仅代表chrome
                await this.run_uni_test('h5');
                break;
            case 'h5-chrome':
                // 兼容，不可删除
                await this.run_uni_test('h5-chrome');
                break;
            case 'h5-safari':
                await this.run_uni_test('h5-safari');
                break;
            case 'h5-firefox':
                await this.run_uni_test('h5-firefox');
                break;
            case 'mp-weixin':
            case "weixin":
                await this.run_uni_test('mp-weixin');
                break;
            case 'ios':
                await this.run_more_test('ios', testPhoneList);
                break;
            case 'android':
                await this.run_more_test('android', testPhoneList);
                break;
            case 'harmony':
                await this.run_more_test('harmony', testPhoneList);
                break;
            case 'all':
                await this.run_more_test('all', testPhoneList);
                break;
            default:
                break;
        }
    };
};

async function check_cli_args(args, client_id) {
    let { project, device_id, testcaseFile } = args;
    if (!fs.existsSync(project)) {
        return `项目路径 ${project} 不存在，请检查。`;
    };
    if (device_id == "") {
        return "参数 --device_id 不能为空，请检查。";
    };
    if (testcaseFile == "") {
        return "参数 --testcaseFile 不能为空，请检查。";
    };
    if (testcaseFile != "" && testcaseFile != undefined) {
        if (!fs.existsSync(path.join(project, testcaseFile))) {
            return `测试用例文件 ${testcaseFile} 不存在，请检查。`;
        };
    }
    return "";
};

async function readPluginsPackageJson() {
    let package_path = path.join(path.dirname(__dirname), 'package.json');
    let pkg = {};
    try {
        pkg = require(package_path);
    } catch (error) {
        pkg = {};
    };
    return pkg;
};


async function RunTestForHBuilderXCli_main(params, uni_platformName) {
    // 解析命令行参数与输入
    let {args} = params;
    let client_id = params.cliconsole.clientId;

    console.error("[cli参数] args:", args);
    console.error("[cli参数] params:", params);
    console.error("[cli参数] clientID:", client_id);
    
    await hx.cliconsole.log({ clientId: client_id, msg: "欢迎使用 HBuilderX CLI uni-app (x) 自动化测试命令行工具！", status: 'Info' });
    let checkResult = await check_cli_args(args, client_id);
    console.error("[cli参数校验] checkResult:", checkResult);
    if (checkResult != "") {
        await hx.cliconsole.log({ clientId: client_id, msg: checkResult, status: 'Info' });
        return;
    } else {
        try {
            let cli = new RunTestForHBuilderXCli();
            await cli.main(params.args, client_id, uni_platformName);
        } catch (error) {
            await hx.cliconsole.log({ clientId: client_id, msg: "运行异常，" + error });
        };
    };
};

module.exports = {
    check_cli_args,
    RunTestForHBuilderXCli_main,
    readPluginsPackageJson
};