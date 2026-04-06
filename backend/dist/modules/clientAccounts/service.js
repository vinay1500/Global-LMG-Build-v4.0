import { getMysqlPool } from '../../lib/mysql.js';
import { ClientAccountsRepository } from './repository.js';
let repositoryPromise = null;
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
    async getNotificationPreferences(userPublicId) {
        const repository = await getRepository();
        return repository.getNotificationPreferences(userPublicId);
    },
    async updateNotificationPreferences(userPublicId, preferences) {
        const repository = await getRepository();
        return repository.updateNotificationPreferences(userPublicId, preferences);
    },
};
