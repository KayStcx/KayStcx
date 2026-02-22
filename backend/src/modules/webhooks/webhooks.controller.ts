import {
    Controller,
    Get,
    Post,
    Delete,
    Body,
    Param,
    UseGuards,
    HttpCode,
    HttpStatus,
    Query,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';
import { CreateWebhookSubscriptionDto } from './dto/create-webhook-subscription.dto';
import { WebhookEvent } from './entities/webhook-subscription.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../users/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Webhooks')
@Controller('webhooks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WebhooksController {
    constructor(private readonly webhooksService: WebhooksService) { }

    @Post()
    @ApiOperation({ summary: 'Register a new webhook subscription' })
    @ApiResponse({ status: 201, description: 'Webhook registered successfully' })
    async create(
        @CurrentUser('stellarPublicKey') issuerId: string,
        @Body() dto: CreateWebhookSubscriptionDto,
    ) {
        // Note: Using stellarPublicKey as issuerId for now as the Issuer entity 
        // management is not fully clear in the current codebase state.
        return this.webhooksService.createSubscription(issuerId, dto);
    }

    @Get()
    @ApiOperation({ summary: 'List all webhook subscriptions for the issuer' })
    async findAll(@CurrentUser('stellarPublicKey') issuerId: string) {
        return this.webhooksService.findAll(issuerId);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Remove a webhook subscription' })
    async remove(
        @CurrentUser('stellarPublicKey') issuerId: string,
        @Param('id') id: string,
    ) {
        return this.webhooksService.remove(id, issuerId);
    }

    @Get(':id/logs')
    @ApiOperation({ summary: 'Get delivery logs for a webhook subscription' })
    async getLogs(
        @CurrentUser('stellarPublicKey') issuerId: string,
        @Param('id') id: string,
    ) {
        return this.webhooksService.getLogs(id, issuerId);
    }

    @Post('test')
    @ApiOperation({ summary: 'Send a test webhook event' })
    async test(
        @CurrentUser('stellarPublicKey') issuerId: string,
        @Body('subscriptionId') subscriptionId: string,
    ) {
        const subscription = await this.webhooksService.findOne(subscriptionId, issuerId);

        const testPayload = {
            event: 'webhook.test',
            timestamp: new Date().toISOString(),
            message: 'This is a test webhook from Kaystcx',
            data: {
                issuerId,
                test: true,
            }
        };

        // Reuse the trigger logic to send through the queue
        await this.webhooksService.triggerEvent(
            'webhook.test' as WebhookEvent,
            issuerId,
            testPayload
        );

        return { message: 'Test event queued successfully' };
    }
}
