"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EncountersController = void 0;
const common_1 = require("@nestjs/common");
const tenant_guard_1 = require("../common/guards/tenant.guard");
const create_encounter_dto_1 = require("./dto/create-encounter.dto");
const encounters_service_1 = require("./encounters.service");
let EncountersController = class EncountersController {
    service;
    constructor(service) {
        this.service = service;
    }
    create(dto) {
        return this.service.create(dto);
    }
    findAll(page = 1, patientId, type, status) {
        return this.service.findAll(Number(page) || 1, { patientId, type, status });
    }
    findById(id) {
        return this.service.findById(id);
    }
    startPrep(id) {
        return this.service.startPrep(id);
    }
    startMain(id) {
        return this.service.startMain(id);
    }
    finalize(id) {
        return this.service.finalize(id);
    }
    createDocument(id) {
        throw new common_1.NotImplementedException(`Encounter document command is deferred for encounter ${id}`);
    }
};
exports.EncountersController = EncountersController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_encounter_dto_1.CreateEncounterDto]),
    __metadata("design:returntype", void 0)
], EncountersController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('patientId')),
    __param(2, (0, common_1.Query)('type')),
    __param(3, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String, String, String]),
    __metadata("design:returntype", void 0)
], EncountersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], EncountersController.prototype, "findById", null);
__decorate([
    (0, common_1.Post)(':id\\:start-prep'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], EncountersController.prototype, "startPrep", null);
__decorate([
    (0, common_1.Post)(':id\\:start-main'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], EncountersController.prototype, "startMain", null);
__decorate([
    (0, common_1.Post)(':id\\:finalize'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], EncountersController.prototype, "finalize", null);
__decorate([
    (0, common_1.Post)(':id\\:document'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NOT_IMPLEMENTED),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], EncountersController.prototype, "createDocument", null);
exports.EncountersController = EncountersController = __decorate([
    (0, common_1.Controller)('encounters'),
    (0, common_1.UseGuards)(tenant_guard_1.TenantGuard),
    __metadata("design:paramtypes", [encounters_service_1.EncountersService])
], EncountersController);
//# sourceMappingURL=encounters.controller.js.map