'use strict';
process.env.NODE_ENV = 'test';

describe('All Tests', () => {
  beforeEach(() => {});
  afterEach(() => {});

  require('./test-utils-logger');
  require('./test-utils-ini');
  require('./test-utils-profile');
  require('./test-utils-rightpad');
  require('./test-utils-role');
  require('./test-utils-plugin');
  require('./test-utils-path');

  require('./test-getOptions');
  require('./test-getConfig');
  require('./test-assumeRole');
  require('./test-selectProfile');
  require('./test-writeConfig');
  require('./test-getRoles');

  require('./test-index');
  require('./test-update');
  require('./test-exclude');
  require('./test-refresh');
  require('./test-setup');
  require('./test-list');
});
