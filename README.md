# hbuilderx-for-uniapp-test

本插件，用于在HBuilderX内运行uni-app自动化测试。

主要功能有：

- 初始化测试环境（创建测试配置文件、以及安装测试所需的环境）
- 运行测试 (运行项目下所有测试用例、运行某一个测试用例)
- 新建测试用例 （uni-app pages页面，右键菜单【新建测试用例】）
- 查看历史测试报告 （hbuilderx顶部运行菜单）

## 测试注意事项

1. 本插件支持`uni-app (x) 普通项目`和`uniapp-cli项目`。uniapp-cli项目，运行自动化测试，需要在当前项目下安装自动化测试依赖。
2. Windows电脑不支持运行测试到`ios手机`。
3. MacOSX电脑，仅支持运行测试到`ios模拟器`，不支持ios真机。
4. 运行测试到H5，仅支持`chrome`浏览器，不支持其它浏览器。HBuilderX 3.2.10+版本，支持safari和firefox。 
5. 运行测试到Android手机，如果HBuilderX仅检测到一个android设备，直接运行测试到当前已连接设备。多个设备时，会弹窗要求选择手机。
6. node: 当本机未安装node时，将使用HBuilderX内置的node运行自动化测试。反之，本机安装了node，则使用本机的node。

## HBuilderX CLI

插件 4.1.0版本起，支持被HBuilderX CLI调用了， 支持使用HBuilderX CLI命令行运行 uni-app (x) 自动化测试到 Web、微信小程序、Android、iOS 和 Harmony。

```shell
// 查看帮助
cli uniapp.test --help

// 基本使用方法
cli uniapp.test <platform> --project <ProjectPath>

// windows电脑基本使用方法
.\cli.exe uniapp.test <platform> --project <ProjectPath>
```

#### 支持的平台

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

#### 参数说明

- **必需参数**
  - `--project <ProjectPath>`：指定项目的路径。

- **可选参数**
  - `--testcaseFile <testcase_file_path>`：指定测试用例文件的路径（仅适用于 `app-harmony`）。
  - `--device_id <id>`：指定设备 ID（仅适用于 `app-harmony`）。
  - `--help`：显示命令帮助信息。
  - `--version`：查看插件版本号。

## 扩展

- [uni-app自动化测试API](https://uniapp.dcloud.io/collocation/auto/quick-start)
- [jest官方文档](https://www.jestjs.cn/)
