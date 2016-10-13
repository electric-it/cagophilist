'use strict';

const should = require('should');
const chalk = require('chalk');
const Promise = require('bluebird');
const inquirer = require('inquirer');
const td = require('testdouble');

describe('Update Tests', () => {
  const logger = require('../lib/utils/logger');

  beforeEach(() => {});
  afterEach(() => {
    td.reset();
  });

  it('should fail when getRoles returns error', (done) => {
    td.replace('../lib/getRoles', () => new Promise((resolve, reject) => reject('An error occurred in getRoles')));
    const updateCmd = require('../lib/update');

    updateCmd.run({})
      .then(() => {
        done('Rejection failed.');
      })
      .catch((err) => {
        should(err).be.eql('An error occurred in getRoles');
        done();
      });
  });

  it('should fail when getRoles returns no roles', (done) => {
    let actualTxt = null;
    td.replace(logger, 'log', (msg) => {
      actualTxt = msg;
    });
    td.replace('../lib/getRoles', () => new Promise((resolve) => resolve({
      arnCollection: {},
      SAMLResponse: '',
      padAmount: 10,
    })));
    const updateCmd = require('../lib/update');

    updateCmd.run({})
      .then(() => {
        should(actualTxt).be.eql(chalk.yellow('\nNo roles found.\n\n'));
        done();
      })
      .catch((err) => {
        done(err);
      });
  });

  it('should fail when inquirer.prompt returns error', (done) => {
    td.replace('../lib/getRoles', () => new Promise((resolve) => resolve({
      arnCollection: {
        test: {
          accountName: '',
          roleName: '',
        },
      },
      SAMLResponse: '',
      padAmount: 10,
    })));
    td.replace(inquirer, 'prompt', () => new Promise((resolve, reject) => reject('An error occurred with inquirer.prompt')));
    const updateCmd = require('../lib/update');

    updateCmd.run({})
      .then(() => {
        done('Rejection failed.');
      })
      .catch((err) => {
        should(err).be.eql('An error occurred with inquirer.prompt');
        done();
      });
  });

  it('should fail when getConfig returns error', (done) => {
    td.replace('../lib/getRoles', () => new Promise((resolve) => resolve({
      arnCollection: {
        test: {
          accountName: '',
          roleName: '',
        },
      },
      SAMLResponse: '',
      padAmount: 10,
    })));
    td.replace(inquirer, 'prompt', () => new Promise((resolve) => resolve({
      role: 'test',
    })));
    td.replace('../lib/getConfig', () => new Promise((resolve, reject) => reject('An error occurred with getConfig')));
    const updateCmd = require('../lib/update');

    updateCmd.run({})
      .then(() => {
        done('Rejection failed.');
      })
      .catch((err) => {
        should(err).be.eql('An error occurred with getConfig');
        done();
      });
  });

  it('should fail when assumeRole returns error', (done) => {
    td.replace('../lib/getRoles', () => new Promise((resolve) => resolve({
      arnCollection: {
        test: {
          accountName: '',
          roleName: '',
        },
      },
      SAMLResponse: '',
      padAmount: 10,
    })));
    td.replace(inquirer, 'prompt', () => new Promise((resolve) => resolve({
      role: 'test',
    })));
    td.replace('../lib/getConfig', () => new Promise((resolve) => resolve({})));
    td.replace('../lib/assumeRole', () => new Promise((resolve, reject) => reject('An error occurred with assumeRole')));
    const updateCmd = require('../lib/update');

    updateCmd.run({})
      .then(() => {
        done('Rejection failed.');
      })
      .catch((err) => {
        should(err).be.eql('An error occurred with assumeRole');
        done();
      });
  });

  it('should fail when selectProfile returns error', (done) => {
    td.replace('../lib/getRoles', () => new Promise((resolve) => resolve({
      arnCollection: {
        test: {
          accountName: '',
          roleName: '',
        },
      },
      SAMLResponse: '',
      padAmount: 10,
    })));
    td.replace(inquirer, 'prompt', () => new Promise((resolve) => resolve({
      role: 'test',
    })));
    td.replace('../lib/getConfig', () => new Promise((resolve) => resolve({})));
    td.replace('../lib/assumeRole', () => new Promise((resolve) => resolve('test-token')));
    td.replace('../lib/selectProfile', () => new Promise((resolve, reject) => reject('An error occurred with selectProfile')));
    const updateCmd = require('../lib/update');

    updateCmd.run({})
      .then(() => {
        done('Rejection failed.');
      })
      .catch((err) => {
        should(err).be.eql('An error occurred with selectProfile');
        done();
      });
  });

  it('should fail when writeConfig returns error', (done) => {
    td.replace('../lib/getRoles', () => new Promise((resolve) => resolve({
      arnCollection: {
        test: {
          accountName: '123456789012',
          roleName: 'test',
        },
      },
      SAMLResponse: '',
      padAmount: 10,
    })));
    td.replace(inquirer, 'prompt', () => new Promise((resolve) => resolve({
      role: 'test',
    })));
    td.replace('../lib/getConfig', () => new Promise((resolve) => resolve({})));
    td.replace('../lib/assumeRole', () => new Promise((resolve) => resolve('test-token')));
    td.replace('../lib/selectProfile', () => new Promise((resolve) => resolve('test-profile')));
    td.replace('../lib/writeConfig', () => new Promise((resolve, reject) => reject('An error occurred with writeConfig')));
    const updateCmd = require('../lib/update');

    updateCmd.run({})
      .then(() => {
        done('Rejection failed.');
      })
      .catch((err) => {
        should(err).be.eql('An error occurred with writeConfig');
        done();
      });
  });

  it('should succeed with correct data', (done) => {
    let actualTxt = null;
    td.replace(logger, 'log', (msg) => {
      actualTxt = msg;
    });
    td.replace('../lib/getRoles', () => new Promise((resolve) => resolve({
      arnCollection: {
        test: {
          accountName: '123456789012',
          roleName: 'test',
        },
      },
      SAMLResponse: '',
      padAmount: 10,
    })));
    td.replace(inquirer, 'prompt', () => new Promise((resolve) => resolve({
      role: 'test',
    })));
    td.replace('../lib/getConfig', () => new Promise((resolve) => resolve({})));
    td.replace('../lib/assumeRole', () => new Promise((resolve) => resolve('test-token')));
    td.replace('../lib/selectProfile', () => new Promise((resolve) => resolve('test-profile')));
    td.replace('../lib/writeConfig', () => new Promise((resolve) => resolve({})));
    const updateCmd = require('../lib/update');

    updateCmd.run({})
      .then(() => {
        should(actualTxt).be.eql(chalk.green('... Done!\n\n'));
        done();
      })
      .catch((err) => {
        done(err);
      });
  });
});
