'use strict';

const should = require('should');
const chalk = require('chalk');
const Promise = require('bluebird');
const inquirer = require('inquirer');
const td = require('testdouble');

describe('Exclude Tests', () => {
  const logger = require('../lib/utils/logger');
  const iniUtils = require('../lib/utils/ini');

  beforeEach(() => {});
  afterEach(() => {
    td.reset();
  });

  it('should fail when getConfig returns error', (done) => {
    const cagoOptions = {};
    td.replace('../lib/getConfig', () => new Promise((resolve, reject) => reject('An error occurred with getConfig')));
    const excludeCmd = require('../lib/exclude');

    excludeCmd.run(cagoOptions)
      .then(() => {
        done('Rejection failed.');
      })
      .catch((err) => {
        should(err).be.eql('An error occurred with getConfig');
        done();
      });
  });

  it('should print error when there are no profiles', (done) => {
    const cagoOptions = {};
    let actualTxt = null;
    td.replace(logger, 'log', (msg) => {
      actualTxt = msg;
    });
    td.replace('../lib/getConfig', () => new Promise((resolve) => resolve({
      credentials: {},
      config: {},
    })));
    const excludeCmd = require('../lib/exclude');

    excludeCmd.run(cagoOptions)
      .then(() => {
        should(actualTxt).be.eql(chalk.yellow('\nNo profiles found.\n\n'));
        done();
      })
      .catch((err) => {
        done(err);
      });
  });

  it('should fail when inquirer.prompt returns error', (done) => {
    const cagoOptions = {};
    td.replace('../lib/getConfig', () => new Promise((resolve) => resolve({
      credentials: {
        test: {},
      },
      config: {},
    })));
    td.replace(inquirer, 'prompt', () => new Promise((resolve, reject) => reject('An error occurred with inquirer.prompt')));
    const excludeCmd = require('../lib/exclude');

    excludeCmd.run(cagoOptions)
      .then(() => {
        done('Rejection failed.');
      })
      .catch((err) => {
        should(err).be.eql('An error occurred with inquirer.prompt');
        done();
      });
  });

  it('should fail when iniUtils.writeIniFile returns error', (done) => {
    const cagoOptions = {
      locked: {
        cagoConfigPath: 'path/to/cago/config/file.json',
      },
    };
    let actualTxt = null;
    td.replace(logger, 'log', (msg) => {
      actualTxt = msg;
    });
    td.replace('../lib/getConfig', () => new Promise((resolve) => resolve({
      credentials: {
        test: {},
      },
      config: {},
    })));
    td.replace(inquirer, 'prompt', () => new Promise((resolve) => resolve({
      exclude: ['test'],
    })));
    td.replace(iniUtils, 'writeIniFile', () => new Promise((resolve, reject) => reject('An error occurred with iniUtils.writeIniFile')));
    const excludeCmd = require('../lib/exclude');

    excludeCmd.run(cagoOptions)
      .then(() => {
        done('Rejection failed.');
      })
      .catch((err) => {
        should(actualTxt).be.eql(chalk.green(`\nWriting the settings to the cagophilist config file: path/to/cago/config/file.json..\n`));
        should(err).be.eql('An error occurred with iniUtils.writeIniFile');
        done();
      });
  });

  it('should succeed with correct data', (done) => {
    const cagoOptions = {
      locked: {
        cagoConfigPath: 'path/to/cago/config/file.json',
      },
    };
    let actualTxt = null;
    td.replace(logger, 'log', (msg) => {
      actualTxt = msg;
    });
    td.replace('../lib/getConfig', () => new Promise((resolve) => resolve({
      credentials: {
        test: {},
      },
      config: {
        test: {
          exclude: true,
        },
      },
    })));
    td.replace(inquirer, 'prompt', () => new Promise((resolve) => resolve({
      exclude: [],
    })));
    td.replace(iniUtils, 'writeIniFile', () => new Promise((resolve) => resolve()));
    const excludeCmd = require('../lib/exclude');

    excludeCmd.run(cagoOptions)
      .then(() => {
        should(actualTxt).be.eql(chalk.green('... Done!\n\n'));
        done();
      })
      .catch((err) => {
        done(err);
      });
  });
});
