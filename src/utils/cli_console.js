function logToCliConsole(cliConsole, message, status = 'Info') {
    if (!cliConsole) return;
    const normalizedStatus = String(status).toLowerCase();
    const method = normalizedStatus == 'error'
        ? 'error'
        : ['warning', 'warn'].includes(normalizedStatus) ? 'warn' : 'log';
    return cliConsole[method](String(message ?? ''));
};

module.exports = logToCliConsole;
