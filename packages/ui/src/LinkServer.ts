import { Server as LinkServer } from 'server';

let Instance = (global as any).server;

if(!Instance) {
    Instance = new LinkServer();
    (global as any).server = Instance;
}

export { Instance };