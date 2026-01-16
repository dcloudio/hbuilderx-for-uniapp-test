const fs = require('fs');
const hx = require('hbuilderx');
const path = require('path');
let config = require('./config.js');
const {
    createOutputChannel,
    getPluginConfig,
} = require('./core.js');

const {
    fsWriteFile
} = require('../utils/utils_files.js');


/**
 * @description 加载jest.config.js配置文件
 * @param {String} jest_config_js_path - jest.config.js文件路径
 * @param {Function} logger - 日志输出函数
 * @return {Object|null} - 配置对象或null
 */
function loadJestConfig(jest_config_js_path, logger) {
    if (!fs.existsSync(jest_config_js_path)) {
        return null;
    }
    delete require.cache[require.resolve(jest_config_js_path)];
    try {
        return require(jest_config_js_path);
    } catch (e) {
        return null;
    }
}

/**
 * @description 更新jest.config.js的testMatch字段
 * @param {String} jest_config_js_path - jest.config.js文件路径
 * @param {Array} newTestMatch - 新的testMatch数组
 * @param {Function} logger - 日志输出函数
 * @return {Promise<Boolean>} - true|false
 */
async function updateTestMatch(jest_config_js_path, newTestMatch, logger) {
    try {
        let jestFileContent = fs.readFileSync(jest_config_js_path, 'utf-8');
        let newTestMatchStr = 'testMatch: ' + JSON.stringify(newTestMatch, null, 2).replace(/\n/g, '\n    ');

        // 查找 testMatch: [ 的位置，然后手动匹配括号找到数组结束位置
        let match = jestFileContent.match(/testMatch\s*:\s*\[/);
        if (!match) {
            return false;
        }
        let startIndex = match.index;
        let bracketStart = startIndex + match[0].length - 1; // [ 的位置
        let bracketCount = 1;
        let endIndex = bracketStart + 1;

        // 查找配对的 ]
        while (endIndex < jestFileContent.length && bracketCount > 0) {
            let char = jestFileContent[endIndex];
            if (char === '[') bracketCount++;
            else if (char === ']') bracketCount--;
            endIndex++;
        }

        // 替换整个 testMatch: [...] 部分
        let lastContent = jestFileContent.slice(0, startIndex) + newTestMatchStr + jestFileContent.slice(endIndex);

        let writeResult = await fsWriteFile(jest_config_js_path, lastContent);
        return writeResult === 'success';
    } catch (e) {
        await logger(`${jest_config_js_path} 修改异常: ${e}`, 'warning');
        return false;
    }
}

/**
 * @description 从HBuilderX右键菜单参数中提取项目路径和选中文件路径
 * @param {Object} param - HBuilderX传入的参数对象
 * @return {Object|null} - {projectPath, selectedFile} 或 null
 */
function extractPathsFromParam(param) {
    let selectedFile = param.document ? param.document.uri.fsPath : null;
    if (!selectedFile && param.fsPath) {
        selectedFile = param.fsPath;
    }
    if (!selectedFile) {
        return null;
    }

    let workspaceFolder = param.workspaceFolder;
    if (!workspaceFolder && param.document) {
        workspaceFolder = param.document.workspaceFolder;
    }
    let projectPath = workspaceFolder ? workspaceFolder.uri.fsPath : null;
    if (!projectPath) {
        return null;
    }
    return { projectPath, selectedFile };
}

/**
 * @description 修改jest.config.js testMatch字段（替换模式，用于运行测试）
 * @param {String} scope - 测试范围，全部测试|单一用例测试
 * @param {Object} proj - 项目信息
 * @param {String} client_id - 客户端ID，有此参数表示命令行模式
 * @return {Boolean} - true|false
 */
async function modifyJestConfigJSFile(scope="", proj={}, client_id) {
    let { projectPath, selectedFile, is_uniapp_cli } = proj;
    let logger = createOutputChannel;
    if (client_id) {
        logger = async function (message) {
            await hx.cliconsole.log({ clientId: client_id, msg: message, status: 'Info' });
        };
    }

    const jest_config_js_path = path.join(projectPath, 'jest.config.js');
    let jestConfigContent = loadJestConfig(jest_config_js_path, logger);
    if (!jestConfigContent) {
        await logger(`测试配置文件 ${jest_config_js_path} 读取异常，请检查。`, 'error');
        return false;
    }

    // 插件配置项：是否自动修改jest.config.js文件中的testMatch
    let userConfig = await getPluginConfig('hbuilderx-for-uniapp-test.AutomaticModificationTestMatch');
    if (userConfig == false) {
        await logger(`[uniapp.test] 您已关闭自动修改 jest.config.js 配置文件中的 testMatch 字段，跳过此操作。`);
        return true;
    }

    console.error('[modifyJestConfigJSFile]......', scope, proj);
    await logger("[uniapp.test] 修改jest.config.js文件 testMatch字段 ... ");

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
        }

        // 记录单条用例路径
        let isRecord = await getPluginConfig('hbuilderx-for-uniapp-test.recordTestCaseList');
        if (isRecord) {
            let recordPath = path.join(projectPath, '.hbuilderx', 'testCaseList.json');
            if (fs.existsSync(path.dirname(recordPath))) {
                await fsWriteFile(recordPath, JSON.stringify([projectTestMatch], null, 4));
            }
        }
    }

    let oldTestMatch = jestConfigContent["testMatch"];
    if (!Array.isArray(oldTestMatch)) {
        await logger(`${jest_config_js_path} 测试配置文件, testMatch字段，应为数组类型，请检查。`, 'error');
        return false;
    }

    if (oldTestMatch[0] == projectTestMatch) {
        return true;
    }

    // 替换模式：只保留单一路径
    let success = await updateTestMatch(jest_config_js_path, [projectTestMatch], logger);
    if (!success) {
        await logger(`${jest_config_js_path} 修改测试配置文件失败，终止后续操作，请检查此文件。`, 'warning');
    }
    return success;
}

/**
 * @description 将当前测试文件路径添加到jest.config.js的testMatch字段（追加模式，保留原有路径）
 * @param {Object} param - HBuilderX传入的参数对象
 * @return {Boolean} - true|false
 */
async function addFilePathToJestConfig(param) {
    let logger = createOutputChannel;

    let paths = extractPathsFromParam(param);
    if (!paths) {
        await logger('[uniapp.test] 未获取到文件或项目路径', 'error');
        return false;
    }
    let { projectPath, selectedFile } = paths;

    const jest_config_js_path = path.join(projectPath, 'jest.config.js');
    let jestConfigContent = loadJestConfig(jest_config_js_path, logger);
    if (!jestConfigContent) {
        await logger(`[uniapp.test] 配置文件不存在或加载异常: ${jest_config_js_path}`, 'error');
        return false;
    }

    let testcase_file_relative_path = selectedFile.slice(projectPath.length + 1);
    let projectTestMatch = `<rootDir>/${testcase_file_relative_path}`;

    let oldTestMatch = jestConfigContent["testMatch"];
    if (!Array.isArray(oldTestMatch)) {
        await logger(`[uniapp.test] ${jest_config_js_path} testMatch字段应为数组类型`, 'error');
        return false;
    }

    // 检查是否已存在
    if (oldTestMatch.includes(projectTestMatch)) {
        await logger(`[uniapp.test] 路径已存在于testMatch中: ${projectTestMatch}`);
        hx.window.setStatusBarMessage(`路径已存在: ${testcase_file_relative_path}`, 'info', 5000);
        return true;
    }

    // 追加模式：保留原有路径，添加新路径
    let newTestMatchArray = [...oldTestMatch, projectTestMatch];
    let success = await updateTestMatch(jest_config_js_path, newTestMatchArray, logger);
    if (success) {
        await logger(`[uniapp.test] 已添加到testMatch: ${projectTestMatch}`);
        hx.window.setStatusBarMessage(`已添加: ${testcase_file_relative_path}`, 'info', 5000);
    } else {
        await logger(`[uniapp.test] 修改 ${jest_config_js_path} 失败`, 'warning');
    }
    return success;
}

module.exports = {
    modifyJestConfigJSFile,
    addFilePathToJestConfig
};
