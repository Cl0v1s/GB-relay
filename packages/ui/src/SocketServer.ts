import { Server as LinkServerType, Event as LinkEvent } from 'server';
import { Server as IOServer, ServerOptions, Socket } from 'socket.io';
import type { Server as HTTPServer } from 'http'
import { SocketServerEvent, SocketClientReadyEvent, SocketYouReadyEvent, GameClient } from './SocketEvents';
import * as LinkServer from './LinkServer';


class SocketServer extends IOServer {
    private instance: LinkServerType | undefined = undefined;
    private clientsReady: Array<GameClient> = [];

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
        switch(eventName) {
            case "start": {
                this.status();
                break;
            }
            case "connection": {
                this.status();
                break;
            }
            case "end": {
                this.clientsReady = this.clientsReady.filter((c) => c.id !== eventProps.id);
                console.log(this.clientsReady);
                this.status();
                break;
            }
            case "clientReady": {
                this.clientsReady.push({ emulator: eventProps.emulator, rom: eventProps.rom, id: eventProps.id, ip: eventProps.ip });
                this.status();
                (await this.fetchSockets()).find((socket, index) => socket.handshake.address === eventProps.ip || (process.env.NODE_ENV === "development" && index === 0))?.emit(SocketYouReadyEvent, { emulator: eventProps.emulator, rom: eventProps.rom, id: eventProps.id })
                break;
            }
        }
    }

    private status(target: Socket | null = null) {
        const stat = { started: this.instance?.started, clients: this.instance?.clients.length, clientsReady: this.clientsReady.map((c) => ({ ...c, ip: null })) };
        if(!target) this.dispatch("status", stat);
        else target.emit("status", stat);
    }
}

export { SocketServer };