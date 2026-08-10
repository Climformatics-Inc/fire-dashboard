export type SessionUser = {
  id: string;
  email: string;
  subscriptionStatus?: string;
  planId?: string | null;
  isAdmin?: boolean;
};

export type SignUpResponse = {
  userId: string;
  email: string;
  status: "created";
  user?: SessionUser;
};

export type SignInResponse = {
  user: SessionUser;
};

export type AuthMeResponse = {
  user: SessionUser | null;
};

export type ApiError = {
  error: string;
  message?: string;
};
