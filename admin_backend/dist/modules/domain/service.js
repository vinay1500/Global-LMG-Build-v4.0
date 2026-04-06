import { getMysqlPool } from '../../lib/mysql.js';
import { DomainRepository } from './repository.js';
let repositoryPromise = null;
const getRepository = async () => {
    if (!repositoryPromise) {
        repositoryPromise = (async () => {
            const repository = new DomainRepository(getMysqlPool());
            await repository.initialize();
            return repository;
        })().catch((error) => {
            repositoryPromise = null;
            throw error;
        });
    }
    return repositoryPromise;
};
export const domainService = {
    async getMyClientAccount(userPublicId) {
        const repository = await getRepository();
        return repository.getMyClientAccount(userPublicId);
    },
    async listClientMatters(clientAccountId) {
        const repository = await getRepository();
        return repository.listClientMatters(clientAccountId);
    },
    async getClientMatter(clientAccountId, matterPublicId) {
        const repository = await getRepository();
        return repository.getClientMatter(clientAccountId, matterPublicId);
    },
    async listClientDocuments(clientAccountId) {
        const repository = await getRepository();
        return repository.listClientDocuments(clientAccountId);
    },
    async getClientDocument(clientAccountId, documentPublicId) {
        const repository = await getRepository();
        return repository.getClientDocument(clientAccountId, documentPublicId);
    },
    async listClientEvents(clientAccountId) {
        const repository = await getRepository();
        return repository.listClientEvents(clientAccountId);
    },
    async listClientInvoices(clientAccountId) {
        const repository = await getRepository();
        return repository.listClientInvoices(clientAccountId);
    },
    async getClientInvoice(clientAccountId, invoicePublicId) {
        const repository = await getRepository();
        return repository.getClientInvoice(clientAccountId, invoicePublicId);
    },
    async listClientPayments(clientAccountId) {
        const repository = await getRepository();
        return repository.listClientPayments(clientAccountId);
    },
    async listClientRefunds(clientAccountId) {
        const repository = await getRepository();
        return repository.listClientRefunds(clientAccountId);
    },
    async listClientAccounts() {
        const repository = await getRepository();
        return repository.listClientAccounts();
    },
    async getClientAccountByPublicId(clientAccountPublicId) {
        const repository = await getRepository();
        return repository.getClientAccountByPublicId(clientAccountPublicId);
    },
    async listCounselPartners() {
        const repository = await getRepository();
        return repository.listCounselPartners();
    },
    async getCounselPartnerByPublicId(counselPublicId) {
        const repository = await getRepository();
        return repository.getCounselPartnerByPublicId(counselPublicId);
    },
    async listMatters() {
        const repository = await getRepository();
        return repository.listMatters();
    },
    async getMatterByPublicId(matterPublicId) {
        const repository = await getRepository();
        return repository.getMatterByPublicId(matterPublicId);
    },
    async updateMatterStage(actorUserPublicId, actorRoleCodeSnapshot, matterPublicId, input) {
        const repository = await getRepository();
        return repository.updateMatterStage(actorUserPublicId, actorRoleCodeSnapshot, matterPublicId, input);
    },
    async createMatterAssignment(actorUserPublicId, matterPublicId, input) {
        const repository = await getRepository();
        return repository.createMatterAssignment(actorUserPublicId, matterPublicId, input);
    },
    async listDocuments() {
        const repository = await getRepository();
        return repository.listDocuments();
    },
    async getDocumentByPublicId(documentPublicId) {
        const repository = await getRepository();
        return repository.getDocumentByPublicId(documentPublicId);
    },
    async listEvents() {
        const repository = await getRepository();
        return repository.listEvents();
    },
    async getEventByPublicId(eventPublicId) {
        const repository = await getRepository();
        return repository.getEventByPublicId(eventPublicId);
    },
    async createEvent(actorUserPublicId, actorRoleCodeSnapshot, input) {
        const repository = await getRepository();
        return repository.createEvent(actorUserPublicId, actorRoleCodeSnapshot, input);
    },
    async listInvoices() {
        const repository = await getRepository();
        return repository.listInvoices();
    },
    async getInvoiceByPublicId(invoicePublicId) {
        const repository = await getRepository();
        return repository.getInvoiceByPublicId(invoicePublicId);
    },
    async listPayments() {
        const repository = await getRepository();
        return repository.listPayments();
    },
    async listRefunds() {
        const repository = await getRepository();
        return repository.listRefunds();
    },
    async createRefund(actorUserPublicId, actorRoleCodeSnapshot, input) {
        const repository = await getRepository();
        return repository.createRefund(actorUserPublicId, actorRoleCodeSnapshot, input);
    },
    async listRoles() {
        const repository = await getRepository();
        return repository.listRoles();
    },
    async listPermissions() {
        const repository = await getRepository();
        return repository.listPermissions();
    },
    async listUsersWithRoles() {
        const repository = await getRepository();
        return repository.listUsersWithRoles();
    },
    async replaceUserRoles(actorUserPublicId, userPublicId, input) {
        const repository = await getRepository();
        return repository.replaceUserRoles(actorUserPublicId, userPublicId, input);
    },
    async createAdminUser(actorUserPublicId, input) {
        const repository = await getRepository();
        return repository.createAdminUser(actorUserPublicId, input);
    },
    async resetAdminUserPassword(actorUserPublicId, userPublicId, input) {
        const repository = await getRepository();
        return repository.resetAdminUserPassword(actorUserPublicId, userPublicId, input);
    },
    async updateAdminUserAccess(actorUserPublicId, userPublicId, input) {
        const repository = await getRepository();
        return repository.updateAdminUserAccess(actorUserPublicId, userPublicId, input);
    },
};
