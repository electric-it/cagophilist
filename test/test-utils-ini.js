'use strict';

const should = require('should');
const fs = require('fs');
const ini = require('ini');
const td = require('testdouble');

describe('Ini Utils Tests', () => {
  const TEMP_FILE = '/tmp/tmpFile';

  beforeEach(() => {});
  afterEach(() => {
    td.reset();
    try {
      fs.unlinkSync(TEMP_FILE);
    } catch (e) {
      // suppress the error
    }
  });

  it('should fail when an error is thrown', (done) => {
    const iniUtils = require('../lib/utils/ini');

    td.replace(iniUtils, 'writeIniFile', () => {
      throw new Error('Unexpected error occurred.');
    });
    (() => {
      iniUtils.writeIniFile();
    }).should.throw('Unexpected error occurred.');
    done();
  });

  it('should fail when ini.stringify throws error is thrown', (done) => {
    td.replace(ini, 'stringify', () => {
      throw new Error('Unexpected error occurred.');
    });
    const iniUtils = require('../lib/utils/ini');

    iniUtils.writeIniFile()
      .then(() => {
        done('Rejection failed');
      })
      .catch((err) => {
        should(err.message).be.eql('Unexpected error occurred.');
        done();
      });
  });

  it('should successfully write the config ini file', (done) => {
    const iniUtils = require('../lib/utils/ini');

    const config = {
      temp: {
        test: true,
      },
    };

    iniUtils.writeIniFile(TEMP_FILE, config)
      .then(() => {
        try {
          const configContent = fs.readFileSync(TEMP_FILE, 'utf-8');
          should(configContent).be.eql(ini.stringify(config));
          done();
        } catch (e) {
          done(e);
        }
      })
      .catch((err) => {
        done(err);
      });
  });
});
