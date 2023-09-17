// Include Nodejs' net module.
const { assign, createMachine, interpret } = require('xstate');
const Net = require('net');
const { sendTo, raise, choose } = require('xstate/lib/actions');
// The port on which the server is listening.
const port = 6374;

const { 
    MY_OLD_BOY, 
    emulators,
    POKEMON_ROM,
    MY_OLD_BOY_VERSION,
    CONNECT_EVENT,
    RECEIVE_EVENT,
    NEXT_EVENT,
    CLOSE_EVENT,
    PAIR_EVENT,
    UNPAIR_EVENT
} = require('./common');

function receive(buffer) {
    //console.log("Receiving from client", buffer.toString("hex"), "or", buffer.toString("ascii"));
}

function send(socket, buffer) {
    //console.log("Sending to client", buffer.toString("hex"), "or", buffer.toString("ascii"));
    socket.write(buffer);
}

let clients = [];

const client = createMachine({
    predictableActionArguments: true,
    id: "client",
    initial: 'inactive',
    context: {
        index: undefined,
        socket: undefined,
        pair: undefined,
        emulator: undefined,
        protocolVersion: undefined,
        rom: undefined,
    },
    states: {
        inactive: {
            on: {
                [CONNECT_EVENT]: {
                    target: "hello",
                    actions: assign({
                        socket: (ctx, event) => event.value.socket,
                        index: (ctx, event) => event.value.index,
                    })
                }
            }
        },
        hello: {
            on: {
                [RECEIVE_EVENT]: {
                    actions: choose([
                        {
                            cond: (ctx, event) => !!emulators.find((e) => e === event.value.toString('hex')),
                            actions: [
                                assign({
                                    emulator: (ctx, event) => emulators.find((e) => e === event.value.toString('hex')),
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
                [RECEIVE_EVENT]: {
                    target: 'waitProtocol',
                    actions: assign({
                        rom: (ctx, event) => event.value.toString("hex")
                    }),
                },
                [CLOSE_EVENT]: 'disconnected',
            }
        },
        waitProtocol: {
            entry: (ctx) => send(ctx.socket, Buffer.from(ctx.rom, "hex")),
            on: {
                [RECEIVE_EVENT]: {
                    target: 'waitPair',
                    actions: [
                        assign({
                            protocolVersion: (ctx, event) => event.value.toString("hex")
                        }),
                    ]
                }
            }
        },
        waitPair: {
            on: {
                [PAIR_EVENT]: {
                    target: 'paired',
                    actions: assign({
                        pair: (ctx, event) => event.value,
                    })
                }
            }
        },
        paired: {
            entry: (ctx) => send(ctx.socket, Buffer.from(ctx.protocolVersion, "hex")),
            on: {
                [RECEIVE_EVENT]: {
                    actions: (ctx, event) => send(ctx.pair._state.context.socket, event.value),
                },
                [UNPAIR_EVENT]: {
                    target: 'disconnected',
                    actions: [
                        sendTo((ctx) => ctx.pair.sessionId, { type: UNPAIR_EVENT }),
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
    const index = clients.length;
    const clientActor = interpret(client);

    clientActor.subscribe((c) => {
        console.log(`Client ${index}: ${c.value}`)
        const { pair, emulator, rom, protocolVersion} = c.context;
        if(pair || !emulator || !rom || !protocolVersion) return;
        const mate = clients.find((other) => other !== clientActor && !other._state.context.pair && other._state.context.emulator === emulator && other._state.context.rom === rom && other._state.context.protocolVersion === protocolVersion);
        if(!mate) return;
        clientActor.send({ type: PAIR_EVENT, value: mate });
        mate.send({ type: PAIR_EVENT, value: clientActor });
    })

    clientActor.subscribe((c) => {
        if(c.value !== "disconnected") return;
        clients = clients.filter((cl) => cl.sessionId !== c._sessionid);
    })

    clientActor.start();
    clients.push(clientActor);
    console.log(`Client connected with index ${index}.`);

    clientActor.send({ type: CONNECT_EVENT, value: { socket, index }});

    // The server can also receive data from the client by reading from its socket.
    socket.on('data', function(chunk) {
        receive(chunk);
        //console.log(`String: ${chunk.toString("ascii")}`);
        clientActor.send({ type: RECEIVE_EVENT, value: chunk});
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