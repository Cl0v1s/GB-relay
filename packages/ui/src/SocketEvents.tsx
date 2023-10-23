export const SocketStatusEvent = "status";
export const SocketClientReadyEvent = "clientReady";
export const SocketYouReadyEvent = "youReady";

export type SocketServerEvent = typeof SocketStatusEvent | typeof SocketClientReadyEvent | typeof SocketYouReadyEvent;

export type GameClient = {
    id: string,
    emulator: string,
    rom: string,
    ip?: string,
}