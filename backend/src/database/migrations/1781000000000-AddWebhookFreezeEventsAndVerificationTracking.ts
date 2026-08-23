import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWebhookFreezeEventsAndVerificationTracking1781000000000
  implements MigrationInterface
{
  name = 'AddWebhookFreezeEventsAndVerificationTracking1781000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add the new certificate lifecycle webhook events. Existing subscriptions
    // keep their current event set; subscribers opt in to the new events.
    await queryRunner.query(
      `ALTER TYPE "webhook_subscriptions_events_enum" ADD VALUE IF NOT EXISTS 'certificate.frozen'`,
    );
    await queryRunner.query(
      `ALTER TYPE "webhook_subscriptions_events_enum" ADD VALUE IF NOT EXISTS 'certificate.unfrozen'`,
    );

    // Track failed verification attempts: a nullable certificate reference and
    // the attempted code/metadata.
    await queryRunner.query(
      `ALTER TABLE "verifications" ADD COLUMN IF NOT EXISTS "verificationCode" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "verifications" ADD COLUMN IF NOT EXISTS "metadata" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "verifications" ALTER COLUMN "certificateId" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "verifications" ALTER COLUMN "certificateId" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "verifications" DROP COLUMN IF EXISTS "metadata"`,
    );
    await queryRunner.query(
      `ALTER TABLE "verifications" DROP COLUMN IF EXISTS "verificationCode"`,
    );
    // Postgres does not support removing enum values; leave them in place.
  }
}
