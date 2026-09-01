import React, { useEffect, useMemo, useState } from 'react'
import { Navigate, NavLink, useNavigate, useParams } from 'react-router-dom'
import { Activity, ArrowLeft, BarChart3, Bot, Building2, CalendarDays, CheckCircle2, ChevronRight, CircleAlert, Eye, EyeOff, LayoutDashboard, LogIn, LogOut, MessageCircle, Plus, Search, Settings, ShieldCheck, UserRound, Users, Wifi, XCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useTenant } from '../contexts/TenantContext'
const BR_TIMEZONE='America/Sao_Paulo'
function getSupabase(){if(!supabase)throw new Error('Supabase não configurado.');return supabase}
function zonedParts(date:Date,tz:string){const p=new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(date);const o=Object.fromEntries(p.map(x=>[x.type,x.value]));return{year:Number(o.year),month:Number(o.month),day:Number(o.day),hour:Number(o.hour),minute:Number(o.minute),second:Number(o.second)}}
function localDateKey(date:Date,tz:string){const p=zonedParts(date,tz);return `${p.year}-${String(p.month).padStart(2,"0")}-${String(p.day).padStart(2,"0")}`}
function localDateTimeToUtc(value:string,tz:string){const [ds,ts]=value.split('T');const [y,m,d]=ds.split('-').map(Number);const [hh,mm]=ts.split(':').map(Number);let guess=Date.UTC(y,m-1,d,hh,mm);for(let i=0;i<3;i++){const p=zonedParts(new Date(guess),tz);const asUtc=Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute);guess+=Date.UTC(y,m-1,d,hh,mm)-asUtc}return new Date(guess)}
function utcToLocalInput(value:string,tz:string){const p=zonedParts(new Date(value),tz);return{date:`${p.year}-${String(p.month).padStart(2,"0")}-${String(p.day).padStart(2,"0")}`,time:`${String(p.hour).padStart(2,"0")}:${String(p.minute).padStart(2,"0")}`}}
function formatZoned(value:string,tz:string,opts:Intl.DateTimeFormatOptions={dateStyle:'short',timeStyle:'short'}){return new Intl.DateTimeFormat('pt-BR',{...opts,timeZone:tz}).format(new Date(value))}

type Company = { id: string; name: string; legal_name?: string | null; cnpj?: string | null; phone?: string | null; email?: string | null }
type Icon = React.ComponentType<any>

function Metric({label,value,icon:Icon}
function AdminPlaceholder({title,description,icon:Icon}
function Empty({text}
function TenantPage({title,description,children,action}
export { getSupabase, zonedParts, localDateKey, localDateTimeToUtc, utcToLocalInput, formatZoned, Metric, AdminPlaceholder, Empty, TenantPage }
