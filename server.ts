// Include Nodejs' net module.
import { Interpreter, assign, createMachine, interpret } from 'xstate';
import * as Net from 'net';
import { sendTo, raise, choose } from 'xstate/lib/actions';
import { emulators, Pair, CLOSE_EVENT, INIT_EVENT, NEXT_EVENT, PAIR_EVENT, BUFFER_EVENT, UNPAIR_EVENT, 
    InitEvent, BufferEvent, PairEvent, ReadyEvent, READY_EVENT,
} from './types';

// The port on which the server is listening.
const port = 6374;


function receive(buffer) {
    //console.log("Receiving from client", buffer.toString("hex"), "or", buffer.toString("ascii"));
}

function send(socket, buffer) {
    //console.log("Sending to client", buffer.toString("hex"), "or", buffer.toString("ascii"));
    socket.write(buffer);
}

let clients: Array<Interpreter<any>> = [];

const client = createMachine({
    predictableActionArguments: true,
    id: "client",
    initial: 'inactive',
    context: {
        sessionId: undefined,
        socket: undefined,
        pair: undefined,
        emulator: undefined,
        protocolVersion: undefined,
        rom: undefined,
    } as Pair,
    states: {
        inactive: {
            on: {
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
                [BUFFER_EVENT]: {
                    actions: choose([
                        {
                            cond: (ctx, event) => !!emulators.find((e) => e === (event as BufferEvent).value.toString('hex')),
                            actions: [
                                assign({
                                    emulator: (ctx, event) => emulators.find((e) => e === (event as BufferEvent).value.toString('hex')),
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
                [PAIR_EVENT]: {
                    target: 'paired',
                    actions: assign({
                        pair: (ctx, event) => (event as PairEvent).value,
                    })
                },
                [READY_EVENT]: {
                    actions: choose([
                        {
                            cond: (ctx, event) => {
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
                        sendTo((ctx) => {
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

// Use net.createServer() in your code. This is just for illustration purpose.
// Create a new TCP server.
const server = new Net.Server();
// The server listens to a socket for a client to make a connection request.
// Think of a socket as an end point.
server.listen(port, function() {
    console.log(`Server listening for connection requests on socket localhost:${port}`);
});




// When a client requests a connection with the server, the server creates a new
// socket dedicated to that client.
server.on('connection', function(socket) {
    const id = clients.length;
    const clientActor = interpret(client);

    clientActor.subscribe((c) => {
        if(c.value !== "disconnected") return;
        clients = clients.filter((cl) => cl.sessionId !== c._sessionid);
    })

    clientActor.start();
    console.log(`Client connected with id ${clientActor.sessionId}.`);
    clients.push(clientActor as never);

    // we init this new actor
    clientActor.send({ type: INIT_EVENT, value: { socket, sessionId: clientActor.sessionId }} as InitEvent);
    

    // The server can also receive data from the client by reading from its socket.
    socket.on('data', function(chunk) {
        receive(chunk);
        //console.log(`String: ${chunk.toString("ascii")}`);
        clientActor.send({ type: BUFFER_EVENT, value: chunk} as BufferEvent);
    });

    // When the client requests to end the TCP connection with the server, the server
    // ends the connection.
    socket.on('end', function() {
        clientActor.send({ type: UNPAIR_EVENT });
    });

    // Don't forget to catch error, for your own sake.
    socket.on('error', function(err) {
        console.log(`Error: ${err}`);
    });
});