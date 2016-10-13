'use strict';

const should = require('should');
// const chalk = require('chalk');
// const Promise = require('bluebird');
// const inquirer = require('inquirer');
// const td = require('testdouble');

const rightpad = require('../lib/utils/rightpad');

describe('RightPad Tests', () => {
  beforeEach(() => {});
  afterEach(() => {});

  // note: took these tests from the source

  it('should pad right correct number of spaces', (done) => {
    should(rightpad('test', 9)).be.eql('test     ');
    done();
  });

  it('should not add any spaces to the right', (done) => {
    should(rightpad('test', 4)).be.eql('test');
    done();
  });

  it('should add correct number of characters on the right', (done) => {
    should(rightpad(1, 5, 0)).be.eql('10000');
    should(rightpad(1, 2, '-')).be.eql('1-');
    done();
  });
});
