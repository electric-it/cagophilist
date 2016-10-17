# Cagophilist - Plugin Development Guide

---

## Summary

Cagophilist supports plugin architecture for retrieving roles to display to the user, which is useful for example, in corporate environments where roles are controlled through IDP. Below is a brief example of how to setup a plugin.

## Example

```javascript
// index.js
'use strict';

module.exports = require('./lib');

```

### Plugin configuration setup

```javascript
// lib/index.js
'use strict';

const custom = require('./custom');

module.exports = {
  // name: The name of the custom plugin, used for config
  name: 'cago-custom-idp',
  // hook: The hook that Cagophilist uses to execute this plugin
  hook: 'get-roles',
  // description: The description of the plugin
  description: 'Retrieves a list of AWS roles from IDP using company specific settings.',
  // help: The help text for the plugin (future use)
  help: 'Requires config settings matching the plugin name.',
  // run: The run function
  run: custom,
};

```

### Plugin function with response

```javascript
// lib/custom.js
'use strict';

const Promise = require('bluebird');
const request = require('request');
const inquirer = require('inquirer');
const chalk = require('chalk');

/**
 * Custom function that retrieves the list of roles based on the login info
 * entered.
 *
 * @param    {object}   cagoOptions   These are the plugin config settings from
 *                                    the ~/.cagorc file.
 * @param    {object}   ctx           This is the context object that is passed
 *                                    in from the Promise.reduce when multiple
 *                                    plugins are chained together.
 * @return   {object}                 The return object that contains a list of
 *                                    roles and SAMLResponse string used in
 *                                    AWS.STS.assumeRoleWithSAML as SAMLAssertion
 */
function custom(cagoOptions, ctx) {
  return new Promise((resolve, reject) => {
    // merge the options with the default ones
    // use inquirer to prompt for username/password
    // use request to submit credentials against configured url
    // process the response and configure the response for roles
    const roles = [{
      roleArn: 'arn:aws:iam::123456789012:role/S3-FullAccess',
      principalArn: 'arn:aws:iam::123456789012:root/user',
    }, {
      roleArn: 'arn:aws:iam::123456789012:role/EC2-ReadAccess',
      principalArn: 'arn:aws:iam::123456789012:root/user',
    }, {
      roleArn: 'arn:aws:iam::123456789012:role/Test-Role',
      principalArn: 'arn:aws:iam::123456789012:root/user',
    }];
    const SAMLResponse = 'AWS SAML Assertion';
    // return the response merging with the response from other plugins
    resolve(Object.assign({}, ctx, {
      roles,
      SAMLResponse,
    }));
  });
}

module.exports = custom;
```
