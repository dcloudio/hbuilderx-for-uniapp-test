const hx = require('hbuilderx');

const os = require('os');
const osName = os.platform();

const { version } = require('../package.json');

var isPopUpWindow = false;


function isJSON(str) {
    if (typeof str == 'string') {
        try {
            var obj = JSON.parse(str);
            if (typeof obj == 'object' && obj) {
                return true;
            } else {
                return false;
            };
        } catch (e) {
            return false;
        };
    };
};


/**
 * @description show box
 * @更新弹窗，点击【以后再说】，则本周内不再自动弹窗提示
 */
function showUpgradeBox(localVersion, marketPluginVersion) {
    if (marketPluginVersion == '' || marketPluginVersion == undefined ) {
        return;
    };
    let lastChar = marketPluginVersion.charAt(marketPluginVersion.length - 1);
    let versiondescription = `【hbuilderx-for-uniapp-test】发布 ${marketPluginVersion} 版本！`;
    let msg = versiondescription
        + `当前 ${localVersion} 版本。`
        + `<a href="https://ext.dcloud.net.cn/plugin?name=hbuilderx-for-uniapp-test">更新日志</a>`
        + '<br/><br/>注意：更新后，重启HBuilderX才能生效。';
    let btn = ['直接升级', '以后再说'];

    hx.window.showInformationMessage(msg, btn).then(result => {
        if (result === '直接升级') {
            installPlugin(marketPluginVersion);
        } else {
            let timestamp = Math.round(new Date() / 1000) + 604800;
            let config = hx.workspace.getConfiguration();
            config.update('hbuilderx-for-uniapp-test.updatePrompt', false).then( () => {
                config.update('hbuilderx-for-uniapp-test.updatePromptTime', `${timestamp}`);
            });
        };
    });
    isPopUpWindow = true;
};


/**
 * @description 安装插件
 * @param {version} String 插件版本
 */
function installPlugin(version) {
    return new Promise((resolve, reject) => {
        let info = {
            "id": "hbuilderx-for-uniapp-test",
            "name": "hbuilderx-for-uniapp-test",
            "version": version,
            "category_name": "HBuilderX",
            "category_code": "extension-for-hbuilderx",
            "category_id": 11,
            "platforms": []
        };
        let url = 'hbuilderx://ext/download?plugin=' + encodeURIComponent(JSON.stringify(info));
        hx.env.openExternal(url);
    });
};

/**
 * @description
 */
function noUpgrade(version) {
    let msg = `hbuilderx-for-uniapp-test: 当前版本为 ${version}，是最新版本。`;
    let btns = ['关闭']

    let config = hx.workspace.getConfiguration();
    let updatePrompt = config.get('hbuilderx-for-uniapp-test.updatePrompt');
    let updatePromptTime = config.get('hbuilderx-for-uniapp-test.updatePromptTime');
    if (updatePromptTime != undefined || updatePrompt != undefined) {
        btns = ['有更新时提醒我', '关闭'];
    };

    hx.window.showInformationMessage(msg, btns).then(result => {
        if (result === '有更新时提醒我') {
            config.update('hbuilderx-for-uniapp-test.updatePrompt', true).then( () => {
                config.update('hbuilderx-for-uniapp-test.updatePromptTime', '1577808001');
            });
        };
    });
};

/**
 * @description 获取线上版本号
 * @return {String} plugin_version
 */
function getServerVersion() {
    let http = require('http');
    const versionUrl = 'http://update.dcloud.net.cn/hbuilderx/alpha/win32/plugins/index.json';
    return new Promise(function(resolve, reject) {
        http.get(versionUrl, (res) => {
            let data = "";
            res.on("data", (chunk) => {
                data += chunk;
            });
            res.on("end", () => {
                try{
                    let myPluginsVersion;
                    if (isJSON(data)) {
                        let allPlugins = JSON.parse(data);
                        let {plugins} = allPlugins;
                        for (let s of plugins) {
                            if (s.name == 'hbuilderx-for-uniapp-test') {
                                myPluginsVersion = s.version;
                                break;
                            };
                        };

                    };
                    resolve(myPluginsVersion);
                } catch(e) {
                    reject('error');
                };
            });
            res.on("error", (e) => {
                reject('error');
                isPopUpWindow = true;
            });
        });
    })
};

/**
 * @description auto check plugin update
 */
async function checkUpgrade() {
    if (isPopUpWindow) {
        return;
    };

    // get week
    let currentTimestamp = Math.round(new Date() / 1000);
    let config = await hx.workspace.getConfiguration();
    let updatePrompt = config.get('hbuilderx-for-uniapp-test.updatePrompt');
    let updatePromptTime = config.get('hbuilderx-for-uniapp-test.updatePromptTime');
    if (updatePromptTime) {
        try{
            if (updatePromptTime > currentTimestamp) {
                return;
            }
        }catch(e){};
    };
    let serverVersion = await getServerVersion();
    if (serverVersion != version) {
        showUpgradeBox(version,serverVersion);
    };
}

/**
 * @description 关于
 */
async function about() {
    let serverVersion = await getServerVersion();
    if ((serverVersion != version) && serverVersion != undefined) {
        showUpgradeBox(version,serverVersion);
    } else {
        noUpgrade(version);
    };
};



module.exports = {
    checkUpgrade,
    about
};
