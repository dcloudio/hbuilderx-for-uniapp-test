const hx = require("hbuilderx");
const path = require('path');
const os = require('os');

const osName = os.platform();

const { getPluginConfig } = require('../core/core.js');

async function ui_vue(testPlatform) {
    // hx.vue.defineComponent('uniTest', path.resolve(__dirname, "./ui_vue.vue"), false);
    hx.vue.defineComponent('uniTest', path.resolve(__dirname, "./ui_vue.vue"));

    let window_height = 750;
    if (osName == "win32") {
        window_height = testPlatform == "all" ? 550 : 450;
    } else {
        window_height = testPlatform == "all" ? 750 : 450;
    };

    let subtitle = "选择要测试的手机设备或模拟器";
    subtitle = osName == 'darwin' ? subtitle + '，ios自动化测试仅支持iOS模拟器。' : subtitle + '，Windows不支持ios自动化测试。';
    subtitle = subtitle + '<a href="https://uniapp.dcloud.net.cn/tutorial/run/installSimulator.html">如何安装?</a>'

    const footer1 = "<a href=\"https://uniapp.dcloud.net.cn/worktile/auto/hbuilderx-extension\">插件教程</a>";
    const footer2 = "<a href=\"https://uniapp.dcloud.net.cn/worktile/auto/hbuilderx-cli-uniapp-test.html\">使用CLI测试</a>";
    const footer3 = "<a href=\"hbuilderx://requestExtension/hbuilderx-for-uniapp-test/command?id=unitest.moreSettings\">更多插件配置</a>";
    // hx.workspace.gotoConfiguration('hbuilderx-for-uniapp-test.target')
    // hxcommand://hbuilderx-for-uniapp-test
    let footer_text = footer1 + "&nbsp; &nbsp;" + footer2 + "&nbsp; &nbsp;" + footer3;

    // 读取配置项
    let cfg_isDebug = true;
    let cfg_AutomaticModificationTestMatch = true;

    let is_debug = await getPluginConfig("hbuilderx-for-uniapp-test.isDebug");
    if (typeof is_debug === 'boolean') {
        cfg_isDebug = is_debug;
    };
    let is_modify_testMath = await getPluginConfig("hbuilderx-for-uniapp-test.AutomaticModificationTestMatch");
    if (typeof is_modify_testMath === 'boolean') {
        cfg_AutomaticModificationTestMatch = is_modify_testMath;
    };

    let result = await hx.window.showFormDialog({
        title: "uni-app 自动化测试设备选择",
        subtitle: subtitle,
        submitButtonText: "确定(&S)",
        cancelButtonText: "取消(&C)",
        footer: footer_text,
        width: 600,
        height: window_height,
        showModal: false,
        validate: async function(formData) {
            this.showError("");
            let data = formData.uniTest;
            // console.log(formData);
            const that = this;
            return validate_value(data, that);
        },
        onChanged: function (field, value, formData) {
            // console.log("调用changed函数", value);
        },
        formItems: [{
            "type": "vue:uniTest",
            "name": "uniTest",
            "value": {
                "osName": osName,
                "access": testPlatform,
                cfg_isDebug,
                cfg_AutomaticModificationTestMatch
            },
            event: {
                showMsg(msg) {
                    hx.window.showInformationMessage(msg);
                }
            }
        }]
    }).then((res)=> {
        let last_data = JSON.parse(JSON.stringify(res.uniTest));
        delete last_data.android_list;
        delete last_data.ios_simulator_list;
        delete last_data.harmony_list;
        return last_data;
    }).catch( error => {
        if (error == "-1") return "-1";
        if (error == undefined) {
            return "noSelected";
        };
        return 'error';
    });
    // console.error("--------->", result);

    // 未选择设备：返回noSelected
    if (result == "noSelected" || result == "-1") {
        return "noSelected";
    };
    if (result == "error") {
        return "error";
    };
    // console.log("-->", result, result["selected_list"]);

    let uiSettings = {};
    let selectedList = [];
    let windows_selected_harmony_list = result["selected_list"]["harmony"];
    let windows_selected_android_list = result["selected_list"]["android"];
    let windows_selected_ios_list = result["selected_list"]["ios"];

    if (windows_selected_ios_list.length > 0) {
        for (let s of windows_selected_ios_list) {
            selectedList.push(`ios:${s}`);
        };
    };
    if (windows_selected_android_list.length > 0) {
        for (let s of windows_selected_android_list) {
            selectedList.push(`android:${s}`);
        };
    };
    if (windows_selected_harmony_list.length > 0) {
        for (let s of windows_selected_harmony_list) {
            selectedList.push(`harmony:${s}`);
        };
    };
    if (result["mp_weixin"]) {
        selectedList.push(`mp:mp-weixin`);
    };
    if (result["h5_chrome"]) {
        selectedList.push(`h5:h5-chrome`);
    };
    if (result["h5_firefox"]) {
        selectedList.push(`h5:h5-firefox`);
    };
    if (result["h5_safari"]) {
        selectedList.push(`h5:h5-safari`);
    };

    const _cfg_keys = ['cfg_isDebug', 'cfg_AutomaticModificationTestMatch'];
    _cfg_keys.forEach(key => {
      if (Object.hasOwn(result, key)) {
        uiSettings[key] = result[key];
      }
    });
    // console.error("[selectedList] ->", selectedList);
    // return [], uiSettings;

    return [selectedList, uiSettings];
};

/**
 * @description 校验vue窗口填写的数据
 * @param {Object} data
 * @param {Object} that
 */
function validate_value(data, that) {
   let { access, mp_weixin, h5_chrome, h5_firefox, h5_safari, selected_list } = data;
   let harmony_list = selected_list["harmony"].length;
   let ios_list = selected_list["ios"].length;
   let android_list = selected_list["android"].length;
   // console.log("===========", access, mp_weixin, h5_chrome, h5_firefox, h5_safari, selected_list);

   if (access == 'all' && !mp_weixin && !h5_chrome && !h5_firefox && !h5_safari && harmony_list == 0 && ios_list == 0 && android_list == 0) {
       that.showError("请至少选择一个测试设备");
       return;
   };
   if (access == "android" && android_list == 0) {
       that.showError("请至少选择一个Android测试设备");
       return;
   };
   if (access == "ios" && ios_list == 0) {
       that.showError("请至少选择一个iOS测试设备");
       return;
   };
   if (access == "harmony" && harmony_list == 0) {
       that.showError("请至少选择一个harmony测试设备");
       return;
   };
   return true;
};


module.exports = ui_vue;
