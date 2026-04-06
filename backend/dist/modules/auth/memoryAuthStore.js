const normalizeEmail = (value) => value.trim().toLowerCase();
const normalizePhone = (value) => value.replace(/\s+/g, ' ').trim();
export class MemoryAuthStore {
    accountsById = new Map();
    accountIdsByEmail = new Map();
    accountIdsByPhone = new Map();
    flowsByHashedToken = new Map();
    legalAcceptancesByAccountId = new Map();
    sessionsByHashedToken = new Map();
    async initialize() { }
    async deleteFlowByHashedToken(hashedToken) {
        this.flowsByHashedToken.delete(hashedToken);
    }
    async deleteSessionByHashedToken(hashedToken) {
        this.sessionsByHashedToken.delete(hashedToken);
    }
    async deleteSessionsByAccountId(accountId) {
        for (const [hashedToken, session] of this.sessionsByHashedToken.entries()) {
            if (session.accountId === accountId) {
                this.sessionsByHashedToken.delete(hashedToken);
            }
        }
    }
    async getAccountByEmail(email) {
        const accountId = this.accountIdsByEmail.get(normalizeEmail(email));
        return accountId ? this.accountsById.get(accountId) : undefined;
    }
    async getAccountById(id) {
        return this.accountsById.get(id);
    }
    async getAccountByPhone(phone) {
        const accountId = this.accountIdsByPhone.get(normalizePhone(phone));
        return accountId ? this.accountsById.get(accountId) : undefined;
    }
    async getFlowByHashedToken(hashedToken) {
        const flow = this.flowsByHashedToken.get(hashedToken);
        if (!flow) {
            return undefined;
        }
        if (new Date(flow.expiresAt).getTime() <= Date.now()) {
            this.flowsByHashedToken.delete(hashedToken);
            return undefined;
        }
        return flow;
    }
    async getSessionByHashedToken(hashedToken) {
        const session = this.sessionsByHashedToken.get(hashedToken);
        if (!session) {
            return undefined;
        }
        if (new Date(session.expiresAt).getTime() <= Date.now()) {
            this.sessionsByHashedToken.delete(hashedToken);
            return undefined;
        }
        return session;
    }
    async listAccounts() {
        return Array.from(this.accountsById.values());
    }
    async saveAccount(account, options) {
        const previous = this.accountsById.get(account.id);
        if (previous && previous.email !== account.email) {
            this.accountIdsByEmail.delete(normalizeEmail(previous.email));
        }
        if (previous && previous.phone !== account.phone) {
            this.accountIdsByPhone.delete(normalizePhone(previous.phone));
        }
        this.accountsById.set(account.id, account);
        this.accountIdsByEmail.set(normalizeEmail(account.email), account.id);
        if (account.phone) {
            this.accountIdsByPhone.set(normalizePhone(account.phone), account.id);
        }
        if (options?.legalAcceptance) {
            const acceptances = this.legalAcceptancesByAccountId.get(account.id) || [];
            acceptances.push(options.legalAcceptance);
            this.legalAcceptancesByAccountId.set(account.id, acceptances);
        }
    }
    async saveFlow(flow) {
        this.flowsByHashedToken.set(flow.hashedToken, flow);
    }
    async saveSession(session) {
        this.sessionsByHashedToken.set(session.hashedToken, session);
    }
}
