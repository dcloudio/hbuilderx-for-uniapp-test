const hx = require('hbuilderx');
const os = require('os');
const fs = require('fs');
const path = require('path');
const process = require('process');

const cmp_hx_version = require('./lib/cmp_version.js');
let hxVersion = hx.env.appVersion;
hxVersion = hxVersion.replace('-alpha', '').replace(/.\d{8}/, '');

// 版本判断：判断是否支持safari和firefox，因为firefox和safari自动化测试仅支持3.2.10+版本
const cmpVerionForH5 = cmp_hx_version(hxVersion, '3.2.10');

let {
    HBuilderX_PATH,
    HBuilderX_BuiltIn_Node_Dir,
    LAUNCHER_ANDROID,
    LAUNCHER_IOS,
    LAUNCHER_VERSION_TXT,

    UNIAPP_X_LAUNCHER_PATH,
    UNIAPP_X_LAUNCHER_ANDROID,
    UNIAPP_X_LAUNCHER_IOS,
    UNIAPP_X_LAUNCHER_VERSION_TXT,

    UNI_CLI_PATH,
    UNI_CLI_VITE_PATH,
    UNI_CLI_ENV,
    UNI_CLI_teardown,
    testReportOutPutDir,
    NODE_LIB_PATH,
    CROSS_ENV_PATH,
    JEST_PATH,
    UNIAPP_RUNEXTENSION_PATH,
    UNIAPP_UTS_V1_PATH,
    UTS_DEVELOPMENT_ANDROID_PATH,
    UTS_JDK_PATH,
    UTS_GRADLE_HOME,
    UTS_APP_ROOT,
    UTS_USER_DATA_PATH
} = require('./config.js');

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

const getTestDevices = require('./lib/showTestDeviceWindows.js');

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

// 临时变量，判断是否是uts项目
var is_uts_project = false;

// 是否正在调试，当勾选后，将会在控制台输出更多日志
var isDebug = false;

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
        await mkdirsSync(testReportOutPutDir);

        // 检查uts cache目录，如不存在则自动创建
        if (is_uts_project) {
            await mkdirsSync(UTS_USER_DATA_PATH);
        };

        // 检查是否安装uniapp-cli、launcher
        var plugin_list = {
            "uniapp-cli": UNI_CLI_PATH,
        };
        if (["android", "ios", "all"].includes(platform)) {
            plugin_list["launcher"] = LAUNCHER_ANDROID;
        };

        if (is_uts_project) {
            plugin_list["uniapp-runextension"] = UNIAPP_RUNEXTENSION_PATH;
            plugin_list["uniapp-uts-v1"] = UNIAPP_UTS_V1_PATH;
            plugin_list["uts-development-android"] = UTS_DEVELOPMENT_ANDROID_PATH;
        };

        if (is_uniapp_x) {
            plugin_list["uniappx-launcher"] = UNIAPP_X_LAUNCHER_PATH;
        };

        for (let e of Object.keys(plugin_list)) {
            if (!fs.existsSync(plugin_list[e])) {
                testEnv = false;
                if (["uniapp-cli", "launcher", "uniapp-cli-vite", "uniappx-launcher"].includes(e)) {
                    const log_for_plugin = `测试环境检查：${e}插件未安装或安装不完整，请在HBuilderX内点击菜单【工具 - 插件安装】，安装相关插件。`;
                    createOutputChannel(log_for_plugin, 'error')
                };
                if (["uniappx-launcher"].includes(e)) {
                    const log_for_plugin = `测试环境检查：当前项目是uni-app-x，相关插件${e}未安装或安装不完整，请在HBuilderX内点击菜单【工具 - 插件安装】，安装相关插件。`;
                    createOutputChannel(log_for_plugin, 'error')
                };
                if (["uniapp-uts-v1", "uniapp-runextension"].includes(e)) {
                    const log_for_uts = `缺失UTS运行环境。请选择UTS项目，然后运行到手机设备，此时会自动安装UTS相关插件。如果没有自动安装，请删除项目unpackage/cache目录。`;
                    createOutputChannel(log_for_uts, 'error')
                };
            };
        };

        // 检查测试报告
        let userSet = await getPluginConfig("hbuilderx-for-uniapp-test.testReportOutPutDir");
        if ((userSet == undefined || userSet.trim() == '') && (osName == 'win32')) {
            let log_for_wrp = 'Windows电脑，必须手动设置测试报告输出目录，且路径不能含有空格。请点击菜单【设置 - 插件设置】，配置测试报告输出目录。';
            createOutputChannel(log_for_wrp, 'error');
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
        if (path_gradleHome == undefined && path_gradleHome.trim() == "") {
            UTS_GRADLE_HOME = path_gradleHome;
        };

        let path_Android_sdkDir = await getPluginConfig('uts-development-android.sdkDir');
        if (path_Android_sdkDir == undefined && path_Android_sdkDir.trim() == "") {
            UTS_JDK_PATH = path_Android_sdkDir;
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
        let projectReportDir = path.join(testReportOutPutDir, projectName, testPlatform);
        mkdirsSync(projectReportDir);

        let userSet = await getPluginConfig("hbuilderx-for-uniapp-test.testReportOutPutDir");
        if (userSet != undefined && userSet.trim() != '') {
            if (!fs.existsSync(userSet)) {
                createOutputChannel('您在插件设置中，自定义的测试报告输出目录无效，请重新设置。', 'error');
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
                numTotalTests,
                numFailedTests,
                numPassedTests,
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
        let isCustom = await checkCustomTestEnvironmentDependency();
        if (isCustom) {
            NODE_LIB_PATH = isCustom;
            CROSS_ENV_PATH = path.join(isCustom, "cross-env/src/bin/cross-env.js");
            JEST_PATH = path.join(isCustom, "jest/bin/jest.js");
        };
    };

    /**
     * @description 修改测试配置文件env.js， ios和android测试需要在env.js指定设备ID
     * @param {String} deviceInfo - 设备信息，数据格式 ios:xxxxxx  android:xxxxxx
     */
    async editEnvjsFile(deviceInfo) {
        let tmp = deviceInfo.split(':');
        let deviceId = tmp[1];
        let devicePlatform = tmp[0];
        if (['h5','mp'].includes(devicePlatform)) return;

        let launcherExecutablePath;
        if (devicePlatform == 'android') {
            launcherExecutablePath = is_uniapp_x ? UNIAPP_X_LAUNCHER_ANDROID : LAUNCHER_ANDROID;
        };

        // ios真机、模拟器，所需的文件不一样。由于uni-app测试框架不支持ios真机。这里暂不区分。
        if (devicePlatform == 'ios') {
            launcherExecutablePath = is_uniapp_x ? UNIAPP_X_LAUNCHER_IOS : LAUNCHER_IOS;;
        };

        try {
            delete require.cache[require.resolve(this.UNI_AUTOMATOR_CONFIG)];
            var envjs = require(this.UNI_AUTOMATOR_CONFIG);
        } catch (e) {
            createOutputChannel(`测试配置文件 ${this.UNI_AUTOMATOR_CONFIG}, 可能存在语法错误，请检查。`, 'error')
            return false;
        };

        if (is_uniapp_x) {
            let oldLauncherVersion = envjs["app-plus"]?.["uni-app-x"]?.version;
            if (oldLauncherVersion == undefined || oldLauncherVersion.trim() == '' || oldLauncherVersion != UNIAPP_X_LAUNCHER_VERSION_TXT) {
                envjs['app-plus']['uni-app-x'] = {};
                envjs['app-plus']['uni-app-x']['version'] = UNIAPP_X_LAUNCHER_VERSION_TXT;
            };
        } else {
            let oldLauncherVersion = envjs['app-plus']['version'];
            if (oldLauncherVersion.trim() == '' || oldLauncherVersion == undefined || oldLauncherVersion != LAUNCHER_VERSION_TXT) {
                envjs['app-plus']['version'] = LAUNCHER_VERSION_TXT;
            };
        };
        let oldPhoneData = is_uniapp_x
            ? envjs['app-plus']['uni-app-x']?.[devicePlatform]
            : envjs['app-plus'][devicePlatform];

        if (oldPhoneData == undefined || typeof oldPhoneData != 'object') {
            oldPhoneData = {};
        };
        let { id,executablePath } = oldPhoneData;

        if (id != deviceId || executablePath != launcherExecutablePath) {

            if (is_uniapp_x) {
                envjs['app-plus']['uni-app-x'][devicePlatform] = {
                    "id": deviceId,
                    "executablePath": launcherExecutablePath
                };
            } else {
                envjs['app-plus'][devicePlatform]['id'] = deviceId;
                envjs['app-plus'][devicePlatform]['executablePath'] = launcherExecutablePath;
            };

            // 将修改的配置写入文件
            let tmp_data = JSON.stringify(envjs);
            let lastContent = `module.exports = ${tmp_data}`;
            let writeResult = await writeFile(this.UNI_AUTOMATOR_CONFIG, lastContent);

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
    async changeTestMatch(scope, proj) {
        // 读取用户设置
        let userConfig = await getPluginConfig('hbuilderx-for-uniapp-test.AutomaticModificationTestMatch');

        let { projectPath, selectedFile } = proj;
        let projectTestMatch = is_uniapp_cli ? "<rootDir>/src/pages/**/*test.[jt]s?(x)" : "<rootDir>/pages/**/*test.[jt]s?(x)";
        if (scope == 'one') {
            let testcase_file_relative_path = selectedFile.slice(projectPath.length + 1);
            projectTestMatch = `<rootDir>/${testcase_file_relative_path}`;
        } else {
            projectTestMatch = projectTestMatch;
        };

        let jest_config_js_path = path.join(this.projectPath, 'jest.config.js');
        delete require.cache[require.resolve(jest_config_js_path)];
        try{
            var jestConfigContent = require(jest_config_js_path);
        }catch(e){
            createOutputChannel(`测试配置文件 ${jest_config_js_path} 应用异常，请检查。`, 'error');
            return false;
        };

        // 当用户不勾选设置项【自动修改jest.config.js文件中的testMatch】时，返回undefined
        if (userConfig == false) return;

        try {
            let oldTestMatch = jestConfigContent["testMatch"];
            if (!Array.isArray(oldTestMatch)) {
                createOutputChannel(`测试配置文件 ${jest_config_js_path}, testMatch字段，应为数组类型，请检查。`, 'error')
                return false;
            };
            if (oldTestMatch[0] == projectTestMatch) {
                return true;
            };

            // 读取文件内容
            let jestFileContent = fs.readFileSync(jest_config_js_path, 'utf-8');
            // 替换testMatch
            let replaceText = `testMatch: ["${projectTestMatch}"]`;
            let lastContent = jestFileContent.replace(/testMatch\s*:{1}\s*\[\S*\]/gi, replaceText);
            // 写入文件
            let writeResult = await writeFile(jest_config_js_path, lastContent);
            if (writeResult != 'success') {
                createOutputChannel(`修改测试配置文件 ${jest_config_js_path} 失败，终止后续操作，请检查此文件。`, 'warning');
                return false;
            };
            return true;
        } catch (e) {
            console.error(e);
            createOutputChannel(`修改测试配置文件 ${jest_config_js_path} 异常，终止后续操作，请检查此文件。`, 'warning');
            return false;
        };
    };

    /**
     * @description 测试运行执行方法, 用于运行单条测试用例
     * @param {String} testPlatform - 测试平台, ios|android|h5|mp-weixin
     * @param {String} deviceId - 手机设备iD （主要用户控制台日志打印）
     */
    async run_a_test(testPlatform, deviceId) {
        // 测试报告输出文件
        let ouputDir = await this.getReportOutputDir(this.projectName, testPlatform);
        if (ouputDir == false) return;

        let filename = getFileNameForDate();
        let outputFile = deviceId ? path.join(ouputDir, `${deviceId}-${filename}.json`) : path.join(ouputDir, `${filename}.json`);

        // 解决控制台[]内内容太长的问题
        let clgDeviceId = deviceId;
        if (deviceId && deviceId.length >= 8) {
            clgDeviceId = clgDeviceId.replace(clgDeviceId.substring(6), '..');
        };

        let consoleMessagePrefix = deviceId ? `[${this.projectName}:${testPlatform}-${clgDeviceId}]` : `[${this.projectName}:${testPlatform}]`;
        createOutputChannel(`${consoleMessagePrefix}开始在 ${testPlatform} 平台运行测试 ....`, 'info');
        createOutputChannel(`${consoleMessagePrefix}测试运行日志，请在【uni-app自动化测试 - 运行日志】控制台查看。`, 'info');

        // UNI_OS_NAME字段用于android、ios平台测试
        let UNI_OS_NAME;
        let UNI_PLATFORM = testPlatform;
        if (testPlatform == 'ios' || testPlatform == 'android') {
            UNI_OS_NAME = testPlatform;
            UNI_PLATFORM = 'app-plus'
        };

        // 命令行运行的环境变量
        let cmdOpts = {
            cwd: this.projectPath,
            env: {
                "HOME": process.env.HOME,
                "PATH": process.env.PATH,
                "NODE_PATH": NODE_LIB_PATH,
                "UNI_CLI_PATH": UNI_CLI_PATH,
                "UNI_AUTOMATOR_CONFIG": this.UNI_AUTOMATOR_CONFIG,
                "UNI_PLATFORM": UNI_PLATFORM,
                // "UNI_APP_X": false
            },
            maxBuffer: 2000 * 1024
        };

        // 是否是vue3，决定UNI_CLI_PATH值
        if (is_uniapp_3) {
            cmdOpts.env.UNI_CLI_PATH = UNI_CLI_VITE_PATH;
            UNI_CLI_ENV = path.join(UNI_CLI_VITE_PATH, 'node_modules/@dcloudio/uni-automator/dist/environment.js');
            UNI_CLI_teardown = path.join(UNI_CLI_VITE_PATH, 'node_modules/@dcloudio/uni-automator/dist/teardown.js');
        };
        // if (is_uniapp_x) {
        //     cmdOpts.env.UNI_APP_X = true;
        // };

        // 判断是否是uts项目，如果是，则传递uts需要的变量
        if (is_uts_project) {
            cmdOpts.env.JDK_PATH = UTS_JDK_PATH;
            cmdOpts.env.GRADLE_HOME = UTS_GRADLE_HOME;
            cmdOpts.env.APP_ROOT = UTS_APP_ROOT;
            cmdOpts.env.HX_APP_ROOT = UTS_APP_ROOT;
            cmdOpts.env.USER_DATA_PATH = UTS_USER_DATA_PATH;

            // 2023-01-31 如下两个参数，暂时无用。以后可能用得到。先不清除。
            cmdOpts.env.UNIAPP_RUNEXTENSION_PATH = UNIAPP_RUNEXTENSION_PATH;
            cmdOpts.env.UNIAPP_UTS_V1_PATH = UNIAPP_UTS_V1_PATH;
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
        if (testPlatform.substring(0, 3) == "h5-") {
            cmdOpts.env.UNI_PLATFORM = "h5";
        };

        // 当用户设置使用内置Node编译uni-app项目时，则输入UNI_NODE_PATH
        if (isUseBuiltNodeCompileUniapp) {
            let node_program_name = osName == 'win32' ? 'node.exe' : 'node';
            cmdOpts["env"]["UNI_NODE_PATH"] = path.join(HBuilderX_BuiltIn_Node_Dir, node_program_name) ;
        } else {
            const log_for_node = `当前自动化测试使用的是操作系统安装的Node，如遇到问题，请在打开【设置 - 插件配置 - uni-app自动化测试插件】，勾选使用HBuilderX内置的Node运行自动化测试。`;
            createOutputChannel(log_for_node, 'info');
        };

        // node: 当本机未安装node时，将使用HBuilderX内置的node运行自动化测试。反之，本机安装了node，则使用本机的node。
        if (nodeStatus == 'N' || nodeStatus == undefined) {
            let PATH = osName == 'darwin' ? process.env.PATH + ":" + HBuilderX_BuiltIn_Node_Dir : process.env.path + ";" + HBuilderX_BuiltIn_Node_Dir;
            cmdOpts["env"]["PATH"] = PATH;
        };

        // 适用于uni-app普通项目
        let cmd = `node ${JEST_PATH} -i --forceExit --json --outputFile="${outputFile}" --env="${UNI_CLI_ENV}" --globalTeardown="${UNI_CLI_teardown}"`;
        console.log(`自动化测试运行的命令：-------------- \n`, JSON.stringify(cmdOpts, null, 4));

        // 适用于uniapp-cli项目
        if (is_uniapp_cli) {
            delete cmdOpts.env.NODE_PATH;
            delete cmdOpts.env.UNI_CLI_PATH;
            let cliJest = path.join(this.projectPath, 'node_modules/jest/bin/jest.js');
            cmd = `node ${cliJest} -i --forceExit --json --outputFile="${outputFile}"`;
        };

        if (['android', 'ios'].includes(UNI_OS_NAME)) {
            cmdOpts["env"]["UNI_OS_NAME"] = UNI_OS_NAME;
        };

        if (testPlatform == 'mp-weixin') {
            const log_for_wx = `${consoleMessagePrefix}首次运行测试到微信开发者工具，如果没有正确运行，请手动将项目导入微信开发者工具。并且请确认已开启微信开发者工具服务端口。`;
            createOutputChannel(log_for_wx, 'warning');
        };

        let testInfo = {"projectName": this.projectName, "testPlatform": testPlatform, "deviceId": deviceId};

        if (isDebug) {
            createOutputChannel(`[Log] 自动化测试的运行命令以及环境变量: \n\n ${cmd} \n\n` + JSON.stringify(cmdOpts, null, 4), 'info', 'log');
        };

        let testResult = await runCmd(cmd, cmdOpts, testInfo);

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
                let result = await this.editEnvjsFile(s).catch(error => {
                    createOutputChannel(`${s}，修改项目下测试配置文件 env.js出错；请检查env.js是否存在语法错误，或联系插件作者解决问题。`, 'error');
                    return error;
                });
                if (result == false) {break;};

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
            createOutputChannel('提示：uni-app自动化测试，firefox和safari测试，仅支持HBuilderX 3.2.10+版本。' ,'warning');
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
            hxShowMessageBox('提醒', '目前uni-app自动化测试，ios测试，不支持windows。');
            return;
        };

        // 判断：HBuilderX路径空格
        if (HBuilderX_PATH.indexOf(" ") != -1) {
            createOutputChannel(`提示：HBuilderX程序所在路径存在空格，可能导致uni-app自动化测试无法运行，请修正。`, 'warning');
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

        // 配置项：获取用户是否设置使用内置Node版本进行uni-app编译
        isUseBuiltNodeCompileUniapp = await getPluginConfig('hbuilderx-for-uniapp-test.uniappCompileNodeType');

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
        let changeResult = await this.changeTestMatch(scope, proj);
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
