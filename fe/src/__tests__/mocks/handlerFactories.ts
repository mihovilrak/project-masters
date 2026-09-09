import {
  http,
  HttpResponse,
  delay as mswDelay,
  JsonBodyType,
  RequestHandler,
} from 'msw';

/**
 * Factory functions for creating MSW handlers
 */

export interface HandlerConfig {
  url: string;
  data?: JsonBodyType;
  status?: number;
  delay?: number;
}

const maybeDelay = async (ms?: number): Promise<void> => {
  if (ms) await mswDelay(ms);
};

/**
 * Create a GET handler
 */
export const createGetHandler = (
  url: string,
  data: JsonBodyType,
  status: number = 200,
  delay?: number,
): RequestHandler =>
  http.get(url, async () => {
    await maybeDelay(delay);
    return HttpResponse.json(data, { status });
  });

/**
 * Create a POST handler
 */
export const createPostHandler = (
  url: string,
  responseData: JsonBodyType,
  status: number = 200,
  delay?: number,
): RequestHandler =>
  http.post(url, async () => {
    await maybeDelay(delay);
    return HttpResponse.json(responseData, { status });
  });

/**
 * Create a PUT handler
 */
export const createPutHandler = (
  url: string,
  responseData: JsonBodyType,
  status: number = 200,
  delay?: number,
): RequestHandler =>
  http.put(url, async () => {
    await maybeDelay(delay);
    return HttpResponse.json(responseData, { status });
  });

/**
 * Create a PATCH handler
 */
export const createPatchHandler = (
  url: string,
  responseData: JsonBodyType,
  status: number = 200,
  delay?: number,
): RequestHandler =>
  http.patch(url, async () => {
    await maybeDelay(delay);
    return HttpResponse.json(responseData, { status });
  });

/**
 * Create a DELETE handler
 */
export const createDeleteHandler = (
  url: string,
  status: number = 200,
  delay?: number,
): RequestHandler =>
  http.delete(url, async () => {
    await maybeDelay(delay);
    return HttpResponse.json({}, { status });
  });

/**
 * Create an error handler
 */
export const createErrorHandler = (
  url: string,
  status: number,
  error: string | { error: string },
  delay?: number,
): RequestHandler =>
  http.all(url, async () => {
    await maybeDelay(delay);
    const errorMessage = typeof error === 'string' ? error : error.error;
    return HttpResponse.json({ error: errorMessage }, { status });
  });

/**
 * Create a network error handler (simulates network failure)
 */
export const createNetworkErrorHandler = (url: string): RequestHandler =>
  http.all(url, () => HttpResponse.error());
