import { createVexelClient } from '@vexel/contracts';

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
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
