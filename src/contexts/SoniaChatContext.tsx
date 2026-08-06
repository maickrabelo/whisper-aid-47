import { createContext, useContext, useState, ReactNode } from "react";

interface SoniaChatContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const SoniaChatContext = createContext<SoniaChatContextType>({ isOpen: false, setIsOpen: () => {} });

export function useSoniaChat() {
  return useContext(SoniaChatContext);
}

export function SoniaChatProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <SoniaChatContext.Provider value={{ isOpen, setIsOpen }}>
      {children}
    </SoniaChatContext.Provider>
  );
}

export function SoniaChatLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
