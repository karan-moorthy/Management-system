// Export all types from this module
export * from './task';

// Common utility types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// User related types
export interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Workspace related types
export interface Workspace {
  id: string;
  name: string;
  imageUrl?: string;
  inviteCode: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Project related types
export interface Project {
  id: string;
  name: string;
  imageUrl?: string;
  workspaceId: string | null;
  postDate?: Date | string | null;
  tentativeEndDate?: Date | string | null;
  assignees?: string[] | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// Member related types
export type MemberRole = 'ADMIN' | 'MEMBER';

export interface Member {
  id: string;
  userId: string;
  workspaceId: string;
  role: MemberRole;
  createdAt: Date;
  updatedAt: Date;
  user?: User;
}

// Invitation related types
export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';

export interface Invitation {
  id: string;
  email: string;
  workspaceId: string;
  invitedBy: string;
  status: InvitationStatus;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}