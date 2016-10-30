'use strict';

const _ = require('lodash');
const chalk = require('chalk');
const inquirer = require('inquirer');
const Promise = require('bluebird');

const getConfig = require('./getConfig');
const iniUtils = require('./utils/ini');
const logger = require('./utils/logger');

function exclude(cagoOptions) {
  return new Promise((finalResolve, finalReject) => {
    let awsConfigs;

    // get the config
    getConfig(cagoOptions)
      .then((awsConfs) => {
        const awsCredentials = awsConfs.credentials;
        const cagoConfig = awsConfs.config;
        const profileOptions = Object.keys(awsCredentials).sort();
        awsConfigs = awsConfs;

        if (profileOptions.length === 0) {
          logger.log(chalk.yellow('\nNo profiles found.\n\n'));
          throw new Error('√');
        }

        const accountChoices = _.map(profileOptions, (profileName) => {
          let checked = false;
          if (
            {}.hasOwnProperty.call(cagoConfig, profileName) === true
            && cagoConfig[profileName].exclude === true
          ) {
            checked = true;
          }
          return {
            name: profileName,
            value: profileName,
            checked,
          };
        });

        return inquirer.prompt([{
          type: 'checkbox',
          name: 'exclude',
          message: 'Please choose the AWS account(s) you wish to exclude from refresh/update options:',
          choices: accountChoices,
        }]);
      })
      .then((selection) => {
        const awsCredentials = awsConfigs.credentials;
        const cagoConfig = awsConfigs.config;
        Object.keys(awsCredentials).forEach((profileName) => {
          if (selection.exclude.indexOf(profileName) !== -1) {
            if ({}.hasOwnProperty.call(cagoConfig, profileName) === false) {
              cagoConfig[profileName] = {};
            }
            cagoConfig[profileName].exclude = true;
          } else if (
            {}.hasOwnProperty.call(cagoConfig, profileName) === true
            && cagoConfig[profileName].exclude === true
          ) {
            delete cagoConfig[profileName].exclude;
            if (Object.keys(cagoConfig[profileName]).length === 0) {
              delete cagoConfig[profileName];
            }
          }
        });
        logger.log(chalk.green(`\nWriting the settings to the cagophilist config file: ${cagoOptions.locked.cagoConfigPath}..\n`));
        return iniUtils.writeIniFile(cagoOptions.locked.cagoConfigPath, cagoConfig);
      })
      .then(() => {
        logger.log(chalk.green('... Done!\n\n'));
        finalResolve();
      })
      .catch((err) => {
        if (err.message === '√') {
          finalResolve();
        } else {
          finalReject(err);
        }
      });
  });
}

module.exports = {
  run: exclude,
};
