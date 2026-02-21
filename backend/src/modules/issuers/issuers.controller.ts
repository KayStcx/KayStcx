import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { CreateIssuerDto } from './dto/create-issuer.dto';
import { Issuer } from './entities/issuer.entity';
import { IssuersService } from './issuers.service';

@Controller('issuers')
export class IssuersController {
  constructor(private readonly issuersService: IssuersService) {}

  @Get()
  @Public()
  async findAll(): Promise<Issuer[]> {
    return this.issuersService.findAll();
  }

  @Post()
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe())
  async create(@Body() dto: CreateIssuerDto): Promise<Issuer> {
    return this.issuersService.create(dto);
  }
}
