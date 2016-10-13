'use strict';

process.env.NODE_ENV = process.env.NODE_ENV || 'prod';

const semver = require('semver');
const path = require('path');
const chalk = require('chalk');
const Promise = require('bluebird');
const os = require('os');
const osInfo = require('os-cli');

const updateCmd = require('./update');
const refreshCmd = require('./refresh');
const excludeCmd = require('./exclude');
const setupCmd = require('./setup');
const getOptions = require('./getOptions');
const logger = require('./utils/logger');
const pluginUtils = require('./utils/plugin');
const pathUtils = require('./utils/path');

const nodePkg = require('../package.json');

function cago(cmd1, cmd2) {
  return new Promise((finalResolve, finalReject) => {
    const printHelp = [];
    const printVersion = [];
    let name = '';
    let scriptsPath = '';
    let cagoOptions;
    const helpCommands = [undefined, '-?', '-h', '--help', 'help'];
    const versionCommands = ['-v', '-version', '--version', 'version'];
    const runCommands = ['update', 'refresh', 'exclude', 'setup'];

    let validCommands = ['env'];
    validCommands = validCommands.concat(helpCommands);
    validCommands = validCommands.concat(versionCommands);
    validCommands = validCommands.concat(runCommands);

    Promise.resolve()
      .then(() => {
        if (semver.satisfies(process.versions.node, nodePkg.engines.node) === false) {
          logger.error(chalk.red(`\n\nPlease installed a newer version of Node.js (requires node version to satisfy '${nodePkg.engines.node}' requirement)\n\n`));
          return Promise.reject('√');
        }
        name = `${nodePkg.name.substr(0, 1).toUpperCase()}${nodePkg.name.substr(1)}`;
        return Promise.resolve();
      })
      .then(() => getOptions())
      .then((cagoOpts) => {
        cagoOptions = cagoOpts;
        if (
          {}.hasOwnProperty.call(cagoOptions, 'rc_version') === false
          || (
            {}.hasOwnProperty.call(cagoOptions, 'rc_version') === true
            && semver.gte(cagoOptions.rc_version, cagoOptions.CAGO_RC_VERSION) === false
          )
        ) {
          logger.error(chalk.red(`\n\nPlease update your cagorc settings to the latest rc_version: ${chalk.magenta(cagoOptions.CAGO_RC_VERSION)}.\n`));
          logger.error(chalk.red(`Note: the settings file can be found here: ${chalk.magenta(cagoOptions.locked.cagoConfigPath)}\n\n`));
          return Promise.reject('√');
        }
        return Promise.resolve();
      })
      .then(() => {
        if (cmd1 === 'setup') {
          return new Promise((resolve, reject) => {
            setupCmd.run(cagoOptions)
              .then(() => {
                reject('√');
              })
              .catch((err) => {
                reject(err);
              });
          });
        }
        return Promise.resolve();
      })
      .then(() => {
        if (
          helpCommands.indexOf(cmd1) !== -1
          || validCommands.indexOf(cmd1) === -1
        ) {
          if (validCommands.indexOf(cmd1) === -1) {
            printHelp.push('');
            printHelp.push(`${chalk.red(`Error unknown command(s): "${cmd1}${cmd2 ? ` ${cmd2}` : ''}", please refer to the help menu below.`)}`);
          }
          printHelp.push('');
          printHelp.push(`\tUsage: ${chalk.magenta('cago [command]')}\n`);

          printHelp.push(`\t${chalk.yellow('Command(s):')}\n`);
          printHelp.push(`\t   ${chalk.green('env      ')}\t Gets the environment info through subcommands: ${chalk.yellow('[ update, help, versions, proxy ]')}`);
          printHelp.push(`\t   ${chalk.green('exclude  ')}\t Exclude profiles from automatically refreshing when using "refresh" or "update" command`);
          printHelp.push(`\t   ${chalk.green('refresh  ')}\t Refreshes all the expired profiles (using "refreshMinutes" setting for the threshold)`);
          printHelp.push(`\t   ${chalk.green('setup    ')}\t Sets up the necessary files and adds the configured plugins`);
          printHelp.push(`\t   ${chalk.green('update   ')}\t Updates the selected profile with the aws token`);
          printHelp.push(`\t   ${chalk.green('version  ')}\t ${chalk.yellow('[ -v, -version, --version ]')} Displays the name and current version: ${name} v${nodePkg.version}`);

          printHelp.push(`\n\t${chalk.yellow('Help Command(s):')}\n`);
          printHelp.push(`\t   ${chalk.green('help     ')}\t ${chalk.yellow('[ -h, --help, -? ]')} Displays this help message and exits`);
          printHelp.push('');
          logger.log(printHelp.join('\n'));
          return Promise.reject('√');
        }
        return Promise.resolve();
      })
      .then(() => {
        if (versionCommands.indexOf(cmd1) !== -1) {
          printVersion.push(`${name} v${nodePkg.version}`);
          logger.log(printVersion.join('\n'));
          return Promise.reject('√');
        }
        return Promise.resolve();
      })
      .then(() => {
        if (cmd1 === 'env') {
          if (cmd2 === 'update') {
            scriptsPath = path.resolve(__dirname, '../scripts');
            logger.log(path.join(scriptsPath, 'update-aws-token.sh'));
            return Promise.reject('√');
          } else if (cmd2 === 'versions') {
            return new Promise((resolve, reject) => {
              osInfo((err, info) => {
                if (err) {
                  return reject(err);
                }
                printVersion.push('');
                printVersion.push(`${chalk.green(name)} v${nodePkg.version}`);
                printVersion.push(chalk.yellow('-'.repeat(30)));
                printVersion.push(`${chalk.magenta('cagorc version:')} ${cagoOptions.rc_version}`);
                printVersion.push(`${chalk.magenta('os platform:')} ${os.platform()}`);
                printVersion.push(`${chalk.magenta('cpu arch:')} ${os.arch()}`);
                printVersion.push(`${chalk.magenta('os info:')} ${info.name} ${info.version} (${info.kernel} ${info.kernelVersion})`);
                printVersion.push(chalk.yellow('-'.repeat(30)));
                Object.keys(process.versions).forEach((ver) => {
                  printVersion.push(`${chalk.magenta(`${ver} version:`)} ${process.versions[ver]}`);
                });
                printVersion.push(chalk.yellow('-'.repeat(30)));
                printVersion.push('');
                logger.log(printVersion.join('\n'));
                return reject('√');
              });
            });
          } else if (cmd2 === 'proxy') {
            return new Promise((resolve, reject) => {
              printVersion.push('');
              printVersion.push(`${chalk.green(name)} v${nodePkg.version}`);
              printVersion.push(chalk.yellow('-'.repeat(30)));
              printVersion.push(`${chalk.magenta('http_proxy:')} ${process.env.http_proxy || ''}`);
              printVersion.push(`${chalk.magenta('https_proxy:')} ${process.env.https_proxy || ''}`);
              printVersion.push(`${chalk.magenta('no_proxy:')} ${process.env.no_proxy || ''}`);
              printVersion.push(`${chalk.magenta('HTTP_PROXY:')} ${process.env.HTTP_PROXY || ''}`);
              printVersion.push(`${chalk.magenta('HTTPS_PROXY:')} ${process.env.HTTPS_PROXY || ''}`);
              printVersion.push(`${chalk.magenta('NO_PROXY:')} ${process.env.NO_PROXY || ''}`);
              printVersion.push(chalk.yellow('-'.repeat(30)));
              printVersion.push('');
              logger.log(printVersion.join('\n'));
              return reject('√');
            });
          }
          printHelp.push('');
          printHelp.push(`\t${chalk.yellow('Sub Command(s):')}\n`);
          printHelp.push(`\t   ${chalk.green('proxy    ')} Displays the proxy settings`);
          printHelp.push(`\t   ${chalk.green('update   ')} Displays the path to the 'update-aws-token.sh' script for sourcing and exits`);
          printHelp.push(`\t\t\tUsage when sourcing: ${chalk.magenta('source $(cago env update) [AWS Profile Name]')}\n`);
          printHelp.push(`\t   ${chalk.green('versions ')} Displays the versions of different components`);
          printHelp.push(`\t   ${chalk.green('help     ')} Displays this help message and exits\n`);
          logger.log(printHelp.join('\n'));
          return Promise.reject('√');
        }
        return Promise.resolve();
      })
      .then(() => new Promise((resolve, reject) => {
        pathUtils.verifyPaths(cagoOptions)
          .then(() => pluginUtils.checkPlugins(cagoOptions, { loadPluginMetadata: true }))
          .then(() => {
            resolve();
          })
          .catch((err) => {
            logger.error(chalk.red(`\n${err}`));
            logger.error(chalk.red(`\nPlease run setup command first: ${chalk.magenta('cago setup')}\n`));
            reject('√');
          });
      }))
      .then(() => {
        switch (cmd1) {
          case 'refresh':
            return refreshCmd.run(cagoOptions);

          case 'exclude':
            return excludeCmd.run(cagoOptions);

          case 'update':
          default:
            return updateCmd.run(cagoOptions);
        }
      })
      .then(() => {
        finalResolve();
      })
      .catch((err) => {
        if (err === '√') {
          finalResolve();
        } else {
          finalReject(err);
        }
      });
  });
}

module.exports = cago;
