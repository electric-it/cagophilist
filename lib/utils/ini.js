'use strict';

const fs = require('fs');
const ini = require('ini');
const Promise = require('bluebird');

function writeIniFile(path, config) {
  return new Promise((resolve) => {
    fs.writeFileSync(path, ini.stringify(config), 'utf-8');
    resolve({
      success: true,
    });
  });
}

module.exports = {
  writeIniFile,
};
