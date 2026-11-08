import { Module } from '@nestjs/common';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import {
  loadIdentityConfig,
  type IdentityConfig,
} from './config/identity.config';
import {
  IDENTITY_CONFIG,
  IDENTITY_PROVIDER,
  PROFILE_REPOSITORY,
} from './tokens';
import { KeycloakHttpClient } from '../infrastructure/keycloak/keycloak-http.client';
import { KeycloakIdentityAdapter } from '../infrastructure/keycloak/keycloak-identity.adapter';
import {
  MongooseUserProfileRepository,
  PROFILE_MODEL,
  ProfileSchema,
  type ProfileRecord,
} from '../infrastructure/persistence/mongoose/user-profile.repository';
import type { IdentityProviderPort } from '../application/ports/identity-provider.port';
import type { UserProfileRepositoryPort } from '../application/ports/user-profile-repository.port';
import { AuthorizationPolicy } from '../application/security/authorization.policy';
import * as Cases from '../application/use-cases/identity.use-cases';
import {
  IDENTITY_CASES,
  IdentityController,
} from '../presentation/tcp/identity.controller';
@Module({
  imports: [
    MongooseModule.forRootAsync({
      useFactory: () => ({
        uri: loadIdentityConfig().mongoUri,
        serverSelectionTimeoutMS: 3000,
        connectTimeoutMS: 3000,
        socketTimeoutMS: 3000,
        retryAttempts: 0,
        autoIndex: true,
      }),
    }),
    MongooseModule.forFeature([{ name: PROFILE_MODEL, schema: ProfileSchema }]),
  ],
  exports: [MongooseModule],
  controllers: [IdentityController],
  providers: [
    { provide: IDENTITY_CONFIG, useFactory: () => loadIdentityConfig() },
    {
      provide: IDENTITY_PROVIDER,
      inject: [IDENTITY_CONFIG],
      useFactory: (config: IdentityConfig) =>
        new KeycloakIdentityAdapter(new KeycloakHttpClient(config)),
    },
    {
      provide: PROFILE_REPOSITORY,
      inject: [getModelToken(PROFILE_MODEL)],
      useFactory: async (model: Model<ProfileRecord>) => {
        await model.init();
        return new MongooseUserProfileRepository(model);
      },
    },
    {
      provide: IDENTITY_CASES,
      inject: [IDENTITY_PROVIDER, PROFILE_REPOSITORY, IDENTITY_CONFIG],
      useFactory: (
        identity: IdentityProviderPort,
        profiles: UserProfileRepositoryPort,
        config: IdentityConfig,
      ) => {
        const auth = new AuthorizationPolicy(config.issuer);
        return {
          create: new Cases.CreateUser(identity, auth),
          list: new Cases.ListUsers(identity, auth),
          get: new Cases.GetUser(identity, profiles, auth),
          update: new Cases.UpdateUser(identity, auth),
          status: new Cases.SetUserStatus(identity, auth),
          roles: new Cases.ListRoles(identity, auth),
          assign: new Cases.AssignUserRole(identity, auth),
          remove: new Cases.RemoveUserRole(identity, auth),
          reset: new Cases.SendPasswordResetEmail(identity, auth),
          me: new Cases.GetMe(identity, profiles, auth),
          profile: new Cases.UpdateMyProfile(identity, profiles, auth),
        };
      },
    },
  ],
})
export class IdentityModule {}
