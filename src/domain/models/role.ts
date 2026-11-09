export interface Role {
  name: string;
  description?: string;
  permissionKeys: string[];
  /** System roles (admin, user) are immutable and cannot be deleted. */
  system: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface CreateRole {
  name: string;
  description?: string;
  permissionKeys?: string[];
}
export interface RolePatch {
  description?: string;
}
/** Each user holds exactly one role. */
export interface UserRole {
  userId: string;
  roleName: string;
}
