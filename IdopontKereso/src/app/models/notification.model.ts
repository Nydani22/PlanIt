export interface Notification {
  _id: string;
  recipientId: string;
  senderId?: {
    _id: string;
    userName?: string;
    fullName?: string;
  } | string;
  groupId?: {
    _id: string;
    groupName?: string;
  } | string;
  type: 'INVITE' | 'ROLE_CHANGE' | 'MEMBER_REMOVED' | 'MEMBER_LEFT' | 'SYSTEM';
  message: string;
  isRead: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}