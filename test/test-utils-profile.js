'use strict';

const should = require('should');
const chalk = require('chalk');
const Promise = require('bluebird');
const td = require('testdouble');

describe('Profile Utils Tests', () => {
  const logger = require('../lib/utils/logger');

  let cagoOptions;
  let awsConfigs;
  let expiredProfiles;
  let SAMLResponse;
  let actualTxt = [];

  beforeEach(() => {
    td.replace(logger, 'log', (msg) => {
      actualTxt.push(msg);
    });
    cagoOptions = {
      autocopy: true,
    };
    awsConfigs = {};
    expiredProfiles = {
      temp: {
        roleArn: '',
        principalArn: '',
        region: 'us-east-1',
      },
    };
    SAMLResponse = 'test-saml-response-content';
  });

  afterEach(() => {
    td.reset();
    actualTxt = [];
  });

  it('should fail with no arguments', (done) => {
    td.replace('../lib/assumeRole', () => new Promise((resolve, reject) => reject('An error from assumeRole')));
    td.replace('../lib/writeConfig', () => new Promise((resolve, reject) => reject('An error from writeConfig')));
    const profileUtils = require('../lib/utils/profile');

    profileUtils.processExpiredProfiles()
      .then(() => {
        done('Rejection failed.');
      })
      .catch((err) => {
        should(err.message).be.eql('Cannot convert undefined or null to object');
        done();
      });
  });

  it('should fail with error from assumeRole', (done) => {
    td.replace('../lib/assumeRole', () => new Promise((resolve, reject) => reject('An error from assumeRole')));
    td.replace('../lib/writeConfig', () => new Promise((resolve, reject) => reject('An error from writeConfig')));
    const profileUtils = require('../lib/utils/profile');

    profileUtils.processExpiredProfiles(cagoOptions, awsConfigs, expiredProfiles, SAMLResponse)
      .then(() => {
        done('Rejection failed.');
      })
      .catch((err) => {
        should(err).be.eql('An error from assumeRole');
        done();
      });
  });

  it('should fail with error from writeConfig', (done) => {
    td.replace('../lib/assumeRole', () => new Promise((resolve) => resolve('test-token')));
    td.replace('../lib/writeConfig', () => new Promise((resolve, reject) => reject('An error from writeConfig')));
    const profileUtils = require('../lib/utils/profile');

    profileUtils.processExpiredProfiles(cagoOptions, awsConfigs, expiredProfiles, SAMLResponse)
      .then(() => {
        done('Rejection failed.');
      })
      .catch((err) => {
        should(err).be.eql('An error from writeConfig');
        done();
      });
  });

  it('should succeed with autocopy flag set to "true" and autocopy content present', (done) => {
    td.replace('../lib/assumeRole', () => new Promise((resolve) => resolve('test-token')));
    td.replace('../lib/writeConfig', () => new Promise((resolve) => resolve()));
    const profileUtils = require('../lib/utils/profile');

    profileUtils.processExpiredProfiles(cagoOptions, awsConfigs, expiredProfiles, SAMLResponse)
      .then(() => {
        should(actualTxt.join('')).be.eql([
          chalk.green('... Done!\n'),
          `${chalk.yellow('Note: to set the environment variables, run')} ${chalk.cyan(`source $(cagophilist env update)\n\n`)}`,
          chalk.yellow('(This command has been copied to your clipboard)\n'),
        ].join(''));
        done();
      })
      .catch((err) => {
        done(err);
      });
  });

  it('should succeed with autocopy flag set to "false" and without autocopy content', (done) => {
    td.replace('../lib/assumeRole', () => new Promise((resolve) => resolve('test-token')));
    td.replace('../lib/writeConfig', () => new Promise((resolve) => resolve()));
    const profileUtils = require('../lib/utils/profile');

    profileUtils.processExpiredProfiles({ autocopy: false }, awsConfigs, expiredProfiles, SAMLResponse)
      .then(() => {
        should(actualTxt.join('')).be.eql([
          chalk.green('... Done!\n'),
          `${chalk.yellow('Note: to set the environment variables, run')} ${chalk.cyan(`source $(cagophilist env update)\n\n`)}`,
        ].join(''));
        done();
      })
      .catch((err) => {
        done(err);
      });
  });
});
