import assert from "node:assert/strict";
import test from "node:test";
import { selectAccountSection } from "./accountScroll.js";

const ids = ["account-info", "profile", "password-security", "values-test"];

test("account scroll spy selects the last section above the observation line", () => {
  assert.equal(
    selectAccountSection(ids, {
      "account-info": -600,
      profile: -120,
      "password-security": 140,
      "values-test": 800,
    }, 180),
    "password-security",
  );
  assert.equal(
    selectAccountSection(ids, {
      "account-info": 80,
      profile: 700,
      "password-security": 1300,
      "values-test": 1900,
    }, 180),
    "account-info",
  );
});

test("account scroll spy selects the final section at page bottom", () => {
  assert.equal(selectAccountSection(ids, {}, 180, true), "values-test");
});
