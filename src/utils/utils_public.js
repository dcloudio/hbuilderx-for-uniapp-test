const hx = require('hbuilderx');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { spawn, exec } = require('child_process');

const os = require('os');
const osName = os.platform();

/**
 * @description 检查本机是否安装node
 */
function checkNode() {
    return new Promise((resolve, reject) => {
        exec('node -v', {
            env: { ...process.env }
        }, function(error, stdout, stderr) {
            if (error) {
                reject("N");
                return;
            };
            try {
                let version = stdout.match(/(\d{1,3}\.\d{1,3}\.\d{1,3})/g)[0];
                resolve('Y');
            } catch (e) {
                reject('N');
            };
        });
    });
};

module.exports = {
    checkNode
};
