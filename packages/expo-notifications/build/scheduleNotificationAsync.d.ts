import { NotificationRequestInput, NotificationTriggerInput } from './Notifications.types';
export default function scheduleNotificationAsync(notification: NotificationRequestInput, trigger: NotificationTriggerInput): Promise<string>;
