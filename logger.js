const chalk = require('chalk'); // Chalk 4!

const levels = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

const levelColors = {
    debug: chalk.gray,
    info: chalk.cyan,
    warn: chalk.yellow,
    error: chalk.red
};

const currentLevel = process.env.LOG_LEVEL || 'info';

function shouldLog(level) {
    return levels[level] >= levels[currentLevel];
}

function log(level, ...args) {
    const ts = new Date().toISOString();
    const color = levelColors[level] || ((x) => x);
    const levelTag = color(`[${level.toUpperCase()}]`);
    console.log(
        `${chalk.gray(`[${ts}]`)} ${levelTag}`,
        ...args
    );
}

module.exports = {
    debug: (...args) => shouldLog('debug') && log('debug', ...args),
    info: (...args) => shouldLog('info') && log('info', ...args),
    warn: (...args) => shouldLog('warn') && log('warn', ...args),
    error: (...args) => shouldLog('error') && log('error', ...args),
};