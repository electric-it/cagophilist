'use strict';

const should = require('should');
const AWS = require('aws-sdk-mock');
const chalk = require('chalk');
const td = require('testdouble');

describe('AssumeRole Tests', () => {
  const logger = require('../lib/utils/logger');

  let actualTxt = [];
  let assumeRole;
  let cagoOptions;
  let arn;
  let SAMLResponse;

  beforeEach(() => {
    cagoOptions = {
      aws: {
        region: 'test-east-1',
        useHttpsProxy: true,
      },
    };
    arn = {
      principalArn: 'test-principal-arn',
      roleArn: 'test-role-arn',
    };
    SAMLResponse = 'test-saml-response-from-somewhere-else';
    td.replace(logger, 'log', (msg) => {
      actualTxt.push(msg);
    });
    td.replace(logger, 'error', (msg) => {
      actualTxt.push(msg);
    });
    assumeRole = require('../lib/assumeRole');
  });

  afterEach(() => {
    td.reset();
    assumeRole = null;
    actualTxt = [];
  });

  it('should fail with error from AWS STS', (done) => {
    AWS.mock('STS', 'assumeRoleWithSAML', (params, callback) => {
      callback('Unable to assume role.');
    });
    assumeRole(cagoOptions, arn, SAMLResponse)
      .then(() => {
        AWS.restore('STS');
        done('Rejection failed.');
      })
      .catch((err) => {
        AWS.restore('STS');
        should(err).be.eql('Unable to assume role.');
        should(actualTxt.join('')).be.eql([
          chalk.blue('Assuming AWS account and role..\n'),
          chalk.red('Error contacting AWS API\n'),
          chalk.red('\tUnable to assume role.\n'),
        ].join(''));
        done();
      });
  });

  it('should succeed with missing proxy protocol', (done) => {
    const proxyText = 'www.example.com:8080';
    process.env.HTTPS_PROXY = proxyText;
    AWS.mock('STS', 'assumeRoleWithSAML', (params, callback) => {
      callback(null, 'test-token');
    });
    assumeRole(cagoOptions, arn, SAMLResponse)
      .then((token) => {
        AWS.restore('STS');
        should(actualTxt.join('')).be.eql([
          chalk.blue('Assuming AWS account and role..\n'),
          chalk.yellow(`Proxy missing protocol - assuming 'http://' please update your proxy settings\n\thttp://${proxyText}`),
          chalk.green('Successfully assumed role..\n'),
        ].join(''));
        should(token).be.eql('test-token');
        done();
      })
      .catch((err) => {
        AWS.restore('STS');
        done(err);
      });
  });

  it('should succeed with correct data', (done) => {
    process.env.HTTPS_PROXY = 'https://www.example.com:8080';
    AWS.mock('STS', 'assumeRoleWithSAML', (params, callback) => {
      callback(null, 'test-token');
    });
    assumeRole(cagoOptions, arn, SAMLResponse)
      .then((token) => {
        AWS.restore('STS');
        should(actualTxt.join('')).be.eql([
          chalk.blue('Assuming AWS account and role..\n'),
          chalk.green('Successfully assumed role..\n'),
        ].join(''));
        should(token).be.eql('test-token');
        done();
      })
      .catch((err) => {
        AWS.restore('STS');
        done(err);
      });
  });
});
