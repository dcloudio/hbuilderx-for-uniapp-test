/**
 * @description 显示手机设备选择窗口
 */

const hx = require('hbuilderx');
const os = require('os');
const fs = require('fs');
const path = require('path');

const vueFile = path.join(path.resolve(__dirname, '..'), 'static', 'vue.min.js');
const bootstrapCssFile = path.join(path.resolve(__dirname, '..'), 'static', 'bootstrap.min.css');
const customCssFile = path.join(path.resolve(__dirname, '..'), 'static', 'custom.css');
const nosvg = path.join(path.resolve(__dirname, '..'), 'static', 'no.svg');

const osName = os.platform();

/**
 * @description 获取当前电脑连接的手机设备
 * @description {Sting} testPlatform [ios|android|all]
 * @returns {Object} 手机列表 {"ios": [], "android": []}
 */
let PLATFORM_ANDROID = 0x00000001;
let PLATFORM_ANDROID_SIMULATOR = 0x00000002;
let PLATFORM_IOS = 0x00000004;
let PLATFORM_IOS_SIMULATOR = 0x00000008;
let PLATFORM_ALL = 0x00000010;
async function getPhoneDevicesList(testPlatform) {
    let deviceType = PLATFORM_ALL;
    if (testPlatform == 'ios') {
        deviceType = PLATFORM_IOS_SIMULATOR;
    };
    if (testPlatform == 'android') {
        deviceType = PLATFORM_ANDROID | PLATFORM_ANDROID_SIMULATOR;
    };
    if (testPlatform == 'all') {
        deviceType = osName == 'darwin' ? PLATFORM_ANDROID | PLATFORM_ANDROID_SIMULATOR | PLATFORM_IOS_SIMULATOR : PLATFORM_ANDROID | PLATFORM_ANDROID_SIMULATOR;
    };
    let platform = {
        "platform": deviceType
    };

    let data = await hx.app.getMobileList(platform).then(data => {
        return data;
    });
    // console.error(JSON.stringify(data));
    try{
        let {ios_simulator} = data;
        if (ios_simulator != undefined && ios_simulator.length) {
            let tmp = ios_simulator.filter( n => {
                return !(n.name).includes('Apple Watch') && !(n.name).includes('iPad') && !(n.name).includes('Apple TV') && !(n.name).includes('iPod touch');
            });
            data['ios_simulator'] = tmp.reverse();
        };
        return data;
    }catch(e){
        return data;
    }
};


/**
 * @description 在webviewdialog内选择要测试的设备
 *  - 如果当前连接的设备只有一个，则不弹出测试设备选择窗口，直接运行。
 * @description {Sting} testPlatform [ios|android|all]
 * @return {Array} 手机设备列表，必须是数组，数组元素格式：['android:uuid', 'ios:uuid']
 */
async function ui_webview(testPlatform) {
    let phoneList = await getPhoneDevicesList(testPlatform)

    if ((testPlatform == 'android') || (osName != 'darwin' && testPlatform == 'all')) {
        let {android, android_simulator} = phoneList;
        let allAndroid = [...android, ...android_simulator];
        if (allAndroid.length == 1) {
            let one = 'android:' + allAndroid[0]['name'];
            return [one];
        };
    };
    let selected = await showSetView(testPlatform, phoneList).catch( error => { return error; });
    return selected;
};


/**
 * @description 设置视图
 */
function showSetView(testPlatform, phoneList) {
    let description = "选择要测试的手机设备或模拟器";
    description = osName == 'darwin' ? description + '，ios自动化测试仅支持iOS模拟器。' : description + '，Windows不支持ios自动化测试。';
    description = description + '<a href="https://hx.dcloud.net.cn/Tutorial/App/installSimulator">如何安装?</a>'
    return new Promise(function(resolve, reject) {
        // 创建webviewDialog, 并设置对话框基本属性，包括标题、按钮等
        let webviewDialog = hx.window.createWebViewDialog({
            modal: true,
            title: "选择自动化测试运行设备",
            dialogButtons: ["确定", "刷新" ,"关闭"],
            description: description,
            size: { width: 730, height: 560 }
        }, {
            enableScripts: true
        });

        // 用于渲染对话框主要内容
        let webview = webviewDialog.webView;
        webview.html = Html(testPlatform, phoneList);
        var data = [];
        webview.onDidReceiveMessage((msg) => {
            let action = msg.command;

            switch (action) {
                case 'closed':
                    webviewDialog.close();
                    reject("noSelected");
                    break;
                case 'refresh':
                    refresh(webviewDialog, webview, testPlatform);
                    break;
                case 'submit':
                    // 设置对话框指定按钮状态
                    webviewDialog.setButtonStatus("确定", ["loading", "disable"]);
                    webviewDialog.close();
                    data = msg.data;
                    resolve(data);
                    break;
                default:
                    reject("noSelected");
                    break;
            };
        });
        // 显示对话框，返回显示成功或者失败的信息，主要包含内置浏览器相关状态。
        let promi = webviewDialog.show();
        promi.then(function (data) {});
    });
};


/**
 * @description 刷新手机
 * @param {Object} phoneList
 */
async function refresh(webviewDialog, webview, testPlatform) {
    webviewDialog.setButtonStatus("刷新", ["loading", "disable"]);

    let phoneList = await getPhoneDevicesList(testPlatform);

    webviewDialog.setButtonStatus("刷新", []);
    webview.postMessage({
        "command": "refresh",
        "data": phoneList
    });
};

/**
 * @description 生成html
 */
function Html(userSelectedTestPlatform, phoneList) {
    // let phone_platform = Object.keys(phoneList);
    // console.error("....", userSelectedTestPlatform)
    phoneList = JSON.stringify(phoneList);
    let h5PlatList = [{"name":"firefox", "value":"h5-firefox"},{"name":"chrome", "value":"h5-chrome"}];
    if (osName == 'darwin') {
        h5PlatList.push({"name":"safari", "value":"h5-safari"})
    };
    let h5List = JSON.stringify(h5PlatList);;
    let mpList = JSON.stringify([{"name":"微信小程序","value":"mp-weixin"}]);

    return `
    <!DOCTYPE html>
    <html lang="en">
        <head>
            <meta charset="UTF-8">
            <link rel="stylesheet" href="${bootstrapCssFile}">
            <link rel="stylesheet" href="${customCssFile}">
            <script src="${vueFile}"></script>
        </head>
        <body>
            <div id="app" v-cloak>
                <div class="container-fluid">
                    <div class="row">
                        <div class="col px-0">
                            <p>当前已选择 <span style="color: #3aad4f;"> {{ selectedDevicesList.length }}  </span> 台测试设备</p>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-4 area-left">
                            <ul class="pl-0 mt-3 platform_list">
                                <li
                                    :class="{ liActive : currentPlatform == item }"
                                    v-for="(item,idx) in testPlatforms"
                                    :key="idx"
                                    :title="setTestPlatformTitle(item)"
                                    @click="getMappedList(item);">
                                    {{ item == 'mp' ? '小程序' : item }}
                                </li>
                            </ul>
                        </div>
                        <div class="col-8 area-right">
                            <div v-if="PlatformForPhoneList.length && !['h5','mp'].includes(currentPlatform)">
                                <ul class="pl-0 mt-3 device_list">
                                    <li v-for="(item2,idx2) in PlatformForPhoneList" :key="idx2" :title="item2.name + ' ' + item2.uuid">
                                        <input type="checkbox" class="mr-2"
                                            :id="item2.name"
                                            :name="currentPlatform"
                                            :value="currentPlatform + ':' + item2.uuid"
                                            v-model="selectedDevicesList"/>
                                        <label :for="item2.name" v-if="currentPlatform.includes('android')">{{ item2.name }} - {{ item2.version }}</label>
                                        <label :for="item2.name" v-else>{{ item2.name }}</label>
                                    </li>
                                </ul>
                            </div>
                            <div v-if="currentPlatform == 'h5'">
                                <ul class="pl-0 mt-3 device_list">
                                    <li v-for="(item3,idx3) in AllH5List" :key="idx3" :title="item3.name">
                                        <input type="checkbox" class="mr-2"
                                            :id="item3.name"
                                            :name="currentPlatform"
                                            :value="currentPlatform + ':' + item3.value"
                                            v-model="selectedDevicesList"/>
                                        <label :for="item3.name">{{ item3.name }}</label>
                                    </li>
                                </ul>
                            </div>
                            <div v-if="currentPlatform == 'mp'">
                                <ul class="pl-0 mt-3 device_list">
                                    <li v-for="(item4,idx4) in AllMpList" :key="idx4" :title="item4.name">
                                        <input type="checkbox" class="mr-2"
                                            :id="item4.name"
                                            :name="currentPlatform"
                                            :value="currentPlatform + ':' + item4.value"
                                            v-model="selectedDevicesList"/>
                                        <label :for="item4.name">{{ item4.name }}</label>
                                    </li>
                                </ul>
                            </div>
                            <div class="no-device" v-if="PlatformForPhoneList.length == 0 && !['h5','mp'].includes(currentPlatform)">
                                <img src="${nosvg}" />
                                <p style="color: #626675; margin-top: 3rem;">没有检测到相关设备，请点击刷新或检查手机连接</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <script>
                Vue.directive('focus', {
                    inserted: function(el) {
                        el.focus()
                    }
                });
                var app = new Vue({
                    el: '#app',
                    data: {
                        AllPhoneList: {},
                        AllH5List: [],
                        AllMpList: [],
                        testPlatforms: ['h5', 'mp'],
                        currentPlatform: '',
                        PlatformForPhoneList: [],
                        selectedDevicesList: [],

                    },
                    computed: {
                        setTestPlatformTitle() {
                            return (item) => {
                                let title = "";
                                if (item == "android") return 'android真机';
                                if (item == "android_simulator") return 'android模拟器';
                                if (item == "ios_simulator") return 'ios模拟器';
                            };
                        }
                    },
                    created() {
                        let userSelectedTestPlatform = "${userSelectedTestPlatform}";
                        this.AllPhoneList = ${phoneList};
                        this.AllH5List = ${h5List};
                        this.AllMpList = ${mpList};

                        let phone_platform = Object.keys(this.AllPhoneList);
                        console.log(phone_platform)
                        if (userSelectedTestPlatform == "all") {
                            this.testPlatforms = [...this.testPlatforms, ...phone_platform];
                        } else {
                            this.testPlatforms = [...phone_platform];
                        };

                        this.currentPlatform = this.testPlatforms[0];
                        if (this.currentPlatform != "h5" && this.currentPlatform != "mp") {
                            this.PlatformForPhoneList = this.AllPhoneList[this.currentPlatform];
                        };
                    },
                    mounted() {
                        this.$nextTick(() => {
                            window.addEventListener('hbuilderxReady', () => {
                                this.btnClick();
                                this.getRefreshResult();
                            })
                        });
                    },
                    methods: {
                        getMappedList(i) {
                            this.currentPlatform = i;
                            this.PlatformForPhoneList = [];
                            if (i != "h5" && i != "mp") {
                                this.PlatformForPhoneList = this.AllPhoneList[i];
                            };
                        },
                        getRefreshResult() {
                            hbuilderx.onDidReceiveMessage((msg) => {
                                if (msg.command == 'refresh') {
                                    this.AllPhoneList = msg.data;
                                    this.getMappedList(this.currentPlatform);
                                };
                            });
                        },
                        handlePhoneList() {
                            let selected = this.selectedDevicesList;
                            if (Array.isArray(selected) && selected.length) {
                                selected = selected.map((item) => {
                                    let tmp = item.split(':');
                                    let t1 = tmp[1];
                                    let t0 = tmp[0];
                                    if (t0 == 'ios_simulator') {
                                        return 'ios:'+t1;
                                    } else if (t0 == 'android_simulator') {
                                        return 'android:'+t1;
                                    } else {
                                        return item;
                                    };
                                });
                            };
                            return selected;
                        },
                        btnClick() {
                            hbuilderx.onDidReceiveMessage((msg)=>{
                                if(msg.type == 'DialogButtonEvent'){
                                    let button = msg.button;
                                    if(button == '确定'){
                                        let phoneList = this.handlePhoneList();
                                        hbuilderx.postMessage({
                                            command: 'submit',
                                            data: phoneList
                                        });
                                    } else if(button == '关闭'){
                                        hbuilderx.postMessage({
                                            command: 'closed'
                                        });
                                    } else if (button == '刷新'){
                                        hbuilderx.postMessage({
                                            command: 'refresh'
                                        });
                                    }
                                };
                            });
                        }
                    }
                });
            </script>
        </body>
    </html>
    `
};

module.exports = ui_webview;
