# AGENTS.md - AI 辅助开发指南

## 项目概述
---------------------------

本项目是 HBuilderX uni-app 自动化测试插件 (hbuilderx-for-uniapp-test)，用于在 HBuilderX IDE 内和通过 CLI 命令行运行 uni-app 和 uni-app (x) 的自动化测试。

## 核心目的
---------------------------

- 为 uni-app (x)项目，在HBuilderX内，提供自动化测试支持
- 支持多平台测试：Web (Chrome/Safari/Firefox)、微信小程序、Android、iOS、Harmony
- 提供 HBuilderX CLI 接口，支持命令行和 CI/CD 集成
- 本插件，主要是调用 uniapp-cli-vite 插件提供的自动化测试能力。此自动化测试能力，基于 Jest 测试框架，配合 Puppeteer、ADBKit 等工具

## 目录结构
---------------------------

```shell
.
├── AGENTS.md
├── README.md
├── extension.js    // 插件注册入口
├── package.json    // 插件配置文件
├── public
│   └── about.js 
├── snippets
└── src
    ├── HBuilderXCli.js   // 用于在cmd终端便于HBuilderX CLI 命令调用
    ├── Initialize.js     // 初始化测试环境
    ├── TestCaseRun.js    // 在HBuilderX可视化界面，运行设备
    ├── core
    │   ├── edit_env_js_file.js                // 编辑env.js
    │   ├── edit_jest_config_js_file.js        // 编辑jest.config.js
    │   ├── get_project_unicloud_data.js
    │   └── ...
    ├── environment
    │   └── package.json
    ├── lib
    │   ├── ui_vue.vue    // HBuilderX 右键菜单触发，显示设备选择窗口
    │   ├── ...
    ├── static
    │   ├── bootstrap.min.css
    │   ├── ...
    ├── template
    │   ├── AI-prompt.md
    │   ├── env.js
    │   ├── jest.config.js
    │   └── testcase
    └── utils
```

## AI 开发辅助建议
---------------------------

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

## 开发最佳实践
---------------------------

- 使用清晰的命名规范（变量、函数、类名语义化）
- 保持函数单一职责，每个函数不超过50行
- 类的设计遵循SOLID原则
- 目录结构清晰，文件组织合理
- 统一的缩进和格式（推荐使用Prettier等格式化工具）
- 合理的注释覆盖率（关键逻辑必须有注释）
- 避免硬编码，使用配置文件管理常量
- 删除无用的代码和注释
- 选择高效的算法和数据结构
- 避免不必要的计算和内存分配
- 实现合理的缓存策略
- 考虑并发和多线程优化

### 添加新功能
---------------------------

1. **规划**：确定功能需求和影响范围
2. **实现**：在相应模块添加代码
3. **注册**：在 `extension.js` 和 `package.json` 注册命令
4. **测试**：在本地 HBuilderX 环境测试
5. **文档**：更新 README.md 和本文档
6. **版本**：在 changelog.md 记录变更

## 质量检查清单
---------------------------

在交付代码前，请确认以下检查项：

- 代码逻辑正确，功能完整
- 命名规范，注释清晰
- 错误处理完善
- 性能表现良好
- 安全漏洞排查
- 测试用例覆盖
- 文档完整准确
- 代码风格统一
- 依赖管理合理
- 可维护性良好

### Git提交规范

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

## Code Modification Rules
---------------------------

* 修改必须遵循最小 diff 原则（minimal diff）。
* 严禁修改任何既有代码的格式，包括但不限于空格、缩进、换行。
* 已有代码必须保持逐字节一致（byte-for-byte identical）。
* 禁止任何形式的自动格式化或风格调整。
* 仅在明确标注的新增区域内添加代码。
* 若功能修改无法避免触碰旧代码，必须先说明原因。
* 以下修改一律禁止（即使语义等价）：
  - `function()` → `function ()`
  - `if(a)` → `if (a)`
  - 任何自动对齐、自动换行、自动缩进

## 结语
---------------------------

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