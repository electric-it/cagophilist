'use strict';

const Promise = require('bluebird');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const os = require('os');

const logger = require('./utils/logger');

function getOptions() {
  return new Promise((resolve, reject) => {
    const CAGO_RC_VERSION = '1.0.1';
    // ==========================================================================
    // Options
    //
    const cagoOptions = {
      // autocopy: auto copy the commands needing to excute after cagophilist finishes
      // running the commands
      autocopy: true,
      aws: {
        // region: The default AWS region that this script will connect
        // to for all API calls
        region: 'us-east-1',
        // output format: The AWS CLI output format that will be configured in the
        // saml profile (affects subsequent CLI calls)
        outputFormat: 'json',
        // crendentialsFilePath: The file where this script will store the temp
        // credentials under the saml profile
        credentialsPath: '~/.aws/credentials',
        // configFilePath: The file where the config
        cagoConfigPath: '~/.aws/cagoConfig',
        // the source for the list of roles to select, 'settings' or 'plugin'
        rolesSource: 'plugin',
        // use the HTTPS_PROXY or https_proxy settings
        useHttpsProxy: true,
        // the expiration refresh threshold, anything less than this threshold
        // setting in minutes will automatically be refreshed if the command
        // `cagophilist refresh` is called
        refreshMinutes: 10,
      },
      // plugins: self-registering plugins
      plugins: {},
      // config: config settings for plugins
      config: {},
      // roles: manually settings
      roles: null,
      // accounts: account display overrides
      accounts: null,
      // regions: region display overrides
      regions: null,
    };

    // ==========================================================================

    const homeDir = os.homedir();
    const cagorcFilePath = path.join(homeDir, '.cagorc');

    // ==========================================================================

    try {
      const cagoFileStats = fs.statSync(cagorcFilePath);
      if (cagoFileStats.isFile()) {
        try {
          const cagoOptionsSettings = JSON.parse(fs.readFileSync(cagorcFilePath, 'utf-8'));
          if ({}.hasOwnProperty.call(cagoOptionsSettings, 'rc_version') === true) {
            cagoOptions.rc_version = cagoOptionsSettings.rc_version;
          }
          if ({}.hasOwnProperty.call(cagoOptionsSettings, 'autocopy') === true) {
            cagoOptions.autocopy = cagoOptionsSettings.autocopy;
          }
          if ({}.hasOwnProperty.call(cagoOptionsSettings, 'aws') === true) {
            cagoOptions.aws = Object.assign({}, cagoOptions.aws, cagoOptionsSettings.aws);
          }
          if ({}.hasOwnProperty.call(cagoOptionsSettings, 'plugins') === true) {
            cagoOptions.plugins = Object.assign({}, cagoOptions.plugins, cagoOptionsSettings.plugins);
          }
          if ({}.hasOwnProperty.call(cagoOptionsSettings, 'config') === true) {
            cagoOptions.config = Object.assign({}, cagoOptions.config, cagoOptionsSettings.config);
          }
          if ({}.hasOwnProperty.call(cagoOptionsSettings, 'roles') === true) {
            cagoOptions.roles = cagoOptionsSettings.roles;
          }
          if ({}.hasOwnProperty.call(cagoOptionsSettings, 'accounts') === true) {
            cagoOptions.accounts = Object.assign({}, cagoOptions.accounts, cagoOptionsSettings.accounts);
          }
          if ({}.hasOwnProperty.call(cagoOptionsSettings, 'regions') === true) {
            cagoOptions.regions = Object.assign({}, cagoOptions.regions, cagoOptionsSettings.regions);
          }
        } catch (e) {
          logger.error(chalk.red(`\nError encountered while parsing ${chalk.cyan(cagorcFilePath)}:\n`));
          logger.error(`${chalk.red(e)}\n`);
          reject();
        }
      }
    } catch (e) {
      // suppress the exception if the cago options file does not exist.
      logger.error(chalk.red(`\nNo configuration file found ${chalk.cyan(cagorcFilePath)}\n`));
      reject();
    }

    cagoOptions.locked = {};
    cagoOptions.locked.awsCrendentialsFile = cagoOptions.aws.credentialsPath.replace('~', homeDir);
    cagoOptions.locked.cagoConfigPath = cagoOptions.aws.cagoConfigPath.replace('~', homeDir);
    cagoOptions.locked.cagorcFilePath = cagorcFilePath;
    cagoOptions.locked.cagoPath = path.join(homeDir, '.cago');
    cagoOptions.registeredHooks = [];
    // cagoOptions.locked.scriptsPath = path.resolve(__dirname, '../scripts');
    cagoOptions.CAGO_RC_VERSION = CAGO_RC_VERSION;

    resolve(cagoOptions);

    // ==========================================================================
  });
}

module.exports = getOptions;
