import { MigrationInterface, QueryRunner } from 'typeorm';

export class RecordFailedVerifications1787357408085 implements MigrationInterface {
  name = 'RecordFailedVerifications1787357408085';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "verifications" ALTER COLUMN "certificateId" DROP NOT NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "verifications" ADD COLUMN IF NOT EXISTS "verificationCode" character varying',
    );
    await queryRunner.query(
      'ALTER TABLE "verifications" ADD COLUMN IF NOT EXISTS "verifiedBy" character varying',
    );
    await queryRunner.query(
      'ALTER TABLE "verifications" ADD COLUMN IF NOT EXISTS "ipAddress" character varying',
    );
    await queryRunner.query(
      'ALTER TABLE "verifications" ADD COLUMN IF NOT EXISTS "userAgent" character varying',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "verifications" DROP COLUMN IF EXISTS "userAgent"',
    );
    await queryRunner.query(
      'ALTER TABLE "verifications" DROP COLUMN IF EXISTS "ipAddress"',
    );
    await queryRunner.query(
      'ALTER TABLE "verifications" DROP COLUMN IF EXISTS "verifiedBy"',
    );
    await queryRunner.query(
      'ALTER TABLE "verifications" DROP COLUMN IF EXISTS "verificationCode"',
    );
    await queryRunner.query(
      'ALTER TABLE "verifications" ALTER COLUMN "certificateId" SET NOT NULL',
    );
  }
}
