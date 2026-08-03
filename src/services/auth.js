export const AUTH_STORAGE_KEY = "uslike.auth.v1";
const AUTH_STORAGE_VERSION = 1;
const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || "";
const PHONE_PATTERN = /^\+?[0-9]{6,20}$/;

export function normalizePhone(phone) {
  return String(phone || "").replaceAll(" ", "").replaceAll("-", "");
}

export function validatePhone(phone) {
  return PHONE_PATTERN.test(normalizePhone(phone));
}

export async function apiRequest(path, options) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    let message = "请求失败，请稍后重试。";
    try {
      const body = await response.json();
      if (typeof body.detail === "string") message = body.detail;
      else if (Array.isArray(body.detail)) message = body.detail[0]?.msg || message;
    } catch {
      // Keep the friendly fallback for non-JSON/network proxy responses.
    }
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return response.status === 204 ? null : response.json();
}

export function createRegistrationPayload(account, profile) {
  return {
    phone: normalizePhone(account.phone),
    password: account.password,
    profile: {
      nickname: profile.nickname.trim(),
      age: profile.age ? Number(profile.age) : null,
      gender: profile.gender || null,
      region: profile.region?.trim() || null,
      interests: profile.interests || [],
      social_preferences: profile.socialPreferences || [],
    },
  };
}

export function createValuesTestPayload(valuesTest) {
  return {
    version: "v1",
    presented_question_ids: valuesTest.presentedQuestionIds,
    answers: valuesTest.answers.map((answer) => ({
      question_id: answer.questionId,
      question: answer.question,
      answer: answer.answer,
    })),
  };
}

export function toAppUser(apiUser) {
  return {
    id: apiUser.id,
    phone: apiUser.phone,
    nickname: apiUser.profile.nickname,
    avatar: apiUser.profile.avatar,
    age: apiUser.profile.age,
    gender: apiUser.profile.gender,
    region: apiUser.profile.region || "",
    interests: apiUser.profile.interests || [],
    socialPreferences: apiUser.profile.social_preferences || [],
    realNameVerified: apiUser.real_name_verified,
  };
}

export function saveAuthSession(authResponse, storage = window.localStorage) {
  const session = {
    version: AUTH_STORAGE_VERSION,
    accessToken: authResponse.access_token,
    expiresAt: authResponse.expires_at,
    user: authResponse.user,
  };
  storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  return session;
}

export function loadAuthSession(storage = window.localStorage, now = Date.now()) {
  try {
    const raw = storage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    const valid =
      session.version === AUTH_STORAGE_VERSION &&
      typeof session.accessToken === "string" &&
      session.user?.id &&
      Number.isFinite(Date.parse(session.expiresAt)) &&
      Date.parse(session.expiresAt) > now;
    if (!valid) {
      storage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }
    return session;
  } catch {
    storage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export function clearAllLocalStorage(storage = window.localStorage) {
  storage.clear();
}

export function registerUser(payload) {
  return apiRequest("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function loginUser(credentials) {
  return apiRequest("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ ...credentials, phone: normalizePhone(credentials.phone) }),
  });
}

export function logoutUser(accessToken) {
  return apiRequest("/api/auth/logout", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function saveValuesTest(accessToken, valuesTest) {
  return apiRequest("/api/profile/values-test", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(createValuesTestPayload(valuesTest)),
  });
}

export async function logoutAndClearSession(
  accessToken,
  storage = window.localStorage,
  remoteLogout = logoutUser,
) {
  let serverSessionRevoked = true;
  try {
    if (accessToken) await remoteLogout(accessToken);
  } catch {
    serverSessionRevoked = false;
  } finally {
    clearAllLocalStorage(storage);
  }
  return serverSessionRevoked;
}
