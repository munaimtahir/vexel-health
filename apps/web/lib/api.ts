import { createVexelClient } from '@vexel/contracts';

const configuredBaseUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
const isBrowser = typeof window !== 'undefined';
const isLocalBrowserHost = isBrowser
    && (window.location.hostname === 'localhost'
        || window.location.hostname === '127.0.0.1'
        || window.location.hostname.endsWith('.localhost'));
const pointsToLocalApi = configuredBaseUrl
    ? /^https?:\/\/(localhost|127(?:\.\d{1,3}){3})(:\d+)?(\/.*)?$/i.test(configuredBaseUrl)
    : false;
const usesRelativeApiPath = configuredBaseUrl?.startsWith('/') ?? false;

// Prevent public domain clients from trying to call their own localhost.
const baseUrl = pointsToLocalApi && !isLocalBrowserHost
    ? '/api'
    : (usesRelativeApiPath && isLocalBrowserHost
        ? 'http://localhost:3000'
        : (configuredBaseUrl ?? (isLocalBrowserHost ? 'http://localhost:3000' : '/api')));
const client = createVexelClient({ baseUrl });

// Configure middleware for auth/tenant headers
client.use({
    onRequest: async ({ request }) => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('vexel_token');
            if (token) {
                request.headers.set('Authorization', `Bearer ${token}`);
            }

            const tenant = localStorage.getItem('vexel_tenant_id');
            if (process.env.NEXT_PUBLIC_TENANCY_DEV_HEADER_ENABLED === '1' && tenant) {
                request.headers.set('x-tenant-id', tenant);
            }
        }
        return request;
    },
});

export { client };
