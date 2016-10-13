'use strict';

const should = require('should');
const chalk = require('chalk');
const inquirer = require('inquirer');
const td = require('testdouble');

describe('SelectProfile Tests', () => {
  const logger = require('../lib/utils/logger');

  let actualTxt = [];

  beforeEach(() => {
    td.replace(logger, 'error', (msg) => {
      actualTxt.push(msg);
    });
  });

  afterEach(() => {
    td.reset();
    actualTxt = [];
  });

  it('should fail with no arguments', (done) => {
    const selectProfile = require('../lib/selectProfile');

    selectProfile()
      .then(() => {
        done('Rejection failed.');
      })
      .catch((err) => {
        should(err.message).be.eql('Cannot read property \'credentials\' of undefined');
        done();
      });
  });

  it('should fail with empty object as argument', (done) => {
    const selectProfile = require('../lib/selectProfile');

    selectProfile({})
      .then(() => {
        done('Rejection failed.');
      })
      .catch((err) => {
        should(err.message).be.eql('Cannot convert undefined or null to object');
        done();
      });
  });

  it('should fail when inquirer.prompt for profile selection returns error', (done) => {
    td.replace(inquirer, 'prompt', () => new Promise((resolve, reject) => reject('An error occurred with inquirer.prompt')));
    const selectProfile = require('../lib/selectProfile');

    selectProfile({ credentials: {} })
      .then(() => {
        done('Rejection failed.');
      })
      .catch((err) => {
        should(err).be.eql('An error occurred with inquirer.prompt');
        done();
      });
  });

  it('should fail when inquirer.prompt for profile name input returns error', (done) => {
    td.replace(inquirer, 'prompt', (promptOptions) => {
      if (promptOptions[0].message.indexOf('Select a profile name') !== -1) {
        return new Promise((resolve) => resolve({ name: '--cago-new--' }));
      }
      return new Promise((resolve, reject) => reject('An error occurred with inquirer.prompt'));
    });
    const selectProfile = require('../lib/selectProfile');

    selectProfile({ credentials: {} })
      .then(() => {
        done('Rejection failed.');
      })
      .catch((err) => {
        should(err).be.eql('An error occurred with inquirer.prompt');
        done();
      });
  });

  it('should fail when inquirer.prompt throws an error', (done) => {
    td.replace(inquirer, 'prompt', (promptOptions) => {
      if (promptOptions[0].message.indexOf('Select a profile name') !== -1) {
        return new Promise((resolve) => resolve({ name: '--cago-new--' }));
      }
      throw new Error('An error occurred with inquirer.prompt');
    });
    const selectProfile = require('../lib/selectProfile');

    selectProfile({ credentials: {} })
      .then(() => {
        done('Rejection failed.');
      })
      .catch((err) => {
        should(actualTxt.join('')).be.eql([
          chalk.red('\nError encountered while selecting profiles\n'),
          `${chalk.red('Error: An error occurred with inquirer.prompt')}\n`,
        ].join(''));
        should(err).be.eql(undefined);
        done();
      });
  });

  it('should successfully return the selected profile', (done) => {
    td.replace(inquirer, 'prompt', () => new Promise((resolve) => resolve({ name: 'test-name' })));
    const selectProfile = require('../lib/selectProfile');

    selectProfile({ credentials: {} })
      .then((name) => {
        should(name).be.eql('test-name');
        done();
      })
      .catch((err) => {
        done(err);
      });
  });

  it('should successfully return the entered profile', (done) => {
    td.replace(inquirer, 'prompt', (promptOptions) => {
      if (promptOptions[0].message.indexOf('Select a profile name') !== -1) {
        return new Promise((resolve) => resolve({ name: '--cago-new--' }));
      }
      return new Promise((resolve) => resolve({ name: 'test-name' }));
    });
    const selectProfile = require('../lib/selectProfile');

    selectProfile({ credentials: {} })
      .then((name) => {
        should(name).be.eql('test-name');
        done();
      })
      .catch((err) => {
        done(err);
      });
  });
});
