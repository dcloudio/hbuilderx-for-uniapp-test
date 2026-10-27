const hx = require('hbuilderx');
const os = require('os');
const fs = require('fs');
const path = require('path');
const i18n = require("./i18n/zh_CN.json")

const osName = os.platform();

const hx_env_app_root = hx.env.appRoot;

// 统一测试依赖目录
let PC_APPDATA_DIR = process.env.APPDATA;
if (osName == "darwin") {
    PC_APPDATA_DIR = path.join( os.homedir(), 'Library', 'Application Support' );
};
if (osName == "linux") {
    PC_APPDATA_DIR = path.join( os.homedir(), '.local', 'share' );
};
let CFG_DCLOUD_UNI_TEST_ENV_DIR = path.join(PC_APPDATA_DIR, "dcloud-uniapp-test")

// HBuilderX plugins目录
const CFG_HX_PLUGIN_DIR = path.join(hx.env.appRoot, "plugins");

/**
 * @description 获取hbuilder插件地址
 * @param {*} plugin_name 
 * @returns 
 */
function get_hbuilder_plugin_path(plugin_name) {
    // 优先使用 hx.extensions.getExtensionInfo 返回的插件安装目录，低版本回退到 appRoot/plugins
    let extensionPath;
    try {
        extensionPath = hx.extensions?.getExtensionInfo?.(plugin_name)?.extensionPath;
    } catch (e) {
        extensionPath = undefined;
    };
    // console.error("[get_hbuilder_plugin_path] ====> ", plugin_name, "is", extensionPath);
    return extensionPath || path.join(CFG_HX_PLUGIN_DIR, plugin_name);
};

// HBuilderX自带的node目录
const HBuilderX_BuiltIn_Node_Dir = get_hbuilder_plugin_path("node");
let node_program_name = osName == 'win32' ? 'node.exe' : 'node';
const HBuilderX_BuiltIn_Node_Path = path.join(HBuilderX_BuiltIn_Node_Dir, node_program_name);

// HBuilderX自带的npm路径
const CFG_NPM_PLUGIN_DIR = get_hbuilder_plugin_path("npm");
const HBuilderX_NPM_PATH = path.join(CFG_NPM_PLUGIN_DIR, "npm");

// 基座: uni-app 1.0 插件路径
const cfg_launcher_plugin_dir = get_hbuilder_plugin_path("launcher");
const cfg_launcher_ios_simulator_plugin_dir = get_hbuilder_plugin_path("launcher-ios-simulator");
const cfg_launcher_ios_simulator_arm64_plugin_dir = get_hbuilder_plugin_path("launcher-ios-simulator-arm64");

const LAUNCHER_ANDROID = path.join(cfg_launcher_plugin_dir, "base/android_base.apk");
const LAUNCHER_IOS_IPA = path.join(cfg_launcher_plugin_dir, "base/iPhone_base.ipa");
const LAUNCHER_VERSION_TXT = path.join(cfg_launcher_plugin_dir, "base/version.txt");

// 插件
const UNIAPP_LAUNCHER_HARMONY_PATH = get_hbuilder_plugin_path("launcher-harmony");
const UNIAPP_UNIAPP_EXTENSION_PATH = get_hbuilder_plugin_path("uniapp-extension");

// 基座: uni-app x vdom 路径
const cfg_uniappx_launcher_plugin_dir = get_hbuilder_plugin_path("uniappx-launcher");
const cfg_launcher_x_vdom_ios_simulator_plugin_dir = get_hbuilder_plugin_path("launcher-x-vdom-ios-simulator");
const cfg_launcher_x_vdom_ios_simulator_arm64_plugin_dir = get_hbuilder_plugin_path("launcher-x-vdom-ios-simulator-arm64");

const UNIAPP_X_LAUNCHER_IOS_IPA = path.join(cfg_uniappx_launcher_plugin_dir, "base/iPhone_base.ipa");
const UNIAPP_X_LAUNCHER_ANDROID = path.join(cfg_uniappx_launcher_plugin_dir, "base/android_base.apk");
const UNIAPP_X_LAUNCHER_VERSION_TXT = path.join(cfg_uniappx_launcher_plugin_dir, "base/version.txt");

// 基座: uni-app x vapor 路径
const cfg_uniappx_vapor_launcher_plugin_dir = get_hbuilder_plugin_path("uniappx-vapor-launcher");
const cfg_launcher_x_vapor_ios_simulator_plugin_dir = get_hbuilder_plugin_path("launcher-x-vapor-ios-simulator");
const cfg_launcher_x_vapor_ios_simulator_arm64_plugin_dir = get_hbuilder_plugin_path("launcher-x-vapor-ios-simulator-arm64");

const UNIAPP_X_VAPOR_LAUNCHER_IOS_IPA = path.join(cfg_uniappx_vapor_launcher_plugin_dir, "base/iPhone_base.ipa");
const UNIAPP_X_VAPOR_LAUNCHER_ANDROID = path.join(cfg_uniappx_vapor_launcher_plugin_dir, "base/android_base.apk");
const UNIAPP_X_VAPOR_LAUNCHER_VERSION_TXT = path.join(cfg_uniappx_vapor_launcher_plugin_dir, "base/version.txt");

// HBuilderX uniapp-cli路径
let UNI_CLI_PATH = get_hbuilder_plugin_path("uniapp-cli");
let UNI_CLI_VITE_PATH = get_hbuilder_plugin_path("uniapp-cli-vite");
let UNI_CLI_ENV = path.join(UNI_CLI_PATH, 'node_modules/@dcloudio/uni-automator/dist/environment.js');
let UNI_CLI_teardown = path.join(UNI_CLI_PATH, 'node_modules/@dcloudio/uni-automator/dist/teardown.js');

// HBuilderX UTS插件。
// 2023-01-31 如下参数，暂时无用。以后可能用得到。先不清除。
let UNIAPP_RUNEXTENSION_PATH = get_hbuilder_plugin_path("uniapp-runextension");
let UNIAPP_UTS_V1_PATH = get_hbuilder_plugin_path("uniapp-uts-v1");
let UTS_DEVELOPMENT_ANDROID_PATH = get_hbuilder_plugin_path("uts-development-android");

// 测试报告默认输出路径 (2026.10.27 改为CFG_DCLOUD_UNI_TEST_ENV_DIR目录)
// var testReportOutPutDir = path.join(hx.env.appData, 'hbuilderx-for-uniapp-test');
var testReportOutPutDir = path.join(CFG_DCLOUD_UNI_TEST_ENV_DIR, 'test_reports')

// uni-app自动化测试依赖目录。默认为：$APPDATA_DIR/hbuilderx-for-uniapp-test-lib/node_modules
let CFG_UNI_TEST_NODE_LIB_ROOT_DIR = path.join(CFG_DCLOUD_UNI_TEST_ENV_DIR, "hbuilderv-for-uniapp-test-lib");

let NODE_LIB_PATH = path.join(CFG_UNI_TEST_NODE_LIB_ROOT_DIR, "node_modules");
let CROSS_ENV_PATH = path.join(CFG_UNI_TEST_NODE_LIB_ROOT_DIR, "node_modules/cross-env/src/bin/cross-env.js");
let JEST_PATH = path.join(CFG_UNI_TEST_NODE_LIB_ROOT_DIR, 'node_modules/jest/bin/jest.js');


// uts插件编译所需
let UTS_JDK_PATH = '';
let UTS_GRADLE_HOME = '';
let UTS_APP_ROOT = hx_env_app_root;

// uts插件编译所需, 可随意指定目录
let UTS_USER_DATA_PATH = path.join(CFG_DCLOUD_UNI_TEST_ENV_DIR, 'hbuilderx-for-uniapp-test_cache');

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
        "launcher_android_apk_file": path.join(cfg_launcher_plugin_dir, "base/android_base.apk"),
        "launcher_ios_simulator_app_for_old": path.join(cfg_launcher_plugin_dir, "base/Pandora_simulator.app"),
        "launcher_ios_simulator_app_file": path.join(cfg_launcher_ios_simulator_plugin_dir, 'base/Pandora_simulator.app'),
        "launcher_ios_simulator_app_arm64_file": path.join(cfg_launcher_ios_simulator_arm64_plugin_dir, 'base/Pandora_simulator.app')
    },
    "uniapp-x-vdom": {
        "launcher_android_apk_file": path.join(cfg_uniappx_launcher_plugin_dir, "base/android_base.apk"),
        "launcher_ios_simulator_app_for_old": path.join(cfg_uniappx_launcher_plugin_dir, "base/Pandora_simulator.app"),
        "launcher_ios_simulator_app_file": path.join(cfg_launcher_x_vdom_ios_simulator_plugin_dir, 'base/Pandora_simulator.app'),
        "launcher_ios_simulator_app_arm64_file": path.join(cfg_launcher_x_vdom_ios_simulator_arm64_plugin_dir, 'base/Pandora_simulator.app')
    },
    "uniapp-x-vapor": {
        "launcher_android_apk_file": path.join(cfg_uniappx_vapor_launcher_plugin_dir, "base/android_base.apk"),
        "launcher_ios_simulator_app_for_old": path.join(cfg_uniappx_vapor_launcher_plugin_dir, "base/Pandora_simulator.app"),
        "launcher_ios_simulator_app_file": path.join(cfg_launcher_x_vapor_ios_simulator_plugin_dir, 'base/Pandora_simulator.app'),
        "launcher_ios_simulator_app_arm64_file": path.join(cfg_launcher_x_vapor_ios_simulator_arm64_plugin_dir, 'base/Pandora_simulator.app')
    }
}

module.exports = {
    i18n,
    CFG_DCLOUD_UNI_TEST_ENV_DIR,
    CFG_UNI_TEST_NODE_LIB_ROOT_DIR,

    CFG_HX_PLUGIN_DIR,
    HBuilderX_BuiltIn_Node_Dir,
    HBuilderX_BuiltIn_Node_Path,
    HBuilderX_NPM_PATH,

    HX_PLUGINS_DISPLAYNAME_LIST,

    cfg_launcher_plugin_dir,
    LAUNCHER_ANDROID,
    LAUNCHER_IOS_IPA,
    LAUNCHER_VERSION_TXT,

    cfg_uniappx_launcher_plugin_dir,
    UNIAPP_X_LAUNCHER_ANDROID,
    UNIAPP_X_LAUNCHER_IOS_IPA,
    UNIAPP_X_LAUNCHER_VERSION_TXT,

    UNIAPP_LAUNCHER_HARMONY_PATH,
    UNIAPP_UNIAPP_EXTENSION_PATH,

    cfg_uniappx_vapor_launcher_plugin_dir,
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
