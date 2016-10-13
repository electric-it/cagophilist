'use strict';

const Promise = require('bluebird');
const chalk = require('chalk');
const roleUtils = require('./utils/role');
const pluginUtils = require('./utils/plugin');
const logger = require('./utils/logger');

function getRoles(cagoOptions) {
  return new Promise((resolve, reject) => {
    if (cagoOptions.aws.rolesSource !== 'settings') {
      // the roles will come from a plugin
      pluginUtils.runPlugins(cagoOptions, 'get-roles')
        .then((roleResults) => {
          const processedRoles = roleUtils.processRoles(cagoOptions, roleResults);
          if (processedRoles === null) {
            reject('An error occurred while processing roles.');
          } else {
            resolve(processedRoles);
          }
        })
        .catch((err) => {
          logger.error(chalk.red(`\nError occurred while fetching roles\n`));
          reject(err);
        });
    } else if (cagoOptions.aws.rolesSource === 'settings' && cagoOptions.roles !== null) {
      const processedRoles = roleUtils.processRoles(cagoOptions, {
        roles: cagoOptions.roles,
      });
      if (processedRoles === null) {
        reject('An error occurred while processing roles.');
      } else {
        resolve(processedRoles);
      }
    } else {
      logger.error(chalk.red(`\nMissing roles from the settings ${chalk.cyan(cagoOptions.locked.cagorcFilePath)}\n`));
      reject();
    }
  });
}

module.exports = getRoles;
