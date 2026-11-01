import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { configured, supabase } from './supabase'
import { defaultSettings, parisToday, uid, type JournalEntry, type Mood, type Settings } from './model'

type EntryDraft = {date:string; mood:Mood|null;gratitude:string; thoughts:string;win:string;photo_path:string|null}
type Store = {
  ready:boolean; user:User|null; demo:boolean; busy:boolean; recovery:boolean; error:string; clearError:()=>void;
  today:string; demoDate:string; setDemoDate:(v:string)=>void; completed:Record<string,boolean>;
  entries:JournalEntry[]; settings:Settings;
  login:(email:string,password:string)=>Promise<void>; logout:()=>Promise<void>; resetPassword:(email:string)=>Promise<void>; updatePassword:(password:string)=>Promise<void>;
  toggleMission:(id:string)=>Promise<boolean>; saveEntry:(draft:EntryDraft,id?:string)=>Promise<boolean>; removeEntry:(id:string)=>Promise<void>;
  uploadPhoto:(f:File)=>Promise<string|null>; photoUrl:(path:string)=>Promise<string|null>;
  saveSettings:(settings:Settings)=>Promise<boolean>;
  pushEnabled:boolean; enablePush:()=>Promise<void>; disablePush:()=>Promise<void>; pushError:string;
}
const Context=createContext<Store|null>(null)
const KEY='winter_arc_demo_v1'
function demoLoad(){try {return JSON.parse(localStorage.getItem(KEY)||'{}') as {completed?:Record<string,boolean>;entries?:JournalEntry[];settings?:Settings;demoDate?:string}}catch{return {}}}
function demoSave(v:object){try{localStorage.setItem(KEY,JSON.stringify(v))}catch{}}
const initialDemo:ReturnType<typeof demoLoad>=typeof window!=='undefined'?demoLoad():{}
function normalizeSettings(raw:unknown):Settings{
 const v=(raw && typeof raw==='object'?raw:{}) as Partial<Settings>
 return {...defaultSettings,...v,
  categories:Array.isArray(v.categories)?v.categories:defaultSettings.categories,
  hiddenMessageIds:Array.isArray(v.hiddenMessageIds)?v.hiddenMessageIds:[],
  customMessages:Array.isArray(v.customMessages)?v.customMessages:[],
  times:Array.isArray(v.times)?v.times:defaultSettings.times}
}
function mapEntry(row:Record<string,unknown>):JournalEntry {return {id:String(row.id),date:String(row.entry_date),mood:(row.mood as Mood|null)||null,thoughts:String(row.thoughts||''),gratitude:String(row.gratitude||''),win:String(row.win||''),photo_path:row.photo_path?String(row.photo_path):null,created_at:String(row.created_at||new Date().toISOString()),updated_at:String(row.updated_at||new Date().toISOString())}}
function base64urlToUint8Array(base64:string){const padding='='.repeat((4-base64.length%4)%4); const raw=atob((base64+padding).replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(raw,c=>c.charCodeAt(0))}
export function StoreProvider({children}:{children:ReactNode}){
 const [ready,setReady]=useState(!configured),[user,setUser]=useState<User|null>(null),[busy,setBusy]=useState(false),[recovery,setRecovery]=useState(false),[error,setError]=useState('')
 const [completed,setCompleted]=useState<Record<string,boolean>>(initialDemo.completed||{})
 const [entries,setEntries]=useState<JournalEntry[]>(initialDemo.entries||[])
 const [settings,setSettings]=useState<Settings>(normalizeSettings(initialDemo.settings))
 const [demoDate,setDemoDateRaw]=useState(initialDemo.demoDate||'2026-11-03')
 const [pushEnabled,setPushEnabled]=useState(false),[pushError,setPushError]=useState('')
 const today=configured?parisToday():demoDate
 useEffect(()=>{if(!configured)demoSave({completed,entries,settings,demoDate})},[completed,entries,settings,demoDate])
 useEffect(()=>{if(!supabase)return;let active=true
  async function initialize(){const {data,error:e}=await supabase!.auth.getSession();if(!active)return;if(e)setError(e.message);setUser(data.session?.user||null);setReady(true)}
  initialize()
  const {data:listener}=supabase.auth.onAuthStateChange((event,session)=>{setUser(session?.user||null);if(event==='PASSWORD_RECOVERY')setRecovery(true);setReady(true)})
  return ()=>{active=false;listener.subscription.unsubscribe()}
 },[])
 useEffect(()=>{if(!supabase||!user){if(configured){setCompleted({});setEntries([]);setSettings(defaultSettings)}return}
  let live=true
  async function load(){setBusy(true);const [p,j,s]=await Promise.all([
   supabase!.from('mission_progress').select('mission_date').eq('user_id',user!.id),
   supabase!.from('journal_entries').select('*').eq('user_id',user!.id).order('created_at',{ascending:false}),
   supabase!.from('notification_preferences').select('config').eq('user_id',user!.id).maybeSingle(),
  ]);if(!live)return;
   for(const x of [p,j,s])if(x.error)setError(x.error.message)
   if(p.data)setCompleted(Object.fromEntries(p.data.map(x=>[x.mission_date,true])))
   if(j.data)setEntries(j.data.map(x=>mapEntry(x as Record<string,unknown>)))
   setSettings(normalizeSettings(s.data?.config))
   setBusy(false)
  }load();const onFocus=()=>{if(document.visibilityState==='visible')load()};document.addEventListener('visibilitychange',onFocus)
  return()=>{live=false;document.removeEventListener('visibilitychange',onFocus)}
 },[user?.id])
 const login=async(email:string,password:string)=>{if(!supabase)return;setError('');setBusy(true);const {error:e}=await supabase.auth.signInWithPassword({email,password});if(e){setError('Identifiants invalides ou compte inaccessible.');setBusy(false);throw e}setBusy(false)}
 const logout=async()=>{if(!supabase)return;await supabase.auth.signOut();setUser(null)}
 const resetPassword=async(email:string)=>{if(!supabase)return;const {error:e}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin});if(e)throw e}
 const updatePassword=async(password:string)=>{if(!supabase)throw new Error('Supabase non configuré');const {error:e}=await supabase.auth.updateUser({password});if(e)throw e;setRecovery(false)}
 const toggleMission=async(id:string)=>{
  if(id>today){setError('Cette mission sera disponible à sa date.');return false}
  const was=Boolean(completed[id]);setCompleted(v=>{const next={...v};if(was)delete next[id];else next[id]=true;return next})
  if(supabase && user){const result=was?await supabase.from('mission_progress').delete().eq('user_id',user.id).eq('mission_date',id):await supabase.from('mission_progress').insert({user_id:user.id,mission_date:id});
   if(result.error){setCompleted(v=>({...v,[id]:was}));setError(result.error.message);return false}
  }
  return !was
 }
 const saveEntry=async(draft:EntryDraft,id?:string)=>{
  const now=new Date().toISOString();const entry:JournalEntry={...draft,id:id||uid(),created_at:entries.find(e=>e.id===id)?.created_at||now,updated_at:now};
  if(supabase && user){const payload={id:entry.id,user_id:user.id,entry_date:entry.date,mood:entry.mood,thoughts:entry.thoughts,gratitude:entry.gratitude,win:entry.win,photo_path:entry.photo_path};
    const {data,error:e}=await supabase.from('journal_entries').upsert(payload).select('*').single();if(e){setError(e.message);return false}setEntries(v=>[mapEntry(data as Record<string,unknown>),...v.filter(x=>x.id!==entry.id)]);return true
  }setEntries(v=>[entry,...v.filter(x=>x.id!==entry.id)]);return true
 }
 const removeEntry=async(id:string)=>{
  const entry=entries.find(e=>e.id===id)
  if(supabase&&user){const {error:e}=await supabase.from('journal_entries').delete().eq('id',id).eq('user_id',user.id);if(e){setError(e.message);return}if(entry?.photo_path)await supabase.storage.from('journal-photos').remove([entry.photo_path])}
  setEntries(v=>v.filter(x=>x.id!==id))
 }
 const uploadPhoto=async(f:File)=>{
  if(!['image/jpeg','image/png','image/webp'].includes(f.type)){setError('Choisis une image JPEG, PNG ou WebP.');return null}
  if(f.size>5*1024*1024){setError('La photo doit faire moins de 5 Mo.');return null}
  if(supabase&&user){const ext=f.name.split('.').pop()?.toLowerCase()||'jpg';const path=`${user.id}/${uid()}.${ext}`;const {error:e}=await supabase.storage.from('journal-photos').upload(path,f,{upsert:false,contentType:f.type});if(e){setError(e.message);return null}return path}
  if(f.size>900_000){setError('En mode démo, choisis une petite photo (moins de 900 Ko).');return null}
  return await new Promise<string|null>(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>resolve(null);reader.readAsDataURL(f)})
 }
 const photoUrl=async(path:string)=>{if(path.startsWith('data:'))return path;if(!supabase||!user)return null;const {data,error:e}=await supabase.storage.from('journal-photos').createSignedUrl(path,60*60);if(e)return null;return data.signedUrl}
 const saveSettings=async(v:Settings)=>{setSettings(v);if(supabase&&user){const {error:e}=await supabase.from('notification_preferences').upsert({user_id:user.id,config:v});if(e){setError(e.message);return false}}return true}
 const enablePush=async()=>{
   setPushError('');if(!supabase||!user){setPushError('Connecte Supabase pour activer les vraies notifications.');return}
   if(!('serviceWorker' in navigator)||!('PushManager' in window)){setPushError('Les notifications Web Push ne sont pas prises en charge sur ce navigateur.');return}
   const key=import.meta.env.VITE_VAPID_PUBLIC_KEY as string|undefined
   if(!key){setPushError('Ajoute la clé publique VAPID dans la configuration.');return}
   const permission=await Notification.requestPermission();if(permission!=='granted'){setPushError('Autorisation des notifications non accordée.');return}
   try{
    await saveSettings(settings)
    const registration=await navigator.serviceWorker.ready;
    const subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:base64urlToUint8Array(key) as BufferSource})
    await supabase.from('push_subscriptions').update({is_primary:false}).eq('user_id',user.id)
    const json=subscription.toJSON();const {error:e}=await supabase.from('push_subscriptions').upsert({user_id:user.id,endpoint:subscription.endpoint,subscription:json,device_label:/iPhone|iPad/.test(navigator.userAgent)?'Apple':/Android/.test(navigator.userAgent)?'Android':'Ordinateur',is_primary:true},{onConflict:'endpoint'});
    if(e)throw e;setPushEnabled(true)
   }catch(e){setPushError(e instanceof Error?e.message:'Impossible d’activer les notifications.')}
 }
 const disablePush=async()=>{if(!('serviceWorker'in navigator))return;const registration=await navigator.serviceWorker.ready;const s=await registration.pushManager.getSubscription();if(s){if(supabase&&user)await supabase.from('push_subscriptions').delete().eq('user_id',user.id).eq('endpoint',s.endpoint);await s.unsubscribe()}setPushEnabled(false)}
 useEffect(()=>{if(!configured||!user||!('serviceWorker'in navigator))return;navigator.serviceWorker.ready.then(async r=>{const s=await r.pushManager?.getSubscription();setPushEnabled(Boolean(s))}).catch(()=>{})},[user?.id])
 const value=useMemo<Store>(()=>({ready,user,demo:!configured,busy,recovery,error,clearError:()=>setError(''),today,demoDate,setDemoDate:setDemoDateRaw,completed,entries,settings,login,logout,resetPassword,updatePassword,toggleMission,saveEntry,removeEntry,uploadPhoto,photoUrl,saveSettings,pushEnabled,enablePush,disablePush,pushError}),[ready,user,busy,recovery,error,today,demoDate,completed,entries,settings,pushEnabled,pushError])
 return <Context.Provider value={value}>{children}</Context.Provider>
}
export function useWinterArc(){const ctx=useContext(Context);if(!ctx)throw new Error('StoreProvider missing');return ctx}
