// Include Nodejs' net module.
import { Interpreter, interpret, State } from 'xstate';
import * as Net from 'net';
import { INIT_EVENT, BUFFER_EVENT, UNPAIR_EVENT, 
    InitEvent, BufferEvent, Console, Pair, emulators
} from './types';

import { createClientMachine} from './clientMachine';

export type Event = "start" | "connection" | "end" | "clientReady";
export { emulators as Emulators };
type Subscriber = (eventName: Event, eventProps: object) => void;


class Server {
    port = 6374;

    clients: Array<Interpreter<any>> = [];
    server: Net.Server = new Net.Server();

    started: boolean = false;
    private console: Console = global.console;
    private subscribers: Array<Subscriber> = [];

    constructor(port?: number, console?: Console) {
        this.port = port || 6374;
        if(console) this.console = console;
    }

    start() {
        this.server.listen(this.port, () => {
            this.console.log(`Server listening for connection requests on socket localhost:${this.port}`);
        });

        // When a client requests a connection with the server, the server creates a new
        // socket dedicated to that client.
        this.server.on('connection', (socket) =>  this.onConnection(socket));

        this.started = true;

        this.signal("start")
    }

    subscribe(subscriber: Subscriber) {
        this.subscribers.push(subscriber);
    }

    unsubscribe(subscriber: Subscriber) {
        this.subscribers = this.subscribers.filter((s) => s !== subscriber);
    }

    private signal(eventName: Event, eventProps: object = {}) {
        this.subscribers.forEach((sub) => sub(eventName, eventProps));
    }

    private receive(buffer) {
        if(process.env.NODE_ENV === "development") {
            this.console.log("Receiving from client", buffer.toString("hex"), "or", buffer.toString("ascii"));
        }
    }
    
    private send(socket, buffer) {
        if(process.env.NODE_ENV === "development") {
            this.console.log("Sending to client", buffer.toString("hex"), "or", buffer.toString("ascii"));
        }
        socket.write(buffer);
    }

    private cleanUp(client: State<Pair, any, any, {
        value: any;
        context: Pair;
    }, any>) {
        this.console.log(`${client._sessionid} cleaned up !`)
        this.signal('end', { client })
        this.clients = this.clients.filter((cl) => cl.sessionId !== client._sessionid);
    }

    private onConnection(socket) {
        const client = interpret(createClientMachine(this.clients, (socket, buffer) => this.send(socket, buffer)));
        client.subscribe((c) => {
            if(c.value === "disconnected") this.cleanUp(c);
            else if(c.value === "waitPair") this.signal("clientReady", { emulator: c.context.emulator, rom: c.context.rom, ip: c.context.socket?.remoteAddress })

        })
        client.start();
        this.console.log(`Client connected with id ${client.sessionId}.`);
        
        // The server can also receive data from the client by reading from its socket.
        socket.on('data', (chunk) => {
            this.receive(chunk);
            //console.log(`String: ${chunk.toString("ascii")}`);
            client.send({ type: BUFFER_EVENT, value: chunk} as BufferEvent);
        });

        // When the client requests to end the TCP connection with the server, the server
        // ends the connection.
        socket.on('end', () => {
            this.console.log(`${client.sessionId} disconnected`)
            client.send({ type: UNPAIR_EVENT });
        });

        // Don't forget to catch error, for your own sake.
        socket.on('error', (err) => {
            this.console.log(`Error: ${err}`);
        });

        // let's go
        this.clients.push(client as unknown as Interpreter<any>);
        // we init this new actor
        client.send({ type: INIT_EVENT, value: { socket, sessionId: client.sessionId }} as InitEvent);
        this.signal("connection", { client });
    }
}

export { Server };