# uni-app x SDK CLI 公共 API 使用说明

本文档面向需要在其他 VS Code 插件中调用 uni-app x SDK CLI 的开发者。

公共能力由内置插件 `dcloud.hbuilderx-uniapp-features` 提供。消费插件只负责描述命令、传入业务参数和处理业务结果，不得自行使用 `execFile`、`spawn` 或 shell 再封装一套 CLI 调用机制。

## 能力边界

公共 API 统一处理：

- 由基础插件内部解析和校验 CLI 路径，消费插件不能读取或覆盖路径。
- 在业务命令前执行 `cli open`，确保 uni-app x SDK 宿主进程已启动。
- 合并 Node.js 进程环境和基础插件维护的公共环境变量。
- 注入 `--host` 等全局参数。
- 使用非 shell 方式执行命令。
- 生成已经遮蔽敏感参数的命令预览。
- 支持有界执行、流式进程、超时和取消。

消费插件负责：

- 选择 CLI 命令和参数。
- 判断使用 `execute()` 还是 `spawn()`。
- 解析命令专有的文本或 JSON 输出。
- 根据业务语义处理非零退出码。
- 管理流式进程的 stdout、stderr 和退出状态。

## 前置条件

### 声明扩展依赖

消费插件的 `package.json` 必须声明：

```json
{
  "extensionDependencies": [
    "dcloud.hbuilderx-uniapp-features"
  ]
}
```

完整扩展 ID 必须包含 publisher，即 `dcloud.hbuilderx-uniapp-features`。

### CLI 路径来源

CLI 路径由基础插件内部管理，默认通过
`vscode.extensions.getExtension("dcloud.hbuilderx-uniapp-sdk")` 获取 uni-app x SDK 的实际安装目录，并校验
SDK CLI 是否存在且可执行。消费插件不能传入 `cliPath`，不得扫描扩展安装目录、拼接 SDK
版本目录或从 `launch.json` 读取路径。

CLI 缺失不会阻止内置插件激活。用户实际使用运行、打包或公共 CLI API 时，基础插件会显示统一
安装引导，并临时通过 `vscode.extensions.installExtensionFromCoreOrMarkets` 按 SDK 插件 ID 安装；
原有分平台下载和本地 VSIX 安装实现继续保留但暂不调用。SDK 已安装但 CLI 不完整时提示重新安装。
同一时间只显示一个引导。激活和安装完成阶段都不调用 CLI。
每次业务调用都进入统一 readiness。新 SDK 会话执行 `open`、版本校验、当前全部 Vapor 工作区项目
导入、账号同步和全量配置同步；项目导入通过 `project open --path <absolute-project-path>` 串行执行，
单工作区只处理当前项目，多根工作区处理全部 Vapor 项目，其他项目类型跳过；
已初始化会话直接复用状态并处理账号或配置 dirty 状态，不额外执行探活命令。真实短命令返回断连
诊断时会重新初始化并自动重试一次。SDK 版本通过安装包内 `about/package.json` 获取，并与
`vscode.hbuilderxVersion` 精确匹配，版本不一致时阻断当前业务调用。下载地址配置和流程见
`sdk-delivery.md`。版本不一致会显示模态升级入口并阻断当前业务调用；升级完成后下一次调用重新初始化。

消费插件如需将 SDK CLI 路径传给不受本插件管理的兼容能力，可调用：

```ts
const sdkCliPath = cliApi.getSdkCliPath();
```

该方法只返回 `dcloud.hbuilderx-uniapp-sdk` 插件内的 CLI 绝对路径，不采用内部开发设置
`uniApp.cliPath`，不会触发下载或安装提示。SDK 未安装、当前平台不受支持或安装不完整时返回
`undefined`。常规 CLI 命令仍应通过 `createClient()` 执行，不应使用该路径自行重复封装进程调用。

### SDK 预检

消费插件可以在业务操作前调用 `checkSdk()`，独立检查当前生效 CLI 的存在性、可执行性和 SDK 版本：

```ts
const check = await cliApi.checkSdk({ notify: "modal" });
if (!check.ok) {
  return;
}
```

预检不执行 `open`、项目导入、账号同步或配置同步。`notify` 支持 `none`、`notification` 和 `modal`，默认是
`none`；分别表示不提示、右下角通知和模态弹框。CLI 未安装、安装不完整、版本读取失败或版本不匹配时，
`ok` 为 `false`。内部开发设置 `uniApp.cliPath` 生效时，版本校验按内部规则跳过，并返回
`versionCompatible: "skipped"`。

预检结果不是永久授权。SDK 状态可能在预检后变化，因此真实的 `execute()` 和 `spawn()` 仍会执行完整
readiness 并再次拦截不可用状态；外部插件在 `ok` 为 `false` 时不应继续调用 CLI。

### 获取 TypeScript 类型

运行时扩展依赖和 TypeScript 类型依赖是两件事。`extensionDependencies` 能保证运行时插件存在，但不会自动让 TypeScript 编译器找到另一个扩展的声明文件。

本插件通过 `package.json#types` 发布 `out/api/index.d.ts`。在同一源码工作区或构建系统中，应将 `hbuilderx-uniapp-features` 作为仅开发期依赖提供给消费插件，然后使用 type-only import：

```ts
import type { UniAppExtensionApi } from "hbuilderx-uniapp-features";
```

type-only import 不会在消费插件运行时执行本插件模块。运行时只能通过 VS Code 扩展激活 API 访问能力，禁止 `require()` 本插件的 `out/cli/*` 文件。

如果当前构建系统暂时不能提供包级类型依赖，可以在消费插件中声明最小结构类型；该类型只用于编译，不得复制 CLI 执行实现。长期应以本插件发布的声明为准。

## 激活并获取 API

建议集中封装一次 API 获取逻辑：

```ts
import * as vscode from "vscode";
import type { UniAppExtensionApi } from "hbuilderx-uniapp-features";

const EXTENSION_ID = "dcloud.hbuilderx-uniapp-features";
const SUPPORTED_API_VERSION = 1;

export async function getHBuilderXCliApi(): Promise<UniAppExtensionApi["cli"]> {
  const extension = vscode.extensions.getExtension<UniAppExtensionApi>(EXTENSION_ID);
  if (!extension) {
    throw new Error(`未找到内置插件 ${EXTENSION_ID}。`);
  }

  const api = await extension.activate();
  if (api.version !== SUPPORTED_API_VERSION) {
    throw new Error(`不支持的 uni-app x SDK CLI API 版本：${api.version}。`);
  }

  return api.cli;
}
```

不要缓存未完成的激活过程以外的内部对象，也不要修改返回的 API。激活结果和 `api.cli` 都是只读门面。

## 快速开始

```ts
const cliApi = await getHBuilderXCliApi();
const client = cliApi.createClient();
const command = cliApi.createCommand("--help");
const result = await client.execute(command, {
  timeout: 30_000,
  maxBuffer: 2 * 1024 * 1024
});

if (result.code !== 0) {
  throw new Error(result.stderr || `CLI 退出码：${result.code}`);
}

console.log(result.stdout);
```

普通调用使用无参数 `createClient()` 即可。消费插件不需要也不能传入 `cliPath`、环境变量或基础全局参数。

## 创建客户端

公开选项如下：

```ts
interface UniAppCliClientOptions {
  cwd?: string;
}
```

### 无参数调用

```ts
const client = cliApi.createClient();
```

适合以下场景：

- CLI 命令不依赖进程工作目录。
- CLI 路径由基础插件统一管理。
- 命令通过绝对路径或明确参数定位项目。

### 指定工作目录

```ts
const client = cliApi.createClient({
  cwd: workspaceFolder.uri.fsPath
});
```

`cwd` 只用于设置 CLI 子进程工作目录。

如果命令针对某个工作区项目，建议显式传入对应 `WorkspaceFolder` 的路径，不要始终使用 `workspaceFolders[0]`。

### host 参数

消费插件不能控制 host。基础插件仅通过隐藏设置 `uniApp.useHost` 统一决定是否为全部适用的
CLI 调用追加 `--host HBuilderX-extension`。该设置不属于公共 API，也不受 `launch.json` 影响；
包括前置 `cli open` 和版本查询在内的所有 CLI 调用均遵循该设置。

## 构造命令

命令路径按层级传入：

```ts
const command = cliApi.createCommand("devices", "list");
```

等价于：

```text
cli devices list
```

### 普通参数

```ts
command.option("--project", projectPath);
command.option("--timeout", 600);
```

值为 `undefined` 或空字符串时不会追加。数字 `0` 会正常保留。
`--project` 是特殊硬约束参数，值必须是项目绝对路径；相对路径会立即抛出错误。
参数名为空时会立即抛出错误，避免生成不可诊断的空参数。

### 显式布尔参数

```ts
command.booleanOption("--json", true);
command.booleanOption("--cleanCache", false);
```

分别生成：

```text
--json true --cleanCache false
```

### 无值开关

```ts
command.flag("--cloud", useCloud);
```

只有第二个参数为 `true` 时追加 `--cloud`。

### 位置参数

```ts
command.argument(projectPath);
```

### 重复参数

```ts
command.repeatableOption("--file", ["a.uts", "b.uts"]);
```

生成：

```text
--file a.uts --file b.uts
```

### 原始参数

```ts
command.appendRaw(extraArgs);
```

`appendRaw()` 只用于暂未形成稳定类型的兼容参数。它不识别参数语义，也不会自动遮蔽敏感值。密码、Token、私钥等数据禁止通过 `appendRaw()` 传递。

### 敏感参数

```ts
command.option("--password", password, { sensitive: true });
```

真实执行参数保持不变，但 `formatCommand()` 和 `result.commandLine` 中会显示为：

```text
--password ******
```

禁止把 `command.toArgs()` 或真实业务参数写入普通日志。

## 有界执行 execute

适合设备列表、版本查询、基座信息、打包状态等会结束并返回有限输出的命令。

```ts
const command = cliApi.createCommand("devices", "list")
  .option("--platform", "android")
  .booleanOption("--json", true);

const result = await client.execute(command, {
  timeout: 15_000,
  maxBuffer: 2 * 1024 * 1024,
  signal: abortController.signal
});
```

结果结构：

```ts
interface HBuilderXCliResult {
  code: number;
  signal?: string;
  stdout: string;
  stderr: string;
  commandLine: string;
}
```

行为约定：

- 业务命令非零退出时，`execute()` 正常返回结果，不自动抛错。
- 调用方必须结合 `code` 和业务协议判断成功或失败。
- CLI 可执行文件启动失败时，`stderr` 包含 Node.js 原始错误描述。
- 前置 `cli open` 失败时会抛出异常，业务命令不会继续执行。
- `commandLine` 已遮蔽敏感参数，可以用于命令预览和普通日志。
- stdout 和 stderr 保持分离，不自动合并。

JSON 命令应使用对应 CLI 的 JSON 参数，并在业务层处理 uni-app x SDK 时间戳前缀。不要把 JSON 解析加入公共客户端。

## 流式执行 spawn

适合 `launch`、`logcat`、持续监听和其他长时间运行的任务。

```ts
const controller = new AbortController();
const command = cliApi.createCommand("launch", "app-android")
  .option("--project", projectPath)
  .option("--deviceId", deviceId);

const child = await client.spawn(command, {
  signal: controller.signal
});

child.stdout.on("data", (chunk) => {
  handleStdout(chunk.toString("utf8"));
});

child.stderr.on("data", (chunk) => {
  handleStderr(chunk.toString("utf8"));
});

child.once("close", (code, signal) => {
  handleExit(code, signal);
});

// 用户取消或插件释放资源时：
controller.abort();
```

行为约定：

- `spawn()` 是异步方法，因为它会先等待 `cli open`。
- 返回后得到标准 Node.js `ChildProcessWithoutNullStreams`。
- 启动前 signal 已取消时，`spawn()` 抛出 `AbortError`。
- 进程运行期间 signal 被取消时，公共客户端会终止子进程。
- 调用方仍应监听 `error` 和 `close`，并清理自己的业务状态。
- 插件 `deactivate` 或业务对象 `dispose` 时必须取消或终止仍在运行的进程。

### 命令执行期间的二次交互

`execute()` 和 `spawn()` 的 options 支持可选 `onRequest`。只有当前调用配置该回调时，基础层才会
启动隔离的本地 JSON-RPC 会话并自动追加 `--jsonrpc`：

```ts
await client.spawn(command, {
  signal,
  onRequest: async request => {
    if (request.method !== "example.select") {
      throw new Error(`不支持的 CLI 交互请求：${request.method}`);
    }
    return selectFromUi(request.params, request.signal);
  }
});
```

请求处理器按单次调用配置，不属于 `createClient()`。普通调用不启动服务、不注入环境，也不改变命令
参数。协议、安全边界和 Plugin Host 接入见 `docs/cli-interaction.md`。

## 命令预览

```ts
const preview = client.formatCommand(command);
```

返回包含 CLI 绝对路径、业务参数、公共参数和 host 的可展示命令，并遮蔽敏感值。该方法只生成预览，不执行 `cli open` 或业务命令。

## 自动启动 uni-app x SDK

除显式执行 `open` 外，每个 `execute()` 和 `spawn()` 都会先调用：

```text
cli open
```

规则如下：

- `cli open` 与其他 CLI 调用统一追加已配置的全局参数。
- 相同 CLI 路径和宿主路由参数上的调用共享同一个 open 状态，不因业务工作目录不同而重复启动。
- open 完成后才启动业务命令，避免 uni-app x SDK 尚未启动时发生连接竞争。
- open 失败会终止当前业务调用并返回可读异常。

消费插件通常不需要主动调用 `ensureOpen()`。

## 多工作区建议

单项目窗口可以直接：

```ts
const client = cliApi.createClient();
```

多根工作区中，应根据当前资源选择对应目录：

```ts
function createClientForUri(cliApi: UniAppExtensionApi["cli"], uri: vscode.Uri) {
  const folder = vscode.workspace.getWorkspaceFolder(uri);
  if (!folder) {
    throw new Error("当前文件不属于工作区。");
  }

  return cliApi.createClient({ cwd: folder.uri.fsPath });
}
```

不要默认选取第一个工作区目录，否则可能读取错误的作用域配置或在错误项目目录执行命令。

## 错误处理建议

统一区分三类错误：

1. CLI 来源错误：有效测试路径优先；测试路径无效时回退 SDK。SDK 缺失时提供安装引导，SDK 不完整时提示重新下载安装。
2. 基础启动错误：`execute()` 或 `spawn()` 在 `cli open` 失败时拒绝 Promise。
3. 业务错误：`execute()` 返回非零 `code`，或 `spawn()` 最终以非零状态退出。

推荐模板：

```ts
try {
  const client = cliApi.createClient();
  const result = await client.execute(command, {
    timeout: 30_000
  });

  if (result.code !== 0) {
    const detail = result.stderr.trim() || result.stdout.trim();
    throw new Error(detail || `uni-app x SDK CLI 退出码：${result.code}`);
  }

  return result.stdout;
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  void vscode.window.showErrorMessage(message);
  throw error;
}
```

不要只根据退出码解释业务结果。某些 CLI 命令可能通过 JSON 字段表达最终业务状态，调用方应遵守该命令的正式输出协议。

## API 版本兼容

当前版本：

```text
api.version === 1
```

消费插件必须在激活后检查版本。规则如下：

- 向后兼容地增加可选能力时保持当前版本。
- 删除字段、修改字段语义或改变核心执行行为时提升主版本。
- 消费插件不得依赖未写入公开声明和本文档的内部字段。
- 禁止访问本插件的 `out/cli/api.js`、`out/cli/client.js` 等内部文件。

## 不推荐的用法

```ts
// 错误：重复创建进程调用层。
execFile(cliPath, args);

// 错误：引用另一个扩展的内部构建文件。
require(".../dcloud.hbuilderx-uniapp-features/out/cli/client.js");

// 错误：自行读取或猜测 uni-app x SDK 安装目录。
const cliPath = "/path/to/uni-app-x-sdk/cli";

// 错误：把密码放入不会脱敏的原始参数。
command.appendRaw(["--password", password]);
```

## 接入检查清单

- 已声明 `extensionDependencies`。
- 使用完整扩展 ID `dcloud.hbuilderx-uniapp-features`。
- 只通过 `extension.activate()` 获取公共 API。
- 普通场景使用无参数 `createClient()`。
- 多根工作区按资源传入正确的 `cwd`。
- 短任务使用 `execute()`，长进程使用 `await spawn()`。
- 为短任务设置合理的 timeout 和 maxBuffer。
- 长进程支持取消，并监听 error 和 close。
- 敏感值使用 `{ sensitive: true }`。
- 不自行读取 CLI 路径、注入公共环境或执行 `cli open`。
- 不引用本插件内部构建文件。
- 检查 `api.version`。
