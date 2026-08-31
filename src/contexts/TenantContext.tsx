import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react'
import { Outlet } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export type Company={id:string;name:string;legal_name?:string|null;cnpj?:string|null;phone?:string|null;email?:string|null;timezone?:string|null}
type TenantContextValue={companies:Company[];activeCompany:Company|null;loading:boolean;setActiveCompany:(c:Company)=>void;refresh:()=>Promise<void>}

const TenantContext=createContext<TenantContextValue|null>(null)
const TENANT_TIMEOUT_MS=8000

export function TenantProvider({children}:{children:ReactNode}){
  const[companies,setCompanies]=useState<Company[]>([])
  const[activeCompany,setActive]=useState<Company|null>(null)
  const[loading,setLoading]=useState(true)
  const requestRef=useRef(0)

  const refresh=async()=>{
    const requestId=++requestRef.current
    const finish=()=>{if(requestId===requestRef.current)setLoading(false)}
    if(!supabase){setCompanies([]);setActive(null);finish();return}
    setLoading(true)
    const timeout=new Promise<never>((_,reject)=>setTimeout(()=>reject(new Error('Tempo esgotado ao carregar o tenant.')),TENANT_TIMEOUT_MS))
    try{
      const result=await Promise.race([supabase.auth.getUser(),timeout])
      const{data:{user}}=result
      if(!user){setCompanies([]);setActive(null);finish();return}

      const jwtAdmin=user.app_metadata?.role==='superadmin'||user.app_metadata?.is_superadmin===true
      const profileResult=await Promise.race([supabase.from('profiles').select('is_superadmin').eq('id',user.id).maybeSingle(),timeout])
      const isSuperadmin=Boolean(profileResult.data?.is_superadmin||jwtAdmin)

      let list:Company[]=[]
      if(isSuperadmin){
        const{data,error}=await Promise.race([supabase.from('companies').select('id,name,legal_name,cnpj,phone,email').order('name'),timeout])
        if(error)throw error
        list=(data||[]) as Company[]
      }else{
        const{data,error}=await Promise.race([supabase.from('company_users').select('company_id, companies(id,name,legal_name,cnpj,phone,email)').eq('user_id',user.id),timeout])
        if(error)throw error
        list=(data||[]).map((row:any)=>row.companies).filter(Boolean) as Company[]
      }
      if(requestId!==requestRef.current)return
      setCompanies(list)
      const saved=localStorage.getItem('consulta-pro-company')
      const selected=list.find(c=>c.id===saved)||list[0]||null
      setActive(selected)
      if(selected)localStorage.setItem('consulta-pro-company',selected.id)
      else localStorage.removeItem('consulta-pro-company')
    }catch(error){
      console.error('Erro ao carregar tenant:',error)
      if(requestId===requestRef.current){setCompanies([]);setActive(null)}
    }finally{finish()}
  }

  useEffect(()=>{
    refresh()
    if(!supabase)return
    const{data}=supabase.auth.onAuthStateChange(()=>{void refresh()})
    return()=>{requestRef.current++;data.subscription.unsubscribe()}
  },[])

  const setActiveCompany=(c:Company)=>{
    if(!companies.some(x=>x.id===c.id))return
    setActive(c)
    localStorage.setItem('consulta-pro-company',c.id)
  }

  return <TenantContext.Provider value={{companies,activeCompany,loading,setActiveCompany,refresh}}>{children ?? <Outlet/>}</TenantContext.Provider>
}

export function useTenant(){const v=useContext(TenantContext);if(!v)throw new Error('useTenant must be used inside TenantProvider');return v}
