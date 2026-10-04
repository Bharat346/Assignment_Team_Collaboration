// Valid status transitions
const VALID_TRANSITIONS = {
  'OPEN': ['IN_PROGRESS', 'CLOSED'],
  'IN_PROGRESS': ['BLOCKED', 'RESOLVED', 'OPEN'],
  'BLOCKED': ['IN_PROGRESS', 'OPEN'],
  'RESOLVED': ['CLOSED', 'IN_PROGRESS', 'OPEN'],
  'CLOSED': ['OPEN'],
};

export const STATUSES = ['OPEN', 'IN_PROGRESS', 'BLOCKED', 'RESOLVED', 'CLOSED'];
export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
export const ROLES = ['MEMBER', 'LEAD', 'ADMIN'];

export function isValidTransition(from, to) {
  return STATUSES.includes(to);
}

export function getValidTransitions(status) {
  return STATUSES;
}

export const STATUS_LABELS = {
  'OPEN': 'Open',
  'IN_PROGRESS': 'In Progress',
  'BLOCKED': 'Blocked',
  'RESOLVED': 'Resolved',
  'CLOSED': 'Closed',
};

export const PRIORITY_LABELS = {
  'LOW': 'Low',
  'MEDIUM': 'Medium',
  'HIGH': 'High',
  'CRITICAL': 'Critical',
};

export const ROLE_LABELS = {
  'MEMBER': 'Member',
  'LEAD': 'Lead',
  'ADMIN': 'Admin',
};
