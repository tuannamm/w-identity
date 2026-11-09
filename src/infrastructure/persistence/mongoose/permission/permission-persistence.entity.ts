import { Entity, Field } from '@lib-infrastructure/database';

export interface PermissionRecord {
  key: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

@Entity({
  collection: 'permissions',
  autoIndex: true,
  timestamps: true,
  versionKey: false,
  bufferCommands: false,
})
export class PermissionPersistenceEntity implements PermissionRecord {
  @Field({ type: String, required: true, unique: true })
  key!: string;

  @Field({ type: String })
  description?: string;

  createdAt!: Date;
  updatedAt!: Date;
}
