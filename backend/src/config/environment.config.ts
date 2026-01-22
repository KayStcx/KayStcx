import { plainToClass } from 'class-transformer';
import { IsEnum, IsNumber, IsString, validateSync } from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment;

  @IsNumber()
  PORT: number;

  @IsString()
  DB_HOST: string;

  @IsNumber()
  DB_PORT: number;

  @IsString()
  DB_USERNAME: string;

  @IsString()
  DB_PASSWORD: string;

  @IsString()
  DB_NAME: string;

  @IsString()
  JWT_SECRET: string;

  @IsString()
  JWT_EXPIRES_IN: string;

  @IsString()
  STELLAR_NETWORK: string;

  @IsString()
  STELLAR_HORIZON_URL: string;

  @IsString()
  STELLAR_ISSUER_SECRET_KEY: string;

  @IsString()
  STELLAR_ISSUER_PUBLIC_KEY: string;

  @IsString()
  ALLOWED_ORIGINS: string;
}

export function validateEnv(): EnvironmentVariables {
  const validatedEnv = plainToClass(
    EnvironmentVariables,
    {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      DB_HOST: process.env.DB_HOST,
      DB_PORT: process.env.DB_PORT,
      DB_USERNAME: process.env.DB_USERNAME,
      DB_PASSWORD: process.env.DB_PASSWORD,
      DB_NAME: process.env.DB_NAME,
      JWT_SECRET: process.env.JWT_SECRET,
      JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
      STELLAR_NETWORK: process.env.STELLAR_NETWORK,
      STELLAR_HORIZON_URL: process.env.STELLAR_HORIZON_URL,
      STELLAR_ISSUER_SECRET_KEY: process.env.STELLAR_ISSUER_SECRET_KEY,
      STELLAR_ISSUER_PUBLIC_KEY: process.env.STELLAR_ISSUER_PUBLIC_KEY,
      ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
    },
    { enableImplicitConversion: true },
  );

  const errors = validateSync(validatedEnv);

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedEnv;
}