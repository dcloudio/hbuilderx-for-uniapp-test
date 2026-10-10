const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const vscode = require('vscode');

const config = require('../core/config.js');

const certCacheFile = path.join(config.HV_UNI_TEST_ENV_DIR, '.ios_cert_cache.json');

function loadCertCache() {
    try {
        return JSON.parse(fs.readFileSync(certCacheFile, 'utf8'));
    } catch (e) {
        return {};
    }
}

function saveCertCache(data) {
    try {
        const dir = path.dirname(certCacheFile);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        // 只持久化非密码字段
        fs.writeFileSync(certCacheFile, JSON.stringify({
            bundleId: data.bundleId,
            profilePath: data.profilePath,
            p12Path: data.p12Path,
        }), 'utf8');
    } catch (e) {}
}

async function validateIosCert(bundleId, p12Password, profilePath, p12Path) {
    try {
        const extension = vscode.extensions.getExtension('uniapp-basic');
        if (!extension) return { code: 0 };
        const api = extension.isActive ? extension.exports : await extension.activate();
        if (!api || typeof api.verifyAppleCert != 'function') return { code: 0 };
        const ret = await api.verifyAppleCert({
            iosAppID: bundleId,
            iosCertPassword: p12Password,
            iosProfile: profilePath,
            iosCertfile: p12Path,
        });
        if (!ret) return { code: 0 };
        const errors = [];
        ret.forEach(v => errors.push(v));
        return errors.length > 0 ? { code: -1, errorMsg: errors[0] } : { code: 0 };
    } catch (e) {
        return { code: 0 };
    }
}

async function showIosCertDialog() {
    const previous = global.global_iosCertInfo || loadCertCache();
    const state = {
        bundleId: previous.bundleId || '',
        profilePath: previous.profilePath || '',
        p12Path: previous.p12Path || '',
        p12Password: previous.p12Password || '',
        validating: false,
        message: '',
    };
    let dialog;
    try {
        dialog = await vscode.window.openWebviewDialog({
            viewType: 'uniapp.iosCertificate',
            title: 'iOS真机证书信息',
            size: { width: 540, height: 340 },
            closeOnClickOutside: false,
            allowMoveToMainWindow: false,
            webviewOptions: { enableScripts: true },
        });
    } catch (error) {
        vscode.window.showErrorMessage(`打开iOS真机证书窗口失败：${error.message || error}`);
        return null;
    }
    dialog.webview.html = createIosCertDialogHtml(dialog.webview, state);

    return new Promise((resolve) => {
        let settled = false;
        const closeDialog = () => {
            try {
                if (typeof dialog.close == 'function') dialog.close();
                else if (typeof dialog.dispose == 'function') dialog.dispose();
            } catch (error) {
                console.warn('[uniapp.iosCertificate] 关闭窗口失败:', error);
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
        const selectFile = async (field) => {
            const isProfile = field == 'profilePath';
            if (!isProfile && field != 'p12Path') return;
            const selected = await vscode.window.showOpenDialog({
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                filters: isProfile
                    ? { 'Provisioning Profile': ['mobileprovision'] }
                    : { 'PKCS #12': ['p12'] },
            });
            if (selected && selected[0]) {
                state[field] = selected[0].fsPath;
                state.message = '';
                postState();
            }
        };
        dialog.webview.onDidReceiveMessage(async (message) => {
            if (message?.type == 'ready') {
                postState();
                return;
            }
            if (message?.type == 'cancel') {
                finish(null);
                return;
            }
            if (message?.type == 'selectFile') {
                const value = message.value || {};
                state.bundleId = String(value.bundleId || '');
                state.p12Password = String(value.p12Password || '');
                await selectFile(message.field);
                return;
            }
            if (message?.type != 'submit' || state.validating) return;
            const value = message.value || {};
            const bundleId = String(value.bundleId || '').trim();
            const profilePath = String(value.profilePath || '').trim();
            const p12Path = String(value.p12Path || '').trim();
            const p12Password = String(value.p12Password || '');
            state.bundleId = bundleId;
            state.profilePath = profilePath;
            state.p12Path = p12Path;
            state.p12Password = p12Password;
            if (!bundleId) state.message = 'Bundle ID (AppID) 不能为空';
            else if (!profilePath) state.message = '证书profile文件 不能为空';
            else if (!p12Path) state.message = '私钥证书 不能为空';
            else if (!p12Password) state.message = '证书私钥密码 不能为空';
            else {
                state.validating = true;
                state.message = '';
                postState();
                const result = await validateIosCert(bundleId, p12Password, profilePath, p12Path);
                if (settled) return;
                state.validating = false;
                if (result.code == 0) {
                    const certInfo = { bundleId, profilePath, p12Path, p12Password };
                    saveCertCache(certInfo);
                    finish(certInfo);
                    return;
                }
                state.message = result.errorMsg || 'iOS证书校验失败';
            }
            postState();
        });
        dialog.onWillClose?.(() => finish(null));
        dialog.onDidDispose?.(() => finish(null));
        dialog.onDidClose?.(() => finish(null));
        dialog.webview.onDidDispose?.(() => finish(null));
    });
}

function createIosCertDialogHtml(webview, state) {
    const nonce = crypto.randomBytes(24).toString('base64');
    const cspSource = webview.cspSource || "'self'";
    const initialState = JSON.stringify(state).replace(/</g, '\\u003c');
    const script = `
        const vscode = acquireVsCodeApi();
        let state = ${initialState};
        const send = (type, payload = {}) => vscode.postMessage({ type, ...payload });
        const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[character]));
        function render() {
            document.querySelector('#app').innerHTML = \`
                <p class="subtitle">iOS真机测试，需要iOS证书对ipa进行签名。</p>
                <label class="field">
                    <span>Bundle ID (AppID)</span>
                    <input id="bundleId" value="\${esc(state.bundleId)}" placeholder="请输入Bundle ID" autocomplete="off">
                </label>
                <label class="field">
                    <span>证书profile文件</span>
                    <span class="file-field">
                        <input id="profilePath" value="\${esc(state.profilePath)}" placeholder="请选择.mobileprovision文件" readonly>
                        <button class="browse" data-field="profilePath" title="选择证书profile文件" aria-label="选择证书profile文件">...</button>
                    </span>
                </label>
                <label class="field">
                    <span>私钥证书</span>
                    <span class="file-field">
                        <input id="p12Path" value="\${esc(state.p12Path)}" placeholder="请选择.p12文件" readonly>
                        <button class="browse" data-field="p12Path" title="选择私钥证书" aria-label="选择私钥证书">...</button>
                    </span>
                </label>
                <label class="field">
                    <span>证书私钥密码</span>
                    <input id="p12Password" type="password" value="\${esc(state.p12Password)}" placeholder="请输入证书私钥密码" autocomplete="off">
                </label>
                <div class="message">\${esc(state.message)}</div>
                <footer>
                    <button class="secondary" data-action="cancel" \${state.validating ? 'disabled' : ''}>取消</button>
                    <button class="primary" data-action="submit" \${state.validating ? 'disabled' : ''}>\${state.validating ? '校验中...' : '确定'}</button>
                </footer>
            \`;
            document.querySelector('#bundleId').oninput = (event) => { state.bundleId = event.target.value; };
            document.querySelector('#p12Password').oninput = (event) => { state.p12Password = event.target.value; };
            document.querySelectorAll('[data-field]').forEach((element) => {
                element.onclick = () => send('selectFile', { field: element.dataset.field, value: formValue() });
            });
            document.querySelector('[data-action="cancel"]').onclick = () => send('cancel');
            document.querySelector('[data-action="submit"]').onclick = submit;
            document.querySelector('#p12Password').onkeydown = (event) => { if (event.key === 'Enter') submit(); };
        }
        function formValue() {
            return {
                bundleId: state.bundleId,
                profilePath: state.profilePath,
                p12Path: state.p12Path,
                p12Password: state.p12Password,
            };
        }
        function submit() {
            send('submit', { value: formValue() });
        }
        window.addEventListener('message', (event) => {
            if (event.data?.type === 'state') {
                state = event.data.state;
                render();
            }
        });
        render();
        send('ready');
    `;
    return `
        <!doctype html><html lang="zh-CN"><head>
        <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src ${cspSource} 'nonce-${nonce}';">
        <style>${iosCertDialogCss()}</style></head><body><main id="app"></main><script nonce="${nonce}">${script}</script></body></html>`;
}

function iosCertDialogCss() {
    return `
        :root {
            font: 13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            color: var(--vscode-foreground, #333);
            background: var(--vscode-editor-background, #fff);
        }
        * { box-sizing: border-box; }
        html, body { overflow: hidden; }
        body { margin: 0; padding: 18px 28px 60px; }
        .subtitle { margin: 0 0 14px; color: var(--vscode-descriptionForeground, #777); font-size: 12px; }
        .field { display: grid; grid-template-columns: 116px minmax(0, 1fr); align-items: center; gap: 12px; margin-bottom: 10px; }
        .field > span:first-child { font-size: 13px; }
        input { width: 100%; height: 24px; padding: 2px 7px; border: 1px solid var(--vscode-input-border, #bbb); border-radius: 3px; outline: none; background: var(--vscode-input-background, transparent); color: var(--vscode-input-foreground, inherit); font: inherit; font-size: 12px; }
        input:focus { border-color: var(--vscode-focusBorder, #1683c5); }
        input::placeholder { color: var(--vscode-input-placeholderForeground, #888); }
        .file-field { display: grid; grid-template-columns: minmax(0, 1fr) 24px; gap: 6px; }
        .browse { display: grid; place-items: center; width: 24px; height: 24px; padding: 0 0 4px; border: 1px solid var(--vscode-button-secondaryBorder, #bbb); border-radius: 3px; background: transparent; color: inherit; font: inherit; font-size: 13px; line-height: 1; cursor: pointer; }
        .browse:hover { background: var(--vscode-toolbar-hoverBackground, rgba(127, 127, 127, 0.14)); }
        .message { min-height: 18px; margin: 2px 0 0 128px; color: var(--vscode-errorForeground, #b54747); font-size: 12px; }
        footer { position: fixed; bottom: 0; left: 0; right: 0; padding: 10px 28px; background: var(--vscode-editor-background, #fff); border-top: 1px solid var(--vscode-panel-border, #ddd); display: flex; justify-content: flex-end; gap: 8px; }
        button.primary, button.secondary { min-width: 58px; padding: 5px 14px; border-radius: 3px; font: inherit; font-size: 12px; cursor: pointer; }
        button.primary { background: #1683c5; color: white; border: 1px solid #1683c5; }
        button.secondary { background: transparent; color: inherit; border: 1px solid var(--vscode-button-secondaryBorder, #bbb); }
        button:disabled { cursor: default; opacity: 0.6; }
    `;
}

module.exports = {
    showIosCertDialog,
    validateIosCert,
};
