'use strict';

const should = require('should');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const td = require('testdouble');

describe('GetOptions Tests', () => {
  const logger = require('../lib/utils/logger');

  let getOptions;
  const TEMP_CAGO_RC = '/tmp/.cagorc';
  const CAGO_RC_VERSION = '1.0.1';
  let tempCagoRCContent;
  let cagoOptions;
  let actualTxt = [];

  beforeEach(() => {
    td.replace(logger, 'log', (msg) => {
      actualTxt.push(msg);
    });
    td.replace(logger, 'error', (msg) => {
      actualTxt.push(msg);
    });
    tempCagoRCContent = fs.readFileSync(TEMP_CAGO_RC.replace('/tmp', path.join(__dirname, 'data/getOptions')), 'utf-8');
    cagoOptions = JSON.parse(tempCagoRCContent);
    fs.writeFileSync(TEMP_CAGO_RC, tempCagoRCContent, 'utf-8');
    process.env.HOME = '/tmp';
    getOptions = require('../lib/getOptions');
  });

  afterEach(() => {
    td.reset();
    getOptions = null;
    actualTxt = [];
    try {
      fs.unlinkSync(TEMP_CAGO_RC);
    } catch (e) {
      // suppress error
    }
  });

  it('should fail with error without cago options file', (done) => {
    fs.unlinkSync(TEMP_CAGO_RC);
    getOptions()
      .then(() => {
        done('Rejection failed.');
      })
      .catch(() => {
        should(actualTxt.join('')).be.eql([
          chalk.red(`\nNo configuration file found ${chalk.cyan(TEMP_CAGO_RC)}\n`),
        ].join(''));
        done();
      });
  });

  it('should fail with error when cago options has incorrect json data structure', (done) => {
    let caughtError;
    try {
      tempCagoRCContent = '{"test":"true",}';
      fs.writeFileSync(TEMP_CAGO_RC, tempCagoRCContent, 'utf-8');
      cagoOptions = JSON.parse(tempCagoRCContent);
    } catch (e) {
      caughtError = e;
    }
    getOptions = require('../lib/getOptions');

    getOptions()
      .then(() => {
        done('Rejection failed.');
      })
      .catch(() => {
        should(actualTxt.join('')).be.eql([
          chalk.red(`\nError encountered while parsing ${chalk.cyan(TEMP_CAGO_RC)}:\n`),
          `${chalk.red(caughtError)}\n`,
        ].join(''));
        done();
      });
  });

  it('should bring back correct config settings', (done) => {
    getOptions()
      .then((ret) => {
        should(ret).be.deepEqual(Object.assign({}, cagoOptions, {
          locked: {
            awsCrendentialsFile: '/tmp/awsCredentials',
            cagoConfigPath: '/tmp/cagoConfig',
            cagorcFilePath: '/tmp/.cagorc',
            cagoPath: '/tmp/.cago',
          },
          roles: null,
          CAGO_RC_VERSION,
        }));
        done();
      })
      .catch((err) => {
        done(err);
      });
  });
});
