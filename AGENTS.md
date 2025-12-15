# AGENTS.md - AI 辅助开发指南

## 项目概述

本项目是 HBuilderX uni-app 自动化测试插件 (hbuilderx-for-uniapp-test)，用于在 HBuilderX IDE 内和通过 CLI 命令行运行 uni-app 和 uni-app (x) 的自动化测试。

### 核心目的

- 为 uni-app 开发者提供完整的自动化测试解决方案
- 支持多平台测试：Web (Chrome/Safari/Firefox)、微信小程序、Android、iOS、Harmony
- 提供 HBuilderX CLI 接口，支持命令行和 CI/CD 集成
- 基于 Jest 测试框架，配合 Puppeteer、ADBKit 等工具

### 版本信息

- 当前版本：4.3.1
- 要求 HBuilderX：^3.7.3
- 插件 ID：hbuilderx-for-uniapp-test

---

## 技术栈与架构

### 主要技术栈

```javascript
{
  "runtime": "Node.js (HBuilderX 内置或系统 Node)",
  "testFramework": "Jest",
  "automation": ["Puppeteer", "ADBKit", "node-simctl"],
  "platforms": ["Web", "WeChat Mini Program", "Android", "iOS", "Harmony"],
  "language": "JavaScript",
  "ide": "HBuilderX"
}
```

### 项目结构

```
hbuilderx-for-uniapp-test/
├── extension.js              # 插件入口文件，注册所有命令
├── package.json              # 插件配置和元数据
├── README.md                 # 用户文档
├── changelog.md              # 版本更新日志
├── AGENTS.md                 # AI 辅助开发指南（本文件）
├── .editorconfig             # 编辑器配置
├── .gitignore                # Git 忽略规则
│
├── src/                      # 源代码目录
│   ├── HBuilderXCli.js       # CLI 命令处理（核心）
│   ├── Initialize.js         # 测试环境初始化
│   ├── TestCaseCreate.js     # 测试用例创建
│   ├── TestCaseRun.js        # 测试用例运行
│   ├── TestReports.js        # 测试报告管理
│   │
│   ├── core/                 # 核心功能模块
│   │   ├── config.js         # 配置管理
│   │   ├── core.js           # 核心工具函数
│   │   ├── edit_env_js_file.js
│   │   ├── edit_jest_config_js_file.js
│   │   └── get_project_unicloud_data.js
│   │
│   ├── lib/                  # 库和工具
│   │   ├── api_getMobileList.js
│   │   ├── main.js
│   │   └── ui_vue.js
│   │
│   ├── utils/                # 工具函数
│   │   ├── utils_public.js
│   │   ├── utils_files.js
│   │   └── get_test_port.js
│   │
│   ├── environment/          # 测试环境依赖管理
│   ├── static/               # 静态资源
│   ├── template/             # 测试用例模板
│   └── test/                 # 测试相关
│
├── public/                   # 公共资源
│   └── about.js              # 关于和升级检查
│
├── docs/                     # 文档
│   ├── Tutorial.md           # 教程文档
│   └── images/               # 文档图片
│
└── snippets/                 # 代码片段
    └── jest.json             # Jest 代码片段
```

### 核心模块说明

#### 1. extension.js
插件激活入口，注册所有 HBuilderX 命令和 CLI 命令：
- UI 命令：`unitest.*` 系列（初始化、创建、运行测试等）
- CLI 命令：`uniapp.test` 系列（支持命令行调用）

#### 2. HBuilderXCli.js
CLI 接口核心实现，处理：
- 命令行参数解析
- 测试环境检查和准备
- 设备管理和选择
- 测试执行和日志输出

#### 3. Initialize.js
测试环境初始化：
- 创建 `env.js` 和 `jest.config.js` 配置文件
- 安装测试依赖（puppeteer、adbkit、node-simctl、jest）
- 检查和配置 Node 环境

#### 4. TestCaseRun.js / TestCaseCreate.js
测试用例管理：
- 创建测试用例模板
- 运行全部或单个测试用例
- 多平台测试支持

---

## CLI 命令参考（Mac 终端）

### 基本命令格式

```bash
# 查看帮助
cli uniapp.test --help

# 查看版本
cli uniapp.test --version

# 基本使用格式
cli uniapp.test <platform> --project <ProjectPath> [options]
```

### 支持的平台命令

#### Web 测试

```bash
# Chrome 浏览器测试
cli uniapp.test web-chrome --project /path/to/project

# Safari 浏览器测试（仅 Mac）
cli uniapp.test web-safari --project /path/to/project

# Firefox 浏览器测试
cli uniapp.test web-firefox --project /path/to/project

# Web 通用命令（指定浏览器）
cli uniapp.test web --project /path/to/project --browser chrome
```

#### 小程序测试

```bash
# 微信小程序测试
cli uniapp.test mp-weixin --project /path/to/project
```

#### 移动端测试

```bash
# Android 设备测试
cli uniapp.test app-android --project /path/to/project

# iOS 模拟器测试（仅 Mac）
cli uniapp.test app-ios-simulator --project /path/to/project

# Harmony 设备测试
cli uniapp.test app-harmony --project /path/to/project
```

### 可选参数

```bash
# 指定测试用例文件
--testcaseFile <relative_path>
# 例如：--testcaseFile pages/index/index.test.js

# 指定设备 ID（Android/iOS/Harmony）
--device_id <device_id>

# 组合使用示例
cli uniapp.test app-android \
  --project /Users/username/myapp \
  --testcaseFile pages/home/home.test.js \
  --device_id emulator-5554
```

### Mac 终端使用示例

```bash
# 1. 运行 Web Chrome 测试
cli uniapp.test web-chrome --project ~/Projects/my-uniapp

# 2. 运行 iOS 模拟器测试
cli uniapp.test app-ios-simulator --project ~/Projects/my-uniapp

# 3. 运行特定测试用例到 Android
cli uniapp.test app-android \
  --project ~/Projects/my-uniapp \
  --testcaseFile pages/login/login.test.js

# 4. 指定设备运行测试
cli uniapp.test app-ios-simulator \
  --project ~/Projects/my-uniapp \
  --device_id "iPhone 14 Pro"
```

---

## AI 开发辅助建议

### 代码理解和修改

当使用 GitHub Copilot 或其他 AI 工具修改本项目代码时，请注意：

#### 1. 保持兼容性

```javascript
// ✅ 正确：保持 HBuilderX API 调用方式
let config = hx.workspace.getConfiguration();
let result = config.get('hbuilderx-for-uniapp-test.AutomaticModificationTestMatch');

// ❌ 错误：不要使用标准 Node.js 或其他 IDE API
const vscode = require('vscode'); // 不适用于 HBuilderX
```

#### 2. 命令注册模式

```javascript
// 遵循现有模式注册命令
let commandName = hx.commands.registerCommand('unitest.yourCommand', (param) => {
    // 实现逻辑
});
context.subscriptions.push(commandName);

// CLI 命令注册
let cli_command = hx.commands.registerCliCommand('uniapp.test yourplatform', async (params) => {
    await RunTestForHBuilderXCli_main(params, 'yourplatform');
});
context.subscriptions.push(cli_command);
```

#### 3. 异步处理

```javascript
// ✅ 正确：使用 async/await 处理异步操作
async checkEnvironment() {
    try {
        const nodeStatus = await checkNode();
        // 处理结果
    } catch (error) {
        await this.print_cli_log('环境检查失败');
    }
}
```

#### 4. 日志输出

```javascript
// CLI 日志输出
await hx.cliconsole.log({ 
    clientId: this.terminal_id, 
    msg: "测试信息", 
    status: "Info" 
});

// UI 状态栏消息
hx.window.setStatusBarMessage('操作成功', 'info', 5000);
```

### 添加新平台支持

若需添加新的测试平台（如新的小程序平台），遵循以下步骤：

#### 1. 在 package.json 添加命令定义

```json
{
  "command": "unitest.runTestNewPlatform",
  "title": "运行测试到新平台"
}
```

#### 2. 在 extension.js 注册命令

```javascript
let runTestNewPlatform = hx.commands.registerCommand('unitest.runTestNewPlatform', (param) => {
    run.main(param, 'new-platform');
});
context.subscriptions.push(runTestNewPlatform);

let cli_new_platform = hx.commands.registerCliCommand('uniapp.test new-platform', async (params) => {
    await RunTestForHBuilderXCli_main(params, 'new-platform');
});
context.subscriptions.push(cli_new_platform);
```

#### 3. 在 TestCaseRun.js 或 HBuilderXCli.js 实现逻辑

```javascript
async runTestToNewPlatform(projectPath, testcaseFile) {
    // 检查环境
    await this.checkAndSetEnv('new-platform', projectPath);
    
    // 配置测试环境变量
    let env_config = {
        UNI_PLATFORM: 'new-platform',
        // 其他配置...
    };
    
    // 运行测试
    await this.runJestTest(projectPath, testcaseFile, env_config);
}
```

### 测试用例模板

在 `src/template/` 目录添加新平台的测试模板时：

```javascript
// template/new-platform.test.js
describe('新平台测试', () => {
    let page;
    
    beforeAll(async () => {
        page = await program.reLaunch('/pages/index/index');
        await page.waitFor(500);
    });
    
    test('页面加载', async () => {
        expect(page.path).toBe('pages/index/index');
    });
    
    afterAll(async () => {
        await page.close();
    });
});
```

### 错误处理模式

```javascript
// 统一的错误处理模式
try {
    // 执行操作
    const result = await someAsyncOperation();
    
    // 成功日志
    await this.print_cli_log('操作成功');
    
} catch (error) {
    // 错误日志
    await this.print_cli_log(`操作失败: ${error.message}`);
    
    // 根据需要抛出或返回错误状态
    throw error;
}
```

### 国际化支持

```javascript
// 在 src/core/config.js 中添加国际化文本
const i18n = {
    msg_new_feature: "新功能描述",
    error_new_condition: "错误提示信息"
};

// 使用
const config = require('./core/config.js');
console.log(config.i18n.msg_new_feature);
```

---

## 开发最佳实践

### 1. 文件命名和组织

- **命名约定**：使用小写字母和下划线（snake_case）或驼峰命名（camelCase）
- **模块化**：将功能拆分到独立模块，保持文件职责单一
- **路径处理**：使用 `path.join()` 而非字符串拼接，确保跨平台兼容

```javascript
const path = require('path');
const projectPath = path.join(workspacePath, 'pages', 'index');
```

### 2. 配置管理

```javascript
// 读取配置
let config = hx.workspace.getConfiguration();
let customDir = config.get('hbuilderx-for-uniapp-test.customTestEnvironmentDependencyDir');

// 更新配置
await config.update('hbuilderx-for-uniapp-test.isDebug', true);
```

### 3. 平台检测

```javascript
const os = require('os');
const osName = os.platform();

// Mac: 'darwin'
// Windows: 'win32'
// Linux: 'linux'

if (osName === 'darwin') {
    // Mac 特定逻辑（如 iOS 模拟器支持）
}
```

### 4. Node 环境检查

```javascript
// 检查系统是否安装 Node
const nodeStatus = await checkNode();

// 使用 HBuilderX 内置 Node 或系统 Node
const isUseBuiltNode = config.get('hbuilderx-for-uniapp-test.jestNodeType');
```

### 5. 设备管理

```javascript
// 获取可用设备列表
const devices = await api_getMobileList({
    platform: 'android', // 或 'ios', 'harmony'
    clientId: this.terminal_id
});

// 选择设备
let device_id = params.args.device_id || devices[0].id;
```

### 6. Jest 配置修改

```javascript
// 动态修改 jest.config.js 的 testMatch
await modifyJestConfigJSFile({
    projectPath: projectPath,
    testcaseFile: 'pages/index/index.test.js'
});
```

### 7. 环境变量设置

```javascript
// 为不同平台设置环境变量
const env_config = {
    UNI_PLATFORM: platform,
    UNI_OS_NAME: osName,
    NODE_ENV: 'development',
    // 平台特定变量...
};

await editEnvjsFile(projectPath, env_config);
```

---

## 测试用例开发指南

### Jest 代码片段（已内置）

| Prefix     | 代码片段                          |
|------------|-----------------------------------|
| describe   | `describe('', () => {});`         |
| test       | `test('', () => {});`             |
| ta         | `test('', async () => {await});` |
| beforeAll  | `beforeAll(() => {});`            |
| afterEach  | `afterEach(() => {});`            |
| afterAll   | `afterAll(() => {});`             |

### 测试用例结构示例

```javascript
// pages/index/index.test.js
describe('首页测试', () => {
    let page;
    
    beforeAll(async () => {
        // 启动页面
        page = await program.reLaunch('/pages/index/index');
        await page.waitFor(1000);
    });
    
    test('页面标题正确', async () => {
        const title = await page.$('.title');
        expect(title.text).toBe('欢迎使用 uni-app');
    });
    
    test('按钮点击事件', async () => {
        const button = await page.$('.btn');
        await button.tap();
        await page.waitFor(500);
        
        const result = await page.$('.result');
        expect(result.text).toBe('点击成功');
    });
    
    afterAll(async () => {
        // 清理
    });
});
```

### 多平台测试注意事项

#### Web (H5) 测试
- 使用 Puppeteer 进行浏览器自动化
- 支持 Chrome、Safari (Mac)、Firefox
- 注意浏览器驱动安装和路径配置

#### 微信小程序测试
- 需要微信开发者工具
- 配置小程序 AppID
- 自动打开开发者工具运行

#### Android 测试
- 需要 ADB 工具
- 检测连接的 Android 设备
- 支持真机和模拟器

#### iOS 测试
- 仅支持 Mac 系统
- 使用 node-simctl 管理模拟器
- 不支持真机测试

#### Harmony 测试
- 需要 HDC 工具
- 检测连接的 Harmony 设备
- 支持鸿蒙应用测试

---

## 调试和日志

### 启用调试日志

在 HBuilderX 中：
1. 运行菜单 → uni-app自动化测试辅助插件 → 勾选"是否输出Debug调试日志"

通过配置：
```javascript
config.update('hbuilderx-for-uniapp-test.isDebug', true);
```

### 日志输出方法

```javascript
// CLI 日志
await hx.cliconsole.log({
    clientId: this.terminal_id,
    msg: "日志消息",
    status: "Info" // Info, Warning, Error
});

// 控制台输出（开发调试）
console.log('[uniapp.test]', 'Debug message');
```

### 常见问题排查

#### 1. Node 环境问题
```javascript
// 检查 Node 可用性
const nodeStatus = await checkNode();
if (nodeStatus === 'N') {
    // 未安装 Node，将使用 HBuilderX 内置 Node
}
```

#### 2. 依赖安装失败
```javascript
// 检查自定义依赖目录配置
const customDir = config.get('hbuilderx-for-uniapp-test.customTestEnvironmentDependencyDir');
// 确保路径以 node_modules 结尾
```

#### 3. 设备连接问题
```javascript
// 获取设备列表时出错
try {
    const devices = await api_getMobileList({ platform, clientId });
    if (devices.length === 0) {
        throw new Error('未检测到可用设备');
    }
} catch (error) {
    console.error('设备获取失败:', error);
}
```

---

## 贡献指南

### 添加新功能

1. **规划**：确定功能需求和影响范围
2. **实现**：在相应模块添加代码
3. **注册**：在 `extension.js` 和 `package.json` 注册命令
4. **测试**：在本地 HBuilderX 环境测试
5. **文档**：更新 README.md 和本文档
6. **版本**：在 changelog.md 记录变更

### 代码风格

```javascript
// 使用 const/let，避免 var
const config = require('./config');
let result = await someOperation();

// 使用模板字符串
const message = `测试运行到 ${platform} 平台`;

// 使用解构
const { projectPath, platform } = params.args;

// 异步函数使用 async/await
async function runTest() {
    try {
        const result = await executeTest();
        return result;
    } catch (error) {
        console.error(error);
    }
}
```

### 提交规范

```bash
# 功能添加
git commit -m "feat: 添加新平台支持"

# Bug 修复
git commit -m "fix: 修复设备检测问题"

# 文档更新
git commit -m "docs: 更新 CLI 使用文档"

# 代码重构
git commit -m "refactor: 优化命令处理逻辑"
```

---

## 资源和参考

### 官方文档

- [uni-app 自动化测试 API](https://uniapp.dcloud.io/collocation/auto/quick-start)
- [Jest 官方文档](https://www.jestjs.cn/)
- [HBuilderX 插件开发文档](https://hx.dcloud.net.cn/ExtensionDocs/README)

### 相关技术

- [Puppeteer 文档](https://pptr.dev/)
- [ADBKit 文档](https://github.com/openstf/adbkit)
- [node-simctl 文档](https://github.com/appium/node-simctl)

### 社区支持

- QQ 交流群：695557932
- 完整教程：查看 docs/Tutorial.md

---

## AI 使用场景示例

### 场景 1：添加新的测试断言

**Prompt 示例**：
```
在 pages/login/login.test.js 中，添加一个测试用例，
验证用户名输入框的 placeholder 文本是否为"请输入用户名"
```

**预期生成**：
```javascript
test('用户名输入框 placeholder', async () => {
    const input = await page.$('.username-input');
    expect(input.getAttribute('placeholder')).toBe('请输入用户名');
});
```

### 场景 2：修改 CLI 命令参数

**Prompt 示例**：
```
在 HBuilderXCli.js 中，为 app-android 平台添加一个新参数 --no-install，
用于跳过应用安装步骤，直接运行测试
```

**实现要点**：
1. 在 package.json 的 clicommands 中添加参数定义
2. 在 HBuilderXCli.js 中解析参数
3. 在测试执行逻辑中处理该参数

### 场景 3：优化错误提示

**Prompt 示例**：
```
当检测不到 Android 设备时，输出更友好的错误提示，
包括如何通过 adb devices 检查设备连接的说明
```

**实现位置**：src/lib/api_getMobileList.js

---

## 更新记录

- **2024-12-15**: 创建 AGENTS.md 文件，提供 AI 辅助开发指南
- 版本 4.3.1: 当前稳定版本
- 版本 4.1.0: 添加 HBuilderX CLI 支持

---

## 结语

本文档旨在为 AI 辅助工具（如 GitHub Copilot CLI）提供充分的上下文信息，
帮助开发者更高效地理解、修改和扩展 hbuilderx-for-uniapp-test 插件。

在 Mac 终端使用 GitHub Copilot CLI 时，可以参考本文档的命令示例和最佳实践，
快速生成测试用例、调试问题或添加新功能。

**记住**：
- 保持与 HBuilderX API 的兼容性
- 遵循现有的代码结构和命名规范
- 充分测试跨平台功能
- 更新相关文档和 changelog

Happy Coding! 🚀
