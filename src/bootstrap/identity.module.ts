import { Module } from '@nestjs/common';
import {
  KeycloakModule,
  KeycloakHttpClient,
} from '@lib-infrastructure/keycloak';
import {
  DatabaseModule,
  UserProfilePersistenceModule,
  PROFILE_REPOSITORY,
  type UserProfileRepositoryPort,
} from '@lib-infrastructure/database';
import {
  loadIdentityConfig,
  type IdentityConfig,
} from './config/identity.config';
import { IDENTITY_CONFIG, IDENTITY_PROVIDER } from './tokens';
import { KeycloakIdentityAdapter } from '../infrastructure/keycloak/keycloak-identity.adapter';
import type { IdentityProviderPort } from '../application/ports/identity-provider.port';
import { AuthorizationPolicy } from '../application/security/authorization.policy';
import * as Cases from '../application/use-cases/identity.use-cases';
import {
  IDENTITY_CASES,
  IdentityController,
} from '../presentation/tcp/identity.controller';
@Module({
  imports: [DatabaseModule, UserProfilePersistenceModule, KeycloakModule],
  controllers: [IdentityController],
  providers: [
    { provide: IDENTITY_CONFIG, useFactory: () => loadIdentityConfig() },
    {
      provide: IDENTITY_PROVIDER,
      inject: [KeycloakHttpClient],
      useFactory: (client: KeycloakHttpClient) =>
        new KeycloakIdentityAdapter(client),
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
