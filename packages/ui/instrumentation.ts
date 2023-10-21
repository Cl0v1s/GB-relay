import * as LinkServer from './src/LinkServer';

export function register() {
    LinkServer.Instance.start();
}