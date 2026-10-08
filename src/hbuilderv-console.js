const vscode = require('vscode');

const VIEW_CONTAINER_ID = 'hbuilderv-uniapp-test';
const VIEW_ID = 'hbuilderv-uniapp-test.console';
const MAX_LINES = 2000;

let view;
const lines = [];

function getLineData(value) {
    if (value && typeof value === 'object') {
        return {
            line: String(value.line ?? '').replace(/\x1B\[[0-?]*[ -/]*m/g, ''),
            level: value.level || 'info'
        };
    }
    return { line: String(value ?? '').replace(/\x1B\[[0-?]*[ -/]*m/g, ''), level: 'info' };
}

function escapeHtml(value) {
    return value.replace(/[&<>"']/g, (character) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[character]);
}

function getHtml() {
    const content = getContentHtml();
    return `<!doctype html>
<html>
<head>
<meta charset="UTF-8">
<style>
html, body { height: 100%; margin: 0; padding: 0; background: var(--vscode-panel-background); color: var(--vscode-foreground); }
body { overflow: auto; font: 12px var(--vscode-editor-font-family, monospace); }
#output { box-sizing: border-box; min-height: 100%; padding: 8px 12px; white-space: pre-wrap; word-break: break-word; }
.line { line-height: 1.5; }
.warning { color: var(--vscode-editorWarning-foreground, #cca700); }
.success { color: var(--vscode-testing-iconPassed, #73c991); }
.error { color: var(--vscode-editorError-foreground, #f14c4c); }
</style>
</head>
<body><div id="output">${content}</div>
<script>
const output = document.getElementById('output');
const scrollToBottom = () => window.scrollTo(0, document.body.scrollHeight);
window.addEventListener('message', (event) => {
    const message = event.data || {};
    if (message.type === 'append') {
        const line = document.createElement('div');
        line.className = 'line ' + (['warning', 'success', 'error', 'info'].includes(message.item.level) ? message.item.level : 'info');
        line.textContent = message.item.line;
        output.appendChild(line);
        scrollToBottom();
    } else if (message.type === 'replace') {
        output.innerHTML = message.html;
        scrollToBottom();
    }
});
requestAnimationFrame(scrollToBottom);
</script>
</body>
</html>`;
}

function getContentHtml() {
    return lines.map((item) => {
        const level = ['warning', 'success', 'error', 'info'].includes(item.level) ? item.level : 'info';
        return `<div class="line ${level}">${escapeHtml(item.line)}</div>`;
    }).join('');
}

function appendLine(value) {
    const item = getLineData(value);
    lines.push(item);
    const removed = lines.length > MAX_LINES;
    if (removed) lines.splice(0, lines.length - MAX_LINES);
    if (view) {
        if (removed) {
            view.webview.postMessage({ type: 'replace', html: getContentHtml() });
        } else {
            view.webview.postMessage({ type: 'append', item });
        }
    }
}

function createHBuilderVConsoleView(options = {}) {
    return {
        show: () => vscode.commands.executeCommand(`workbench.view.extension.${VIEW_CONTAINER_ID}`),
        hide: () => Promise.resolve(),
        dispose: () => {},
        append: (value) => appendLine(value),
        appendLine
    };
}

function registerHBuilderVConsole(context) {
    const provider = {
        resolveWebviewView: (webviewView) => {
            view = webviewView;
            view.webview.options = { enableScripts: true };
            view.webview.html = getHtml();
            view.onDidChangeVisibility?.(() => {
                if (webviewView.visible) webviewView.webview.html = getHtml();
            }, null, context.subscriptions);
            view.onDidDispose(() => {
                if (view === webviewView) view = undefined;
            }, null, context.subscriptions);
        }
    };
    return vscode.window.registerWebviewViewProvider(VIEW_ID, provider, {
        webviewOptions: { retainContextWhenHidden: true }
    });
}

module.exports = {
    createHBuilderVConsoleView,
    registerHBuilderVConsole
};
