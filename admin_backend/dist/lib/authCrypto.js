import { createHash, createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual, } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(scryptCallback);
const SCRYPT_KEY_LENGTH = 64;
const toBase64Url = (buffer) => buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
const fromBase64Url = (value) => {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
    return Buffer.from(`${normalized}${padding}`, 'base64');
};
const secureCompare = (left, right) => {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    if (leftBuffer.length !== rightBuffer.length) {
        return false;
    }
    return timingSafeEqual(leftBuffer, rightBuffer);
};
export const createRandomToken = (size = 32) => toBase64Url(randomBytes(size));
export const createNumericCode = (length = 6) => {
    const digits = Array.from(randomBytes(length), (value) => String(value % 10)).join('');
    return digits.slice(0, length);
};
export const hashOpaqueValue = (value, secret) => createHmac('sha256', secret).update(value).digest('hex');
export const hashOneTimeCode = (value, secret) => createHash('sha256').update(`${secret}:${value}`).digest('hex');
export const hashPassword = async (password) => {
    const salt = randomBytes(16);
    const derivedKey = (await scrypt(password, salt, SCRYPT_KEY_LENGTH));
    return `scrypt$${toBase64Url(salt)}$${toBase64Url(derivedKey)}`;
};
export const verifyPassword = async (password, storedHash) => {
    const [algorithm, encodedSalt, encodedHash] = storedHash.split('$');
    if (algorithm !== 'scrypt' || !encodedSalt || !encodedHash) {
        return false;
    }
    const salt = fromBase64Url(encodedSalt);
    const expected = fromBase64Url(encodedHash);
    const actual = (await scrypt(password, salt, expected.length));
    return expected.length === actual.length && timingSafeEqual(expected, actual);
};
export const createSignedCsrfToken = (secret) => {
    const nonce = createRandomToken(18);
    const signature = hashOpaqueValue(nonce, secret);
    return `${nonce}.${signature}`;
};
export const verifySignedCsrfToken = (token, secret) => {
    const [nonce, signature] = token.split('.');
    if (!nonce || !signature) {
        return false;
    }
    return secureCompare(hashOpaqueValue(nonce, secret), signature);
};
