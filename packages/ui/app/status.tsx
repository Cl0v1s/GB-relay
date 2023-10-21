"use client";

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

    const [status, setStatus] = useState<IServerStatus | undefined>(undefined);

    const onDisconnect = useCallback(() => setStatus(undefined), []);

    React.useEffect(() => {
        socket?.on("status" as SocketServerEvent, setStatus);
        socket?.on("disconnect", onDisconnect);
        return () => {
            socket?.off("status" as SocketServerEvent, setStatus)
            socket?.off("disconnect", onDisconnect);
        };
    }, []);

    return (
        <>
            <Hr color="primary" height={4} className='mb-1' />
            <Hr color="success" height={2} className='mb-2' />
            {
                !status ? (
                    <BadgeSplitted textLeft='Server' backgroundColor="primary" text="loading..." />
                ) : (
                    <div className='flex justify-between items-center'>
                        <BadgeSplitted textLeft='Server' backgroundColor={status.started ? "success" : "error"} text={status.started ? "running" : "down"} />
                        <span>
                            Clients connected: {status.clients}
                        </span>
                    </div>
                )
            }

        </>
    )
}