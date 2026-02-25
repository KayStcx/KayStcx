import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { MetadataSchemaService } from '../services/metadata-schema.service';
import {
  CreateMetadataSchemaDto,
  UpdateMetadataSchemaDto,
  ValidateMetadataDto,
  MetadataValidationResultDto,
} from '../dto/metadata-schema.dto';
import { MetadataSchema } from '../entities/metadata-schema.entity';

@ApiTags('Metadata Schemas')
@Controller('metadata-schemas')
@ApiBearerAuth()
export class MetadataSchemaController {
  constructor(private readonly schemaService: MetadataSchemaService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new metadata schema' })
  @ApiResponse({ status: 201, description: 'Schema created' })
  @ApiResponse({ status: 409, description: 'Schema version already exists' })
  async create(@Body() dto: CreateMetadataSchemaDto): Promise<MetadataSchema> {
    return this.schemaService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all active schemas' })
  @ApiQuery({ name: 'issuerId', required: false })
  async findAll(
    @Query('issuerId') issuerId?: string,
  ): Promise<MetadataSchema[]> {
    return this.schemaService.findAll(issuerId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get schema by ID' })
  @ApiParam({ name: 'id', type: 'string' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MetadataSchema> {
    return this.schemaService.findOne(id);
  }

  @Get('name/:name')
  @ApiOperation({ summary: 'Get all versions of a schema by name' })
  async findByName(@Param('name') name: string): Promise<MetadataSchema[]> {
    return this.schemaService.findByName(name);
  }

  @Get('name/:name/latest')
  @ApiOperation({ summary: 'Get the latest version of a schema' })
  async findLatest(@Param('name') name: string): Promise<MetadataSchema> {
    const schema = await this.schemaService.findLatestByName(name);
    if (!schema) {
      throw new Error(`No schema found with name "${name}"`);
    }
    return schema;
  }

  @Get('name/:name/history')
  @ApiOperation({ summary: 'Get version history of a schema' })
  async getVersionHistory(
    @Param('name') name: string,
  ): Promise<MetadataSchema[]> {
    return this.schemaService.getVersionHistory(name);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a schema' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMetadataSchemaDto,
  ): Promise<MetadataSchema> {
    return this.schemaService.update(id, dto);
  }

  @Post('name/:name/upgrade')
  @ApiOperation({ summary: 'Create a new version of an existing schema' })
  async upgrade(
    @Param('name') name: string,
    @Body() dto: CreateMetadataSchemaDto,
  ): Promise<MetadataSchema> {
    return this.schemaService.upgradeSchema(name, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate a schema' })
  async deactivate(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MetadataSchema> {
    return this.schemaService.deactivate(id);
  }

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate metadata against a schema' })
  @ApiResponse({ status: 200, description: 'Validation result' })
  async validate(
    @Body() dto: ValidateMetadataDto,
  ): Promise<MetadataValidationResultDto> {
    return this.schemaService.validate(dto.schemaId, dto.metadata);
  }
}
