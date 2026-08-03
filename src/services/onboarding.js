import { apiRequest } from "./auth.js";

export function getOnboardingState(accessToken, module) {
  return apiRequest(`/api/onboarding/${module}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function recordOnboardingEvent(accessToken, module, event, step = null) {
  return apiRequest(`/api/onboarding/${module}/events`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ event, step }),
  });
}
