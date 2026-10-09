const vscode = require('vscode');
const hx = require('hbuilderx');
const os = require('os');
const fs = require('fs');
const path = require('path');
const i18n = require("./i18n/zh_CN.json")

const osName = os.platform();

const appData_dir = hx.env.appData;

let PC_APPDATA_DIR = process.env.APPDATA;
if (osName == "darwin") {
    PC_APPDATA_DIR = path.join( os.homedir(), 'Library', 'Application Support' );
};
if (osName == "linux") {
    PC_APPDATA_DIR = path.join( os.homedir(), '.local', 'share' );
};
let HV_UNI_TEST_ENV_DIR = path.join(PC_APPDATA_DIR, "dcloud-uniapp-test")

/**
 * @description 获取dcloud.hbuilderx-uniapp-sdk plugins目录路径
 * @returns 
 */
function get_hbuilderv_uniapp_sdk_dir() {
    const data = vscode.extensions.getExtension("dcloud.hbuilderx-uniapp-sdk");
    if (data) {
        let x = data.extensionPath;
        if (x && osName == "darwin") {
            return path.join(x, 'sdk.app/Contents/HBuilderX')
        };
        return x
    };
    return '';
};

const hbuilderv_uniapp_sdk_dir = get_hbuilderv_uniapp_sdk_dir();
const hbuilderv_uniapp_sdk_plugins_dir = path.join(hbuilderv_uniapp_sdk_dir, "plugins");

/**
 * @description 获取hbuilderv插件地址
 * @param {*} plugin_name 
 * @returns 
 */
function get_hbuilderv_plugin_path(plugin_name) {
    const extention_data = vscode.extensions.getExtension(`dcloud.${plugin_name}`);
    if (extention_data) {
        return path.join(extention_data.extensionPath, 'resources', plugin_name) ;
    };
    if (extention_data == undefined && fs.existsSync(hbuilderv_uniapp_sdk_plugins_dir)) {
        let _plugin_dir = path.join(hbuilderv_uniapp_sdk_plugins_dir, plugin_name);
        let _plugin_package_json_file = path.join(_plugin_dir, "package.json");
        if (fs.existsSync(_plugin_package_json_file)) {
            return _plugin_dir;
        };
    };
    return '';
};

// 内置sdk的插件路径
const cfg_hv_plugin_npm_dir = get_hbuilderv_plugin_path("npm");
const cfg_hv_plugin_node_dir = get_hbuilderv_plugin_path("node");
const cfg_hv_plugin_uniapp_extension_dir = get_hbuilderv_plugin_path("uniapp-extension");

// 基座
const cfg_hv_plugin_launcher_dir = get_hbuilderv_plugin_path("launcher");
const cfg_hv_plugin_launcher_tools_dir = get_hbuilderv_plugin_path("launcher-tools");
const cfg_hv_plugin_uniappx_launcher_dir = get_hbuilderv_plugin_path("uniappx-launcher");
const cfg_hv_plugin_uniappx_vapor_launcher_dir = get_hbuilderv_plugin_path("uniappx-vapor-launcher");
const cfg_hv_plugin_launcher_harmony_dir = get_hbuilderv_plugin_path("launcher-harmony");

// uniapp 1.0项目，ios模拟器
const cfg_hv_plugin_launcher_ios_simulator_dir = get_hbuilderv_plugin_path("launcher-ios-simulator");
const cfg_hv_plugin_launcher_ios_simulator_arm64_dir = get_hbuilderv_plugin_path("launcher-ios-simulator-arm64");

// uniapp-x vdom ios模拟器
const cfg_hv_plugin_launcher_x_vdom_ios_simulator_dir = get_hbuilderv_plugin_path("launcher-x-vdom-ios-simulator");
const cfg_hv_plugin_launcher_x_vdom_ios_simulator_arm64_dir = get_hbuilderv_plugin_path("launcher-x-vdom-ios-simulator-arm64");

// uniapp-x vapor ios模拟器
const cfg_hv_plugin_launcher_x_vapor_ios_simulator_dir = get_hbuilderv_plugin_path("launcher-x-vapor-ios-simulator");
const cfg_hv_plugin_launcher_x_vapor_ios_simulator_arm64_dir = get_hbuilderv_plugin_path("launcher-x-vapor-ios-simulator-arm64");

// uniapp-cli
const cfg_hv_plugin_uniapp_cli_dir = get_hbuilderv_plugin_path("uniapp-cli");

// uniapp-cli-vite
const cfg_hv_plugin_uniapp_cli_vite_dir = get_hbuilderv_plugin_path("uniapp-cli-vite");
// console.log("[uniapp-cli-vite] ==========================", cfg_hv_plugin_uniapp_cli_vite_dir);

// uniapp-uts-v1
const cfg_hv_plugin_uniapp_uts_v1_dir = get_hbuilderv_plugin_path("uniapp-uts-v1");
// console.log("[uniapp-uts-v1] ==========================", cfg_hv_plugin_uniapp_uts_v1_dir);

// uniapp-runextension
const cfg_hv_plugin_uniapp_runextension_dir = get_hbuilderv_plugin_path("uniapp-runextension");
// console.log("[uniapp-runextension] ==========================", cfg_hv_plugin_uniapp_runextension_dir);

// uts-development-android
const cfg_hv_plugin_uts_development_android_dir = get_hbuilderv_plugin_path("uts-development-android");
// console.log("[uts-development-android] ==========================", cfg_hv_plugin_uts_development_android_dir);


const hx_env_app_root = hbuilderv_uniapp_sdk_dir;

const HBuilderX_PATH = hbuilderv_uniapp_sdk_plugins_dir;

// HBuilderX自带的node目录
const HBuilderX_BuiltIn_Node_Dir = cfg_hv_plugin_node_dir;
let node_program_name = osName == 'win32' ? 'node.exe' : 'node';
const HBuilderX_BuiltIn_Node_Path = path.join(HBuilderX_BuiltIn_Node_Dir, node_program_name);

// HBuilderX自带的npm路径
const HBuilderX_NPM_PATH = cfg_hv_plugin_npm_dir;

// HBuilderX 基座路径
const LAUNCHER_PATH = cfg_hv_plugin_launcher_dir;
const LAUNCHER_ANDROID = path.join(LAUNCHER_PATH, "base/android_base.apk");
const LAUNCHER_IOS_IPA = path.join(LAUNCHER_PATH, "base/iPhone_base.ipa");
const LAUNCHER_VERSION_TXT = path.join(LAUNCHER_PATH, "base", "version.txt");

// 插件
const UNIAPP_LAUNCHER_HARMONY_PATH = cfg_hv_plugin_launcher_harmony_dir;
const UNIAPP_UNIAPP_EXTENSION_PATH = cfg_hv_plugin_uniapp_extension_dir

const UNIAPP_X_LAUNCHER_PATH = cfg_hv_plugin_uniappx_launcher_dir;
const UNIAPP_X_LAUNCHER_IOS_IPA = path.join(UNIAPP_X_LAUNCHER_PATH, "base/iPhone_base.ipa");
const UNIAPP_X_LAUNCHER_ANDROID = path.join(UNIAPP_X_LAUNCHER_PATH, "base/android_base.apk");
const UNIAPP_X_LAUNCHER_VERSION_TXT = path.join(UNIAPP_X_LAUNCHER_PATH, "base", "version.txt");

const UNIAPP_X_VAPOR_LAUNCHER_PATH = cfg_hv_plugin_uniappx_vapor_launcher_dir;
const UNIAPP_X_VAPOR_LAUNCHER_IOS_IPA = path.join(UNIAPP_X_VAPOR_LAUNCHER_PATH, "base/iPhone_base.ipa");
const UNIAPP_X_VAPOR_LAUNCHER_ANDROID = path.join(UNIAPP_X_VAPOR_LAUNCHER_PATH, "base/android_base.apk");
const UNIAPP_X_VAPOR_LAUNCHER_VERSION_TXT = path.join(UNIAPP_X_VAPOR_LAUNCHER_PATH, "base", "version.txt");

// HBuilderX uniapp-cli路径
let UNI_CLI_PATH = cfg_hv_plugin_uniapp_cli_dir;

let UNI_CLI_VITE_PATH = cfg_hv_plugin_uniapp_cli_vite_dir;
let UNI_CLI_ENV = path.join(UNI_CLI_VITE_PATH, 'node_modules/@dcloudio/uni-automator/dist/environment.js');
let UNI_CLI_teardown = path.join(UNI_CLI_VITE_PATH, 'node_modules/@dcloudio/uni-automator/dist/teardown.js');

// HBuilderX UTS插件。
// 2023-01-31 如下参数，暂时无用。以后可能用得到。先不清除。
let UNIAPP_RUNEXTENSION_PATH = cfg_hv_plugin_uniapp_runextension_dir;
let UNIAPP_UTS_V1_PATH = cfg_hv_plugin_uniapp_uts_v1_dir;
let UTS_DEVELOPMENT_ANDROID_PATH = cfg_hv_plugin_uts_development_android_dir;

// 测试报告默认输出路径
var testReportOutPutDir = path.join(HV_UNI_TEST_ENV_DIR, 'test_reports');

// uni-app自动化测试依赖目录。默认为：$APPDATA_DIR/hbuilderv-for-uniapp-test-lib/node_modules
let UNI_TEST_NODE_LIB_ROOT_DIR = path.join(HV_UNI_TEST_ENV_DIR, "hbuilderv-for-uniapp-test-lib");
let NODE_LIB_PATH = path.join(UNI_TEST_NODE_LIB_ROOT_DIR, "node_modules");
let CROSS_ENV_PATH = path.join(UNI_TEST_NODE_LIB_ROOT_DIR, "node_modules/cross-env/src/bin/cross-env.js");
let JEST_PATH = path.join(UNI_TEST_NODE_LIB_ROOT_DIR, 'node_modules/jest/bin/jest.js');


// uts插件编译所需
let UTS_JDK_PATH = '';
let UTS_GRADLE_HOME = '';
let UTS_APP_ROOT = hbuilderv_uniapp_sdk_dir;

// uts插件编译所需, 可随意指定目录
let UTS_USER_DATA_PATH = path.join(appData_dir, 'hbuilderv-for-uniapp-test_cache');

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
        "launcher_android_apk_file": path.join(cfg_hv_plugin_launcher_dir, "base/android_base.apk"),
        "launcher_ios_simulator_app_for_old": path.join(cfg_hv_plugin_launcher_dir, "base/Pandora_simulator.app"),
        "launcher_ios_simulator_app_file": path.join(cfg_hv_plugin_launcher_ios_simulator_dir, 'base/Pandora_simulator.app'),
        "launcher_ios_simulator_app_arm64_file": path.join(cfg_hv_plugin_launcher_ios_simulator_arm64_dir, 'base/Pandora_simulator.app')
    },
    "uniapp-x-vdom": {
        "launcher_android_apk_file": path.join(cfg_hv_plugin_uniappx_launcher_dir, "base/android_base.apk"),
        "launcher_ios_simulator_app_for_old": path.join(cfg_hv_plugin_uniappx_launcher_dir, "base/Pandora_simulator.app"),
        "launcher_ios_simulator_app_file": path.join(cfg_hv_plugin_launcher_x_vdom_ios_simulator_dir, 'base/Pandora_simulator.app'),
        "launcher_ios_simulator_app_arm64_file": path.join(cfg_hv_plugin_launcher_x_vdom_ios_simulator_arm64_dir, 'base/Pandora_simulator.app')
    },
    "uniapp-x-vapor": {
        "launcher_android_apk_file": path.join(cfg_hv_plugin_uniappx_vapor_launcher_dir, "base/android_base.apk"),
        "launcher_ios_simulator_app_for_old": path.join(cfg_hv_plugin_uniappx_vapor_launcher_dir, "base/Pandora_simulator.app"),
        "launcher_ios_simulator_app_file": path.join(cfg_hv_plugin_launcher_x_vapor_ios_simulator_dir, 'base/Pandora_simulator.app'),
        "launcher_ios_simulator_app_arm64_file": path.join(cfg_hv_plugin_launcher_x_vapor_ios_simulator_arm64_dir, 'base/Pandora_simulator.app')
    }
}

// console.log("-----------------------------------");
// console.error(JSON.stringify(CFG_project_app_runtime_mapping_data, null, 4));

module.exports = {
    i18n,
    cfg_hv_plugin_launcher_dir,
    cfg_hv_plugin_launcher_tools_dir,
    
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

    UNI_TEST_NODE_LIB_ROOT_DIR,
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
