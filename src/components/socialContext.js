import { createContext, useContext } from "react";

export const SocialContext = createContext(null);

export function useSocialData() {
  const value = useContext(SocialContext);
  if (!value) throw new Error("useSocialData 必须在 SocialProvider 内使用");
  return value;
}

