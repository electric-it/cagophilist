'use strict';

const Promise = require('bluebird');
const chalk = require('chalk');
const inquirer = require('inquirer');
const logger = require('./utils/logger');

function selectProfile(awsConfigs) {
  return new Promise((resolve, reject) => {
    const awsCredentials = awsConfigs.credentials;
    const profileOptions = Object.keys(awsCredentials).sort();
    const newOptionValue = '--cago-new--';

    profileOptions.push({
      name: `${chalk.magenta('Create new profile')}`,
      value: newOptionValue,
    });

    const promptOptions = [{
      type: 'list',
      name: 'name',
      message: 'Select a profile name for new awsCredentials:',
      choices: profileOptions,
    }];

    inquirer.prompt(promptOptions)
      .then((profile) => {
        try {
          if (profile.name === newOptionValue) {
            const newOptionPromptOptions = [{
              type: 'input',
              name: 'name',
              message: 'Enter a name for the new profile:',
            }];

            inquirer.prompt(newOptionPromptOptions)
              .then((selectedProfile) => {
                resolve(selectedProfile.name);
              })
              .catch((err) => {
                reject(err);
              });
          } else {
            resolve(profile.name);
          }
        } catch (e) {
          logger.error(chalk.red('\nError encountered while selecting profiles\n'));
          logger.error(`${chalk.red(e)}\n`);
          reject();
        }
      })
      .catch((err) => {
        reject(err);
      });
  });
}

module.exports = selectProfile;
