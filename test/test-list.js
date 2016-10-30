'use strict';

const should = require('should');
const chalk = require('chalk');
const Promise = require('bluebird');
const td = require('testdouble');

describe('List Tests', () => {
  const logger = require('../lib/utils/logger');

  beforeEach(() => {});
  afterEach(() => {
    td.reset();
  });

  it('should fail when getConfig returns error', (done) => {
    const cagoOptions = {};
    td.replace('../lib/getConfig', () => new Promise((resolve, reject) => reject('An error occurred with getConfig')));
    const listCmd = require('../lib/list');

    listCmd.run(cagoOptions)
      .then(() => {
        done('Rejection failed.');
      })
      .catch((err) => {
        should(err).be.eql('An error occurred with getConfig');
        done();
      });
  });

  it('should succeed with correct data', (done) => {
    const cagoOptions = {
      locked: {
        cagoConfigPath: 'path/to/cago/config/file.json',
      },
    };
    const actualTxt = [];
    td.replace(logger, 'log', (msg) => {
      actualTxt.push(msg);
    });
    td.replace('../lib/getConfig', () => new Promise((resolve) => resolve({
      credentials: {
        test: {},
        test2: {},
      },
      config: {
        test: {
          exclude: true,
        },
        test2: {},
      },
    })));
    const listCmd = require('../lib/list');

    listCmd.run(cagoOptions)
      .then(() => {
        should(actualTxt.join('')).be.eql([
          chalk.yellow(`\n\tExcluded:\n\t   ${['test'].join('\n\t   ')}`),
          `\n\t${chalk.green('Available:')}\n\t   ${[chalk.green('test2'), '\tsource $(cago env update) test2'].join('\n\t   ')}`,
        ].join(''));
        done();
      })
      .catch((err) => {
        done(err);
      });
  });
});
