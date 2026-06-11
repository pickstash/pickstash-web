import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface ServiceWorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();

type PushData = { title?: string; body?: string; url?: string }
type SwScope = {
  addEventListener(type: 'push', handler: (e: {
    data: { json(): PushData } | null
    waitUntil(p: Promise<unknown>): void
  }) => void): void
  addEventListener(type: 'notificationclick', handler: (e: {
    notification: { close(): void; data: PushData }
    waitUntil(p: Promise<unknown>): void
  }) => void): void
  registration: { showNotification(title: string, opts?: NotificationOptions): Promise<void> }
  clients: { openWindow(url: string): Promise<unknown> }
}

const sw = globalThis as unknown as SwScope

sw.addEventListener('push', (event) => {
  const data = event.data?.json()
  event.waitUntil(
    sw.registration.showNotification(data?.title ?? '결정창고', {
      body: data?.body ?? '새로운 소식이 있어요!',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: data?.url ?? '/' },
    })
  )
})

sw.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(sw.clients.openWindow(event.notification.data?.url ?? '/'))
})
