import { emulators, Pair, CLOSE_EVENT, INIT_EVENT, NEXT_EVENT, PAIR_EVENT, BUFFER_EVENT, UNPAIR_EVENT, 
    InitEvent, BufferEvent, PairEvent, ReadyEvent, READY_EVENT,
} from './types';
import { assign, Interpreter, createMachine} from 'xstate';
import { sendTo, raise, choose } from 'xstate/lib/actions';
import * as Net from 'net';

export function createClientMachine(clients: Array<Interpreter<any>>, send: (socket: Net.Socket, buffer: Buffer) => void) {
    return createMachine({ 
        predictableActionArguments: true,
        id: "client",
        initial: 'inactive',
        context: {
            sessionId: undefined,
            socket: undefined as unknown as Net.Socket,
            pair: undefined,
            emulator: undefined,
            protocolVersion: undefined,
            rom: undefined,
        } as Pair,
        states: {
            inactive: {
                on: {
                    [UNPAIR_EVENT]: {
                        target: 'disconnected',
                    },
                    [INIT_EVENT]: {
                        target: "hello",
                        actions: assign({
                            socket: (ctx, event) => (event as InitEvent).value.socket,
                            sessionId: (ctx, event) => (event as InitEvent).value.sessionId,
                        })
                    }
                }
            },
            hello: {
                on: {
                    [UNPAIR_EVENT]: {
                        target: 'disconnected',
                    },
                    [BUFFER_EVENT]: {
                        actions: choose([
                            {
                                cond: (ctx, event) => !!Object.keys(emulators).find((e) => e === (event as BufferEvent).value.toString('hex')),
                                actions: [
                                    assign({
                                        emulator: (ctx, event) => Object.keys(emulators).find((e) => e === (event as BufferEvent).value.toString('hex')),
                                    }),
                                    raise({ type: NEXT_EVENT })
                                ]
                            },
                            {
                                actions: raise({ type: CLOSE_EVENT })
                            }
                        ])
                    },
                    [NEXT_EVENT]: {
                        target: 'waitHandshake',
                    },
                    [CLOSE_EVENT]: {
                        target: 'disconnected',
                    }
                }
            },
            waitHandshake: {
                entry: (ctx) => {
                    const message = `${ctx.emulator}`;
                    send(ctx.socket, Buffer.from(message, "hex"))
                },
                on: {
                    [UNPAIR_EVENT]: {
                        target: 'disconnected',
                    },
                    [BUFFER_EVENT]: {
                        target: 'waitProtocol',
                        actions: assign({
                            rom: (ctx, event) => (event as BufferEvent).value.toString("hex")
                        }),
                    },
                    [CLOSE_EVENT]: 'disconnected',
                }
            },
            waitProtocol: {
                entry: (ctx) => {
                    if(!ctx.rom) throw new Error('Missing ROM');
                    send(ctx.socket, Buffer.from(ctx.rom, "hex"));
                }, 
                on: {
                    [UNPAIR_EVENT]: {
                        target: 'disconnected',
                    },
                    [BUFFER_EVENT]: {
                        target: 'waitPair',
                        actions: [
                            assign({
                                protocolVersion: (ctx, event) => (event as BufferEvent).value.toString("hex")
                            }),
                        ]
                    }
                }
            },
            waitPair: {
                entry: (ctx) => {
                    // we tell others about the new guy in town
                    clients.map((c) => { 
                        if (c.sessionId !== ctx.sessionId) c.send({ type: READY_EVENT, value: ctx} as ReadyEvent) 
                    })
                },
                on: {
                    [UNPAIR_EVENT]: {
                        target: 'disconnected',
                    },
                    [PAIR_EVENT]: {
                        target: 'paired',
                        actions: assign({
                            pair: (ctx, event) => (event as PairEvent).value,
                        })
                    },
                    [READY_EVENT]: {
                        actions: choose([
                            {
                                cond: (ctx: Pair, event) => {
                                    const {
                                        emulator: otherEmulator,
                                        rom: otherRom,
                                        protocolVersion: otherProtocolVersion
                                    } = (event as ReadyEvent).value;
                                    const {
                                        emulator, rom, protocolVersion
                                    } = ctx;
                                    return emulator === otherEmulator && rom === otherRom && protocolVersion == otherProtocolVersion;
                                },
                                actions: [
                                    raise((ctx, event) => ({ type: PAIR_EVENT, value: (event as ReadyEvent).value } as PairEvent)),
                                    sendTo((ctx, event) => {
                                        const wEvent = event as ReadyEvent;
                                        if(!wEvent.value.sessionId) throw new Error("Missing pair sessionId");
                                        return wEvent.value.sessionId as never;
                                    }, (ctx) => ({
                                        type: PAIR_EVENT,
                                        value: ctx,
                                    } as PairEvent) as never)
                                ]
                            }
                        ]),
                    }
                }
            },
            paired: {
                entry: (ctx) => {
                    if(!ctx.protocolVersion) throw new Error("Missing protocolVersion")
                    send(ctx.socket, Buffer.from(ctx.protocolVersion, "hex"))
                },
                on: {
                    [BUFFER_EVENT]: {
                        actions: (ctx, event) => {
                            if(!ctx.pair) throw new Error("Missing pair socket")
                            send(ctx.pair?.socket, event.value);
                        },
                    },
                    [UNPAIR_EVENT]: {
                        target: 'disconnected',
                        actions: [
                            sendTo((ctx: Pair) => {
                                if(!ctx.pair?.sessionId) throw new Error("Missing pair sessionId");
                                return ctx.pair.sessionId as never
                            }, { type: UNPAIR_EVENT } as never),
                        ]
                    }
                }   
            },
            disconnected: {
                type: 'final',
                entry: (ctx) => {
                    ctx.socket.destroy();
                }
            }

        }
    });
}