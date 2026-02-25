import { Controller, Post, Delete, Get, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IssuersService } from './issuers.service';
import { CreateIssuerDto } from './dto/create-issuer.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/constants/roles';

@ApiTags('Issuers')
@ApiBearerAuth()
@Controller('issuers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class IssuersController {
	constructor(private readonly issuersService: IssuersService) {}

	@Post()
	async create(@Body() dto: CreateIssuerDto) {
		return this.issuersService.createIssuer(dto);
	}

	@Delete(':id')
	async remove(@Param('id') id: string) {
		return this.issuersService.removeIssuer(id);
	}

	@Get()
	async list() {
		return this.issuersService.listIssuers();
	}
}
import { Controller } from '@nestjs/common';

@Controller('issuers')
export class IssuersController {}
