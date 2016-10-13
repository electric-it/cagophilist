#!/usr/bin/env node
'use strict';

const ini = require('ini');
const fs = require('fs');

const homeDir = process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
const credentials = ini.parse(fs.readFileSync('~/.aws/credentials'.replace('~', homeDir), 'utf-8'));
console.log(Object.keys(credentials).join(' '));
