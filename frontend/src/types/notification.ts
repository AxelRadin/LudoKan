export type NotificationActor = {
  id: number | null;
  type: string;
  repr: string;
} | null;

export type NotificationTarget = {
  id: number | null;
  type: string;
  repr: string;
} | null;

export type NotificationExtra = Record<string, unknown> | null;

export type NotificationItem = {
  id: number;
  type: string;
  verb: string;
  actor: NotificationActor;
  target: NotificationTarget;
  extra: NotificationExtra;
  timestamp: string;
  unread: boolean;
};

export type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};
