const vscode = require('vscode');

// 调用unicloud插件的getWorkspaceBindServiceSpace方法
async function unicloud_extension_getWorkspaceBindServiceSpace(workspaceFolder) {
    let u_tmp = [];
    let extension = vscode.extensions.getExtension("unicloud");
    if (!extension) return u_tmp;
    let u_cloud = extension.isActive ? extension.exports : await extension.activate();
    if (!u_cloud || typeof u_cloud.getWorkspaceBindServiceSpace != "function") return u_tmp;
    let u_result = await u_cloud.getWorkspaceBindServiceSpace({"workspaceFolder": workspaceFolder});
    let u_allSpaces = u_result.allSpaces;
    if (u_allSpaces == undefined || u_allSpaces.length == 0) {
        return u_tmp;
    };
    for (let s of u_allSpaces) {
        if (s.provider == "tcb") {
            u_tmp.push({"id": s.spaceId,"name":s.spaceName,"provider":"tcb"});
        };
        if (s.provider == "aliyun") {
            let t_ali = Object.assign({"id": s.spaceId, "name":s.spaceName}, s);
            u_tmp.push(t_ali);
        };
        if (s.provider == "alipay") {
            let t_a = Object.assign({"id": s.spaceId}, s);
            u_tmp.push(t_a);
        };
        if (s.provider == "dcloud") {
            let t_dcloud= Object.assign({"id": s.spaceId}, s);
            u_tmp.push(t_dcloud);
        };
    };
    return u_tmp;
};


async function getProjectUnicloudData(workspaceFolder) {
    let unicloud_spaces_info = [];
    try {
        console.error("[自动化测试] 开始执行 unicloud_extension_getWorkspaceBindServiceSpace");
        unicloud_spaces_info = await unicloud_extension_getWorkspaceBindServiceSpace(workspaceFolder);
        // console.error("[自动化测试] unicloud_spaces_info = ", unicloud_spaces_info);
    } catch (error) {
        console.error("[自动化测试] 通过unicloud.getWorkspaceBindServiceSpace获取服务空间信息异常。",  error);
    };
    return unicloud_spaces_info;
};

module.exports = getProjectUnicloudData;
