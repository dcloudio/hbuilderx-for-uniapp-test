# AGENTS.md - HBuilderV uni-app 自动化测试插件开发指南

## 1. 项目定位

本仓库是运行在 HBuilderV Extension Host 中的 uni-app / uni-app x 自动化测试插件，提供两类入口：

- HBuilderV 图形界面：项目管理器、编辑器右键菜单和顶部“运行”菜单。
- HBuilderV CLI：`cli uniapp.test ...`，用于终端和 CI/CD。

插件负责准备环境、选择设备、维护 `env.js` 和 `jest.config.js`、组装环境变量，并调用 HBuilderV SDK 内 `uniapp-cli` / `uniapp-cli-vite` 提供的 `uni-automator`，最终使用 Jest 执行测试。支持 Web（Chrome/Safari/Firefox）、微信/支付宝小程序、Android、iOS 和 Harmony。

## 2. 当前运行环境

本分支已经从 HBuilderX 插件 API 迁移到 HBuilderV 的 VS Code Extension Host。

### 2.1 API 原则

- 业务代码直接 `require('vscode')`。
- 不要重新引入 `require('hbuilderx')` 或 `hx.*` 调用。
- GUI 命令使用 `vscode.commands.registerCommand()`。
- CLI 命令使用 HBuilderV 扩展 API `vscode.commands.registerCliCommand()`。
- 窗口、提示、配置、文档和扩展查询分别使用 `vscode.window`、`vscode.workspace`、`vscode.extensions`。
- HBuilderV 专有 API（如 `registerCliCommand`、`openWebviewDialog`、`createAnsiOutputChannel` 和 Run Adapter）可以使用，但不要假定标准 VS Code 一定提供。
- 获取其他扩展位置使用 `vscode.extensions.getExtension(id).extensionPath`。需要调用扩展导出 API 时才按需 `activate()`；只获取路径时不应激活扩展。

```js
const vscode = require('vscode');

const disposable = vscode.commands.registerCommand('unitest.example', () => {
    const config = vscode.workspace.getConfiguration();
    return config.get('uniapp-test-cfg.isDebug');
});
context.subscriptions.push(disposable);
```

## 3. 目录与职责

| 路径 | 职责 |
| --- | --- |
| `extension.js` | 激活入口；注册 GUI/CLI 命令、URI Handler、Run Console；规范化命令参数 |
| `package.json` | 命令、CLI 参数、菜单、配置项、debugger 和依赖声明 |
| `src/TestCaseRun.js` | GUI 测试主流程；环境检查、设备选择、配置文件准备、测试执行 |
| `src/HBuilder_Cli.js` | CLI 主流程；参数校验、设备发现、CLI 日志和测试执行 |
| `src/Initialize.js` | 创建默认配置、检查或提示安装测试依赖 |
| `src/TestCaseCreate.js` | “新建自动化测试用例” Webview Dialog 与文件创建 |
| `src/hbuilderv-console.js` | 原生【UNI-APP测试】Run Console 的内联 Run Adapter |
| `src/core/config.js` | HBuilderV SDK、内置插件、Node、Jest、launcher 和缓存路径 |
| `src/core/core.js` | 进程管理、日志路由、JSONC 读取、测试报告链接等公共逻辑 |
| `src/core/edit_env_js_file.js` | 按平台和设备更新项目 `env.js` |
| `src/core/edit_jest_config_js_file.js` | 更新测试范围和 `testMatch` |
| `src/lib/ui_vue.js` | 设备选择 Webview Dialog；文件名虽保留 `vue`，实现是原生 HTML/CSS/JS |
| `src/lib/api_getMobileList.js` | Android、iOS、Harmony 设备列表统一入口和缓存 |
| `src/lib/ui_ios_cert.js` | iOS 真机证书选择与校验窗口 |
| `src/lib/main.js` | 设备选择与 iOS 证书流程的上层入口 |
| `src/template/` | `env.js`、`jest.config.js` 和测试用例默认模板 |
| `src/environment/` | 外置自动化测试依赖的 package 模板 |
| `src/utils/` | 网络、Playwright、CLI 控制台、端口和文件工具 |
| `AGENTS_design.md` | HBuilderV 适配设计细节和历史决策 |

已删除的旧文件或功能不要恢复，包括 `src/hbuilderv-api.js`、`src/lib/ui_vue.vue`、`public/about.js`、`src/TestReports.js`，以及 `unitest.runTestAll` / `unitest.runCurrentTestAll`。

## 4. 两条运行链路

### 4.1 GUI 链路

```text
package.json 菜单
  -> extension.js registerRunCommand()
  -> RunTest.main()
  -> 环境检查
  -> 移动端设备选择（ui_vue.js）
  -> 创建缺失的 env.js / jest.config.js
  -> 修改测试配置
  -> run_uni_test() / run_more_test()
  -> core.runCmd()
  -> 【UNI-APP测试】Run Console
```

约束：

- 项目管理器和编辑器传入的参数形状不同，必须经过 `normalizeCommandParam()`。
- `RunTest.main()` 开始时只调用 `setTestOutputView('log', false)` 设置日志目标，不应立即弹出控制台。
- 移动端必须等用户确认设备后再显示控制台；取消窗口时不能弹出空控制台。
- `env.js` 和 `jest.config.js` 缺失时从 `src/template` 创建，已有文件不得覆盖。
- `jest.config.js` 必须在设备选择成功后创建，取消或没有设备时不要修改项目。
- 所有 `run_uni_test()` / `run_more_test()` 调用必须 `await`，否则 `finally` 会过早关闭会话并恢复日志路由。
- 原生重新运行必须复用上一次确认的项目、平台和设备，不得再次打开设备选择窗口。

### 4.2 CLI 链路

```text
package.json contributes.clicommands
  -> extension.js registerCli()
  -> normalizeCliCommandParams()
  -> RunTestForHBuilderXCli_main()
  -> check_cli_args()
  -> RunTestForHBuilderXCli.main()
  -> runCmdForHBuilderXCli()
  -> params.cliconsole
```

约束：

- CLI 日志只能写入 `params.cliconsole`，不能写入 GUI Run Console。
- `--project` 必填，且必须是已存在的目录。
- `--testcaseFile` 未传时表示默认测试范围；只有显式传入但值为空时才报错。
- Android 未传 `--device_id` 时自动发现设备并使用第一个；没有设备时提示用户传入 `--device_id`。
- iOS 真机需要证书、描述文件和密码，并按项目 appid 校验证书。
- `web` 命令要求 `--browser` 为 `chrome|safari|firefox`；独立的 `web-chrome` 等命令不需要该参数。
- 参数是否被用户显式传入，要使用 `params.rawArgv` 判断，不要只看带默认值的 `args`。
- 密码等敏感环境变量输出到日志前必须脱敏。

## 5. 子进程与参数

测试进程统一使用 `spawn(executable, args, options)`。`args` 是参数数组，不要给路径或参数值手工添加 shell 双引号：

```js
// 正确：路径含空格也会作为一个参数传递
const args = [
    config.JEST_PATH,
    '-i',
    '--forceExit',
    `--outputFile=${outputFile}`,
    `--env=${config.UNI_CLI_ENV}`,
];

// 错误：双引号会成为路径本身的一部分
const args = [`"${config.JEST_PATH}"`];
```

不要为了拼接命令改回 `sh -c` / `cmd /C`，这会重新引入空格、转义和注入问题。停止测试必须复用 `src/core/core.js` 的 `stopRunTest()`，并保持进程退出、Promise 收尾和 Run Console 状态一致。

## 6. 原生测试控制台

测试日志使用 `src/hbuilderv-console.js` 创建的原生 Run Console，标题固定为【UNI-APP测试】。不要用 OutputChannel 或 Webview 模拟，因为原生控制台提供筛选、清屏、停止、重启和日志持久显示能力。

- `package.json` 必须保留 `sessionKind: "run"` 和 debugger type `hbuilderv:uni-app-test`。
- `extension.js` 激活时注册 `registerHBuilderVConsole(context)`。
- `runConsoleId` 固定为 `hbuilderv.uni-app-test`，避免重复创建 tab。
- 会话未就绪时允许缓存日志，当前上限为 2000 条。
- 普通日志使用 `stdout`，错误使用 `stderr`，警告使用 `console`；不要把所有日志都标成 `console`，否则会全部显示为黄色。
- Jest `PASS` 日志使用 success/绿色；网络、代理和设备提示使用 warning/警告色。
- 测试报告通过 `createOutputViewForHyperLinks()` 保留可点击路径。
- 停止请求调用 `stopRunTest()`；命令结束后调用 `finishHBuilderVConsole()`。
- 重启处理器由 `setHBuilderVConsoleRestartHandler()` 保存最近一次 GUI 运行逻辑。

修改 debugger 清单后必须重载 HBuilderV，单纯重启 Extension Host 不一定会刷新贡献点。

## 7. 设备获取与选择窗口

### 7.1 设备 API

`src/lib/api_getMobileList.js` 优先调用 `dcloud.hbuilderx-uniapp-features` 导出的公共 CLI API：

```js
const client = api.cli.createClient();
const command = api.cli.createCommand('devices', 'list')
    .option('--platform', platform)
    .booleanOption('--json', true);
```

| 业务平台 | CLI platform | 结果字段 |
| --- | --- | --- |
| iOS 模拟器 | `ios-simulator` | `ios_simulator` |
| iOS 真机 | `ios-iPhone` | `ios_phone` |
| Android | `android` | `android` |
| Harmony | `app-harmony` | `harmony` |

设备输出可能包含时间戳、ANSI 字符、JSON 数组，或 `{ devices }` / `{ data }` 包装。归一化后至少保证 `udid`、`name`、`version` 和必要的 `device_type`。缓存位于 `global.global_devicesList`；显式刷新应绕过缓存。Harmony 在公共 API 不可用时可以回退到命令行设备查询。

### 7.2 Webview Dialog

`src/lib/ui_vue.js` 使用 `vscode.window.openWebviewDialog()`。宿主和 Webview 通过 `ready`、`state`、`refresh`、`setting`、`submit`、`cancel` 消息通信。

- Android、iOS、Harmony 的设备列表样式保持一致。
- 每个平台设备只能 radio 单选，不要显示 checkbox。
- radio 和 checkbox 使用一致的主题色、尺寸和键盘焦点状态。
- 加载前后设备区域高度保持稳定，避免窗口内容跳动。
- 单个设备不能拉伸铺满列表区域。
- 设备名称、类型、系统版本和 UDID 保持单行展示，空间不足时省略，UDID 放最后。
- iOS 搜索框紧邻标题，无边框、无背景，左侧显示搜索图标。
- Debug 日志与运行时日志位于同一行。
- Vapor 开关、字节码、机器码位于同一行；字节码和机器码必须 radio 单选。
- 不显示“视图层编译目标”，不添加多余分隔线。
- 底部按钮保持紧凑，取消按钮必须关闭窗口并结束 Promise。
- Webview HTML 必须使用 nonce 和 CSP；用户或设备数据插入 HTML 前必须转义。

`src/TestCaseCreate.js` 和 `src/lib/ui_ios_cert.js` 同样使用 Webview Dialog。新增对话框时优先复用这些窗口的字号、控件尺寸、主题变量和关闭逻辑。

## 8. 配置、路径与文件格式

### 8.1 HBuilderV 插件路径

不要硬编码 `/Applications/HBuilderV-Alpha.app`、用户扩展版本号或 `~/.hbuilderv-*`。路径统一从 `src/core/config.js` 获取：

1. 优先查询独立扩展 `vscode.extensions.getExtension('dcloud.<plugin>')`。
2. 独立扩展不存在时，从 `dcloud.hbuilderx-uniapp-sdk` 内的 `plugins` 目录回退。
3. macOS SDK 包结构由配置层统一处理。

新增 launcher、编译器或工具路径时，应先扩展 `config.js`，再由运行模块引用。

### 8.2 JSON 与 JSONC

- `package.json` 是严格 JSON：不能写注释、尾逗号或单引号。
- `manifest.json` 等项目文件可能是 JSONC，使用 `jsonc-parser` 或现有公共函数读取。
- 不要用裸 `JSON.parse()` 替换支持注释和尾逗号的读取逻辑。
- 测试报告链接打开后由现有 JSONC 格式化逻辑处理；修改时注意不要破坏超链接范围。

### 8.3 package.json 清单

- 命令必须同时考虑 `contributes.commands`、`contributes.menus` 和 `extension.js` 注册。
- submenu 必须先在 `contributes.submenus` 声明，菜单项中的 `submenu` 必须是字符串 ID。
- `contributes.clicommands[*].args[*].usage` 只接受 `"require"`；可选参数应省略 `usage`，不能写 `"usage": ""`。
- `when` 条件要分别验证项目目录、`pages`、`.test.js`、编辑器右键和项目管理器空白区域等上下文。
- 修改菜单、CLI 参数或 debugger 后必须重新加载 HBuilderV 验证清单解析。

## 9. 配置文件与测试依赖

- 默认测试依赖位于用户 Application Support 下的 `dcloud-uniapp-test/hbuilderv-for-uniapp-test-lib`，不安装到插件目录。
- 普通项目使用外置依赖；uniapp-cli 项目优先使用项目自己的 `node_modules`。
- Web 测试除 npm 依赖外还需要 Playwright 浏览器二进制。
- 自定义依赖目录由 `uniapp-test-cfg.customTestEnvironmentDependencyDir` 控制，并应指向 `node_modules`。
- 默认配置从 `src/template/env.js` 和 `src/template/jest.config.js` 创建。
- 读取 `env.js` 或 `jest.config.js` 失败时，应提示可能存在语法错误，不要静默覆盖用户文件。

## 10. 修改规则

1. 遵循最小 diff，只修改当前任务必需的代码。
2. 不做无关重构、重命名、格式化或依赖升级。
3. 不改变现有文件的缩进、换行和空格风格；禁止运行全仓库格式化。
4. 工作区可能存在用户修改。修改前先看 `git status` 和相关 diff，不得覆盖、还原或顺带提交用户改动。
5. 删除代码前使用 `rg` 确认没有调用方、清单引用或动态命令引用。
6. 新增异步流程必须完整 `await`，并处理取消、异常、进程退出和窗口 dispose。
7. 不把 GUI 日志写到 CLI 控制台，也不把 CLI 日志写到 GUI Run Console。
8. 不根据单个错误日志关键字直接终止所有测试，除非协议或子进程状态能可靠证明必须终止。
9. 不在日志中泄露证书密码、token 或其他敏感环境变量。
10. 未经明确要求，不执行 Git 提交或 push。

## 11. 常见任务流程

### 新增 GUI 平台命令

1. 在 `package.json` 的 `commands` 声明命令。
2. 在对应 submenu 中加入菜单项和正确的 `when` 条件。
3. 在 `extension.js` 的 GUI 命令表中映射平台。
4. 在 `TestCaseRun.js` 增加环境检查、设备选择和运行分支。
5. 在 `config.js` / `edit_env_js_file.js` 增加所需路径和环境变量。
6. 验证 GUI 控制台、停止、重启和报告链接。

### 新增 CLI 平台命令

1. 在 `package.json` 同时声明 command 和 clicommand。
2. 可选参数省略 `usage`，必填参数使用 `"usage": "require"`。
3. 在 `extension.js` 的 CLI 命令表中注册平台。
4. 在 `HBuilder_Cli.js` 校验参数并增加运行分支。
5. 保持所有日志走 `params.cliconsole`。
6. 使用参数数组调用 `spawn()`，不要添加 shell 引号。

### 修改设备窗口

1. 只修改 `src/lib/ui_vue.js`，不要创建新的 `.vue` 镜像文件。
2. 同时检查初始化状态、消息处理、HTML、CSS 和提交值。
3. 验证无设备、单设备、多设备、刷新、过滤、取消和确定。
4. 验证浅色/深色主题以及窗口固定尺寸下无滚动条和内容重叠。

## 12. 验证要求

仓库当前没有完整的自动化测试套件。根据改动范围执行最小但充分的检查。

### JavaScript 修改

```bash
node --check extension.js
node --check src/TestCaseRun.js
node --check src/HBuilder_Cli.js
node --check src/core/core.js
node --check src/lib/ui_vue.js
node --check src/hbuilderv-console.js
```

只检查实际修改过的 JS 文件即可；共享运行链路变化时扩大检查范围。

### 清单修改

```bash
node -e "JSON.parse(require('fs').readFileSync('package.json', 'utf8'))"
git diff --check
```

### 手动回归矩阵

- GUI：打开/取消设备窗口、刷新、设备单选、确定后显示【UNI-APP测试】。
- Console：普通/警告/错误/PASS 颜色、筛选、清屏、停止、重启、切换 tab 后日志保留。
- 报告：`测试报告:` 路径可点击，打开后 JSON 正常格式化。
- 配置：缺失文件按正确时机创建，已有文件不覆盖，语法错误有提示。
- CLI：缺少 `--project`、项目不是目录、可选 `--testcaseFile`、Android 自动选首个设备、含空格路径。
- 平台：按改动范围至少验证 Web、Android、iOS 或 Harmony 中相关平台。

无法在本机完成设备或 HBuilderV UI 测试时，交付说明中必须明确列出未验证项。

## 13. Git 规范

提交信息使用简洁的 Conventional Commits 风格：

```text
feat: 添加新平台支持
fix: 修复 CLI 设备选择
refactor: 统一 HBuilderV API 调用
docs: 更新开发指南
```

提交前确认：

- `git diff --check` 通过。
- 没有误提交 `.vsix`、测试报告、缓存、用户项目文件或敏感信息。
- staged 内容只包含本次任务。
- 用户明确要求 push 时才执行 push。
