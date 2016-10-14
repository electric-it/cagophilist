'use strict';

const fs = require('fs');
const Promise = require('bluebird');
const ini = require('ini');

function getConfig(cagoOptions) {
  return new Promise((resolve) => {
    let awsCrendentialsFileStats = null;
    let cagoConfigFileStats = null;
    try {
      awsCrendentialsFileStats = fs.statSync(cagoOptions.locked.awsCrendentialsFile);
      cagoConfigFileStats = fs.statSync(cagoOptions.locked.cagoConfigPath);
    } catch (e) {
      if (awsCrendentialsFileStats === null) {
        fs.writeFileSync(cagoOptions.locked.awsCrendentialsFile, '', 'utf-8');
      }
      if (cagoConfigFileStats === null) {
        fs.writeFileSync(cagoOptions.locked.cagoConfigPath, '', 'utf-8');
      }
    }

    const credentials = ini.parse(fs.readFileSync(cagoOptions.locked.awsCrendentialsFile, 'utf-8'));
    const config = ini.parse(fs.readFileSync(cagoOptions.locked.cagoConfigPath, 'utf-8'));
    const ret = {
      credentials,
      config,
    };
    resolve(ret);
  });
}

module.exports = getConfig;
