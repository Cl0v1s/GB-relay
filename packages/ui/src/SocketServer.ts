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
            this.status(socket);
        });
    }

    private dispatch(eventName: SocketServerEvent, props: object) {
        this.emit(eventName, props);
    }

    private async onLinkServerEvent(eventName: LinkEvent, eventProps: any) {
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
            case "clientReady": {
                const sockets = await this.fetchSockets();
                sockets.filter((socket) => process.env.NODE_ENV === "development" || socket.handshake.address === eventProps.ip)
                    .forEach((socket) => socket.emit(eventName, { emulator: eventProps.emulator, rom: eventProps.rom }));
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