import createOpenApiClient, { type Client, type ClientOptions } from 'openapi-fetch';
import type { $defs, components, operations, paths, webhooks } from './schema';

export type { $defs, components, operations, paths, webhooks };

export const createVexelClient = (options?: ClientOptions): Client<paths> =>
    createOpenApiClient<paths>(options);

export type VexelClient = ReturnType<typeof createVexelClient>;

export const client = createVexelClient({ baseUrl: 'http://localhost:3000' });
