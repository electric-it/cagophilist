'use strict';

const chalk = require('chalk');
const logger = require('./logger');

function getRoleAccount(cagoOptions, roleArn) {
  const roleMatches = roleArn.match(/arn:aws:iam::(.*):role\/(.*)/);
  let account = roleMatches[1];
  const roleName = roleMatches[2];
  // arn:aws:iam::123456789012:role/role-name
  if (
    {}.hasOwnProperty.call(cagoOptions, 'accounts') === true
    && cagoOptions.accounts !== null
    && {}.hasOwnProperty.call(cagoOptions.accounts, account) === true
  ) {
    account = cagoOptions.accounts[account];
  }
  return {
    roleName,
    account,
  };
}

function getRoleRegion(cagoOptions, roleArn) {
  const roleMatches = roleArn.match(/arn:aws:iam::(.*):role\/(.*)/);
  const account = roleMatches[1];
  let region = cagoOptions.aws.region;
  // arn:aws:iam::123456789012:role/role-name
  if (
    {}.hasOwnProperty.call(cagoOptions, 'regions') === true
    && cagoOptions.regions !== null
    && {}.hasOwnProperty.call(cagoOptions.regions, account) === true
  ) {
    region = cagoOptions.regions[account];
  }
  return {
    region,
  };
}

function processRoles(cagoOptions, roleResults) {
  // ==========================================================================
  const arnCollection = {};
  let padAmount = 0;

  try {
    // iterate over all the roles, and process them for human readability
    roleResults.roles.forEach((role) => {
      const roleAccount = getRoleAccount(cagoOptions, role.roleArn);
      const roleRegion = getRoleRegion(cagoOptions, role.roleArn);
      if (roleAccount.account.length > padAmount) {
        padAmount = roleAccount.account.length;
      }
      arnCollection[role.roleArn] = {
        roleArn: role.roleArn,
        accountName: roleAccount.account,
        roleName: roleAccount.roleName,
        principalArn: role.principalArn,
        region: roleRegion.region,
      };
    });
  } catch (err) {
    logger.error(chalk.red('\nError encountered while processing roles\n'));
    return null;
  }

  if (Object.keys(arnCollection).length === 0) {
    return null;
  }

  // add more space between
  padAmount += 4;

  const processedRoles = {
    arnCollection,
    padAmount,
  };
  if ({}.hasOwnProperty.call(roleResults, 'SAMLResponse') === true) {
    processedRoles.SAMLResponse = roleResults.SAMLResponse;
  }

  return processedRoles;
}

module.exports = {
  getRoleAccount,
  getRoleRegion,
  processRoles,
};
