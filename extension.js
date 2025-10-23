const hx = require("hbuilderx");

const { about, checkUpgrade } = require('./public/about.js');
const { stopRunTest } = require('./src/core/core.js');

const Initialize = require('./src/Initialize.js');
const TestCaseCreate = require("./src/TestCaseCreate.js");
const { RunTest } = require("./src/TestCaseRun.js");
const openReportOutputDir = require('./src/TestReports.js');
const { RunTestForHBuilderXCli_main, readPluginsPackageJson } = require('./src/HBuilderXCli.js');


function activate(context) {
    // 检查升级
    checkUpgrade();

    let run = new RunTest();

    // 初始化测试环境：安装测试环境、创建测试配置文件
    let initialization = hx.commands.registerCommand('unitest.initialization', (param) => {
        let init = new Initialize();
        init.main(param);
    });
    context.subscriptions.push(initialization);

    // 重装测试环境
    let reloadEnv = hx.commands.registerCommand('unitest.reloadEnv', () => {
        let init = new Initialize();
        init.checkPluginDependencies(true);
    });
    context.subscriptions.push(reloadEnv);

    // 创建测试用例 (uni-app项目，pages页面，右键菜单)
    let createTestCase = hx.commands.registerCommand('unitest.createTestCase', (param) => {
        TestCaseCreate(param);
    });
    context.subscriptions.push(createTestCase);

    // 查看历史测试报告
    let reportHistory = hx.commands.registerCommand('unitest.reportHistory', (param) => {
        openReportOutputDir();
    });
    context.subscriptions.push(reportHistory);

    // 运行所有测试用例：全部
    let runTestAll = hx.commands.registerCommand('unitest.runTestAll', (param) => {
        run.main(param, 'all');
    });
    context.subscriptions.push(runTestAll);

    // 运行所有测试用例：web-chrome
    let runTestH5 = hx.commands.registerCommand('unitest.runTestH5', (param) => {
        run.main(param, 'web-chrome');
    });
    context.subscriptions.push(runTestH5);

    // 运行所有测试用例：web-firefox
    let runTestH5Firefox = hx.commands.registerCommand('unitest.runTestH5Firefox', (param) => {
        run.main(param, 'web-firefox');
    });
    context.subscriptions.push(runTestH5Firefox);

    // 运行所有测试用例：web-safari
    let runTestH5Safari = hx.commands.registerCommand('unitest.runTestH5Safari', (param) => {
        run.main(param, 'web-safari');
    });
    context.subscriptions.push(runTestH5Safari);

    // 运行所有测试用例：微信小程序
    let runTestWeiXin = hx.commands.registerCommand('unitest.runTestWeiXin', (param) => {
        run.main(param, 'mp-weixin');
    });
    context.subscriptions.push(runTestWeiXin);

    // 运行所有测试用例：ios
    let runTestIOS = hx.commands.registerCommand('unitest.runTestIOS', (param) => {
        run.main(param, 'ios');
    });
    context.subscriptions.push(runTestIOS);

    // 运行所有测试用例：android
    let runTestAndroid = hx.commands.registerCommand('unitest.runTestAndroid', (param) => {
        run.main(param, 'android');
    });
    context.subscriptions.push(runTestAndroid);

    // 运行所有测试用例：Harmony
    let runTestHarmony = hx.commands.registerCommand('unitest.runTestHarmony', (param) => {
        run.main(param, 'harmony');
    });
    context.subscriptions.push(runTestHarmony);

    // 运行当前选择的测试用例：全部
    let runCurrentTestToAll = hx.commands.registerCommand('unitest.runCurrentTestAll', (param) => {
        run.main(param, 'all', 'one');
    });
    context.subscriptions.push(runCurrentTestToAll);

    // 运行当前选择的测试用例：web-chrome
    let runCurrentTestToH5 = hx.commands.registerCommand('unitest.runCurrentTestH5', (param) => {
        run.main(param, 'web-chrome', 'one');
    });
    context.subscriptions.push(runCurrentTestToH5);

    // 运行当前选择的测试用例：web-firefox
    let runCurrentTestToH5Firefox = hx.commands.registerCommand('unitest.runCurrentTestH5Firefox', (param) => {
        run.main(param, 'web-firefox', 'one');
    });
    context.subscriptions.push(runCurrentTestToH5Firefox);

    // 运行当前选择的测试用例：web-safari
    let runCurrentTestToH5Safari = hx.commands.registerCommand('unitest.runCurrentTestH5Safari', (param) => {
        run.main(param, 'web-safari', 'one');
    });
    context.subscriptions.push(runCurrentTestToH5Safari);

    // 运行当前选择的测试用例：微信小程序
    let runCurrentTestToWeiXin = hx.commands.registerCommand('unitest.runCurrentTestWeiXin', (param) => {
        run.main(param, 'mp-weixin', 'one');
    });
    context.subscriptions.push(runCurrentTestToWeiXin);

    // 运行当前选择的测试用例：ios
    let runCurrentTestToIOS = hx.commands.registerCommand('unitest.runCurrentTestIOS', (param) => {
        run.main(param, 'ios', 'one');
    });
    context.subscriptions.push(runCurrentTestToIOS);

    // 运行当前选择的测试用例：android
    let runCurrentTestToAndroid = hx.commands.registerCommand('unitest.runCurrentTestAndroid', (param) => {
        run.main(param, 'android', 'one');
    });
    context.subscriptions.push(runCurrentTestToAndroid);

    // 运行当前选择的测试用例：Harmony
    let runCurrentTestToHarmony = hx.commands.registerCommand('unitest.runCurrentTestHarmony', (param) => {
        run.main(param, 'harmony', 'one');
    });
    context.subscriptions.push(runCurrentTestToHarmony);

    // about
    let aboutPlugins = hx.commands.registerCommand('unitest.about', () => {
        about();
    });
    context.subscriptions.push(aboutPlugins);

    // stop run
    let stopRun = hx.commands.registerCommand('unitest.stopRunTest', () => {
        stopRunTest();
    });
    context.subscriptions.push(stopRun);

    let AutotestMatch = hx.commands.registerCommand('unitest.isAutotestMatch', () => {
        let config = hx.workspace.getConfiguration();
        let result = config.get('hbuilderx-for-uniapp-test.AutomaticModificationTestMatch');
        config.update('hbuilderx-for-uniapp-test.AutomaticModificationTestMatch', !result).then( () => {
            let text = result ? '取消' : '启用';
            hx.window.setStatusBarMessage(`已 ${text} 自动修改testMatch。`, 'info', 10000);
        });
    });
    context.subscriptions.push(AutotestMatch);

    // 是否输出调试日志
    let debugLog = hx.commands.registerCommand('unitest.enableDebugLog', () => {
        let config = hx.workspace.getConfiguration();
        let result = config.get('hbuilderx-for-uniapp-test.AutomaticModificationTestMatch');
        config.update('hbuilderx-for-uniapp-test.isDebug', !result).then( () => {
            let text = result ? '取消' : '启用';
            hx.window.setStatusBarMessage(`已 ${text} 自动修改调试日志输出。`, 'info', 10000);
        });
    });
    context.subscriptions.push(debugLog);

    // hbuilderx cli 支持
    let cli_uni = hx.commands.registerCliCommand('uniapp.test', async (params) => {
        let {version} = params.args;
        let client_id = params.cliconsole.clientId;
        if (version || version == "") {
            let pkg = await readPluginsPackageJson();
            const plugin_version = pkg.version;
            const hx_version = hx.env.appVersion;
            const msg = `plugin version：${plugin_version}\nHBuilderX version: ${hx_version}`;
            await hx.cliconsole.log({ hideTime: true, clientId: client_id, msg: msg, status: 'Info' });
        };
    });
    context.subscriptions.push(cli_uni);

    let cli_web = hx.commands.registerCliCommand('uniapp.test web', async (params) => {
        await RunTestForHBuilderXCli_main(params, 'web');
    });
    context.subscriptions.push(cli_web);
    let cli_web_chrome = hx.commands.registerCliCommand('uniapp.test web-chrome', async (params) => {
        await RunTestForHBuilderXCli_main(params, 'web-chrome');
    });
    context.subscriptions.push(cli_web_chrome);
    let cli_web_safari = hx.commands.registerCliCommand('uniapp.test web-safari', async (params) => {
        await RunTestForHBuilderXCli_main(params, 'web-safari');
    });
    context.subscriptions.push(cli_web_safari);
    let cli_web_firefox = hx.commands.registerCliCommand('uniapp.test web-firefox', async (params) => {
        await RunTestForHBuilderXCli_main(params, 'web-firefox');
    });
    context.subscriptions.push(cli_web_firefox);
    let cli_mp_weixin = hx.commands.registerCliCommand('uniapp.test mp-weixin', async (params) => {
        await RunTestForHBuilderXCli_main(params, 'mp-weixin');
    });
    context.subscriptions.push(cli_mp_weixin);
    let cli_android = hx.commands.registerCliCommand('uniapp.test app-android', async (params) => {
        await RunTestForHBuilderXCli_main(params, 'android');
    });
    context.subscriptions.push(cli_android);
    let cli_ios = hx.commands.registerCliCommand('uniapp.test app-ios-simulator', async (params) => {
        await RunTestForHBuilderXCli_main(params, 'ios');
    });
    context.subscriptions.push(cli_ios);
    let cli_harmony = hx.commands.registerCliCommand('uniapp.test app-harmony', async (params) => {
        await RunTestForHBuilderXCli_main(params, 'harmony');
    });
    context.subscriptions.push(cli_harmony);
};

//该方法将在插件禁用的时候调用（目前是在插件卸载的时候触发）
function deactivate() {

}

module.exports = {
    activate,
    deactivate
}
