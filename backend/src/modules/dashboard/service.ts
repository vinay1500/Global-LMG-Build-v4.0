import { env } from '../../config/env.js';
import { serviceUnavailable } from '../../lib/httpErrors.js';
import { getMysqlPool } from '../../lib/mysql.js';
import { createEmptyDashboardSnapshot } from './helpers.js';
import { NormalizedDashboardRepository } from './normalizedRepository.js';
import type { DashboardRequestInput, PlatformUser } from './types.js';

const isMysqlConfigured = Boolean(
  env.MYSQL_HOST && env.MYSQL_DATABASE && env.MYSQL_USER && env.MYSQL_PASSWORD
);

let repositoryPromise: Promise<NormalizedDashboardRepository> | null = null;

const getRepository = async () => {
  if (!isMysqlConfigured) {
    throw serviceUnavailable(
      'dashboard_storage_unavailable',
      'Dashboard access requires a configured MySQL connection.'
    );
  }

  if (!repositoryPromise) {
    repositoryPromise = (async () => {
      const repository = new NormalizedDashboardRepository(getMysqlPool());
      await repository.initialize();
      return repository;
    })().catch((error) => {
      repositoryPromise = null;
      throw error;
    });
  }

  return repositoryPromise;
};

export const dashboardService = {
  async getSnapshot(currentClient: PlatformUser) {
    if (!isMysqlConfigured) {
      return createEmptyDashboardSnapshot(currentClient);
    }

    const repository = await getRepository();
    return repository.getSnapshot(currentClient);
  },

  async submitRequest(currentClient: PlatformUser, request: DashboardRequestInput) {
    const repository = await getRepository();
    return repository.submitRequest(currentClient, request);
  },

  async sendMessage(
    currentClient: PlatformUser,
    threadId: string,
    content: string,
    attachmentUploadIds: string[] = []
  ) {
    const repository = await getRepository();
    return repository.sendMessage(currentClient, threadId, content, attachmentUploadIds);
  },

  async markThreadRead(currentClient: PlatformUser, threadId: string) {
    const repository = await getRepository();
    return repository.markThreadRead(currentClient, threadId);
  },

  async selectMatterPackage(
    currentClient: PlatformUser,
    matterId: string,
    matterPackageId: string,
    proposalVersion: number
  ) {
    const repository = await getRepository();
    return repository.selectMatterPackage(
      currentClient,
      matterId,
      matterPackageId,
      proposalVersion
    );
  },

  createEmptySnapshot(currentClient: PlatformUser) {
    return createEmptyDashboardSnapshot(currentClient);
  },
};
