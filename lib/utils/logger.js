'use strict';

function log() {
  console.log.apply(console, Object.assign([], arguments));
}

function error() {
  console.error.apply(console, Object.assign([], arguments));
}

function stdoutWrite() {
  process.stdout.write.apply(process.stdout, [Object.assign([], arguments).join('')]);
}

module.exports = {
  log,
  error,
  stdoutWrite,
};
