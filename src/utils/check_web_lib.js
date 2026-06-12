const hx = require('hbuilderx');
const fs = require('fs');
const path = require('path');
const os = require("os");

const osName = os.platform();

const browserMap = {
    chrome: 'chromium',
    firefox: 'firefox',
    safari: 'webkit'
};

function checkWebLib(browser, nodeLibPath) {

    // 针对linux ai包的特殊处理
    const ms_playwright_dir = path.join(hx.env.appRoot, "plugins", "hbuilderx-for-uniapp-test-lib", "ms-playwright");
    if (osName == "linux" && browser == "chrome" && fs.existsSync(ms_playwright_dir)) {
        let ms_playwright_chrome = "";
        if (fs.existsSync(ms_playwright_dir)) {
            const chromium_dir = fs.readdirSync(ms_playwright_dir).find((item) => item.startsWith("chromium-"));
            const chrome_linux_dir = chromium_dir ? fs.readdirSync(path.join(ms_playwright_dir, chromium_dir)).find((item) => item.startsWith("chrome-linux")) : "";
            ms_playwright_chrome = chrome_linux_dir ? path.join(ms_playwright_dir, chromium_dir, chrome_linux_dir, "chrome") : "";
        };
        if (ms_playwright_chrome && fs.existsSync(ms_playwright_chrome)) {
            return { "exists": true,  "browser": browser}
        };
    };

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

// let result = checkWebLib("chrome", "/Users/hx/DCloud/dcloud_test/env_run_lib/0.0.4/node_modules")
// console.log(result)
