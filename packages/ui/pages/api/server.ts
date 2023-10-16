import { Server as LinkServer, Event as LinkEvent } from 'server';
import { Server as IOServer } from 'socket.io';
import type { Server as HTTPServer } from 'http'

let instance = (global as any).server;

if(!instance) {
    instance = new LinkServer();
    instance.start();
    (global as any).server = instance;
}

export { instance };

type SocketClientEvent = "ask-status";
type SocketServerEvent = "status";

class SocketServer extends IOServer {
    private instance: LinkServer | undefined = undefined;

    constructor(httpServer: HTTPServer) {
        super(httpServer);
        this.instance = instance;
        this.instance?.subscribe(this.onLinkServerEvent);
    }

    private dispatch(eventName: SocketServerEvent, props: object) {
        this.emit(eventName, props);
    }

    private onLinkServerEvent(eventName: LinkEvent, eventProps: object) {
        switch(eventName) {
            case "start": {
                break;
            }
            case "connection": {

                break;
            }
            case "end": {

                break;
            }
        }
    }

    private status() {
        this.dispatch("status", { started: this.instance?.started, clients: this.instance?.clients.length });
    }
}

export { SocketServer };