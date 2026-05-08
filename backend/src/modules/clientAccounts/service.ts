import { getMysqlPool } from '../../lib/mysql.js';
import { ClientAccountsRepository } from './repository.js';
import type { NotificationPreferences } from './types.js';

let repositoryPromise: Promise<ClientAccountsRepository> | null = null;

const getRepository = async () => {
  if (!repositoryPromise) {
    repositoryPromise = (async () => {
      const repository = new ClientAccountsRepository(getMysqlPool());
      await repository.initialize();
      return repository;
    })().catch((error) => {
      repositoryPromise = null;
      throw error;
    });
  }

  return repositoryPromise;
};

export const clientAccountsService = {
  async getNotificationPreferences(userPublicId: string) {
    const repository = await getRepository();
    return repository.getNotificationPreferences(userPublicId);
  },

  async updateNotificationPreferences(
    userPublicId: string,
    preferences: NotificationPreferences
  ) {
    const repository = await getRepository();
    return repository.updateNotificationPreferences(userPublicId, preferences);
  },

  async getAccountSettings(userPublicId: string) {
    const repository = await getRepository();
    return repository.getAccountSettings(userPublicId);
  },

  async updatePrimaryAddress(
    userPublicId: string,
    payload: {
      city: string;
      country: string;
      line1: string;
      line2?: string | null;
      postalCode: string;
      sourceCode?: 'google' | 'ip_prefill' | 'manual';
      state: string;
      googlePlaceId?: string | null;
      validationStatusCode?: 'manual' | 'unverified' | 'verified';
    }
  ) {
    const repository = await getRepository();
    return repository.updatePrimaryAddress(userPublicId, payload);
  },

  async updateDisplayName(userPublicId: string, payload: { name: string }) {
    const repository = await getRepository();
    return repository.updateDisplayName(userPublicId, payload);
  },

  async changePassword(
    userPublicId: string,
    payload: { currentPassword: string; newPassword: string }
  ) {
    const repository = await getRepository();
    return repository.changePassword(userPublicId, payload);
  },

  async requestEmailChange(userPublicId: string, email: string) {
    const repository = await getRepository();
    return repository.requestEmailChange(userPublicId, email);
  },

  async confirmEmailChange(userPublicId: string, payload: { code: string; email: string }) {
    const repository = await getRepository();
    return repository.confirmEmailChange(userPublicId, payload);
  },

  async requestPhoneChange(userPublicId: string, phone: string) {
    const repository = await getRepository();
    return repository.requestPhoneChange(userPublicId, phone);
  },

  async confirmPhoneChange(userPublicId: string, payload: { code: string; phone: string }) {
    const repository = await getRepository();
    return repository.confirmPhoneChange(userPublicId, payload);
  },
};
