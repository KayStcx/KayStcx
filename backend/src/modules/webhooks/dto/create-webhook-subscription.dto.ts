import { ApiProperty } from '@nestjs/swagger';
import {
    IsEnum,
    IsNotEmpty,
    IsUrl,
    IsArray,
    IsOptional,
} from 'class-validator';
import { WebhookEvent } from '../entities/webhook-subscription.entity';

export class CreateWebhookSubscriptionDto {
    @ApiProperty({
        example: 'https://api.example.com/webhooks',
        description: 'The URL where the webhook will be delivered',
    })
    @IsUrl()
    @IsNotEmpty()
    url: string;

    @ApiProperty({
        enum: WebhookEvent,
        isArray: true,
        example: [WebhookEvent.CERTIFICATE_ISSUED],
        description: 'List of events to subscribe to',
    })
    @IsArray()
    @IsEnum(WebhookEvent, { each: true })
    events: WebhookEvent[];

    @ApiProperty({
        required: false,
        description: 'Whether the webhook is active',
        default: true,
    })
    @IsOptional()
    isActive?: boolean;
}
