/**
 * @description 初始化测试环境
 * @date 2021-06-05
 */

const hx = require('hbuilderx');
const fs = require('fs');
const path = require('path');

const {
    installTerminal,
    isUniAppCli,
    mkdirsSync,
    createOutputChannel,
    hxShowMessageBox,
    openAndRunTerminal,
    checkCustomTestEnvironmentDependency
} = require('./lib/utils.js');

let {
    testReportOutPutDir,
    UTS_USER_DATA_PATH,
    HBuilderX_NPM_PATH
} = require('./config.js')

const os = require('os');
const osName = os.platform();

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
    async CreateTestEnvConfigFile(projectPath) {
        let jestConfigFile = path.join(projectPath, 'jest.config.js');
        let jestEnvFile = path.join(projectPath, 'env.js');

        // 检查jest.config.js是否存在，如不存在，则创建
        if (!fs.existsSync(jestConfigFile)){
            let jest_template_path = path.join(path.resolve(__dirname), 'template', 'jest.config.js');
            await this.createFile("jest.config.js", jest_template_path, jestConfigFile, true);
        } else {
            createOutputChannel('uni-app自动化测试配置文件 jest.config.js 已存在，跳过创建。', 'info');
        };

        // 检查env.js是否存在，如不存在，则创建
        if (!fs.existsSync(jestEnvFile)){
            let env_template_path = path.join(path.resolve(__dirname), 'template', 'env.js');
            await this.createFile('env.js', env_template_path, jestEnvFile, true);
        } else {
            createOutputChannel('uni-app自动化测试配置文件 env.js 已存在，跳过创建。', 'info');
        };
    };

    /**
     * @description 拉起HBuilderX终端，自动安装依赖
     * @param {String} runDir
     * @param {Object} actions
     * @param {String} cmd
     */
    async install(runDir, actions, cmd) {
        if (cmd == undefined) {
            cmd = `"${HBuilderX_NPM_PATH}" install --save --registry=https://registry.npmmirror.com`
        };
        let { action, source_file, target_file} = actions;
        let Notes = `\n\n安装方式：命令行进入 ${runDir}目录，输入 ${cmd}`

        let prompt = action == 'upgrade'
            ? `自动化测试环境，依赖的jest、adbkit、puppeteer等库有更新，请选择是否更新？ \n\n强烈建议您选择更新。${Notes}`
            : `自动化测试环境，需要安装jest、adbkit、puppeteer等库，是否安装？安装环境之后，才可以正常使用此插件。 ${Notes}`;
        let title = action == 'upgrade' ? '安装uni-app自动化测试依赖' : '更新uni-app自动化测试依赖';
        let btn = await hxShowMessageBox(title, prompt, ['好的', '关闭']).then( btn => {
            return btn;
        });

        if (osName != 'darwin') {
            let drive = runDir.substr(0,1);
            cmd = `${drive}: && cd "${runDir}" && ${cmd}`
        } else {
            cmd = `cd ${runDir} && ` + cmd;
        };

        if (btn == '好的' && action == 'upgrade') {
            await this.createFile("package.json", source_file, target_file);
            // openAndRunTerminal(runDir, cmd);
        };
        if (btn == '好的' && osName == 'darwin') {
            openAndRunTerminal(runDir, cmd);
        };
        return btn;
    };

    /**
     * @description 检查测试环境
     * @param {type} isReload 用于菜单【运行】【检查测试环境】
     * @return {Boolean}
     */
    async checkPluginDependencies(isReload=false) {
        let test_lib_dir = path.join(hx.env.appRoot, "plugins", "hbuilderx-for-uniapp-test-lib");
        mkdirsSync(test_lib_dir);

        // 复制模板package.json -> hbuildrx-for-uniapp-test-lib/package.json
        let templage_package_path = path.join(__dirname, 'environment', 'package.json')
        let lib_package_path = path.join(test_lib_dir, 'package.json');
        if (!fs.existsSync(lib_package_path)) {
            await this.createFile("package.json", templage_package_path, lib_package_path);
        };

        let actions = {
            'action': '',
            'source_file': templage_package_path,
            'target_file': lib_package_path,
        };

        // 主要是检查设置项：hbuilderx-for-uniapp-test.customTestEnvironmentDependencyDir。
        // 如果有自定义的测试环境，则使用自定义设置。
        // 由于此项主要是用于内部调试，此处不对设置项的准确性进行检查。
        let isCustomEnv = await checkCustomTestEnvironmentDependency();
        if (isCustomEnv) return true;

        // 检查终端是否安装
        let terminalName = osName == "win32" ? "builtincef3terminal" : "builtinterminal";
        let terminalDir = path.join(hx.env.appRoot, "plugins", terminalName, "package.json")
        if (!fs.existsSync(terminalDir)) {
            installTerminal();
            return;
        };

        let test_lib_node_modules_dir = path.join(test_lib_dir, 'node_modules');
        if (!fs.existsSync(test_lib_node_modules_dir)) {
            let installResult = await this.install(test_lib_dir, actions);
            if (installResult == '是') {
                createOutputChannel(`提醒：uni-app自动化测试插件，正在安装相关依赖；在安装完成之前，请不要关闭终端。`, 'info');
                const log_for_npm_install = `npm install --save --registry=https://registry.npmmirror.com`;
                createOutputChannel(`提醒：如果自动安装失败，请在终端进入 ${test_lib_dir} 目录，手动执行 ${log_for_npm_install}。\n`, 'warning');
            };
            return false;
        };

        let template_package_json_content = require('./environment/package.json');
        let lib_package_json_content = require(lib_package_path);

        let lib_version = lib_package_json_content['version'];
        let template_version = template_package_json_content['version'];

        if (lib_version != template_version) {
            actions['action'] = 'upgrade';
            this.install(test_lib_dir, actions);
            return false;
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
            createOutputChannel(`uni-app自动化测试插件运行缺少必要的依赖 ${msg}，请安装相关依赖。`, 'warning');
            createOutputChannel(`方法1: 打开终端，进入 ${test_lib_dir} 目录，运行命令： npm install --save`);
            createOutputChannel(`方法2: 点击HBuilderX 顶部菜单【运行 - uni-app自动化测试辅助插件 - 重装测试环境依赖】`);
            return false;
        } else {
            if (isReload) {
                createOutputChannel(`uni-app自动化测试插件，环境检查无误，无需重装。`, 'success');
            };
            return true;
        }
    };

    /**
     * 检查uniapp-cli项目，当用户项目为uniapp-cli项目时，运行则使用项目下的node_modules
     * @param {String} projectPath 项目路径
     * @return {Boolean}
     */
    async checkUniappCliProject(projectPath) {
        if (!fs.existsSync(projectPath)) {
            createOutputChannel(`uniapp-cli项目，检查环境依赖，${projectPath}不存在。`, 'error');
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
            createOutputChannel(`uniapp-cli项目，${projectPath} 自动化测试运行缺少必要的依赖 ${msg}，需要安装相关依赖。`, 'warning');
            createOutputChannel(`如果自动安装失败，打开终端，进入 ${projectPath} 目录，运行命令： npm install --save ${msg}`, 'info');
            this.install(projectPath, {}, `npm install --save ${msg}`);
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
        await this.CreateTestEnvConfigFile(projectPath);

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
