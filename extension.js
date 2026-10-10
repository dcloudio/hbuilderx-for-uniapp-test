const vscode = require('vscode');

const { stopRunTest, setTestOutputView } = require('./src/core/core.js');
const { addFilePathToJestConfig } = require('./src/core/edit_jest_config_js_file.js');

const config = require('./src/core/config.js');
const Initialize = require('./src/Initialize.js');
const TestCaseCreate = require("./src/TestCaseCreate.js");
const createAgentsMd = require('./src/createAgentsMd.js');
const { RunTest } = require("./src/TestCaseRun.js");
const { RunTestForHBuilderXCli_main, readPluginsPackageJson } = require('./src/HBuilder_Cli.js');
const { finishHBuilderVConsole, registerHBuilderVConsole, setHBuilderVConsoleRestartHandler } = require('./src/hbuilderv-console.js');

function handerUri(uri) {
    console.error("uri = ", uri);
    let url_path = uri.path;
    let actions = url_path.split('/').pop();
    console.error("actions = ", actions);

    let query_params = uri.query;
    if (query_params) {
        query_params = Object.fromEntries(new URLSearchParams(query_params));
        if (actions == "command") {
            vscode.commands.executeCommand(query_params.id);
        }
    }
};

function normalizeCommandParam(param) {
    if (param?.workspaceFolder || param?.document) return param;
    const activeDocument = vscode.window.activeTextEditor?.document;
    const resource = param?.fsPath ? vscode.Uri.file(param.fsPath) : activeDocument?.uri;
    const folder = resource ? vscode.workspace.getWorkspaceFolder(resource) : vscode.workspace.workspaceFolders?.[0];
    if (!folder) return param;
    return {
        ...(param || {}),
        fsPath: param?.fsPath || activeDocument?.uri.fsPath || folder.uri.fsPath,
        workspaceFolder: folder,
        document: activeDocument,
    };
}

function normalizeCliCommandParams(params) {
    const args = { ...params };
    delete args.cliconsole;
    delete args.rawArgv;
    delete args.cwd;
    return { ...params, cliconsole: params.cliconsole, args };
}


function activate(context) {
    // console.log("----2342----", vscode.hbuilderxVersion)
    context.subscriptions.push(registerHBuilderVConsole(context));
    vscode.commands.executeCommand('setContext', 'hbuildervUniappTestRunning', false);

    context.subscriptions.push(vscode.window.registerUriHandler({
        handleUri: function(uri) {
            handerUri(uri);
        }
    }));

    let run = new RunTest();

    // 初始化测试环境：安装测试环境、创建测试配置文件
    let initialization = vscode.commands.registerCommand('unitest.initialization', (param) => {
        let init = new Initialize();
        init.main(normalizeCommandParam(param));
    });
    context.subscriptions.push(initialization);

    // 重装测试环境
    let reloadEnv = vscode.commands.registerCommand('unitest.reloadEnv', () => {
        let init = new Initialize();
        init.checkPluginDependencies('all', true);
    });
    context.subscriptions.push(reloadEnv);

    // 创建测试用例 (uni-app项目，pages页面，右键菜单)
    let createTestCase = vscode.commands.registerCommand('unitest.createTestCase', (param) => {
        TestCaseCreate(normalizeCommandParam(param));
    });
    context.subscriptions.push(createTestCase);

    // 创建 AGENTS.test.md 文件 (uni-app项目根目录，右键菜单)
    let createAgents = vscode.commands.registerCommand('unitest.createAgentsMd', (param) => {
        return createAgentsMd(normalizeCommandParam(param));
    });
    context.subscriptions.push(createAgents);

    // 批量注册运行命令，避免重复样板代码
    const registerRunCommand = (commandId, platform, scope) => {
        const disposable = vscode.commands.registerCommand(commandId, (param) => {
            param = normalizeCommandParam(param);
            const executeRun = (reuseSelectedDevices = false) => Promise.resolve().then(() => {
                if (scope) {
                    return run.main(param, platform, scope, reuseSelectedDevices);
                }
                return run.main(param, platform, "all", reuseSelectedDevices);
            }).finally(() => {
                setTestOutputView();
                finishHBuilderVConsole();
                return vscode.commands.executeCommand('setContext', 'hbuildervUniappTestRunning', false);
            });
            setHBuilderVConsoleRestartHandler(() => executeRun(true));
            return executeRun();
        });
        context.subscriptions.push(disposable);
    };

    [
        ['unitest.runTestH5', 'web-chrome'],
        ['unitest.runTestH5Firefox', 'web-firefox'],
        ['unitest.runTestH5Safari', 'web-safari'],
        ['unitest.runTestWeiXin', 'mp-weixin'],
        ['unitest.runTestAlipay', 'mp-alipay'],
        ['unitest.runTestIOS', 'ios'],
        ['unitest.runTestAndroid', 'android'],
        ['unitest.runTestHarmony', 'harmony'],
    ].forEach(([id, platform]) => registerRunCommand(id, platform));

    [
        ['unitest.runCurrentTestH5', 'web-chrome'],
        ['unitest.runCurrentTestH5Firefox', 'web-firefox'],
        ['unitest.runCurrentTestH5Safari', 'web-safari'],
        ['unitest.runCurrentTestWeiXin', 'mp-weixin'],
        ['unitest.runCurrentTestAlipay', 'mp-alipay'],
        ['unitest.runCurrentTestIOS', 'ios'],
        ['unitest.runCurrentTestAndroid', 'android'],
        ['unitest.runCurrentTestHarmony', 'harmony'],
    ].forEach(([id, platform]) => registerRunCommand(id, platform, 'one'));
    // stop run
    let stopRun = vscode.commands.registerCommand('unitest.stopRunTest', () => {
        stopRunTest();
    });
    context.subscriptions.push(stopRun);

    let AutotestMatch = vscode.commands.registerCommand('unitest.isAutotestMatch', () => {
        let config = vscode.workspace.getConfiguration();
        let result = config.get('uniapp-test-cfg.AutomaticModificationTestMatch');
        config.update('uniapp-test-cfg.AutomaticModificationTestMatch', !result).then( () => {
            let text = result ? '取消' : '启用';
            vscode.window.setStatusBarMessage(`已 ${text} 自动修改testMatch。`, 10000);
        });
    });
    context.subscriptions.push(AutotestMatch);

    // 是否输出调试日志
    let debugLog = vscode.commands.registerCommand('unitest.enableDebugLog', () => {
        let config = vscode.workspace.getConfiguration();
        let result = config.get('uniapp-test-cfg.isDebug');
        config.update('uniapp-test-cfg.isDebug', !result).then( () => {
            let text = result ? '取消' : '启用';
            vscode.window.setStatusBarMessage(`已 ${text} 自动修改调试日志输出。`, 10000);
        });
    });
    context.subscriptions.push(debugLog);

    // 是否输出运行时日志
    let runtimeLog = vscode.commands.registerCommand('unitest.enableRuntimeLog', () => {
        let config = vscode.workspace.getConfiguration();
        let result = config.get('uniapp-test-cfg.isRuntimeLog');
        config.update('uniapp-test-cfg.isRuntimeLog', !result).then( () => {
            let text = result ? '取消' : '启用';
            vscode.window.setStatusBarMessage(`已 ${text} 运行时日志输出。`, 10000);
        });
    });
    context.subscriptions.push(runtimeLog);

    // 记录单条用例到文件
    let recordTestCaseList = vscode.commands.registerCommand('unitest.recordTestCaseList', () => {
        let config = vscode.workspace.getConfiguration();
        let result = config.get('uniapp-test-cfg.recordTestCaseList');
        config.update('uniapp-test-cfg.recordTestCaseList', !result).then( () => {
            let text = result ? '取消' : '启用';
            vscode.window.setStatusBarMessage(`已 ${text} 运行单条test.js时记录到文件。`, 10000);
        });
    });
    context.subscriptions.push(recordTestCaseList);

    // 添加文件路径到jest.config.js
    let addFilePath = vscode.commands.registerCommand('unitest.addFilePathToJestConfig', (param) => {
        addFilePathToJestConfig(normalizeCommandParam(param));
    });
    context.subscriptions.push(addFilePath);

    // 更多设置
    let moreSet = vscode.commands.registerCommand('unitest.moreSettings', () => {
        vscode.commands.executeCommand('workbench.action.openSettings', '@id:uniapp-test-cfg.uniappCompileNodeType')
    });
    context.subscriptions.push(moreSet);

    // hbuilderx cli 支持
    let cli_uni = vscode.commands.registerCliCommand('uniapp.test', async (params) => {
        params = normalizeCliCommandParams(params);
        let {version} = params.args;
        if (version || version == "") {
            let pkg = await readPluginsPackageJson();
            const plugin_version = pkg.version;
            const hx_version = config.hx_env_app_version;
            const msg = `plugin version：${plugin_version}\nHBuilderV version: ${hx_version}`;
            await params.cliconsole.log(msg);
        };
    });
    context.subscriptions.push(cli_uni);

    // 批量注册 CLI 命令
    const registerCli = (cmdId, platform, deviceType) => {
        const disposable = vscode.commands.registerCliCommand(cmdId, async (params) => {
            await RunTestForHBuilderXCli_main(normalizeCliCommandParams(params), platform, deviceType);
        });
        context.subscriptions.push(disposable);
    };

    [
        ['uniapp.test web', 'web'],
        ['uniapp.test web-chrome', 'web-chrome'],
        ['uniapp.test web-safari', 'web-safari'],
        ['uniapp.test web-firefox', 'web-firefox'],
        ['uniapp.test mp-weixin', 'mp-weixin'],
        ['uniapp.test mp-alipay', 'mp-alipay'],
        ['uniapp.test app-android', 'android'],
        ['uniapp.test app-ios-simulator', 'ios'],
        ['uniapp.test app-ios', 'ios', '真机'],
        ['uniapp.test app-harmony', 'harmony'],
    ].forEach(([cmd, platform, deviceType]) => registerCli(cmd, platform, deviceType));};

//该方法将在插件禁用的时候调用（目前是在插件卸载的时候触发）
function deactivate() {

}

module.exports = {
    activate,
    deactivate
}
