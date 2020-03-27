import { ProxyNativeModule } from '@unimodules/core';
import { NotificationRequestInput, NotificationTriggerInput } from './NotificationScheduler.types';
import { Notification } from './Notifications.types';
export interface NotificationSchedulerModule extends ProxyNativeModule {
    getAllScheduledNotificationsAsync: () => Promise<Notification[]>;
    scheduleNotificationAsync: (identifier: string, notificationRequest: NotificationRequestInput, trigger: NotificationTriggerInput) => Promise<string>;
    cancelScheduledNotificationAsync: (identifier: string) => Promise<void>;
    cancelAllScheduledNotificationsAsync: () => Promise<void>;
}
declare const _default: NotificationSchedulerModule;
export default _default;
