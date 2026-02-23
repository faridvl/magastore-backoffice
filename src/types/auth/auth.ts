export type User = {
  name: string;
  email: string;
};

export type LoginResponse = {
  access_token: string;
  user: User;
};

export type LoginCredentials = {
  email: string;
  password?: string;
};

export type FormActions = {
  setSubmitting: (isSubmitting: boolean) => void;
};

export enum TenantPlan {
  FREE = 'FREE',
  PREMIUM = 'PREMIUM',
  ENTERPRISE = 'ENTERPRISE',
}

export enum UserRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  DOCTOR = 'DOCTOR',
  STAFF = 'STAFF',
}

export type TenantDomain = {
  uuid: string;
  businessName: string;
  plan: TenantPlan;
  createdAt: string;
};

export type UserDomain = {
  uuid: string;
  email: string;
  fullName: string;
  role: UserRole;
  tenantId: number;
  createdAt: string;
};

export type UserSessionResponse = {
  user: UserDomain;
  tenant: TenantDomain;
};
