# HBuilderV 适配设计说明

本文档记录 `hbuilderx-for-uniapp-test` 在 HBuilderV Extension Host 中的架构、界面约定和容易踩坑的兼容性规则。后续修改应优先遵循本文档和 `AGENTS.md` 的最小 diff 要求。

## 1. 适配边界

本项目原本面向 HBuilderX，业务模块大量使用 `require('hbuilderx')`。HBuilderV 入口仍使用 VS Code Extension Host，但通过 `src/hbuilderv-api.js` 提供 HBuilderX API 兼容层。

`extension.js` 在加载业务模块前将 `hbuilderx` 映射到兼容层：

```js
Module._load = function(request, parent, isMain) {
    if (request === 'hbuilderx') return hx;
    return originalModuleLoad.call(this, request, parent, isMain);
};
```

业务代码应继续调用 `hx`/`hbuilderx` 兼容 API。只有确实属于 HBuilderV 宿主能力的代码，才直接使用 `vscode`，例如 Run Adapter 注册、Output channel 和扩展路径查询。

## 2. HBuilderV API 兼容层

核心文件是 `src/hbuilderv-api.js`，当前适配原则如下：

- `hx.commands.registerCommand`、`registerCliCommand` 映射到 VS Code 命令 API。
- `hx.window.openWebviewDialog`、消息框、输入框、保存文件等能力映射到 HBuilderV 提供的窗口 API。
- 配置读写直接使用 `vscode.workspace.getConfiguration()`，不再经过 HBuilderX 兼容层。
- `hx.extensions.getExtension(id)` 用于获取 HBuilderV 扩展对象和 `extensionPath`，不要假设插件固定安装路径。
- HBuilderV SDK 内置插件路径由 `src/core/config.js` 通过扩展查询获得；若独立扩展不存在，再从 SDK `plugins` 目录回退查找。
- `readJSONValue` 使用 `jsonc-parser` 读取 JSONC，允许配置文件存在注释和尾逗号；不能用裸 `JSON.parse` 替代。
- CLI 运行通过 `params.cliconsole` 输出，GUI 面板日志和 CLI 日志必须分离。

`createOutputView()` 对普通输出仍使用 `vscode.window.createAnsiOutputChannel()`。只有 ID 为 `hbuilderx.uniapp.test.log` 的测试日志视图，才切换到 `src/hbuilderv-console.js` 提供的原生 Run Console 日志桥接。

## 3. 扩展清单与命令注册

### 3.1 清单规则

`package.json` 是严格 JSON：禁止注释、尾逗号和单引号。`menus` 中的 `submenu` 必须是已声明 submenu 的字符串 ID，不能传对象或标题文本，否则 HBuilderV 会报“属性 submenu 是必需项，并且必须为 string 类型”。

命令在 `package.json` 声明，在 `extension.js` 通过 `hx.commands.registerCommand` 注册。命令实现不要只依赖编辑器上下文，因为项目管理器右键、空白区域和编辑器右键传入的参数形状不同；统一经过 `normalizeCommandParam()` 补全 `fsPath`、`workspaceFolder` 和 `document`。

### 3.2 Run Console 清单

测试控制台必须声明为 `sessionKind: "run"` 的 debugger，不能使用 `viewsContainers.panel` 和 Webview 模拟：

```json
"debuggers": [{
  "sessionKind": "run",
  "type": "hbuilderv:uni-app-test",
  "label": "UNI-APP测试"
}]
```

修改 debugger 贡献后必须重新加载/重启 HBuilderV，扩展清单才会重新解析。

## 4. 设备选择窗口

设备选择窗口的唯一实现是 `src/lib/ui_vue.js` 中的 Webview Dialog，不再维护旧的 `.vue` 文件。窗口通过 `hx.window.openWebviewDialog()` 创建，使用 nonce 和 CSP 生成 HTML，宿主与 Webview 之间使用消息协议通信：

- `ready`：Webview 首次加载完成，请求初始状态和设备列表。
- `state`：宿主向 Webview 推送状态。
- `refresh`：刷新 Android、iOS 或 Harmony 设备。
- `setting`：更新 Debug、运行时日志和自动修改 `jest.config.js` 等配置。
- `submit`：校验并提交设备及运行设置。
- `cancel`：取消并返回 `noSelected`。

### 4.1 设备 UI 约定

- iOS、Android、Harmony 使用相同的设备列表样式。
- 每个平台的设备使用 radio 单选，不使用 checkbox；`all` 模式可以分别选择不同平台，但同一平台只能选一个设备。
- radio 和 checkbox 使用统一的 16px 自定义控件样式，并使用 HBuilderV 主题变量控制边框、选中色和焦点色；必须保留键盘 `focus-visible` 和 disabled 状态。
- 设备列表保持紧凑且有合适的最小高度，即使只有一个设备也不能因为选中状态把区域撑满。
- 选中状态使用浅色背景和左侧强调线，避免深蓝色整块高亮或完整描边。
- 设备名称、设备类型、版本和 UDID 在单行内依次显示，空间不足时省略；iOS 设备名称中不重复显示版本信息。
- 各平台使用带 tooltip 的刷新图标；iOS 支持名称/UDID 过滤。
- iOS 过滤输入框紧邻设备区标题，刷新入口位于同一行右侧；输入框无边框并在左侧显示搜索图标，设备数量节点保留但不显示。
- Debug 日志和运行时日志位于同一行。
- Vapor 模式下，“以蒸汽模式运行测试”、字节码、机器码位于同一行；字节码和机器码必须是 radio 单选。
- 不额外显示“视图层编译目标”标题，也不在设备区域下方添加多余 border。
- 取消按钮必须真正关闭当前窗口，并通过 `cancel`/dispose 结束 Promise。
- 底部确定和取消按钮保持紧凑尺寸，避免在设备选择窗口中显得过重。

### 4.2 设备 API

`src/lib/api_getMobileList.js` 是设备列表统一入口，优先使用 `dcloud.hbuilderx-uniapp-features` 暴露的公共 CLI API：

```js
api.cli.createClient();
api.cli.createCommand('devices', 'list')
    .option('--platform', platform)
    .booleanOption('--json', true);
```

平台映射如下：

| UI 平台 | 公共 CLI 平台 | 结果字段 |
| --- | --- | --- |
| iOS 模拟器 | `ios-simulator` | `ios_simulator` |
| iOS 真机 | `ios-iPhone` | `ios_phone` |
| Android | `android` | `android` |
| Harmony | `app-harmony` | `harmony` |

设备 API 必须处理 CLI 输出中的时间戳、ANSI 控制字符、JSON 数组或 `{ devices/data }` 包装对象，并归一化 `udid`、`name`、`version`、`device_type` 字段。结果写入 `global.global_devicesList`，同一平台非刷新请求可以使用缓存。公共 API 不可用时，Harmony 可以回退到 `getHarmonyDeivcesListFormCmd()`。

## 5. 测试日志控制台

### 5.1 原生 Run Console

`createAnsiOutputChannel()` 只会增加“输出”面板里的 channel 选项，Webview View 也无法获得宿主运行控制台标题栏里的原生筛选器。因此测试日志使用 HBuilderV Run Adapter API，创建与 uni-app【WEB】相同类型的原生运行控制台。

该模块负责：

- 通过 `vscode.debug.registerRunAdapterDescriptorFactory()` 注册内联 Run Adapter。
- 通过 `vscode.debug.startDebugging()` 启动 `hbuilderv:uni-app-test` 运行会话。
- 配置固定使用 `runConsoleId: "hbuilderv.uni-app-test"` 和 `runConsoleTitle: "UNI-APP测试"`。
- 既有 `createOutputChannel()` 调用不改，兼容层将日志转换为 DAP `output` 事件。
- 普通日志使用 DAP `stdout`，错误日志使用 `stderr`；不要将全部日志标记为 `console`，否则 HBuilderV 会统一显示为黄色。
- 会话启动完成前最多缓存 2000 条日志，收到 `configurationDone` 后按顺序写入控制台。
- `appendLine()` 中的文件超链接转换为 DAP `source`，测试报告路径仍须支持点击打开。
- 筛选、清屏、滚动和停止入口由 HBuilderV 原生 Run Console 提供，不在 HTML 或 `view/title` 中重复实现。
- 收到 DAP `terminate` 或 `disconnect` 请求时调用 `stopRunTest()`，自然结束时发送 `exited` 和 `terminated` 事件收尾。
- 原生“重新启动”会先停止当前测试并等待 GUI 命令完成，再由新 Run Adapter 调用最近一次测试命令；不能在收到 `terminate` 后立即发送 `terminated`，否则新旧 Jest 进程可能重叠。

### 5.2 日志路由时机

`src/core/core.js` 使用 `activeTestOutputViewID` 管理当前测试输出目标：

- 未指定视图时，写入当前活动测试视图。
- `viewID === 'log'` 时，使用 `hbuilderx.uniapp.test.log`，由 API 兼容层转入原生 Run Console。
- CLI 路径继续使用 `hx.cliconsole.log()`，不要把 CLI 日志写到 GUI Run Console。

GUI 测试命令进入 `RunTest.main()` 后立即调用 `setTestOutputView('log', false)` 设置日志路由，但不主动显示面板。此后的环境检查、依赖检查、配置修改和测试运行日志全部写入独立测试控制台；产生首条日志时才显示面板。移动端在 `select_app_run_devices()` 成功返回、用户点击“确定”之后调用 `setTestOutputView('log')` 主动打开控制台；用户取消或关闭设备窗口且没有日志时，不打开控制台。

GUI 命令通过 `finally` 清理活动输出目标：

```js
return Promise.resolve()
    .then(() => run.main(param, platform, scope))
    .finally(() => {
        setTestOutputView();
        finishHBuilderVConsole();
        return vscode.commands.executeCommand('setContext', 'hbuildervUniappTestRunning', false);
    });
```

测试运行分支必须 `await` `run_uni_test()` 和 `run_more_test()`；否则命令 Promise 会提前完成，`finally` 会过早恢复输出目标，导致后续日志路由错误。

### 5.3 会话控制

停止、重新启动与清屏均使用 Run Console 的原生工具栏。停止按钮发送 DAP `terminate`/`disconnect` 请求，适配器复用 `src/core/core.js` 的 `stopRunTest()`；GUI 命令完成后必须调用 `finishHBuilderVConsole()`，否则控制台会一直保持运行状态。`registerRunCommand()` 通过 `setHBuilderVConsoleRestartHandler()` 保存最近一次 GUI 测试命令，宿主重建 Run Adapter 后再次执行。重启调用 `RunTest.main()` 时必须复用同一项目和平台最近一次确认的设备，不能再次打开设备选择窗口；普通菜单启动仍须显示设备窗口。不要再贡献同名 Webview 按钮或自行绘制筛选输入框。

## 6. 新建自动化测试用例窗口

`src/TestCaseCreate.js` 已从旧的 HBuilderX 表单实现改为 Webview Dialog，当前布局从上到下为：

1. 文件名
2. 保存目录
3. 模板整体选择区
4. 底部取消/创建按钮

文件名和保存目录使用简洁的 `border-bottom` 风格；标题与输入控件同行；模板使用 radio 整体区域。窗口 `body` 使用 `overflow: hidden`，通过固定底部按钮避免出现滚动条。取消、重复文件和非法文件名必须有明确处理。

## 7. 项目路径与运行依赖

运行环境依赖仍由 HBuilderV 插件目录提供，不能硬编码 `/Applications/HBuilderV-Alpha.app` 内部路径。优先通过 `vscode.extensions.getExtension('dcloud.<plugin-id>')` 获取扩展位置，再按平台处理 macOS SDK 包结构；找不到独立扩展时从 `dcloud.hbuilderx-uniapp-sdk` 的 `plugins` 目录回退。

Android、iOS、Harmony 测试依赖 launcher、uniapp CLI、UTS 和 Node 等插件路径，统一从 `src/core/config.js` 导出。新增平台或 launcher 时，应先在路径解析层增加配置，再在运行逻辑中使用。

GUI 与 CLI 启动测试时，都检查项目根目录的 `jest.config.js` 和 `env.js`。GUI 的 `env.js` 在环境检查前创建；GUI 与 CLI 的 `jest.config.js` 必须等设备选择或指定设备成功后再创建，取消或关闭设备窗口、未检测到设备时不能修改项目文件。文件不存在时通过 `Initialize.CreateTestEnvConfigFile()` 从 `src/template` 下的对应默认模板静默创建；已有文件不得覆盖，已有文件加载失败仍按语法错误处理。

## 8. 常见错误与排查

### 菜单报 submenu 类型错误

检查 `package.json` 中所有 `submenu` 值是否为字符串，并且对应 ID 已在 `contributes.submenus` 声明。

### JSON.parse 报 property name 错误

先检查目标文件是否为 JSONC。VS Code 公共 API 不提供任意 JSONC 文件读取能力，业务代码应直接使用 `jsonc-parser`，以支持注释和尾逗号。`package.json` 本身仍必须是严格 JSON。

### 日志没有进入独立 tab

按以下顺序检查：

1. HBuilderV 是否已重新加载清单。
2. `extension.js` 是否注册 `registerHBuilderVConsole(context)`。
3. `package.json` 是否声明 `sessionKind: "run"` 和 `type: "hbuilderv:uni-app-test"`。
4. `RunTest.main()` 是否先调用 `setTestOutputView('log', false)` 设置路由，并在用户确认设备后调用 `setTestOutputView('log')`。
5. `hbuilderv-api.js` 是否只对 `hbuilderx.uniapp.test.log` 使用 Run Console 桥接。

### 设备窗口取消后控制台仍弹出

不能在 `registerRunCommand()` 入口主动显示测试控制台。应在 `RunTest.main()` 使用 `setTestOutputView('log', false)` 仅设置路由，并等待设备选择 Promise 成功返回后再调用 `setTestOutputView('log')` 主动显示；取消、关闭和无设备且未产生日志时不应弹出控制台。

## 9. 验证清单

每次涉及 HBuilderV 适配、清单、Run Console、Webview 或日志路由的修改，至少执行：

```bash
node --check extension.js
node --check src/TestCaseRun.js
node --check src/hbuilderv-api.js
node --check src/hbuilderv-console.js
node src/test/test.js
node -e "JSON.parse(require('fs').readFileSync('package.json'))"
git diff --check
```

修改设备 Webview 或 Run Console 时还应手动验证：打开/取消设备窗口、设备单选、刷新设备、确定后控制台显示、原生筛选与清屏、停止测试、测试报告链接、切换控制台后的日志保留、CLI 日志隔离，以及 HBuilderV 重启后【UNI-APP测试】运行控制台是否正常创建。
