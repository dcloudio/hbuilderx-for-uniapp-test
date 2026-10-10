const crypto = require('crypto');
const os = require('os');

const vscode = require('vscode');
const api_getMobileList = require('./api_getMobileList.js');
const { getPluginConfig, uniapp_x_is_vapor, isUniAppX } = require('../core/core.js');

const projectPath_vapor_mode_cache = {};
const projectPath_vapor_render_target_cache = {};

async function ui_vue(testPlatform, projectPath = '') {
    const state = await createInitialState(testPlatform, projectPath);
    let dialog;
    try {
        dialog = await vscode.window.openWebviewDialog({
            viewType: 'uniapp.autoTestDeviceSelection',
            title: 'uni-app 自动化测试设备选择',
            size: { width: 600, height: testPlatform === 'all' ? 780 : 480 },
            closeOnClickOutside: false,
            allowMoveToMainWindow: false,
            webviewOptions: { enableScripts: true },
        });
    } catch (error) {
        vscode.window.showErrorMessage(`打开自动化测试设备窗口失败：${error.message || error}`);
        return 'error';
    }
    dialog.webview.html = createDialogHtml(dialog.webview, state);

    return new Promise((resolve) => {
        let settled = false;
        const closeDialog = () => {
            try {
                if (typeof dialog.close === 'function') dialog.close();
                else if (typeof dialog.dispose === 'function') dialog.dispose();
            } catch (error) {
                console.warn('[uniapp.autoTestDeviceSelection] 关闭设备选择窗口失败:', error);
            }
        };
        const finish = (result) => {
            if (settled) return;
            settled = true;
            resolve(result);
            closeDialog();
        };
        const postState = () => {
            if (!settled) void dialog.webview.postMessage({ type: 'state', state });
        };
        const refresh = async (platform = testPlatform) => {
            state.loading = true;
            postState();
            try {
                const result = await api_getMobileList(platform, 'Y');
                applyDeviceResult(state, result, platform);
            } catch (error) {
                state.message = `获取设备列表失败：${error.message || error}`;
            } finally {
                state.loading = false;
                setDefaultDevice(state);
                postState();
            }
        };
        dialog.webview.onDidReceiveMessage(async (message) => {
            if (message?.type === 'ready') {
                postState();
                void refresh();
                return;
            }
            if (message?.type === 'refresh') {
                await refresh(message.platform || testPlatform);
                return;
            }
            if (message?.type === 'setting') {
                await updateSetting(message.name, message.value);
                return;
            }
            if (message?.type === 'submit') {
                const error = validate_value(message.state, { showError: (value) => { state.message = value; } });
                if (error !== true) {
                    state.message = error || state.message;
                    postState();
                    return;
                }
                if (projectPath && typeof message.state.cfg_uniapp_test_vapor_mode === 'boolean') projectPath_vapor_mode_cache[projectPath] = message.state.cfg_uniapp_test_vapor_mode;
                if (projectPath && ['bytecode', 'nativecode'].includes(message.state.uni_app_x_vapor_render_target)) projectPath_vapor_render_target_cache[projectPath] = message.state.uni_app_x_vapor_render_target;
                finish(toResult(message.state));
                return;
            }
            if (message?.type === 'cancel') finish('noSelected');
        });
        dialog.onDidDispose?.(() => finish('noSelected'));
        dialog.onDidClose?.(() => finish('noSelected'));
        dialog.webview.onDidDispose?.(() => finish('noSelected'));
    });
}

async function createInitialState(testPlatform, projectPath) {
    const isUniAppXProject = projectPath ? await isUniAppX(projectPath) : false;
    const state = {
        osName: os.platform(),
        access: testPlatform,
        mp_weixin: false,
        mp_alipay: false,
        h5_chrome: false,
        h5_firefox: false,
        h5_safari: false,
        filter_ios_name: '',
        ios_list: [],
        android_list: [],
        harmony_list: [],
        selected_list: { ios: [], android: [], harmony: [] },
        cfg_isDebug: await getBooleanConfig('hbuilderx-for-uniapp-test.isDebug', true),
        cfg_isRuntimeLog: await getBooleanConfig('hbuilderx-for-uniapp-test.isRuntimeLog', true),
        cfg_AutomaticModificationTestMatch: await getBooleanConfig('hbuilderx-for-uniapp-test.AutomaticModificationTestMatch', true),
        cfg_uniapp_test_vapor_mode: false,
        uni_app_x_vapor_render_target: 'bytecode',
        is_show_vapor_mode_element: Boolean(isUniAppXProject && projectPath),
        loading: false,
        message: '',
    };
    if (state.is_show_vapor_mode_element) {
        state.cfg_uniapp_test_vapor_mode = projectPath_vapor_mode_cache[projectPath] || await uniapp_x_is_vapor(projectPath);
        state.uni_app_x_vapor_render_target = projectPath_vapor_render_target_cache[projectPath] || 'bytecode';
    }
    return state;
}

async function getBooleanConfig(key, fallback) {
    const value = await getPluginConfig(key);
    return typeof value === 'boolean' ? value : fallback;
}

function applyDeviceResult(state, result = {}, platform) {
    if (platform === 'all' || platform === 'ios') state.ios_list = [...(result.ios_simulator || []), ...(result.ios_phone || [])];
    if (platform === 'all' || platform === 'android') state.android_list = result.android || [];
    if (platform === 'all' || platform === 'harmony') state.harmony_list = result.harmony || [];
}

function setDefaultDevice(state) {
    for (const platform of ['ios', 'android', 'harmony']) {
        const list = state[`${platform}_list`];
        if (state.access === platform && list.length === 1 && state.selected_list[platform].length === 0) state.selected_list[platform] = [list[0].udid];
    }
}

async function updateSetting(name, value) {
    const names = {
        cfg_isDebug: 'hbuilderx-for-uniapp-test.isDebug',
        cfg_isRuntimeLog: 'hbuilderx-for-uniapp-test.isRuntimeLog',
        cfg_AutomaticModificationTestMatch: 'hbuilderx-for-uniapp-test.AutomaticModificationTestMatch',
    };
    if (!names[name]) return;
    const config = await vscode.workspace.getConfiguration();
    await config.update(names[name], value);
    vscode.window.setStatusBarMessage(`[UI窗口] 更新配置项 ${names[name]} 成功`, 3000);
}

function toResult(result) {
    const selectedList = [];
    for (const udid of result.selected_list.ios || []) selectedList.push(`ios:${udid}`);
    for (const udid of result.selected_list.android || []) selectedList.push(`android:${udid}`);
    for (const udid of result.selected_list.harmony || []) selectedList.push(`harmony:${udid}`);
    if (result.mp_weixin) selectedList.push('mp:mp-weixin');
    if (result.mp_alipay) selectedList.push('mp:mp-alipay');
    if (result.h5_chrome) selectedList.push('h5:h5-chrome');
    if (result.h5_firefox) selectedList.push('h5:h5-firefox');
    if (result.h5_safari) selectedList.push('h5:h5-safari');
    const uiSettings = {};
    for (const key of ['cfg_isDebug', 'cfg_isRuntimeLog', 'cfg_AutomaticModificationTestMatch', 'cfg_uniapp_test_vapor_mode', 'uni_app_x_vapor_render_target']) {
        if (Object.prototype.hasOwnProperty.call(result, key)) uiSettings[key] = result[key];
    }
    return [selectedList, uiSettings];
}

function validate_value(data, that) {
    const value = data || {};
    const selected = value.selected_list || { ios: [], android: [], harmony: [] };
    const harmonyCount = (selected.harmony || []).length;
    const iosCount = (selected.ios || []).length;
    const androidCount = (selected.android || []).length;
    let message = '';
    if (value.access === 'all' && !value.mp_weixin && !value.mp_alipay && !value.h5_chrome && !value.h5_firefox && !value.h5_safari && harmonyCount === 0 && iosCount === 0 && androidCount === 0) message = '请至少选择一个测试设备';
    if (value.access === 'android' && androidCount === 0) message = '请至少选择一个Android测试设备';
    if (value.access === 'ios' && iosCount === 0) message = '请至少选择一个iOS测试设备';
    if (value.access === 'harmony' && harmonyCount === 0) message = '请至少选择一个harmony测试设备';
    if (message) {
        that.showError(message);
        return message;
    }
    return true;
}

function createDialogHtml(webview, state) {
    const nonce = crypto.randomBytes(24).toString('base64');
    const cspSource = webview.cspSource || "'self'";
    const initialState = JSON.stringify(state).replace(/</g, '\\u003c');
    const script = `
        const vscode = acquireVsCodeApi();
        let state = ${initialState};
        const send = (type, payload = {}) => vscode.postMessage({ type, ...payload });

        function esc(value) {
            return String(value ?? '').replace(/[&<>"']/g, (character) => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;',
            }[character]));
        }

        function render() {
            const selected = state.selected_list;
            const ios = state.ios_list.filter((device) => {
                return !state.filter_ios_name
                    || String(device.name || '').includes(state.filter_ios_name)
                    || String(device.udid || '').includes(state.filter_ios_name);
            });
            const check = (name, value, label) => {
                return '<label class="check"><input type="checkbox" data-name="'
                    + name + '" data-value="' + (value || '') + '" '
                    + (state[name] === true || selected[name]?.includes(value) ? 'checked' : '')
                    + '>' + label + '</label>';
            };
            const deviceRow = (name, device) => {
                const originalName = String(device.name || device.udid || '');
                const displayName = name === 'ios' && device.version
                    ? originalName.replace(/\\s*\\(iOS\\s+[^)]+\\)\\s*$/i, '')
                    : originalName;
                const detail = [device.device_type, device.version, device.udid]
                    .filter(Boolean)
                    .join(' · ');
                const checked = selected[name]?.includes(device.udid) ? ' checked' : '';
                return '<label class="device-row' + (checked ? ' selected' : '') + '">'
                    + '<input class="device-radio" type="radio" name="device-' + name + '" data-name="' + name
                    + '" data-value="' + (device.udid || '') + '"' + checked + '>'
                    + '<span class="device-copy">'
                    + '<span class="device-name">' + esc(displayName) + '</span>'
                    + '<span class="device-detail">' + esc(detail) + '</span>'
                    + '</span></label>';
            };
            const devices = (name, list) => list.length
                ? list.map((device) => deviceRow(name, device)).join('')
                : '<div class="empty-state">'
                    + (name === 'ios' && state.filter_ios_name ? '未找到匹配的模拟器' : '未检测到设备')
                    + '</div>';
            const deviceList = (name, list) => state.loading
                ? '<div class="device-loading-state">正在获取设备列表…</div>'
                : devices(name, list);

            document.querySelector('#app').innerHTML = \`
                \${state.access === 'all' ? \`
                    <section class="row">
                        \${check('mp_weixin', '', '微信小程序')}
                        \${check('mp_alipay', '', '支付宝小程序')}
                        \${check('h5_chrome', '', 'Chrome')}
                        \${check('h5_firefox', '', 'Firefox')}
                        \${check('h5_safari', '', 'Safari')}
                    </section>
                \` : ''}
                <div class="device-sections">
                \${((state.access === 'all' || state.access === 'ios') && state.osName === 'darwin') ? \`
                    <section>
                        <div class="section-head">
                            <span class="section-title-group">
                                <strong>iOS 模拟器与真机</strong>
                                <span class="filter-field">
                                    <svg class="filter-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>
                                    <input class="filter" data-filter aria-label="过滤设备" placeholder="搜索名称或 UDID" value="\${esc(state.filter_ios_name)}">
                                </span>
                            </span>
                            <span class="section-actions">
                                <!-- <span class="device-count">共 \${ios.length} 个设备</span> -->
                                <button class="icon-button" data-refresh="ios" aria-label="刷新设备" title="刷新设备"><svg class="refresh-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path><path d="M21 3v5h-5"></path><path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path><path d="M8 16H3v5"></path></svg></button>
                            </span>
                        </div>
                        <div class="device-list">\${deviceList('ios', ios)}</div>
                    </section>
                \` : ''}
                \${state.access === 'all' || state.access === 'android' ? \`
                    <section>
                        <div class="section-head">
                            <strong>Android 测试设备</strong>
                            <button class="icon-button" data-refresh="android" aria-label="刷新设备" title="刷新设备"><svg class="refresh-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path><path d="M21 3v5h-5"></path><path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path><path d="M8 16H3v5"></path></svg></button>
                        </div>
                        <div class="device-list">\${deviceList('android', state.android_list)}</div>
                    </section>
                \` : ''}
                \${state.access === 'all' || state.access === 'harmony' ? \`
                    <section>
                        <div class="section-head">
                            <strong>Harmony 测试设备</strong>
                            <button class="icon-button" data-refresh="harmony" aria-label="刷新设备" title="刷新设备"><svg class="refresh-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path><path d="M21 3v5h-5"></path><path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path><path d="M8 16H3v5"></path></svg></button>
                        </div>
                        <div class="device-list">\${deviceList('harmony', state.harmony_list)}</div>
                    </section>
                \` : ''}
                </div>
                <section class="settings">
                    <div class="settings-row">
                        \${check('cfg_isDebug', '', '输出 Debug 日志')}
                        \${check('cfg_isRuntimeLog', '', '输出运行时日志')}
                    </div>
                    \${check('cfg_AutomaticModificationTestMatch', '', '自动修改 jest.config.js 的 testMatch')}
                    \${state.is_show_vapor_mode_element ? \`
                        <div class="vapor-options">
                            \${check('cfg_uniapp_test_vapor_mode', '', '以蒸汽模式运行测试')}
                            \${state.cfg_uniapp_test_vapor_mode ? \`
                            <label class="radio-option">
                                <input type="radio" name="vapor-render-target" data-vapor value="bytecode"\${state.uni_app_x_vapor_render_target === 'bytecode' ? ' checked' : ''}>
                                字节码
                            </label>
                            <label class="radio-option">
                                <input type="radio" name="vapor-render-target" data-vapor value="nativecode"\${state.uni_app_x_vapor_render_target === 'nativecode' ? ' checked' : ''}>
                                机器码
                            </label>
                            \` : ''}
                        </div>
                    \` : ''}
                </section>
                <footer>
                    <button class="secondary" data-action="cancel">取消</button>
                    <button class="primary" data-action="submit">确定</button>
                </footer>
            \`;

            document.querySelectorAll('[data-name]').forEach((element) => {
                element.onchange = () => {
                    const name = element.dataset.name;
                    const value = element.dataset.value;
                    if (['ios', 'android', 'harmony'].includes(name)) {
                        selected[name] = element.checked ? [value] : [];
                    } else {
                        state[name] = element.checked;
                        send('setting', { name, value: element.checked });
                    }
                    render();
                };
            });
            document.querySelector('[data-filter]')?.addEventListener('input', (event) => {
                state.filter_ios_name = event.target.value;
                render();
            });
            document.querySelectorAll('[data-refresh]').forEach((element) => {
                element.onclick = () => send('refresh', { platform: element.dataset.refresh });
            });
            document.querySelectorAll('[data-vapor]').forEach((element) => {
                element.addEventListener('change', (event) => {
                    state.uni_app_x_vapor_render_target = event.target.value;
                });
            });
            document.querySelectorAll('[data-action="cancel"]').forEach((element) => {
                element.onclick = () => send('cancel');
            });
            document.querySelector('[data-action="submit"]')?.addEventListener('click', () => {
                send('submit', { state });
            });
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
        <!doctype html>
        <html lang="zh-CN">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width,initial-scale=1">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src ${cspSource} 'nonce-${nonce}';">
            <style>${dialogCss()}</style>
        </head>
        <body>
            <main id="app"></main>
            <script nonce="${nonce}">${script}</script>
        </body>
        </html>
    `;
}

function dialogCss() {
    return `
        :root {
            font: 13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            color: var(--vscode-foreground, #333);
            background: var(--vscode-editor-background, #fff);
        }
        * { box-sizing: border-box; }
        body { margin: 0; padding: 22px 28px 72px; }
        header {
            display: flex;
            justify-content: space-between;
            border-bottom: 1px solid var(--vscode-panel-border, #ddd);
            padding-bottom: 14px;
        }
        .eyebrow { font-size: 11px; letter-spacing: 1.5px; color: #1683c5; font-weight: 700; }
        h1 { font-size: 22px; margin: 6px 0; }
        p { margin: 0; color: var(--vscode-descriptionForeground, #777); }
        .icon { border: 0; background: transparent; font-size: 24px; color: inherit; cursor: pointer; }
        .toolbar { display: flex; gap: 12px; align-items: center; padding: 12px 0; }
        .pill { background: #e6f2fa; color: #1678ae; padding: 3px 9px; border-radius: 10px; font-size: 11px; }
        .status { color: #9a6b00; min-height: 18px; }
        .row, .settings { display: flex; flex-wrap: wrap; gap: 10px 18px; padding: 10px 0; border-bottom: 1px solid var(--vscode-panel-border, #ddd); }
        section { padding: 12px 0; border-bottom: 1px solid var(--vscode-panel-border, #ddd); }
        .device-sections > section:last-child { border-bottom: 0; }
        .section-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .section-title-group { display: flex; flex: 1; align-items: center; min-width: 0; gap: 8px; }
        .section-title-group strong { flex: 0 0 auto; }
        .icon-button { display: inline-grid; place-items: center; flex: 0 0 28px; width: 28px; height: 28px; padding: 0; border: 0; border-radius: 3px; background: transparent; color: #1683c5; cursor: pointer; }
        .icon-button:hover { background: var(--vscode-toolbar-hoverBackground, rgba(127, 127, 127, 0.14)); }
        .icon-button:focus-visible { outline: 1px solid var(--vscode-focusBorder, #1683c5); outline-offset: 1px; }
        .refresh-icon { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
        .filter-field { display: inline-flex; flex: 0 1 210px; align-items: center; min-width: 140px; height: 28px; color: var(--vscode-descriptionForeground, #888); }
        .filter-icon { flex: 0 0 14px; width: 14px; height: 14px; margin-right: 7px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; opacity: 0.8; }
        .filter { flex: 1; min-width: 0; height: 100%; padding: 0; border: 0; outline: 0; background: transparent; color: var(--vscode-input-foreground, inherit); font: inherit; font-size: 12px; }
        .filter::placeholder { color: var(--vscode-descriptionForeground, #888); opacity: 1; }
        .section-actions { display: inline-flex; align-items: center; margin-left: 12px; gap: 12px; }
        .device-count { color: var(--vscode-descriptionForeground, #777); font-size: 12px; white-space: nowrap; }
        .device-list { display: grid; gap: 2px; min-height: 200px; max-height: 250px; align-content: start; overflow: auto; padding: 4px; border: 1px solid var(--vscode-input-border, #ccc); border-radius: 4px; background: var(--vscode-input-background, #fff); }
        .device-row { display: flex; align-items: center; gap: 10px; min-width: 0; padding: 6px 10px; border: 1px solid transparent; border-radius: 3px; cursor: pointer; }
        .device-row:hover { background: var(--vscode-list-hoverBackground, #f0f0f0); }
        .device-row.selected { background: rgba(22, 131, 197, 0.08); border-color: transparent; box-shadow: inset 2px 0 0 #1683c5; color: inherit; }
        input[type="checkbox"], input[type="radio"] { -webkit-appearance: none; appearance: none; flex: 0 0 14px; width: 14px; height: 14px; margin: 0; border: 1px solid var(--vscode-checkbox-border, #858585); background: var(--vscode-checkbox-background, transparent); cursor: pointer; transition: border-color 0.12s ease, background-color 0.12s ease, box-shadow 0.12s ease; }
        input[type="checkbox"] { display: inline-grid; place-content: center; border-radius: 3px; }
        input[type="checkbox"]::after { width: 7px; height: 4px; border-bottom: 2px solid var(--vscode-button-foreground, #fff); border-left: 2px solid var(--vscode-button-foreground, #fff); content: ''; opacity: 0; transform: translateY(-1px) rotate(-45deg); }
        input[type="checkbox"]:checked { border-color: var(--vscode-focusBorder, #1683c5); background: var(--vscode-focusBorder, #1683c5); }
        input[type="checkbox"]:checked::after { opacity: 1; }
        input[type="radio"] { display: inline-grid; place-content: center; border-radius: 50%; }
        input[type="radio"]::after { width: 6px; height: 6px; border-radius: 50%; background: var(--vscode-button-foreground, #fff); content: ''; opacity: 0; transform: scale(0.5); transition: opacity 0.12s ease, transform 0.12s ease; }
        input[type="radio"]:checked { border-color: var(--vscode-focusBorder, #1683c5); background: var(--vscode-focusBorder, #1683c5); }
        input[type="radio"]:checked::after { opacity: 1; transform: scale(1); }
        input[type="checkbox"]:hover, input[type="radio"]:hover { border-color: var(--vscode-focusBorder, #1683c5); }
        input[type="checkbox"]:focus-visible, input[type="radio"]:focus-visible { outline: 1px solid var(--vscode-focusBorder, #1683c5); outline-offset: 2px; }
        input[type="checkbox"]:disabled, input[type="radio"]:disabled { cursor: default; opacity: 0.5; }
        .device-radio { flex: 0 0 14px; }
        .device-copy { display: flex; flex: 1; align-items: baseline; min-width: 0; gap: 8px; }
        .device-name { flex: 0 1 auto; max-width: 45%; overflow: hidden; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
        .device-detail { flex: 1; min-width: 0; overflow: hidden; color: var(--vscode-descriptionForeground, #777); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
        .check { display: flex; gap: 8px; align-items: center; font-size: 12px; line-height: 1.5; cursor: pointer; }
        .empty-state { display: grid; place-items: center; min-height: 58px; padding: 8px; color: var(--vscode-descriptionForeground, #777); text-align: center; }
        .device-loading-state { display: grid; place-items: center; min-height: 58px; color: var(--vscode-descriptionForeground, #777); font-size: 12px; }
        .settings { display: grid; gap: 6px; padding: 8px 0; border-bottom: 0; }
        .settings-row { display: flex; flex-wrap: wrap; gap: 8px 18px; }
        .settings label:last-child { display: flex; align-items: center; gap: 10px; }
        .vapor-options { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .radio-option { display: inline-flex; align-items: center; gap: 7px; font-size: 12px; cursor: pointer; }
        select { padding: 4px; background: var(--vscode-dropdown-background, #fff); color: inherit; border: 1px solid var(--vscode-dropdown-border, #ccc); }
        footer { position: fixed; bottom: 0; left: 0; right: 0; padding: 10px 28px; background: var(--vscode-editor-background, #fff); border-top: 1px solid var(--vscode-panel-border, #ddd); display: flex; justify-content: flex-end; gap: 8px; }
        button.primary, button.secondary { min-width: 58px; padding: 5px 14px; border-radius: 3px; font: inherit; font-size: 12px; cursor: pointer; }
        button.primary { background: #1683c5; color: white; border: 1px solid #1683c5; }
        button.secondary { background: transparent; color: inherit; border: 1px solid var(--vscode-button-secondaryBorder, #bbb); }
    `;
}

module.exports = ui_vue;
module.exports.validate_value = validate_value;
