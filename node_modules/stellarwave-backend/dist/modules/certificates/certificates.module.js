"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CertificatesModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const certificates_service_1 = require("./certificates.service");
const certificates_controller_1 = require("./certificates.controller");
const certificate_entity_1 = require("./entities/certificate.entity");
let CertificatesModule = class CertificatesModule {
};
exports.CertificatesModule = CertificatesModule;
exports.CertificatesModule = CertificatesModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([certificate_entity_1.Certificate])],
        controllers: [certificates_controller_1.CertificatesController],
        providers: [certificates_service_1.CertificatesService],
    })
], CertificatesModule);
//# sourceMappingURL=certificates.module.js.map