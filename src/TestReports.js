const hx = require('hbuilderx');
const fs = require('fs');

const {
    getPluginConfig,
} = require('./lib/utils.js');

let {
    testReportOutPutDir,
} = require('./config.js');

let { i18n } = require('./config.js');

async function openReportOutputDir() {
    let userSet = await getPluginConfig("hbuilderx-for-uniapp-test.testReportOutPutDir");
    if (userSet != undefined && userSet.trim() != '') {
        if (!fs.existsSync(userSet)) {
            hx.window.showErrorMessage(i18n.invalid_custom_test_report_path, ['我知道了']);
        } else {
            hx.workspace.openTextDocument(userSet);
        };
    } else {
        hx.workspace.openTextDocument(testReportOutPutDir);
    };
};

module.exports = openReportOutputDir;
