'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminCard } from '@/components/admin/AdminCard';
import { DataTableShell } from '@/components/admin/DataTableShell';
import { NoticeBanner } from '@/components/admin/NoticeBanner';
import { PageHeader } from '@/components/admin/PageHeader';
import { StatusPill } from '@/components/admin/StatusPill';
import { adminRoutes } from '@/lib/admin/routes';
import { parseApiError } from '@/lib/api-errors';
import { client } from '@/lib/sdk/client';
import { adminKeys } from '@/lib/sdk/hooks';
import type { components, paths } from '@vexel/contracts';

type CatalogTest =
  paths['/catalog/tests/{testId}']['get']['responses'][200]['content']['application/json'];
type ListCatalogParametersResponse =
  paths['/catalog/parameters']['get']['responses'][200]['content']['application/json'];
type ListMappingResponse =
  paths['/catalog/tests/{testId}/mapping']['get']['responses'][200]['content']['application/json'];
type ListRefRangesResponse =
  paths['/catalog/parameters/{parameterId}/reference-ranges']['get']['responses'][200]['content']['application/json'];
type ListAnnotationsResponse =
  paths['/catalog/annotations']['get']['responses'][200]['content']['application/json'];

type AddCatalogTestMappingRequest =
  paths['/catalog/tests/{testId}/mapping']['post']['requestBody']['content']['application/json'];
type CreateCatalogReferenceRangeRequest =
  paths['/catalog/parameters/{parameterId}/reference-ranges']['post']['requestBody']['content']['application/json'];
type CreateCatalogAnnotationRequest =
  paths['/catalog/annotations']['post']['requestBody']['content']['application/json'];

type AnnotationType = components['schemas']['AnnotationType'];
type AnnotationPlacement = components['schemas']['AnnotationPlacement'];

const TABS = ['Parameters', 'Reference Ranges', 'Layout', 'Annotations', 'Audit'] as const;

const annotationTypeOptions: AnnotationType[] = [
  'limitation',
  'interpretation',
  'clinical_significance',
  'method',
  'comment',
];

const annotationPlacementOptions: AnnotationPlacement[] = [
  'before_results',
  'after_results',
  'footer',
  'impression_area',
];

export default function CatalogTestDetailPage() {
  const params = useParams<{ testId: string }>();
  const testId = typeof params.testId === 'string' ? params.testId : '';
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>('Parameters');
  const [selectedParameterId, setSelectedParameterId] = useState<string>('');
  const [selectedAddParameterId, setSelectedAddParameterId] = useState<string>('');

  const [mappingForm, setMappingForm] = useState<AddCatalogTestMappingRequest>({
    parameterId: '',
    required: true,
    visibility: 'normal',
    readOnly: false,
    printFlag: true,
  });

  const [rangeForm, setRangeForm] = useState<CreateCatalogReferenceRangeRequest>({
    sex: 'Any',
    priority: 10,
  });

  const [annotationForm, setAnnotationForm] = useState<CreateCatalogAnnotationRequest>({
    testId,
    annotationType: 'comment',
    placement: 'after_results',
    text: '',
    displayOrder: 10,
  });

  const { data: testData, error: testError } = useQuery({
    queryKey: adminKeys.catalogTest(testId),
    enabled: testId.length > 0,
    queryFn: async () => {
      const { data, error } = await client.GET('/catalog/tests/{testId}', {
        params: { path: { testId } },
      });
      if (error) throw new Error(parseApiError(error, 'Failed to load test').message);
      return data as CatalogTest;
    },
  });

  const { data: parametersData } = useQuery({
    queryKey: adminKeys.catalogParameters(),
    queryFn: async () => {
      const { data, error } = await client.GET('/catalog/parameters');
      if (error) throw new Error(parseApiError(error, 'Failed to load parameters').message);
      return data as ListCatalogParametersResponse;
    },
  });

  const { data: mappingData, error: mappingError } = useQuery({
    queryKey: adminKeys.catalogTestMapping(testId),
    enabled: testId.length > 0,
    queryFn: async () => {
      const { data, error } = await client.GET('/catalog/tests/{testId}/mapping', {
        params: { path: { testId } },
      });
      if (error) throw new Error(parseApiError(error, 'Failed to load mapping').message);
      return data as ListMappingResponse;
    },
  });

  const { data: refRangesData, error: refRangesError } = useQuery({
    queryKey: [...adminKeys.catalogParameter(selectedParameterId), 'reference-ranges'],
    enabled: activeTab === 'Reference Ranges' && selectedParameterId.length > 0,
    queryFn: async () => {
      const { data, error } = await client.GET('/catalog/parameters/{parameterId}/reference-ranges', {
        params: { path: { parameterId: selectedParameterId } },
      });
      if (error) throw new Error(parseApiError(error, 'Failed to load reference ranges').message);
      return data as ListRefRangesResponse;
    },
  });

  const { data: annotationsData, error: annotationsError } = useQuery({
    queryKey: adminKeys.catalogAnnotations(testId, undefined),
    enabled: testId.length > 0 && activeTab === 'Annotations',
    queryFn: async () => {
      const { data, error } = await client.GET('/catalog/annotations', {
        params: { query: { testId } },
      });
      if (error) throw new Error(parseApiError(error, 'Failed to load annotations').message);
      return data as ListAnnotationsResponse;
    },
  });

  const invalidateTabData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: adminKeys.catalogTestMapping(testId) }),
      queryClient.invalidateQueries({ queryKey: adminKeys.catalogAnnotations(testId, undefined) }),
      queryClient.invalidateQueries({ queryKey: [...adminKeys.catalogParameter(selectedParameterId), 'reference-ranges'] }),
    ]);
  };

  const addMapping = useMutation({
    mutationFn: async () => {
      const { data, error } = await client.POST('/catalog/tests/{testId}/mapping', {
        params: { path: { testId } },
        body: {
          ...mappingForm,
          parameterId: selectedAddParameterId,
        },
      });
      if (error) throw new Error(parseApiError(error, 'Failed to add parameter mapping').message);
      return data;
    },
    onSuccess: async () => {
      setSelectedAddParameterId('');
      await invalidateTabData();
    },
  });

  const removeMapping = useMutation({
    mutationFn: async (mappingId: string) => {
      const { error } = await client.DELETE('/catalog/tests/{testId}/mapping/{mappingId}', {
        params: { path: { testId, mappingId } },
      });
      if (error) throw new Error(parseApiError(error, 'Failed to remove mapping').message);
    },
    onSuccess: invalidateTabData,
  });

  const toggleRequired = useMutation({
    mutationFn: async (input: { mappingId: string; nextRequired: boolean }) => {
      const { data, error } = await client.PATCH('/catalog/tests/{testId}/mapping/{mappingId}', {
        params: { path: { testId, mappingId: input.mappingId } },
        body: { required: input.nextRequired },
      });
      if (error) throw new Error(parseApiError(error, 'Failed to update mapping').message);
      return data;
    },
    onSuccess: invalidateTabData,
  });

  const createRange = useMutation({
    mutationFn: async () => {
      const { data, error } = await client.POST('/catalog/parameters/{parameterId}/reference-ranges', {
        params: { path: { parameterId: selectedParameterId } },
        body: rangeForm,
      });
      if (error) throw new Error(parseApiError(error, 'Failed to create reference range').message);
      return data;
    },
    onSuccess: async () => {
      setRangeForm({ sex: 'Any', priority: 10 });
      await invalidateTabData();
    },
  });

  const deleteRange = useMutation({
    mutationFn: async (rangeId: string) => {
      const { error } = await client.DELETE('/catalog/parameters/{parameterId}/reference-ranges/{rangeId}', {
        params: { path: { parameterId: selectedParameterId, rangeId } },
      });
      if (error) throw new Error(parseApiError(error, 'Failed to delete reference range').message);
    },
    onSuccess: invalidateTabData,
  });

  const createAnnotation = useMutation({
    mutationFn: async () => {
      const { data, error } = await client.POST('/catalog/annotations', {
        body: {
          ...annotationForm,
          testId,
          text: annotationForm.text.trim(),
        },
      });
      if (error) throw new Error(parseApiError(error, 'Failed to create annotation').message);
      return data;
    },
    onSuccess: async () => {
      setAnnotationForm((prev) => ({ ...prev, text: '' }));
      await invalidateTabData();
    },
  });

  const deleteAnnotation = useMutation({
    mutationFn: async (annotationId: string) => {
      const { error } = await client.DELETE('/catalog/annotations/{annotationId}', {
        params: { path: { annotationId } },
      });
      if (error) throw new Error(parseApiError(error, 'Failed to delete annotation').message);
    },
    onSuccess: invalidateTabData,
  });

  const runAudit = useMutation({
    mutationFn: async () => {
      const { data, error } = await client.POST('/catalog/audit', {
        body: { version: 'draft', section: testData?.section ?? undefined },
      });
      if (error) throw new Error(parseApiError(error, 'Audit failed').message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.catalogAudits() });
    },
  });

  const mappings = mappingData?.data ?? [];
  const refRanges = refRangesData?.data ?? [];
  const annotations = annotationsData?.data ?? [];

  const mappedParameterIds = new Set(mappings.map((item) => item.parameterId));
  const unmappedParameters = (parametersData?.data ?? []).filter((item) => !mappedParameterIds.has(item.id));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Test Detail"
        subtitle={testData?.testName ?? testId}
        actions={
          <Link
            href={adminRoutes.catalogTests}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--text)]"
          >
            Back to list
          </Link>
        }
      />

      {testError ? (
        <NoticeBanner title="Unable to load test" tone="warning">
          {testError instanceof Error ? testError.message : 'Unknown error'}
        </NoticeBanner>
      ) : null}

      {mappingError ? (
        <NoticeBanner title="Unable to load mapping" tone="warning">
          {mappingError instanceof Error ? mappingError.message : 'Unknown error'}
        </NoticeBanner>
      ) : null}

      {refRangesError ? (
        <NoticeBanner title="Unable to load reference ranges" tone="warning">
          {refRangesError instanceof Error ? refRangesError.message : 'Unknown error'}
        </NoticeBanner>
      ) : null}

      {annotationsError ? (
        <NoticeBanner title="Unable to load annotations" tone="warning">
          {annotationsError instanceof Error ? annotationsError.message : 'Unknown error'}
        </NoticeBanner>
      ) : null}

      {addMapping.error || removeMapping.error || toggleRequired.error || createRange.error || deleteRange.error || createAnnotation.error || deleteAnnotation.error ? (
        <NoticeBanner title="Update failed" tone="warning">
          {(
            addMapping.error ??
            removeMapping.error ??
            toggleRequired.error ??
            createRange.error ??
            deleteRange.error ??
            createAnnotation.error ??
            deleteAnnotation.error
          ) instanceof Error
            ? (
                addMapping.error ??
                removeMapping.error ??
                toggleRequired.error ??
                createRange.error ??
                deleteRange.error ??
                createAnnotation.error ??
                deleteAnnotation.error
              )?.message
            : 'Unknown error'}
        </NoticeBanner>
      ) : null}

      {testData ? (
        <AdminCard title="Summary">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3">
              <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Code</p>
              <p className="mt-1 text-sm font-medium">{testData.testCode}</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3">
              <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Name</p>
              <p className="mt-1 text-sm font-medium">{testData.testName}</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3">
              <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Section</p>
              <p className="mt-1 text-sm font-medium">{testData.section ?? '—'}</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3">
              <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Layout / Status</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-sm">{testData.layoutKey}</span>
                <StatusPill status={testData.status === 'active' ? 'active' : 'inactive'} />
              </div>
            </div>
          </div>
        </AdminCard>
      ) : null}

      <AdminCard title="Tabs">
        <div className="flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-xl border px-3 py-2 text-sm ${
                activeTab === tab
                  ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)]'
                  : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text)]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </AdminCard>

      {activeTab === 'Parameters' ? (
        <>
          <AdminCard title="Add parameter mapping">
            <form
              onSubmit={(event: FormEvent) => {
                event.preventDefault();
                if (!selectedAddParameterId) return;
                addMapping.mutate();
              }}
              className="grid grid-cols-1 gap-3 md:grid-cols-4"
            >
              <select
                value={selectedAddParameterId}
                onChange={(event) => setSelectedAddParameterId(event.target.value)}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm md:col-span-2"
              >
                <option value="">Select parameter</option>
                {unmappedParameters.map((parameter) => (
                  <option key={parameter.id} value={parameter.id}>
                    {parameter.parameterCode} · {parameter.parameterName}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={mappingForm.required ?? false}
                  onChange={(event) =>
                    setMappingForm((prev) => ({ ...prev, required: event.target.checked }))
                  }
                />
                Required
              </label>
              <button
                type="submit"
                disabled={addMapping.isPending || !selectedAddParameterId}
                className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] disabled:opacity-60"
              >
                {addMapping.isPending ? 'Adding...' : 'Add mapping'}
              </button>
            </form>
          </AdminCard>

          <DataTableShell
            title="Parameter mapping"
            subtitle="GET /catalog/tests/{testId}/mapping"
            isEmpty={mappings.length === 0}
            emptyTitle="No parameters mapped"
            emptyDescription="Add parameters from the form above."
          >
            <table className="min-w-full text-sm">
              <thead className="bg-[var(--bg)] text-left text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Order</th>
                  <th className="px-4 py-3 font-medium">Parameter</th>
                  <th className="px-4 py-3 font-medium">Required</th>
                  <th className="px-4 py-3 font-medium">Visibility</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {mappings.map((mapping) => (
                  <tr key={mapping.id} className="border-t border-[var(--border)]">
                    <td className="px-4 py-3">{mapping.displayOrder}</td>
                    <td className="px-4 py-3">{mapping.parameter?.parameterName ?? mapping.parameterId}</td>
                    <td className="px-4 py-3">{mapping.required ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-3">{mapping.visibility}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            toggleRequired.mutate({
                              mappingId: mapping.id,
                              nextRequired: !mapping.required,
                            })
                          }
                          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs"
                        >
                          Toggle required
                        </button>
                        <button
                          type="button"
                          onClick={() => removeMapping.mutate(mapping.id)}
                          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs"
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DataTableShell>
        </>
      ) : null}

      {activeTab === 'Reference Ranges' ? (
        <>
          <AdminCard title="Reference ranges" subtitle="Select mapped parameter and manage ranges.">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <select
                value={selectedParameterId}
                onChange={(event) => setSelectedParameterId(event.target.value)}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
              >
                <option value="">Select parameter</option>
                {mappings.map((mapping) => (
                  <option key={mapping.id} value={mapping.parameterId}>
                    {mapping.parameter?.parameterName ?? mapping.parameterId}
                  </option>
                ))}
              </select>
              <form
                onSubmit={(event: FormEvent) => {
                  event.preventDefault();
                  if (!selectedParameterId) return;
                  createRange.mutate();
                }}
                className="grid grid-cols-2 gap-2"
              >
                <select
                  value={rangeForm.sex}
                  onChange={(event) =>
                    setRangeForm((prev) => ({ ...prev, sex: event.target.value as 'M' | 'F' | 'Any' }))
                  }
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm"
                >
                  <option value="Any">Any</option>
                  <option value="M">M</option>
                  <option value="F">F</option>
                </select>
                <input
                  type="number"
                  value={rangeForm.priority ?? 10}
                  onChange={(event) =>
                    setRangeForm((prev) => ({ ...prev, priority: Number(event.target.value) }))
                  }
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm"
                  placeholder="Priority"
                />
                <input
                  type="number"
                  value={rangeForm.refLow ?? ''}
                  onChange={(event) =>
                    setRangeForm((prev) => ({
                      ...prev,
                      refLow: event.target.value === '' ? null : Number(event.target.value),
                    }))
                  }
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm"
                  placeholder="Low"
                />
                <input
                  type="number"
                  value={rangeForm.refHigh ?? ''}
                  onChange={(event) =>
                    setRangeForm((prev) => ({
                      ...prev,
                      refHigh: event.target.value === '' ? null : Number(event.target.value),
                    }))
                  }
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm"
                  placeholder="High"
                />
                <button
                  type="submit"
                  disabled={createRange.isPending || !selectedParameterId}
                  className="col-span-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm disabled:opacity-60"
                >
                  {createRange.isPending ? 'Saving...' : 'Add range'}
                </button>
              </form>
            </div>
          </AdminCard>

          <DataTableShell
            title="Reference ranges"
            subtitle="GET /catalog/parameters/{parameterId}/reference-ranges"
            isEmpty={selectedParameterId.length > 0 && refRanges.length === 0}
            emptyTitle="No ranges"
          >
            <table className="min-w-full text-sm">
              <thead className="bg-[var(--bg)] text-left text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Sex</th>
                  <th className="px-4 py-3 font-medium">Age (days)</th>
                  <th className="px-4 py-3 font-medium">Low / High</th>
                  <th className="px-4 py-3 font-medium">Ref text</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {refRanges.map((range) => (
                  <tr key={range.id} className="border-t border-[var(--border)]">
                    <td className="px-4 py-3">{range.sex}</td>
                    <td className="px-4 py-3">{range.ageMinDays ?? '—'} - {range.ageMaxDays ?? '—'}</td>
                    <td className="px-4 py-3">{range.refLow ?? '—'} - {range.refHigh ?? '—'}</td>
                    <td className="px-4 py-3">{range.refText ?? '—'}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => deleteRange.mutate(range.id)}
                        className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DataTableShell>
        </>
      ) : null}

      {activeTab === 'Layout' && testData ? (
        <AdminCard title="Layout">
          <p className="text-sm text-[var(--muted)]">
            This test uses layout key <strong>{testData.layoutKey}</strong>. Update layout rules in
            the catalog layout endpoints.
          </p>
        </AdminCard>
      ) : null}

      {activeTab === 'Annotations' ? (
        <>
          <AdminCard title="Add annotation">
            <form
              onSubmit={(event: FormEvent) => {
                event.preventDefault();
                if (!annotationForm.text.trim()) return;
                createAnnotation.mutate();
              }}
              className="grid grid-cols-1 gap-3 md:grid-cols-4"
            >
              <select
                value={annotationForm.annotationType}
                onChange={(event) =>
                  setAnnotationForm((prev) => ({
                    ...prev,
                    annotationType: event.target.value as AnnotationType,
                  }))
                }
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
              >
                {annotationTypeOptions.map((annotationType) => (
                  <option key={annotationType} value={annotationType}>
                    {annotationType}
                  </option>
                ))}
              </select>
              <select
                value={annotationForm.placement}
                onChange={(event) =>
                  setAnnotationForm((prev) => ({
                    ...prev,
                    placement: event.target.value as AnnotationPlacement,
                  }))
                }
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
              >
                {annotationPlacementOptions.map((annotationPlacement) => (
                  <option key={annotationPlacement} value={annotationPlacement}>
                    {annotationPlacement}
                  </option>
                ))}
              </select>
              <input
                value={annotationForm.text}
                onChange={(event) => setAnnotationForm((prev) => ({ ...prev, text: event.target.value }))}
                placeholder="Annotation text"
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm md:col-span-2"
              />
              <button
                type="submit"
                disabled={createAnnotation.isPending || !annotationForm.text.trim()}
                className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] disabled:opacity-60"
              >
                {createAnnotation.isPending ? 'Adding...' : 'Add annotation'}
              </button>
            </form>
          </AdminCard>

          <DataTableShell
            title="Annotations"
            subtitle="GET /catalog/annotations?testId=..."
            isEmpty={annotations.length === 0}
            emptyTitle="No annotations"
          >
            <table className="min-w-full text-sm">
              <thead className="bg-[var(--bg)] text-left text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Placement</th>
                  <th className="px-4 py-3 font-medium">Text</th>
                  <th className="px-4 py-3 font-medium">Order</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {annotations.map((annotation) => (
                  <tr key={annotation.id} className="border-t border-[var(--border)]">
                    <td className="px-4 py-3">{annotation.annotationType}</td>
                    <td className="px-4 py-3">{annotation.placement}</td>
                    <td className="max-w-xs truncate px-4 py-3" title={annotation.text}>
                      {annotation.text}
                    </td>
                    <td className="px-4 py-3">{annotation.displayOrder}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => deleteAnnotation.mutate(annotation.id)}
                        className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DataTableShell>
        </>
      ) : null}

      {activeTab === 'Audit' ? (
        <AdminCard title="Scoped audit">
          <p className="mb-3 text-sm text-[var(--muted)]">
            Run a catalog audit scoped to this test section.
          </p>
          <button
            type="button"
            onClick={() => runAudit.mutate()}
            disabled={runAudit.isPending}
            className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] disabled:opacity-50"
          >
            {runAudit.isPending ? 'Running...' : 'Run audit'}
          </button>
          {runAudit.isError ? (
            <div className="mt-3">
              <NoticeBanner title="Audit failed" tone="warning">
                {runAudit.error instanceof Error ? runAudit.error.message : 'Unknown error'}
              </NoticeBanner>
            </div>
          ) : null}
          {runAudit.data ? (
            <p className="mt-3 text-sm text-[var(--muted)]">Audit run created: {runAudit.data.id}</p>
          ) : null}
        </AdminCard>
      ) : null}
    </div>
  );
}
