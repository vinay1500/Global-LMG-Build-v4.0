import { env } from '../../config/env.js';
import { createNumericCode, createRandomToken, hashOneTimeCode, hashOpaqueValue, hashPassword, verifyPassword, } from '../../lib/authCrypto.js';
import { notFound, conflict, tooManyRequests, unauthorized } from '../../lib/httpErrors.js';
import { getMysqlPool } from '../../lib/mysql.js';
import { createPublicId } from '../../lib/ids.js';
import { emailAuthProvider } from './providers/email.js';
import { googleAuthProvider } from './providers/google.js';
import { smsAuthProvider } from './providers/sms.js';
import { MysqlAuthStore } from './mysqlAuthStore.js';
import { InMemoryRateLimiter } from './rateLimiter.js';
const limiter = new InMemoryRateLimiter();
const normalizeEmail = (value) => value.trim().toLowerCase();
const normalizePhone = (value) => value.replace(/\s+/g, ' ').trim();
const isEmailIdentifier = (value) => value.includes('@');
const nowIso = () => new Date().toISOString();
const addMinutes = (minutes) => new Date(Date.now() + minutes * 60_000).toISOString();
const addHours = (hours) => new Date(Date.now() + hours * 60 * 60_000).toISOString();
const addDays = (days) => new Date(Date.now() + days * 24 * 60 * 60_000).toISOString();
const getWindowMs = () => env.AUTH_RATE_LIMIT_WINDOW_MINUTES * 60_000;
const isMysqlConfigured = Boolean(env.MYSQL_HOST && env.MYSQL_DATABASE && env.MYSQL_USER && env.MYSQL_PASSWORD);
let storePromise = null;
let initializationPromise = null;
const toUser = (account) => ({
    avatar: '',
    email: account.email,
    id: account.id,
    joinedAt: account.createdAt,
    lastActiveAt: account.lastLoginAt || account.createdAt,
    lifecycle: 'client',
    name: account.fullName,
    owner: 'Client Intake Desk',
    phone: account.phone,
    region: account.country,
});
const createChallenge = (type, ttlMinutes) => {
    const code = createNumericCode();
    const challenge = {
        type,
        hashedCode: hashOneTimeCode(code, env.AUTH_SESSION_SECRET),
        expiresAt: addMinutes(ttlMinutes),
        lastSentAt: nowIso(),
    };
    return { challenge, code };
};
const issueEmailChallenge = async (email, fullName, ttlMinutes, purpose) => {
    const challenge = createChallenge(purpose === 'password_reset' ? 'password-reset' : 'email', ttlMinutes);
    const delivery = await emailAuthProvider.sendCode({
        code: challenge.code,
        purpose,
        recipientEmail: email,
        recipientName: fullName,
    });
    return {
        challenge: challenge.challenge,
        deliveryHint: delivery.deliveryHint,
    };
};
const issuePhoneChallenge = async (phone) => {
    const expiresAt = addMinutes(env.PHONE_OTP_TTL_MINUTES);
    const lastSentAt = nowIso();
    if (env.SMS_PROVIDER_MODE === 'preview') {
        const challenge = createChallenge('phone', env.PHONE_OTP_TTL_MINUTES);
        const delivery = await smsAuthProvider.sendCode({
            code: challenge.code,
            purpose: 'phone_verification',
            recipientPhone: phone,
        });
        return {
            challenge: {
                ...challenge.challenge,
                phoneSnapshot: phone,
                providerCode: 'preview',
            },
            deliveryHint: delivery.deliveryHint,
        };
    }
    const delivery = await smsAuthProvider.sendCode({
        purpose: 'phone_verification',
        recipientPhone: phone,
    });
    return {
        challenge: {
            type: 'phone',
            expiresAt,
            lastSentAt,
            phoneSnapshot: phone,
            providerCode: 'twilio-verify',
            providerReference: delivery.providerReference,
        },
        deliveryHint: delivery.deliveryHint,
    };
};
const assertRateLimit = (key) => {
    const rateLimit = limiter.consume(key, env.AUTH_RATE_LIMIT_MAX_ATTEMPTS, getWindowMs());
    if (!rateLimit.allowed) {
        throw tooManyRequests('too_many_attempts', 'Too many attempts. Please wait before trying again.', rateLimit.retryAfterSeconds);
    }
};
const isSmsDeliveryFailure = (error) => error instanceof Error &&
    'code' in error &&
    ['sms_provider_failed', 'sms_provider_misconfigured', 'sms_provider_disabled'].includes(String(error.code));
const buildPhoneCaptureFallbackResult = async (store, account, purpose, rememberMe, message) => ({
    flowToken: await createFlow(store, account.id, purpose, rememberMe, {}),
    result: {
        status: 'phone_capture_required',
        message,
        email: account.email,
        phone: account.phone,
    },
});
const createStore = async () => {
    if (!isMysqlConfigured) {
        throw new Error('AUTH_STORE_MODE is mysql but MySQL environment variables are incomplete.');
    }
    const mysqlStore = new MysqlAuthStore(getMysqlPool());
    await mysqlStore.initialize();
    return mysqlStore;
};
const getStore = async () => {
    if (!storePromise) {
        storePromise = createStore().catch((error) => {
            storePromise = null;
            throw error;
        });
    }
    return storePromise;
};
const findAccountByIdentifier = async (store, identifier) => {
    if (isEmailIdentifier(identifier)) {
        return store.getAccountByEmail(normalizeEmail(identifier));
    }
    return store.getAccountByPhone(normalizePhone(identifier));
};
const createSession = async (store, account, rememberMe) => {
    const rawSessionToken = createRandomToken();
    const hashedToken = hashOpaqueValue(rawSessionToken, env.AUTH_SESSION_SECRET);
    const timestamp = nowIso();
    const nextAccount = {
        ...account,
        lastLoginAt: timestamp,
    };
    await store.saveSession({
        accountId: account.id,
        createdAt: timestamp,
        expiresAt: rememberMe
            ? addDays(env.REMEMBER_ME_TTL_DAYS)
            : addHours(env.SESSION_TTL_HOURS),
        hashedToken,
        lastSeenAt: timestamp,
        rememberMe,
    });
    await store.saveAccount(nextAccount);
    return {
        clearFlowCookie: true,
        rememberMe,
        result: {
            status: 'authenticated',
            message: 'Signed in successfully.',
            user: toUser(nextAccount),
        },
        sessionToken: rawSessionToken,
    };
};
const createFlow = async (store, accountId, purpose, rememberMe, options) => {
    const rawFlowToken = createRandomToken();
    await store.saveFlow({
        accountId,
        createdAt: nowIso(),
        expiresAt: addMinutes(env.AUTH_FLOW_TTL_MINUTES),
        hashedToken: hashOpaqueValue(rawFlowToken, env.AUTH_SESSION_SECRET),
        purpose,
        rememberMe,
        ...options,
    });
    return rawFlowToken;
};
const readFlow = async (store, rawFlowToken) => {
    if (!rawFlowToken) {
        throw unauthorized('missing_auth_flow', 'No authentication flow is pending.');
    }
    const flow = await store.getFlowByHashedToken(hashOpaqueValue(rawFlowToken, env.AUTH_SESSION_SECRET));
    if (!flow) {
        throw unauthorized('invalid_auth_flow', 'Authentication flow expired or is invalid.');
    }
    const account = await store.getAccountById(flow.accountId);
    if (!account) {
        throw notFound('account_not_found', 'Account not found.');
    }
    return { account, flow };
};
const verifyChallengeCode = (challenge, code, invalidCode) => {
    if (!challenge) {
        throw unauthorized('missing_verification_step', 'Required verification step is not pending.');
    }
    if (new Date(challenge.expiresAt).getTime() <= Date.now()) {
        throw unauthorized('expired_verification_step', 'Verification code expired. Request a new code.');
    }
    if (!challenge.hashedCode) {
        throw unauthorized('missing_verification_code', 'Verification code is not available for this step.');
    }
    if (hashOneTimeCode(code.trim(), env.AUTH_SESSION_SECRET) !== challenge.hashedCode) {
        throw unauthorized(invalidCode.code, invalidCode.message);
    }
};
const verifyPhoneChallenge = async (challenge, accountPhone, code) => {
    if (!challenge) {
        throw unauthorized('missing_verification_step', 'Required verification step is not pending.');
    }
    if (new Date(challenge.expiresAt).getTime() <= Date.now()) {
        throw unauthorized('expired_verification_step', 'Verification code expired. Request a new code.');
    }
    if (challenge.providerCode === 'twilio-verify') {
        const verification = await smsAuthProvider.verifyCode({
            code: code.trim(),
            purpose: 'phone_verification',
            providerReference: challenge.providerReference,
            recipientPhone: challenge.phoneSnapshot || accountPhone,
        });
        if (!verification.approved) {
            throw unauthorized('invalid_phone_otp', 'The OTP you entered is invalid.');
        }
        return;
    }
    verifyChallengeCode(challenge, code, {
        code: 'invalid_phone_otp',
        message: 'The OTP you entered is invalid.',
    });
};
const createPreviewAccount = async (store) => {
    const existing = await store.getAccountByEmail(env.PREVIEW_ACCOUNT_EMAIL);
    if (existing) {
        return;
    }
    await store.saveAccount({
        id: createPublicId(),
        fullName: env.PREVIEW_ACCOUNT_NAME,
        email: normalizeEmail(env.PREVIEW_ACCOUNT_EMAIL),
        phone: normalizePhone(env.PREVIEW_ACCOUNT_PHONE),
        country: env.PREVIEW_ACCOUNT_COUNTRY,
        passwordHash: await hashPassword(env.PREVIEW_ACCOUNT_PASSWORD),
        provider: 'email',
        isEmailVerified: true,
        isPhoneVerified: true,
        createdAt: '2024-08-15T09:00:00.000Z',
        lastLoginAt: nowIso(),
    });
};
const ensureInitialized = async () => {
    if (!initializationPromise) {
        initializationPromise = (async () => {
            const store = await getStore();
            await createPreviewAccount(store);
            return store;
        })().catch((error) => {
            initializationPromise = null;
            throw error;
        });
    }
    return initializationPromise;
};
export const authService = {
    async getSession(rawSessionToken) {
        const store = await ensureInitialized();
        if (!rawSessionToken) {
            return {
                clearSessionCookie: false,
                user: null,
            };
        }
        const hashedToken = hashOpaqueValue(rawSessionToken, env.AUTH_SESSION_SECRET);
        const session = await store.getSessionByHashedToken(hashedToken);
        if (!session) {
            return {
                clearSessionCookie: true,
                user: null,
            };
        }
        const account = await store.getAccountById(session.accountId);
        if (!account) {
            await store.deleteSessionByHashedToken(hashedToken);
            return {
                clearSessionCookie: true,
                user: null,
            };
        }
        return {
            clearSessionCookie: false,
            user: toUser(account),
        };
    },
    async signIn(payload, context) {
        const store = await ensureInitialized();
        const identifier = payload.identifier.trim();
        assertRateLimit(`signin:${context.ipAddress}:${identifier.toLowerCase()}`);
        const account = await findAccountByIdentifier(store, identifier);
        if (!account) {
            throw unauthorized('invalid_credentials', 'Invalid credentials. Please try again.');
        }
        if (!account.passwordHash) {
            throw conflict('use_google_sign_in', 'This account uses Google sign-in. Continue with Google to access it.');
        }
        const passwordMatches = await verifyPassword(payload.password, account.passwordHash);
        if (!passwordMatches) {
            throw unauthorized('invalid_credentials', 'Invalid credentials. Please try again.');
        }
        if (!account.isEmailVerified) {
            const emailChallenge = await issueEmailChallenge(account.email, account.fullName, env.EMAIL_VERIFICATION_TTL_MINUTES, 'email_verification');
            return {
                flowToken: await createFlow(store, account.id, 'sign-in', payload.rememberMe, {
                    emailChallenge: emailChallenge.challenge,
                }),
                result: {
                    status: 'email_verification_required',
                    message: 'Account not verified. Complete email verification to continue.',
                    deliveryHint: emailChallenge.deliveryHint,
                    email: account.email,
                },
            };
        }
        if (!account.isPhoneVerified) {
            try {
                const phoneChallenge = await issuePhoneChallenge(account.phone);
                return {
                    flowToken: await createFlow(store, account.id, 'sign-in', payload.rememberMe, {
                        phoneChallenge: phoneChallenge.challenge,
                    }),
                    result: {
                        status: 'phone_otp_required',
                        message: 'Phone verification is required before login.',
                        deliveryHint: phoneChallenge.deliveryHint,
                        email: account.email,
                        phone: account.phone,
                    },
                };
            }
            catch (error) {
                if (isSmsDeliveryFailure(error)) {
                    return buildPhoneCaptureFallbackResult(store, account, 'sign-in', payload.rememberMe, 'We could not deliver an OTP to the saved phone number. Update the phone number to continue.');
                }
                throw error;
            }
        }
        return createSession(store, account, payload.rememberMe);
    },
    async signUp(payload, context) {
        const store = await ensureInitialized();
        const normalizedEmail = normalizeEmail(payload.email);
        const normalizedPhone = normalizePhone(payload.phone);
        if (await store.getAccountByEmail(normalizedEmail)) {
            throw conflict('email_already_exists', 'An account with this email already exists.');
        }
        if (await store.getAccountByPhone(normalizedPhone)) {
            throw conflict('phone_already_exists', 'An account with this phone number already exists.');
        }
        const account = {
            id: createPublicId(),
            fullName: payload.fullName.trim(),
            email: normalizedEmail,
            phone: normalizedPhone,
            country: payload.country.trim(),
            passwordHash: await hashPassword(payload.password),
            provider: 'email',
            isEmailVerified: false,
            isPhoneVerified: false,
            createdAt: nowIso(),
        };
        await store.saveAccount(account, {
            legalAcceptance: payload.acceptTerms
                ? {
                    acceptanceTypeCode: 'terms_and_privacy',
                    acceptedAt: nowIso(),
                    ipAddress: context.ipAddress,
                    sourceCode: 'portal_sign_up',
                    userAgent: context.userAgent || null,
                }
                : undefined,
        });
        const emailChallenge = await issueEmailChallenge(account.email, account.fullName, env.EMAIL_VERIFICATION_TTL_MINUTES, 'email_verification');
        return {
            flowToken: await createFlow(store, account.id, 'sign-up', false, {
                emailChallenge: emailChallenge.challenge,
            }),
            result: {
                status: 'email_verification_required',
                message: 'Verification email sent. Complete email verification to continue.',
                deliveryHint: emailChallenge.deliveryHint,
                email: account.email,
                phone: account.phone,
            },
        };
    },
    async signInWithGoogle(payload) {
        const store = await ensureInitialized();
        const googleIdentity = await googleAuthProvider.resolveIdentity(payload.credential);
        const normalizedEmail = normalizeEmail(googleIdentity.email);
        const existingAccount = await store.getAccountByEmail(normalizedEmail);
        const account = existingAccount
            ? {
                ...existingAccount,
                country: existingAccount.country || env.PREVIEW_GOOGLE_COUNTRY,
                email: normalizedEmail,
                fullName: existingAccount.fullName || googleIdentity.fullName,
                isEmailVerified: existingAccount.isEmailVerified || googleIdentity.emailVerified,
                oauthSubject: googleIdentity.subject,
                provider: 'google',
            }
            : {
                id: createPublicId(),
                fullName: googleIdentity.fullName,
                email: normalizedEmail,
                phone: '',
                country: env.PREVIEW_GOOGLE_COUNTRY,
                oauthSubject: googleIdentity.subject,
                passwordHash: '',
                provider: 'google',
                isEmailVerified: googleIdentity.emailVerified,
                isPhoneVerified: false,
                createdAt: nowIso(),
            };
        await store.saveAccount(account);
        if (!account.phone) {
            return {
                flowToken: await createFlow(store, account.id, 'google', payload.rememberMe, {}),
                result: {
                    status: 'phone_capture_required',
                    message: 'Google provided a verified email but no phone number. Add a phone number to continue.',
                    email: account.email,
                },
            };
        }
        if (!account.isPhoneVerified) {
            try {
                const phoneChallenge = await issuePhoneChallenge(account.phone);
                return {
                    flowToken: await createFlow(store, account.id, 'google', payload.rememberMe, {
                        phoneChallenge: phoneChallenge.challenge,
                    }),
                    result: {
                        status: 'phone_otp_required',
                        message: 'Phone OTP is required to complete Google sign-in.',
                        deliveryHint: phoneChallenge.deliveryHint,
                        email: account.email,
                        phone: account.phone,
                    },
                };
            }
            catch (error) {
                if (isSmsDeliveryFailure(error)) {
                    return buildPhoneCaptureFallbackResult(store, account, 'google', payload.rememberMe, 'We could not deliver an OTP to the saved phone number. Update the phone number to continue.');
                }
                throw error;
            }
        }
        return createSession(store, account, payload.rememberMe);
    },
    async verifyEmail(rawFlowToken, code) {
        const store = await ensureInitialized();
        const { account, flow } = await readFlow(store, rawFlowToken);
        verifyChallengeCode(flow.emailChallenge, code, {
            code: 'invalid_email_verification_code',
            message: 'The verification code is invalid.',
        });
        const updatedAccount = {
            ...account,
            isEmailVerified: true,
        };
        await store.saveAccount(updatedAccount);
        let phoneChallenge;
        try {
            phoneChallenge = await issuePhoneChallenge(updatedAccount.phone);
        }
        catch (error) {
            if (isSmsDeliveryFailure(error)) {
                await store.deleteFlowByHashedToken(flow.hashedToken);
                return {
                    flowToken: await createFlow(store, updatedAccount.id, flow.purpose, flow.rememberMe, {}),
                    clearFlowCookie: true,
                    result: {
                        status: 'phone_capture_required',
                        message: 'Email verified, but we could not deliver an OTP to the saved phone number. Update the phone number to continue.',
                        email: updatedAccount.email,
                        phone: updatedAccount.phone,
                    },
                };
            }
            throw error;
        }
        await store.deleteFlowByHashedToken(flow.hashedToken);
        return {
            flowToken: await createFlow(store, updatedAccount.id, flow.purpose, flow.rememberMe, {
                phoneChallenge: phoneChallenge.challenge,
            }),
            clearFlowCookie: true,
            result: {
                status: 'phone_otp_required',
                message: 'Email verified. Complete phone OTP verification to continue.',
                deliveryHint: phoneChallenge.deliveryHint,
                email: updatedAccount.email,
                phone: updatedAccount.phone,
            },
        };
    },
    async submitGooglePhone(rawFlowToken, phone, country) {
        const store = await ensureInitialized();
        const { account, flow } = await readFlow(store, rawFlowToken);
        if (flow.purpose === 'password-reset') {
            throw unauthorized('invalid_auth_flow', 'Phone update is not pending.');
        }
        const normalizedPhone = normalizePhone(phone);
        const existingByPhone = await store.getAccountByPhone(normalizedPhone);
        if (existingByPhone && existingByPhone.id !== account.id) {
            throw conflict('phone_already_exists', 'An account with this phone number already exists.');
        }
        const updatedAccount = {
            ...account,
            phone: normalizedPhone,
            country: country.trim(),
        };
        await store.saveAccount(updatedAccount);
        let phoneChallenge;
        try {
            phoneChallenge = await issuePhoneChallenge(updatedAccount.phone);
        }
        catch (error) {
            if (isSmsDeliveryFailure(error)) {
                await store.deleteFlowByHashedToken(flow.hashedToken);
                return {
                    flowToken: await createFlow(store, updatedAccount.id, flow.purpose, flow.rememberMe, {}),
                    clearFlowCookie: true,
                    result: {
                        status: 'phone_capture_required',
                        message: 'We could not deliver an OTP to that phone number. Update the phone number and try again.',
                        email: updatedAccount.email,
                        phone: updatedAccount.phone,
                    },
                };
            }
            throw error;
        }
        await store.deleteFlowByHashedToken(flow.hashedToken);
        return {
            flowToken: await createFlow(store, updatedAccount.id, flow.purpose, flow.rememberMe, {
                phoneChallenge: phoneChallenge.challenge,
            }),
            clearFlowCookie: true,
            result: {
                status: 'phone_otp_required',
                message: 'Phone number saved. Enter the OTP to continue.',
                deliveryHint: phoneChallenge.deliveryHint,
                email: updatedAccount.email,
                phone: updatedAccount.phone,
            },
        };
    },
    async verifyPhoneOtp(rawFlowToken, code) {
        const store = await ensureInitialized();
        const { account, flow } = await readFlow(store, rawFlowToken);
        await verifyPhoneChallenge(flow.phoneChallenge, account.phone, code);
        const updatedAccount = {
            ...account,
            isEmailVerified: true,
            isPhoneVerified: true,
        };
        await store.saveAccount(updatedAccount);
        await store.deleteFlowByHashedToken(flow.hashedToken);
        return createSession(store, updatedAccount, flow.rememberMe);
    },
    async requestPasswordReset(identifier, context) {
        const store = await ensureInitialized();
        const normalizedIdentifier = identifier.trim().toLowerCase();
        assertRateLimit(`password-reset:${context.ipAddress}:${normalizedIdentifier}`);
        const account = await findAccountByIdentifier(store, identifier);
        if (!account) {
            throw notFound('account_not_found', 'We could not find an account for that email or phone number.');
        }
        const challenge = await issueEmailChallenge(account.email, account.fullName, env.PASSWORD_RESET_TTL_MINUTES, 'password_reset');
        return {
            flowToken: await createFlow(store, account.id, 'password-reset', false, {
                passwordResetChallenge: challenge.challenge,
            }),
            status: 'password_reset_requested',
            message: 'Password reset code sent. Use the verification code to continue.',
            deliveryHint: challenge.deliveryHint,
            email: account.email,
        };
    },
    async resetPassword(rawFlowToken, payload) {
        const store = await ensureInitialized();
        const { account, flow } = await readFlow(store, rawFlowToken);
        if (flow.purpose !== 'password-reset') {
            throw unauthorized('invalid_auth_flow', 'Password reset is not pending.');
        }
        if (normalizeEmail(payload.email) !== normalizeEmail(account.email)) {
            throw conflict('reset_email_mismatch', 'Reset email does not match the requested account.');
        }
        verifyChallengeCode(flow.passwordResetChallenge, payload.code, {
            code: 'invalid_reset_code',
            message: 'The reset code is invalid or expired.',
        });
        await store.saveAccount({
            ...account,
            passwordHash: await hashPassword(payload.password),
        });
        await store.deleteFlowByHashedToken(flow.hashedToken);
        await store.deleteSessionsByAccountId(account.id);
        return {
            clearFlowCookie: true,
            clearSessionCookie: true,
            result: {
                status: 'password_reset_completed',
                message: 'Password reset successful. You can sign in now.',
                email: account.email,
            },
        };
    },
    async resendEmailVerification(rawFlowToken) {
        const store = await ensureInitialized();
        const { account, flow } = await readFlow(store, rawFlowToken);
        const emailChallenge = await issueEmailChallenge(account.email, account.fullName, env.EMAIL_VERIFICATION_TTL_MINUTES, 'email_verification');
        await store.deleteFlowByHashedToken(flow.hashedToken);
        return {
            flowToken: await createFlow(store, account.id, flow.purpose, flow.rememberMe, {
                emailChallenge: emailChallenge.challenge,
            }),
            clearFlowCookie: true,
            result: {
                status: 'email_verification_required',
                message: 'Verification email resent.',
                deliveryHint: emailChallenge.deliveryHint,
                email: account.email,
            },
        };
    },
    async resendPhoneOtp(rawFlowToken) {
        const store = await ensureInitialized();
        const { account, flow } = await readFlow(store, rawFlowToken);
        const phoneChallenge = await issuePhoneChallenge(account.phone);
        await store.deleteFlowByHashedToken(flow.hashedToken);
        return {
            flowToken: await createFlow(store, account.id, flow.purpose, flow.rememberMe, {
                phoneChallenge: phoneChallenge.challenge,
            }),
            clearFlowCookie: true,
            result: {
                status: 'phone_otp_required',
                message: 'OTP resent.',
                deliveryHint: phoneChallenge.deliveryHint,
                email: account.email,
                phone: account.phone,
            },
        };
    },
    async resendPasswordReset(rawFlowToken) {
        const store = await ensureInitialized();
        const { account, flow } = await readFlow(store, rawFlowToken);
        if (flow.purpose !== 'password-reset') {
            throw unauthorized('invalid_auth_flow', 'Password reset is not pending.');
        }
        const challenge = await issueEmailChallenge(account.email, account.fullName, env.PASSWORD_RESET_TTL_MINUTES, 'password_reset');
        await store.deleteFlowByHashedToken(flow.hashedToken);
        return {
            flowToken: await createFlow(store, account.id, 'password-reset', false, {
                passwordResetChallenge: challenge.challenge,
            }),
            clearFlowCookie: true,
            result: {
                status: 'password_reset_requested',
                message: 'Password reset code resent.',
                deliveryHint: challenge.deliveryHint,
                email: account.email,
            },
        };
    },
    async signOut(rawSessionToken) {
        const store = await ensureInitialized();
        if (!rawSessionToken) {
            return;
        }
        await store.deleteSessionByHashedToken(hashOpaqueValue(rawSessionToken, env.AUTH_SESSION_SECRET));
    },
};
