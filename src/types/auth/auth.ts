export enum UserRole {
  ADMIN = 'ADMIN',
  OPERADOR = 'OPERADOR',
}

export type User = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
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
