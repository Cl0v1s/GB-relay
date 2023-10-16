import type { Server as HTTPServer } from 'http'
import type { NextApiRequest, NextApiResponse } from 'next'
import type { Socket as NetSocket } from 'net';
import { SocketServer as LinkSocketServer } from './server';

interface SocketServer extends HTTPServer {
    io?: LinkSocketServer | undefined
}
  
interface SocketWithIO extends NetSocket {
    server: SocketServer
}
  
  interface SocketApiResponse extends NextApiResponse {
    socket: SocketWithIO
  }

export default function handler(req: NextApiRequest, res: SocketApiResponse) {
    if (res.socket.server.io) {
        res.end();
        return;
    };
    const io = new LinkSocketServer(res.socket.server)
    res.socket.server.io = io
    res.end()
}