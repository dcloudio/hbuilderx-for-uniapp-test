const hx = require("hbuilderx");

const { about, checkUpgrade } = require('./public/about.js');
const { stopRunTest } = require('./src/core/core.js');

const Initialize = require('./src/Initialize.js');
const TestCaseCreate = require("./src/TestCaseCreate.js");
const { RunTest } = require("./src/TestCaseRun.js");
const openReportOutputDir = require('./src/TestReports.js');
const { RunTestForHBuilderXCli_main, readPluginsPackageJson } = require('./src/HBuilderXCli.js');

function handerUri(uri) {
    console.error("uri = ", uri);
    let url_path = uri.path;
    let actions = url_path.split('/').pop();
    console.error("actions = ", actions);

    let query_params = uri.query;
    if (query_params) {
        query_params = Object.fromEntries(new URLSearchParams(query_params));
        if (actions == "command") {
            hx.commands.executeCommand(query_params.id);
        }
    }
};


function activate(context) {
    // 检查升级
    checkUpgrade();

    hx.window.registerUriHandler({
        handleUri: function(uri) {
            handerUri(uri);
        }
    }, context);

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

    // 批量注册运行命令，避免重复样板代码
    const registerRunCommand = (commandId, platform, scope) => {
        const disposable = hx.commands.registerCommand(commandId, (param) => {
            if (scope) {
                run.main(param, platform, scope);
            } else {
                run.main(param, platform);
            }
        });
        context.subscriptions.push(disposable);
    };

    [
        ['unitest.runTestAll', 'all'],
        ['unitest.runTestH5', 'web-chrome'],
        ['unitest.runTestH5Firefox', 'web-firefox'],
        ['unitest.runTestH5Safari', 'web-safari'],
        ['unitest.runTestWeiXin', 'mp-weixin'],
        ['unitest.runTestIOS', 'ios'],
        ['unitest.runTestAndroid', 'android'],
        ['unitest.runTestHarmony', 'harmony'],
    ].forEach(([id, platform]) => registerRunCommand(id, platform));

    [
        ['unitest.runCurrentTestAll', 'all'],
        ['unitest.runCurrentTestH5', 'web-chrome'],
        ['unitest.runCurrentTestH5Firefox', 'web-firefox'],
        ['unitest.runCurrentTestH5Safari', 'web-safari'],
        ['unitest.runCurrentTestWeiXin', 'mp-weixin'],
        ['unitest.runCurrentTestIOS', 'ios'],
        ['unitest.runCurrentTestAndroid', 'android'],
        ['unitest.runCurrentTestHarmony', 'harmony'],
    ].forEach(([id, platform]) => registerRunCommand(id, platform, 'one'));
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
        let result = config.get('hbuilderx-for-uniapp-test.isDebug');
        config.update('hbuilderx-for-uniapp-test.isDebug', !result).then( () => {
            let text = result ? '取消' : '启用';
            hx.window.setStatusBarMessage(`已 ${text} 自动修改调试日志输出。`, 'info', 10000);
        });
    });
    context.subscriptions.push(debugLog);

    // 记录单条用例到文件
    let recordTestCaseList = hx.commands.registerCommand('unitest.recordTestCaseList', () => {
        let config = hx.workspace.getConfiguration();
        let result = config.get('hbuilderx-for-uniapp-test.recordTestCaseList');
        config.update('hbuilderx-for-uniapp-test.recordTestCaseList', !result).then( () => {
            let text = result ? '取消' : '启用';
            hx.window.setStatusBarMessage(`已 ${text} 运行单条test.js时记录到文件。`, 'info', 10000);
        });
    });
    context.subscriptions.push(recordTestCaseList);

    // 更多设置
    let moreSet = hx.commands.registerCommand('unitest.moreSettings', () => {
        hx.workspace.gotoConfiguration('hbuilderx-for-uniapp-test.uniappCompileNodeType')
    });
    context.subscriptions.push(moreSet);

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

    // 批量注册 CLI 命令
    const registerCli = (cmdId, platform) => {
        const disposable = hx.commands.registerCliCommand(cmdId, async (params) => {
            await RunTestForHBuilderXCli_main(params, platform);
        });
        context.subscriptions.push(disposable);
    };

    [
        ['uniapp.test web', 'web'],
        ['uniapp.test web-chrome', 'web-chrome'],
        ['uniapp.test web-safari', 'web-safari'],
        ['uniapp.test web-firefox', 'web-firefox'],
        ['uniapp.test mp-weixin', 'mp-weixin'],
        ['uniapp.test app-android', 'android'],
        ['uniapp.test app-ios-simulator', 'ios'],
        ['uniapp.test app-harmony', 'harmony'],
    ].forEach(([cmd, platform]) => registerCli(cmd, platform));};

//该方法将在插件禁用的时候调用（目前是在插件卸载的时候触发）
function deactivate() {

}

module.exports = {
    activate,
    deactivate
}
