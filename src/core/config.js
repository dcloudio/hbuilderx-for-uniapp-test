const hx = require('hbuilderx');
const os = require('os');
const fs = require('fs');
const path = require('path');
const i18n = require("./i18n/zh_CN.json")

const osName = os.platform();

const hx_env_app_root = hx.env.appRoot;

const HBuilderX_PATH = path.join(hx.env.appRoot, "plugins");

// HBuilderX自带的node目录
const HBuilderX_BuiltIn_Node_Dir = path.join(hx_env_app_root, "plugins", "node");
let node_program_name = osName == 'win32' ? 'node.exe' : 'node';
const HBuilderX_BuiltIn_Node_Path = path.join(HBuilderX_BuiltIn_Node_Dir, node_program_name);

// HBuilderX自带的npm路径
const HBuilderX_NPM_PATH = path.join(hx_env_app_root, "plugins", "npm", "npm");

// HBuilderX 基座路径
const LAUNCHER_PATH = path.join(hx_env_app_root, "plugins", "launcher");
const LAUNCHER_ANDROID = path.join(LAUNCHER_PATH, "base/android_base.apk");
const LAUNCHER_IOS_IPA = path.join(LAUNCHER_PATH, "base/iPhone_base.ipa");
const LAUNCHER_VERSION_TXT = path.join(LAUNCHER_PATH, "base", "version.txt");

// 插件
const UNIAPP_LAUNCHER_HARMONY_PATH = path.join(hx_env_app_root, "plugins", "launcher-harmony");
const UNIAPP_UNIAPP_EXTENSION_PATH = path.join(hx_env_app_root, "plugins", "uniapp-extension");

const UNIAPP_X_LAUNCHER_PATH = path.join(hx_env_app_root, "plugins", "uniappx-launcher");
const UNIAPP_X_LAUNCHER_IOS_IPA = path.join(UNIAPP_X_LAUNCHER_PATH, "base/iPhone_base.ipa");
const UNIAPP_X_LAUNCHER_ANDROID = path.join(UNIAPP_X_LAUNCHER_PATH, "base/android_base.apk");
const UNIAPP_X_LAUNCHER_VERSION_TXT = path.join(UNIAPP_X_LAUNCHER_PATH, "base", "version.txt");

const UNIAPP_X_VAPOR_LAUNCHER_PATH = path.join(hx_env_app_root, "plugins", "uniappx-vapor-launcher");
const UNIAPP_X_VAPOR_LAUNCHER_IOS_IPA = path.join(UNIAPP_X_VAPOR_LAUNCHER_PATH, "base/iPhone_base.ipa");
const UNIAPP_X_VAPOR_LAUNCHER_ANDROID = path.join(UNIAPP_X_VAPOR_LAUNCHER_PATH, "base/android_base.apk");
const UNIAPP_X_VAPOR_LAUNCHER_VERSION_TXT = path.join(UNIAPP_X_VAPOR_LAUNCHER_PATH, "base", "version.txt");

// HBuilderX uniapp-cli路径
let UNI_CLI_PATH = path.join(hx_env_app_root, "plugins", "uniapp-cli");
let UNI_CLI_VITE_PATH = path.join(hx_env_app_root, "plugins", "uniapp-cli-vite");
let UNI_CLI_ENV = path.join(UNI_CLI_PATH, 'node_modules/@dcloudio/uni-automator/dist/environment.js');
let UNI_CLI_teardown = path.join(UNI_CLI_PATH, 'node_modules/@dcloudio/uni-automator/dist/teardown.js');

// HBuilderX UTS插件。
// 2023-01-31 如下参数，暂时无用。以后可能用得到。先不清除。
let UNIAPP_RUNEXTENSION_PATH = path.join(hx_env_app_root, "plugins", "uniapp-runextension");
let UNIAPP_UTS_V1_PATH = path.join(hx_env_app_root, "plugins", "uniapp-uts-v1");
let UTS_DEVELOPMENT_ANDROID_PATH = path.join(hx_env_app_root, "plugins", "uts-development-android");

// 测试报告默认输出路径
var testReportOutPutDir = path.join(hx.env.appData, 'hbuilderx-for-uniapp-test');

// uni-app自动化测试依赖目录。默认为：HBuilderX安装目录/plugis/hbuilderx-for-uniapp-test-lib/node_modules
let NODE_LIB_PATH = path.join(hx_env_app_root, 'plugins', "hbuilderx-for-uniapp-test-lib/node_modules");
let CROSS_ENV_PATH = path.join(hx_env_app_root, 'plugins', "hbuilderx-for-uniapp-test-lib/node_modules/cross-env/src/bin/cross-env.js");
let JEST_PATH = path.join(hx_env_app_root, 'plugins', 'hbuilderx-for-uniapp-test-lib/node_modules/jest/bin/jest.js');


// uts插件编译所需
let UTS_JDK_PATH = '';
let UTS_GRADLE_HOME = '';
let UTS_APP_ROOT = hx_env_app_root;

// uts插件编译所需, 可随意指定目录
let UTS_USER_DATA_PATH = path.join(hx.env.appData, 'hbuilderx-for-uniapp-test_cache');

const HX_PLUGINS_DISPLAYNAME_LIST = {
    "uniapp-cli-vite": "uni-app (vue3)编译器",
    "uniapp-cli": "uni-app (vue2)编译器",
    "launcher": "App真机运行",
    "uniappx-launcher": "App真机运行(uni-app x)",
    "uts-development-android": "uts开发扩展-Android",
    "uts-development-ios": "uts开发扩展-iOS",
    "uniapp-uts-v1": "uniapp-uts-v1",
    "uniapp-runextension": "uniapp-runextension"
}

// 2026-09 ios-27上市，ios模拟器需要拆封为intel和arm。
let CFG_project_app_runtime_mapping_data = {
    "uniapp-1.0": {
        "launcher_android_apk_file": path.join(hx_env_app_root, 'plugins', "launcher/base/android_base.apk"),
        "launcher_ios_simulator_app_for_old": path.join(hx_env_app_root, 'plugins', "launcher/base/Pandora_simulator.app"),
        "launcher_ios_simulator_app_file": path.join(hx_env_app_root, 'plugins', 'launcher-ios-simulator/base/Pandora_simulator.app'),
        "launcher_ios_simulator_app_arm64_file": path.join(hx_env_app_root, 'plugins', 'launcher-ios-simulator-arm64/base/Pandora_simulator.app')
    },
    "uniapp-x-vdom": {
        "launcher_android_apk_file": path.join(hx_env_app_root, 'plugins', "uniappx-launcher/base/android_base.apk"),
        "launcher_ios_simulator_app_for_old": path.join(hx_env_app_root, 'plugins', "uniappx-launcher/base/Pandora_simulator.app"),
        "launcher_ios_simulator_app_file": path.join(hx_env_app_root, 'plugins', 'launcher-x-vdom-ios-simulator/base/Pandora_simulator.app'),
        "launcher_ios_simulator_app_arm64_file": path.join(hx_env_app_root, 'plugins', 'launcher-x-vdom-ios-simulator-arm64/base/Pandora_simulator.app')
    },
    "uniapp-x-vapor": {
        "launcher_android_apk_file": path.join(hx_env_app_root, 'plugins', "uniappx-vapor-launcher/base/android_base.apk"),
        "launcher_ios_simulator_app_for_old": path.join(hx_env_app_root, 'plugins', "uniappx-vapor-launcher/base/Pandora_simulator.app"),
        "launcher_ios_simulator_app_file": path.join(hx_env_app_root, 'plugins', 'launcher-x-vapor-ios-simulator/base/Pandora_simulator.app'),
        "launcher_ios_simulator_app_arm64_file": path.join(hx_env_app_root, 'plugins', 'launcher-x-vapor-ios-simulator-arm64/base/Pandora_simulator.app')
    }
}

module.exports = {
    i18n,

    HBuilderX_PATH,
    HBuilderX_BuiltIn_Node_Dir,
    HBuilderX_BuiltIn_Node_Path,
    HBuilderX_NPM_PATH,

    HX_PLUGINS_DISPLAYNAME_LIST,

    LAUNCHER_PATH,
    LAUNCHER_ANDROID,
    LAUNCHER_IOS_IPA,
    LAUNCHER_VERSION_TXT,

    UNIAPP_X_LAUNCHER_PATH,
    UNIAPP_X_LAUNCHER_ANDROID,
    UNIAPP_X_LAUNCHER_IOS_IPA,
    UNIAPP_X_LAUNCHER_VERSION_TXT,

    UNIAPP_LAUNCHER_HARMONY_PATH,
    UNIAPP_UNIAPP_EXTENSION_PATH,

    UNIAPP_X_VAPOR_LAUNCHER_PATH,
    UNIAPP_X_VAPOR_LAUNCHER_ANDROID,
    UNIAPP_X_VAPOR_LAUNCHER_IOS_IPA,
    UNIAPP_X_VAPOR_LAUNCHER_VERSION_TXT,

    UNI_CLI_PATH,
    UNI_CLI_VITE_PATH,
    UNI_CLI_ENV,
    UNI_CLI_teardown,

    NODE_LIB_PATH,
    CROSS_ENV_PATH,
    JEST_PATH,
    CFG_project_app_runtime_mapping_data,

    testReportOutPutDir,

    UNIAPP_RUNEXTENSION_PATH,
    UNIAPP_UTS_V1_PATH,
    UTS_DEVELOPMENT_ANDROID_PATH,

    UTS_JDK_PATH,
    UTS_GRADLE_HOME,
    UTS_APP_ROOT,
    UTS_USER_DATA_PATH
};
