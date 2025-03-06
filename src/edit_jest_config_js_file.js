const fs = require('fs');
const path = require('path');
let config = require('./config.js');
const {
    writeFile,
    createOutputChannel,
    getPluginConfig,
} = require('./lib/utils.js');


/**
 * @description 修改jest.config.js testMatch字段
 * @param {String} scope - 测试范围，全部测试|单一用例测试
 * @param {Object} proj - 项目信息
 */
async function modifyJestConfigJSFile(scope="", proj={}) {
    console.log('[modifyJestConfigJSFile]......', scope, proj);
    let { projectPath, selectedFile, is_uniapp_cli } = proj;

    // 读取jest.config.js
    const jest_config_js_path = path.join(projectPath, 'jest.config.js');
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


module.exports = modifyJestConfigJSFile;
