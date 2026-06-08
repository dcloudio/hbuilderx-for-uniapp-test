const fs = require('fs');
const path = require('path');

const browserMap = {
    chrome: 'chromium',
    firefox: 'firefox',
    safari: 'webkit'
};

function checkWebLib(browser, nodeLibPath) {
    const browserName = String(browser || '').toLowerCase();
    const browserTypeName = browserMap[browserName];
    const result = {
        browser: browserName,
        browserType: browserTypeName || '',
        nodeLibPath: '',
        executablePath: '',
        exists: false,
        error: ''
    };

    if (!browserTypeName) {
        result.error = 'browser must be chrome|firefox|safari';
        return result;
    };

    try {
        const playwright = require(path.resolve(nodeLibPath, 'playwright'));
        const browserType = playwright[browserTypeName];
        if (!browserType || typeof browserType.executablePath != 'function') {
            result.error = `Playwright browser type not found: ${browserTypeName}`;
            return result;
        };

        result.executablePath = browserType.executablePath();
        result.exists = fs.existsSync(result.executablePath) && fs.statSync(result.executablePath).isFile();
        return result;
    } catch (err) {
        result.error = err.message;
        return result;
    };
};

module.exports = {
    checkWebLib
};

let result = checkWebLib("chrome", "/Users/hx/DCloud/dcloud_test/env_run_lib/0.0.4/node_modules")
console.log(result)
