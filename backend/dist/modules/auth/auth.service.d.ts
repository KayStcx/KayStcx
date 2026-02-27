import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LogoutDto } from './dto/logout.dto';
import { LogoutResponseDto } from './dto/logout-response.dto';
import { JwtManagementService } from './services/jwt.service';
export declare class AuthService {
    private usersService;
    private jwtService;
    private jwtManagementService;
    constructor(usersService: UsersService, jwtService: JwtService, jwtManagementService: JwtManagementService);
    validateUser(email: string, pass: string): Promise<any>;
    login(loginDto: LoginDto): Promise<AuthResponseDto>;
    register(registerDto: RegisterDto): Promise<AuthResponseDto>;
    logout(user: any, logoutDto: LogoutDto): Promise<LogoutResponseDto>;
    refreshTokens(refreshToken: string): Promise<AuthResponseDto>;
}
