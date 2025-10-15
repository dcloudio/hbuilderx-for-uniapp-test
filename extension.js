const hx = require("hbuilderx");

const { about, checkUpgrade } = require('./public/about.js');
const { stopRunTest } = require('./src/core/core.js');

const Initialize = require('./src/Initialize.js');
const TestCaseCreate = require("./src/TestCaseCreate.js");
const { RunTest } = require("./src/TestCaseRun.js");
const openReportOutputDir = require('./src/TestReports.js');
const { check_cli_args, RunTestForHBuilderXCli } = require('./src/HBuilderXCli.js');


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

    // 运行所有测试用例：H5-Chrome
    let runTestH5 = hx.commands.registerCommand('unitest.runTestH5', (param) => {
        run.main(param, 'h5');
    });
    context.subscriptions.push(runTestH5);

    // 运行所有测试用例：H5-Firefox
    let runTestH5Firefox = hx.commands.registerCommand('unitest.runTestH5Firefox', (param) => {
        run.main(param, 'h5-firefox');
    });
    context.subscriptions.push(runTestH5Firefox);

    // 运行所有测试用例：H5-Safari
    let runTestH5Safari = hx.commands.registerCommand('unitest.runTestH5Safari', (param) => {
        run.main(param, 'h5-safari');
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

    // 运行当前选择的测试用例：H5
    let runCurrentTestToH5 = hx.commands.registerCommand('unitest.runCurrentTestH5', (param) => {
        run.main(param, 'h5', 'one');
    });
    context.subscriptions.push(runCurrentTestToH5);

    // 运行当前选择的测试用例：H5-Firefox
    let runCurrentTestToH5Firefox = hx.commands.registerCommand('unitest.runCurrentTestH5Firefox', (param) => {
        run.main(param, 'h5-firefox', 'one');
    });
    context.subscriptions.push(runCurrentTestToH5Firefox);

    // 运行当前选择的测试用例：H5-Safari
    let runCurrentTestToH5Safari = hx.commands.registerCommand('unitest.runCurrentTestH5Safari', (param) => {
        run.main(param, 'h5-safari', 'one');
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

    let cli_uni_test = hx.commands.registerCliCommand('uniapp.test', async (params) => {
        // 解析命令行参数与输入
        let {args} = params;
        let client_id = params.cliconsole.clientId;

        console.error("[cli参数] args:", args);
        console.error("[cli参数] params:", params);
        console.error("[cli参数] clientID:", client_id);
        
        await hx.cliconsole.log({ clientId: client_id, msg: "欢迎使用 uniapp.test for HBuilderX 命令行工具！", status: 'Info' });
        let checkResult = await check_cli_args(args, client_id);
        console.error("[cli参数校验] checkResult:", checkResult);
        if (checkResult != "") {
            await hx.cliconsole.log({ clientId: client_id, msg: checkResult, status: 'Info' });
            return;
        } else {
            try {
                let cli = new RunTestForHBuilderXCli();
                await cli.main(params.args, client_id);
            } catch (error) {
                await hx.cliconsole.log({ clientId: client_id, msg: "运行异常，" + error });
            };
        };
    });
    context.subscriptions.push(cli_uni_test);
};

//该方法将在插件禁用的时候调用（目前是在插件卸载的时候触发）
function deactivate() {

}

module.exports = {
    activate,
    deactivate
}
