<template>
    <q-scroll-view layout='vbox' id="scrollView">

        <!-- 复选框：小程序 -->
        <q-view layout='hbox' v-if="access == 'all'">
            <q-label text="小程序: " id="labelView"></q-label>
            <q-checkbox id="elCheckBox" text=" 微信小程序" :checked='mp_weixin' accessibleName="mp_weixin" @clicked="el_set" />
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

        <q-view layout='vbox' v-if="access == 'all' || access == 'ios'">
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
            <q-list-view id="QListView" :minimumHeight = "150">
                <q-list-item layout='hbox' v-for="item in filter_ios_simulator_list">
                    <q-checkbox id='elCBoxItem' :text="'  ' + item.name + '    ' + item.uuid"
                        :checked='selected_list["ios"].includes(item.uuid)'
                        accessibleName="ios"
                        :data-value="item.uuid"
                        @clicked="el_set"
                        v-show="item.uuid"
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
                        :checked='selected_list["android"].includes(item.uuid)'
                        accessibleName="android"
                        :data-value="item.uuid"
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
                    <q-checkbox id='elCBoxItem' :text="'  ' +  item.name + '    ' + item.uuid"
                        :checked='selected_list["harmony"].includes(item.uuid)'
                        accessibleName="harmony"
                        :data-value="item.uuid"
                        @clicked="el_set"
                    />
                </q-list-item>
            </q-list-view>
        </q-view>

        <!-- vertical-size-policy 垂直填充 -->
        <q-view vertical-size-policy="Expanding"></q-view>

    </q-scroll-view>
</template>

<script>
    let api_getMobileList = require("./api_getMobileList.js");

    export default {
        data() {
            return {
                access: 'all',
                mp_weixin: false,
                h5_chrome: false,
                h5_firefox: false,
                h5_safari: false,
                filter_ios_name: "",
                android_list: [],
                ios_simulator_list: [],
                harmony_list: [],
                selected_list: {
                    "harmony": [],
                    "android": [],
                    "ios": [],
                }
            }
        },

        computed: {
            filter_ios_simulator_list() {
                const word = this.filter_ios_name;
                if (word.trim() == "") return this.ios_simulator_list;
                let tmp = this.ios_simulator_list.filter(item=> item.name.includes(word) || item.uuid.includes(word));
                return tmp;
            }
        },

        created() {
            this.get_current_pc_device_list('all');
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

                const checkbox = ["mp_weixin", "h5_chrome", "h5_firefox", "h5_safari"];
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
                console.log(`${platform} ====`, result);
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
    }

    #elCheckBox::indicator::unchecked {
        image: url(:/hxui/resource/chbx.png);
    }

    #elCheckBox::indicator::checked {
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
