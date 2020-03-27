import { ProxyNativeModule } from '@unimodules/core';
import { NotificationRequestInput } from './NotificationScheduler.types';
import { Notification } from './Notifications.types';
export interface NotificationPresenterModule extends ProxyNativeModule {
    getPresentedNotificationsAsync: () => Promise<Notification[]>;
    presentNotificationAsync: (identifier: string, notificationRequest: NotificationRequestInput) => Promise<void>;
    dismissNotificationAsync: (identifier: string) => Promise<void>;
    dismissAllNotificationsAsync: () => Promise<void>;
}
declare const _default: NotificationPresenterModule;
export default _default;
