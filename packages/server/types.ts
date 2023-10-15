import * as Net from 'net';
import { AnyActorRef } from "xstate";

const MY_OLD_BOY = "00000006000100000004";

export const emulators = [MY_OLD_BOY];

const POKEMON_ROM = "0000003d000232626166393262633661613663393236326135313433376636386635353065300019706b6d6e20706f6c6973686564206372797374616c2e676263";
const MY_OLD_BOY_VERSION = "000000020003";

export const INIT_EVENT = "INIT";
export const BUFFER_EVENT = "BUFFER";
export const NEXT_EVENT = "NEXT_EVENT";
export const CLOSE_EVENT = "CLOSE";
export const PAIR_EVENT = "PAIR";
export const UNPAIR_EVENT = "UNPAIR";
export const READY_EVENT = "READY";

export interface Pair {
 sessionId?: AnyActorRef | string,
 socket?: any,
 emulator?: string,
 protocolVersion?: string,
 rom?: string,
 pair?: Pair
}

export interface InitEvent {
    type: typeof INIT_EVENT,
    value: {
        socket: Net.Socket,
        sessionId: AnyActorRef | string,
    }
}

export interface BufferEvent {
    type: typeof BUFFER_EVENT,
    value: Buffer,
}

export interface PairEvent {
    type: typeof PAIR_EVENT,
    value: Pair,
}

export interface ReadyEvent {
    type: typeof READY_EVENT,
    value: Pair,
}

export interface Console {
    log: (...pars) => void,
    warn: (...pars) => void,
    error: (...pars) => void,
}