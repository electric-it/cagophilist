'use strict';

const should = require('should');
const fs = require('fs');
const chalk = require('chalk');
const ini = require('ini');
const td = require('testdouble');
const moment = require('moment');

const iniUtils = require('../lib/utils/ini');
const logger = require('../lib/utils/logger');

describe('WriteConfig Tests', () => {
  let writeConfig;
  let actualTxt = [];
  let cagoOptions;
  let awsConfigs;
  let profiles;
  let displayInstructions;
  const TEMP_AWS_CREDENTIALS = '/tmp/awsCredentials';
  const TEMP_CAGO_CONFIG = '/tmp/cagoConfig';

  beforeEach(() => {
    td.replace(logger, 'log', (msg) => {
      actualTxt.push(msg);
    });
    td.replace(logger, 'error', (msg) => {
      actualTxt.push(msg);
    });
    cagoOptions = {
      aws: {
        region: 'us-east-1',
        outputFormat: 'json',
      },
      locked: {
        awsCrendentialsFile: TEMP_AWS_CREDENTIALS,
        cagoConfigPath: TEMP_CAGO_CONFIG,
      },
      autocopy: true,
    };
    awsConfigs = {
      credentials: {},
      config: {},
    };
    profiles = {
      temp: {
        token: {
          Credentials: {
            AccessKeyId: 'test-access-key-id',
            SecretAccessKey: 'test-secret-access-key',
            SessionToken: 'test-session-token',
            Expiration: '2016-04-01T10:13:00.000Z',
          },
        },
        roleArn: 'test-role-arn',
        principalArn: 'test-principal-arn',
        region: 'us-east-1',
      },
    };
    displayInstructions = true;
    writeConfig = require('../lib/writeConfig');
  });

  afterEach(() => {
    td.reset();
    cagoOptions = {};
    awsConfigs = {};
    profiles = {};
    displayInstructions = null;
    writeConfig = null;
    actualTxt = [];
    try {
      fs.unlinkSync(TEMP_AWS_CREDENTIALS);
      fs.unlinkSync(TEMP_CAGO_CONFIG);
    } catch (e) {
      // suppress exception
    }
  });

  it('should fail with missing arguments', (done) => {
    writeConfig()
      .then(() => {
        done('Rejection failed.');
      })
      .catch(() => {
        should(actualTxt.join('')).be.eql([
          chalk.red(`\nError encountered while writing configs:\n`),
          `${chalk.red('TypeError: Cannot read property \'credentials\' of undefined')}\n`,
        ].join(''));
        done();
      });
  });

  it('should fail caught exception', (done) => {
    td.replace(iniUtils, 'writeIniFile', () => {
      throw new Error('eek!');
    });
    writeConfig = require('../lib/writeConfig');

    writeConfig(cagoOptions, awsConfigs, profiles, displayInstructions)
      .then(() => {
        done('Rejection failed.');
      })
      .catch(() => {
        should(actualTxt.join('')).be.eql([
          chalk.green(`Writing the settings to the AWS credentials file: ${cagoOptions.locked.awsCrendentialsFile}..\n`),
          chalk.red(`\nError encountered while writing configs:\n`),
          `${chalk.red('Error: eek!')}\n`,
        ].join(''));
        done();
      });
  });

  it('should write correct config settings', (done) => {
    writeConfig(cagoOptions, awsConfigs, profiles, displayInstructions)
      .then(() => {
        const tempAWSCredentialsContent = fs.readFileSync(TEMP_AWS_CREDENTIALS, 'utf-8');
        const tempCagoConfigContent = fs.readFileSync(TEMP_CAGO_CONFIG, 'utf-8');
        const actualAWSCredentials = ini.parse(tempAWSCredentialsContent);
        const actualCagoConfig = ini.parse(tempCagoConfigContent);
        const compareTxt = [];

        compareTxt.push(chalk.green(`Writing the settings to the AWS credentials file: ${cagoOptions.locked.awsCrendentialsFile}..\n`));
        compareTxt.push(chalk.green(`Writing the settings to the cagophilist config file: ${cagoOptions.locked.cagoConfigPath}..\n`));
        if (displayInstructions === true) {
          const profileName = Object.keys(profiles)[0];
          const token = profiles[profileName].token;
          const sourceCommand = `source $(cagophilist env update) ${profileName}`;
          compareTxt.push('');
          compareTxt.push(chalk.yellow('-'.repeat(80)));
          compareTxt.push(chalk.yellow(`Your new access key pair has been stored in the AWS configuration file ${chalk.magenta(cagoOptions.locked.awsCrendentialsFile)} under the ${chalk.magenta(profileName)} profile.`));
          compareTxt.push(chalk.yellow(`Note that it will expire at ${chalk.magenta(moment(token.Credentials.Expiration).format('LLLL Z'))}.`));
          compareTxt.push(chalk.yellow('After this time, you may safely rerun this script to refresh your access key pair.'));
          compareTxt.push(chalk.yellow(`To use this credential, call the AWS CLI with the --profile option (e.g. ${chalk.cyan(`aws --profile ${profileName} iam list-account-aliases`)}).`));
          compareTxt.push(chalk.yellow('-'.repeat(80)));
          compareTxt.push(`${chalk.yellow('To set the environment variables, run')} ${chalk.cyan(sourceCommand)}`);
          if (cagoOptions.autocopy !== false) {
            compareTxt.push(chalk.yellow('(This command has been copied to your clipboard)'));
          }
          compareTxt.push(chalk.yellow('-'.repeat(80)));
          compareTxt.push('');
        }

        should(actualTxt.join('')).be.eql(compareTxt.join(''));
        should(actualAWSCredentials).be.deepEqual({
          temp: {
            output: cagoOptions.aws.outputFormat,
            region: profiles.temp.region,
            aws_access_key_id: profiles.temp.token.Credentials.AccessKeyId,
            aws_secret_access_key: profiles.temp.token.Credentials.SecretAccessKey,
            aws_session_token: profiles.temp.token.Credentials.SessionToken,
            expire: profiles.temp.token.Credentials.Expiration,
          },
        });
        should(actualCagoConfig).be.deepEqual({
          temp: {
            role_arn: profiles.temp.roleArn,
            principal_arn: profiles.temp.principalArn,
          },
        });
        done();
      })
      .catch((err) => {
        done(err);
      });
  });

  it('should write correct config settings with some settings missing', (done) => {
    delete profiles.temp.region;
    writeConfig(cagoOptions, awsConfigs, profiles, displayInstructions)
      .then(() => {
        const tempAWSCredentialsContent = fs.readFileSync(TEMP_AWS_CREDENTIALS, 'utf-8');
        const tempCagoConfigContent = fs.readFileSync(TEMP_CAGO_CONFIG, 'utf-8');
        const actualAWSCredentials = ini.parse(tempAWSCredentialsContent);
        const actualCagoConfig = ini.parse(tempCagoConfigContent);
        const compareTxt = [];

        compareTxt.push(chalk.green(`Writing the settings to the AWS credentials file: ${cagoOptions.locked.awsCrendentialsFile}..\n`));
        compareTxt.push(chalk.green(`Writing the settings to the cagophilist config file: ${cagoOptions.locked.cagoConfigPath}..\n`));
        if (displayInstructions === true) {
          const profileName = Object.keys(profiles)[0];
          const token = profiles[profileName].token;
          const sourceCommand = `source $(cagophilist env update) ${profileName}`;
          compareTxt.push('');
          compareTxt.push(chalk.yellow('-'.repeat(80)));
          compareTxt.push(chalk.yellow(`Your new access key pair has been stored in the AWS configuration file ${chalk.magenta(cagoOptions.locked.awsCrendentialsFile)} under the ${chalk.magenta(profileName)} profile.`));
          compareTxt.push(chalk.yellow(`Note that it will expire at ${chalk.magenta(moment(token.Credentials.Expiration).format('LLLL Z'))}.`));
          compareTxt.push(chalk.yellow('After this time, you may safely rerun this script to refresh your access key pair.'));
          compareTxt.push(chalk.yellow(`To use this credential, call the AWS CLI with the --profile option (e.g. ${chalk.cyan(`aws --profile ${profileName} iam list-account-aliases`)}).`));
          compareTxt.push(chalk.yellow('-'.repeat(80)));
          compareTxt.push(`${chalk.yellow('To set the environment variables, run')} ${chalk.cyan(sourceCommand)}`);
          if (cagoOptions.autocopy !== false) {
            compareTxt.push(chalk.yellow('(This command has been copied to your clipboard)'));
          }
          compareTxt.push(chalk.yellow('-'.repeat(80)));
          compareTxt.push('');
        }

        should(actualTxt.join('')).be.eql(compareTxt.join(''));
        should(actualAWSCredentials).be.deepEqual({
          temp: {
            output: cagoOptions.aws.outputFormat,
            region: cagoOptions.aws.region,
            aws_access_key_id: profiles.temp.token.Credentials.AccessKeyId,
            aws_secret_access_key: profiles.temp.token.Credentials.SecretAccessKey,
            aws_session_token: profiles.temp.token.Credentials.SessionToken,
            expire: profiles.temp.token.Credentials.Expiration,
          },
        });
        should(actualCagoConfig).be.deepEqual({
          temp: {
            role_arn: profiles.temp.roleArn,
            principal_arn: profiles.temp.principalArn,
          },
        });
        done();
      })
      .catch((err) => {
        done(err);
      });
  });
});
