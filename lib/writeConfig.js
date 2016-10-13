'use strict';

const Promise = require('bluebird');
const chalk = require('chalk');
const moment = require('moment');
const ncp = require('copy-paste');

const iniUtils = require('./utils/ini');
const logger = require('./utils/logger');

function writeConfig(cagoOptions, awsConfigs, profiles, displayInstructions) {
  return new Promise((resolve, reject) => {
    try {
      const awsCredentials = awsConfigs.credentials;
      const cagoConfig = awsConfigs.config;
      const profileNames = Object.keys(profiles);

      profileNames.forEach((profileName) => {
        const token = profiles[profileName].token;
        const roleArn = profiles[profileName].roleArn;
        const principalArn = profiles[profileName].principalArn;
        const region = profiles[profileName].region || cagoOptions.aws.region;
        if ({}.hasOwnProperty.call(awsCredentials, profileName) === false) {
          awsCredentials[profileName] = {};
        }
        if ({}.hasOwnProperty.call(cagoConfig, profileName) === false) {
          cagoConfig[profileName] = {};
        }
        awsCredentials[profileName].output = cagoOptions.aws.outputFormat;
        awsCredentials[profileName].region = region;
        awsCredentials[profileName].aws_access_key_id = token.Credentials.AccessKeyId.trim();
        awsCredentials[profileName].aws_secret_access_key = token.Credentials.SecretAccessKey.trim();
        awsCredentials[profileName].aws_session_token = token.Credentials.SessionToken.trim();
        awsCredentials[profileName].expire = moment(token.Credentials.Expiration).toISOString();
        cagoConfig[profileName].role_arn = roleArn;
        cagoConfig[profileName].principal_arn = principalArn;
      });

      logger.log(chalk.green(`Writing the settings to the AWS credentials file: ${cagoOptions.locked.awsCrendentialsFile}..\n`));
      iniUtils.writeIniFile(cagoOptions.locked.awsCrendentialsFile, awsCredentials)
        .then(() => {
          logger.log(chalk.green(`Writing the settings to the cagophilist config file: ${cagoOptions.locked.cagoConfigPath}..\n`));
          return iniUtils.writeIniFile(cagoOptions.locked.cagoConfigPath, cagoConfig);
        })
        .then(() => {
          if (displayInstructions === true) {
            const profileName = profileNames[0];
            const token = profiles[profileName].token;
            const sourceCommand = `source $(cagophilist env update) ${profileName}`;
            logger.log('');
            logger.log(chalk.yellow('-'.repeat(80)));
            logger.log(chalk.yellow(`Your new access key pair has been stored in the AWS configuration file ${chalk.magenta(cagoOptions.locked.awsCrendentialsFile)} under the ${chalk.magenta(profileName)} profile.`));
            logger.log(chalk.yellow(`Note that it will expire at ${chalk.magenta(moment(token.Credentials.Expiration).format('LLLL Z'))}.`));
            logger.log(chalk.yellow('After this time, you may safely rerun this script to refresh your access key pair.'));
            logger.log(chalk.yellow(`To use this credential, call the AWS CLI with the --profile option (e.g. ${chalk.cyan(`aws --profile ${profileName} iam list-account-aliases`)}).`));
            logger.log(chalk.yellow('-'.repeat(80)));
            logger.log(`${chalk.yellow('To set the environment variables, run')} ${chalk.cyan(sourceCommand)}`);
            if (cagoOptions.autocopy !== false) {
              logger.log(chalk.yellow('(This command has been copied to your clipboard)'));
              ncp.copy(sourceCommand);
            }
            logger.log(chalk.yellow('-'.repeat(80)));
            logger.log('');
          }
          resolve();
        });
    } catch (e) {
      logger.error(chalk.red(`\nError encountered while writing configs:\n`));
      logger.error(`${chalk.red(e)}\n`);
      reject();
    }
  });
}

module.exports = writeConfig;
