const hx = require('hbuilderx');
const os = require('os');

const osName = os.platform();
const api_getMobileList = require("./api_getMobileList.js");
const getAndroidDeivcesListFormCmd = require('./cmd_adb_devices.js');

/**
 * @description UI：设备选择窗口，组织测试设备数据
 */
async function getUIDataForDevices(isManualRefresh = false) {
    global_devicesList = await api_getMobileList('all');
    let {android, android_simulator, ios_simulator} = global_devicesList;
    if (android == undefined) {
        android = [];
    };
    if (android_simulator == undefined) {
        android_simulator = [];
    };
    if (ios_simulator == undefined) {
        ios_simulator = [];
    };

    // 某些情况下点击【刷新】无法获取到正确的设备，这个时候插件调用adb devices获取
    if (isManualRefresh) {
        let adbCmdAndroidList =  await getAndroidDeivcesListFormCmd();
        let sernoList = android.map(item => { return item.uuid });
        if (adbCmdAndroidList.length > 0) {
            for (let s of adbCmdAndroidList) {
                if (!sernoList.includes(s.uuid)) {
                    android.push(s)
                };
            };
        };
    };

    // 构造：android数据。目前先这样，后期可能会区分真机和模拟器
    let AndroidList = [];
    if (android.length != 0) {
        AndroidList = android.map(item => {
            return {
                "columns": [{"label": `Android ${item.version}`},{"label": item.uuid}]
            }
        })
    };
    if (android_simulator.length != 0) {
        let tmp = android_simulator.map(item => {
            return {
                "columns": [{"label": `Android ${item.version}`},{"label": item.uuid}]
            }
        });
        AndroidList = [...AndroidList, ...tmp];
    };
    // android设备去重
    AndroidList = [...new Set(AndroidList.map(JSON.stringify))].map(JSON.parse);

    // 构造：iOS数据
    let iOSList = []
    if (ios_simulator.length != 0) {
        iOSList = ios_simulator.map(item => {
            return {
                "columns": [{"label": item.name},{"label": item.uuid}]
            }
        })
    };

    return { "AndroidList": AndroidList, "iOSList": iOSList}
};

/**
 * @description UI: 窗口控件
 * @param {String} testPlatform 测试平台
 * @@param {isManualRefresh} isManualRefresh 是否点击了手动刷新
 */
async function getUIData(testPlatform, isManualRefresh = false) {
    // 重新获取手机列表
    let RawDevicesList = await getUIDataForDevices(isManualRefresh);
    let {AndroidList, iOSList, HarmonyList } = RawDevicesList;

    let height = testPlatform != "all" ? 410 : 660;
    if (osName != "darwin") {
        height = testPlatform != "all" ? 410 : 450;
    };

    let subtitle = "选择要测试的手机设备或模拟器";
    subtitle = osName == 'darwin' ? subtitle + '，ios自动化测试仅支持iOS模拟器。' : subtitle + '，Windows不支持ios自动化测试。';
    subtitle = subtitle + '<a href="https://hx.dcloud.net.cn/Tutorial/App/installSimulator">如何安装?</a>'

    // 构造：h5数据
    let h5List = [
        {type: 'label',name: 'H5',text: "浏览器：",canSelect: true},
        {type: 'checkBox',name: 'h5-chrome',text: " Chrome  ",checked: false},
        {type: 'checkBox',name: 'h5-firefox',text: " Firefox  ",checked: false}
    ];
    if (os.platform() == "darwin") {
        h5List.push({type: 'checkBox',name: 'h5-safari',text: " Safari",checked: false})
    };

    // 构造：微信小程序数据
    let wxList = [
        {type: 'label', name: 'mp',text: "小程序：",canSelect: true},
        {type: 'checkBox',name: 'mp-weixin',text: " 微信小程序",checked: false},
    ];

    // 测试设备选择窗口，ui数据
    let formItems = []

    if (testPlatform == "all") {
        let ui_basic = [
            {type: 'widgetGroup',name: 'test-mp',widgets: wxList},
            {type: 'widgetGroup',name: 'test-h5',widgets: h5List}
        ];
        formItems = ui_basic;
    };

    if (osName == "darwin" && (testPlatform == "all" || testPlatform == "ios")) {
        let ui_ios = {
            "type": "list",
            "title": "选择iOS测试设备",
            "name": "list-ios",
            "columnStretches": [1, 2],
            "items": iOSList,
            "value": [],
            "multiSelection": true,
            // "searchable": true,
            // "searchColumns":[1, 2],
        };
        formItems.push(ui_ios);
    };

    if (testPlatform == "all" || testPlatform == "android") {
        let ui_iandroid = {
            "type": "list",
            "title": "选择Android测试设备",
            "name": "list-android",
            "columnStretches": [1, 2],
            "items": AndroidList,
            "value": [],
            "multiSelection": true,
            // "refreshable": true
        };
        if (AndroidList.length == 1 && testPlatform == "android") {
            ui_iandroid["value"] = [0];
        };
        formItems.push(ui_iandroid);
    };

    let refreshBtn = {
        type: 'widgetGroup',
        name: 'refreshWidget',
        widgets: [
            {type: 'button',name: 'refreshButton', text: '刷新手机设备',size: 'small'}
        ]
    };
    formItems.push(refreshBtn);

    if (testPlatform == "all" || testPlatform == "ios" || testPlatform == "android") {
        let prompt = {
            type: 'label',name: 'prompt',text: "备注：如果Android设备没有显示，请先确保HBuilderX可以检测到Android设备。或关闭窗口重新打开。"
        };
        formItems.push(prompt);
    };
    return {
        title: "uni-app 自动化测试设备选择",
        subtitle: subtitle,
        width: 600,
        height: height,
        submitButtonText: "提交(&S)",
        cancelButtonText: "取消(&C)",
        footer: '<a href="https://uniapp.dcloud.net.cn/worktile/auto/hbuilderx-extension/">自动化测试教程</a>',
        formItems: formItems
    };
};

/**
 * @description 校验设备选择窗口的输入，当testPlatform == all时，必须选择一个
 * @param {Object} testPlatform
 * @param {Object} formData
 * @param {Object} that
 */
function validateInput(testPlatform, formData, that) {
    if (testPlatform == "ios") {
        if (formData["list-ios"] == -1 || JSON.stringify(formData["list-ios"]) == '[]') {
            that.showError("请选择要测试的iOS模拟器");
            return false;
        };
    };
    if (testPlatform == "android") {
        if (formData["list-android"] == -1 || JSON.stringify(formData["list-android"]) == '[]') {
            that.showError("请选择要测试的Android设备");
            return false;
        };
    };
    if (testPlatform == "all") {
        if (formData["list-android"] != -1 && JSON.stringify(formData["list-android"]) != '[]') {
            return true;
        };
        if (formData["list-ios"] != -1 && JSON.stringify(formData["list-ios"]) != '[]') {
            return true;
        };
        if (formData["test-h5"]["changedWidget"] != null) {
            return true;
        };
        if (formData["test-mp"]["changedWidget"] != null) {
            return true;
        };
        that.showError("请选择一个要测试的设备");
        return false;
    };
    return true;
};


/**
 * @description showFormDialog
 * @return {Array} ["ios:A8790C48-4986-4303-B235-D8AFA95402D4","android:712KPQJ1103860","mp:mp-weixin","h5:h5-chrome","h5:h5-firefox","h5:h5-safari"]
 */
async function ui_formDialog(testPlatform) {
    // 获取默认UI数据
    var uidata = await getUIData(testPlatform)

    let result = await hx.window.showFormDialog({
        ...uidata,
        validate: function(formData) {
            let result = validateInput(testPlatform, formData, this);
            return result;
        },
        onChanged: async function(field, value) {
            if (field == "refreshWidget") {
                let updateData = await getUIData(testPlatform, true);
                this.updateForm(updateData);
            };
        }
    }).then((res) => {
        return res;
    }).catch( error => {
        if (error == undefined || error == '-1') {
            return "noSelected";
        };
        return 'error';
    });

    // 未选择设备：返回noSelected
    if (result == "noSelected") {
        return "noSelected";
    };
    if (result == "error") {
        return "error";
    };

    // 数据格式：
    // [
    //     "ios:A8790C48-4986-4303-B235-D8AFA95402D4",
    //     "android:712KPQJ1103860",
    //     "mp:mp-weixin",
    //     "h5:h5-chrome","h5:h5-firefox","h5:h5-safari"
    // ]
    let selectedList = [];

    if (result.hasOwnProperty("list-ios")) {
        let iOSList = result["list-ios"];
        if (iOSList.length != 0) {
            for (let s of iOSList) {
                let uuid = global_devicesList["ios_simulator"][s]["uuid"];
                selectedList.push(`ios:${uuid}`);
            };
        };
    };
    if (result.hasOwnProperty("list-android")) {
        let androidList = result["list-android"];
        if (androidList.length != 0) {
            for (let s of androidList) {
                let uuid = global_devicesList["android"][s]["uuid"];
                selectedList.push(`android:${uuid}`);
            };
        };
    };
    if (result.hasOwnProperty("test-mp")) {
        let mpList = result["test-mp"];
        for (let s of mpList["allWidget"]) {
            if (s["type"] == "checkBox") {
                if (s["checked"] && s["name"] == "mp-weixin") {
                    selectedList.push(`mp:mp-weixin`);
                };
            };
        };
    };
    if (result.hasOwnProperty("test-h5")) {
        let h5List = result["test-h5"];
        for (let s of h5List["allWidget"]) {
            if (s["type"] == "checkBox") {
                if (s["checked"]) {
                    selectedList.push(`h5:${s.name}`);
                };
            };
        };
    };
    return selectedList;
};


module.exports = ui_formDialog;
