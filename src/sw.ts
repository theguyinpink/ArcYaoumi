/// <reference lib="WebWorker" />
import { clientsClaim } from 'workbox-core'
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { createHandlerBoundToURL } from 'workbox-precaching'

const sw = self as unknown as ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{url:string;revision:string|null}> }
sw.skipWaiting(); clientsClaim(); cleanupOutdatedCaches()
precacheAndRoute(sw.__WB_MANIFEST)
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html')))
sw.addEventListener('push',(event:PushEvent)=>{
 let data:{title?:string;body?:string;url?:string;hidePreview?:boolean}={}
 try{data=event.data?.json()??{}}catch{data={body:event.data?.text()||''}}
 const options:NotificationOptions={body:data.hidePreview?'Tu as reçu un petit mot doux ♡':data.body||'Un petit mot doux pour toi ♡',icon:'/icons/icon-192.png',badge:'/icons/icon-192.png',tag:'winter-arc-reminder',data:{url:data.url||'/'}}
 event.waitUntil(sw.registration.showNotification(data.title||'Little Reminders ♡',options))
})
sw.addEventListener('notificationclick',(event:NotificationEvent)=>{
 event.notification.close();const url=new URL(event.notification.data?.url||'/',sw.location.origin).href
 event.waitUntil((async()=>{const list=await sw.clients.matchAll({type:'window',includeUncontrolled:true});for(const client of list){if('focus'in client){await client.focus();if('navigate'in client)await client.navigate(url);return}}await sw.clients.openWindow(url)})())
})
