import { Entity, Field } from '@lib-infrastructure/database';

export interface RoleRecord {
  name: string;
  description?: string;
  permissionKeys: string[];
  system: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Entity({
  collection: 'roles',
  autoIndex: true,
  timestamps: true,
  versionKey: false,
  bufferCommands: false,
})
export class RolePersistenceEntity implements RoleRecord {
  @Field({ type: String, required: true, unique: true })
  name!: string;

  @Field({ type: String })
  description?: string;

  // Multikey index: "is this permission still granted?" must not scan every role.
  @Field({ type: [String], default: [], index: true })
  permissionKeys!: string[];

  @Field({ type: Boolean, default: false })
  system!: boolean;

  createdAt!: Date;
  updatedAt!: Date;
}
