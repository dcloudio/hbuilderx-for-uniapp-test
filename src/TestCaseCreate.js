const hx = require('hbuilderx');
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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

    const fileTemplates = ["简单模板", "空白文件", "Jest示例模板"];
    let selectedState = fs.existsSync(selectedFile) ? fs.statSync(selectedFile) : undefined;
    let targetDirectory = selectedState && selectedState.isDirectory()
        ? selectedFile
        : path.dirname(selectedFile || projectPath);
    if (!targetDirectory) targetDirectory = projectPath || process.cwd();
    const result = await showTestCaseDialog({
        defaultName,
        targetDirectory,
        templates: fileTemplates,
    });
    if (!result) return;

    const file = path.join(targetDirectory, result.name);
    let filecontents = '';
    if (["简单模板", "Jest示例模板"].includes(result.template)) {
        let ftpath = './template/testcase/default.js';
        if (result.template == 'Jest示例模板') {
           ftpath = './template/testcase/example.js';
        };
        filecontents = require(ftpath);

        // 根据选择路径，设置describe('') 测试标题
        if (result.template == '简单模板' && selectedFile && fs.existsSync(selectedFile)) {
            let pagePath = selectedFile.replace(projectPath, '');
            let state2 = fs.statSync(selectedFile);
            if (state2.isDirectory()) {
                pagePath = pagePath + '/' + path.basename(selectedFile);
            };
            filecontents = filecontents.replace(`describe('', () => {`, `describe('${pagePath}', () => {`)
        };

        // 读取编辑器缩进配置
        let config = await vscode.workspace.getConfiguration();
        let isSpaces = config.get('editor.insertSpaces');
        let tabSize = config.get('editor.tabSize');
        if (isSpaces && isSpaces) {
            filecontents = filecontents.replace(/\t/g, ' '.repeat(parseInt(tabSize)));
        };
    };
    try {
        await fs.promises.writeFile(file, filecontents, { flag: 'wx' });
        const document = await vscode.workspace.openTextDocument(vscode.Uri.file(file));
        await vscode.window.showTextDocument(document);
    } catch (error) {
        if (error && error.code == 'EEXIST') {
            vscode.window.showErrorMessage('测试用例文件已存在');
        } else {
            vscode.window.showErrorMessage('创建文件失败');
        };
    };

};

async function showTestCaseDialog(options) {
    let dialog;
    const state = {
        name: options.defaultName || 'index.test.js',
        template: options.templates[0],
        directory: options.targetDirectory,
        message: '',
    };
    try {
        dialog = await hx.window.openWebviewDialog({
            viewType: 'uniapp.createTestCase',
            title: '新建自动化测试用例',
            size: { width: 560, height: 460 },
            closeOnClickOutside: false,
            allowMoveToMainWindow: false,
            webviewOptions: { enableScripts: true },
        });
    } catch (error) {
        vscode.window.showErrorMessage(`打开新建测试用例窗口失败：${error.message || error}`);
        return undefined;
    }
    dialog.webview.html = createTestCaseDialogHtml(dialog.webview, state, options.templates);
    return new Promise((resolve) => {
        let settled = false;
        const closeDialog = () => {
            try {
                if (typeof dialog.close == 'function') dialog.close();
                else if (typeof dialog.dispose == 'function') dialog.dispose();
            } catch (error) {
                console.warn('[uniapp.createTestCase] 关闭窗口失败:', error);
            }
        };
        const finish = (value) => {
            if (settled) return;
            settled = true;
            resolve(value);
            closeDialog();
        };
        const postState = () => {
            if (!settled) void dialog.webview.postMessage({ type: 'state', state });
        };
        dialog.webview.onDidReceiveMessage((message) => {
            if (message?.type == 'ready') {
                postState();
                return;
            }
            if (message?.type == 'cancel') {
                finish(undefined);
                return;
            }
            if (message?.type == 'submit') {
                const value = message.value || {};
                const name = String(value.name || '').trim();
                const template = String(value.template || '');
                if (!name) state.message = '请输入测试用例文件名称';
                else if (!/^[^\\/]+\.test\.js$/.test(name)) state.message = '文件名格式应为 xxx.test.js';
                else if (!options.templates.includes(template)) state.message = '请选择测试用例模板';
                else {
                    finish({ name, template });
                    return;
                }
                postState();
            }
        });
        dialog.onDidDispose?.(() => finish(undefined));
        dialog.onDidClose?.(() => finish(undefined));
        dialog.webview.onDidDispose?.(() => finish(undefined));
    });
}

function createTestCaseDialogHtml(webview, state, templates) {
    const nonce = crypto.randomBytes(24).toString('base64');
    const cspSource = webview.cspSource || "'self'";
    const initialState = JSON.stringify(state).replace(/</g, '\\u003c');
    const templateOptions = templates.map((template) => {
        return `<label class="template-option"><input type="radio" name="template" value="${escapeHtml(template)}">${escapeHtml(template)}</label>`;
    }).join('');
    const script = `
        const vscode = acquireVsCodeApi();
        let state = ${initialState};
        const send = (type, value = {}) => vscode.postMessage({ type, ...value });
        const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[character]));
        function render() {
            document.querySelector('#app').innerHTML = \`
                <label class="field-label" for="name">文件名</label>
                <input id="name" class="name-input" value="\${esc(state.name)}" placeholder="例如：index.test.js" autofocus>
                <div class="field-label">保存目录</div>
                <div class="directory">\${esc(state.directory)}</div>
                <div class="field-label">模板</div>
                <div class="templates">${templateOptions}</div>
                <div class="message">\${esc(state.message)}</div>
                <footer>
                    <button class="secondary" data-action="cancel">取消</button>
                    <button class="primary" data-action="submit">创建</button>
                </footer>
            \`;
            const selected = document.querySelector('input[name="template"][value="' + CSS.escape(state.template) + '"]');
            if (selected) selected.checked = true;
            document.querySelector('#name').addEventListener('input', (event) => { state.name = event.target.value; });
            document.querySelectorAll('input[name="template"]').forEach((element) => {
                element.addEventListener('change', (event) => { state.template = event.target.value; });
            });
            document.querySelector('[data-action="cancel"]').onclick = () => send('cancel');
            document.querySelector('[data-action="submit"]').onclick = () => send('submit', { value: { name: state.name, template: state.template } });
            document.querySelector('#name').onkeydown = (event) => { if (event.key === 'Enter') send('submit', { value: { name: state.name, template: state.template } }); };
        }
        window.addEventListener('message', (event) => { if (event.data?.type === 'state') { state = event.data.state; render(); } });
        render();
        send('ready');
    `;
    return `
        <!doctype html><html lang="zh-CN"><head>
        <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src ${cspSource} 'nonce-${nonce}';">
        <style>${testCaseDialogCss()}</style></head><body><main id="app"></main><script nonce="${nonce}">${script}</script></body></html>`;
}

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[character]));
}

function testCaseDialogCss() {
    return `
        :root { font: 13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: var(--vscode-foreground, #333); background: var(--vscode-editor-background, #fff); }
        * { box-sizing: border-box; }
        html, body { overflow: hidden; }
        body { margin: 0; padding: 18px 24px 64px; }
        .eyebrow { color: #1683c5; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; }
        h1 { font-size: 22px; margin: 7px 0 4px; }
        .hint { color: var(--vscode-descriptionForeground, #777); margin: 0 0 24px; }
        .field-label { display: block; font-weight: 600; margin: 10px 0 5px; }
        .name-input { width: 100%; padding: 8px 2px; border: 0; border-bottom: 1px solid var(--vscode-input-border, #ccc); background: transparent; color: inherit; }
        .name-input:focus { outline: 0; border-bottom-color: #1683c5; }
        .templates { overflow: hidden; border: 1px solid var(--vscode-input-border, #ccc); border-radius: 4px; }
        .template-option { display: flex; align-items: center; gap: 8px; padding: 7px 10px; cursor: pointer; }
        .template-option + .template-option { border-top: 1px solid var(--vscode-panel-border, #ddd); }
        .template-option:has(input:checked) { background: rgba(22, 131, 197, 0.1); }
        .directory { overflow: hidden; padding: 8px 2px; border-bottom: 1px solid var(--vscode-panel-border, #ddd); color: var(--vscode-descriptionForeground, #777); text-overflow: ellipsis; white-space: nowrap; }
        .message { min-height: 18px; margin-top: 6px; color: #b54747; }
        footer { position: fixed; bottom: 0; left: 0; right: 0; display: flex; justify-content: flex-end; gap: 10px; padding: 10px 24px; border-top: 1px solid var(--vscode-panel-border, #ddd); background: var(--vscode-editor-background, #fff); }
        button { padding: 7px 18px; border-radius: 3px; cursor: pointer; }
        button.primary { border: 1px solid #1683c5; background: #1683c5; color: #fff; }
        button.secondary { border: 1px solid var(--vscode-button-secondaryBorder, #bbb); background: transparent; color: inherit; }
    `;
}

module.exports = TestCaseCreate;
