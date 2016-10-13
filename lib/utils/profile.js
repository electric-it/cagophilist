'use strict';
const chalk = require('chalk');
const Promise = require('bluebird');
const ncp = require('copy-paste');

const assumeRole = require('../assumeRole');
const writeConfig = require('../writeConfig');
const logger = require('./logger');

function processExpiredProfiles(cagoOptions, awsConfigs, expiredProfiles, SAMLResponse) {
  return new Promise((resolve, reject) => {
    const allAssumptions = [];
    const writeProfiles = {};
    const profiles = Object.keys(expiredProfiles).sort();
    const displayInstructions = false;
    profiles.forEach((profileName) => {
      const arn = expiredProfiles[profileName];
      // call the assume role functionality...
      const assumeRolePromise = assumeRole(cagoOptions, arn, SAMLResponse)
        .then((roleToken) => {
          writeProfiles[profileName] = {
            roleArn: arn.roleArn,
            principalArn: arn.principalArn,
            token: roleToken,
            region: arn.region,
          };
        });
      allAssumptions.push(assumeRolePromise);
    });


    Promise.all(allAssumptions)
      .then(() => writeConfig(cagoOptions, awsConfigs, writeProfiles, displayInstructions))
      .then(() => {
        logger.log(chalk.green('... Done!\n'));
        logger.log(`${chalk.yellow('Note: to set the environment variables, run')} ${chalk.cyan(`source $(cagophilist env update)\n\n`)}`);
        if (cagoOptions.autocopy !== false) {
          logger.log(chalk.yellow('(This command has been copied to your clipboard)\n'));
          ncp.copy('source $(cagophilist env update)');
        }
        resolve();
      })
      .catch((err) => {
        reject(err);
      });
  });
}

module.exports = {
  processExpiredProfiles,
};
