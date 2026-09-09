import {
  DependencyList,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AsyncResource, AsyncResourceOptions } from '../../types/common';
import logger from '../../utils/logger';
import getApiErrorMessage from '../../utils/getApiErrorMessage';

/**
 * Runs `fetcher` whenever `deps` change, aborting the in-flight request on
 * cleanup so a stale response can never overwrite fresher state.
 */
export const useAsyncResource = <T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: DependencyList,
  options: AsyncResourceOptions<T>,
): AsyncResource<T> => {
  const { initialData, enabled = true, errorMessage } = options;

  const [data, setData] = useState<T>(initialData);
  const [loading, setLoading] = useState<boolean>(enabled);
  const [error, setError] = useState<string | null>(null);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const initialDataRef = useRef(initialData);
  const controllerRef = useRef<AbortController | null>(null);

  const run = useCallback(async (): Promise<void> => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const result = await fetcherRef.current(controller.signal);
      if (controller.signal.aborted) return;
      setData(result);
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      logger.error(errorMessage ?? 'Failed to load data:', err);
      setData(initialDataRef.current);
      setError(getApiErrorMessage(err, errorMessage ?? 'Failed to load data'));
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [errorMessage]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    run();
    return () => controllerRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  return { data, setData, loading, error, setError, refetch: run };
};

export default useAsyncResource;
