const hx = require('hbuilderx');
const os = require('os');
const fs = require('fs');
const path = require('path');

const ui_formDialog = require("./ui_formDialog.js");
const ui_vue = require("./ui_vue.js");
const api_getMobileList = require("./api_getMobileList.js");

const compareHBuilderXVersions = require('../utils/compare_hx_versions.js');
const hxVersion = hx.env.appVersion;
const { get_ios_device_type } = require('../core/core.js');

// 版本判断：判断是否支持safari和firefox，因为firefox和safari自动化测试仅支持3.2.10+版本
const hxVersionForDiff = hxVersion.replace('-alpha', '').replace('-dev', '').replace(/.\d{10}/, '');
const cmpVerionForVue = compareHBuilderXVersions(hxVersionForDiff, '4.40');

// 全局：测试设备
global.global_devicesList = {};

// 全局：测试配置
global.global_uniSettings = {};

// 全局：iOS证书信息（含密码，仅本次启动有效）
global.global_iosCertInfo = null;

const _certCacheFile = path.join(hx.env.appData, 'hbuilderx-for-uniapp-test', '.ios_cert_cache.json');

function _loadCertCache() {
    try {
        return JSON.parse(fs.readFileSync(_certCacheFile, 'utf8'));
    } catch (e) {
        return {};
    }
}

function _saveCertCache(data) {
    try {
        const dir = path.dirname(_certCacheFile);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        // 只持久化非密码字段
        fs.writeFileSync(_certCacheFile, JSON.stringify({
            bundleId: data.bundleId,
            profilePath: data.profilePath,
            p12Path: data.p12Path,
        }), 'utf8');
    } catch (e) {}
}

/**
 * @description 内部使用。返回具体的测试设备信息
 */
async function get_uniTestPlatformInfo(platform, deviceID) {
    console.error("[get_uniTestPlatformInfo] uniTestPlatformInfo = ", platform);
    let uniTestPlatformInfo = "";
    if (platform == "h5") return 'web chrome';
    if (platform == "h5-chrome") return 'web chrome';
    if (platform == "h5-safari") return 'web safari';
    if (platform == "h5-firefox") return 'web firefox';

    try{
        if (!platform.toLowerCase().includes("android") && !platform.toLowerCase().includes("ios")) {
            return platform;
        };
        let phoneOS = platform.toLowerCase();
        if (phoneOS == "ios") {
            phoneOS = "ios_simulator";
        };
        for (let s of global_devicesList[phoneOS]) {
            if (s.udid == deviceID && phoneOS == "android") {
                uniTestPlatformInfo = s.platform + " " + s.version;
                break;
            };
            if (s.udid == deviceID && phoneOS == "ios_simulator") {
                uniTestPlatformInfo = s.platform + " " + s.version;
                // uniTestPlatformInfo = s.platform + " " + s.name;
                break;
            };
        };
        return uniTestPlatformInfo;
    }catch(e){
        return platform;
    };
};


async function _validateIosCert(bundleId, p12Password, profilePath, p12Path) {
    try {
        const ext = await hx.extensions.getExtension('uniapp-basic');
        if (!ext) return { code: 0 };
        const ret = await ext.verifyAppleCert({
            iosAppID: bundleId,
            iosCertPassword: p12Password,
            iosProfile: profilePath,
            iosCertfile: p12Path,
        });
        if (!ret) return { code: 0 };
        const errors = [];
        ret.forEach(v => errors.push(v));
        return errors.length > 0 ? { code: -1, errorMsg: errors[0] } : { code: 0 };
    } catch (e) {
        return { code: 0 };
    }
}

async function showIosCertDialog() {
    try {
        const prev = global.global_iosCertInfo || _loadCertCache();
        let result = await hx.window.showFormDialog({
            title: 'iOS真机证书信息',
            subtitle: 'iOS真机测试，需要iOS证书对ipa进行签名。',
            width: 500,
            height: 320,
            customButtons: [
                { text: '确定', role: 'accept', code: 1 },
                { text: '取消', code: 2 },
            ],
            validate: async function(formData) {
                const { bundleId, profilePath, p12Path, p12Password } = formData;
                if (!bundleId) { this.showError('Bundle ID (AppID) 不能为空'); return false; }
                if (!profilePath) { this.showError('证书profile文件 不能为空'); return false; }
                if (!p12Path) { this.showError('私钥证书 不能为空'); return false; }
                if (!p12Password) { this.showError('证书私钥密码 不能为空'); return false; }
                const ret = await _validateIosCert(bundleId, p12Password, profilePath, p12Path);
                if (ret.code !== 0) { this.showError(ret.errorMsg); return false; }
                return true;
            },
            formItems: [
                {
                    type: 'input',
                    name: 'bundleId',
                    label: 'Bundle ID (AppID)',
                    placeholder: '请输入Bundle ID',
                    value: prev.bundleId || '',
                },
                {
                    type: 'fileSelectInput',
                    name: 'profilePath',
                    mode: 'file',
                    label: '证书profile文件',
                    placeholder: '请选择.mobileprovision文件',
                    filters: ['*.mobileprovision'],
                    value: prev.profilePath || '',
                },
                {
                    type: 'fileSelectInput',
                    name: 'p12Path',
                    mode: 'file',
                    label: '私钥证书',
                    placeholder: '请选择.p12文件',
                    filters: ['*.p12'],
                    value: prev.p12Path || '',
                },
                {
                    type: 'input',
                    name: 'p12Password',
                    label: '证书私钥密码',
                    placeholder: '请输入证书私钥密码',
                    mode: 'password',
                    value: prev.p12Password || '',
                },
            ],
        });
        if (result.buttonIndex !== 0) return null;
        const { bundleId, profilePath, p12Path, p12Password } = result.result;
        _saveCertCache({ bundleId, profilePath, p12Path });
        return { bundleId, profilePath, p12Path, p12Password };
    } catch (e) {
        return null;
    }
}

/**
 * @description 在webviewdialog内选择要测试的设备
 *  - 如果当前连接的设备只有一个，则不弹出测试设备选择窗口，直接运行。
 * @description {Sting} testPlatform [ios|android|all]
 * @return {Array} 手机设备列表，必须是数组，数组元素格式：['android:udid', 'ios:udid']
 */
async function getTestDevices(testPlatform, projectPath="") {
    // 从测试设备选择窗口获取测试设备
    // 数据格式：[
    //     "ios:A8790C48-4986-4303-B235-D8AFA95402D4",
    //     "android:712KPQJ1103860","mp:mp-weixin","h5:h5-chrome","h5:h5-firefox","h5:h5-safari"
    // ]

    let selected = "";
    let uiSettings = {};
    // console.log("======", cmpVerionForVue);
    // selected = await ui_formDialog(testPlatform);

    if (cmpVerionForVue < 0) {
        let _result = await ui_vue(testPlatform, projectPath);
        if (Array.isArray(_result) && _result.length == 2) {
            [selected, uiSettings] = _result;
            if (uiSettings && Object.keys(uiSettings).length > 0) {
                global.global_uniSettings = uiSettings;
            };
        } else {
            selected = _result;
        };
    } else {
        selected = await ui_formDialog(testPlatform);
    };
    console.error("[_result_]", selected, uiSettings);

    // 检查是否有iOS真机，若有则弹出证书信息窗口
    if (Array.isArray(selected) && selected.length > 0) {
        const iosDevices = selected.filter(d => d.startsWith('ios:'));
        if (iosDevices.length > 0) {
            const hasRealDevice = await Promise.all(
                iosDevices.map(d => get_ios_device_type(d.split(':')[1]))
            ).then(types => types.some(t => t === '真机'));
            if (hasRealDevice) {
                const certInfo = await showIosCertDialog();
                if (!certInfo) return [];
                global.global_iosCertInfo = certInfo;
            }
        }
    }

    // return [];
    return selected;
};


module.exports = {
    get_uniTestPlatformInfo,
    getTestDevices,
    validateIosCert: _validateIosCert
};
