'use strict';

const should = require('should');
const fs = require('fs');
const path = require('path');
const td = require('testdouble');

describe('Path Utils Tests', () => {
  const TEMP_AWS_CREDENTIALS_DIR = '/tmp/.aws';
  const TEMP_AWS_CREDENTIALS = path.join(TEMP_AWS_CREDENTIALS_DIR, 'awsCrendentialsFile');
  const TEMP_CAGO_CONFIG = path.join(TEMP_AWS_CREDENTIALS_DIR, 'cagoOptions');
  const TEMP_CAGO_RC_FILE = '/tmp/.cagorc';
  const TEMP_CAGO_PATH = '/tmp/.cago';

  beforeEach(() => {});
  afterEach(() => {
    td.reset();
    try {
      fs.unlinkSync(TEMP_CAGO_CONFIG);
    } catch (e) {
      // suppress any errors
    }
    try {
      fs.unlinkSync(TEMP_AWS_CREDENTIALS);
    } catch (e) {
      // suppress any errors
    }
    try {
      fs.rmdirSync(TEMP_AWS_CREDENTIALS_DIR);
    } catch (e) {
      // suppress any errors
    }
    try {
      fs.unlinkSync(TEMP_CAGO_RC_FILE);
    } catch (e) {
      // suppress any errors
    }
    try {
      fs.rmdirSync(TEMP_CAGO_PATH);
    } catch (e) {
      // suppress any errors
    }
  });

  it('should throw error when verifyPaths throws new error', (done) => {
    const pathUtils = require('../lib/utils/path');

    td.replace(pathUtils, 'verifyPaths', () => {
      throw new Error('Unexpected error occurred.');
    });
    (() => {
      pathUtils.verifyPaths();
    }).should.throw('Unexpected error occurred.');
    done();
  });

  it('should throw error with missing arguments into verifyPaths', (done) => {
    const pathUtils = require('../lib/utils/path');

    pathUtils.verifyPaths()
      .then(() => {
        done('Rejection failed.');
      })
      .catch((err) => {
        should(err.message).be.eql('Cannot read property \'locked\' of undefined');
        done();
      });
  });

  it('should return verfied with missing arguments into verifyPaths', (done) => {
    const pathUtils = require('../lib/utils/path');

    pathUtils.verifyPaths({ locked: {} })
      .then((ret) => {
        should(ret).be.eql({ verified: true });
        done();
      })
      .catch((err) => {
        done(err);
      });
  });

  it('should return error with missing paths from verifyPaths', (done) => {
    const pathUtils = require('../lib/utils/path');

    pathUtils.verifyPaths({ locked: { awsCrendentialsFile: TEMP_AWS_CREDENTIALS } })
      .then(() => {
        done('Rejection failed.');
      })
      .catch((err) => {
        should(err).be.eql(`Missing path(s):\n\t${[TEMP_AWS_CREDENTIALS_DIR, TEMP_AWS_CREDENTIALS].join('\n\t')}`);
        done();
      });
  });

  it('should successfully verify path in verifyPaths', (done) => {
    fs.mkdirSync(TEMP_AWS_CREDENTIALS_DIR);
    fs.writeFileSync(TEMP_AWS_CREDENTIALS, '', 'utf-8');
    const pathUtils = require('../lib/utils/path');

    pathUtils.verifyPaths({ locked: { awsCrendentialsFile: TEMP_AWS_CREDENTIALS } })
      .then((ret) => {
        should(ret).be.eql({ verified: true });
        done();
      })
      .catch((err) => {
        done(err);
      });
  });

  it('should throw error when setupPaths throws new error', (done) => {
    const pathUtils = require('../lib/utils/path');

    td.replace(pathUtils, 'setupPaths', () => {
      throw new Error('Unexpected error occurred.');
    });
    (() => {
      pathUtils.setupPaths();
    }).should.throw('Unexpected error occurred.');
    done();
  });

  it('should throw error with missing arguments into setupPaths', (done) => {
    const pathUtils = require('../lib/utils/path');

    pathUtils.setupPaths()
      .then(() => {
        done('Rejection failed.');
      })
      .catch((err) => {
        should(err.message).be.eql('Cannot convert undefined or null to object');
        done();
      });
  });

  it('should return verfied with missing arguments into setupPaths', (done) => {
    const pathUtils = require('../lib/utils/path');

    pathUtils.setupPaths({ locked: {} })
      .then((ret) => {
        should(ret).be.eql({ completed: true });
        done();
      })
      .catch((err) => {
        done(err);
      });
  });

  it('should successfully setup paths from setupPaths', (done) => {
    const cagoOptions = {
      locked: {
        awsCrendentialsFile: TEMP_AWS_CREDENTIALS,
        cagoConfigPath: TEMP_CAGO_CONFIG,
        cagorcFilePath: TEMP_CAGO_RC_FILE,
        cagoPath: TEMP_CAGO_PATH,
      },
    };
    const pathUtils = require('../lib/utils/path');

    pathUtils.setupPaths(cagoOptions)
      .then((ret) => {
        should(ret).be.eql({ completed: true });
        Object.keys(cagoOptions.locked).forEach((pathKey) => {
          try {
            const stat = fs.statSync(cagoOptions.locked[pathKey]);
            should(stat).not.be.eql(undefined);
          } catch (err) {
            should(err).be.eql(undefined);
          }
        });
        done();
      })
      .catch((err) => {
        done(err);
      });
  });

  it('should throw error with unconfigured paths into setupPaths', (done) => {
    const cagoOptions = {
      locked: {
        test: '/tmp/test',
      },
    };
    const pathUtils = require('../lib/utils/path');

    pathUtils.setupPaths(cagoOptions)
      .then(() => {
        done('Rejection failed.');
      })
      .catch((err) => {
        should(err).be.eql('Unconfigured path(s);\n\t/tmp/test');
        done();
      });
  });
});
