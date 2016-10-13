'use strict';

function rightpad(s, l, c) {
  let str = String(s);
  let len = l;
  let ch = c;
  let i = -1;

  if (!ch && ch !== 0) ch = ' ';
  len -= str.length;
  while (++i < len) {
    str += ch;
  }
  return str;
}

module.exports = rightpad;
