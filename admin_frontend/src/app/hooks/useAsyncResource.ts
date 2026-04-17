import { useCallback, useEffect, useState } from 'react';

export const useAsyncResource = <TData,>(
  loader: () => Promise<TData>,
  dependencies: readonly unknown[]
) => {
  const [data, setData] = useState<TData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const nextData = await loader();
      setData(nextData);
      setErrorMessage(null);
      return nextData;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load this workspace.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, dependencies);

  useEffect(() => {
    void refresh().catch(() => undefined);
  }, [refresh]);

  return {
    data,
    errorMessage,
    isLoading,
    refresh,
    setData,
  };
};
