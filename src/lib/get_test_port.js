const net = require('net');

/**
 * @description 检查端口是否被使用
 * @param {Number} port
 */
function isPortInUse(port) {
    return new Promise((resolve) => {
        const server = net.createServer().once('error', () => {
            resolve(true);
        }).once('listening', () => {
            server.close(() => {
                resolve(false);
            });
        }).listen(port, '127.0.0.1');
    });
};

/**
 * @description 获取一个uni-app自动化测试可用的端口
 */
async function findAvailableUniappTestPort() {
    let port = 9520;
    let portInUse = true;
    while (portInUse) {
        portInUse = await isPortInUse(port);
        if (portInUse) {
            port++;
        }
    };
    console.log("[自动化测试端口] is: ", port);
    return port;
};

module.exports = findAvailableUniappTestPort;