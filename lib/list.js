'use strict';

const chalk = require('chalk');
const Promise = require('bluebird');

const getConfig = require('./getConfig');
const logger = require('./utils/logger');

function list(cagoOptions) {
  return new Promise((finalResolve, finalReject) => {
    // get the config
    getConfig(cagoOptions)
      .then((awsConfs) => {
        const awsCredentials = awsConfs.credentials;
        const cagoConfig = awsConfs.config;
        const profileOptions = Object.keys(awsCredentials).sort();

        const outputList = [];
        const excludedList = [];
        profileOptions.forEach((profileName) => {
          if (
            {}.hasOwnProperty.call(cagoConfig, profileName) === true
            && cagoConfig[profileName].exclude === true
          ) {
            excludedList.push(profileName);
          } else {
            outputList.push(chalk.green(profileName));
            outputList.push(`\tsource $(cago env update) ${profileName}`);
          }
        });

        logger.log(chalk.yellow(`\n\tExcluded:\n\t   ${excludedList.join('\n\t   ')}`));
        logger.log(`\n\t${chalk.green('Available:')}\n\t   ${outputList.join('\n\t   ')}`);
        finalResolve();
      })
      .catch((err) => {
        finalReject(err);
      });
  });
}

module.exports = {
  run: list,
};
