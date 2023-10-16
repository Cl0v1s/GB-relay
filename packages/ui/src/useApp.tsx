import React, { createContext, useContext, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';

interface IAppContext {
    socket: Socket | undefined
}

const AppContext = createContext<IAppContext>({
    socket: undefined,
});

export function AppContextProvider({ children }: { children: React.ReactNode}) {
    const socket = useMemo(() => io("", { path: "/api/socket" }), []);

    return <AppContext.Provider value={{socket}}>{children}</AppContext.Provider>
}

export function useApp() {
    const context = useContext(AppContext);
    return context;
}