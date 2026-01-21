"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IssuersModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const issuers_service_1 = require("./issuers.service");
const issuers_controller_1 = require("./issuers.controller");
const issuer_entity_1 = require("./entities/issuer.entity");
let IssuersModule = class IssuersModule {
};
exports.IssuersModule = IssuersModule;
exports.IssuersModule = IssuersModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([issuer_entity_1.Issuer])],
        controllers: [issuers_controller_1.IssuersController],
        providers: [issuers_service_1.IssuersService],
    })
], IssuersModule);
//# sourceMappingURL=issuers.module.js.map