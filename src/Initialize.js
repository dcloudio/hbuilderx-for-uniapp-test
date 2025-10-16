/**
 * @description 初始化测试环境
 * @date 2021-06-05
 */

const hx = require('hbuilderx');
const fs = require('fs');
const path = require('path');

const {
    isUniAppCli,
    createOutputChannel,
    hxShowMessageBox,
    checkCustomTestEnvironmentDependency
} = require('./core/core.js');

const {
    mkdirsSync
} = require('./utils/utils_files.js');

let {
    testReportOutPutDir,
    UTS_USER_DATA_PATH,
    HBuilderX_NPM_PATH
} = require('./core/config.js');

const os = require('os');
const osName = os.platform();

// 当前忽略升级
let current_ignore_upgrade = false;

class Common {
    constructor() {};

    createFile(filename, template_path, target_path, isPrint=false) {
        let msg = `uni-app自动化测试配置文件 ${filename} 创建`;
        return new Promise((resolve, reject) => {
            fs.copyFile(template_path, target_path, (err) => {
                if (err) {
                    createOutputChannel( msg + '失败。', 'error');
                    reject(err);
                };
                if (isPrint) {
                    createOutputChannel( msg + '成功', 'success');
                };
                resolve('success');
            });
        });
    };
}


/**
 * @description 创建测试配置文件、以及检查测试环境
 */
class Initialize extends Common {
    constructor() {
        super();
    };

    /**
     * @description 创建测试配置文件 jest.config.js、env.js
     * @param {String} projectPath - 项目路径
     */
    async CreateTestEnvConfigFile(projectPath, file_type, is_hbuidlerx_cli) {
        let jestConfigFile = path.join(projectPath, 'jest.config.js');
        let jestEnvFile = path.join(projectPath, 'env.js');
        let isPrintLog = is_hbuidlerx_cli ? false : true;

        // 检查jest.config.js是否存在，如不存在，则创建
        if (file_type == 'all' || file_type == 'jest.config.js') {
            if (!fs.existsSync(jestConfigFile)){
                let jest_template_path = path.join(path.resolve(__dirname), 'template', 'jest.config.js');
                await this.createFile("jest.config.js", jest_template_path, jestConfigFile, isPrintLog);
            } else {
                createOutputChannel('uni-app自动化测试配置文件 jest.config.js 已存在，跳过创建。', 'info');
            };
        };


        // 检查env.js是否存在，如不存在，则创建
        if (file_type == 'all' || file_type == 'env.js') {
            if (!fs.existsSync(jestEnvFile)){
                let env_template_path = path.join(path.resolve(__dirname), 'template', 'env.js');
                await this.createFile('env.js', env_template_path, jestEnvFile, isPrintLog);
            } else {
                createOutputChannel('uni-app自动化测试配置文件 env.js 已存在，跳过创建。', "info");
            };
        };
    };

    /**
     * @description 拉起HBuilderX终端，自动安装依赖
     * @param {String} runDir
     * @param {Object} actions
     * @param {String} cmd
     */
    async installTestLibs(runDir, actions, cmd) {
        if (cmd == undefined) {
            cmd = `"${HBuilderX_NPM_PATH}" install --save --registry=https://registry.npmmirror.com`
        };
        let { action, source_file, target_file} = actions;
        let Notes = `\n\n安装方式：\n1. 命令行进入 ${runDir}目录 \n2. 输入 ${cmd}`

        let prompt = action == 'upgrade'
            ? `自动化测试环境，依赖的jest、adbkit、puppeteer等库有更新，请选择是否更新？ \n\n强烈建议您选择更新。更新升级命令，请参考控制台输出。`
            : `自动化测试环境，需要安装jest、adbkit、puppeteer等库，是否安装？安装环境之后，才可以正常使用此插件。 ${Notes}`;
        let title = action == 'upgrade' ? '更新uni-app自动化测试依赖' : '安装uni-app自动化测试依赖';
        let btn = await hxShowMessageBox(title, prompt, ['去升级', '忽略升级']).then( btn => {
            return btn;
        });
        if (['好的', '去升级'].includes(btn) && action == 'upgrade') {
            await this.createFile("package.json", source_file, target_file);

			const cmd_npm_install = `npm install --save --registry=https://registry.npmmirror.com`;
			const test_lib_dir = path.dirname(target_file);
            let msg = `升级方法: 打开操作系统终端，进入 ${test_lib_dir} 目录，执行 ${cmd_npm_install}`;
            createOutputChannel(msg, 'error');
        };
        return btn;
    };

    /**
     * @description 检查测试环境
     * @param {type} isReload 用于菜单【运行】【检查测试环境】
     * @return {Boolean}
     */
    async checkPluginDependencies(isReload=false, terminal_id = "") {
        let logger = createOutputChannel;
        if (terminal_id) {
            logger = async function (message) {
                await hx.cliconsole.log({ clientId: terminal_id, msg: message, status: 'Info' });
            };
        };

        let test_lib_dir = path.join(hx.env.appRoot, "plugins", "hbuilderx-for-uniapp-test-lib");
        mkdirsSync(test_lib_dir);

        // 复制模板package.json -> hbuildrx-for-uniapp-test-lib/package.json
        let templage_package_path = path.join(__dirname, 'environment', 'package.json')
        let lib_package_path = path.join(test_lib_dir, 'package.json');
        if (!fs.existsSync(lib_package_path)) {
            await this.createFile("package.json", templage_package_path, lib_package_path);
        };

        // 主要是检查设置项：hbuilderx-for-uniapp-test.customTestEnvironmentDependencyDir。
        let isCustomEnv = await checkCustomTestEnvironmentDependency();
		// console.error(`【hbuilderx-for-uniapp-test】自定义测试依赖设置项: ${isCustomEnv}`);

        if (isCustomEnv) {
            try {
                if (fs.existsSync(isCustomEnv)) {
                    test_lib_dir = path.dirname(isCustomEnv);
					// console.error(`【hbuilderx-for-uniapp-test】自定义测试依赖设置项: test_lib_dir = ${test_lib_dir}`);
                    lib_package_path = path.join(test_lib_dir, 'package.json');
                };
            } catch (error) {}
        };

        let test_lib_node_modules_dir = path.join(test_lib_dir, 'node_modules');
		// console.error(`【hbuilderx-for-uniapp-test】test_lib_node_modules_dir: ${test_lib_node_modules_dir}`);

        if (!fs.existsSync(test_lib_node_modules_dir)) {
			await logger("", 'info');

			const msg_0 = "uniapp自动化测试环境，需要安装jest、adbkit、puppeteer等库，安装相关依赖之后，才可以正常使用此插件."
			await logger(msg_0, 'error');

            const cmd_npm_install = `npm install --save --registry=https://registry.npmmirror.com`;
            let msg_1 = `方法1：打开操作系统终端，进入 ${test_lib_dir} 目录，执行 ${cmd_npm_install}`;
            await logger(msg_1, 'info');

            const doc_url = "https://uniapp.dcloud.net.cn/worktile/auto/hbuilderx-extension/#share-test-libs"
            let msg_2 = `方法2：如果您电脑上安装了HBuilderX 正式版、Dev、Alpha版本，是否每个程序都重新安装一遍测试依赖？答案：不需要。解决办法参考: ${doc_url}\n`;
            await logger(msg_2, 'info');
            return false;
        };

        let template_package_json_content = require('./environment/package.json');
        let lib_package_json_content = require(lib_package_path);

        let lib_version = lib_package_json_content['version'];
        let template_version = template_package_json_content['version'];

        let actions = {
            'action': '',
            'source_file': templage_package_path,
            'target_file': lib_package_path,
        };

        if (lib_version != template_version && terminal_id == "") {
            if (current_ignore_upgrade) return true;
            actions['action'] = 'upgrade';
            const _i_result = await this.installTestLibs(test_lib_dir, actions);
            if (["忽略升级"].includes(_i_result)) {
                current_ignore_upgrade = true;
                return true;
            };
            return false;
        };
        if (lib_version != template_version && terminal_id != "") {
            await logger(`[uniapp.test] 建议：uni-app自动化测试插件，检测到依赖库有更新，请在菜单【运行 - uni-app自动化测试辅助插件 - 重装测试环境依赖】中，重新安装依赖。`, 'warning');
        };

        // 检查依赖
        let template_dependencies  = template_package_json_content['dependencies'];
        let dependencies = Object.keys(template_dependencies);
        let msg = '';
        for (let s of dependencies) {
            let dependencies_path = path.join(test_lib_dir, 'node_modules', s);
            try{
                require(dependencies_path);
            }catch(e){
                msg = msg + s + ' '
            };
        };

        if (msg) {
            await logger(`uni-app自动化测试插件运行缺少必要的依赖 ${msg}，请安装相关依赖。`, 'warning');
            await logger(`方法1: 打开终端，进入 ${test_lib_dir} 目录，运行命令： npm install --save`);
            await logger(`方法2: 点击HBuilderX 顶部菜单【运行 - uni-app自动化测试辅助插件 - 重装测试环境依赖】`);
            return false;
        } else {
            if (isReload) {
                await logger(`uni-app自动化测试插件，环境检查无误，无需重装。`, 'success');
            };
            return true;
        }
    };

    /**
     * 检查uniapp-cli项目，当用户项目为uniapp-cli项目时，运行则使用项目下的node_modules
     * @param {String} projectPath 项目路径
     * @return {Boolean}
     */
    async checkUniappCliProject(projectPath, terminal_id = "") {
        let logger = createOutputChannel;
        if (terminal_id) {
            logger = async function (message) {
                await hx.cliconsole.log({ clientId: terminal_id, msg: message, status: 'Info' });
            };
        };

        if (!fs.existsSync(projectPath)) {
            await logger(`uniapp-cli项目，检查环境依赖，${projectPath}不存在。`, 'error');
            return false;
        };
        let template_package_json_content = require('./environment/package.json');
        let template_dependencies  = template_package_json_content['dependencies'];
        let dependencies = Object.keys(template_dependencies);

        let msg = '';
        for (let s of dependencies) {
            let dependencies_path = path.join(projectPath, 'node_modules', s);
            try{
                require(dependencies_path);
            }catch(e){
                msg = msg + s + ' '
            };
        };

        if (msg) {
            await logger(`uniapp-cli项目，${projectPath} 自动化测试运行缺少必要的依赖 ${msg}，需要安装相关依赖。`, 'warning');
            await logger(`如果自动安装失败，打开终端，进入 ${projectPath} 目录，运行命令： npm install --save ${msg}`, 'info');
            if (terminal_id == "") {
                this.installTestLibs(projectPath, {}, `npm install --save ${msg}`);
            };
            return false;
        };
        return true;
    };

    /**
     * @description 初始化环境
     */
    async main(param) {
        let projectPath;
        try{
            projectPath = param.workspaceFolder.uri.fsPath;
        }catch(e){
            createOutputChannel('插件运行异常，获取项目路径失败，请在项目管理器项目上进行操作。如果还无法解决，请联系插件作者或到DCLOUD论坛反馈。', 'error');
            return;
        };

        // 创建：测试配置文件
        await this.CreateTestEnvConfigFile(projectPath, 'all');

        // 检查默认测试报告目录，如不存在则自动创建
        await mkdirsSync(testReportOutPutDir);

        // 检查uts cache目录，如不存在则自动创建
        await mkdirsSync(UTS_USER_DATA_PATH);

        // 判断是普通项目还是uniapp-cli项目
        let is_uniapp_cli = await isUniAppCli(projectPath);

        try{
            if (is_uniapp_cli) {
                await this.checkUniappCliProject(projectPath)
            } else {
                await this.checkPluginDependencies();
            };
        }catch(e){
            createOutputChannel('检查环境依赖时，代码运行异常，请联系插件作者。')
        };
    };

};

module.exports = Initialize;
