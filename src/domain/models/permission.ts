/** Permission key has the form `resource:action`, e.g. `users:read`. */
export interface Permission {
  key: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}
export interface CreatePermission {
  key: string;
  description?: string;
}
