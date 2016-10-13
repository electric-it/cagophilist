'use strict';

const should = require('should');
const chalk = require('chalk');
// const Promise = require('bluebird');
const td = require('testdouble');

describe('GetRoles Tests', () => {
  const logger = require('../lib/utils/logger');

  let cagoOptions;
  let actualTxt = [];
  const TEMP_CAGO_CONFIG = '/tmp/cagoConfig';

  beforeEach(() => {
    td.replace(logger, 'error', (msg) => {
      actualTxt.push(msg);
    });
    cagoOptions = {
      locked: {
        cagoConfigPath: TEMP_CAGO_CONFIG,
      },
    };
  });

  afterEach(() => {
    td.reset();
    actualTxt = [];
    cagoOptions = {};
  });

  it('should fail with no configured plugins', (done) => {
    const pluginUtils = require('../lib/utils/plugin');

    td.replace(pluginUtils, 'runPlugins', () => new Promise((resolve, reject) => reject('No plugin setup for hook: test')));
    const getRoles = require('../lib/getRoles');

    cagoOptions = Object.assign({}, cagoOptions, {
      aws: {
        rolesSource: 'plugin',
      },
    });
    getRoles(cagoOptions)
      .then(() => {
        done('Rejection failed.');
      })
      .catch((err) => {
        should(actualTxt.join('')).be.eql([
          chalk.red(`\nError occurred while fetching roles\n`),
        ].join(''));
        should(err).be.eql('No plugin setup for hook: test');
        done();
      });
  });

  it('should fail with no roles returned from roleUtils.processRoles when using plugin settings', (done) => {
    const pluginUtils = require('../lib/utils/plugin');
    const roleUtils = require('../lib/utils/role');

    td.replace(pluginUtils, 'runPlugins', () => new Promise((resolve) => resolve({})));
    td.replace(roleUtils, 'processRoles', () => null);
    const getRoles = require('../lib/getRoles');

    cagoOptions = Object.assign({}, cagoOptions, {
      aws: {
        rolesSource: 'plugin',
      },
    });
    getRoles(cagoOptions)
      .then(() => {
        done('Rejection failed.');
      })
      .catch((err) => {
        should(err).be.eql('An error occurred while processing roles.');
        done();
      });
  });

  it('should succeed with processed roles when using plugin settings', (done) => {
    const processedRoles = {
      arnCollection: {
        temp: true,
      },
      padAmount: 8,
    };
    const pluginUtils = require('../lib/utils/plugin');
    const roleUtils = require('../lib/utils/role');

    td.replace(pluginUtils, 'runPlugins', () => new Promise((resolve) => resolve({})));
    td.replace(roleUtils, 'processRoles', () => ({
      arnCollection: {
        temp: true,
      },
      padAmount: 8,
    }));
    const getRoles = require('../lib/getRoles');

    cagoOptions = Object.assign({}, cagoOptions, {
      aws: {
        rolesSource: 'plugin',
      },
    });
    getRoles(cagoOptions)
      .then((ret) => {
        should(ret).be.deepEqual(processedRoles);
        done();
      })
      .catch((err) => {
        done(err);
      });
  });

  it('should fail with no roles returned from roleUtils.processRoles when using manual settings', (done) => {
    const roleUtils = require('../lib/utils/role');

    td.replace(roleUtils, 'processRoles', () => null);
    const getRoles = require('../lib/getRoles');

    cagoOptions = Object.assign({}, cagoOptions, {
      aws: {
        rolesSource: 'settings',
      },
      roles: [{
        roleArn: 'arn:aws:iam::123456789012:role/S3-FullAccess',
        principalArn: 'arn:aws:iam::123456789012:root/user',
      }, {
        roleArn: 'arn:aws:iam::123456789013:role/S3-ReadOnly',
        principalArn: 'arn:aws:iam::123456789012:root/user',
      }, {
        roleArn: 'arn:aws:iam::123456789014:role/EC2-Access',
        principalArn: 'arn:aws:iam::123456789012:root/user',
      }, {
        roleArn: 'arn:aws:iam::123456789012:role/Test-Role',
        principalArn: 'arn:aws:iam::123456789012:root/user',
      }, {
        roleArn: 'arn:aws:iam::123456789015:role/S3-FullAccess',
        principalArn: 'arn:aws:iam::123456789012:root/user',
      }],
    });
    getRoles(cagoOptions)
      .then(() => {
        done('Rejection failed.');
      })
      .catch((err) => {
        should(err).be.eql('An error occurred while processing roles.');
        done();
      });
  });

  it('should succeed with processed roles when using manual settings', (done) => {
    const roleUtils = require('../lib/utils/role');

    const processedRoles = {
      arnCollection: {
        temp: true,
      },
      padAmount: 8,
    };
    td.replace(roleUtils, 'processRoles', () => ({
      arnCollection: {
        temp: true,
      },
      padAmount: 8,
    }));
    const getRoles = require('../lib/getRoles');

    cagoOptions = Object.assign({}, cagoOptions, {
      aws: {
        rolesSource: 'settings',
      },
      roles: [{
        roleArn: 'arn:aws:iam::123456789012:role/S3-FullAccess',
        principalArn: 'arn:aws:iam::123456789012:root/user',
      }, {
        roleArn: 'arn:aws:iam::123456789013:role/S3-ReadOnly',
        principalArn: 'arn:aws:iam::123456789012:root/user',
      }, {
        roleArn: 'arn:aws:iam::123456789014:role/EC2-Access',
        principalArn: 'arn:aws:iam::123456789012:root/user',
      }, {
        roleArn: 'arn:aws:iam::123456789012:role/Test-Role',
        principalArn: 'arn:aws:iam::123456789012:root/user',
      }, {
        roleArn: 'arn:aws:iam::123456789015:role/S3-FullAccess',
        principalArn: 'arn:aws:iam::123456789012:root/user',
      }],
    });
    getRoles(cagoOptions)
      .then((ret) => {
        should(ret).be.deepEqual(processedRoles);
        done();
      })
      .catch((err) => {
        done(err);
      });
  });

  it('should fail with when missing role settings', (done) => {
    const getRoles = require('../lib/getRoles');

    cagoOptions = Object.assign({}, cagoOptions, {
      aws: {
        rolesSource: 'settings',
      },
      roles: null,
    });
    getRoles(cagoOptions)
      .then(() => {
        done('Rejection failed.');
      })
      .catch((err) => {
        should(actualTxt.join('')).be.eql([
          chalk.red(`\nMissing roles from the settings ${chalk.cyan(cagoOptions.locked.cagorcFilePath)}\n`),
        ].join(''));
        should(err).be.eql(undefined);
        done();
      });
  });
});
