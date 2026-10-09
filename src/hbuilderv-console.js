const vscode = require('vscode');
const path = require('path');

const DEBUG_TYPE = 'hbuilderv:uni-app-test';
const RUN_CONSOLE_ID = 'hbuilderv.uni-app-test';
const RUN_CONSOLE_TITLE = 'UNI-APP测试';
const MAX_PENDING_LINES = 2000;

let activeAdapter;
let startPromise;
let pendingLines = [];
let restartHandler;
let startRequestPending = false;

class UniAppTestRunAdapter {
    constructor(restartRequested) {
        this.sequence = 1;
        this.ready = false;
        this.ended = false;
        this.finishRequested = false;
        this.restartRequested = restartRequested;
        this.messageEmitter = new vscode.EventEmitter();
        this.onDidSendMessage = this.messageEmitter.event;
    }

    handleMessage(message) {
        if (!message || message.type !== 'request') return;
        switch (message.command) {
            case 'initialize':
                this.sendResponse(message, {
                    supportsConfigurationDoneRequest: true,
                    supportsTerminateRequest: true,
                    supportsANSIStyling: true
                });
                break;
            case 'launch':
                this.sendResponse(message);
                this.sendEvent('initialized');
                break;
            case 'configurationDone':
                this.sendResponse(message);
                this.ready = true;
                flushPendingLines();
                if (this.finishRequested) this.finish();
                if (this.restartRequested) restartLastRun();
                break;
            case 'disconnect':
            case 'terminate':
                this.sendResponse(message);
                require('./core/core.js').stopRunTest();
                break;
            case 'threads':
                this.sendResponse(message, { threads: [] });
                break;
            default:
                this.sendResponse(message);
                break;
        }
    }

    appendLine(value) {
        if (!this.ready || this.ended) return false;
        const data = normalizeOutput(value);
        const body = {
            category: data.level === 'error' ? 'stderr' : 'stdout',
            output: data.line.endsWith('\n') ? data.line : `${data.line}\n`
        };
        if (data.filePath) {
            body.source = { name: path.basename(data.filePath), path: data.filePath };
            body.line = 1;
            body.column = 1;
        }
        this.sendEvent('output', body);
        return true;
    }

    finish() {
        if (this.ended) return;
        if (!this.ready) {
            this.finishRequested = true;
            return;
        }
        this.ended = true;
        startPromise = undefined;
        this.sendEvent('exited', { exitCode: 0 });
        this.sendEvent('terminated');
    }

    sendResponse(request, body) {
        this.messageEmitter.fire({
            type: 'response',
            seq: this.sequence++,
            request_seq: request.seq,
            success: true,
            command: request.command,
            body
        });
    }

    sendEvent(event, body) {
        this.messageEmitter.fire({
            type: 'event',
            seq: this.sequence++,
            event,
            body
        });
    }

    dispose() {
        this.messageEmitter.dispose();
    }
}

function normalizeOutput(value) {
    if (value && typeof value === 'object') {
        const hyperlink = Array.isArray(value.hyperlinks) ? value.hyperlinks[0] : undefined;
        const start = Number(hyperlink?.linkPosition?.start);
        const end = Number(hyperlink?.linkPosition?.end);
        const line = String(value.line ?? '');
        return {
            line,
            level: value.level || 'info',
            filePath: Number.isInteger(start) && Number.isInteger(end) && start >= 0 && end > start && end <= line.length
                ? line.substring(start, end).trim()
                : undefined
        };
    }
    return { line: String(value ?? ''), level: 'info' };
}

function flushPendingLines() {
    if (!activeAdapter?.ready) return;
    const lines = pendingLines;
    pendingLines = [];
    lines.forEach((line) => activeAdapter.appendLine(line));
}

function startRunConsole() {
    if (activeAdapter && !activeAdapter.ended) return Promise.resolve(true);
    if (startPromise) return startPromise;
    const activeResource = vscode.window.activeTextEditor?.document.uri;
    const folder = (activeResource ? vscode.workspace.getWorkspaceFolder(activeResource) : undefined) || vscode.workspace.workspaceFolders?.[0];
    startRequestPending = true;
    startPromise = vscode.debug.startDebugging(folder, {
        type: DEBUG_TYPE,
        request: 'launch',
        name: RUN_CONSOLE_TITLE,
        runConsoleId: RUN_CONSOLE_ID,
        runConsoleTitle: RUN_CONSOLE_TITLE
    }).then((started) => {
        startRequestPending = false;
        if (!started) startPromise = undefined;
        return started;
    }, (error) => {
        startRequestPending = false;
        startPromise = undefined;
        console.error('[UNI-APP测试] 运行控制台启动失败:', error);
        return false;
    });
    return startPromise;
}

function restartLastRun() {
    if (typeof restartHandler !== 'function') return;
    Promise.resolve().then(restartHandler).catch((error) => {
        console.error('[UNI-APP测试] 重新启动测试失败:', error);
    });
}

function setHBuilderVConsoleRestartHandler(handler) {
    restartHandler = handler;
}

function appendLine(value) {
    if (!activeAdapter?.appendLine(value)) {
        pendingLines.push(value);
        if (pendingLines.length > MAX_PENDING_LINES) pendingLines.splice(0, pendingLines.length - MAX_PENDING_LINES);
        startRunConsole();
    }
}

function createHBuilderVConsoleView() {
    return {
        show: () => startRunConsole(),
        hide: () => Promise.resolve(),
        dispose: () => {},
        append: appendLine,
        appendLine
    };
}

function finishHBuilderVConsole() {
    const adapter = activeAdapter;
    if (adapter && !adapter.ended) {
        adapter.finish();
    } else if (startPromise) {
        startPromise.then(() => activeAdapter?.finish());
    }
}

function registerHBuilderVConsole() {
    return vscode.debug.registerRunAdapterDescriptorFactory(DEBUG_TYPE, {
        createRunAdapterDescriptor: () => {
            const adapter = new UniAppTestRunAdapter(!startRequestPending);
            startRequestPending = false;
            activeAdapter = adapter;
            return new vscode.DebugAdapterInlineImplementation(adapter);
        }
    });
}

module.exports = {
    createHBuilderVConsoleView,
    finishHBuilderVConsole,
    registerHBuilderVConsole,
    setHBuilderVConsoleRestartHandler
};
