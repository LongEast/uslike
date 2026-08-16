import { createContext, useContext, useRef } from "react";

const TutorialPositionContext = createContext(null);

export function TutorialPositionProvider({ children }) {
  const positionRef = useRef(null);
  return (
    <TutorialPositionContext.Provider value={positionRef}>
      {children}
    </TutorialPositionContext.Provider>
  );
}

export function useTutorialPositionRef() {
  const sharedPositionRef = useContext(TutorialPositionContext);
  const fallbackPositionRef = useRef(null);
  return sharedPositionRef || fallbackPositionRef;
}
