import { Module, forwardRef } from '@nestjs/common'; // Add forwardRef
import { TypeOrmModule } from '@nestjs/typeorm';
// Remove JwtModule import
import { ConfigModule } from '@nestjs/config';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { UserRepository } from './repositories/user.repository';
import { RolesGuard } from './guards/roles.guard';
import { AuthModule } from '../auth/auth.module';
import { CertificateModule } from '../certificate/certificate.module';
import { AuditModule } from '../audit/audit.module';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    // Remove JwtModule.registerAsync completely
    ConfigModule,
    forwardRef(() => AuthModule), // Use forwardRef to break circular dependency
    CertificateModule,
    AuditModule,
    forwardRef(() => FilesModule), // Import FilesModule for StorageService
  ],
  controllers: [UsersController],
  providers: [UsersService, UserRepository, RolesGuard],
  exports: [UsersService, UserRepository],
})
export class UsersModule {}
