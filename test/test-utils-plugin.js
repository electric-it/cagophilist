'use strict';

const should = require('should');
const fs = require('fs');
const path = require('path');
const Promise = require('bluebird');
const td = require('testdouble');
const npm = require('npm-programmatic');

describe('Plugin Utils Tests', () => {
  const TEMP_CAGO_PATH = '/tmp/.cago';

  beforeEach(() => {
    try {
      fs.mkdirSync(TEMP_CAGO_PATH);
    } catch (err) {
      try {
        fs.unlinkSync(path.join(TEMP_CAGO_PATH, 'node_modules', 'test-plugin', 'index.js'));
      } catch (e) {
        // suppress error
      }
      try {
        fs.rmdirSync(path.join(TEMP_CAGO_PATH, 'node_modules', 'test-plugin'));
      } catch (e) {
        // suppress error
      }
      try {
        fs.rmdirSync(path.join(TEMP_CAGO_PATH, 'node_modules'));
      } catch (e) {
        // suppress error
      }
      fs.rmdirSync(TEMP_CAGO_PATH);
      fs.mkdirSync(TEMP_CAGO_PATH);
    }
  });

  afterEach(() => {
    td.reset();
    try {
      fs.unlinkSync(path.join(TEMP_CAGO_PATH, 'node_modules', 'test-plugin', 'index.js'));
    } catch (e) {
      // suppress error
    }
    try {
      fs.rmdirSync(path.join(TEMP_CAGO_PATH, 'node_modules', 'test-plugin'));
    } catch (e) {
      // suppress error
    }
    try {
      fs.rmdirSync(path.join(TEMP_CAGO_PATH, 'node_modules'));
    } catch (e) {
      // suppress error
    }
    try {
      fs.rmdirSync(TEMP_CAGO_PATH);
    } catch (e) {
      // suppress error
    }
  });

  it('should throw error when getPluginPath throws new error', (done) => {
    const pluginUtils = require('../lib/utils/plugin');

    td.replace(pluginUtils, 'getPluginPath', () => {
      throw new Error('Unexpected error occurred.');
    });
    (() => {
      pluginUtils.getPluginPath();
    }).should.throw('Unexpected error occurred.');
    done();
  });

  it('should throw error with missing arguments into getPluginPath', (done) => {
    const pluginUtils = require('../lib/utils/plugin');

    (() => {
      pluginUtils.getPluginPath();
    }).should.throw('Cannot read property \'locked\' of undefined');
    done();
  });

  it('should throw error with incorrect arguments into getPluginPath', (done) => {
    const pluginUtils = require('../lib/utils/plugin');

    (() => {
      pluginUtils.getPluginPath({ locked: {} });
    }).should.throw('Path must be a string. Received undefined');
    done();
  });

  it('should return correct path into getPluginPath', (done) => {
    const pluginUtils = require('../lib/utils/plugin');

    const pluginPath = pluginUtils.getPluginPath({ locked: { cagoPath: TEMP_CAGO_PATH } }, 'some-plugin');
    should(pluginPath).be.eql('/tmp/.cago/node_modules/some-plugin');
    done();
  });

  it('should return error when no arguments passed into checkPlugins', (done) => {
    const pluginUtils = require('../lib/utils/plugin');

    pluginUtils.checkPlugins()
      .then(() => {
        done('Rejection failed.');
      })
      .catch((err) => {
        should(err.message).be.eql('Cannot read property \'plugins\' of undefined');
        done();
      });
  });

  it('should return error when empty arguments passed into checkPlugins', (done) => {
    const pluginUtils = require('../lib/utils/plugin');

    pluginUtils.checkPlugins({})
      .then(() => {
        done('Rejection failed.');
      })
      .catch((err) => {
        should(err.message).be.eql('Cannot convert undefined or null to object');
        done();
      });
  });

  it('should return successfully loaded all plugins with no plugins configured in checkPlugins', (done) => {
    const pluginUtils = require('../lib/utils/plugin');

    pluginUtils.checkPlugins({ plugins: {} })
      .then((ret) => {
        should(ret).be.eql({ checked: true, allLoaded: true });
        done();
      })
      .catch((err) => {
        done(err);
      });
  });

  it('should return error with missing plugins configured in checkPlugins', (done) => {
    const cagoOptions = {
      locked: {
        cagoPath: TEMP_CAGO_PATH,
      },
      plugins: {
        'test-plugin': '1.1.1',
      },
    };
    const pluginUtils = require('../lib/utils/plugin');

    pluginUtils.checkPlugins(cagoOptions)
      .then(() => {
        done('Rejection failed.');
      })
      .catch((err) => {
        should(err).be.eql(`Missing plugins(s):\n\t${Object.keys(cagoOptions.plugins).join('\n\t')}`);
        done();
      });
  });

  it('should return successfully with missing plugins configured in checkPlugins', (done) => {
    const cagoOptions = {
      locked: {
        cagoPath: TEMP_CAGO_PATH,
      },
      plugins: {
        'test-plugin': '1.1.1',
      },
    };
    const opts = {
      rejectOnMissing: false,
    };
    const pluginUtils = require('../lib/utils/plugin');

    pluginUtils.checkPlugins(cagoOptions, opts)
      .then((ret) => {
        should(ret).be.eql({ checked: true, allLoaded: false, missing: ['test-plugin'] });
        done();
      })
      .catch((err) => {
        done(err);
      });
  });

  it('should return successfully with plugins configured in checkPlugins', (done) => {
    fs.mkdirSync(path.join(TEMP_CAGO_PATH, 'node_modules'));
    fs.mkdirSync(path.join(TEMP_CAGO_PATH, 'node_modules', 'test-plugin'));
    const cagoOptions = {
      locked: {
        cagoPath: TEMP_CAGO_PATH,
      },
      plugins: {
        'test-plugin': '1.1.1',
      },
    };
    const opts = {
      rejectOnMissing: false,
    };
    const pluginUtils = require('../lib/utils/plugin');

    pluginUtils.checkPlugins(cagoOptions, opts)
      .then((ret) => {
        should(pluginUtils.pluginsForHooks).be.eql({});
        should(ret).be.eql({ checked: true, allLoaded: true });
        done();
      })
      .catch((err) => {
        done(err);
      });
  });

  it('should return successfully with plugins configured with metadata in checkPlugins', (done) => {
    fs.mkdirSync(path.join(TEMP_CAGO_PATH, 'node_modules'));
    fs.mkdirSync(path.join(TEMP_CAGO_PATH, 'node_modules', 'test-plugin'));
    fs.writeFileSync(path.join(TEMP_CAGO_PATH, 'node_modules', 'test-plugin', 'index.js'), 'module.exports = { hook: "test-hook" };', 'utf-8');
    const cagoOptions = {
      locked: {
        cagoPath: TEMP_CAGO_PATH,
      },
      plugins: {
        'test-plugin': '1.1.1',
      },
    };
    const opts = {
      rejectOnMissing: false,
      loadPluginMetadata: true,
    };
    const pluginUtils = require('../lib/utils/plugin');

    pluginUtils.checkPlugins(cagoOptions, opts)
      .then((ret) => {
        should(pluginUtils.pluginsForHooks).be.eql({ 'test-hook': ['test-plugin'] });
        should(ret).be.eql({ checked: true, allLoaded: true });
        done();
      })
      .catch((err) => {
        done(err);
      });
  });

  it('should return error when no arguments passed into installPlugins', (done) => {
    const pluginUtils = require('../lib/utils/plugin');

    pluginUtils.installPlugins()
      .then(() => {
        done('Rejection failed.');
      })
      .catch((err) => {
        should(err.message).be.eql('Cannot read property \'plugins\' of undefined');
        done();
      });
  });

  it('should return error when empty arguments passed into installPlugins', (done) => {
    const pluginUtils = require('../lib/utils/plugin');

    pluginUtils.installPlugins({})
      .then(() => {
        done('Rejection failed.');
      })
      .catch((err) => {
        should(err.message).be.eql('Cannot convert undefined or null to object');
        done();
      });
  });

  it('should return error when npm.install returns error in installPlugins', (done) => {
    const cagoOptions = {
      locked: {
        cagoPath: TEMP_CAGO_PATH,
      },
      plugins: {
        'test-plugin': '1.1.1',
      },
    };
    fs.mkdirSync(path.join(TEMP_CAGO_PATH, 'node_modules'));
    td.replace(npm, 'install', () => new Promise((resolve, reject) => reject('An error occurred.')));
    const pluginUtils = require('../lib/utils/plugin');

    pluginUtils.installPlugins(cagoOptions)
      .then(() => {
        done('Rejection failed.');
      })
      .catch((err) => {
        should(err).be.eql('An error occurred.');
        done();
      });
  });

  it('should resolve successfully in installPlugins with npm.install successful', (done) => {
    const cagoOptions = {
      locked: {
        cagoPath: TEMP_CAGO_PATH,
      },
      plugins: {
        'test-plugin': '1.1.1',
      },
    };
    fs.mkdirSync(path.join(TEMP_CAGO_PATH, 'node_modules'));
    td.replace(npm, 'install', () => new Promise((resolve) => resolve({})));
    const pluginUtils = require('../lib/utils/plugin');

    pluginUtils.installPlugins(cagoOptions)
      .then((ret) => {
        should(ret).be.eql({ success: true });
        done();
      })
      .catch((err) => {
        done(err);
      });
  });

  it('should resolve successfully in installPlugins with plugins already existing', (done) => {
    const cagoOptions = {
      locked: {
        cagoPath: TEMP_CAGO_PATH,
      },
      plugins: {
        'test-plugin': '1.1.1',
      },
    };
    fs.mkdirSync(path.join(TEMP_CAGO_PATH, 'node_modules'));
    fs.mkdirSync(path.join(TEMP_CAGO_PATH, 'node_modules', 'test-plugin'));
    fs.writeFileSync(path.join(TEMP_CAGO_PATH, 'node_modules', 'test-plugin', 'index.js'), 'module.exports = { hook: "test-hook" };', 'utf-8');
    const pluginUtils = require('../lib/utils/plugin');

    pluginUtils.installPlugins(cagoOptions)
      .then((ret) => {
        should(ret).be.eql({ success: true });
        done();
      })
      .catch((err) => {
        done(err);
      });
  });

  it('should throw error with missing arguments into setupPluginPaths', (done) => {
    const pluginUtils = require('../lib/utils/plugin');

    pluginUtils.setupPluginPaths()
      .then(() => {
        done('Rejection failed.');
      })
      .catch((err) => {
        should(err.message).be.eql('Cannot read property \'locked\' of undefined');
        done();
      });
  });

  it('should throw error with empty arguments into setupPluginPaths', (done) => {
    const pluginUtils = require('../lib/utils/plugin');

    pluginUtils.setupPluginPaths({})
      .then(() => {
        done('Rejection failed.');
      })
      .catch((err) => {
        should(err.message).be.eql('Cannot read property \'cagoPath\' of undefined');
        done();
      });
  });

  it('should throw error with incorrect arguments into setupPluginPaths', (done) => {
    const pluginUtils = require('../lib/utils/plugin');

    pluginUtils.setupPluginPaths({ locked: {} })
      .then(() => {
        done('Rejection failed.');
      })
      .catch((err) => {
        should(err.message).match(/path must be a string/);
        done();
      });
  });

  it('should successfully setupPluginPaths', (done) => {
    const cagoOptions = {
      locked: {
        cagoPath: TEMP_CAGO_PATH,
      },
    };
    const pluginUtils = require('../lib/utils/plugin');

    pluginUtils.setupPluginPaths(cagoOptions)
      .then((ret) => {
        should(ret).be.eql(undefined);
        done();
      })
      .catch((err) => {
        done(err);
      });
  });

  it('should throw error with missing arguments into runPlugins', (done) => {
    const pluginUtils = require('../lib/utils/plugin');

    pluginUtils.runPlugins()
      .then(() => {
        done('Rejection failed.');
      })
      .catch((err) => {
        should(err).be.eql('No plugin setup for hook: undefined');
        done();
      });
  });

  it('should throw error with empty arguments into runPlugins', (done) => {
    const pluginUtils = require('../lib/utils/plugin');

    pluginUtils.runPlugins({})
      .then(() => {
        done('Rejection failed.');
      })
      .catch((err) => {
        should(err).be.eql('No plugin setup for hook: undefined');
        done();
      });
  });

  it('should throw error with incorrect arguments into runPlugins', (done) => {
    const pluginUtils = require('../lib/utils/plugin');

    pluginUtils.runPlugins({}, 'test-plugin')
      .then(() => {
        done('Rejection failed.');
      })
      .catch((err) => {
        should(err).be.eql('No plugin setup for hook: test-plugin');
        done();
      });
  });

  it('should throw error with incorrect arguments into runPlugins', (done) => {
    const pluginUtils = require('../lib/utils/plugin');

    pluginUtils.runPlugins({}, 'test-plugin')
      .then(() => {
        done('Rejection failed.');
      })
      .catch((err) => {
        should(err).be.eql('No plugin setup for hook: test-plugin');
        done();
      });
  });

  it('should return error when configured plugins return error runPlugins', (done) => {
    fs.mkdirSync(path.join(TEMP_CAGO_PATH, 'node_modules'));
    fs.mkdirSync(path.join(TEMP_CAGO_PATH, 'node_modules', 'test-plugin'));
    fs.writeFileSync(path.join(TEMP_CAGO_PATH, 'node_modules', 'test-plugin', 'index.js'), 'module.exports = { hook: \'test-hook\' };', 'utf-8');
    const cagoOptions = {
      locked: {
        cagoPath: TEMP_CAGO_PATH,
      },
      plugins: {
        'test-plugin': '1.1.1',
      },
    };
    const opts = {
      rejectOnMissing: false,
      loadPluginMetadata: true,
    };
    const pluginPath = path.join(TEMP_CAGO_PATH, 'node_modules', 'test-plugin');
    td.replace(pluginPath, {
      name: 'test-plugin',
      hook: 'test-hook',
      run: () => new Promise((resolve, reject) => reject('An error occurred.')),
    });
    const pluginUtils = require('../lib/utils/plugin');

    pluginUtils.checkPlugins(cagoOptions, opts)
      .then(() => pluginUtils.runPlugins(cagoOptions, 'test-hook'))
      .then(() => {
        done('Rejection failed.');
      })
      .catch((err) => {
        should(err).be.eql('An error occurred.');
        done();
      });
  });

  it('should return successfully runPlugins', (done) => {
    fs.mkdirSync(path.join(TEMP_CAGO_PATH, 'node_modules'));
    fs.mkdirSync(path.join(TEMP_CAGO_PATH, 'node_modules', 'test-plugin'));
    fs.writeFileSync(path.join(TEMP_CAGO_PATH, 'node_modules', 'test-plugin', 'index.js'), 'module.exports = { hook: \'test-hook\' };', 'utf-8');
    const cagoOptions = {
      locked: {
        cagoPath: TEMP_CAGO_PATH,
      },
      plugins: {
        'test-plugin': '1.1.1',
      },
    };
    const opts = {
      rejectOnMissing: false,
      loadPluginMetadata: true,
    };
    const pluginPath = path.join(TEMP_CAGO_PATH, 'node_modules', 'test-plugin');
    td.replace(pluginPath, {
      name: 'test-plugin',
      hook: 'test-hook',
      run: () => new Promise((resolve) => resolve({ roles: true })),
    });
    const pluginUtils = require('../lib/utils/plugin');

    pluginUtils.checkPlugins(cagoOptions, opts)
      .then(() => pluginUtils.runPlugins(cagoOptions, 'test-hook'))
      .then((ret) => {
        should(ret).be.eql({ roles: true });
        done();
      })
      .catch((err) => {
        done(err);
      });
  });
});
