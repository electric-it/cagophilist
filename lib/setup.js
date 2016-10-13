'use strict';

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const logger = require('./utils/logger');
const pathUtils = require('./utils/path');
const pluginUtils = require('./utils/plugin');

function writeToSetupLog(cagoOptions, content) {
  const setupErrorLogPath = path.join(cagoOptions.locked.cagoPath, 'error-setup.log');
  try {
    fs.writeFileSync(setupErrorLogPath, content.toString(), 'utf-8');
  } catch (e) {
    // suppress the error
  }
}

function setup(cagoOptions) {
  return new Promise((resolve, reject) => {
    let msg = '';
    Promise.resolve()
      .then(() => {
        logger.log('');
        msg = 'Checking the paths:';
        logger.stdoutWrite(`\t${msg} ${chalk.yellow('...')}`);
      })
      .then(() => pathUtils.setupPaths(cagoOptions))
      .then(() => {
        logger.log(`\r\t${msg} ${chalk.green(' √ ')}`);
        msg = 'Checking the plugins path:';
        logger.stdoutWrite(`\t${msg} ${chalk.yellow('...')}`);
      })
      .then(() => pluginUtils.setupPluginPaths(cagoOptions))
      .then(() => {
        logger.log(`\r\t${msg} ${chalk.green(' √ ')}`);
        msg = 'Checking the plugins:';
        logger.stdoutWrite(`\t${msg} ${chalk.yellow('...')}`);
      })
      .then(() => pluginUtils.installPlugins(cagoOptions))
      .then(() => {
        logger.log(`\r\t${msg} ${chalk.green(' √ ')}`);
      })
      .then(() => {
        writeToSetupLog(cagoOptions, `Successfully setup on: ${(new Date()).toISOString()}`);
        resolve();
      })
      .catch((err) => {
        logger.error(`\r\t${msg} ${chalk.red(' X ')}`);
        const errorContent = [];
        errorContent.push('='.repeat(80));
        errorContent.push('\n');
        errorContent.push(`Error setup occurred on: ${(new Date()).toISOString()}`);
        errorContent.push('\n');
        errorContent.push('-'.repeat(80));
        errorContent.push('\n');
        errorContent.push(`${err}`);
        errorContent.push('\n');
        errorContent.push('='.repeat(80));
        writeToSetupLog(cagoOptions, errorContent.join('\n'));
        reject(err);
      });
  });
}

module.exports = {
  run: setup,
};
