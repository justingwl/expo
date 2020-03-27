// ISO8601 calendar pattern-matching
export interface CalendarTriggerInput {
  type: 'calendar';
  repeats?: boolean;
  value: {
    timezone?: string;

    year?: number;
    month?: number;
    weekday?: number;
    weekOfMonth?: number;
    weekOfYear?: number;
    weekdayOrdinal?: number;
    day?: number;

    hour?: number;
    minute?: number;
    second?: number;
  };
}

export interface TimeIntervalTriggerInput {
  type: 'timeInterval';
  repeats: boolean;
  seconds: number;
}

export interface DateTriggerInput {
  type: 'date';
  timestamp: number; // seconds since 1970
}

export type NotificationTriggerInput =
  | null
  | DateTriggerInput
  | CalendarTriggerInput
  | TimeIntervalTriggerInput;

export interface NotificationRequestInput {
  title?: string;
  subtitle?: string;
  body?: string;
  data?: { [key: string]: unknown };
  badge?: number;
  sound?: boolean | string;
  launchImageName?: string;
  vibrate?: number[];
  priority?: string;
  attachments?: {
    url: string;
    identifier?: string;

    typeHint?: string;
    hideThumbnail?: boolean;
    thumbnailClipArea?: { x: number; y: number; width: number; height: number };
    thumbnailTime?: number;
  }[];
}
