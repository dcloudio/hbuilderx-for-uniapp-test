// 参考文档: https://uniapp.dcloud.net.cn/worktile/auto/hbuilderx-extension/#envjs
// 备注：UNI_TEST_CUSTOM_ENV 用于自动化测试向uniapp-cli-vite编译器中传递一些环境变量，设置格式：key: value
module.exports = {
    "is-custom-runtime": false,
    "UNI_TEST_CUSTOM_ENV": {},
    "compile": true,
    "h5": {
        "options": {
            "headless": true
        },
        "executablePath": ""
    },
    "mp-weixin": {
        "port": 9420,
        "account": "",
        "args": "",
        "cwd": "",
        "launch": true,
        "teardown": "disconnect",
        "remote": false,
        "executablePath": ""
    },
    "app-plus": {
        "android": {
            "id": "",
            "executablePath": ""
        },
        "version": "",
        "ios": {
            "id": "",
            "executablePath": ""
        }
    }
}
