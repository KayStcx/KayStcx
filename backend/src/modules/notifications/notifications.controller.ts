import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    UseGuards,
    Request,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) { }

    @Get()
    @ApiOperation({ summary: 'Get user recent notifications' })
    getUserNotifications(@Request() req: any) {
        return this.notificationsService.getUserNotifications(req.user.id);
    }

    @Patch('read-all')
    @ApiOperation({ summary: 'Mark all unread notifications as read' })
    async markAllAsRead(@Request() req: any) {
        await this.notificationsService.markAllAsRead(req.user.id);
        return { success: true };
    }

    @Patch(':id/read')
    @ApiOperation({ summary: 'Mark a specific notification as read' })
    markAsRead(@Request() req: any, @Param('id') id: string) {
        return this.notificationsService.markAsRead(req.user.id, id);
    }

    @Get('preferences')
    @ApiOperation({ summary: 'Get user notification preferences' })
    getPreferences(@Request() req: any) {
        return this.notificationsService.getPreferences(req.user.id);
    }

    @Patch('preferences')
    @ApiOperation({ summary: 'Update user notification preferences' })
    updatePreferences(@Request() req: any, @Body() updateData: any) {
        return this.notificationsService.updatePreferences(req.user.id, updateData);
    }
}
