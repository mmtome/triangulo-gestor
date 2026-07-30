"use client";

import { createContext, useContext } from "react";

export type ContextUser = {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
};

export type ContextProject = {
  id: string;
  name: string;
  color: string;
  favorite: boolean;
};

type AppContextValue = {
  users: ContextUser[];
  projects: ContextProject[];
  currentUser: { id: string; name: string; email: string; role: string; avatarColor: string };
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppContextProvider({
  users,
  projects,
  currentUser,
  children,
}: AppContextValue & { children: React.ReactNode }) {
  return (
    <AppContext.Provider value={{ users, projects, currentUser }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext precisa estar dentro de AppContextProvider");
  return ctx;
}
