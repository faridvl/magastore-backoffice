import * as React from 'react';

type DashboardContextState = {
  title?: string;
  setTitle: (title: string) => void;
};

type DashboardContextProviderProps = {
  children: React.ReactNode;
};

const defaultContextState: DashboardContextState = {
  title: undefined,
  setTitle: () => {},
};

export const DashboardContext = React.createContext(defaultContextState);

export function DashboardContextProvider({ children }: DashboardContextProviderProps) {
  const [title, setTitle] = React.useState(defaultContextState.title);

  return (
    <DashboardContext.Provider value={{ title, setTitle }}>{children}</DashboardContext.Provider>
  );
}
