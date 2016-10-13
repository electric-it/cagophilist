'use strict';

const should = require('should');
const chalk = require('chalk');
const Promise = require('bluebird');
const inquirer = require('inquirer');
const td = require('testdouble');

describe('Refresh Tests', () => {
  const logger = require('../lib/utils/logger');
  const rightpad = require('../lib/utils/rightpad');
  const profileUtils = require('../lib/utils/profile');

  beforeEach(() => {});
  afterEach(() => {
    td.reset();
  });

  it('should fail when getConfig returns error', (done) => {
    td.replace('../lib/getConfig', () => new Promise((resolve, reject) => reject('An error occurred with getConfig')));
    const refreshCmd = require('../lib/refresh');

    refreshCmd.run({})
      .then(() => {
        done('Rejection failed.');
      })
      .catch((err) => {
        should(err).be.eql('An error occurred with getConfig');
        done();
      });
  });

  it('should fail when cagoConfig is empty', (done) => {
    td.replace('../lib/getConfig', () => new Promise((resolve) => resolve({})));
    const refreshCmd = require('../lib/refresh');

    refreshCmd.run({})
      .then(() => {
        done('Rejection failed.');
      })
      .catch((err) => {
        should(err.message).be.eql('Cannot read property \'refreshMinutes\' of undefined');
        done();
      });
  });

  it('should fail when aws credentials are missing', (done) => {
    const cagoOptions = {
      aws: {
        refreshMinutes: 10,
      },
    };
    td.replace('../lib/getConfig', () => new Promise((resolve) => resolve({})));
    const refreshCmd = require('../lib/refresh');

    refreshCmd.run(cagoOptions)
      .then(() => {
        done('Rejection failed.');
      })
      .catch((err) => {
        should(err.message).be.eql('Cannot convert undefined or null to object');
        done();
      });
  });

  it('should fail when no profiles are passed in', (done) => {
    const actualTxt = [];
    td.replace(logger, 'log', (msg) => {
      actualTxt.push(msg);
    });
    const cagoOptions = {
      aws: {
        refreshMinutes: 10,
      },
    };
    td.replace('../lib/getConfig', () => new Promise((resolve) => resolve({
      credentials: {},
    })));
    const refreshCmd = require('../lib/refresh');

    refreshCmd.run(cagoOptions)
      .then(() => {
        should(actualTxt.join('')).be.eql([
          chalk.green('\nAll profiles have valid tokens.\n'),
          `${chalk.yellow('Note: to set the environment variables, run')} ${chalk.cyan('source $(cagophilist env update)')}`,
          chalk.yellow('(This command has been copied to your clipboard)'),
          '',
        ].join(''));
        done();
      })
      .catch((err) => {
        done(err);
      });
  });

  it('should fail when all profiles have been excluded', (done) => {
    const actualTxt = [];
    td.replace(logger, 'log', (msg) => {
      actualTxt.push(msg);
    });
    const cagoOptions = {
      aws: {
        refreshMinutes: 10,
      },
    };
    td.replace('../lib/getConfig', () => new Promise((resolve) => resolve({
      credentials: {
        temp: {
          expire: (new Date()).toISOString(),
        },
      },
      config: {
        temp: {
          exclude: true,
        },
      },
    })));
    const refreshCmd = require('../lib/refresh');

    refreshCmd.run(cagoOptions)
      .then(() => {
        should(actualTxt.join('')).be.eql([
          chalk.green('\nAll profiles have valid tokens.\n'),
          `${chalk.yellow('Note: to set the environment variables, run')} ${chalk.cyan('source $(cagophilist env update)')}`,
          chalk.yellow('(This command has been copied to your clipboard)'),
          '',
        ].join(''));
        done();
      })
      .catch((err) => {
        done(err);
      });
  });

  it('should fail when all profiles have valid tokens', (done) => {
    const cagoOptions = {
      aws: {
        refreshMinutes: 10,
      },
    };
    const dt = (new Date());
    const actualTxt = [];
    td.replace(logger, 'log', (msg) => {
      actualTxt.push(msg);
    });
    dt.setFullYear(dt.getFullYear() + 1);
    td.replace('../lib/getConfig', () => new Promise((resolve) => resolve({
      credentials: {
        temp: {
          expire: dt.toISOString(),
        },
      },
      config: {
        temp: {},
      },
    })));
    const refreshCmd = require('../lib/refresh');

    refreshCmd.run(cagoOptions)
      .then(() => {
        should(actualTxt.join('')).be.eql([
          chalk.green('\nAll profiles have valid tokens.\n'),
          `${chalk.yellow('Note: to set the environment variables, run')} ${chalk.cyan('source $(cagophilist env update)')}`,
          chalk.yellow('(This command has been copied to your clipboard)'),
          '',
        ].join(''));
        done();
      })
      .catch((err) => {
        done(err);
      });
  });

  it('should fail when all profiles have valid tokens, without autocopy text', (done) => {
    const actualTxt = [];
    const dt = (new Date());
    td.replace(logger, 'log', (msg) => {
      actualTxt.push(msg);
    });
    const cagoOptions = {
      aws: {
        refreshMinutes: 10,
      },
      autocopy: false,
    };
    dt.setFullYear(dt.getFullYear() + 1);
    td.replace('../lib/getConfig', () => new Promise((resolve) => resolve({
      credentials: {
        temp: {
          expire: dt.toISOString(),
        },
      },
      config: {
        temp: {},
      },
    })));
    const refreshCmd = require('../lib/refresh');

    refreshCmd.run(cagoOptions)
      .then(() => {
        should(actualTxt.join('')).be.eql([
          chalk.green('\nAll profiles have valid tokens.\n'),
          `${chalk.yellow('Note: to set the environment variables, run')} ${chalk.cyan('source $(cagophilist env update)')}`,
          '',
        ].join(''));
        done();
      })
      .catch((err) => {
        done(err);
      });
  });

  it('should fail when inquirer.prompt returns error', (done) => {
    const dt = (new Date());
    dt.setMinutes(dt.getMinutes() - 15);
    const cagoOptions = {
      aws: {
        refreshMinutes: 10,
      },
    };
    const actualTxt = [];
    td.replace(logger, 'log', (msg) => {
      actualTxt.push(msg);
    });
    td.replace('../lib/getConfig', () => new Promise((resolve) => resolve({
      credentials: {
        temp: {
          expire: dt.toISOString(),
        },
      },
      config: {
        temp: {},
      },
    })));
    td.replace(inquirer, 'prompt', () => new Promise((resolve, reject) => reject('An error occurred with inquirer.prompt')));
    const refreshCmd = require('../lib/refresh');

    refreshCmd.run(cagoOptions)
      .then(() => {
        done('Rejection failed.');
      })
      .catch((err) => {
        should(err).be.eql('An error occurred with inquirer.prompt');
        should(actualTxt.join('')).be.eql([
          chalk.yellow('\nRefreshing the following expired profiles:'),
          chalk.magenta('\ttemp'),
          '',
        ].join(''));
        done();
      });
  });

  it('should exit quietly when proceed prompt response is false', (done) => {
    const cagoOptions = {
      aws: {
        refreshMinutes: 10,
      },
    };
    const dt = (new Date());
    dt.setMinutes(dt.getMinutes() - 15);
    const actualTxt = [];
    td.replace(logger, 'log', (msg) => {
      actualTxt.push(msg);
    });
    td.replace('../lib/getConfig', () => new Promise((resolve) => resolve({
      credentials: {
        temp: {
          expire: dt.toISOString(),
        },
      },
      config: {
        temp: {},
      },
    })));
    td.replace(inquirer, 'prompt', () => new Promise((resolve) => resolve({ proceed: false })));
    const refreshCmd = require('../lib/refresh');

    refreshCmd.run(cagoOptions)
      .then(() => {
        should(actualTxt.join('')).be.eql([
          chalk.yellow('\nRefreshing the following expired profiles:'),
          chalk.magenta('\ttemp'),
          '',
        ].join(''));
        done();
      })
      .catch((err) => {
        done(err);
      });
  });

  it('should fail when getRoles returns error', (done) => {
    const cagoOptions = {
      aws: {
        refreshMinutes: 10,
      },
    };
    const dt = (new Date());
    dt.setMinutes(dt.getMinutes() - 15);
    const actualTxt = [];
    td.replace(logger, 'log', (msg) => {
      actualTxt.push(msg);
    });
    td.replace('../lib/getConfig', () => new Promise((resolve) => resolve({
      credentials: {
        temp: {
          expire: dt.toISOString(),
        },
      },
      config: {
        temp: {},
      },
    })));
    td.replace(inquirer, 'prompt', () => new Promise((resolve) => resolve({ proceed: true })));
    td.replace('../lib/getRoles', () => new Promise((resolve, reject) => reject('An error occurred in getRoles')));
    const refreshCmd = require('../lib/refresh');

    refreshCmd.run(cagoOptions)
      .then(() => {
        done('Rejection failed.');
      })
      .catch((err) => {
        should(err).be.eql('An error occurred in getRoles');
        should(actualTxt.join('')).be.eql([
          chalk.yellow('\nRefreshing the following expired profiles:'),
          chalk.magenta('\ttemp'),
          '',
        ].join(''));
        done();
      });
  });

  it('should fail when getRoles returns incorrect data', (done) => {
    const cagoOptions = {
      aws: {
        refreshMinutes: 10,
      },
    };
    const actualTxt = [];
    const dt = (new Date());
    dt.setMinutes(dt.getMinutes() - 15);
    td.replace(logger, 'log', (msg) => {
      actualTxt.push(msg);
    });
    td.replace('../lib/getConfig', () => new Promise((resolve) => resolve({
      credentials: {
        temp: {
          expire: dt.toISOString(),
        },
      },
      config: {
        temp: {},
      },
    })));
    td.replace(inquirer, 'prompt', () => new Promise((resolve) => resolve({ proceed: true })));
    td.replace('../lib/getRoles', () => new Promise((resolve) => resolve({
      SAMLResponse: '',
      padAmount: 10,
    })));
    const refreshCmd = require('../lib/refresh');

    refreshCmd.run(cagoOptions)
      .then(() => {
        done('Rejection failed.');
      })
      .catch((err) => {
        should(err.message).be.eql('Cannot convert undefined or null to object');
        should(actualTxt.join('')).be.eql([
          chalk.yellow('\nRefreshing the following expired profiles:'),
          chalk.magenta('\ttemp'),
          '',
        ].join(''));
        done();
      });
  });

  it('should exit with message when getRoles returns no roles', (done) => {
    const cagoOptions = {
      aws: {
        refreshMinutes: 10,
      },
    };
    const dt = (new Date());
    dt.setMinutes(dt.getMinutes() - 15);
    const actualTxt = [];
    td.replace(logger, 'log', (msg) => {
      actualTxt.push(msg);
    });
    td.replace('../lib/getConfig', () => new Promise((resolve) => resolve({
      credentials: {
        temp: {
          expire: dt.toISOString(),
        },
      },
      config: {
        temp: {},
      },
    })));
    td.replace(inquirer, 'prompt', () => new Promise((resolve) => resolve({ proceed: true })));
    td.replace('../lib/getRoles', () => new Promise((resolve) => resolve({
      arnCollection: {},
      SAMLResponse: '',
      padAmount: 10,
    })));
    const refreshCmd = require('../lib/refresh');

    refreshCmd.run(cagoOptions)
      .then(() => {
        should(actualTxt.join('')).be.eql([
          chalk.yellow('\nRefreshing the following expired profiles:'),
          chalk.magenta('\ttemp'),
          '',
          chalk.yellow('\nNo profiles found.\n\n'),
        ].join(''));
        done();
      })
      .catch((err) => {
        done(err);
      });
  });

  it('should fail when arnSettings are missing', (done) => {
    const cagoOptions = {
      aws: {
        region: 'us-east-1',
        refreshMinutes: 10,
      },
    };
    const dt = (new Date());
    dt.setMinutes(dt.getMinutes() - 15);
    const actualTxt = [];
    td.replace(logger, 'log', (msg) => {
      actualTxt.push(msg);
    });
    td.replace('../lib/getConfig', () => new Promise((resolve) => resolve({
      credentials: {
        temp: {
          expire: dt.toISOString(),
        },
      },
      config: {
        temp: {},
      },
    })));
    td.replace(inquirer, 'prompt', () => new Promise((resolve) => resolve({ proceed: true })));
    td.replace('../lib/getRoles', () => new Promise((resolve) => resolve({
      arnCollection: {
        'arn:aws:iam::123456789012:role/test-role-name': {
          roleArn: 'arn:aws:iam::123456789012:role/test-role-name',
          accountName: 'test-account-name',
          roleName: 'test-role-name',
          principalArn: 'arn:aws:iam::123456789012:root/user',
          region: 'us-east-1',
        },
      },
      SAMLResponse: 'test-saml-response-content',
      padAmount: 8,
    })));
    td.replace(profileUtils, 'processExpiredProfiles', () => new Promise((resolve, reject) => reject('An error occurred in profileUtils.processExpiredProfiles')));
    const refreshCmd = require('../lib/refresh');

    refreshCmd.run(cagoOptions)
      .then(() => {
        done('Rejection failed.');
      })
      .catch((err) => {
        should(err.message).be.eql('Cannot read property \'roleArn\' of undefined');
        should(actualTxt.join('')).be.eql([
          chalk.yellow('\nRefreshing the following expired profiles:'),
          chalk.magenta('\ttemp'),
          '',
        ].join(''));
        done();
      });
  });

  it('should fail when profileUtils.processExpiredProfiles return an error', (done) => {
    const cagoOptions = {
      aws: {
        region: 'us-east-1',
        refreshMinutes: 10,
      },
    };
    const dt = (new Date());
    dt.setMinutes(dt.getMinutes() - 15);
    const actualTxt = [];
    td.replace(logger, 'log', (msg) => {
      actualTxt.push(msg);
    });
    td.replace('../lib/getConfig', () => new Promise((resolve) => resolve({
      credentials: {
        temp: {
          expire: dt.toISOString(),
        },
      },
      config: {
        temp: {
          role_arn: 'arn:aws:iam::123456789012:role/test-role-name',
          principal_arn: 'arn:aws:iam::123456789012:root/user',
        },
      },
    })));
    td.replace(inquirer, 'prompt', () => new Promise((resolve) => resolve({ proceed: true })));
    td.replace('../lib/getRoles', () => new Promise((resolve) => resolve({
      arnCollection: {
        'arn:aws:iam::123456789012:role/test-role-name': {
          roleArn: 'arn:aws:iam::123456789012:role/test-role-name',
          accountName: 'test-account-name',
          roleName: 'test-role-name',
          principalArn: 'arn:aws:iam::123456789012:root/user',
          region: 'us-east-1',
        },
      },
      SAMLResponse: 'test-saml-response-content',
      padAmount: 8,
    })));
    td.replace(profileUtils, 'processExpiredProfiles', () => new Promise((resolve, reject) => reject('An error occurred in profileUtils.processExpiredProfiles')));
    const refreshCmd = require('../lib/refresh');

    refreshCmd.run(cagoOptions)
      .then(() => {
        done('Rejection failed.');
      })
      .catch((err) => {
        const existingProfileRoles = [];
        let profilePadAmount = 0;
        const printExistingProfiles = [];
        const profileName = 'temp';
        const padAmount = 8;
        const arn = {
          roleArn: 'arn:aws:iam::123456789012:role/test-role-name',
          accountName: 'test-account-name',
          roleName: 'test-role-name',
          principalArn: 'arn:aws:iam::123456789012:root/user',
          region: 'us-east-1',
        };
        existingProfileRoles.push({
          profileName,
          roleName: `${rightpad(arn.accountName, padAmount)} ${arn.roleName}`,
        });
        if (profileName.length > profilePadAmount) {
          profilePadAmount = profileName.length;
        }
        profilePadAmount += 2;
        existingProfileRoles.forEach((item) => {
          printExistingProfiles.push(chalk.yellow(`\t${chalk.magenta(rightpad(item.profileName, profilePadAmount))} - ${chalk.cyan(item.roleName)}`));
        });
        should(err).be.eql('An error occurred in profileUtils.processExpiredProfiles');
        should(actualTxt.join('')).be.eql([
          chalk.yellow('\nRefreshing the following expired profiles:'),
          chalk.magenta('\ttemp'),
          chalk.yellow('-'.repeat(80)),
          chalk.yellow('Using last AWS account and role combination(s) for the profile(s) listed below'),
          chalk.yellow('-'.repeat(80)),
          printExistingProfiles.join('\n'),
          chalk.yellow('-'.repeat(80)),
          chalk.yellow(`Note: to change the role used, please run ${chalk.cyan('cagophilist update')} and select`),
          chalk.yellow('the profile you wish to update.'),
          chalk.yellow('-'.repeat(80)),
          '',
        ].join(''));
        done();
      });
  });

  it('should successfully complete refreshing the profiles', (done) => {
    const cagoOptions = {
      aws: {
        region: 'us-east-1',
        refreshMinutes: 10,
      },
    };
    const dt = (new Date());
    dt.setMinutes(dt.getMinutes() - 15);
    const actualTxt = [];
    td.replace(logger, 'log', (msg) => {
      actualTxt.push(msg);
    });
    td.replace('../lib/getConfig', () => new Promise((resolve) => resolve({
      credentials: {
        temp: {
          expire: dt.toISOString(),
        },
      },
      config: {
        temp: {
          role_arn: 'arn:aws:iam::123456789012:role/test-role-name',
          principal_arn: 'arn:aws:iam::123456789012:root/user',
        },
      },
    })));
    td.replace(inquirer, 'prompt', () => new Promise((resolve) => resolve({ proceed: true })));
    td.replace('../lib/getRoles', () => new Promise((resolve) => resolve({
      arnCollection: {
        'arn:aws:iam::123456789012:role/test-role-name': {
          roleArn: 'arn:aws:iam::123456789012:role/test-role-name',
          accountName: 'test-account-name',
          roleName: 'test-role-name',
          principalArn: 'arn:aws:iam::123456789012:root/user',
          region: 'us-east-1',
        },
      },
      SAMLResponse: 'test-saml-response-content',
      padAmount: 8,
    })));
    td.replace(profileUtils, 'processExpiredProfiles', () => new Promise((resolve) => resolve()));
    const refreshCmd = require('../lib/refresh');

    refreshCmd.run(cagoOptions)
      .then(() => {
        const existingProfileRoles = [];
        let profilePadAmount = 0;
        const printExistingProfiles = [];
        const profileName = 'temp';
        const padAmount = 8;
        const arn = {
          roleArn: 'arn:aws:iam::123456789012:role/test-role-name',
          accountName: 'test-account-name',
          roleName: 'test-role-name',
          principalArn: 'arn:aws:iam::123456789012:root/user',
          region: 'us-east-1',
        };
        existingProfileRoles.push({
          profileName,
          roleName: `${rightpad(arn.accountName, padAmount)} ${arn.roleName}`,
        });
        if (profileName.length > profilePadAmount) {
          profilePadAmount = profileName.length;
        }
        profilePadAmount += 2;
        existingProfileRoles.forEach((item) => {
          printExistingProfiles.push(chalk.yellow(`\t${chalk.magenta(rightpad(item.profileName, profilePadAmount))} - ${chalk.cyan(item.roleName)}`));
        });
        should(actualTxt.join('')).be.eql([
          chalk.yellow('\nRefreshing the following expired profiles:'),
          chalk.magenta('\ttemp'),
          chalk.yellow('-'.repeat(80)),
          chalk.yellow('Using last AWS account and role combination(s) for the profile(s) listed below'),
          chalk.yellow('-'.repeat(80)),
          printExistingProfiles.join('\n'),
          chalk.yellow('-'.repeat(80)),
          chalk.yellow(`Note: to change the role used, please run ${chalk.cyan('cagophilist update')} and select`),
          chalk.yellow('the profile you wish to update.'),
          chalk.yellow('-'.repeat(80)),
          '',
          chalk.green('... Done!\n\n'),
        ].join(''));
        done();
      })
      .catch((err) => {
        done(err);
      });
  });
});
