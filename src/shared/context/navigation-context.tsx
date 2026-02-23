import * as React from 'react';

export type NavigationParams = any;
type NavigationContextState = {
  params?: NavigationParams;
  setParams: (params: NavigationParams) => void;
};

type NavigationContextProviderProps = {
  children: React.ReactNode;
};

const defaultContextState: NavigationContextState = {
  params: undefined,
  setParams: () => {},
};

export const NavigationContext = React.createContext(defaultContextState);

export function NavigationContextProvider({ children }: NavigationContextProviderProps) {
  const [params, setParams] = React.useState(defaultContextState);

  return (
    <NavigationContext.Provider value={{ params, setParams }}>
      {children}
    </NavigationContext.Provider>
  );
}
