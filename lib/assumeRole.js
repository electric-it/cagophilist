'use strict';

const Promise = require('bluebird');
const chalk = require('chalk');
const AWS = require('aws-sdk');
const proxyAgent = require('https-proxy-agent');
const logger = require('./utils/logger');

function assumeRole(cagoOptions, arn, SAMLResponse) {
  return new Promise((resolve, reject) => {
    logger.log(chalk.blue('Assuming AWS account and role..\n'));

    const stsOptions = {
      region: cagoOptions.aws.region,
      sslEnabled: true,
      convertResponseTypes: false,
    };

    // Users get tripped up by not having the proper proxy format - try to do the right thing instead of rejecting with an error
    let proxyText = (process.env.HTTPS_PROXY || process.env.https_proxy);
    if (cagoOptions.aws.useHttpsProxy === true && proxyText) {
      if (proxyText.indexOf('//') === -1) {
        proxyText = `http://${proxyText}`;
        logger.log(chalk.yellow(`Proxy missing protocol - assuming \'http://\' please update your proxy settings\n\t${proxyText}`));
      }
      stsOptions.httpOptions = {
        agent: proxyAgent(proxyText),
      };
    }

    const sts = new AWS.STS(stsOptions);
    const params = {
      PrincipalArn: arn.principalArn,
      RoleArn: arn.roleArn,
      SAMLAssertion: SAMLResponse,
    };

    sts.assumeRoleWithSAML(params, (err, token) => {
      if (err) {
        logger.error(chalk.red('Error contacting AWS API\n'));
        logger.error(chalk.red(`\t${err}\n`));
        return reject(err);
      }

      logger.log(chalk.green('Successfully assumed role..\n'));
      return resolve(token);
    }); // sts.assumeRoleWithSAML
  });
}

module.exports = assumeRole;
