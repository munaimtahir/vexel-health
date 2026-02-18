import { type Client, type ClientOptions } from 'openapi-fetch';
import type { $defs, components, operations, paths, webhooks } from './schema';
export type { $defs, components, operations, paths, webhooks };
export declare const createVexelClient: (options?: ClientOptions) => Client<paths>;
export type VexelClient = ReturnType<typeof createVexelClient>;
export declare const client: Client<paths, `${string}/${string}`>;
//# sourceMappingURL=index.d.ts.map