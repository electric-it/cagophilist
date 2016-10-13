#!/usr/bin/env node

'use strict';

const cago = require('./lib');

cago(process.argv[2], process.argv[3])
  .then(() => {
    process.exit(0);
  })
  .catch(() => {
    process.exit(1);
  });
