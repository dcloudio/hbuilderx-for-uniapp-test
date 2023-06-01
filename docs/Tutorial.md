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
4. 运行测试到H5，仅支持`chrome`浏览器，不支持其它浏览器。 
5. 运行测试到Android手机，如果HBuilderX仅检测到一个android设备，直接运行测试到当前已连接设备。多个设备时，会弹窗要求选择手机。

## 测试环境

**插件依赖：** h5、微信、ios、android自动化测试依赖puppeteer、adbkit、node-simctl、jest，运行插件时，如果未安装此依赖，将会弹窗提示。

**node:** 当本机未安装node时，将使用HBuilderX`内置`的node运行测试。反之，本机安装了node，则使用本机的node。

uniapp-cli项目，自动化测试依赖安装命令:

```shell
npm install --save cross-env puppeteer adbkit node-simctl jest
```

## 测试环境安装

选中uni-app项目，右键菜单【初始化测试环境】，则会自动安装相关依赖、并创建测试配置文件。

<img src="https://img-cdn-tc.dcloud.net.cn/uploads/article/20210723/56b6746d78f493e1b9fec87e6d974336.jpg" style="width: 800px; height: 540px;border-radius: 10px;border:1px solid #eee;">

<img src="https://img-cdn-tc.dcloud.net.cn/uploads/article/20210723/0d404318d284af4ad744b8ac541ca628.jpg" style="width: 800px; height: 540px;border-radius: 10px;border:1px solid #eee;">

## 测试用例创建

uni-app项目，pages页面，右键菜单，创建测试用例

<img src="https://img-cdn-tc.dcloud.net.cn/uploads/article/20210723/797d58bb4262a5f2c75d98adca7269d5.jpg" style="width: 800px; height: 540px;border-radius: 10px; border:1px solid #eee;" />

## 测试运行

- 在uni-app项目根目录、evn.js文件、jest.config.js文件，右键菜单【运行uni-app自动化测试】，即可运行项目下所有测试用例
- 在uni-app项目，具体页面上，右键菜单【uni-app运行自动化测试】，即可运行当前测试用例

<video width="800" height="600" controls>
  <source src="https://static-0c1fa337-7340-4755-9bec-f766d7d31833.bspapp.com/testrun.mp4" type="video/mp4">
</video>

## 内置Jest代码块

> 本插件内置jest部分代码块

|prefix		| 代码块						|
|--			|--								|
|describe	|describe('', () => {});		|
|test		|test('', () => {});			|
|ta			|test('', async () => {await});	|
|beforeAll	|beforeAll(() => {});			|
|afterEach	|afterEach(() => {});			|
|afterAll	|afterAll(() => {});			|
|beforeAll	|beforeAll(() => {});			|

## 扩展

- [完整文档教程](https://static-0c1fa337-7340-4755-9bec-f766d7d31833.bspapp.com/markdown-share-docs/cdf2a7abd25bf2568276c1cc7472136b/)
- [uni-app自动化测试API](https://uniapp.dcloud.io/collocation/auto/quick-start)
- [jest官方文档](https://www.jestjs.cn/)
- [QQ交流群 695557932](https://qm.qq.com/cgi-bin/qm/qr?k=7uTgM9atb5lWFbZyoMiVtHrYz4DuQbt4&jump_from=webapi)