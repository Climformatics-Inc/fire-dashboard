import type {
  AuthenticatedUserResponse,
  AuthMeResponse,
  PlansResponse,
  SessionUser,
  SignInResponse,
  SignUpResponse,
} from "../data/authTypes";

const AUTH_API_BASE = import.meta.env.VITE_AUTH_API_URL as string | undefined;

async function parseError(response: Response) {
  const data = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
  const error = new Error(data.message ?? data.error ?? "request_failed");
  (error as Error & { code?: string }).code = data.error;
  throw error;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  if (!AUTH_API_BASE) {
    throw new Error("Missing VITE_AUTH_API_URL");
  }

  const response = await fetch(`${AUTH_API_BASE}${path}`, {
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    await parseError(response);
  }

  return (await response.json()) as T;
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const payload = await requestJson<AuthMeResponse>("/auth/me");
  return payload.user;
}

export async function signUp(input: { email: string; password: string }): Promise<SessionUser> {
  const data = await requestJson<SignUpResponse>("/auth/signup", {
    method: "POST",
    body: JSON.stringify(input),
  });

  if (data.user) {
    return data.user;
  }

  return signIn(input);
}

export async function signIn(input: { email: string; password: string }): Promise<SessionUser> {
  const payload = await requestJson<SignInResponse>("/auth/signin", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return payload.user;
}

export async function signUpWithAccessCode(input: {
  email: string;
  password: string;
  accessCode: string;
}): Promise<SessionUser> {
  const payload = await requestJson<AuthenticatedUserResponse>("/auth/signup-with-access-code", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return payload.user;
}

export async function activateWithAccessCode(accessCode: string): Promise<SessionUser> {
  const payload = await requestJson<AuthenticatedUserResponse>("/plans/activate-with-access-code", {
    method: "POST",
    body: JSON.stringify({ accessCode }),
  });
  return payload.user;
}

export async function fetchPlans() {
  const payload = await requestJson<PlansResponse>("/plans");
  return payload.plans;
}

export async function selectPlan(planId: string): Promise<SessionUser> {
  const payload = await requestJson<AuthenticatedUserResponse>("/plans/select", {
    method: "POST",
    body: JSON.stringify({ planId }),
  });
  return payload.user;
}

export async function signOut(): Promise<void> {
  await requestJson<{ status: string }>("/auth/signout", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function requestPasswordReset(email: string): Promise<void> {
  await requestJson<{ status: string }>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(input: {
  token: string;
  password: string;
}): Promise<void> {
  await requestJson<{ status: string }>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
