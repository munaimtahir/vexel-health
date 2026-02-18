import { client } from '@vexel/contracts';

// Configure middleware for auth/tenant headers
client.use({
    onRequest: async ({ request }) => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('vexel_token');
            // Note: Header name casing; standard is Authorization
            if (token) {
                request.headers.set('Authorization', `Bearer ${token}`);
            }

            const tenant = localStorage.getItem('vexel_tenant_id');
            if (process.env.NEXT_PUBLIC_TENANCY_DEV_HEADER === '1' && tenant) {
                request.headers.set('x-tenant-id', tenant);
            }
        }
        return request;
    },
});

export { client };
