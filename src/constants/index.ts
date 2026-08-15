export const APP_CONFIG = {
  PORT: process.env.PORT || 5000,
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
  JWT_EXPIRES_IN: '7d',
  BCRYPT_ROUNDS: 10,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

export const SOCKET_EVENTS = {
  // User Personal Room Events
  JOIN_USER: 'join:user',
  LEAVE_USER: 'leave:user',
  NOTIFICATION_NEW: 'notification:new',
  NOTIFICATION_READ: 'notification:read',
  NOTIFICATION_READ_ALL: 'notification:read:all',

  // Project Room Events
  JOIN_PROJECT: 'join:project',
  LEAVE_PROJECT: 'leave:project',

  // Lane Events
  LANE_CREATED: 'lane:created',
  LANE_UPDATED: 'lane:updated',
  LANE_REORDERED: 'lane:reordered',
  LANE_DELETED: 'lane:deleted',

  // Card Events
  CARD_CREATED: 'card:created',
  CARD_UPDATED: 'card:updated',
  CARD_MOVED: 'card:moved',
  CARD_REORDERED: 'card:reordered',
  CARD_DELETED: 'card:deleted',
  CARD_RESTORED: 'card:restored',

  // Comment Events
  COMMENT_CREATED: 'comment:created',
  COMMENT_UPDATED: 'comment:updated',
  COMMENT_DELETED: 'comment:deleted',

  // Tag Events
  TAG_CREATED: 'tag:created',
  TAG_UPDATED: 'tag:updated',
  TAG_DELETED: 'tag:deleted',
  CARD_TAG_ADDED: 'card:tag:added',
  CARD_TAG_REMOVED: 'card:tag:removed',
} as const;

export const REGEX_PATTERNS = {
  USERNAME: /^[a-zA-Z0-9_.-]+$/,
  MENTION: /@([a-zA-Z0-9_.-]+)/g,
} as const;

export const DEFAULT_LANES = [
  { name: 'To Do', color: '#6366f1', position: 1000 },
  { name: 'In Progress', color: '#f59e0b', position: 2000 },
  { name: 'Done', color: '#10b981', position: 3000 },
] as const;

export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Access forbidden',
  ACCOUNT_LOCKED: 'Your account has been locked by an administrator. Please contact support.',
  ACCOUNT_DEACTIVATED: 'Your account has been deactivated. Please contact support.',
  NOT_FOUND: 'Resource not found',
} as const;
