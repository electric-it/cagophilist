'use strict';

const should = require('should');
const fs = require('fs');
const path = require('path');
const ini = require('ini');
const td = require('testdouble');

describe('GetConfig Tests', () => {
  let getConfig;
  let cagoOptions;
  const TEMP_AWS_CREDENTIALS = '/tmp/awsCredentials';
  const TEMP_CAGO_CONFIG = '/tmp/cagoConfig';

  beforeEach(() => {
    cagoOptions = {
      locked: {
        awsCrendentialsFile: TEMP_AWS_CREDENTIALS,
        cagoConfigPath: TEMP_CAGO_CONFIG,
      },
    };
    getConfig = require('../lib/getConfig');
  });

  afterEach(() => {
    td.reset();
    getConfig = null;
    cagoOptions = {};
    fs.unlinkSync(TEMP_AWS_CREDENTIALS);
    fs.unlinkSync(TEMP_CAGO_CONFIG);
  });

  it('should bring back empty config if files do not exist', (done) => {
    getConfig(cagoOptions)
      .then((ret) => {
        should(ret).be.eql({ credentials: {}, config: {} });
        done();
      })
      .catch((err) => {
        done(err);
      });
  });

  it('should bring back correct config and credentials', (done) => {
    const tempAWSCredentialsContent = fs.readFileSync(TEMP_AWS_CREDENTIALS.replace('/tmp', path.join(__dirname, 'data/getConfig')), 'utf-8');
    const tempCagoConfigContent = fs.readFileSync(TEMP_CAGO_CONFIG.replace('/tmp', path.join(__dirname, 'data/getConfig')), 'utf-8');
    const awsCredentials = ini.parse(tempAWSCredentialsContent);
    const cagoConfig = ini.parse(tempCagoConfigContent);
    fs.writeFileSync(TEMP_AWS_CREDENTIALS, tempAWSCredentialsContent, 'utf-8');
    fs.writeFileSync(TEMP_CAGO_CONFIG, tempCagoConfigContent, 'utf-8');

    getConfig(cagoOptions)
      .then((ret) => {
        should(ret.config.temp.principal_arn).be.eql(cagoConfig.temp.principal_arn);
        should(ret.config.temp.role_arn).be.eql(cagoConfig.temp.role_arn);
        should(ret.credentials.temp.aws_access_key_id).be.eql(awsCredentials.temp.aws_access_key_id);
        should(ret.credentials.temp.aws_secret_access_key).be.eql(awsCredentials.temp.aws_secret_access_key);
        should(ret.credentials.temp.aws_session_token).be.eql(awsCredentials.temp.aws_session_token);
        should(ret.credentials.temp.expire).be.eql(awsCredentials.temp.expire);
        should(ret.credentials.temp.output).be.eql(awsCredentials.temp.output);
        should(ret.credentials.temp.region).be.eql(awsCredentials.temp.region);
        done();
      })
      .catch((err) => {
        done(err);
      });
  });
});
