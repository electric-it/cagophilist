'use strict';

const should = require('should');
const chalk = require('chalk');
const td = require('testdouble');

describe('Logger Utils Tests', () => {
  let logger;
  let actualTxt = [];

  beforeEach(() => {
    td.replace(console, 'log', (msg) => {
      actualTxt.push(msg);
    });
    td.replace(console, 'error', (msg) => {
      actualTxt.push(msg);
    });
    td.replace(process.stdout, 'write', (msg) => {
      actualTxt.push(msg);
    });
    logger = require('../lib/utils/logger');
  });

  afterEach(() => {
    actualTxt = [];
  });

  it('should log correct message', (done) => {
    logger.log(chalk.green('Test'));
    logger.log('Message');
    td.reset();
    should(actualTxt.join('')).be.eql([
      chalk.green('Test'),
      'Message',
    ].join(''));
    done();
  });

  it('should log correct error message', (done) => {
    logger.error(chalk.red('Fail'));
    logger.error('Badly!');
    td.reset();
    should(actualTxt.join('')).be.eql([
      chalk.red('Fail'),
      'Badly!',
    ].join(''));
    done();
  });

  it('should process stdout write correct message', (done) => {
    logger.stdoutWrite(chalk.green('Test'));
    logger.stdoutWrite('Message');
    td.reset();
    should(actualTxt.join('')).be.eql([
      chalk.green('Test'),
      'Message',
    ].join(''));
    done();
  });
});
