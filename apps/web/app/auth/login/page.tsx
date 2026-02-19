'use client';

import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { client } from '@/lib/api';
import { useState, useEffect } from 'react';
import { parseApiError, type FieldErrors } from '@/lib/api-errors';

type FormData = {
    email: string;
    pass: string;
    tenantId?: string;
};

export default function LoginPage() {
    const { register, handleSubmit, formState: { errors } } = useForm<FormData>();
    const router = useRouter();
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [showDevTenant, setShowDevTenant] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const isDevHeader = process.env.NEXT_PUBLIC_TENANCY_DEV_HEADER_ENABLED === '1';
            const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname.endsWith('.localhost');
            if (isDevHeader && isLocalhost) {
                setShowDevTenant(true);
            }
        }
    }, []);

    const onSubmit = async (data: FormData) => {
        setError('');
        setFieldErrors({});

        if (showDevTenant && data.tenantId) {
            localStorage.setItem('vexel_tenant_id', data.tenantId);
        }

        const { data: resData, error: apiError } = await client.POST('/auth/login', {
            body: {
                email: data.email,
                password: data.pass,
            },
        });

        if (apiError) {
            const parsed = parseApiError(apiError, 'Login failed');
            setError(parsed.message);
            setFieldErrors(parsed.fieldErrors);
            return;
        }

        if (resData && resData.accessToken) {
            localStorage.setItem('vexel_token', resData.accessToken);
            // Optional: User fetching logic could go here
            router.push('/patients');
        } else {
            // Handle case where success body doesn't contain accessToken unexpectedly
            setError('Login failed: Invalid response');
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
            <div className="w-full max-w-md p-8 bg-white rounded shadow">
                <h1 className="text-2xl font-bold mb-6">Login to Vexel</h1>
                {error && <div className="text-red-500 mb-4">{error}</div>}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        {showDevTenant && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Tenant ID (UUID) <span className="text-xs text-gray-500">(Dev Only)</span></label>
                            <input
                                {...register('tenantId')}
                                className="mt-1 block w-full border border-gray-300 rounded p-2"
                                placeholder="Enter Tenant ID"
                            />
                            {fieldErrors.tenantId?.map((message) => (
                                <span key={message} className="text-red-500 text-sm block">{message}</span>
                            ))}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <input
                            {...register('email', { required: true })}
                            type="email"
                            autoComplete="email"
                            className="mt-1 block w-full border border-gray-300 rounded p-2"
                            placeholder="user@example.com"
                        />
                        {errors.email && <span className="text-red-500 text-sm">Required</span>}
                        {fieldErrors.email?.map((message) => (
                            <span key={message} className="text-red-500 text-sm block">{message}</span>
                        ))}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Password</label>
                        <input
                            type="password"
                            autoComplete="current-password"
                            {...register('pass', { required: true })}
                            className="mt-1 block w-full border border-gray-300 rounded p-2"
                        />
                        {errors.pass && <span className="text-red-500 text-sm">Required</span>}
                        {(fieldErrors.password ?? fieldErrors.pass)?.map((message) => (
                            <span key={message} className="text-red-500 text-sm block">{message}</span>
                        ))}
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition-colors"
                    >
                        Sign In
                    </button>
                </form>
            </div>
        </div>
    );
}
