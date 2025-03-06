const hx = require('hbuilderx');
const fs = require('fs');
const path = require('path');

/**
 * @description 项目管理器事件触发项，自动生成测试用例名称
 */
function getTestCaseName(selected) {
    let state = fs.statSync(selected);
    if (state.isFile()) {
        const basename = path.basename(selected);
        return basename.split('.')[0];
    };
    if (state.isDirectory()) {
        return path.basename(selected);
    };
    return '';
};

/**
 * @description 创建测试用例文件
 * @param {Object} param - 项目管理器选中文件信息
 */
async function TestCaseCreate(param) {
    let defaultName = "";
    let projectPath = "";
    let selectedFile = "";

    // 自动生成测试用例文件名称
    if (param && typeof param === 'object') {
        try{
            projectPath = param.workspaceFolder.uri.fsPath;
            selectedFile = param.fsPath;
            if (fs.existsSync(selectedFile)) {
               let testcaseName = getTestCaseName(selectedFile);
               defaultName = testcaseName + ".test.js";
            };
        }catch(e){};
    };

    // 校验测试用例文件名称
    let nameValidators = [{
            pattern: "",
            errorMsg: "请输入测试用例文件名称",
        },
        {
            pattern: ".*\.test\.js",
            errorMsg: "文本文件"
        }
    ];

    // 模板
    const fileTemplates = ["简单模板", "空白文件", "Jest示例模板"];

    let FileWizard = await hx.window.showFileWizardDialog({
        title: "新建测试用例文件",
        defaultName: defaultName,
        namePlaceholder: "文件名称，格式为：'xxx.test.js'",
        listTitle: "选择模板",
        folderEditable: false,
        suffix: "test.js",
        template: fileTemplates,
        nameValidators: nameValidators
    }).then(data => {
        return data;
    });

    const {template, file} = FileWizard;
    if (!fileTemplates.includes(template)) {
        return;
    };

    let filecontents = '';
    if (["简单模板", "Jest示例模板"].includes(template)) {
        let ftpath = './template/testcase/default.js';
        if (template == 'Jest示例模板') {
           ftpath = './template/testcase/example.js';
        };
        filecontents = require(ftpath);

        // 根据选择路径，设置describe('') 测试标题
        if (template == '简单模板') {
            let pagePath = selectedFile.replace(projectPath, '');
            let state2 = fs.statSync(selectedFile);
            if (state2.isDirectory()) {
                pagePath = pagePath + '/' + path.basename(selectedFile);
            };
            filecontents = filecontents.replace(`describe('', () => {`, `describe('${pagePath}', () => {`)
        };

        // 读取编辑器缩进配置
        let config = await hx.workspace.getConfiguration();
        let isSpaces = config.get('editor.insertSpaces');
        let tabSize = config.get('editor.tabSize');
        if (isSpaces && isSpaces) {
            filecontents = filecontents.replace(/\t/g, ' '.repeat(parseInt(tabSize)));
        };
    };
    fs.writeFile(file, filecontents, (err) => {
        if (err) {
            hx.window.showErrorMessage('创建文件失败');
        };
        hx.workspace.openTextDocument(file);
    });

};

module.exports = TestCaseCreate;
