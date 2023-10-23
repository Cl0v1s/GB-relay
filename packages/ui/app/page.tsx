"use client";

// https://kyr0.github.io/nes-ui-react/
import Status from './status';
import Clients from './clients';
import { AppContextProvider } from './useApp';

export default function Home() {

  return (
    <AppContextProvider>
      <header>

      </header>
      <main className='grow flex flex-col'>
        <Clients />
      </main>
      <footer className='shrink-0 p-3'>
        <Status />
      </footer>
    </AppContextProvider>
  )
}
