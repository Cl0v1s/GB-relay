"use client";

import React from 'react';
import { useApp } from './useApp';
import { Emulators as _Emulators } from 'server';
import { GameClient, SocketYouReadyEvent, SocketStatusEvent } from './../src/SocketEvents';
import cartridge from './../public/cartridge.png'
import MyOldBoy from './../public/00000006000100000004.png';
import { StaticImageData } from 'next/image';
import { PressStart2P } from './fonts';


const Emulators = _Emulators as { [index: string]: string };

const Icons = {
    // My Old Boy
    "00000006000100000004": MyOldBoy
} as {
    [index: string]: StaticImageData
}

const dummy = {
    emulator: "00000006000100000004",
    id: "x:2",
    rom: "0000003d000232626166393262633661613663393236326135313433376636386635353065300019706b6d6e20706f6c6973686564206372797374616c2e676263",
}

function Client({ emulator, id, rom, me = false }: GameClient & { me?: boolean }) {
    const { gameName, gameHash } = React.useMemo(() => {
        const game = Buffer.from(rom, "hex").toString("ascii");
        const hash = game.match(/([a-z0-9]+)/);
        if(!hash) return {
            gameName: game,
            gameHash: null,
        }
        const index = game.indexOf(hash[1]) + hash[1].length;
        return {
            gameName: game.slice(index).trim(),
            gameHash: hash[1].trim(),
        }
    }, []);

    return (
        <div className='relative shrink-0'>
            <img src={cartridge.src} className={ me ? 'hue-rotate-180' : undefined } />
            <div className='flex flex-col p-2 bg-gray-400 absolute left-[40px] top-[80px] w-[105px] h-[110px]' >
                <div className={`grow h-0 capitalize font-bold text-gray-700 ${PressStart2P.className} text-ellipsis overflow-hidden`} style={PressStart2P.style}>
                    {gameName}
                </div>
                <div>
                    <img alt={Emulators[emulator]} className='w-[32px] ml-auto' src={Icons[emulator]?.src} />
                </div>
            </div>
        </div>
    )
}

export default function Clients() {
    const { socket } = useApp();

    const [others, setOthers] = React.useState<Array<GameClient>>([]);
    const [me, setMe] = React.useState<GameClient | undefined>(undefined);

    const onStatus = React.useCallback(({ clientsReady }: { clientsReady: Array<GameClient>}) => {
        console.log("clientComponent", clientsReady.filter((c) => c.id !== me?.id));
        setOthers(clientsReady.filter((c) => c.id !== me?.id))
    }, []);

    const onYouReady = React.useCallback((client: GameClient) => {
        console.log("Ready", client);
        setMe(client);
    }, []);

    const onDisconnect = React.useCallback(() => {
        setOthers([]);
        setMe(undefined);
    }, []);

    React.useEffect(() => {
        socket?.on(SocketStatusEvent, onStatus);
        socket?.on(SocketYouReadyEvent, onYouReady);
        socket?.on("disconnect", onDisconnect);
        return () => {
        socket?.off(SocketStatusEvent, onStatus);
        socket?.off(SocketYouReadyEvent, onYouReady);
        socket?.off("disconnect", onDisconnect);
        };
    }, []);

    return (
        <div className="flex grow items-center gap-20 p-5">
            {
                me && (
                    <div className='shrink flex items-center'>
                        <Client {...me} me />
                    </div>
                )
            }
            <div className='grow flex items-center justify-center w-0 flex-wrap gap-10'>
                {
                    others.map((c) => <Client key={c.id} {...c} />)
                }
            </div>
        </div>
    );
}