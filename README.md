# hbuilderv-for-uniapp-test

本插件，用于在HBuilderV内运行uni-app X 自动化测试。

主要功能有：

- 初始化测试环境（创建测试配置文件、以及安装测试所需的环境）
- 运行测试 (运行项目下所有测试用例、运行某一个测试用例)
- 新建测试用例 （uni-app pages页面，右键菜单【新建测试用例】）

## CLI

此插件也支持用CLI命令行运行 uni-app (x) 自动化测试到 Web、微信/支付宝小程序、Android、iOS 和 Harmony。

cli位置：`/Applications/HBuilderV.app/Contents/Resources/app/bin/cli`

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
