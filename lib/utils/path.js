'use strict';

const Promise = require('bluebird');
const path = require('path');
const fs = require('fs');

function verifyPaths(cagoOptions) {
  return new Promise((resolve, reject) => {
    const missingPaths = [];
    Object.keys(cagoOptions.locked).forEach((pathKey) => {
      if (pathKey === 'awsCrendentialsFile') {
        const awsDir = path.dirname(cagoOptions.locked[pathKey]);
        try {
          fs.statSync(awsDir);
        } catch (err) {
          missingPaths.push(awsDir);
        }
      }
      try {
        fs.statSync(cagoOptions.locked[pathKey]);
      } catch (err) {
        missingPaths.push(cagoOptions.locked[pathKey]);
      }
    });
    if (missingPaths.length > 0) {
      reject(`Missing path(s):\n\t${missingPaths.join('\n\t')}`);
    } else {
      resolve({ verified: true });
    }
  });
}

function setupPaths(cagoOptions) {
  return new Promise((resolve, reject) => {
    const unconfiguredPaths = [];
    let awsDir;
    if (
      {}.hasOwnProperty.call(cagoOptions, 'locked') === true
      && {}.hasOwnProperty.call(cagoOptions.locked, 'awsCrendentialsFile') === true
    ) {
      awsDir = path.dirname(cagoOptions.locked.awsCrendentialsFile);
    }
    Object.keys(cagoOptions.locked).forEach((pathKey) => {
      switch (pathKey) {
        case 'awsCrendentialsFile':
          if (awsDir) {
            try {
              fs.statSync(awsDir);
            } catch (err) {
              fs.mkdirSync(awsDir);
            }
          }
          try {
            fs.statSync(cagoOptions.locked.awsCrendentialsFile);
          } catch (err) {
            fs.writeFileSync(cagoOptions.locked.awsCrendentialsFile, '', 'utf-8');
          }
          break;

        case 'cagoConfigPath':
          try {
            fs.statSync(cagoOptions.locked.cagoConfigPath);
          } catch (err) {
            fs.writeFileSync(cagoOptions.locked.cagoConfigPath, '', 'utf-8');
          }
          break;

        case 'cagorcFilePath':
          try {
            fs.statSync(cagoOptions.locked.cagorcFilePath);
          } catch (err) {
            fs.writeFileSync(cagoOptions.locked.cagorcFilePath, '', 'utf-8');
          }
          break;

        case 'cagoPath':
          try {
            fs.statSync(cagoOptions.locked.cagoPath);
          } catch (err) {
            fs.mkdirSync(cagoOptions.locked.cagoPath);
          }
          break;

        default:
          unconfiguredPaths.push(cagoOptions.locked[pathKey]);
          break;
      }
    });
    if (unconfiguredPaths.length > 0) {
      reject(`Unconfigured path(s);\n\t${unconfiguredPaths.join('\n\t')}`);
    } else {
      resolve({ completed: true });
    }
  });
}

module.exports = {
  verifyPaths,
  setupPaths,
};
