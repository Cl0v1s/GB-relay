"use client";

// https://kyr0.github.io/nes-ui-react/
import Status from './status';
import { AppContextProvider } from "@/src/useApp";

export default function Home() {

  return (
    <AppContextProvider>
      <header>

      </header>
      <main className='grow'>

      </main>
      <footer className='shrink-0 p-3'>
      </footer>
    </AppContextProvider>
  )
}
