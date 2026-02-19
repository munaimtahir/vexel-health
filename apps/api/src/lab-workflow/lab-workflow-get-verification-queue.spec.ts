import { REQUEST } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { LabOrderItemStatus } from '@prisma/client';
import { ClsService } from 'nestjs-cls';
import { DocumentsService } from '../documents/documents.service';
import { PrismaService } from '../prisma/prisma.service';
import { LabWorkflowService } from './lab-workflow.service';

describe('LabWorkflowService.getVerificationQueue', () => {
  let service: LabWorkflowService;
  const tenantId = 'tenant-1';

  beforeEach(async () => {
    const mockPrisma = {
      labOrderItem: {
        findMany: jest.fn(),
      },
      document: {
        findMany: jest.fn(),
      },
    };
    const mockCls = { get: jest.fn().mockReturnValue(tenantId) };
    const mockDocumentsService = {};
    const mockRequest = { headers: {} };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LabWorkflowService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ClsService, useValue: mockCls },
        { provide: DocumentsService, useValue: mockDocumentsService },
        { provide: REQUEST, useValue: mockRequest },
      ],
    }).compile();

    prisma = module.get<PrismaService>(PrismaService);
    service = await module.resolve<LabWorkflowService>(LabWorkflowService);
  });

  let prisma: PrismaService;

  it('returns items with patient and test context and derived_encounter_status', async () => {
    (prisma.labOrderItem.findMany as jest.Mock)
      .mockResolvedValueOnce([
        {
          id: 'item-1',
          encounterId: 'enc-1',
          createdAt: new Date('2026-02-19T10:00:00Z'),
          updatedAt: new Date('2026-02-19T11:00:00Z'),
          encounter: {
            patient: {
              id: 'patient-1',
              regNo: 'REG001',
              mrn: 'MRN001',
              name: 'Jane Doe',
              dob: new Date('1990-01-15'),
              gender: 'F',
            },
          },
          test: { code: 'ALB', name: 'Albumin' },
        },
      ])
      .mockResolvedValueOnce([{ encounterId: 'enc-1', status: LabOrderItemStatus.RESULTS_ENTERED }]);
    (prisma.document.findMany as jest.Mock).mockResolvedValue([]);

    const result = await service.getVerificationQueue({ limit: 10 });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      encounter_id: 'enc-1',
      lab_order_item_id: 'item-1',
      derived_encounter_status: 'RESULTS_ENTERED',
      patient: {
        patient_id: 'patient-1',
        mrn: 'MRN001',
        name: 'Jane Doe',
        age: 36,
        sex: 'F',
      },
      test: { test_code: 'ALB', test_name: 'Albumin' },
    });
    expect(result.items[0].created_at).toBeDefined();
    expect(result.items[0].results_entered_at).toBeDefined();
  });
});
