import { Server as LinkServerType, Event as LinkEvent } from 'server';
import { Server as IOServer, ServerOptions, Socket } from 'socket.io';
import type { Server as HTTPServer } from 'http'
import { SocketServerEvent } from './SocketEvents';
import * as LinkServer from './LinkServer';


class SocketServer extends IOServer {
    private instance: LinkServerType | undefined = undefined;

    constructor(httpServer: HTTPServer, options: Partial<ServerOptions>) {
        super(httpServer, options);
        this.instance = LinkServer.Instance;
        this.instance?.subscribe((eventName, eventProps) => this.onLinkServerEvent(eventName, eventProps));

        this.on("connection", (socket) => {
            console.log(socket.request.connection.remoteAddress);
            this.status(socket);
        });
    }

    private dispatch(eventName: SocketServerEvent, props: object) {
        this.emit(eventName, props);
    }

    private onLinkServerEvent(eventName: LinkEvent, eventProps: object) {
        this.status();
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

    private status(target: Socket | null = null) {
        const stat = { started: this.instance?.started, clients: this.instance?.clients.length };
        if(!target) this.dispatch("status", stat);
        else target.emit("status", stat);
    }
}

export { SocketServer };