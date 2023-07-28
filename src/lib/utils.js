const hx = require('hbuilderx');
const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');

const os = require('os');
const osName = os.platform();

var child;
var child_pid;

/**
 * @description 递归创建目录 同步方法
 * @param {Object} dirname
 * @return {Boolean}
 */
function mkdirsSync(dirname) {
    if (fs.existsSync(dirname)) {
        return true;
    } else {
        if (mkdirsSync(path.dirname(dirname))) {
            fs.mkdirSync(dirname);
            return true;
        };
    };
};

/**
 * @description 以当前时间生成文件名
 * @return {String}
 */
function getFileNameForDate() {
    let now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth();
    let date = now.getDate();
    let hour = now.getHours();
    let minu = now.getMinutes();
    month = month + 1;
    if (month < 10) month = "0" + month;
    if (date < 10) date = "0" + date;
    let time = year + month + date + hour + minu;
    return time;
};

/**
 * @description 判断是否是uniapp-cli项目
 * @param {String} projectPath
 * @return {Boolean}
 */
async function isUniAppCli(projectPath) {
    let t1 = fs.existsSync(path.join(projectPath, "node_modules"));
    let t2 = fs.existsSync(path.join(projectPath, "src/pages"));
    let t3 = fs.existsSync(path.join(projectPath, "src/manifest.json"));
    let t4 = fs.existsSync(path.join(projectPath, "package.json"));
    return t1 && t2 && t3 && t4 ? true : false;
};

/**
 * @description 判断是否是uniapp-x项目
 * @param {String} projectPath
 * @returns {Boolean}
 */
async function isUniAppX(projectPath) {
    const is_main_ts = fs.existsSync(path.join(projectPath, "main.uts"));

    const manifestPath = path.join(projectPath, "manifest.json");
    if (!fs.existsSync(manifestPath)) return false;

    try {
        let result = await hx.util.readJSONValue(manifestPath, "uni-app-x").then((data) => {
            return data;
        });
        return result["data"] != null && is_main_ts ? true : false;
    } catch (error) {
        return false;
    };
};

/**
 * @description 对话框
 *     - 插件API: hx.window.showMessageBox
 *     - 已屏蔽esc事件，不支持esc关闭弹窗；因此弹窗上的x按钮，也无法点击。
 *     - 按钮组中必须提供`关闭`操作。且关闭按钮需要位于数组最后。
 * @param {String} title
 * @param {String} text
 * @param {String} buttons 按钮，必须大于1个
 * @return {String}
 */
function hxShowMessageBox(title, text, buttons = ['关闭']) {
    return new Promise((resolve, reject) => {
        if ( buttons.length > 1 && (buttons.includes('关闭') || buttons.includes('取消')) ) {
            if (osName == 'darwin') {
                buttons = buttons.reverse();
            };
        };
        hx.window.showMessageBox({
            type: 'info',
            title: title,
            text: text,
            buttons: buttons,
            defaultButton: 0,
            escapeButton: -100
        }).then(button => {
            resolve(button);
        }).catch(error => {
            reject(error);
        });
    });
};

/**
 * @description 安装插件
 * @param {version} String 插件版本
 */
function installPlugin() {
    let terminalName = osName == "win32" ? "builtincef3terminal" : "builtinterminal";
    return new Promise((resolve, reject) => {
        let info = {
            "id": terminalName,
            "name": terminalName,
            "category_name": "HBuilderX",
            "category_code": "extension-for-hbuilderx",
            "category_id": 11,
            "platforms": []
        };
        let url = 'hbuilderx://ext/download?plugin=' + encodeURIComponent(JSON.stringify(info));
        hx.env.openExternal(url);
    });
};

/**
 * @description 安装终端
 * @param {Object} options
 */
async function installTerminal() {
    hxShowMessageBox("提示", "uni-app自动化测试环境安装，依赖终端插件，请安装终端插件。\n\n 安装方法：点击顶部菜单【工具】【插件安装】，安装新插件，找到内置终端，点击安装。", ["我知道了"]).then( btn => {
        return btn;
    });
    // let userSelected = await hxShowMessageBox("提示", "uni-app自动化测试环境安装，依赖终端插件，请安装终端插件", ["安装"]).then( btn => {
    //     return btn;
    // });
    // if (userSelected == "安装") {
    //     installPlugin();
    // };
};

/**
 * @description 获取插件配置
 */
async function getPluginConfig(options) {
    let config = await hx.workspace.getConfiguration();
    return config.get(options);
};

/**
 * @description 创建输出控制台
 * @param {String} msg
 * @param {String} msgLevel (warning | success | error | info), 控制文本颜色
 * @param {String} viewID 目前的值仅为: 'log'
 */
function createOutputChannel(msg, msgLevel = 'info', viewID = undefined) {
    let oID = viewID == undefined || viewID == '' ? 'hbuilderx.uniapp.test' : 'hbuilderx.uniapp.test' + `.${viewID}`;

    let title = viewID != 'log' ? "uni-app自动化测试" : "uni-app自动化测试 - 运行日志";
    let output = hx.window.createOutputView({
        id: oID,
        title: title
    });
    output.show();

    if (['warning', 'success', 'error', 'info'].includes(msgLevel)) {
        output.appendLine({line: msg, level: msgLevel});
    } else {
        output.appendLine(msg);
    };
};

/**
 * @description 创建输出控制台, 支持文件链接跳转
 * @param {String} msg
 * @param {String} msgLevel (warning | success | error | info), 控制文本颜色
 * @param {String} viewID 目前的值仅为: 'log'
 * @param {String} runDir 程序执行目录
 */
function createOutputViewForHyperLinks(msg, msgLevel='info', viewID, runDir) {
    let oID = viewID == undefined || viewID == '' ? 'hbuilderx.uniapp.test' : 'hbuilderx.uniapp.test' + `.${viewID}`;
    let title = viewID != 'log' ? "uni-app自动化测试" : "uni-app自动化测试 - 运行日志";

    let outputView = hx.window.createOutputView({
        id: oID,
        title: title
    });
    outputView.show();

    let filepath, start;
    if (msg.includes('测试报告:')) {
        start = "测试报告:".length + msg.indexOf('测试报告:');
        filepath = msg.substring(start, msg.length);
    };
    if (msg.includes('Test results written to:')) {
        start = "Test results written to: ".length;
        let tmp = msg.substring(start, msg.length);
        filepath = path.resolve(runDir, tmp);
    };
    outputView.appendLine({
        line: msg,
        level: msgLevel,
        hyperlinks:[
            {
                linkPosition: {
                    start: start,
                    end: msg.length
                },
                onOpen: function() {
                    filepath = filepath.trim();
                    hx.workspace.openTextDocument(filepath);
                    setTimeout(function() {
                        hx.commands.executeCommand('editor.action.format');
                        hx.commands.executeCommand('workbench.action.files.save');
                    }, 100);
                }
            }
        ]
    });
};

/**
 * @description 控制台结束
 */
function createOutputViewForHyperLinksForKill(MessagePrefix) {
    let outputView = hx.window.createOutputView({
        id: "hbuilderx.uniapp.test",
        title: "uni-app自动化测试"
    });
    outputView.show();

    let msg = MessagePrefix + "正在运行测试，如需提前结束，请点击: ";
    outputView.appendLine({
        line: msg + "结束运行",
        level: "info",
        hyperlinks:[
            {
                linkPosition: {
                    start: msg.length,
                    end: (msg + '结束运行').length
                },
                onOpen: function() {
                    stopRunTest()
                }
            }
        ]
    });
};


/**
 * @description jest运行日志输出到指定控制台
 * @param {String} MessagePrefix - 日志前缀
 * @param {String} msg - 消息内容
 */
function printTestRunLog(MessagePrefix, msg) {
    let output = hx.window.createOutputView({
        id: "hbuilderx.uniapp.test.log",
        title: "uni-app自动化测试 - 运行日志"
    });
    output.show();

    let msgLevel = "info"
    let lastMsg = msg.trim();
    let theFour = msg.substring(0,4);
    if ((msg.includes("Module Error") && msg.includes("Errors compiling")) || msg.includes("语法错误")) {
        lastMsg = lastMsg + "\n"
        msgLevel = "error";
    } else if (theFour == "FAIL" || msg.includes('TypeError') || (msg.includes('Expected') && msg.includes('Received')) || msg.includes('Test suite failed to run')) {
        lastMsg = lastMsg + "\n"
        msgLevel = "error";
    } else if (theFour == "PASS") {
        lastMsg = lastMsg + "\n"
        msgLevel = "success";
    } else if (msg.includes('Ran all test suites.') && msg.includes("Tests") && msg.includes("total")) {
        msgLevel = "info";
    };
    let data = lastMsg.split(/[\r\n|\n]/);
    for (let s of data) {
        output.appendLine({line: MessagePrefix + ' ' + s, level: msgLevel});
    };
};

/**
 * @description 命令行运行
 * @param {String} cmd - 命令行运行的命令
 * @param {Obejct} opts
 * @param {Object} testInfo - {projectName: projectName, testPlatform: testPlatform}
 * @param {Boolean} isDebug - debug状态，可以控制日志打印
 */
function runCmd(cmd = [], opts = {}, testInfo = {}, isDebug) {
    let { projectName, testPlatform, deviceId } = testInfo;

    // 解决控制台[]内内容长度太长的问题
    if (deviceId && deviceId.length >= 8) {
        deviceId = deviceId.replace(deviceId.substring(6), '..');
    };

    let MessagePrefix = deviceId ? `[${projectName}:${testPlatform}-${deviceId}]` : `[${projectName}:${testPlatform}]`;
    createOutputViewForHyperLinksForKill(MessagePrefix);
    createOutputChannel(`${MessagePrefix} 项目 ${projectName}，开始运行 ${testPlatform} 测试`, 'success', 'log');

    const test_cmd = cmd.join(' ');
    console.error(cmd);
    if (isDebug) {
        createOutputChannel(`${MessagePrefix} 测试命令为：${test_cmd}\n`, 'info', 'log');
    };

    opts = Object.assign({
        stdio: 'pipe',
        cwd: process.cwd()
    }, opts);

    // const shell = process.platform === 'win32' ? {cmd: 'cmd',arg: '/C'} : {cmd: 'sh',arg: '-c'};
    try {
        // child = spawn(shell.cmd, [shell.arg, cmd], opts);
        child = spawn('node', cmd, opts);
        child_pid = child.pid;
    } catch (error) {
        return Promise.reject(error)
    };

    return new Promise(resolve => {
        if (child.stdout) {
            child.stdout.on('data', data => {
                let stdoutMsg = (data.toString()).trim();
                if ((stdoutMsg.includes("Module Error") && stdoutMsg.includes("Errors compiling")) || stdoutMsg.includes("语法错误")) {
                    printTestRunLog(MessagePrefix, stdoutMsg);
                    stopRunTest();
                } else {
                    printTestRunLog(MessagePrefix, stdoutMsg);
                };
            });
        };

        let is_port_9520_error = false;
        let runDir = opts.cwd;
        if (child.stderr) {
            child.stderr.on('data', data => {
                let msg = data.toString();
                if (msg == '\n' || msg == '\r\n') return;
                if (msg.includes('Test results written to:') && osName == 'darwin') {
                    createOutputViewForHyperLinks(msg, 'info', "log", runDir);
                } else {
                    printTestRunLog(MessagePrefix, msg);
                    if (msg.includes('Port 9520 is in use, please specify another port') && osName == 'darwin') {
                        is_port_9520_error = true;
                    };
                };
            })
        };

        child.on('error', error => {
            createOutputChannel(`${MessagePrefix}测试运行异常，已结束运行。`, "error", "log");
            createOutputChannel(`${MessagePrefix}测试运行异常，已结束运行。`, "error");
            resolve('run_error');
        });

        child.on('close', code => {
            if (is_port_9520_error) {
                createOutputChannel(`${MessagePrefix} 如果您遇到错误 Port 9520 is in use, please specify another port , 解决方法: 打开终端，输入命令 lsof -i:9520 | awk '{print $2}' | tail -n +2 | xargs kill -9`, "error", "log");
            };

            child_pid = undefined;
            let endMsg = code == null ? `${MessagePrefix} 测试运行结束。原因：手动结束、或其它意外结束。\n\n` : `${MessagePrefix} 测试运行结束。\n\n`;
            let msgLevel = endMsg.includes("手动结束") ? 'error' : 'success';
            createOutputChannel(endMsg, msgLevel, "log");
            resolve('run_end');
        });
    });
};

/**
 * @description Run 打开终端并运行某个命令
 */
async function openAndRunTerminal(runDir, cmd) {
    let cmdParams = {
        rootPath: runDir,
        cmd: cmd,
    };
    hx.window.openAndRunTerminal(cmdParams).then(data => {
        console.log(data)
    });
};

/**
 * @description 写入文件
 */
async function writeFile(fpath, filecontent) {
    return new Promise(function(resolve, reject) {
        fs.writeFile(fpath, filecontent, function (err) {
            if (err) {
                console.eror(err)
                reject(err);
            };
            resolve('success')
        });
    });
};


/**
 * @description 检查本机是否安装node
 */
function checkNode() {
    return new Promise((resolve, reject) => {
        exec('node -v', function(error, stdout, stderr) {
            if (error) {
                reject("N")
            };
            try {
                let version = stdout.match(/(\d{1,3}.\d{1,3}.\d{1,3})/g)[0];
                resolve('Y');
            } catch (e) {
                reject('N')
            };
        });
    })
};


/**
 * @description 停止运行测试
 */
function stopRunTest() {
    if (child_pid == undefined) return;
    try{
        child.kill("SIGKILL");
        // process.kill(child_pid,"SIGKILL")
    }catch(e){
        createOutputChannel(`结束测试进程失败，请手动结束。${e}`)
    };
    // let cmd = osName == 'darwin' ? `kill -9 ${child_pid}` : `taskkill /F /pid ${child_pid}`;
    // exec(cmd, function(error, stdout, stderr) {
    //     if (error) {
    //         createOutputChannel("无法结束测试，请查找jest相关进程，手动结束。")
    //     };
    // });
};

/**
 * @description 检查自定义的测试环境依赖，主要用于内部调试。
 * 当然也可以开放出去，设置此项后，不用在HBuilderX plugins目录下再安装测试环境依赖了。
 *
 * hbuilderx-for-uniapp-test.customTestEnvironmentDependencyDir 必须是绝对路径。且结尾目录是node_modules
 *
 */
async function checkCustomTestEnvironmentDependency() {
    let userSet = await getPluginConfig("hbuilderx-for-uniapp-test.customTestEnvironmentDependencyDir");
    if (userSet != undefined && userSet.trim() != '') {
        if (fs.existsSync(userSet) && path.basename(userSet) == "node_modules") {
            console.error("自定义测试目录为：", userSet);
            hx.window.setStatusBarMessage("hbuilderx-for-uniapp-test:: 使用自定义测试环境依赖目录！", 50000, "info");
            return userSet;
        };
        hx.window.setStatusBarMessage("hbuilderx-for-uniapp-test:: 自定义测试环境依赖目录无效！", 50000, "error");
        console.error("hbuilderx-for-uniapp-test:: 自定义测试环境依赖目录无效！")
        return false;
    } else {
        console.error("hbuilderx-for-uniapp-test:: 没有自定义测试环境依赖目录！")
        return false;
    };
};

/**
 * @description 判断是否是uts项目：判定条件，uni_modules目录下存在utssdk目录
 * @param {Object} project_path
 * @param {Object} is_uniapp_cli
 */
async function checkUtsProject(project_path, is_uniapp_cli) {
    let uni_modules_dir = path.join(project_path, "uni_modules");
    if (is_uniapp_cli) {
        uni_modules_dir = path.join(project_path, "src" ,"uni_modules");
    };
    if (!fs.existsSync(uni_modules_dir)) {
        return false;
    };

    var uni_modules_list = fs.readdirSync(uni_modules_dir);
    if (uni_modules_list.length == 0) return;

    // uts项目判定条件：uni_modules目录下存在utssdk目录
    let is_uts = false;
    for (let f of uni_modules_list) {
        let utssdk_dir = path.join(uni_modules_dir, f, "utssdk")
        if (fs.existsSync(utssdk_dir)) {
            is_uts = true;
            break;
        };
    };
    return is_uts;
};

/**
 * @description 读取uni-app manifest.json文件
 */
async function readUniappManifestJson(project_path, is_uniapp_cli, field) {
    let manifest_file = path.join(project_path, "manifest.json");
    if (is_uniapp_cli) {
        manifest_file = path.join(project_path, "src", "manifest.json");
    };
    let result = hx.util.readJSONValue(manifest_file, field).then((data) => {
        return data;
    });
    return result;
};

module.exports = {
    mkdirsSync,
    writeFile,
    getFileNameForDate,
    getPluginConfig,
    createOutputChannel,
    createOutputViewForHyperLinks,
    openAndRunTerminal,
    runCmd,
    hxShowMessageBox,
    checkNode,
    isUniAppCli,
    isUniAppX,
    stopRunTest,
    installTerminal,
    checkCustomTestEnvironmentDependency,
    checkUtsProject,
    readUniappManifestJson
}
