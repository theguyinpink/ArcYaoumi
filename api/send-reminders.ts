/**
 * Protected Vercel Serverless function. Trigger via Supabase Cron + pg_net every minute.
 * Requires SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VAPID_PUBLIC_KEY,
 * VAPID_PRIVATE_KEY, VAPID_CONTACT, CRON_SECRET. Do NOT expose service keys to Vite.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'
import reminders from '../shared/messages.json'

type Config = {enabled?:boolean;maximumPerDay?:number;times?:string[];quietStart?:string;quietEnd?:string;categories?:string[];hiddenMessageIds?:string[];customMessages?:{id:string;text:string;category:string}[];hidePushPreview?:boolean}
type Reminder={id:string;text:string;category:string}
const monthCategories:Record<number,string[]>={11:['confidence','comfort','calm','rest'],12:['learning','confidence','calm','comfort'],1:['growth','comfort','confidence','rest']}
function parisNow(){const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date());const v=Object.fromEntries(parts.map(x=>[x.type,x.value]));return {date:`${v.year}-${v.month}-${v.day}`,time:`${v.hour}:${v.minute}`,month:Number(v.month)}}
function inQuietWindow(t:string,start:string,end:string){if(start===end)return false;return start<end?t>=start&&t<end:t>=start||t<end}
function hash(s:string){let h=0;for(const c of s)h=(Math.imul(31,h)+c.charCodeAt(0))|0;return Math.abs(h)}
export default async function handler(req:VercelRequest,res:VercelResponse){
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'})
 if(!process.env.CRON_SECRET||req.headers.authorization!==`Bearer ${process.env.CRON_SECRET}`)return res.status(401).json({error:'Unauthorized'})
 const {SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY,VAPID_PUBLIC_KEY,VAPID_PRIVATE_KEY,VAPID_CONTACT}=process.env
 if(!SUPABASE_URL||!SUPABASE_SERVICE_ROLE_KEY||!VAPID_PUBLIC_KEY||!VAPID_PRIVATE_KEY||!VAPID_CONTACT)return res.status(503).json({error:'Server not configured'})
 webpush.setVapidDetails(VAPID_CONTACT,VAPID_PUBLIC_KEY,VAPID_PRIVATE_KEY)
 const db=createClient(SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY,{auth:{autoRefreshToken:false,persistSession:false}})
 const {date,time,month}=parisNow();let delivered=0,processed=0
 if(date<'2026-11-01'||date>'2027-01-31')return res.status(200).json({ok:true,skipped:'outside Winter Arc period'})
 try{
  // Private app: limited user count. Paginate if you later make it multi-user.
  const {data:users,error:userError}=await db.from('notification_preferences').select('user_id,config').range(0,999)
  if(userError)throw userError
  for(const row of users||[]){
   const config=row.config as Config;if(!config?.enabled)continue
   const times=(config.times||['09:00','12:30','16:30','19:30']).slice(0,Math.max(0,Math.min(4,config.maximumPerDay||4)))
   if(!times.includes(time))continue
   if(inQuietWindow(time,config.quietStart||'21:00',config.quietEnd||'09:00'))continue
   const {data:subs}=await db.from('push_subscriptions').select('endpoint,subscription').eq('user_id',row.user_id).eq('is_primary',true)
   if(!subs?.length)continue
   const preferred=monthCategories[month]||monthCategories[11]
   const allow=new Set(config.categories||['confidence','comfort','calm','rest','learning','growth'])
   const hide=new Set(config.hiddenMessageIds||[])
   const pool:Reminder[]=[...reminders,...(config.customMessages||[]).filter(x=>x.text?.length<=240)]
    .filter(m=>allow.has(m.category)&&!hide.has(m.id)&&preferred.includes(m.category))
   if(!pool.length)continue
   const {data:last}=await db.from('notification_history').select('message_id').eq('user_id',row.user_id).order('created_at',{ascending:false}).limit(12)
   const recently=new Set((last||[]).map(x=>x.message_id))
   const unused=pool.filter(x=>!recently.has(x.id));const choices=unused.length?unused:pool
   const msg=choices[hash(`${row.user_id}|${date}|${time}`)%choices.length]
   // Atomic unique key prevents duplicate messages when cron executes more than once.
   const {error:uniqueError}=await db.from('notification_history').insert({user_id:row.user_id,slot_date:date,slot_time:time,message_id:msg.id,status:'queued'})
   if(uniqueError){if(uniqueError.code==='23505')continue;throw uniqueError}
   processed++
   let success=0
   for(const sub of subs){
    try{await webpush.sendNotification(sub.subscription,JSON.stringify({title:'Little Reminders ♡',body:msg.text,hidePreview:!!config.hidePushPreview,url:'/'}));success++;delivered++}
    catch(e){const err=e as {statusCode?:number};if(err.statusCode===404||err.statusCode===410)await db.from('push_subscriptions').delete().eq('endpoint',sub.endpoint)}
   }
   await db.from('notification_history').update({status:success?'sent':'failed'}).eq('user_id',row.user_id).eq('slot_date',date).eq('slot_time',time)
  }
  res.status(200).json({ok:true,date,time,processed,delivered})
 }catch(error){res.status(500).json({error:'Reminder job failed',detail:process.env.NODE_ENV==='development'?String(error):undefined})}
}
