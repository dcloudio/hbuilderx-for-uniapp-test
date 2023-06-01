const hx = require('hbuilderx');
const fs = require('fs');

const {
    getPluginConfig,
} = require('./lib/utils.js');

let {
    testReportOutPutDir,
} = require('./config.js');

async function openReportOutputDir() {
    let userSet = await getPluginConfig("hbuilderx-for-uniapp-test.testReportOutPutDir");
    if (userSet != undefined && userSet.trim() != '') {
        if (!fs.existsSync(userSet)) {
            hx.window.showErrorMessage('您在插件设置中，自定义的测试报告输出目录无效，请重新设置。', ['我知道了']);
        } else {
            hx.workspace.openTextDocument(userSet);
        };
    } else {
        hx.workspace.openTextDocument(testReportOutPutDir);
    };
};

module.exports = openReportOutputDir;
