"use client";

import { SocketStatusEvent} from './../src/SocketEvents';
import { useApp } from './useApp';
import {
    Hr, 
    BadgeSplitted,
} from 'nes-ui-react';
import React, { useCallback, useState } from 'react';
import { SocketServerEvent } from '@/src/SocketEvents';

interface IServerStatus {
    started: boolean,
    clients: number,
}

export default function Status() {
    const { socket } = useApp();

    const [status, _setStatus] = useState<IServerStatus | undefined>(undefined);

    const setStatus = (s) => {
        console.log("statusComponent", s);
        _setStatus(s);
    }

    const onDisconnect = useCallback(() => setStatus(undefined), []);

    React.useEffect(() => {
        socket?.on(SocketStatusEvent, setStatus);
        socket?.on("disconnect", onDisconnect);
        return () => {
            socket?.off(SocketStatusEvent, setStatus)
            socket?.off("disconnect", onDisconnect);
        };
    }, []);

    return (
        <>
            {
                !status ? (
                    <BadgeSplitted textLeft='Server' backgroundColor="primary" text="loading..." />
                ) : (
                    <div className='flex justify-between items-center'>
                        <BadgeSplitted textLeft='Server' backgroundColor={status.started ? "success" : "error"} text={status.started ? "running" : "down"} />
                        <span className='text-white'>
                            Clients connected: {status.clients}
                        </span>
                    </div>
                )
            }

        </>
    )
}