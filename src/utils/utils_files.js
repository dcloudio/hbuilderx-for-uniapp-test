const os = require('os');
const fs = require('fs');
const path = require('path');

/**
 * @description 递归创建目录 同步方法
 * @param {Object} dirname
 * @return {Boolean}
 */
function mkdirsSync(dirname) {
    if (fs.existsSync(dirname)) {
        return true;
    } else {
        if (mkdirsSync(path.dirname(dirname))) {
            fs.mkdirSync(dirname);
            return true;
        };
    };
};


/**
 * @description 以当前时间生成文件名
 * @return {String}
 */
function getFileNameForDate() {
    let now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth();
    let date = now.getDate();
    let hour = now.getHours();
    let minu = now.getMinutes();
    month = month + 1;
    if (month < 10) month = "0" + month;
    if (date < 10) date = "0" + date;
    let time = year + month + date + hour + minu;
    return time;
};

/**
 * @description 写入文件
 */
async function fsWriteFile(fpath, filecontent) {
    return new Promise(function(resolve, reject) {
        fs.writeFile(fpath, filecontent, function (err) {
            if (err) {
                console.error(err);
                reject(err);
            };
            resolve('success');
        });
    });
};


module.exports = {
    mkdirsSync,
    fsWriteFile,
    getFileNameForDate
};