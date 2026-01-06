<template>
    <q-scroll-view layout='vbox' id="scrollView">

        <!-- 复选框：小程序 -->
        <q-view layout='hbox' v-if="access == 'all'">
            <q-label text="小程序: " id="labelView"></q-label>
            <q-checkbox id="elCheckBox" text=" 微信小程序" :checked='mp_weixin' accessibleName="mp_weixin" @clicked="el_set" />
            <q-checkbox id="elCheckBox" text=" 支付宝小程序" :checked='mp_alipay' accessibleName="mp_alipay" @clicked="el_set" />
            <q-view horizontal-size-policy="Expanding"></q-view>
        </q-view>

        <!-- 复选框：h5 -->
        <q-view layout='hbox' v-if="access == 'all'">
            <q-label text="浏览器: " id="labelView"></q-label>
            <q-checkbox id="elCheckBox" text=" Chrome" :checked='h5_chrome' accessibleName="h5_chrome" @clicked="el_set" />
            <q-checkbox id="elCheckBox" text=" Firefox" :checked='h5_firefox' accessibleName="h5_firefox" @clicked="el_set" />
            <q-checkbox id="elCheckBox" text=" Safari" :checked='h5_safari' accessibleName="h5_safari" @clicked="el_set" />
            <q-view horizontal-size-policy="Expanding"></q-view>
        </q-view>

        <q-view layout='vbox' v-if="(access == 'all' || access == 'ios') && osName == 'darwin'">
            <q-view layout='hbox'>
                <q-label text="iOS模拟器"></q-label>
                <q-label id="remark" :text="' 已选'+ selected_list['ios'].length +'个 '"></q-label>
                <q-view layout='hbox' layout-spacing="0">
                    <q-button id="searchIcon" text=""></q-button>>
                    <q-input :text='filter_ios_name' @textChanged="el_set"
                        id="elInput"
                        accessibleName="filter_ios_name"
                        placeholderText="输入关键字, 过滤ios设备......"
                    ></q-input>
                </q-view>
                <!-- <q-view horizontal-size-policy='Expanding'></q-view> -->
                <q-button id="refreshBtn" text="刷新设备" @clicked="refresh_device('ios')"></q-button>
            </q-view>
            <q-list-view id="QListView" :minimumHeight = "140">
                <q-list-item layout='hbox' v-for="item in filter_ios_simulator_list">
                    <q-checkbox id='elCBoxItem' :text="'  ' + item.name + '    ' + item.udid"
                        :checked='selected_list["ios"].includes(item.udid)'
                        accessibleName="ios"
                        :data-value="item.udid"
                        @clicked="el_set"
                        v-show="item.udid"
                    />
                </q-list-item>
            </q-list-view>
        </q-view>

        <q-view layout='vbox' v-if="access == 'all' || access == 'android'">
            <q-view layout='hbox'>
                <q-label text="Android测试设备 "></q-label>
                <q-label id="remark" :text="' 已选'+ selected_list['android'].length +'个 '"></q-label>
                <q-view horizontal-size-policy='Expanding'></q-view>
                <q-button id="refreshBtn" text="刷新设备" @clicked="refresh_device('android')"></q-button>
            </q-view>
            <q-list-view id="QListView" :minimumHeight = "50">
                <q-list-item layout='hbox' v-for="item in android_list">
                    <q-checkbox id='elCBoxItem' :text="'  ' +  item.name + ' ( Android ' + item.version + ' )'"
                        :checked='selected_list["android"].includes(item.udid)'
                        accessibleName="android"
                        :data-value="item.udid"
                        @clicked="el_set"
                    />
                </q-list-item>
            </q-list-view>
        </q-view>

        <q-view layout='vbox' v-if="access == 'all' || access == 'harmony'">
            <q-view layout='hbox'>
                <q-label text="Harmony测试设备"></q-label>
                <q-label id="remark" :text="' 已选'+ selected_list['harmony'].length +'个 '"></q-label>
                <q-view horizontal-size-policy='Expanding'></q-view>
                <q-button id="refreshBtn" text="刷新设备" @clicked="refresh_device('harmony')"></q-button>
            </q-view>
            <q-list-view id="QListView" :minimumHeight = "50" >
                <q-list-item layout='hbox' v-for="item in harmony_list">
                    <q-checkbox id='elCBoxItem' :text="'  ' +  item.name + '    ' + item.udid"
                        :checked='selected_list["harmony"].includes(item.udid)'
                        accessibleName="harmony"
                        :data-value="item.udid"
                        @clicked="el_set"
                    />
                </q-list-item>
            </q-list-view>
        </q-view>

        <!-- 配置项 -->
        <q-view layout='hbox' style="padding-top: 5px;">
            <q-checkbox id="elCheckBox2"
                text=" 是否输出 Debug 调试日志"
                :checked='cfg_isDebug'
                accessibleName="cfg_isDebug"
                @clicked="el_set" />
            <q-view horizontal-size-policy="Expanding"></q-view>
        </q-view>

        <!-- 配置项 -->
        <q-view layout='hbox'>
            <q-checkbox id="elCheckBox2"
                text=" 自动修改 jest.config.js 文件中的 testMatch"
                :checked='cfg_AutomaticModificationTestMatch'
                accessibleName="cfg_AutomaticModificationTestMatch"
                @clicked="el_set" />
            <q-view horizontal-size-policy="Expanding"></q-view>
        </q-view>

        <!-- vertical-size-policy 垂直填充 -->
        <q-view vertical-size-policy="Expanding"></q-view>

    </q-scroll-view>
</template>

<script>
    let api_getMobileList = require("./api_getMobileList.js");
    let hx = require("hbuilderx");
    
    export default {
        data() {
            return {
                osName: "",
                access: 'all',
                mp_weixin: false,
                mp_alipay: false,
                h5_chrome: false,
                h5_firefox: false,
                h5_safari: false,
                filter_ios_name: "",
                android_list: [],
                ios_simulator_list: [],
                // harmony_list: [{"udid": "FMRGK24826000345", "name": "huawei"}],
                harmony_list: [],
                selected_list: {
                    "harmony": [],
                    "android": [],
                    "ios": [],
                },
                // 配置项
                cfg_isDebug: true,
                cfg_AutomaticModificationTestMatch: true
            }
        },

        computed: {
            filter_ios_simulator_list() {
                const word = this.filter_ios_name;
                if (word.trim() == "") return this.ios_simulator_list;
                let tmp = this.ios_simulator_list.filter(item=> item.name.includes(word) || item.udid.includes(word));
                return tmp;
            }
        },

        created() {
            this.get_current_pc_device_list(this.access);
        },

        methods: {
            async get_current_pc_device_list(platform='all') {
                let result = await api_getMobileList(platform);
                try {
                    this.ios_simulator_list = result.ios_simulator ? result?.ios_simulator : [];
                    this.android_list = result.android ? result.android : [];
                    if (result.harmony) {
                        this.harmony_list = result.harmony;
                    };
                } catch (error) {};
                this.updateUi();
                await this.set_default_device();
            },

            // 2025-12-16 当只有一个设备时，自动选中
            async set_default_device() {
                try {
                    if (this.access == "android" && this.android_list.length == 1) {
                        this.selected_list['android'] = [this.android_list[0].udid];
                        this.updateUi();
                    };
                    if (this.access == "ios" && this.ios_simulator_list.length == 1) {
                        this.selected_list['ios'] = [this.ios_simulator_list[0].udid];
                        this.updateUi();
                    };
                    if (this.access == "harmony" && this.harmony_list.length == 1) {
                        this.selected_list['harmony'] = [this.harmony_list[0].udid];
                        this.updateUi();
                    };
                } catch (error) {
                    console.error("设置默认设备失败", error);
                };
            },

            removeElementUsingFilter(arr, value) {
                return arr.filter(function(element) {
                    return element !== value;
                });
            },

            el_set(e) {
                // console.log(e);
                const accessibleName = e.target.accessibleName;
                const data_value = e.target["data-value"];
                const checked = e.target.checked;

                // 测试配置型选项
                const cfg_checkbox = ["cfg_isDebug", "cfg_AutomaticModificationTestMatch"];
                if (cfg_checkbox.includes(accessibleName)) {
                    this[accessibleName] = e.target.checked;
                    this.update_test_settings(accessibleName, e.target.checked);
                };

                const checkbox = ["mp_weixin", "mp_alipay", "h5_chrome", "h5_firefox", "h5_safari"];
                if (checkbox.includes(accessibleName)) {
                    this[accessibleName] = e.target.checked;
                };

                if (["android", "ios", "harmony"].includes(accessibleName)) {
                    let tmp = [...this.selected_list[accessibleName]];
                    if (tmp.includes(data_value) && checked == false) {
                        tmp = this.removeElementUsingFilter(tmp, data_value);
                    };
                    if (!tmp.includes(data_value) && checked) {
                        tmp.push(data_value);
                    };
                    this.selected_list[accessibleName] = tmp;
                };
                if (accessibleName == "filter_ios_name") {
                    this.filter_ios_name = e.target.text;
                };
                this.updateUi();
            },

            async refresh_device(platform='all') {
                // console.log("--", platform);
                let result = await api_getMobileList(platform, "Y");
                // console.log(`${platform} ====`, result);
                try {
                    if (platform == "all" || platform == "ios") {
                        this.ios_simulator_list = result.ios_simulator ? result?.ios_simulator : [];
                    };
                    if (platform == "all" || platform == "android") {
                        this.android_list = result.android ? result.android : [];
                    };
                    if (platform == "all" || platform == "harmony") {
                        this.harmony_list = result.harmony ? result.harmony : [];
                    };
                } catch (error) {};
                this.updateUi();
                await this.set_default_device();
            },

            // 更新测试配置项
            async update_test_settings(setting_name, value) {
                let config_name = "";
                if (setting_name == "cfg_isDebug") {
                    config_name = "hbuilderx-for-uniapp-test.isDebug";
                } else if (setting_name == "cfg_AutomaticModificationTestMatch") {
                    config_name = "hbuilderx-for-uniapp-test.AutomaticModificationTestMatch";
                };
                console.error(`[UI窗口] 更新配置项 ${config_name} 为 ${value}`);
                if (config_name == "") return;

                let config = await hx.workspace.getConfiguration();
                config.update(config_name, value).then( () => {
                    hx.window.setStatusBarMessage(`[UI窗口] 更新配置项 ${config_name} 成功`, 'info', 10000);
                }).catch( (err) => {
                    console.error(`[UI窗口] 更新配置项 ${config_name} 失败`, err);
                    hx.window.showErrorMessage(`更新配置项 ${config_name} 失败: ${err.message}`);
                });
            }
        },
    }
</script>

<style>
    * {
        background: transparent;
    }

    #scrollView {
        width: 100%;
        justify-content: start;
        border: none;
    }

    #labelView {
        min-width: 50px;
        text-align: right;
    }
    #remark {
        color: rgb(64, 94, 66);
        font-size: 12px;
    }

    #refreshBtn {
        /* padding: 5px 10px; */
        /* padding-bottom: 3px; */
        font-size: 12px;
        color: rgb(84, 174, 108);
        border-radius: 5px;
        width: 50px;
        margin-right: 5px;
    }

    #refreshBtn:pressed {
        color: #43C45B;
        border: 1px solid #43C45B;
        transform: scale(0.95);
    }

    #elCBoxItem {
        font-size: 12px;
    }

    #elCBoxItem::indicator::unchecked {
        image: url(:/hxui/resource/chbx.png);
    }

    #elCBoxItem::indicator::checked {
        image: url(:/hxui/resource/chbx-checked.png);
    }

    #elCheckBox {
        min-width: 90px;
        font-size: 12px;
    }

    #elCheckBox::indicator::unchecked {
        image: url(:/hxui/resource/chbx.png);
    }

    #elCheckBox::indicator::checked {
        image: url(:/hxui/resource/chbx-checked.png);
    }

    #elCheckBox2 {
        min-width: 90px;
        font-size: 12px;
        color: rgb(64, 94, 66);
    }

    #elCheckBox2::indicator::unchecked {
        image: url(:/hxui/resource/chbx.png);
    }

    #elCheckBox2::indicator::checked {
        image: url(:/hxui/resource/chbx-checked.png);
    }

    #QListView {
        background: rgb(247, 246, 242);
        border: 1px solid #e5e5e5;
        border-radius: 3px;
        height: 120px;
        padding: 10px 5px;
        margin: 0 5px;
    }

    #QListView::item {
        padding: 5px;
    }

    #QListView::item:selected,
    #list::item:hover {
        background-color: transparent;
    }

    #searchIcon {
        min-width: 11px;
        max-width: 11px;
        padding-top: 2px;
        margin-right: 5px;
        /* height: 12px; */
        image: url(":/projectwizard/resource/search@2x.png");
        /* image: url("/Users/hx/DCloud/hbuilderx-for-uniapp-test/src/static/search.png") */
        /* image: url("../static/search.png") */
    }
    #elInput {
        border: none;
        /* height: 30px; */
        /* border-bottom: 1px solid #d6d6d6; */
        outline: none;
        font-size: 12px;
        padding-top: 5px;
    }

    #elInput:focus {
        background: transparent;
        color: #0D9E4D;
        /* border-color: #43c45b; */
    }
</style>
