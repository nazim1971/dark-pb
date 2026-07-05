import { RegistrationType, Role, UserStatus } from "@prisma/client";

export interface UserProfileResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  status?: UserStatus;
  registrationType?: RegistrationType;
  legalName?: string | null;
  stageName?: string | null;
  country?: string | null;
  phone?: string | null;
  dateOfBirth?: Date | null;
  pro?: string | null;
  ipiNumber?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthTokenResponse {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: string;
  user: UserProfileResponse;
}
