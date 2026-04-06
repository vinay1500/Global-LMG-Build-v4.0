import { getMysqlPool } from '../../lib/mysql.js';
import { NotificationsRepository } from './repository.js';

let repositoryPromise: Promise<NotificationsRepository> | null = null;

const getRepository = async () => {
  if (!repositoryPromise) {
    repositoryPromise = (async () => {
      const repository = new NotificationsRepository(getMysqlPool());
      await repository.initialize();
      return repository;
    })().catch((error) => {
      repositoryPromise = null;
      throw error;
    });
  }

  return repositoryPromise;
};

export const notificationsService = {
  async listForUser(userPublicId: string) {
    const repository = await getRepository();
    return repository.listForUser(userPublicId);
  },

  async markRead(userPublicId: string, notificationPublicId: string) {
    const repository = await getRepository();
    await repository.markRead(userPublicId, notificationPublicId);
  },

  async dismiss(userPublicId: string, notificationPublicId: string) {
    const repository = await getRepository();
    await repository.dismiss(userPublicId, notificationPublicId);
  },
};
