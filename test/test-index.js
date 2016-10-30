'use strict';

const should = require('should');
const chalk = require('chalk');
const path = require('path');
const semver = require('semver');
const os = require('os');
const td = require('testdouble');

describe('Index Tests', () => {
  const nodePkg = require('../package.json');
  const updateCmd = require('../lib/update');
  const refreshCmd = require('../lib/refresh');
  const excludeCmd = require('../lib/exclude');
  const listCmd = require('../lib/list');
  const setupCmd = require('../lib/setup');
  const logger = require('../lib/utils/logger');
  const pluginUtils = require('../lib/utils/plugin');
  const pathUtils = require('../lib/utils/path');

  let outputRCVersionTxt = '';
  let outputTxt = '';
  let outputEnvTxt = '';
  let versionTxt = '';
  let actualTxt = [];
  let appName = '';
  const TEMP_CAGO_CONFIG = '/tmp/cagoConfig';
  const CAGO_RC_VERSION = '1.0.1';

  beforeEach(() => {
    td.replace(logger, 'log', (msg) => {
      actualTxt.push(msg);
    });
    td.replace(logger, 'error', (msg) => {
      actualTxt.push(msg);
    });

    appName = `${nodePkg.name.substr(0, 1).toUpperCase()}${nodePkg.name.substr(1)}`;
    versionTxt = `${appName} v${nodePkg.version}`;
    outputRCVersionTxt = `${chalk.red(`\n\nPlease update your cagorc settings to the latest rc_version: ${chalk.magenta(CAGO_RC_VERSION)}.\n`)}
${chalk.red(`Note: the settings file can be found here: ${chalk.magenta(TEMP_CAGO_CONFIG)}\n\n`)}`;
    outputTxt = `
\tUsage: ${chalk.magenta('cago [command]')}

\t${chalk.yellow('Command(s):')}

\t   ${chalk.green('env      ')}\t Gets the environment info through subcommands: ${chalk.yellow('[ update, help, versions, proxy ]')}
\t   ${chalk.green('exclude  ')}\t Exclude profiles from automatically refreshing when using "refresh" or "update" command
\t   ${chalk.green('list     ')}\t List the available profiles to refresh, update or assume
\t   ${chalk.green('refresh  ')}\t Refreshes all the expired profiles (using "refreshMinutes" setting for the threshold)
\t   ${chalk.green('setup    ')}\t Sets up the necessary files and adds the configured plugins
\t   ${chalk.green('update   ')}\t Updates the selected profile with the aws token
\t   ${chalk.green('version  ')}\t ${chalk.yellow('[ -v, -version, --version ]')} Displays the name and current version: ${versionTxt}

\t${chalk.yellow('Help Command(s):')}

\t   ${chalk.green('help     ')}\t ${chalk.yellow('[ -h, --help, -? ]')} Displays this help message and exits
`;
    outputEnvTxt = `
\t${chalk.yellow('Sub Command(s):')}\n
\t   ${chalk.green('proxy    ')} Displays the proxy settings
\t   ${chalk.green('update   ')} Displays the path to the 'update-aws-token.sh' script for sourcing and exits
\t\t\tUsage when sourcing: ${chalk.magenta('source $(cago env update) [AWS Profile Name]')}\n
\t   ${chalk.green('versions ')} Displays the versions of different components
\t   ${chalk.green('help     ')} Displays this help message and exits\n`;
  });

  afterEach(() => {
    td.reset();
    outputRCVersionTxt = '';
    outputTxt = '';
    outputEnvTxt = '';
    versionTxt = '';
    appName = '';
    actualTxt = [];
  });

  it('should return error with incorrect version of node.js', (done) => {
    td.replace(semver, 'satisfies', () => (false));
    const index = require('../lib/index');

    index()
      .then(() => {
        should(actualTxt.join('')).be.eql([
          chalk.red(`\n\nPlease installed a newer version of Node.js (requires node version to satisfy '${nodePkg.engines.node}' requirement)\n\n`),
        ].join(''));
        done();
      })
      .catch((err) => {
        done(err);
      });
  });

  it('should fail when getOptions returns error', (done) => {
    td.replace('../lib/getOptions', () => new Promise((resolve, reject) => reject('An error occurred in getOptions')));
    const index = require('../lib/index');

    index()
      .then(() => {
        done('Rejection failed.');
      })
      .catch((err) => {
        should(err).be.eql('An error occurred in getOptions');
        done();
      });
  });

  it('should display update message when .cagorc rc_version is missing', (done) => {
    td.replace(semver, 'gte', () => (false));
    td.replace('../lib/getOptions', () => new Promise((resolve) => resolve({
      locked: {
        cagoConfigPath: TEMP_CAGO_CONFIG,
      },
      CAGO_RC_VERSION,
    })));
    const index = require('../lib/index');

    index()
      .then(() => {
        should(actualTxt.join('\n')).be.eql(outputRCVersionTxt);
        done();
      })
      .catch((err) => {
        done(err);
      });
  });

  it('should reject promise for setup command when error', (done) => {
    td.replace('../lib/getOptions', () => new Promise((resolve) => resolve({
      rc_version: CAGO_RC_VERSION,
      CAGO_RC_VERSION,
    })));
    td.replace(setupCmd, 'run', () => new Promise((resolve, reject) => reject('An error occurred.')));
    const index = require('../lib/index');

    index('setup')
      .then(() => {
        done('Rejection failed.');
      })
      .catch((err) => {
        should(err).be.eql('An error occurred.');
        done();
      });
  });

  it('should resolve promise for setup command when successful', (done) => {
    td.replace('../lib/getOptions', () => new Promise((resolve) => resolve({
      rc_version: CAGO_RC_VERSION,
      CAGO_RC_VERSION,
    })));
    td.replace(setupCmd, 'run', () => new Promise((resolve) => resolve()));
    const index = require('../lib/index');

    index('setup')
      .then(() => {
        should(actualTxt.join('')).be.eql('');
        done();
      })
      .catch((err) => {
        done(err);
      });
  });

  it('should display help menu with no arguments', (done) => {
    td.replace('../lib/getOptions', () => new Promise((resolve) => resolve({
      rc_version: CAGO_RC_VERSION,
      CAGO_RC_VERSION,
    })));
    const index = require('../lib/index');

    index()
      .then(() => {
        should(actualTxt.join('')).be.eql(outputTxt);
        done();
      })
      .catch((err) => {
        done(err);
      });
  });

  it('should display help menu with "-h"', (done) => {
    td.replace('../lib/getOptions', () => new Promise((resolve) => resolve({
      rc_version: CAGO_RC_VERSION,
      CAGO_RC_VERSION,
    })));
    const index = require('../lib/index');

    index('-h')
      .then(() => {
        should(actualTxt.join('')).be.eql(outputTxt);
        done();
      })
      .catch((err) => {
        done(err);
      });
  });

  it('should display help menu with "--help"', (done) => {
    td.replace('../lib/getOptions', () => new Promise((resolve) => resolve({
      rc_version: CAGO_RC_VERSION,
      CAGO_RC_VERSION,
    })));
    const index = require('../lib/index');

    index('--help')
      .then(() => {
        should(actualTxt.join('')).be.eql(outputTxt);
        done();
      })
      .catch((err) => {
        done(err);
      });
  });

  it('should display help menu with "help"', (done) => {
    td.replace('../lib/getOptions', () => new Promise((resolve) => resolve({
      rc_version: CAGO_RC_VERSION,
      CAGO_RC_VERSION,
    })));
    const index = require('../lib/index');

    index('help')
      .then(() => {
        should(actualTxt.join('')).be.eql(outputTxt);
        done();
      })
      .catch((err) => {
        done(err);
      });
  });

  it('should display help menu with "-?"', (done) => {
    td.replace('../lib/getOptions', () => new Promise((resolve) => resolve({
      rc_version: CAGO_RC_VERSION,
      CAGO_RC_VERSION,
    })));
    const index = require('../lib/index');

    index('-?')
      .then(() => {
        should(actualTxt.join('')).be.eql(outputTxt);
        done();
      })
      .catch((err) => {
        done(err);
      });
  });

  it('should display help menu with error message when command is "wrong"', (done) => {
    td.replace('../lib/getOptions', () => new Promise((resolve) => resolve({
      rc_version: CAGO_RC_VERSION,
      CAGO_RC_VERSION,
    })));
    const index = require('../lib/index');

    outputTxt = `\n${chalk.red('Error unknown command(s): "wrong", please refer to the help menu below.')}\n${outputTxt}`;
    index('wrong')
      .then(() => {
        should(actualTxt.join('')).be.eql(outputTxt);
        done();
      })
      .catch((err) => {
        done(err);
      });
  });

  it('should display version with "-v"', (done) => {
    td.replace('../lib/getOptions', () => new Promise((resolve) => resolve({
      rc_version: CAGO_RC_VERSION,
      CAGO_RC_VERSION,
    })));
    const index = require('../lib/index');

    index('-v')
      .then(() => {
        should(actualTxt.join('')).be.eql(versionTxt);
        done();
      })
      .catch((err) => {
        done(err);
      });
  });

  it('should display version with "-version"', (done) => {
    td.replace('../lib/getOptions', () => new Promise((resolve) => resolve({
      rc_version: CAGO_RC_VERSION,
      CAGO_RC_VERSION,
    })));
    const index = require('../lib/index');

    index('-version')
      .then(() => {
        should(actualTxt.join('')).be.eql(versionTxt);
        done();
      })
      .catch((err) => {
        done(err);
      });
  });

  it('should display version with "--version"', (done) => {
    td.replace('../lib/getOptions', () => new Promise((resolve) => resolve({
      rc_version: CAGO_RC_VERSION,
      CAGO_RC_VERSION,
    })));
    const index = require('../lib/index');

    index('--version')
      .then(() => {
        should(actualTxt.join('')).be.eql(versionTxt);
        done();
      })
      .catch((err) => {
        done(err);
      });
  });

  it('should display version with "version"', (done) => {
    td.replace('../lib/getOptions', () => new Promise((resolve) => resolve({
      rc_version: CAGO_RC_VERSION,
      CAGO_RC_VERSION,
    })));
    const index = require('../lib/index');

    index('version')
      .then(() => {
        should(actualTxt.join('')).be.eql(versionTxt);
        done();
      })
      .catch((err) => {
        done(err);
      });
  });

  it('should fail with error from os-cli with arguments "env" "versions"', (done) => {
    td.replace('../lib/getOptions', () => new Promise((resolve) => resolve({
      rc_version: CAGO_RC_VERSION,
      CAGO_RC_VERSION,
    })));
    td.replace('os-cli', (callback) => callback('An error occurred with os-cli'));
    const index = require('../lib/index');

    index('env', 'versions')
      .then(() => {
        done('Rejection failed.');
      })
      .catch((err) => {
        should(err).be.eql('An error occurred with os-cli');
        done();
      });
  });

  it('should display versions of different components with arguments "env" "versions"', (done) => {
    td.replace('../lib/getOptions', () => new Promise((resolve) => resolve({
      rc_version: CAGO_RC_VERSION,
      CAGO_RC_VERSION,
    })));
    td.replace('os-cli', (callback) => callback(null, {
      name: 'Cago',
      version: '1.0.0',
      kernel: 'Node.js',
      kernelVersion: '4.3.2',
    }));
    const index = require('../lib/index');

    const cagoOptions = { rc_version: CAGO_RC_VERSION };
    const info = {
      name: 'Cago',
      version: '1.0.0',
      kernel: 'Node.js',
      kernelVersion: '4.3.2',
    };
    const localOutputTxt = [];
    localOutputTxt.push('');
    localOutputTxt.push(`${chalk.green(appName)} v${nodePkg.version}`);
    localOutputTxt.push(chalk.yellow('-'.repeat(30)));
    localOutputTxt.push(`${chalk.magenta('cagorc version:')} ${cagoOptions.rc_version}`);
    localOutputTxt.push(`${chalk.magenta('os platform:')} ${os.platform()}`);
    localOutputTxt.push(`${chalk.magenta('cpu arch:')} ${os.arch()}`);
    localOutputTxt.push(`${chalk.magenta('os info:')} ${info.name} ${info.version} (${info.kernel} ${info.kernelVersion})`);
    localOutputTxt.push(chalk.yellow('-'.repeat(30)));
    Object.keys(process.versions).forEach((ver) => {
      localOutputTxt.push(`${chalk.magenta(`${ver} version:`)} ${process.versions[ver]}`);
    });
    localOutputTxt.push(chalk.yellow('-'.repeat(30)));
    localOutputTxt.push('');

    index('env', 'versions')
      .then(() => {
        should(actualTxt.join('\n')).be.eql(localOutputTxt.join('\n'));
        done();
      })
      .catch((err) => {
        done(err);
      });
  });

  it('should display proxy settings with arguments "env" "proxy"', (done) => {
    const proxyInfo = {
      http_proxy: 'temp-proxy',
      https_proxy: 'temp-proxy-https',
      no_proxy: 'temp-no-proxy',
      HTTP_PROXY: 'temp-proxy',
      HTTPS_PROXY: 'temp-proxy-https',
      NO_PROXY: 'temp-no-proxy',
    };
    Object.keys(proxyInfo).forEach((proxyKey) => {
      process.env[proxyKey] = proxyInfo[proxyKey];
    });
    td.replace('../lib/getOptions', () => new Promise((resolve) => resolve({
      rc_version: CAGO_RC_VERSION,
      CAGO_RC_VERSION,
    })));
    const index = require('../lib/index');

    const localOutputTxt = [];
    localOutputTxt.push('');
    localOutputTxt.push(`${chalk.green(appName)} v${nodePkg.version}`);
    localOutputTxt.push(chalk.yellow('-'.repeat(30)));
    localOutputTxt.push(`${chalk.magenta('http_proxy:')} ${proxyInfo.http_proxy}`);
    localOutputTxt.push(`${chalk.magenta('https_proxy:')} ${proxyInfo.https_proxy}`);
    localOutputTxt.push(`${chalk.magenta('no_proxy:')} ${proxyInfo.no_proxy}`);
    localOutputTxt.push(`${chalk.magenta('HTTP_PROXY:')} ${proxyInfo.HTTP_PROXY}`);
    localOutputTxt.push(`${chalk.magenta('HTTPS_PROXY:')} ${proxyInfo.HTTPS_PROXY}`);
    localOutputTxt.push(`${chalk.magenta('NO_PROXY:')} ${proxyInfo.NO_PROXY}`);
    localOutputTxt.push(chalk.yellow('-'.repeat(30)));
    localOutputTxt.push('');

    index('env', 'proxy')
      .then(() => {
        Object.keys(proxyInfo).forEach((proxyKey) => {
          delete process.env[proxyKey];
        });
        should(actualTxt.join('\n')).be.eql(localOutputTxt.join('\n'));
        done();
      })
      .catch((err) => {
        done(err);
      });
  });

  it('should display no proxy settings with arguments "env" "proxy"', (done) => {
    td.replace('../lib/getOptions', () => new Promise((resolve) => resolve({
      rc_version: CAGO_RC_VERSION,
      CAGO_RC_VERSION,
    })));
    const index = require('../lib/index');

    const localOutputTxt = [];
    localOutputTxt.push('');
    localOutputTxt.push(`${chalk.green(appName)} v${nodePkg.version}`);
    localOutputTxt.push(chalk.yellow('-'.repeat(30)));
    localOutputTxt.push(`${chalk.magenta('http_proxy:')} `);
    localOutputTxt.push(`${chalk.magenta('https_proxy:')} `);
    localOutputTxt.push(`${chalk.magenta('no_proxy:')} `);
    localOutputTxt.push(`${chalk.magenta('HTTP_PROXY:')} `);
    localOutputTxt.push(`${chalk.magenta('HTTPS_PROXY:')} `);
    localOutputTxt.push(`${chalk.magenta('NO_PROXY:')} `);
    localOutputTxt.push(chalk.yellow('-'.repeat(30)));
    localOutputTxt.push('');

    index('env', 'proxy')
      .then(() => {
        should(actualTxt.join('\n')).be.eql(localOutputTxt.join('\n'));
        done();
      })
      .catch((err) => {
        done(err);
      });
  });

  it('should return the path to update-aws-token.sh with "env" "update"', (done) => {
    td.replace('../lib/getOptions', () => new Promise((resolve) => resolve({
      rc_version: CAGO_RC_VERSION,
      CAGO_RC_VERSION,
    })));
    const index = require('../lib/index');

    const scriptsPath = path.resolve(__dirname, '../scripts');
    const updateScriptPath = path.join(scriptsPath, 'update-aws-token.sh');
    index('env', 'update')
      .then(() => {
        should(actualTxt.join('')).be.eql(updateScriptPath);
        done();
      })
      .catch((err) => {
        done(err);
      });
  });

  it('should return the path to update-aws-token.sh with "env" "help"', (done) => {
    td.replace('../lib/getOptions', () => new Promise((resolve) => resolve({
      rc_version: CAGO_RC_VERSION,
      CAGO_RC_VERSION,
    })));
    const index = require('../lib/index');

    index('env', 'help')
      .then(() => {
        should(actualTxt.join('')).be.eql(outputEnvTxt);
        done();
      })
      .catch((err) => {
        done(err);
      });
  });

  it('should return the path to update-aws-token.sh with "env" ""', (done) => {
    td.replace('../lib/getOptions', () => new Promise((resolve) => resolve({
      rc_version: CAGO_RC_VERSION,
      CAGO_RC_VERSION,
    })));
    const index = require('../lib/index');

    index('env', '')
      .then(() => {
        should(actualTxt.join('')).be.eql(outputEnvTxt);
        done();
      })
      .catch((err) => {
        done(err);
      });
  });

  it('should return error with a message to run setup first', (done) => {
    td.replace('../lib/getOptions', () => new Promise((resolve) => resolve({
      rc_version: CAGO_RC_VERSION,
      CAGO_RC_VERSION,
    })));
    td.replace(updateCmd, 'run', () => new Promise((resolve) => resolve()));
    const index = require('../lib/index');

    index('update')
      .then(() => {
        should(actualTxt.join('')).be.eql([
          chalk.red(`\nTypeError: Cannot convert undefined or null to object`),
          chalk.red(`\nPlease run setup command first: ${chalk.magenta('cago setup')}\n`),
        ].join(''));
        done();
      })
      .catch((err) => {
        done(err);
      });
  });

  it('should resolve promise for update command when successful', (done) => {
    td.replace('../lib/getOptions', () => new Promise((resolve) => resolve({
      rc_version: CAGO_RC_VERSION,
      CAGO_RC_VERSION,
    })));
    td.replace(pathUtils, 'verifyPaths', () => new Promise((resolve) => resolve()));
    td.replace(pluginUtils, 'checkPlugins', () => new Promise((resolve) => resolve()));
    td.replace(updateCmd, 'run', () => new Promise((resolve) => resolve()));
    const index = require('../lib/index');

    index('update')
      .then(() => {
        done();
      })
      .catch((err) => {
        done(err);
      });
  });

  it('should reject promise for update command when error', (done) => {
    td.replace('../lib/getOptions', () => new Promise((resolve) => resolve({
      rc_version: CAGO_RC_VERSION,
      CAGO_RC_VERSION,
    })));
    td.replace(pathUtils, 'verifyPaths', () => new Promise((resolve) => resolve()));
    td.replace(pluginUtils, 'checkPlugins', () => new Promise((resolve) => resolve()));
    td.replace(updateCmd, 'run', () => new Promise((resolve, reject) => reject('An error occurred.')));
    const index = require('../lib/index');

    index('update')
      .then(() => {
        done('Rejection failed.');
      })
      .catch(() => {
        done();
      });
  });

  it('should resolve promise for refresh command when successful', (done) => {
    td.replace('../lib/getOptions', () => new Promise((resolve) => resolve({
      rc_version: CAGO_RC_VERSION,
      CAGO_RC_VERSION,
    })));
    td.replace(pathUtils, 'verifyPaths', () => new Promise((resolve) => resolve()));
    td.replace(pluginUtils, 'checkPlugins', () => new Promise((resolve) => resolve()));
    td.replace(refreshCmd, 'run', () => new Promise((resolve) => resolve()));
    const index = require('../lib/index');

    index('refresh')
      .then(() => {
        done();
      })
      .catch((err) => {
        done(err);
      });
  });

  it('should reject promise for refresh command when error', (done) => {
    td.replace('../lib/getOptions', () => new Promise((resolve) => resolve({
      rc_version: CAGO_RC_VERSION,
      CAGO_RC_VERSION,
    })));
    td.replace(pathUtils, 'verifyPaths', () => new Promise((resolve) => resolve()));
    td.replace(pluginUtils, 'checkPlugins', () => new Promise((resolve) => resolve()));
    td.replace(refreshCmd, 'run', () => new Promise((resolve, reject) => reject('An error occurred.')));
    const index = require('../lib/index');

    index('refresh')
      .then(() => {
        done('Rejection failed.');
      })
      .catch(() => {
        done();
      });
  });

  it('should resolve promise for exclude command when successful', (done) => {
    td.replace('../lib/getOptions', () => new Promise((resolve) => resolve({
      rc_version: CAGO_RC_VERSION,
      CAGO_RC_VERSION,
    })));
    td.replace(pathUtils, 'verifyPaths', () => new Promise((resolve) => resolve()));
    td.replace(pluginUtils, 'checkPlugins', () => new Promise((resolve) => resolve()));
    td.replace(excludeCmd, 'run', () => new Promise((resolve) => resolve()));
    const index = require('../lib/index');

    index('exclude')
      .then(() => {
        done();
      })
      .catch((err) => {
        done(err);
      });
  });

  it('should reject promise for exclude command when error', (done) => {
    td.replace('../lib/getOptions', () => new Promise((resolve) => resolve({
      rc_version: CAGO_RC_VERSION,
      CAGO_RC_VERSION,
    })));
    td.replace(pathUtils, 'verifyPaths', () => new Promise((resolve) => resolve()));
    td.replace(pluginUtils, 'checkPlugins', () => new Promise((resolve) => resolve()));
    td.replace(excludeCmd, 'run', () => new Promise((resolve, reject) => reject('An error occurred.')));
    const index = require('../lib/index');

    index('exclude')
      .then(() => {
        done('Rejection failed.');
      })
      .catch(() => {
        done();
      });
  });

  it('should resolve promise for list command when successful', (done) => {
    td.replace('../lib/getOptions', () => new Promise((resolve) => resolve({
      rc_version: CAGO_RC_VERSION,
      CAGO_RC_VERSION,
    })));
    td.replace(pathUtils, 'verifyPaths', () => new Promise((resolve) => resolve()));
    td.replace(pluginUtils, 'checkPlugins', () => new Promise((resolve) => resolve()));
    td.replace(listCmd, 'run', () => new Promise((resolve) => resolve()));
    const index = require('../lib/index');

    index('list')
      .then(() => {
        done();
      })
      .catch((err) => {
        done(err);
      });
  });

  it('should reject promise for list command when error', (done) => {
    td.replace('../lib/getOptions', () => new Promise((resolve) => resolve({
      rc_version: CAGO_RC_VERSION,
      CAGO_RC_VERSION,
    })));
    td.replace(pathUtils, 'verifyPaths', () => new Promise((resolve) => resolve()));
    td.replace(pluginUtils, 'checkPlugins', () => new Promise((resolve) => resolve()));
    td.replace(listCmd, 'run', () => new Promise((resolve, reject) => reject('An error occurred.')));
    const index = require('../lib/index');

    index('list')
      .then(() => {
        done('Rejection failed.');
      })
      .catch(() => {
        done();
      });
  });
});
