export interface UserInfo {
  _id: string;
  userName?: string;
  fullName?: string;
  email?: string;
}

export interface GroupMember {
  userId: UserInfo;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  joinedAt: Date | string;
}

export interface Group {
  _id: string;
  groupName: string;
  description?: string;
  creatorId: string;
  members: GroupMember[];
  
  createdAt?: string; 
  updatedAt?: string;
}