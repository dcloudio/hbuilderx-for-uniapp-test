const net = require('net');
const { execFile } = require('child_process');
let nextUniappTestPort = 9520;

/**
 * @description 检查端口是否被使用
 * @param {Number} port
 */
function isPortInUse(port) {
    return new Promise((resolve) => {
        if (process.platform == 'win32') {
            isPortInUseWithNetstat(port).then(resolve);
            return;
        };
        execFile('lsof', ['-nP', '-iTCP:' + port, '-sTCP:LISTEN'], (error, stdout) => {
            if (!error) {
                resolve(stdout.trim() != '');
                return;
            };
            if (error.code === 1) {
                resolve(false);
                return;
            };
            isPortInUseWithServer(port).then(resolve);
        });
    });
};

function isPortInUseWithNetstat(port) {
    return new Promise((resolve) => {
        execFile('netstat', ['-ano', '-p', 'tcp'], (error, stdout) => {
            if (error) {
                isPortInUseWithServer(port).then(resolve);
                return;
            };
            const lines = stdout.split(/\r?\n/);
            const portRegExp = new RegExp('(^|[^0-9])' + port + '([^0-9]|$)');
            const portInUse = lines.some(line => {
                const columns = line.trim().split(/\s+/);
                if (columns.length < 4 || columns[0] != 'TCP') {
                    return false;
                };
                return columns[3] == 'LISTENING' && portRegExp.test(columns[1]);
            });
            resolve(portInUse);
        });
    });
};

function isPortInUseWithServer(port) {
    return new Promise((resolve) => {
        const server = net.createServer().once('error', () => {
            resolve(true);
        }).once('listening', () => {
            server.close(() => {
                resolve(false);
            });
        }).listen(port);
    });
};

/**
 * @description 获取一个uni-app自动化测试可用的端口
 */
async function findAvailableUniappTestPort() {
    let port = nextUniappTestPort;
    let portInUse = true;
    while (portInUse) {
        portInUse = await isPortInUse(port);
        if (portInUse) {
            port++;
        }
    };
    nextUniappTestPort = port + 1;
    console.log("[自动化测试端口] is: ", port);
    return port;
};

module.exports = findAvailableUniappTestPort;

// if (require.main === module) {
//     findAvailableUniappTestPort().then(port => {
//         console.log("Available port:", port);
//     });
// };
