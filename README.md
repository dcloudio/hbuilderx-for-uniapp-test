# hbuilderx-for-uniapp-test

本插件，用于在HBuilderX内运行uni-app自动化测试。

主要功能有：

- 初始化测试环境（创建测试配置文件、以及安装测试所需的环境）
- 运行测试 (运行项目下所有测试用例、运行某一个测试用例)
- 新建测试用例 （uni-app pages页面，右键菜单【新建测试用例】）
- 查看历史测试报告 （hbuilderx顶部运行菜单）

## 测试注意事项

1. 本插件支持`uni-app普通项目`和`uniapp-cli项目`。uniapp-cli项目，运行自动化测试，需要在当前项目下安装自动化测试依赖。
2. Windows电脑不支持运行测试到`ios手机`。
3. MacOSX电脑，仅支持运行测试到`ios模拟器`，不支持ios真机。
4. 运行测试到H5，仅支持`chrome`浏览器，不支持其它浏览器。HBuilderX 3.2.10+版本，支持safari和firefox。 
5. 运行测试到Android手机，如果HBuilderX仅检测到一个android设备，直接运行测试到当前已连接设备。多个设备时，会弹窗要求选择手机。
6. node: 当本机未安装node时，将使用HBuilderX内置的node运行自动化测试。反之，本机安装了node，则使用本机的node。

## 扩展

- [uni-app自动化测试API](https://uniapp.dcloud.io/collocation/auto/quick-start)
- [jest官方文档](https://www.jestjs.cn/)
- [QQ交流群 695557932](https://qm.qq.com/cgi-bin/qm/qr?k=7uTgM9atb5lWFbZyoMiVtHrYz4DuQbt4&jump_from=webapi)