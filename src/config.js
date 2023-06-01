const hx = require('hbuilderx');
const os = require('os');
const fs = require('fs');
const path = require('path');

const HBuilderX_PATH = path.join(hx.env.appRoot, "plugins");

// HBuilderX自带的node目录
const HBuilderX_BuiltIn_Node_Dir = path.join(hx.env.appRoot, "plugins", "node");

// HBuilderX自带的npm路径
const HBuilderX_NPM_PATH = path.join(hx.env.appRoot, "plugins", "npm", "npm");

// HBuilderX 基座路径
const LAUNCHER_PATH = path.join(hx.env.appRoot, "plugins", "launcher");
const LAUNCHER_ANDROID = path.join(LAUNCHER_PATH, "base/android_base.apk");
const LAUNCHER_IOS = path.join(LAUNCHER_PATH, "base/Pandora_simulator.app");
const LAUNCHER_VERSION_TXT = path.join(LAUNCHER_PATH, "base", "version.txt");

const UNIAPP_X_LAUNCHER_PATH = path.join(hx.env.appRoot, "plugins", "uniappx-launcher");
const UNIAPP_X_LAUNCHER_IOS = path.join(UNIAPP_X_LAUNCHER_PATH, "base/Pandora_simulator.app");
const UNIAPP_X_LAUNCHER_ANDROID = path.join(UNIAPP_X_LAUNCHER_PATH, "base/android_base.apk");
const UNIAPP_X_LAUNCHER_VERSION_TXT = path.join(UNIAPP_X_LAUNCHER_PATH, "base", "version.txt");

// HBuilderX uniapp-cli路径
let UNI_CLI_PATH = path.join(hx.env.appRoot, "plugins", "uniapp-cli");
let UNI_CLI_VITE_PATH = path.join(hx.env.appRoot, "plugins", "uniapp-cli-vite");
let UNI_CLI_ENV = path.join(UNI_CLI_PATH, 'node_modules/@dcloudio/uni-automator/dist/environment.js');
let UNI_CLI_teardown = path.join(UNI_CLI_PATH, 'node_modules/@dcloudio/uni-automator/dist/teardown.js');

// HBuilderX UTS插件。
// 2023-01-31 如下参数，暂时无用。以后可能用得到。先不清除。
let UNIAPP_RUNEXTENSION_PATH = path.join(hx.env.appRoot, "plugins", "uniapp-runextension");
let UNIAPP_UTS_V1_PATH = path.join(hx.env.appRoot, "plugins", "uniapp-uts-v1");
let UTS_DEVELOPMENT_ANDROID_PATH = path.join(hx.env.appRoot, "plugins", "uts-development-android");

// 测试报告默认输出路径
var testReportOutPutDir = path.join(hx.env.appData, 'hbuilderx-for-uniapp-test');

// uni-app自动化测试依赖目录。默认为：HBuilderX安装目录/plugis/hbuilderx-for-uniapp-test-lib/node_modules
let NODE_LIB_PATH = path.join(hx.env.appRoot, 'plugins', "hbuilderx-for-uniapp-test-lib/node_modules");
let CROSS_ENV_PATH = path.join(hx.env.appRoot, 'plugins', "hbuilderx-for-uniapp-test-lib/node_modules/cross-env/src/bin/cross-env.js");
let JEST_PATH = path.join(hx.env.appRoot, 'plugins', 'hbuilderx-for-uniapp-test-lib/node_modules/jest/bin/jest.js');


// uts插件编译所需
let UTS_JDK_PATH = '';
let UTS_GRADLE_HOME = '';
let UTS_APP_ROOT = hx.env.appRoot;

// uts插件编译所需, 可随意指定目录
let UTS_USER_DATA_PATH = path.join(hx.env.appData, 'hbuilderx-for-uniapp-test_cache');

module.exports = {
    HBuilderX_PATH,
    HBuilderX_BuiltIn_Node_Dir,
    HBuilderX_NPM_PATH,

    LAUNCHER_PATH,
    LAUNCHER_ANDROID,
    LAUNCHER_IOS,
    LAUNCHER_VERSION_TXT,

    UNIAPP_X_LAUNCHER_PATH,
    UNIAPP_X_LAUNCHER_ANDROID,
    UNIAPP_X_LAUNCHER_IOS,
    UNIAPP_X_LAUNCHER_VERSION_TXT,

    UNI_CLI_PATH,
    UNI_CLI_VITE_PATH,
    UNI_CLI_ENV,
    UNI_CLI_teardown,

    NODE_LIB_PATH,
    CROSS_ENV_PATH,
    JEST_PATH,

    testReportOutPutDir,

    UNIAPP_RUNEXTENSION_PATH,
    UNIAPP_UTS_V1_PATH,
    UTS_DEVELOPMENT_ANDROID_PATH,

    UTS_JDK_PATH,
    UTS_GRADLE_HOME,
    UTS_APP_ROOT,
    UTS_USER_DATA_PATH
};
