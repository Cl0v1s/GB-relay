import type { Server as HTTPServer } from 'http'
import type { NextApiRequest, NextApiResponse } from 'next'
import type { Socket as NetSocket } from 'net';
import { SocketServer as LinkSocketServer } from './server';
import cors from "cors";

// Create a new instance of the CORS middleware
const corsMiddleware = cors();

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
    const io = new LinkSocketServer(res.socket.server, {
      path: "/api/socket",
      addTrailingSlash: false
    })

    // Apply the CORS middleware to the request and response
    corsMiddleware(req, res, () => {
        res.socket.server.io = io;
        res.end();
    });
};