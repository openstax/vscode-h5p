const { TextEncoder, TextDecoder } = require('util');
const crypto = require('crypto');
const {
  default: Base,
  TestEnvironment,
} = require('jest-environment-jsdom');

Object.defineProperty(exports, '__esModule', {
  value: true,
});

class JSDOMEnvironment extends Base {
  constructor(...args) {
    const { global } = super(...args);
    if (!global.TextEncoder) global.TextEncoder = TextEncoder;
    if (!global.TextDecoder) global.TextDecoder = TextDecoder;
    if (!global.Uint8Array) global.Uint8Array = Uint8Array;
    if (!global.crypto.subtle) global.crypto.subtle = crypto.subtle;
  }
}

exports.default = JSDOMEnvironment;
// Are we using jsdom? Yes: Return our override; No: Return the default env
exports.TestEnvironment =
  TestEnvironment === Base ? JSDOMEnvironment : TestEnvironment;

// Thanks to https://github.com/jsdom/jsdom/issues/2524#issuecomment-1480930523
