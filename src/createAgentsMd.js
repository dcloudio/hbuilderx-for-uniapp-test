const fs = require('fs');
const path = require('path');
const vscode = require('vscode');

const { createOutputChannel } = require('./core/core.js');

const TEMPLATE_FILE = 'AI-prompt.md';
const OUTPUT_FILE = 'AGENTS.test.md';

/**
 * @description 获取模板文件路径
 * @returns {String} 模板文件绝对路径
 */
function getTemplatePath() {
    return path.join(__dirname, 'template', TEMPLATE_FILE);
}

/**
 * @description 创建 AGENTS.test.md 文件
 * @param {Object} param - HBuilderX 传入的参数对象
 */
async function createAgentsMd(param) {
    if (!param || (!param.document && !param.workspaceFolder)) {
        createOutputChannel('请将焦点置于 uni-app (x) 上后再执行此操作。', 'error');
        return;
    }

    const workspaceFolder = param.workspaceFolder || param.document?.workspaceFolder;
    let projectPath = workspaceFolder?.uri?.fsPath || '';
    if (projectPath == '') {
        createOutputChannel('无法获取项目路径，请在 uni-app 项目上右键执行此操作。', 'error');
        return;
    };
    const templatePath = getTemplatePath();
    const outputPath = path.join(projectPath, OUTPUT_FILE);

    // 检查模板文件是否存在
    if (!fs.existsSync(templatePath)) {
        createOutputChannel(`模板文件不存在: ${templatePath}`, 'error');
        return;
    }

    // 检查目标文件是否已存在
    if (fs.existsSync(outputPath)) {
        const result = await vscode.window.showWarningMessage(`${OUTPUT_FILE} 文件已存在，是否覆盖？`, '覆盖', '取消');
        if (result !== '覆盖') {
            return;
        }
    }

    try {
        const templateContent = fs.readFileSync(templatePath, 'utf-8');
        fs.writeFileSync(outputPath, templateContent, 'utf-8');

        createOutputChannel(`已创建文件: ${outputPath}`);
        vscode.window.setStatusBarMessage(`已创建 ${OUTPUT_FILE}`, 5000);

        // 打开创建的文件
        const document = await vscode.workspace.openTextDocument(outputPath);
        await vscode.window.showTextDocument(document);
    } catch (error) {
        createOutputChannel(`创建文件失败: ${error.message}`, 'error');
    }
}

module.exports = createAgentsMd;
