import React from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Building2, ChevronRight } from 'lucide-react'

export const BR_TIMEZONE = 'America/Sao_Paulo'

export function getSupabase(){if(!supabase) throw new Error('Supabase não configurado.'); return supabase}
export function zonedParts(date:Date,tz:string){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(date)
  const o=Object.fromEntries(parts.map(x=>[x.type,x.value]))
  return {year:Number(o.year),month:Number(o.month),day:Number(o.day),hour:Number(o.hour),minute:Number(o.minute),second:Number(o.second)}
}
export function localDateKey(date:Date,tz:string){const p=zonedParts(date,tz);return `${p.year}-${String(p.month).padStart(2,'0')}-${String(p.day).padStart(2,'0')}`}
export function localDateTimeToUtc(value:string,tz:string){
  const [ds,ts]=value.split('T'); const [y,m,d]=ds.split('-').map(Number); const [hh,mm]=ts.split(':').map(Number)
  let guess=Date.UTC(y,m-1,d,hh,mm)
  for(let i=0;i<3;i++){const p=zonedParts(new Date(guess),tz);guess+=Date.UTC(y,m-1,d,hh,mm)-Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute)}
  return new Date(guess)
}
export function utcToLocalInput(value:string,tz:string){const p=zonedParts(new Date(value),tz);return {date:`${p.year}-${String(p.month).padStart(2,'0')}-${String(p.day).padStart(2,'0')}`,time:`${String(p.hour).padStart(2,'0')}:${String(p.minute).padStart(2,'0')}`}}
export function formatZoned(value:string,tz:string,opts:Intl.DateTimeFormatOptions={dateStyle:'short',timeStyle:'short'}){return new Intl.DateTimeFormat('pt-BR',{...opts,timeZone:tz}).format(new Date(value))}

export function Metric({label,value,icon:Icon}:{label:string,value:React.ReactNode,icon?:React.ComponentType<any>}){return <div className="metric"><div><small>{label}</small><strong>{value}</strong></div>{Icon&&<Icon size={20}/>}</div>}
export function AdminPlaceholder({title,description,icon:Icon}:{title:string,description:string,icon?:React.ComponentType<any>}){return <section className="panel placeholder"><div className="placeholder-icon">{Icon?<Icon size={28}/>:<Building2 size={28}/>}</div><h2>{title}</h2><p>{description}</p></section>}
export function Empty({text}:{text:string}){return <div className="empty-state">{text}</div>}
export function TenantPage({title,description,children,action}:{title:string,description?:string,children?:React.ReactNode,action?:React.ReactNode}){return <div className="page"><div className="page-header"><div><h1>{title}</h1>{description&&<p>{description}</p>}</div>{action}</div>{children}</div>}
