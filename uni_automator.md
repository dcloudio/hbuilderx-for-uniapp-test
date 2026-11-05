本插件，用于在编辑器内运行uni-app (x) 自动化测试。

主要功能有：

- 初始化测试环境（创建测试配置文件、以及安装测试所需的环境）
- 运行测试 (运行项目下所有测试用例、运行某一个测试用例)
- 新建测试用例 （uni-app pages页面，右键菜单【新建测试用例】）

## 测试注意事项

- Windows电脑，不支持运行测试到`iOS平台`。

## 支持的平台

- **Web**
  - `web-chrome`：在 Chrome 浏览器中运行测试
  - `web-safari`：在 Safari 浏览器中运行测试
  - `web-firefox`：在 Firefox 浏览器中运行测试

- **小程序**
  - `mp-weixin`：在微信小程序中运行测试
  - `mp-alipay`：在支付宝小程序中运行测试

- **移动应用**
  - `app-android`：在 Android 设备上运行测试
  - `app-ios-simulator`：在 iOS 模拟器中运行测试
  - `app-harmony`：在 Harmony 设备上运行测试

## 扩展

- [uni-app自动化测试API](https://uniapp.dcloud.io/collocation/auto/quick-start)
- [jest官方文档](https://www.jestjs.cn/)
