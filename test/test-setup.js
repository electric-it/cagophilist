'use strict';

const should = require('should');
const chalk = require('chalk');
const Promise = require('bluebird');
const td = require('testdouble');

describe('Setup Tests', () => {
  const logger = require('../lib/utils/logger');
  const pathUtils = require('../lib/utils/path');
  const pluginUtils = require('../lib/utils/plugin');

  const TEMP_CAGO_PATH = '/tmp/.cago/';
  let actualTxt = [];
  const cagoOptions = {
    locked: {
      cagoPath: TEMP_CAGO_PATH,
    },
  };

  beforeEach(() => {
    td.replace(logger, 'stdoutWrite', (msg) => {
      actualTxt.push(msg);
    });
    td.replace(logger, 'log', (msg) => {
      actualTxt.push(msg);
    });
    td.replace(logger, 'error', (msg) => {
      actualTxt.push(msg);
    });
  });
  afterEach(() => {
    td.reset();
    actualTxt = [];
  });

  it('should fail when pathUtils.setupPaths returns error', (done) => {
    td.replace(pathUtils, 'setupPaths', () => new Promise((resolve, reject) => reject('An error occurred.')));
    const setupCmd = require('../lib/setup');

    setupCmd.run(cagoOptions)
      .then(() => {
        done('Rejection failed.');
      })
      .catch((err) => {
        should(err).be.eql('An error occurred.');
        should(actualTxt.join('')).be.eql([
          '',
          `\tChecking the paths: ${chalk.yellow('...')}`,
          `\r\tChecking the paths: ${chalk.red(' X ')}`,
        ].join(''));
        done();
      });
  });

  it('should fail when pluginUtils.setupPluginPaths returns error', (done) => {
    td.replace(pathUtils, 'setupPaths', () => new Promise((resolve) => resolve({})));
    td.replace(pluginUtils, 'setupPluginPaths', () => new Promise((resolve, reject) => reject('An error occurred.')));
    const setupCmd = require('../lib/setup');

    setupCmd.run(cagoOptions)
      .then(() => {
        done('Rejection failed.');
      })
      .catch((err) => {
        should(err).be.eql('An error occurred.');
        should(actualTxt.join('')).be.eql([
          '',
          `\tChecking the paths: ${chalk.yellow('...')}`,
          `\r\tChecking the paths: ${chalk.green(' √ ')}`,
          `\tChecking the plugins path: ${chalk.yellow('...')}`,
          `\r\tChecking the plugins path: ${chalk.red(' X ')}`,
        ].join(''));
        done();
      });
  });

  it('should fail when pluginUtils.installPlugins returns error', (done) => {
    td.replace(pathUtils, 'setupPaths', () => new Promise((resolve) => resolve({})));
    td.replace(pluginUtils, 'setupPluginPaths', () => new Promise((resolve) => resolve({})));
    td.replace(pluginUtils, 'installPlugins', () => new Promise((resolve, reject) => reject('An error occurred.')));
    const setupCmd = require('../lib/setup');

    setupCmd.run(cagoOptions)
      .then(() => {
        done('Rejection failed.');
      })
      .catch((err) => {
        should(err).be.eql('An error occurred.');
        should(actualTxt.join('')).be.eql([
          '',
          `\tChecking the paths: ${chalk.yellow('...')}`,
          `\r\tChecking the paths: ${chalk.green(' √ ')}`,
          `\tChecking the plugins path: ${chalk.yellow('...')}`,
          `\r\tChecking the plugins path: ${chalk.green(' √ ')}`,
          `\tChecking the plugins: ${chalk.yellow('...')}`,
          `\r\tChecking the plugins: ${chalk.red(' X ')}`,
        ].join(''));
        done();
      });
  });

  it('should succeed when pluginUtils succeeds', (done) => {
    td.replace(pathUtils, 'setupPaths', () => new Promise((resolve) => resolve({})));
    td.replace(pluginUtils, 'setupPluginPaths', () => new Promise((resolve) => resolve({})));
    td.replace(pluginUtils, 'installPlugins', () => new Promise((resolve) => resolve({})));
    const setupCmd = require('../lib/setup');

    setupCmd.run(cagoOptions)
      .then((ret) => {
        should(ret).be.eql(undefined);
        should(actualTxt.join('')).be.eql([
          '',
          `\tChecking the paths: ${chalk.yellow('...')}`,
          `\r\tChecking the paths: ${chalk.green(' √ ')}`,
          `\tChecking the plugins path: ${chalk.yellow('...')}`,
          `\r\tChecking the plugins path: ${chalk.green(' √ ')}`,
          `\tChecking the plugins: ${chalk.yellow('...')}`,
          `\r\tChecking the plugins: ${chalk.green(' √ ')}`,
        ].join(''));
        done();
      })
      .catch((err) => {
        done(err);
      });
  });
});
