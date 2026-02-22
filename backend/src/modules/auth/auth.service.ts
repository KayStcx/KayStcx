import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findOneByEmail(email);
    if (user) {
      // Need to get user with password for comparison
      const userWithPassword =
        await this.usersService['userRepository'].findByEmailWithPassword(
          email,
        );
      if (
        userWithPassword &&
        (await bcrypt.compare(pass, userWithPassword.password))
      ) {
        const { password, ...result } = userWithPassword;
        return result;
      }
    }
    return null;
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if account is active
    if (!user.isActive) {
      throw new ForbiddenException('Account is deactivated');
    }

    const payload = { email: user.email, sub: user.id, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      expiresIn: 3600,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    // Check if user already exists
    const existingUser = await this.usersService.findOneByEmail(
      registerDto.email,
    );
    if (existingUser) {
      throw new UnauthorizedException('User already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(registerDto.password, 12);

    // Create user
    const newUser = await this.usersService.create({
      email: registerDto.email,
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      password: hashedPassword,
    });

    const payload = {
      email: newUser.email,
      sub: newUser.id,
      role: newUser.role,
    };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      expiresIn: 3600,
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
      },
    };
  }
}
