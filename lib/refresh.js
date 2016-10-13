'use strict';

const _ = require('lodash');
const moment = require('moment');
const chalk = require('chalk');
const inquirer = require('inquirer');
const Promise = require('bluebird');
const ncp = require('copy-paste');

const getRoles = require('./getRoles');
const rightpad = require('./utils/rightpad');
const getConfig = require('./getConfig');
const roleUtils = require('./utils/role');
const profileUtils = require('./utils/profile');
const logger = require('./utils/logger');

function refresh(cagoOptions) {
  return new Promise((finalResolve, finalReject) => {
    let SAMLResponse;
    let awsConfigs;
    let arnCollection;
    const expiredProfiles = {};
    const allInquiries = [];

    // get the roleMatches
    getConfig(cagoOptions)
      .then((awsConfs) => {
        const awsCredentials = awsConfs.credentials;
        const threshold = cagoOptions.aws.refreshMinutes * 60 * 1000;
        const profileOptions = Object.keys(awsCredentials).sort();
        const cagoConfig = awsConfs.config;
        const expired = profileOptions.filter((profile) => {
          const profileConfig = cagoConfig[profile] || {};
          if ({}.hasOwnProperty.call(profileConfig, 'exclude') === true &&
            profileConfig.exclude === true
          ) {
            return false;
          }
          const diff = moment(awsCredentials[profile].expire).diff(moment());
          if (diff < threshold) {
            return true;
          }
          return false;
        });
        awsConfigs = awsConfs;

        if (expired.length === 0) {
          logger.log(chalk.green('\nAll profiles have valid tokens.\n'));
          logger.log(`${chalk.yellow('Note: to set the environment variables, run')} ${chalk.cyan('source $(cagophilist env update)')}`);
          if (cagoOptions.autocopy !== false) {
            logger.log(chalk.yellow('(This command has been copied to your clipboard)'));
            ncp.copy('source $(cagophilist env update)');
          }
          logger.log('');
          throw new Error('√');
        }

        return Promise.resolve(expired);
      })
      .then((expired) => {
        const cagoConfig = awsConfigs.config;

        // list expired
        logger.log(chalk.yellow('\nRefreshing the following expired profiles:'));
        expired.forEach((profileName) => {
          let roleArn = null;
          let principalArn = null;
          let region = cagoOptions.aws.region;

          logger.log(chalk.magenta(`\t${profileName}`));

          if ({}.hasOwnProperty.call(cagoConfig, profileName) === true) {
            if ({}.hasOwnProperty.call(cagoConfig[profileName], 'role_arn') === true) {
              roleArn = cagoConfig[profileName].role_arn;
            }
            if ({}.hasOwnProperty.call(cagoConfig[profileName], 'principal_arn') === true) {
              principalArn = cagoConfig[profileName].principal_arn;
            }
          }
          if (roleArn !== null) {
            region = roleUtils.getRoleRegion(cagoOptions, roleArn).region;
          }
          expiredProfiles[profileName] = {
            roleArn,
            principalArn,
            region,
          };
        });
        logger.log('');

        // prompt to proceed
        return inquirer.prompt([{
          type: 'confirm',
          name: 'proceed',
          message: 'Proceed with refresh?',
        }]);
      })
      .then((input) => {
        if (input.proceed !== true) {
          throw new Error('√');
        }
        // get the roles, then assume role
        return getRoles(cagoOptions);
      })
      .then((roleResults) => {
        const existingProfileRoles = [];
        let profilePadAmount = 0;
        arnCollection = roleResults.arnCollection;
        const padAmount = roleResults.padAmount;
        const profiles = Object.keys(expiredProfiles).sort();
        SAMLResponse = roleResults.SAMLResponse || null;

        if (Object.keys(arnCollection).length === 0) {
          logger.log(chalk.yellow('\nNo profiles found.\n\n'));
          throw new Error('√');
        }
        profiles.forEach((profileName) => {
          const arnSettings = expiredProfiles[profileName];
          if (!arnSettings || !arnSettings.roleArn || !arnSettings.principalArn) {
            const accountRoleChoices = _.sortBy(Object.keys(arnCollection).map((arnKey) => {
              const arn = arnCollection[arnKey];
              return {
                name: `${rightpad(arn.accountName, padAmount)} ${arn.roleName}`,
                value: arnKey,
                short: `${arn.accountName} ${arn.roleName}`,
              };
            }), 'name');
            // prompt the user to choose a role to assume
            allInquiries.push({
              type: 'list',
              name: profileName,
              message: `Please choose the AWS account and role combination that you would like to use for ${chalk.magenta(profileName)}:`,
              choices: accountRoleChoices,
            });
          } else {
            const arn = arnCollection[arnSettings.roleArn];
            existingProfileRoles.push({
              profileName,
              roleName: `${rightpad(arn.accountName, padAmount)} ${arn.roleName}`,
            });
            if (profileName.length > profilePadAmount) {
              profilePadAmount = profileName.length;
            }
          }
        }); // end profiles.forEach

        return Promise.resolve({
          existingProfileRoles,
          profilePadAmount,
        });
      })
      .then((results) => {
        const existingProfileRoles = results.existingProfileRoles;
        const profilePadAmount = results.profilePadAmount + 2;
        const printExistingProfiles = [];

        if (existingProfileRoles.length > 0) {
          logger.log(chalk.yellow('-'.repeat(80)));
          logger.log(chalk.yellow('Using last AWS account and role combination(s) for the profile(s) listed below'));
          logger.log(chalk.yellow('-'.repeat(80)));
          existingProfileRoles.forEach((item) => {
            printExistingProfiles.push(chalk.yellow(`\t${chalk.magenta(rightpad(item.profileName, profilePadAmount))} - ${chalk.cyan(item.roleName)}`));
          });
          logger.log(printExistingProfiles.join('\n'));
          logger.log(chalk.yellow('-'.repeat(80)));
          logger.log(chalk.yellow(`Note: to change the role used, please run ${chalk.cyan('cagophilist update')} and select`));
          logger.log(chalk.yellow('the profile you wish to update.'));
          logger.log(chalk.yellow('-'.repeat(80)));
          logger.log('');
        }
        return Promise.resolve();
      })
      .then(() => {
        if (allInquiries.length > 0) {
          return inquirer.prompt(allInquiries);
        }
        return Promise.resolve();
      })
      .then((selections) => {
        if (selections !== undefined) {
          const selectedProfiles = Object.keys(selections);
          selectedProfiles.forEach((profileName) => {
            const arn = arnCollection[selections[profileName]];
            expiredProfiles[profileName] = {
              roleArn: arn.roleArn,
              principalArn: arn.principalArn,
              region: arn.region,
            };
          });
        }
        return profileUtils.processExpiredProfiles(cagoOptions, awsConfigs, expiredProfiles, SAMLResponse);
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
  run: refresh,
};
