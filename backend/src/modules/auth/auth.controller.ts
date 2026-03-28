import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshDto } from './dto/refresh.dto';
import { LogoutResponseDto } from './dto/logout-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // FIX #269 — login() delegates to authService.login() whose return value is
  // typed as AuthResponseDto. The DTO (and the service implementation) MUST
  // include a `refreshToken` field alongside `accessToken` and `expiresIn`.
  // The controller itself is already correct — it passes the full service
  // response through without stripping any fields.
  //
  // If your AuthResponseDto currently looks like:
  //   { accessToken: string; expiresIn: number; user: UserResponseDto }
  // add `refreshToken: string` to it, and make sure authService.login()
  // populates that field (typically by calling jwtService.sign() with a longer
  // TTL and a separate secret, then returning it here).
  //
  // Example AuthResponseDto addition:
  //   @ApiProperty() refreshToken: string;
  //
  // Example authService.login() return value:
  //   return {
  //     accessToken,
  //     refreshToken,   // <-- was missing
  //     expiresIn,
  //     user,
  //   };
  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    // authService.login must now return { accessToken, refreshToken, expiresIn, user }
    return this.authService.login(loginDto);
  }

  @Post('register')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(registerDto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req,
    @Body() logoutDto: LogoutDto,
  ): Promise<LogoutResponseDto> {
    return this.authService.logout(req.user, logoutDto);
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() refreshDto: RefreshDto): Promise<AuthResponseDto> {
    return this.authService.refreshTokens(refreshDto.refreshToken);
  }
}