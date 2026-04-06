import { randomBytes } from 'node:crypto';
const CROCKFORD_BASE32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const encodeBase32 = (value, length) => {
    let remaining = value;
    let output = '';
    for (let index = 0; index < length; index += 1) {
        const current = Number(remaining & 31n);
        output = `${CROCKFORD_BASE32[current]}${output}`;
        remaining >>= 5n;
    }
    return output;
};
export const createPublicId = () => {
    const timestamp = BigInt(Date.now());
    const randomness = BigInt(`0x${randomBytes(10).toString('hex')}`);
    return `${encodeBase32(timestamp, 10)}${encodeBase32(randomness, 16)}`;
};
export const createPublicIdWithPrefix = (prefix) => `${prefix}_${createPublicId()}`;
