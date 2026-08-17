import type { SessionUser, SubscriptionStatus } from "../data/authTypes";

const LOCAL_SESSION_EMAIL_KEY = "fire_dashboard_local_session_email";
const LOCAL_TEST_SUBSCRIPTION_KEY = "fire_dashboard_local_test_subscription";
const LEGACY_SESSION_KEY = "fire_dashboard_local_admin_session";
const LEGACY_SUBSCRIPTION_KEY = "fire_dashboard_local_admin_subscription";

const DEMO_ACCESS_CODES = new Set(["sonoma_clean_power", "climformatics_inc"]);

const DEFAULT_TEST_EMAIL = "test@fire-dash.local";
const DEFAULT_TEST_PASSWORD = "Admin1234!";

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function normalizePassword(value: string): string {
  return value.trim();
}

function adminCredentials() {
  return {
    email: normalizeEmail(
      (import.meta.env.VITE_ADMIN_USERNAME as string | undefined) ?? "admin@fire-dash.local",
    ),
    password: normalizePassword(
      (import.meta.env.VITE_ADMIN_PASSWORD as string | undefined) || "",
    ),
  };
}

function testCredentials() {
  return {
    email: normalizeEmail(
      (import.meta.env.VITE_TEST_USERNAME as string | undefined) ?? DEFAULT_TEST_EMAIL,
    ),
    password: normalizePassword(
      (import.meta.env.VITE_TEST_PASSWORD as string | undefined) || DEFAULT_TEST_PASSWORD,
    ),
  };
}

function migrateLegacySession(): void {
  if (typeof window === "undefined") {
    return;
  }

  if (window.sessionStorage.getItem(LOCAL_SESSION_EMAIL_KEY)) {
    return;
  }

  if (window.sessionStorage.getItem(LEGACY_SESSION_KEY) === "true") {
    window.sessionStorage.setItem(
      LOCAL_SESSION_EMAIL_KEY,
      adminCredentials().email,
    );
    window.sessionStorage.removeItem(LEGACY_SESSION_KEY);
  }

  if (
    window.sessionStorage.getItem(LEGACY_SUBSCRIPTION_KEY) === "active" &&
    !window.sessionStorage.getItem(LOCAL_TEST_SUBSCRIPTION_KEY)
  ) {
    window.sessionStorage.setItem(LOCAL_TEST_SUBSCRIPTION_KEY, "active");
    window.sessionStorage.removeItem(LEGACY_SUBSCRIPTION_KEY);
  }
}

function getSessionEmail(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  migrateLegacySession();
  const email = window.sessionStorage.getItem(LOCAL_SESSION_EMAIL_KEY);
  return email ? normalizeEmail(email) : null;
}

function getTestSubscriptionStatus(): SubscriptionStatus {
  if (typeof window === "undefined") {
    return "inactive";
  }
  return window.sessionStorage.getItem(LOCAL_TEST_SUBSCRIPTION_KEY) === "active"
    ? "active"
    : "inactive";
}

export function buildLocalSessionUser(): SessionUser {
  const email = getSessionEmail();
  const admin = adminCredentials();
  const test = testCredentials();

  if (email === admin.email) {
    return {
      id: "local-admin",
      email: admin.email,
      subscriptionStatus: "active",
      planId: "pro",
      isAdmin: true,
    };
  }

  if (email === test.email) {
    const subscriptionStatus = getTestSubscriptionStatus();
    return {
      id: "local-test",
      email: test.email,
      subscriptionStatus,
      planId: subscriptionStatus === "active" ? "basic" : null,
      isAdmin: false,
    };
  }

  return {
    id: "local-unknown",
    email: email ?? "unknown",
    subscriptionStatus: "inactive",
    planId: null,
    isAdmin: false,
  };
}

/** @deprecated Use buildLocalSessionUser */
export const buildLocalAdminUser = buildLocalSessionUser;

export function isLocalAdminConfigured(): boolean {
  const admin = adminCredentials();
  const test = testCredentials();
  return admin.password.length > 0 || test.password.length > 0;
}

export function isLocalAdminAuthenticated(): boolean {
  return getSessionEmail() !== null;
}

export function signInLocalAdmin(username: string, password: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const normalizedInput = normalizeEmail(username);
  const normalizedPassword = normalizePassword(password);
  const admin = adminCredentials();
  const test = testCredentials();

  if (!admin.password && !test.password) {
    throw new Error("Local login is not configured.");
  }

  if (normalizedInput === admin.email && normalizedPassword === admin.password) {
    window.sessionStorage.setItem(LOCAL_SESSION_EMAIL_KEY, admin.email);
    return true;
  }

  if (normalizedInput === test.email && normalizedPassword === test.password) {
    window.sessionStorage.setItem(LOCAL_SESSION_EMAIL_KEY, test.email);
    return true;
  }

  return false;
}

export function activateLocalAdminSubscription(accessCode: string): boolean {
  const normalizedCode = accessCode.trim();
  if (!DEMO_ACCESS_CODES.has(normalizedCode)) {
    return false;
  }

  window.sessionStorage.setItem(LOCAL_TEST_SUBSCRIPTION_KEY, "active");
  return true;
}

export function signOutLocalAdmin(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.sessionStorage.removeItem(LOCAL_SESSION_EMAIL_KEY);
  window.sessionStorage.removeItem(LOCAL_TEST_SUBSCRIPTION_KEY);
  window.sessionStorage.removeItem(LEGACY_SESSION_KEY);
  window.sessionStorage.removeItem(LEGACY_SUBSCRIPTION_KEY);
}
