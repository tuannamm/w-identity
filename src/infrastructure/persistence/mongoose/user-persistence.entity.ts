import { Entity, Field } from '@lib-infrastructure/database';
import type { ProfilePatch } from '../../../domain/models/user';

export interface ProfileRecord extends ProfilePatch {
  keycloakUserId: string;
  createdAt: Date;
  updatedAt: Date;
}

@Entity({
  collection: 'users',
  autoIndex: true,
  timestamps: true,
  versionKey: false,
  bufferCommands: false,
})
export class UserPersistenceEntity implements ProfileRecord {
  @Field({ type: String, required: true, unique: true })
  keycloakUserId!: string;

  @Field({ type: String })
  avatarUrl?: string;

  @Field({ type: String })
  phoneNumber?: string;

  @Field({ type: String })
  timezone?: string;

  @Field({ type: String })
  locale?: string;

  createdAt!: Date;
  updatedAt!: Date;
}
