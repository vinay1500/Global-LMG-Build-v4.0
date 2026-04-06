import { getMysqlPool } from '../../lib/mysql.js';
import { DomainRepository } from './repository.js';
import type {
  CreateAdminUserInput,
  CreateEventInput,
  CreateMatterAssignmentInput,
  CreateRefundInput,
  ReplaceUserRolesInput,
  ResetAdminUserPasswordInput,
  UpdateMatterStageInput,
  UpdateAdminUserAccessInput,
} from './types.js';

let repositoryPromise: Promise<DomainRepository> | null = null;

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
  async getMyClientAccount(userPublicId: string) {
    const repository = await getRepository();
    return repository.getMyClientAccount(userPublicId);
  },

  async listClientMatters(clientAccountId: number) {
    const repository = await getRepository();
    return repository.listClientMatters(clientAccountId);
  },

  async getClientMatter(clientAccountId: number, matterPublicId: string) {
    const repository = await getRepository();
    return repository.getClientMatter(clientAccountId, matterPublicId);
  },

  async listClientDocuments(clientAccountId: number) {
    const repository = await getRepository();
    return repository.listClientDocuments(clientAccountId);
  },

  async getClientDocument(clientAccountId: number, documentPublicId: string) {
    const repository = await getRepository();
    return repository.getClientDocument(clientAccountId, documentPublicId);
  },

  async listClientEvents(clientAccountId: number) {
    const repository = await getRepository();
    return repository.listClientEvents(clientAccountId);
  },

  async listClientInvoices(clientAccountId: number) {
    const repository = await getRepository();
    return repository.listClientInvoices(clientAccountId);
  },

  async getClientInvoice(clientAccountId: number, invoicePublicId: string) {
    const repository = await getRepository();
    return repository.getClientInvoice(clientAccountId, invoicePublicId);
  },

  async listClientPayments(clientAccountId: number) {
    const repository = await getRepository();
    return repository.listClientPayments(clientAccountId);
  },

  async listClientRefunds(clientAccountId: number) {
    const repository = await getRepository();
    return repository.listClientRefunds(clientAccountId);
  },

  async listClientAccounts() {
    const repository = await getRepository();
    return repository.listClientAccounts();
  },

  async getClientAccountByPublicId(clientAccountPublicId: string) {
    const repository = await getRepository();
    return repository.getClientAccountByPublicId(clientAccountPublicId);
  },

  async listCounselPartners() {
    const repository = await getRepository();
    return repository.listCounselPartners();
  },

  async getCounselPartnerByPublicId(counselPublicId: string) {
    const repository = await getRepository();
    return repository.getCounselPartnerByPublicId(counselPublicId);
  },

  async listMatters() {
    const repository = await getRepository();
    return repository.listMatters();
  },

  async getMatterByPublicId(matterPublicId: string) {
    const repository = await getRepository();
    return repository.getMatterByPublicId(matterPublicId);
  },

  async updateMatterStage(
    actorUserPublicId: string,
    actorRoleCodeSnapshot: string,
    matterPublicId: string,
    input: UpdateMatterStageInput
  ) {
    const repository = await getRepository();
    return repository.updateMatterStage(actorUserPublicId, actorRoleCodeSnapshot, matterPublicId, input);
  },

  async createMatterAssignment(
    actorUserPublicId: string,
    matterPublicId: string,
    input: CreateMatterAssignmentInput
  ) {
    const repository = await getRepository();
    return repository.createMatterAssignment(actorUserPublicId, matterPublicId, input);
  },

  async listDocuments() {
    const repository = await getRepository();
    return repository.listDocuments();
  },

  async getDocumentByPublicId(documentPublicId: string) {
    const repository = await getRepository();
    return repository.getDocumentByPublicId(documentPublicId);
  },

  async listEvents() {
    const repository = await getRepository();
    return repository.listEvents();
  },

  async getEventByPublicId(eventPublicId: string) {
    const repository = await getRepository();
    return repository.getEventByPublicId(eventPublicId);
  },

  async createEvent(
    actorUserPublicId: string,
    actorRoleCodeSnapshot: string,
    input: CreateEventInput
  ) {
    const repository = await getRepository();
    return repository.createEvent(actorUserPublicId, actorRoleCodeSnapshot, input);
  },

  async listInvoices() {
    const repository = await getRepository();
    return repository.listInvoices();
  },

  async getInvoiceByPublicId(invoicePublicId: string) {
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

  async createRefund(
    actorUserPublicId: string,
    actorRoleCodeSnapshot: string,
    input: CreateRefundInput
  ) {
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

  async replaceUserRoles(
    actorUserPublicId: string,
    userPublicId: string,
    input: ReplaceUserRolesInput
  ) {
    const repository = await getRepository();
    return repository.replaceUserRoles(actorUserPublicId, userPublicId, input);
  },

  async createAdminUser(actorUserPublicId: string, input: CreateAdminUserInput) {
    const repository = await getRepository();
    return repository.createAdminUser(actorUserPublicId, input);
  },

  async resetAdminUserPassword(
    actorUserPublicId: string,
    userPublicId: string,
    input: ResetAdminUserPasswordInput
  ) {
    const repository = await getRepository();
    return repository.resetAdminUserPassword(actorUserPublicId, userPublicId, input);
  },

  async updateAdminUserAccess(
    actorUserPublicId: string,
    userPublicId: string,
    input: UpdateAdminUserAccessInput
  ) {
    const repository = await getRepository();
    return repository.updateAdminUserAccess(actorUserPublicId, userPublicId, input);
  },
};
