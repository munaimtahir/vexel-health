'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminCard } from '@/components/admin/AdminCard';
import { DataTableShell } from '@/components/admin/DataTableShell';
import { NoticeBanner } from '@/components/admin/NoticeBanner';
import { PageHeader } from '@/components/admin/PageHeader';
import { parseApiError } from '@/lib/api-errors';
import { client } from '@/lib/sdk/client';
import { adminKeys } from '@/lib/sdk/hooks';
import type { components, paths } from '@vexel/contracts';

type ListCatalogTestsResponse = paths['/catalog/tests']['get']['responses'][200]['content']['application/json'];
type ListCatalogParametersResponse =
  paths['/catalog/parameters']['get']['responses'][200]['content']['application/json'];
type ListCatalogTestMappingResponse =
  paths['/catalog/tests/{testId}/mapping']['get']['responses'][200]['content']['application/json'];
type ListCatalogReferenceRangesResponse =
  paths['/catalog/parameters/{parameterId}/reference-ranges']['get']['responses'][200]['content']['application/json'];
type ListCatalogAnnotationsResponse =
  paths['/catalog/annotations']['get']['responses'][200]['content']['application/json'];

type AddCatalogTestMappingRequest =
  paths['/catalog/tests/{testId}/mapping']['post']['requestBody']['content']['application/json'];
type CreateCatalogReferenceRangeRequest =
  paths['/catalog/parameters/{parameterId}/reference-ranges']['post']['requestBody']['content']['application/json'];
type CreateCatalogAnnotationRequest =
  paths['/catalog/annotations']['post']['requestBody']['content']['application/json'];

type AnnotationType = components['schemas']['AnnotationType'];
type AnnotationPlacement = components['schemas']['AnnotationPlacement'];
type AnnotationVisibilityRule = components['schemas']['AnnotationVisibilityRule'];

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

const visibilityOptions: AnnotationVisibilityRule[] = ['always', 'conditional'];

export default function CatalogLinkingPage() {
  const queryClient = useQueryClient();
  const [selectedTestId, setSelectedTestId] = useState('');
  const [selectedParameterId, setSelectedParameterId] = useState('');
  const [selectedAvailableParameter, setSelectedAvailableParameter] = useState('');

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
    testId: '',
    annotationType: 'comment',
    placement: 'after_results',
    text: '',
    visibilityRule: 'always',
    displayOrder: 10,
  });

  const { data: testsData, error: testsError } = useQuery({
    queryKey: adminKeys.catalogTests(),
    queryFn: async () => {
      const { data, error } = await client.GET('/catalog/tests');
      if (error) throw new Error(parseApiError(error, 'Failed to load tests').message);
      return data as ListCatalogTestsResponse;
    },
  });

  const { data: parametersData, error: parametersError } = useQuery({
    queryKey: adminKeys.catalogParameters(),
    queryFn: async () => {
      const { data, error } = await client.GET('/catalog/parameters');
      if (error) throw new Error(parseApiError(error, 'Failed to load parameters').message);
      return data as ListCatalogParametersResponse;
    },
  });

  useEffect(() => {
    if (!selectedTestId && testsData?.data?.[0]?.id) {
      setSelectedTestId(testsData.data[0].id);
      setAnnotationForm((prev) => ({ ...prev, testId: testsData.data[0].id }));
    }
  }, [selectedTestId, testsData]);

  const { data: mappingData, error: mappingError } = useQuery({
    queryKey: adminKeys.catalogTestMapping(selectedTestId),
    enabled: selectedTestId.length > 0,
    queryFn: async () => {
      const { data, error } = await client.GET('/catalog/tests/{testId}/mapping', {
        params: { path: { testId: selectedTestId } },
      });
      if (error) throw new Error(parseApiError(error, 'Failed to load mapping').message);
      return data as ListCatalogTestMappingResponse;
    },
  });

  const { data: rangeData, error: rangesError } = useQuery({
    queryKey: [...adminKeys.catalogParameter(selectedParameterId), 'reference-ranges'],
    enabled: selectedParameterId.length > 0,
    queryFn: async () => {
      const { data, error } = await client.GET('/catalog/parameters/{parameterId}/reference-ranges', {
        params: { path: { parameterId: selectedParameterId } },
      });
      if (error) throw new Error(parseApiError(error, 'Failed to load reference ranges').message);
      return data as ListCatalogReferenceRangesResponse;
    },
  });

  const { data: annotationData, error: annotationsError } = useQuery({
    queryKey: adminKeys.catalogAnnotations(selectedTestId, undefined),
    enabled: selectedTestId.length > 0,
    queryFn: async () => {
      const { data, error } = await client.GET('/catalog/annotations', {
        params: { query: { testId: selectedTestId } },
      });
      if (error) throw new Error(parseApiError(error, 'Failed to load annotations').message);
      return data as ListCatalogAnnotationsResponse;
    },
  });

  const invalidateCurrent = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: adminKeys.catalogTestMapping(selectedTestId) }),
      queryClient.invalidateQueries({ queryKey: adminKeys.catalogAnnotations(selectedTestId, undefined) }),
      queryClient.invalidateQueries({ queryKey: [...adminKeys.catalogParameter(selectedParameterId), 'reference-ranges'] }),
    ]);
  };

  const addMappingMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await client.POST('/catalog/tests/{testId}/mapping', {
        params: { path: { testId: selectedTestId } },
        body: {
          ...mappingForm,
          parameterId: selectedAvailableParameter,
        },
      });
      if (error) throw new Error(parseApiError(error, 'Failed to add mapping').message);
      return data;
    },
    onSuccess: async () => {
      setSelectedAvailableParameter('');
      await invalidateCurrent();
    },
  });

  const removeMappingMutation = useMutation({
    mutationFn: async (mappingId: string) => {
      const { error } = await client.DELETE('/catalog/tests/{testId}/mapping/{mappingId}', {
        params: { path: { testId: selectedTestId, mappingId } },
      });
      if (error) throw new Error(parseApiError(error, 'Failed to remove mapping').message);
    },
    onSuccess: invalidateCurrent,
  });

  const updateMappingMutation = useMutation({
    mutationFn: async (input: {
      mappingId: string;
      body: NonNullable<
        paths['/catalog/tests/{testId}/mapping/{mappingId}']['patch']['requestBody']
      >['content']['application/json'];
    }) => {
      const { data, error } = await client.PATCH('/catalog/tests/{testId}/mapping/{mappingId}', {
        params: { path: { testId: selectedTestId, mappingId: input.mappingId } },
        body: input.body,
      });
      if (error) throw new Error(parseApiError(error, 'Failed to update mapping').message);
      return data;
    },
    onSuccess: invalidateCurrent,
  });

  const reorderMutation = useMutation({
    mutationFn: async () => {
      const mapped = (mappingData?.data ?? []).slice().sort((a, b) => a.displayOrder - b.displayOrder);
      const { data, error } = await client.POST('/catalog/tests/{testId}/mapping/reorder', {
        params: { path: { testId: selectedTestId } },
        body: {
          parameterIds: mapped.map((item) => item.parameterId),
        },
      });
      if (error) throw new Error(parseApiError(error, 'Failed to reorder mapping').message);
      return data;
    },
    onSuccess: invalidateCurrent,
  });

  const createRangeMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await client.POST('/catalog/parameters/{parameterId}/reference-ranges', {
        params: { path: { parameterId: selectedParameterId } },
        body: {
          ...rangeForm,
          refText: rangeForm.refText?.trim() || undefined,
          notes: rangeForm.notes?.trim() || undefined,
        },
      });
      if (error) throw new Error(parseApiError(error, 'Failed to create range').message);
      return data;
    },
    onSuccess: async () => {
      setRangeForm({ sex: 'Any', priority: 10 });
      await invalidateCurrent();
    },
  });

  const deleteRangeMutation = useMutation({
    mutationFn: async (rangeId: string) => {
      const { error } = await client.DELETE('/catalog/parameters/{parameterId}/reference-ranges/{rangeId}', {
        params: { path: { parameterId: selectedParameterId, rangeId } },
      });
      if (error) throw new Error(parseApiError(error, 'Failed to delete range').message);
    },
    onSuccess: invalidateCurrent,
  });

  const createAnnotationMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await client.POST('/catalog/annotations', {
        body: {
          ...annotationForm,
          testId: selectedTestId,
          text: annotationForm.text.trim(),
          conditionSpec: annotationForm.conditionSpec?.trim() || undefined,
        },
      });
      if (error) throw new Error(parseApiError(error, 'Failed to create annotation').message);
      return data;
    },
    onSuccess: async () => {
      setAnnotationForm((prev) => ({ ...prev, text: '', conditionSpec: undefined }));
      await invalidateCurrent();
    },
  });

  const deleteAnnotationMutation = useMutation({
    mutationFn: async (annotationId: string) => {
      const { error } = await client.DELETE('/catalog/annotations/{annotationId}', {
        params: { path: { annotationId } },
      });
      if (error) throw new Error(parseApiError(error, 'Failed to delete annotation').message);
    },
    onSuccess: invalidateCurrent,
  });

  const mappingRows = mappingData?.data ?? [];
  const rangeRows = rangeData?.data ?? [];
  const annotationRows = annotationData?.data ?? [];

  const mappedParameterIds = new Set(mappingRows.map((item) => item.parameterId));
  const unmappedParameters = (parametersData?.data ?? []).filter((param) => !mappedParameterIds.has(param.id));

  useEffect(() => {
    if (!selectedAvailableParameter && unmappedParameters[0]?.id) {
      setSelectedAvailableParameter(unmappedParameters[0].id);
    }
  }, [selectedAvailableParameter, unmappedParameters]);

  const selectedTestName = useMemo(
    () => (testsData?.data ?? []).find((test) => test.id === selectedTestId)?.testName,
    [selectedTestId, testsData],
  );

  const selectedParameterName = useMemo(
    () => (parametersData?.data ?? []).find((p) => p.id === selectedParameterId)?.parameterName,
    [selectedParameterId, parametersData],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Linking Workflow"
        subtitle="Map test-parameter links, manage reference ranges, and maintain annotation rules."
      />

      {testsError ? (
        <NoticeBanner title="Unable to load tests" tone="warning">
          {testsError instanceof Error ? testsError.message : 'Unknown error'}
        </NoticeBanner>
      ) : null}

      {parametersError ? (
        <NoticeBanner title="Unable to load parameters" tone="warning">
          {parametersError instanceof Error ? parametersError.message : 'Unknown error'}
        </NoticeBanner>
      ) : null}

      {mappingError ? (
        <NoticeBanner title="Unable to load mappings" tone="warning">
          {mappingError instanceof Error ? mappingError.message : 'Unknown error'}
        </NoticeBanner>
      ) : null}

      {rangesError ? (
        <NoticeBanner title="Unable to load ranges" tone="warning">
          {rangesError instanceof Error ? rangesError.message : 'Unknown error'}
        </NoticeBanner>
      ) : null}

      {annotationsError ? (
        <NoticeBanner title="Unable to load annotations" tone="warning">
          {annotationsError instanceof Error ? annotationsError.message : 'Unknown error'}
        </NoticeBanner>
      ) : null}

      {addMappingMutation.error || removeMappingMutation.error || updateMappingMutation.error || reorderMutation.error ? (
        <NoticeBanner title="Mapping operation failed" tone="warning">
          {(
            addMappingMutation.error ??
            removeMappingMutation.error ??
            updateMappingMutation.error ??
            reorderMutation.error
          ) instanceof Error
            ? (
                addMappingMutation.error ??
                removeMappingMutation.error ??
                updateMappingMutation.error ??
                reorderMutation.error
              )?.message
            : 'Unknown error'}
        </NoticeBanner>
      ) : null}

      {createRangeMutation.error || deleteRangeMutation.error ? (
        <NoticeBanner title="Reference range operation failed" tone="warning">
          {(createRangeMutation.error ?? deleteRangeMutation.error) instanceof Error
            ? (createRangeMutation.error ?? deleteRangeMutation.error)?.message
            : 'Unknown error'}
        </NoticeBanner>
      ) : null}

      {createAnnotationMutation.error || deleteAnnotationMutation.error ? (
        <NoticeBanner title="Annotation operation failed" tone="warning">
          {(createAnnotationMutation.error ?? deleteAnnotationMutation.error) instanceof Error
            ? (createAnnotationMutation.error ?? deleteAnnotationMutation.error)?.message
            : 'Unknown error'}
        </NoticeBanner>
      ) : null}

      <AdminCard title="Working Context">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm font-medium text-[var(--muted)]">Test</span>
            <select
              value={selectedTestId}
              onChange={(event) => {
                setSelectedTestId(event.target.value);
                setAnnotationForm((prev) => ({ ...prev, testId: event.target.value }));
              }}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
            >
              {(testsData?.data ?? []).map((test) => (
                <option key={test.id} value={test.id}>
                  {test.testCode} · {test.testName}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-[var(--muted)]">Parameter (for ranges)</span>
            <select
              value={selectedParameterId}
              onChange={(event) => setSelectedParameterId(event.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
            >
              <option value="">Select parameter</option>
              {mappingRows.map((mapping) => (
                <option key={mapping.id} value={mapping.parameterId}>
                  {mapping.parameter?.parameterName ?? mapping.parameterId}
                </option>
              ))}
            </select>
          </label>
        </div>
      </AdminCard>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <AdminCard title="Add Test Parameter Link" subtitle={`Test: ${selectedTestName ?? '—'}`}>
          <form
            onSubmit={(event: FormEvent) => {
              event.preventDefault();
              if (!selectedAvailableParameter || !selectedTestId) return;
              addMappingMutation.mutate();
            }}
            className="space-y-3"
          >
            <select
              value={selectedAvailableParameter}
              onChange={(event) => setSelectedAvailableParameter(event.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
            >
              {unmappedParameters.length === 0 ? <option value="">No unmapped parameters</option> : null}
              {unmappedParameters.map((parameter) => (
                <option key={parameter.id} value={parameter.id}>
                  {parameter.parameterCode} · {parameter.parameterName}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-3">
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
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={mappingForm.printFlag ?? true}
                  onChange={(event) =>
                    setMappingForm((prev) => ({ ...prev, printFlag: event.target.checked }))
                  }
                />
                Print
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={mappingForm.readOnly ?? false}
                  onChange={(event) =>
                    setMappingForm((prev) => ({ ...prev, readOnly: event.target.checked }))
                  }
                />
                Read only
              </label>
              <select
                value={mappingForm.visibility ?? 'normal'}
                onChange={(event) =>
                  setMappingForm((prev) => ({
                    ...prev,
                    visibility: event.target.value as 'normal' | 'optional' | 'hidden',
                  }))
                }
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm"
              >
                <option value="normal">normal</option>
                <option value="optional">optional</option>
                <option value="hidden">hidden</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={addMappingMutation.isPending || !selectedAvailableParameter || !selectedTestId}
              className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] disabled:opacity-60"
            >
              {addMappingMutation.isPending ? 'Adding...' : 'Add link'}
            </button>
          </form>
        </AdminCard>

        <AdminCard title="Reference Range" subtitle={`Parameter: ${selectedParameterName ?? '—'}`}>
          <form
            onSubmit={(event: FormEvent) => {
              event.preventDefault();
              if (!selectedParameterId) return;
              createRangeMutation.mutate();
            }}
            className="grid grid-cols-2 gap-3"
          >
            <select
              value={rangeForm.sex}
              onChange={(event) =>
                setRangeForm((prev) => ({ ...prev, sex: event.target.value as 'M' | 'F' | 'Any' }))
              }
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
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
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
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
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
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
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
              placeholder="High"
            />
            <input
              type="text"
              value={rangeForm.refText ?? ''}
              onChange={(event) => setRangeForm((prev) => ({ ...prev, refText: event.target.value }))}
              className="col-span-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
              placeholder="Reference text (optional)"
            />
            <button
              type="submit"
              disabled={createRangeMutation.isPending || !selectedParameterId}
              className="col-span-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium disabled:opacity-60"
            >
              {createRangeMutation.isPending ? 'Saving...' : 'Add range'}
            </button>
          </form>
        </AdminCard>
      </div>

      <DataTableShell
        title="Mapped Parameters"
        subtitle="GET /catalog/tests/{testId}/mapping"
        isEmpty={mappingRows.length === 0}
        emptyTitle="No mappings"
        emptyDescription="Add at least one parameter link."
        toolbar={
          <button
            type="button"
            onClick={() => reorderMutation.mutate()}
            disabled={reorderMutation.isPending || mappingRows.length === 0}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm disabled:opacity-60"
          >
            {reorderMutation.isPending ? 'Normalizing...' : 'Normalize order'}
          </button>
        }
      >
        <table className="min-w-full text-sm">
          <thead className="bg-[var(--bg)] text-left text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Order</th>
              <th className="px-4 py-3 font-medium">Parameter</th>
              <th className="px-4 py-3 font-medium">Visibility</th>
              <th className="px-4 py-3 font-medium">Required</th>
              <th className="px-4 py-3 font-medium">Print</th>
              <th className="px-4 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {mappingRows.map((mapping) => (
              <tr key={mapping.id} className="border-t border-[var(--border)]">
                <td className="px-4 py-3">{mapping.displayOrder}</td>
                <td className="px-4 py-3">{mapping.parameter?.parameterName ?? mapping.parameterId}</td>
                <td className="px-4 py-3">{mapping.visibility}</td>
                <td className="px-4 py-3">{mapping.required ? 'Yes' : 'No'}</td>
                <td className="px-4 py-3">{mapping.printFlag ? 'Yes' : 'No'}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        updateMappingMutation.mutate({
                          mappingId: mapping.id,
                          body: { required: !mapping.required },
                        })
                      }
                      className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs"
                    >
                      Toggle required
                    </button>
                    <button
                      type="button"
                      onClick={() => removeMappingMutation.mutate(mapping.id)}
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

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <DataTableShell
          title="Reference Ranges"
          subtitle="GET /catalog/parameters/{parameterId}/reference-ranges"
          isEmpty={selectedParameterId.length > 0 && rangeRows.length === 0}
          emptyTitle="No ranges"
          emptyDescription="Add a reference range for the selected parameter."
        >
          <table className="min-w-full text-sm">
            <thead className="bg-[var(--bg)] text-left text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Sex</th>
                <th className="px-4 py-3 font-medium">Range</th>
                <th className="px-4 py-3 font-medium">Text</th>
                <th className="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {rangeRows.map((range) => (
                <tr key={range.id} className="border-t border-[var(--border)]">
                  <td className="px-4 py-3">{range.sex}</td>
                  <td className="px-4 py-3">
                    {range.refLow ?? '—'} - {range.refHigh ?? '—'}
                  </td>
                  <td className="px-4 py-3">{range.refText ?? '—'}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => deleteRangeMutation.mutate(range.id)}
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

        <AdminCard title="Add Annotation" subtitle="POST /catalog/annotations">
          <form
            onSubmit={(event: FormEvent) => {
              event.preventDefault();
              if (!selectedTestId || !annotationForm.text.trim()) return;
              createAnnotationMutation.mutate();
            }}
            className="space-y-3"
          >
            <div className="grid grid-cols-2 gap-3">
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
                {annotationTypeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type}
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
                {annotationPlacementOptions.map((placement) => (
                  <option key={placement} value={placement}>
                    {placement}
                  </option>
                ))}
              </select>
              <select
                value={annotationForm.visibilityRule ?? 'always'}
                onChange={(event) =>
                  setAnnotationForm((prev) => ({
                    ...prev,
                    visibilityRule: event.target.value as AnnotationVisibilityRule,
                  }))
                }
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
              >
                {visibilityOptions.map((visibility) => (
                  <option key={visibility} value={visibility}>
                    {visibility}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={annotationForm.displayOrder ?? 10}
                onChange={(event) =>
                  setAnnotationForm((prev) => ({ ...prev, displayOrder: Number(event.target.value) }))
                }
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
              />
            </div>
            <textarea
              value={annotationForm.text}
              onChange={(event) => setAnnotationForm((prev) => ({ ...prev, text: event.target.value }))}
              rows={3}
              placeholder="Annotation text"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
            />
            <input
              value={annotationForm.conditionSpec ?? ''}
              onChange={(event) =>
                setAnnotationForm((prev) => ({ ...prev, conditionSpec: event.target.value }))
              }
              placeholder="Condition spec (optional)"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={createAnnotationMutation.isPending || !selectedTestId}
              className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] disabled:opacity-60"
            >
              {createAnnotationMutation.isPending ? 'Saving...' : 'Add annotation'}
            </button>
          </form>

          <div className="mt-4">
            <p className="mb-2 text-sm font-medium text-[var(--muted)]">Current annotations</p>
            <div className="space-y-2">
              {annotationRows.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">No annotations.</p>
              ) : (
                annotationRows.map((annotation) => (
                  <div key={annotation.id} className="rounded-lg border border-[var(--border)] p-2">
                    <div className="mb-1 text-xs text-[var(--muted)]">
                      {annotation.annotationType} · {annotation.placement}
                    </div>
                    <div className="text-sm">{annotation.text}</div>
                    <button
                      type="button"
                      onClick={() => deleteAnnotationMutation.mutate(annotation.id)}
                      className="mt-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs"
                    >
                      Delete
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </AdminCard>
      </div>
    </div>
  );
}
