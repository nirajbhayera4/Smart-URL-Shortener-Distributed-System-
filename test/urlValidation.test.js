const test = require('node:test');
const assert = require('node:assert/strict');
const { validateWebUrl } = require('../urlValidation');

test('accepts valid HTTP and HTTPS URLs', () => {
    assert.equal(validateWebUrl('https://example.com'), true);
    assert.equal(validateWebUrl('http://example.com/path?q=1'), true);
});

test('rejects unsupported protocols and malformed URLs', () => {
    assert.equal(validateWebUrl('ftp://example.com'), false);
    assert.equal(validateWebUrl('javascript:alert(1)'), false);
    assert.equal(validateWebUrl('not a URL'), false);
});

test('rejects non-string and overlong values', () => {
    assert.equal(validateWebUrl(null), false);
    assert.equal(validateWebUrl(123), false);
    assert.equal(validateWebUrl(`https://example.com/${'a'.repeat(2048)}`), false);
});
