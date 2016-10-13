'use strict';

const should = require('should');
const chalk = require('chalk');
const td = require('testdouble');

describe('Role Utils Tests', () => {
  const roleUtils = require('../lib/utils/role');
  const logger = require('../lib/utils/logger');

  let cagoOptions;
  let roleArn;
  let roleName;
  let account;
  let region;
  let roleResults;
  let principalArn;
  let actualTxt = [];

  beforeEach(() => {
    td.replace(logger, 'error', (msg) => {
      actualTxt.push(msg);
    });
    roleName = 'test-role-name';
    account = 'test-account-name';
    region = 'us-west-1';
    cagoOptions = {
      aws: {
        region: 'us-east-1',
      },
      accounts: {
        123456789012: account,
      },
      regions: {
        123456789012: region,
      },
    };
    roleArn = `arn:aws:iam::123456789012:role/${roleName}`;
    principalArn = 'arn:aws:iam::123456789012:root/user';
    roleResults = {
      roles: [{
        principalArn,
        roleArn,
      }],
    };
  });

  afterEach(() => {
    td.reset();
    roleName = '';
    account = '';
    region = '';
    cagoOptions = {};
    roleArn = '';
    principalArn = '';
    roleResults = {};
    actualTxt = [];
  });

  it('should get role account with "accounts" in cagoOptions', (done) => {
    should(roleUtils.getRoleAccount(cagoOptions, roleArn)).be.deepEqual({
      roleName,
      account,
    });
    done();
  });

  it('should get role account with no "accounts" in cagoOptions', (done) => {
    delete cagoOptions.accounts;
    should(roleUtils.getRoleAccount(cagoOptions, roleArn)).be.deepEqual({
      roleName,
      account: '123456789012',
    });
    done();
  });

  it('should get role region with "regions" in cagoOptions', (done) => {
    should(roleUtils.getRoleRegion(cagoOptions, roleArn)).be.deepEqual({
      region,
    });
    done();
  });

  it('should get role region with no "regions" in cagoOptions', (done) => {
    delete cagoOptions.regions;
    should(roleUtils.getRoleRegion(cagoOptions, roleArn)).be.deepEqual({
      region: 'us-east-1',
    });
    done();
  });

  it('should fail while processing roles with incorrect role structure: missing roles attribute', (done) => {
    roleResults = {};
    should(roleUtils.processRoles(cagoOptions, roleResults)).be.eql(null);
    should(actualTxt.join('')).be.eql([
      chalk.red('\nError encountered while processing roles\n'),
    ].join(''));
    done();
  });

  it('should fail while processing roles with incorrect role structure: no roles', (done) => {
    roleResults = {
      roles: [],
    };
    should(roleUtils.processRoles(cagoOptions, roleResults)).be.eql(null);
    should(actualTxt.join('')).be.eql('');
    done();
  });

  it('should fail while processing roles with incorrect role structure: missing roleArn', (done) => {
    roleResults = {
      roles: [{
        test: true,
      }],
    };
    should(roleUtils.processRoles(cagoOptions, roleResults)).be.eql(null);
    should(actualTxt.join('')).be.eql([
      chalk.red('\nError encountered while processing roles\n'),
    ].join(''));
    done();
  });

  it('should fail while processing roles with incorrect role structure: missing principalArn', (done) => {
    roleResults = {
      roles: [{
        roleArn: '',
        test: true,
      }],
    };
    should(roleUtils.processRoles(cagoOptions, roleResults)).be.eql(null);
    should(actualTxt.join('')).be.eql([
      chalk.red('\nError encountered while processing roles\n'),
    ].join(''));
    done();
  });

  it('should fail while processing roles when cagoOptions is empty object', (done) => {
    should(roleUtils.processRoles({}, roleResults)).be.eql(null);
    should(actualTxt.join('')).be.eql([
      chalk.red('\nError encountered while processing roles\n'),
    ].join(''));
    done();
  });

  it('should fail while processing roles when cagoOptions is undefined', (done) => {
    should(roleUtils.processRoles(undefined, roleResults)).be.eql(null);
    should(actualTxt.join('')).be.eql([
      chalk.red('\nError encountered while processing roles\n'),
    ].join(''));
    done();
  });

  it('should fail while processing roles when cagoOptions is null', (done) => {
    should(roleUtils.processRoles(null, roleResults)).be.eql(null);
    should(actualTxt.join('')).be.eql([
      chalk.red('\nError encountered while processing roles\n'),
    ].join(''));
    done();
  });

  it('should return correct response for processRoles without SAMLResponse', (done) => {
    const arnCollection = {};
    arnCollection[roleArn] = {
      accountName: account,
      principalArn,
      region,
      roleArn,
      roleName,
    };
    const padAmount = account.length + 4;
    should(roleUtils.processRoles(cagoOptions, roleResults)).be.deepEqual({
      arnCollection,
      padAmount,
    });
    done();
  });

  it('should return correct response for processRoles with SAMLResponse', (done) => {
    const arnCollection = {};
    arnCollection[roleArn] = {
      accountName: account,
      principalArn,
      region,
      roleArn,
      roleName,
    };
    const padAmount = account.length + 4;
    const SAMLResponse = 'test-saml-response-content';
    roleResults.SAMLResponse = SAMLResponse;
    should(roleUtils.processRoles(cagoOptions, roleResults)).be.deepEqual({
      arnCollection,
      padAmount,
      SAMLResponse,
    });
    done();
  });
});
