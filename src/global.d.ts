import type { TankobonApi } from './preload';

declare global {
  interface Window {
    tankobon: TankobonApi;
  }
}

export {};
