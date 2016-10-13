'use strict';

const _ = require('lodash');
const chalk = require('chalk');
const inquirer = require('inquirer');
const Promise = require('bluebird');

const getRoles = require('./getRoles');
const rightpad = require('./utils/rightpad');
const selectProfile = require('./selectProfile');
const assumeRole = require('./assumeRole');
const getConfig = require('./getConfig');
const writeConfig = require('./writeConfig');
const logger = require('./utils/logger');

function update(cagoOptions) {
  return new Promise((finalResolve, finalReject) => {
    let arnCollection;
    let SAMLResponse;
    let arn;
    let awsConfigs;
    let roleToken;

    // get the roles
    return getRoles(cagoOptions)
      .then((roleResults) => {
        arnCollection = roleResults.arnCollection;
        SAMLResponse = roleResults.SAMLResponse || null;

        if (Object.keys(arnCollection).length === 0) {
          logger.log(chalk.yellow('\nNo roles found.\n\n'));
          throw new Error('√');
        }
        const accountRoleChoices = _.sortBy(Object.keys(arnCollection).map((arnKey) => {
          const arnItem = arnCollection[arnKey];
          return {
            name: `${rightpad(arnItem.accountName, roleResults.padAmount)} ${arnItem.roleName}`,
            value: arnKey,
            short: `${arnItem.accountName} ${arnItem.roleName}`,
          };
        }), 'name');

        // prompt the user to choose a role to assume
        return inquirer.prompt([{
          type: 'list',
          name: 'role',
          message: 'Please choose the AWS account and role combination that you would like to assume:',
          choices: accountRoleChoices,
        }]);
      })
      .then((selection) => {
        // set the arn from the selected role
        arn = arnCollection[selection.role];
        // get aws awsConfigs, then assume role
        return getConfig(cagoOptions);
      })
      .then((awsConfs) => {
        awsConfigs = awsConfs;
        // assume role, then select profile for new credentials
        return assumeRole(cagoOptions, arn, SAMLResponse);
      })
      .then((assumeRoleToken) => {
        roleToken = assumeRoleToken;
        // select the profile, then write config
        return selectProfile(awsConfigs);
      })
      .then((profileName) => {
        const displayInstructions = true;
        // setup the profiles
        const profiles = {};
        profiles[profileName] = {
          roleArn: arn.roleArn,
          principalArn: arn.principalArn,
          token: roleToken,
          region: arn.region,
        };
        return writeConfig(cagoOptions, awsConfigs, profiles, displayInstructions);
      })
      .then(() => {
        logger.log(chalk.green('... Done!\n\n'));
        finalResolve();
      })
      .catch((err) => {
        if (err && err.message === '√') {
          finalResolve();
        } else {
          finalReject(err);
        }
      });
  });
}

module.exports = {
  run: update,
};
