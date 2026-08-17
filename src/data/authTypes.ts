export type SubscriptionStatus = "inactive" | "active" | "past_due" | "cancelled";

export type SessionUser = {
  id: string;
  email: string;
  subscriptionStatus: SubscriptionStatus;
  planId: "basic" | "pro" | null;
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

export type AuthenticatedUserResponse = {
  user: SessionUser;
};

export type AuthMeResponse = {
  user: SessionUser | null;
};

export type Plan = {
  id: "basic" | "pro";
  name: string;
  description: string;
  priceCents: number;
  currency: string;
  billingInterval: string;
};

export type PlansResponse = {
  plans: Plan[];
};

export type ApiError = {
  error: string;
  message?: string;
};

export function hasActiveSubscription(user: SessionUser | null | undefined): boolean {
  return user?.subscriptionStatus === "active";
}
