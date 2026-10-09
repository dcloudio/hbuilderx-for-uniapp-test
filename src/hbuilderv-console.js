const vscode = require('vscode');

const VIEW_CONTAINER_ID = 'hbuilderv-uniapp-test';
const VIEW_ID = 'hbuilderv-uniapp-test.console';
const MAX_LINES = 2000;

let view;
const lines = [];
const hyperlinkHandlers = new Map();
let hyperlinkID = 0;

function getLineData(value) {
    if (value && typeof value === 'object') {
        const line = String(value.line ?? '').replace(/\x1B\[[0-?]*[ -/]*m/g, '');
        const hyperlinks = Array.isArray(value.hyperlinks) ? value.hyperlinks.map((hyperlink) => {
            const start = Number(hyperlink?.linkPosition?.start);
            const end = Number(hyperlink?.linkPosition?.end);
            if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end <= start || end > line.length || typeof hyperlink.onOpen !== 'function') return;
            const id = ++hyperlinkID;
            hyperlinkHandlers.set(id, hyperlink.onOpen);
            return { id, start, end };
        }).filter(Boolean) : [];
        return {
            line,
            level: value.level || 'info',
            hyperlinks
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
a { color: var(--vscode-textLink-foreground, #3794ff); cursor: pointer; text-decoration: underline; }
a:hover { color: var(--vscode-textLink-activeForeground, #3794ff); }
</style>
</head>
<body><div id="output">${content}</div>
<script>
const vscode = acquireVsCodeApi();
const output = document.getElementById('output');
const scrollToBottom = () => window.scrollTo(0, document.body.scrollHeight);
output.addEventListener('click', (event) => {
    const link = event.target.closest('[data-link-id]');
    if (!link) return;
    event.preventDefault();
    vscode.postMessage({ type: 'openLink', id: Number(link.dataset.linkId) });
});
window.addEventListener('message', (event) => {
    const message = event.data || {};
    if (message.type === 'append') {
        output.insertAdjacentHTML('beforeend', message.html);
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

function getLineHtml(item) {
    const level = ['warning', 'success', 'error', 'info'].includes(item.level) ? item.level : 'info';
    let offset = 0;
    let content = '';
    for (const hyperlink of (item.hyperlinks || []).sort((a, b) => a.start - b.start)) {
        if (hyperlink.start < offset) continue;
        content += escapeHtml(item.line.substring(offset, hyperlink.start));
        content += `<a href="#" data-link-id="${hyperlink.id}">${escapeHtml(item.line.substring(hyperlink.start, hyperlink.end))}</a>`;
        offset = hyperlink.end;
    }
    content += escapeHtml(item.line.substring(offset));
    return `<div class="line ${level}">${content}</div>`;
}

function getContentHtml() {
    return lines.map(getLineHtml).join('');
}

function removeHyperlinkHandlers(items) {
    items.forEach((item) => item.hyperlinks?.forEach((hyperlink) => hyperlinkHandlers.delete(hyperlink.id)));
}

function appendLine(value) {
    const item = getLineData(value);
    lines.push(item);
    const removed = lines.length > MAX_LINES;
    if (removed) removeHyperlinkHandlers(lines.splice(0, lines.length - MAX_LINES));
    if (view) {
        if (removed) {
            view.webview.postMessage({ type: 'replace', html: getContentHtml() });
        } else {
            view.webview.postMessage({ type: 'append', html: getLineHtml(item) });
        }
    }
}

function clearHBuilderVConsole() {
    lines.length = 0;
    hyperlinkHandlers.clear();
    if (view) view.webview.postMessage({ type: 'replace', html: '' });
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
            view.webview.onDidReceiveMessage?.((message) => {
                if (message?.type !== 'openLink') return;
                const handler = hyperlinkHandlers.get(message.id);
                if (handler) Promise.resolve().then(handler).catch((error) => console.error('[uni-app测试] 打开链接失败:', error));
            }, null, context.subscriptions);
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
    clearHBuilderVConsole,
    createHBuilderVConsoleView,
    registerHBuilderVConsole
};
