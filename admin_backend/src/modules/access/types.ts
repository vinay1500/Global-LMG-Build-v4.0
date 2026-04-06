export interface AuthenticatedActor {
  actorTypeCode: string;
  clientAccountId: number | null;
  displayName: string;
  email: string;
  permissionCodes: string[];
  publicId: string;
  roleCodes: string[];
  userId: number;
}
