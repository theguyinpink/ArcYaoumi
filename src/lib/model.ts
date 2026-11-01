import content from '../data/missions.json'

export type Mission = { id:string; date:string; day:number; month:number; theme:string; category:string; title:string; intention:string; duration:string; steps:string[]; gentle_version:string; encouragement:string; reflection_question:string; optional:boolean }
export type Mood = 'serene'|'happy'|'calm'|'tired'|'stressed'|'sad'
export type JournalEntry = { id:string; date:string; mood:Mood|null; thoughts:string; gratitude:string; win:string; photo_path:string|null; photo_url?:string|null; created_at:string; updated_at:string }
export type Settings = { enabled:boolean; maximumPerDay:number; times:string[]; quietStart:string; quietEnd:string; categories:string[]; hiddenMessageIds:string[]; customMessages:{id:string; text:string; category:string}[]; reducedMotion:boolean; hidePushPreview:boolean }
export type Page = 'today'|'journey'|'journal'|'growth'|'space'
export type MissionStatus = 'locked'|'available'|'missed'|'done'
export const missions = content.missions as Mission[]
export const period = content.period
export const categories = [
  {id:'confidence',label:'Confiance'}, {id:'comfort',label:'Réconfort'},
  {id:'calm',label:'Apaisement'}, {id:'rest',label:'Repos'},
  {id:'learning',label:'Curiosité'}, {id:'growth',label:'Évolution'},
]
export const defaultSettings:Settings = { enabled:true,maximumPerDay:4,times:['09:00','12:30','16:30','19:30'],quietStart:'21:00',quietEnd:'09:00',categories:categories.map(c=>c.id),hiddenMessageIds:[],customMessages:[],reducedMotion:false,hidePushPreview:false }
export const months=[{month:11,year:2026,label:'Novembre',theme:'My Well-being Era',short:'Well-being',emoji:'🌷',description:'Un peu de douceur pour moi.',className:'november',start:'2026-11-01',length:30},{month:12,year:2026,label:'Décembre',theme:'My Learning Era',short:'Learning',emoji:'📖',description:'Apprendre, découvrir et essayer.',className:'december',start:'2026-12-01',length:31},{month:1,year:2027,label:'Janvier',theme:'My New Habits Era',short:'New habits',emoji:'🌱',description:'Des habitudes à mon rythme.',className:'january',start:'2027-01-01',length:31}]
export const badges = [
 {id:'first',at:1,title:'First Little Step',description:'Ma première mission',emoji:'🌱'},
 {id:'seven',at:7,title:'Growing With Love',description:'7 petites victoires',emoji:'🌷'},
 {id:'fifteen',at:15,title:'Little Moments',description:'15 moments pour moi',emoji:'🧸'},
 {id:'thirty',at:30,title:'Blooming Era',description:'30 missions accomplies',emoji:'🌸'},
 {id:'sixty',at:60,title:'A Garden of Love',description:'60 missions accomplies',emoji:'🌺'},
 {id:'complete',at:92,title:'My Own Inspiration',description:'92 petites victoires',emoji:'💐'},
 {id:'november',at:30,month:11,title:'My Well-being Era',description:'Novembre complété',emoji:'💕'},
 {id:'december',at:31,month:12,title:'Curious Mind',description:'Décembre complété',emoji:'📖'},
 {id:'january',at:31,month:1,title:'My New Habits Era',description:'Janvier complété',emoji:'🪴'},
]
export function parisToday(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
export function dateLong(iso:string){return new Intl.DateTimeFormat('fr-FR',{dateStyle:'full',timeZone:'UTC'}).format(new Date(`${iso}T12:00:00Z`))}
export function dateShort(iso:string){return new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'long',timeZone:'UTC'}).format(new Date(`${iso}T12:00:00Z`))}
export function monthOf(iso:string){return months.find(m=>m.month===Number(iso.slice(5,7))&&m.year===Number(iso.slice(0,4))) ?? months[0]}
export function currentMission(iso:string){const available=missions.filter(m=>m.date<=iso);return missions.find(m=>m.date===iso) ?? available.at(-1) ?? missions[0]}
export function missionStatus(m:Mission, today:string, done:Record<string,boolean>):MissionStatus {return done[m.id]?'done':m.date>today?'locked':m.date===today?'available':'missed'}
export function percent(n:number,d:number){return Math.round(100*n/d)}
export function uid(){return globalThis.crypto?.randomUUID?.() ?? `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`}
export function greeting(){const h=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Paris',hour:'2-digit',hour12:false}).format(new Date()));return h<12?'Good morning':h<18?'Good afternoon':'Good evening'}
export const moodOptions:{id:Mood;emoji:string;name:string}[]=[{id:'serene',emoji:'🌿',name:'Sereine'},{id:'happy',emoji:'🥰',name:'Joyeuse'},{id:'calm',emoji:'🌷',name:'Calme'},{id:'tired',emoji:'🌙',name:'Fatiguée'},{id:'stressed',emoji:'☁️',name:'Stressée'},{id:'sad',emoji:'🌧️',name:'Triste'}]
