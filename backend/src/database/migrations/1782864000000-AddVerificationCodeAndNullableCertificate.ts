import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVerificationCodeAndNullableCertificate1782864000000 implements MigrationInterface {
  name = 'AddVerificationCodeAndNullableCertificate1782864000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "verifications" ADD COLUMN IF NOT EXISTS "verificationCode" character varying',
    );
    await queryRunner.query(
      'ALTER TABLE "verifications" ALTER COLUMN "certificateId" DROP NOT NULL',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "verifications" ALTER COLUMN "certificateId" SET NOT NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "verifications" DROP COLUMN IF EXISTS "verificationCode"',
    );
  }
}