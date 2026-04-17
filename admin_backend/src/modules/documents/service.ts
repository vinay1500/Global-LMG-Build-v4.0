import { fetchDocuments } from '../shared.js';

export const listDocuments = async () => {
  return {
    documents: await fetchDocuments({}),
  };
};
