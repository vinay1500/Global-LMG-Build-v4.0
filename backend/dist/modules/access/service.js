import { getMysqlPool } from '../../lib/mysql.js';
import { AccessRepository } from './repository.js';
let repositoryPromise = null;
const getRepository = async () => {
    if (!repositoryPromise) {
        repositoryPromise = (async () => {
            const repository = new AccessRepository(getMysqlPool());
            await repository.initialize();
            return repository;
        })().catch((error) => {
            repositoryPromise = null;
            throw error;
        });
    }
    return repositoryPromise;
};
export const accessService = {
    async getActorByPublicId(userPublicId) {
        const repository = await getRepository();
        return repository.getActorByPublicId(userPublicId);
    },
};
