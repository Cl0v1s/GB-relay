"use client";

import {
    Hr, 
    BadgeSplitted
  } from 'nes-ui-react';

export default function Status({started}: {started: boolean}) {
    return (
        <>
            <Hr color="primary" height={4} className='mb-1' />
            <Hr color="success" height={2} />
            <div className='flex justify-between mt-2'>
            <BadgeSplitted textLeft='Server' backgroundColor={started ? "success" : "error"} text={started ? "running" : "down"} />
            </div>
        </>
    )
}