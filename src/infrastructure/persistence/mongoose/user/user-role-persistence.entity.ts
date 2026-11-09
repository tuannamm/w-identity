import { Entity, Field } from '@lib-infrastructure/database';

export interface UserRoleRecord {
  keycloakUserId: string;
  roleName: string;
  createdAt: Date;
  updatedAt: Date;
}

@Entity({
  collection: 'user_roles',
  autoIndex: true,
  timestamps: true,
  versionKey: false,
  bufferCommands: false,
})
export class UserRolePersistenceEntity implements UserRoleRecord {
  // Unique: a user holds exactly one role.
  @Field({ type: String, required: true, unique: true })
  keycloakUserId!: string;

  @Field({ type: String, required: true, index: true })
  roleName!: string;

  createdAt!: Date;
  updatedAt!: Date;
}
