import uuidv4 from 'uuid/v4';

import NotificationScheduler from './NotificationScheduler';
import { NotificationTriggerInput as NativeNotificationTriggerInput } from './NotificationScheduler.types';
import { NotificationRequestInput, NotificationTriggerInput } from './Notifications.types';

export default async function scheduleNotificationAsync(
  notification: NotificationRequestInput,
  trigger: NotificationTriggerInput
): Promise<string> {
  const { identifier, ...notificationSpec } = notification;

  // If identifier has not been provided, let's create one.
  const notificationIdentifier = identifier ?? uuidv4();

  return await NotificationScheduler.scheduleNotificationAsync(
    notificationIdentifier,
    notificationSpec,
    parseTrigger(trigger)
  );
}

function parseTrigger(userFacingTrigger: NotificationTriggerInput): NativeNotificationTriggerInput {
  if (userFacingTrigger === null) {
    return null;
  }

  if (userFacingTrigger instanceof Date) {
    return { type: 'date', timestamp: userFacingTrigger.getTime() };
  } else if (typeof userFacingTrigger === 'number') {
    return { type: 'date', timestamp: userFacingTrigger };
  } else if ('seconds' in userFacingTrigger) {
    return {
      type: 'timeInterval',
      seconds: userFacingTrigger.seconds,
      repeats: userFacingTrigger.repeats ?? false,
    };
  } else {
    const { repeats, ...calendarTrigger } = userFacingTrigger;
    return { type: 'calendar', value: calendarTrigger, repeats };
  }
}
