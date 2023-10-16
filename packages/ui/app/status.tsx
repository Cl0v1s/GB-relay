"use client";

import {
    Hr, 
    BadgeSplitted,
    Badge
} from 'nes-ui-react';

interface IStatus {
    status: false | { started: boolean, clients: number }
}

export default function Status({ status }: IStatus) {
    return (
        <>
            <Hr color="primary" height={4} className='mb-1' />
            <Hr color="success" height={2} className='mb-2' />
            {
                !status ? (
                    <Badge backgroundColor="error" text="Error" />
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