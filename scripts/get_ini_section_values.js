#!/usr/bin/env node
'use strict';

const ini = require('ini');
const fs = require('fs');

const homeDir = process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
const credentials = ini.parse(fs.readFileSync('~/.aws/credentials'.replace('~', homeDir), 'utf-8'));
const profileCredentials = credentials[process.argv[2]] || {};

if ({}.hasOwnProperty.call(profileCredentials, 'aws_access_key_id') === false) {
  console.log('false');
  process.exit(0);
} else if (process.argv[3] === 'check') {
  console.log('true');
  process.exit(0);
}
console.log(profileCredentials[process.argv[3]] || '');
