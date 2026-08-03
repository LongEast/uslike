import assert from "node:assert/strict";
import test from "node:test";
import {
  AUTH_STORAGE_KEY,
  clearAllLocalStorage,
  createRegistrationPayload,
  createValuesTestPayload,
  loadAuthSession,
  logoutAndClearSession,
  normalizePhone,
  saveAuthSession,
  updateStoredAuthUser,
  uploadAccountAvatar,
  validatePhone,
} from "./auth.js";

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

test("phone validation matches backend rules before onboarding starts", () => {
  assert.equal(normalizePhone("+86 138-0013-8000"), "+8613800138000");
  assert.equal(validatePhone("+86 138-0013-8000"), true);
  assert.equal(validatePhone("12345"), false);
  assert.equal(validatePhone("12+345678"), false);
  assert.equal(validatePhone("1380013800a"), false);
  assert.equal(validatePhone("123456789012345678901"), false);
});

test("registration and values-test payloads are decoupled", () => {
  const payload = createRegistrationPayload(
    { phone: "13800138000", password: "password-1" },
    {
      nickname: " 小橘 ",
      age: "25",
      gender: "神秘",
      region: " 杭州 ",
      interests: ["电影"],
      socialPreferences: ["兴趣搭子"],
    },
  );

  assert.equal(payload.profile.nickname, "小橘");
  assert.equal(payload.profile.age, 25);
  assert.equal("values_test" in payload, false);

  const valuesTest = createValuesTestPayload({
    presentedQuestionIds: ["values-family-public"],
    answers: [
      { questionId: "values-family-public", question: "你会怎么选？", answer: "私下沟通" },
    ],
  });
  assert.deepEqual(valuesTest.presented_question_ids, ["values-family-public"]);
  assert.equal(valuesTest.answers[0].question_id, "values-family-public");
});

test("auth session is saved, restored, and removed after expiry", () => {
  const storage = memoryStorage();
  const expiresAt = "2030-01-01T00:00:00.000Z";
  saveAuthSession(
    { access_token: "token", expires_at: expiresAt, user: { id: "user-1" } },
    storage,
  );

  assert.equal(loadAuthSession(storage, Date.parse("2029-01-01T00:00:00Z")).accessToken, "token");
  assert.equal(loadAuthSession(storage, Date.parse("2031-01-01T00:00:00Z")), null);
  assert.equal(storage.getItem(AUTH_STORAGE_KEY), null);
});

test("account updates replace only the stored public user snapshot", () => {
  const storage = memoryStorage();
  saveAuthSession(
    { access_token: "token", expires_at: "2030-01-01T00:00:00.000Z", user: { id: "user-1", phone: "1" } },
    storage,
  );
  const updated = updateStoredAuthUser({ id: "user-1", phone: "2" }, storage);
  assert.equal(updated.accessToken, "token");
  assert.equal(loadAuthSession(storage, Date.parse("2029-01-01T00:00:00Z")).user.phone, "2");
});

test("clearAllLocalStorage removes app and unrelated origin keys", () => {
  const storage = memoryStorage({ [AUTH_STORAGE_KEY]: "auth", unrelated: "value" });
  clearAllLocalStorage(storage);
  assert.equal(storage.getItem(AUTH_STORAGE_KEY), null);
  assert.equal(storage.getItem("unrelated"), null);
});

test("logout clears all local storage after API success or failure", async () => {
  for (const remoteLogout of [async () => null, async () => Promise.reject(new Error("offline"))]) {
    const storage = memoryStorage({ [AUTH_STORAGE_KEY]: "auth", unrelated: "value" });
    await logoutAndClearSession("token", storage, remoteLogout);
    assert.equal(storage.getItem(AUTH_STORAGE_KEY), null);
    assert.equal(storage.getItem("unrelated"), null);
  }
});

test("avatar upload lets the browser set the multipart content type", async () => {
  const originalFetch = globalThis.fetch;
  let requestOptions;
  globalThis.fetch = async (_url, options) => {
    requestOptions = options;
    return { ok: true, status: 200, json: async () => ({ user: { id: "user-1" } }) };
  };
  try {
    await uploadAccountAvatar("token", new Blob(["avatar"], { type: "image/png" }));
    assert.equal(requestOptions.headers.Authorization, "Bearer token");
    assert.equal("Content-Type" in requestOptions.headers, false);
    assert.equal(requestOptions.body instanceof FormData, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
