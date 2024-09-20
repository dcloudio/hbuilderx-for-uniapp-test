# 更新日志

## 1.9.0
* 新增 env.js 在env.js中扩展UNI_TEST_CUSTOM_ENV字段，从中读取自定义环境变量，并传递给uniapp自动化测试框架命令行

## 1.8.5
* 新增 读取hx配置项uniappx.kotlin.compiler.memory，传递给uni-app-x自动化测试，解决项目编译内存问题

## 1.8.4
* fixed: 修复不支持支付宝小程序云测试的Bug

## 1.8.3
* 调整 Android设备查找 优先使用设置中自定义的adb路径

## 1.8.2
* 新增 环境变量 HX_CONFIG_ADB_PATH
* 修复 node spawn执行命令，获取命令行输出，使用readline.createInterface解决某些情况下命令行输出出现大量单个字符的Bug

## 1.8.1
* 修复 1.8.0引发的 自动化测试控制台，某些情况下，无法弹出的Bug

## 1.8.0
* 新增 环境变量 UNI_UTS_PLATFORM 用于UTS项目测试
* 修复 自动化测试 log控制台打印日志时，切换到其它控制台，又被自动切回的Bug

## 1.7.3
* 优化 提示语

## 1.7.1
* 调整 选择设备窗口，android设备获取

## 1.7.0
* 新增 uniapp自动化测试 环境变量增加UNI_AUTOMATOR_PORT 当默认端口9520被占用时，自动+1
* 调整 测试配置文件env.js 增加检查

## 1.6.0
* 新增 配置项 hbuilderx-for-uniapp-test.jestNodeType，可以设置使用何种Node运行jest程序（HBuilderX内置Node、操作系统环境变量）
* 修复 windows 某些情况下，控制台结束测试进程，无法结束的Bug

## 1.5.0
* 新增 自动化测试 补充部分Node环境变量

## 1.4.2
* 调整 package.json描述
* 修复 一些小bug

## 1.4.1
* 修复 某些情况下，env.js文件编辑出错的Bug

## 1.4.0
* 优化 env.js文件 以格式化方式写入内容
* 新增 env.js文件 增加is-custom-runtime字段，默认为false。当等于true时，不在自动修改executablePath字段
* 优化 环境检查 控制台提示语

## 1.3.0
* 新增 测试环境变量uniTestProjectName和uniTestPlatformInfo

## 1.2.0
* 修复 1.1.0引出的设备选择窗口无法运行的Bug

## 1.1.0
* 调整 设备选择窗口 增加刷新按钮

## 1.0.1
* 修复 一些小bug

## 1.0.0
* 更新 pages/autotest/uni-目录右键菜单，支持显示菜单：运行当前测试用例
* 更新 控制台日志输出颜色

## 0.3.0
* 优化 终端弹窗提示。非必要不安装终端
* 优化 android设备选择窗口，默认选择第一个
* 修复 某些情况下，android模拟器数据重复的Bug
* 更新 测试环境依赖，增加jest-image-snapshot

## 0.2.2
* 优化 设备选择窗口

## 0.1.4
* 优化 增加参数HX_APP_ROOT，避免同名变量

## 0.1.3.20230116
* 优化 日志输出

## 0.1.2.20230116
* 优化 uni-app uts项目 自动化测试

## 0.1.1.20230116
* 优化 uts插件 不再强制配置gradle和android sdk路径

## 0.1.0.20230116
* 新增 uni-app自动化测试 支持vue3和uts项目

## 0.0.6.20211030
* 优化 uni-app普通项目 自动化测试增加--globalTeardown参数 用于释放端口等资源

## 0.0.5.20211018
* 新增 H5测试支持safari和firefox

## 0.0.4.20210927
* 新增 配置项 支持自定义设置使用何种node版本进行uni-app编译

## 0.0.3.20210803
* 优化 测试运行 手机设备选择窗口UI
* 优化 测试运行 当HBuilderX程序路径包含空格导致测试运行失败，控制台输出提示
* 优化 初始化测试环境之前，检查是否安装终端插件

## 0.0.1.20210723
* 新增 HBuilderX uni-app自动化测试插件

