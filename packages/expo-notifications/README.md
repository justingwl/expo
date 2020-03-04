# expo-notifications

Provides an API to fetch push notification tokens and to present, schedule, receive and respond to notifications.

# API documentation

The following methods are exported by the `expo-notifications` module:

- **fetching token for sending push notifications**
  - [`getExpoPushTokenAsync`](#getexpopushtokenasync) -- resolves with an Expo push token
  - [`getDevicePushTokenAsync`](#getdevicepushtokenasync) -- resolves with a device push token
  - [`addPushTokenListener`](#addpushtokenlistener) -- adds a listener called when a new push token is issued
  - [`removePushTokenSubscription`](#removepushtokensubscription) -- removes the listener registered with `addPushTokenListener`
  - [`removeAllPushTokenListeners`](#removeallpushtokenlisteners) -- removes all listeners registered with `addPushTokenListener`
- **listening to notification events**
  - [`addNotificationReceivedListener`](#addnotificationreceivedlistener) -- adds a listener called whenever a new notification is received
  - [`addNotificationsDroppedListener`](#addnotificationsdroppedlistener) -- adds a listener called whenever some notifications have been dropped
  - [`addNotificationResponseReceivedListener`](#addnotificationresponsereceivedlistener) -- adds a listener called whenever user interacts with a notification
  - [`removeNotificationSubscription`](#removenotificationsubscription) -- removes the listener registered with `addNotification*Listener()`
  - [`removeAllNotificationListeners`](#removeAllNotificationListeners) -- removes all listeners registered with `addNotification*Listener()`
- **handling incoming notifications when the app is in foreground**
  - [`setNotificationHandler`](#setnotificationhandler) -- sets the handler function responsible for deciding what to do with a notification that is received when the app is in foreground
- **fetching permissions information**
  - [`getPermissionsAsync`](#getpermissionsasync) -- fetches current permission settings related to notifications
  - [`requestPermissionsAsync`](#requestpermissionsasync) -- requests permissions related to notifications
- **managing application badge icon**
  - [`getBadgeCountAsync`](#getbadgecountasync) -- fetches the application badge number value
  - [`setBadgeCountAsync`](#setbadgecountasync) -- sets the application badge number value
- **scheduling notifications**
  - [`getAllScheduledNotificationsAsync`](#getallschedulednotificationsasync) -- fetches information about all scheduled notifications
  - [`presentNotificationAsync`](#presentnotificationasync) -- schedules a notification for immediate trigger
  - [`scheduleNotificationAsync`](#schedulenotificationasync) -- schedules a notification to be triggered in the future
  - [`cancelScheduledNotificationAsync`](#cancelschedulednotificationasync) -- removes a specific scheduled notification
  - [`cancelAllScheduledNotificationsAsync`](#cancelallschedulednotificationsasync) -- removes all scheduled notifications
- **dismissing notifications**
  - [`dismissNotificationAsync`](#dismissnotificationasync) -- removes a specific notification from the notification tray
  - [`dismissAllNotificationsAsync`](#dismissallnotificationsasync) -- removes all notifications from the notification tray
- **managing notification channels (Android-specific)**
  - [`getNotificationChannelsAsync`](#getnotificationchannelsasync) -- fetches information about all known notification channels
  - [`getNotificationChannelAsync`](#getnotificationchannelasync) -- fetches information about a specific notification channel
  - [`setNotificationChannelAsync`](#setnotificationchannelasync) -- saves a notification channel configuration
  - [`deleteNotificationChannelAsync`](#deletenotificationchannelasync) -- deletes a notification channel
  - [`getNotificationChannelGroupsAsync`](#getnotificationchannelgroupsasync) -- fetches information about all known notification channel groups
  - [`getNotificationChannelGroupAsync`](#getnotificationchannelgroupasync) -- fetches information about a specific notification channel group
  - [`setNotificationChannelGroupAsync`](#setnotificationchannelgroupasync) -- saves a notification channel group configuration
  - [`deleteNotificationChannelGroupAsync`](#deletenotificationchannelgroupasync) -- deletes a notification channel group

# Installation in managed Expo projects

This library is not yet usable within managed projects &mdash; it is likely to be included in an upcoming Expo SDK release.

# Installation in bare React Native projects

For bare React Native projects, you must ensure that you have [installed and configured the `react-native-unimodules` package](https://github.com/unimodules/react-native-unimodules) before continuing.

### Add the package to your npm dependencies

```
expo install expo-notifications
```

### Configure for iOS

Run `pod install` in the `ios` directory after installing the npm package.

### Configure for Android

Ensure that your project is configured for Firebase (to verify if it is, check if `android/app` folder contains a `google-services.json` file).

# Contributing

Contributions are very welcome! Please refer to guidelines described in the [contributing guide](https://github.com/expo/expo#contributing).

------

# API

## Fetching tokens for push notifications

### `getExpoPushTokenAsync(options: ExpoTokenOptions): ExpoPushToken`

Returns an Expo token that can be used to send a push notification to this device using Expo push notifications service. [Read more in the Push Notifications guide](https://docs.expo.io/versions/latest/guides/push-notifications/).

> **Note:** For Expo backend to be able to send notifications to your app, you will need to provide it with push notification keys. This can be done using `expo-cli` (`expo credentials:manager`). [Read more in the “Upload notifications credentials” guide](https://expo.fyi/upload-notifications-credentials). TODO

#### Arguments

This function accepts an optional object allowing you to pass in configuration, consisting of fields (all are optional, but some may have to be defined if configuration cannot be inferred):

- **experienceId (_string_)** -- The ID of the experience to which the token should be attributed. Defaults to [`Constants.manifest.id`](https://docs.expo.io/versions/latest/sdk/constants/#constantsmanifest) exposed by `expo-constants`. You may need to define it in bare workflow, where `expo-constants` doesn't expose the manifest.
- **devicePushToken ([_DevicePushToken_](#devicepushtoken))** -- The device push token with which to register at the backend. Defaults to a token fetched with [`getDevicePushTokenAsync()`](#getdevicepushtokenasync).
- **applicationId (_string_)** -- The ID of the application to which the token should be attributed. Defaults to [`Application.applicationId`](https://docs.expo.io/versions/latest/sdk/application/#applicationapplicationid) exposed by `expo-application`.
- **deviceId (_string_)** -- The ID of the application installation. `expo-notifications` is capable of generating one for you and it defaults to it. Most probably you won't need to customize that.
- **type (_string_)** -- Type of token sent to the server. Inferred from `devicePushToken`. Most probably you won't need to customize that.
- **development (_boolean_)** -- Makes sense only on iOS, where there are two push notification services: sandbox and production. This defines whether the push token is supposed to be used with the sandbox platform notification service. Defaults to [`Application.getIosPushNotificationServiceEnvironmentAsync()`](https://docs.expo.io/versions/latest/sdk/application/#applicationgetiospushnotificationserviceenvironmentasync) exposed by `expo-application` or `false`. Most probably you won't need to customize that.
- **baseUrl (_string_)** -- Base URL upon which the function will build a URL to which it will send the device push token. If `url` is defined, this option won't have any effect. Defaults to a production Expo backend URL. Most probably you won't need to change that.
- **url (_string_)** -- Endpoint URL to which the function will send the device push token. Most probably you won't need to customize that. Setting `url` overrides `baseUrl`.

#### Returns

Returns a `Promise` that resolves to an object with the following fields:

- **type (_string_)** -- Always `expo`.
- **data (_string_)** -- The push token as a string.

#### Examples

##### Fetching the Expo push token and uploading it to a server

```ts
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';

export async function registerForPushNotificationsAsync(userId: string) {
  let experienceId = undefined;
  if (!Constants.manifest) {
    // Absence of the manifest means we're in bare workflow
    experienceId = '@username/example';
  }
  const expoPushToken = await Notifications.getExpoPushTokenAsync({
    experienceId,
  });
  await fetch('https://example.com/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId,
      expoPushToken,
    }),
  });
}
```

### `getDevicePushTokenAsync(): DevicePushToken`

Returns a native APNS, FCM token or a [`PushSubscription` data](https://developer.mozilla.org/en-US/docs/Web/API/PushSubscription) that can be used with another push notification service.

#### Returns

A `Promise` that resolves to an object with the following fields:

- **type (_string_)** -- Either `ios`, `android` or `web`.
- **data (_string_ or _object_)** -- Either the push token as a string (for `type == "ios" | "android"`) or an object conforming to the type below (for `type == "web"`):
  ```ts
  {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    }
  }
  ```

### `addPushTokenListener(listener: PushTokenListener): Subscription`

In rare situations a push token may be changed while the app is running. When a token is rolled, the old one becomes invalid and sending notifications to it will fail. A push token listener will let you handle this situation gracefully.

#### Arguments

A single and required argument is a function accepting a push token as an argument. It will be called whenever the push token changes.

#### Returns

A [`Subscription`](#subscription) object representing the subscription of the provided listener.

#### Examples

Registering a push token listener using a React hook

```tsx
import React from 'react';
import * as Notifications from 'expo-notifications';

import { registerDevicePushTokenAsync } from '../api';

export default function App() {
  React.useEffect(() => {
    const subscription = Notifications.addPushTokenListener(registerDevicePushTokenAsync);
    return () => subscription.remove();
  }, []);

  return (
    // Your app content
  );
}
```

### `removePushTokenSubscription(subscription: Subscription): void`

Removes a push token subscription returned by a `addPushTokenListener` call.

#### Arguments

A single and required argument is a subscription returned by `addPushTokenListener`.

### `removeAllPushTokenListeners(): void`

Removes all push token subscriptions that may have been registered with `addPushTokenListener`.

## Listening to notification events

### `addNotificationReceivedListener(listener: (event: Notification) => void): void`

Listeners registered by this method will be called whenever a notification is received while the app is running.

#### Arguments

A single and required argument is a function accepting a notification ([`Notification`](#notification)) as an argument.

#### Returns

A [`Subscription`](#subscription) object representing the subscription of the provided listener.

#### Examples

Registering a notification listener using a React hook

```tsx
import React from 'react';
import * as Notifications from 'expo-notifications';

export default function App() {
  React.useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener(notification => {
      console.log(notification);
    });
    return () => subscription.remove();
  }, []);

  return (
    // Your app content
  );
}
```

### `addNotificationsDroppedListener(listener: () => void): void`

Listeners registered by this method will be called whenever some notifications have been dropped by the server. Applicable only to Firebase Cloud Messaging which we use as notifications service on Android. It corresponds to `onDeletedMessages()` callback. [More information can be found in Firebase docs](https://firebase.google.com/docs/cloud-messaging/android/receive#override-ondeletedmessages).

#### Arguments

A single and required argument is a function–callback.

#### Returns

A [`Subscription`](#subscription) object representing the subscription of the provided listener.

### `addNotificationResponseReceivedListener(listener: (event: NotificationResponse) => void): void`

Listeners registered by this method will be called whenever a user interacts with a notification (eg. taps on it).

#### Arguments

A single and required argument is a function accepting notification response ([`NotificationResponse`](#notificationresponse)) as an argument.

#### Returns

A [`Subscription`](#subscription) object representing the subscription of the provided listener.

#### Examples

Registering a notification listener using a React hook

```tsx
import React from 'react';
import { Linking } from 'react-native';
import * as Notifications from 'expo-notifications';

export default function Container({ navigation }) {
  React.useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const url = response.notification.request.content.data.url;
      Linking.openUrl(url);
    });
    return () => subscription.remove();
  }, [navigation]);

  return (
    // Your app content
  );
}
```

### `removeNotificationSubscription(subscription: Subscription): void`

Removes a notification subscription returned by a `addNotification*Listener` call.

#### Arguments

A single and required argument is a subscription returned by `addNotification*Listener`.

### `removeAllNotificationListeners(): void`

Removes all notification subscriptions that may have been registered with `addNotification*Listener`.

## Handling incoming notifications when the app is in foreground

### `setNotificationHandler(handler: NotificationHandler | null): void`

When a notification is received while the app is running, using this function you can set a callback that will decide whether the notification should be shown to the user or not.

When a notification is received, `handleNotification` is called with the incoming notification as an argument. The function should respond with a behavior object within 3 seconds, otherwise the notification will be discarded. If the notification is handled successfully, `handleSuccess` is called with the identifier of the notification, otherwise (or on timeout) `handleError` will be called.

#### Arguments

The function receives a single argument which should be either `null` (if you want to clear the handler) or an object of fields:

- **handleNotification (_(Notification) => Promise<NotificationBehavior>_**) -- (required) a function accepting an incoming notification returning a `Promise` resolving to a behavior ([`NotificationBehavior`](#notificationbehavior)) applicable to the notification
- **handleSuccess (_(notificationId: string) => void_)** -- (optional) a function called whenever an incoming notification is handled successfully
- **handleError (_(error: Error) => void_)** -- (optional) a function called whenever handling of an incoming notification fails

#### Examples

Implementing a notification handler that always shows the notification when it is received

```ts
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});
```

## Fetching information about notifications-related permissions

### `getPermissionsAsync(): Promise<NotificationPermissionsStatus>`

Calling this function checks current permissions settings related to notifications. It lets you verify whether the app is currently allowed to display alerts, play sounds, etc. There is no user-facing effect of calling this.

#### Returns

It returns a `Promise` resolving to an object representing permission settings (`NotificationPermissionsStatus`).

#### Examples

Check if the app is allowed to send any type of notifications (interrupting and non-interrupting–provisional on iOS)

```ts
import * as Notifications from 'expo-notifications';

export function allowsNotificationsAsync() {
  const settings = await Notifications.getPermissionsAsync();
  return (
    settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}
```

### `requestPermissionsAsync(request?: NotificationPermissionsRequest): Promise<NotificationPermissionsStatus>`

Prompts the user for notification permissions according to request. Request defaults to asking the user to allow displaying alerts, setting badge count and playing sounds.

#### Arguments

An optional object of conforming to the following interface:

```ts
{
  android?: {};
  ios?: {
    allowAlert?: boolean;
    allowBadge?: boolean;
    allowSound?: boolean;
    allowDisplayInCarPlay?: boolean;
    allowCriticalAlerts?: boolean;
    provideAppNotificationSettings?: boolean;
    allowProvisional?: boolean;
    allowAnnouncements?: boolean;
  }
}
```

Each option corresponds to a different native platform authorization option (a list of iOS options is available [here](https://developer.apple.com/documentation/usernotifications/unauthorizationoptions), on Android all available permissions are granted by default and if a user declines any permission an app can't prompt the user to change).

#### Returns

It returns a `Promise` resolving to an object representing permission settings (`NotificationPermissionsStatus`).

#### Examples

Prompts the user to allow the app to show alerts, play sounds, set badge count and let Siri read out messages through AirPods

```ts
import * as Notifications from 'expo-notifications';

export function requestPermissionsAsync() {
  return await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
      allowAnnouncements: true,
    },
  });
}
```

## Managing application badge icon

### `getBadgeCountAsync(): Promise<number>`

Fetches the number currently set as the badge of the app icon on device's home screen. A `0` value means that the badge is not displayed.

> **Note:** Not all Android launchers support application badges. If the launcher does not support icon badges, the method will always resolve to `0`.

#### Returns

It returns a `Promise` resolving to a number representing current badge of the app icon.

### `setBadgeCountAsync(badgeCount: number, options?: SetBadgeCountOptions): Promise<boolean>`

Sets the badge of the app's icon to the specified number. Setting to `0` clears the badge.

> **Note:** Not all Android launchers support application badges. If the launcher does not support icon badges, the method will resolve to `false`.

#### Arguments

The function accepts a number as the first argument. A value of `0` will clear the badge.

As a second, optional argument you can pass in an object of options configuring behavior applied in Web environment. The object should be of format:

```ts
{
  web?: badgin.Options
}
```

where the type `badgin.Options` is an object described [in the `badgin`'s documentation](https://github.com/jaulz/badgin#options).

#### Returns

It returns a `Promise` resolving to a boolean representing whether setting of the badge succeeded.

## Scheduling notifications

### `getAllScheduledNotificationsAsync(): Promise<Notification[]>`

Fetches information about all scheduled notifications.

#### Returns

It returns a `Promise` resolving to an array of objects conforming to the [`Notification`](#notification) interface.

### `presentNotificationAsync(notificationRequest: NotificationRequest): Promise<void>`

Schedules a notification for immediate trigger.

> **Note:** Please note that this does not mean that the notification will be presented. For the notification to be presented you have to set a notification handler with [`setNotificationHandler`](#setnotificationhandler) that will return an appropriate notification behavior. For more information see the example below.

#### Arguments

The only argument to this function is a [`NotificationRequest`](#notificationrequest).

#### Returns

It returns a `Promise` resolving once the notification is successfully scheduled.

#### Examples

##### Presenting the notification to the user

```ts
import * as Notifications from 'expo-notifications';

// First, set the handler that will cause the notification
// to show the alert

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// Second, call the method

Notifications.presentNotificationAsync({
  title: 'Look at that notification',
  message: "I'm so proud of myself!",
});
```

### `scheduleNotificationAsync(notificationRequest: NotificationRequest, trigger: NotificationTrigger): Promise<string>`

Schedules a notification to be triggered in the future.

> **Note:** Please note that this does not mean that the notification will be presented when it is triggereed. For the notification to be presented you have to set a notification handler with [`setNotificationHandler`](#setnotificationhandler) that will return an appropriate notification behavior. For more information see the example below.

#### Arguments

1. A [`NotificationRequest`](#notificationrequest) describing the notification to be triggered.
2. A [`NotificationTrigger`](#notificationtrigger) describing when should the notification trigger.

#### Returns

It returns a `Promise` resolving to a string --- a notification identifier you can later use to cancel the notification or to identify an incoming notification.

#### Examples

##### Scheduling the notification that will trigger once, in one minute from now

```ts
import * as Notifications from 'expo-notifications';

Notifications.scheduleNotificationAsync({
  title: "Time's up!",
  message: 'Change sides!',
}, {
  seconds: 60
});
```

##### Scheduling the notification that will trigger repeatedly, every 20 minutes

```ts
import * as Notifications from 'expo-notifications';

Notifications.scheduleNotificationAsync({
  title: 'Remember to drink water!,
}, {
  seconds: 60 * 20,
  repeats: true
});
```

##### Scheduling the notification that will trigger once, at the beginning of next hour

```ts
import * as Notifications from 'expo-notifications';

const triggerDate = new Date(Date.now() + 60 * 60 * 1000);
triggerDate.setMinutes(0);
triggerDate.setSeconds(0);

Notifications.scheduleNotificationAsync({
  title: 'Happy new hour!',
}, triggerDate);
```

### `cancelScheduledNotificationAsync(identifier: string): Promise<void>`

Cancels a single scheduled notification. The scheduled notification of given ID will not trigger.

#### Arguments

The notification identifier with which `scheduleNotificationAsync` resolved when the notification has been scheduled.

#### Returns

A `Promise` resolving once the scheduled notification is successfully cancelled or if there is no scheduled notification for given identifier.

#### Examples

##### Scheduling and then canceling the notification

```ts
import * as Notifications from 'expo-notifications';

async function scheduleAndCancel() {
  const identifier = await Notifications.scheduleNotificationAsync({
    title: 'Hey!',
  }, { seconds: 5, repeats: true });
  await Notifications.cancelScheduledNotificationAsync(identifier);
}
```

### `cancelAllScheduledNotificationsAsync(): Promise<void>`

Cancels all scheduled notifications.

#### Returns

A `Promise` resolving once all the scheduled notifications are successfully cancelled or if there are no scheduled notifications.

## Dismissing notifications

### `dismissNotificationAsync(identifier: string): Promise<void>`

Removes notification displayed in the notification tray (Notification Center).

#### Arguments

The first and only argument to the function is the notification identifier, obtained either in `setNotificationHandler` or in the listener added with `addNotificationReceivedListener`.

#### Returns

Resolves once the request to dismiss the notification is successfully dispatched to the notifications manager.

### `dismissAllNotificationsAsync(): Promise<void>`

Removes all application's notifications displayed in the notification tray (Notification Center).

#### Returns

Resolves once the request to dismiss the notifications is successfully dispatched to the notifications manager.

## Managing notification channels (Android-specific)

> Starting in Android 8.0 (API level 26), all notifications must be assigned to a channel. For each channel, you can set the visual and auditory behavior that is applied to all notifications in that channel. Then, users can change these settings and decide which notification channels from your app should be intrusive or visible at all. [(source: developer.android.com)](https://developer.android.com/training/notify-user/channels)

If you do not specify a notification channel, `expo-notifications` will create a fallback channel for you, named _Miscellaneous_. We encourage you to always ensure appropriate channels with informative names are set up for the application and to always send notifications to these channels.

Calling these methods is a no-op for platforms that do not support this feature (iOS, Web and Android below version 8.0 (26)).

### `getNotificationChannelsAsync(): Promise<NotificationChannel[]>`

Fetches information about all known notification channels.

#### Returns

A `Promise` resolving to an array of channels. On platforms that do not support notification channels, it will always resolve to an empty array.

### `getNotificationChannelAsync(identifier: string): Promise<NotificationChannel | null>`

Fetches information about a single notification channel.

#### Arguments

The only argument to this method is the channel's identifier.

#### Returns

A `Promise` resolving to the channel object (of type [`NotificationChannel`](#notificationchannel)) or to `null` if there was no channel found for this identifier. On platforms that do not support notification channels, it will always resolve to `null`.

### `setNotificationChannelAsync(identifier: string, channel: NotificationChannelInput): Promise<NotificationChannel | null>`

Assigns the channel configuration to a channel of a specified name (creating it if need be). This method lets you assign given notification channel to a notification channel group.

#### Arguments

First argument to the method is the channel identifier.

Second argument is the channel's configuration of type [`NotificationChannelInput`](#notificationchannelinput)

#### Returns

A `Promise` resolving to the object (of type [`NotificationChannel`](#notificationchannel)) describing the modified channel or to `null` if the platform does not support notification channels.

### `deleteNotificationChannelAsync(identifier: string): Promise<void>`

Removes the notification channel.

#### Arguments

First and only argument to the method is the channel identifier.

#### Returns

A `Promise` resolving once the channel is removed (or if there was no channel for given identifier).

### `getNotificationChannelGroupsAsync(): Promise<NotificationChannelGroup[]>`

Fetches information about all known notification channel groups.

#### Returns

A `Promise` resolving to an array of channel groups. On platforms that do not support notification channel groups, it will always resolve to an empty array.

### `getNotificationChannelGroupAsync(identifier: string): Promise<NotificationChannelGroup | null>`

Fetches information about a single notification channel group.

#### Arguments

The only argument to this method is the channel group's identifier.

#### Returns

A `Promise` resolving to the channel group object (of type [`NotificationChannelGroup`](#notificationchannelgroup)) or to `null` if there was no channel group found for this identifier. On platforms that do not support notification channels, it will always resolve to `null`.

### `setNotificationChannelGroupAsync(identifier: string, channel: NotificationChannelGroupInput): Promise<NotificationChannelGroup | null>`

Assigns the channel group configuration to a channel group of a specified name (creating it if need be).

#### Arguments

First argument to the method is the channel group identifier.

Second argument is the channel group's configuration of type [`NotificationChannelGroupInput`](#notificationchannelgroupinput)

#### Returns

A `Promise` resolving to the object (of type [`NotificationChannelGroup`](#notificationchannelgroup)) describing the modified channel group or to `null` if the platform does not support notification channels.

### `deleteNotificationChannelGroupAsync(identifier: string): Promise<void>`

Removes the notification channel group and all notification channels that belong to it.

#### Arguments

First and only argument to the method is the channel group identifier.

#### Returns

A `Promise` resolving once the channel group is removed (or if there was no channel group for given identifier).

## Types

### `DevicePushToken`

In simple terms, an object of `type: Platform.OS` and `data: any`. The `data` type depends on the environment -- on a native device it will be a string, which you can then use to send notifications via Firebase Cloud Messaging (Android) or APNS (iOS); on web it will be a registration object (VAPID).

```ts
export interface NativeDevicePushToken {
  type: 'ios' | 'android';
  data: string;
}

export interface WebDevicePushToken {
  type: 'web';
  data: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  };
}

export type DevicePushToken = NativeDevicePushToken | WebDevicePushToken;
```

### `ExpoPushToken`

Borrowing from `DevicePushToken` a little bit, it's an object of `type: 'expo'` and `data: string`. You can use the `data` value to send notifications via Expo Notifications service.

```ts
export interface ExpoPushToken {
  type: 'expo';
  data: string;
}
```

### `ExpoTokenOptions`

When fetching an Expo push token you can sometimes find yourself needing to to override some automatically fetched variable, like `applicationId`, if you do not install `expo-application` (from which `expo-notifications` would fetch application ID). This interface lets you customize `getExpoPushToken` configuration:

```ts
interface ExpoTokenOptions {
  // Endpoint URL override
  baseUrl?: string;

  // Request URL override
  url?: string;

  // Request body overrides
  type?: string;
  deviceId?: string;
  development?: boolean;
  experienceId?: string;
  applicationId?: string;
  devicePushToken?: DevicePushToken;
}
```

### `Subscription`

A common-in-React-Native type to abstract an active subscription. Call `.remove()` to remove the subscription. You can then discard the object.

```ts
export type Subscription = {
  remove: () => void
}
```

### `SetBadgeCountOptions`

`expo-notifications` uses `badgin` on Web to support setting and getting badge count. `badgin` lets developers customize way in which the badge count is applied -- you can do the same using `expo-notifications`.

```ts
export interface SetBadgeCountOptions {
  web?: badgin.Options;
}
```
