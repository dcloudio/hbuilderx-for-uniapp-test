const fs = require('fs');
const os = require('os');
const path = require('path');
const childProcess = require('child_process');
const vscode = require('vscode');
const { parse: parseJsonc } = require('jsonc-parser');
const { createHBuilderVConsoleView } = require('./hbuilderv-console.js');

const appRoot = vscode.env.appRoot || process.cwd();
const defaultAppData = process.platform === 'darwin'
    ? path.join(os.homedir(), 'Library', 'Application Support', 'HBuilderV')
    : process.platform === 'win32'
        ? path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'HBuilderV')
        : path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), 'HBuilderV');
const appData = process.env.HBUILDERV_APP_DATA || defaultAppData;
let activeCliConsole;

function asUri(value) {
    if (value && typeof value === 'object' && value.scheme) return value;
    return vscode.Uri.file(value);
}

function getConfiguration() {
    const configuration = vscode.workspace.getConfiguration();
    return {
        get: (key, defaultValue) => configuration.get(key, defaultValue),
        update: (key, value, target) => configuration.update(key, value, target),
    };
}

function createOutputView(options = {}) {
    if (options.id === 'hbuilderx.uniapp.test.log') {
        return createHBuilderVConsoleView(options);
    }
    const output = vscode.window.createAnsiOutputChannel(options.title || options.id || 'HBuilderV');
    return {
        show: () => output.show(true),
        hide: () => output.hide(),
        dispose: () => output.dispose(),
        append: (value) => output.append(typeof value === 'string' ? value : String(value?.line || value || '')),
        appendLine: (value) => output.appendLine(typeof value === 'string' ? value : String(value?.line || value || '')),
    };
}

function showMessageBox(options = {}) {
    const buttons = Array.isArray(options.buttons) ? options.buttons : ['关闭'];
    const show = options.type === 'question' ? vscode.window.showWarningMessage : vscode.window.showInformationMessage;
    return show(options.text || '', ...buttons);
}

async function showFormDialog(options = {}) {
    const values = {};
    for (const item of options.formItems || []) {
        const value = await vscode.window.showInputBox({
            title: options.title,
            prompt: item.label || item.placeholder || item.name,
            value: item.value || '',
            password: item.mode === 'password',
            ignoreFocusOut: true,
        });
        if (value === undefined) return '-1';
        values[item.name] = value;
    }
    if (typeof options.validate === 'function') {
        const valid = await options.validate.call({ showError: () => {} }, values);
        if (!valid) return showFormDialog(options);
    }
    return { buttonIndex: 0, result: values };
}

function showFileWizardDialog(options = {}) {
    return vscode.window.showSaveDialog({
        title: options.title,
        defaultUri: vscode.Uri.file(path.join(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd(), options.defaultName || 'test.js')),
        filters: { JavaScript: ['js'] },
    }).then((uri) => uri ? { template: options.template?.[0], file: uri.fsPath } : { template: '', file: '' });
}

function setStatusBarMessage(text, first, second) {
    const timeout = typeof first === 'number' ? first : (typeof second === 'number' ? second : undefined);
    return timeout ? vscode.window.setStatusBarMessage(text, timeout) : vscode.window.setStatusBarMessage(text);
}

function readJSONValue(filePath, field) {
    return Promise.resolve().then(() => {
        const errors = [];
        const value = parseJsonc(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''), errors, {
            allowTrailingComma: true,
        });
        if (errors.length) {
            const error = new SyntaxError(`Invalid JSONC in ${filePath}`);
            error.errors = errors;
            throw error;
        }
        return { data: field ? value[field] : value };
    });
}

function getWorkspaceFolder(projectPath) {
    const uri = asUri(projectPath);
    const folder = vscode.workspace.getWorkspaceFolder(uri);
    if (folder) return Promise.resolve(withWorkspaceMetadata(folder));
    const manifestPath = path.join(uri.fsPath, 'manifest.json');
    let vueVersion = '3';
    try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        vueVersion = manifest['vueVersion'] || (manifest['uni-app-x'] ? '3' : '2');
    } catch (e) {}
    return Promise.resolve({ uri, name: path.basename(uri.fsPath), index: 0, vueVersion, nature: 'UniApp_Vue' });
}

function withWorkspaceMetadata(folder) {
    const value = { ...folder, nature: 'UniApp_Vue', vueVersion: '3' };
    try {
        const manifestPath = path.join(folder.uri.fsPath, 'manifest.json');
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        value.vueVersion = manifest.vueVersion || (manifest['uni-app-x'] ? '3' : '2');
    } catch (e) {}
    return value;
}

function openTextDocument(filePath) {
    return vscode.workspace.openTextDocument(asUri(filePath)).then((document) => vscode.window.showTextDocument(document));
}

function getMobileList() {
    return new Promise((resolve) => {
        const result = { android: [], android_simulator: [], ios_simulator: [], ios_phone: [], harmony: [] };
        const finish = () => resolve(result);
        childProcess.exec('adb devices -l', (error, stdout) => {
            if (!error) {
                stdout.split(/\r?\n/).slice(1).forEach((line) => {
                    const match = line.match(/^([^\s]+)\s+device\b/);
                    if (match) result.android.push({ uuid: match[1], udid: match[1], name: match[1], version: '' });
                });
            }
            childProcess.exec('xcrun simctl list devices available --json', (iosError, iosStdout) => {
                if (!iosError) {
                    try {
                        const devices = JSON.parse(iosStdout).devices || {};
                        Object.values(devices).flat().forEach((device) => {
                            if (device.isAvailable && device.udid && !/Apple Watch|iPad|Apple TV|iPod touch/.test(device.name)) {
                                result.ios_simulator.push({ uuid: device.udid, udid: device.udid, name: device.name, version: device.runtime || '', device_type: '模拟器' });
                            }
                        });
                    } catch (e) {}
                }
                childProcess.exec('hdc list targets -v', (harmonyError, harmonyStdout) => {
                    if (!harmonyError) {
                        harmonyStdout.split(/\r?\n/).forEach((line) => {
                            if (!line.includes('localhost') || !line.includes('Connected')) return;
                            const udid = line.split('\t')[0].trim();
                            if (udid) result.harmony.push({ udid, name: udid, version: '' });
                        });
                    }
                    finish();
                });
            });
        });
    });
}

function registerCliCommand(command, callback) {
    return vscode.commands.registerCliCommand(command, async (params, token) => {
        activeCliConsole = params.cliconsole;
        const args = { ...params };
        delete args.cliconsole;
        delete args.rawArgv;
        delete args.cwd;
        const normalized = {
            ...params,
            args,
            cliconsole: {
                ...params.cliconsole,
                clientId: params.cliconsole?.clientId || 'hbuilderv',
            },
        };
        try {
            return await callback(normalized, token);
        } finally {
            activeCliConsole = undefined;
        }
    });
}

const hx = {
    env: {
        appRoot,
        appData,
        appVersion: vscode.hbuilderxVersion || vscode.version,
        openExternal: (url) => vscode.env.openExternal(vscode.Uri.parse(url)),
    },
    window: {
        get activeTextEditor() { return vscode.window.activeTextEditor; },
        showInformationMessage: (message, ...items) => vscode.window.showInformationMessage(message, ...items.flat()),
        showWarningMessage: (message, ...items) => vscode.window.showWarningMessage(message, ...items.flat()),
        showErrorMessage: (message, ...items) => vscode.window.showErrorMessage(message, ...items.flat()),
        showMessageBox,
        showFormDialog,
        showFileWizardDialog,
        setStatusBarMessage,
        createOutputView,
        openWebviewDialog: vscode.window.openWebviewDialog,
        registerUriHandler: (handler) => vscode.window.registerUriHandler(handler),
    },
    workspace: {
        get workspaceFolders() { return vscode.workspace.workspaceFolders; },
        getConfiguration,
        getWorkspaceFolder,
        openTextDocument,
        gotoConfiguration: (section) => vscode.commands.executeCommand('workbench.action.openSettings', `@id:${section}`),
    },
    commands: {
        registerCommand: vscode.commands.registerCommand,
        registerCliCommand,
        executeCommand: vscode.commands.executeCommand,
    },
    extensions: {
        getExtension: (id) => vscode.extensions.getExtension(id),
    },
    app: { getMobileList },
    util: { readJSONValue },
    unicloud: {
        getExistsUnicloudAndBindSpace: () => Promise.resolve([]),
    },
    cliconsole: {
        log: ({ msg }) => activeCliConsole?.log ? activeCliConsole.log(String(msg ?? '')) : console.log(msg),
    },
};

module.exports = hx;
