import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '../lib/supabase'

export type Company={id:string;name:string;legal_name?:string|null;cnpj?:string|null;phone?:string|null;email?:string|null}
type TenantContextValue={companies:Company[];activeCompany:Company|null;loading:boolean;setActiveCompany:(c:Company)=>void;refresh:()=>Promise<void>}

const TenantContext=createContext<TenantContextValue|null>(null)

export function TenantProvider({children}:{children:ReactNode}){
  const[companies,setCompanies]=useState<Company[]>([])
  const[activeCompany,setActive]=useState<Company|null>(null)
  const[loading,setLoading]=useState(true)

  const refresh=async()=>{
    if(!supabase){setCompanies([]);setActive(null);setLoading(false);return}
    setLoading(true)
    const{data:{user}}=await supabase.auth.getUser()
    if(!user){setCompanies([]);setActive(null);setLoading(false);return}

    const jwtAdmin=user.app_metadata?.role==='superadmin'||user.app_metadata?.is_superadmin===true
    const{data:profile}=await supabase.from('profiles').select('is_superadmin').eq('id',user.id).maybeSingle()
    const isSuperadmin=Boolean(profile?.is_superadmin||jwtAdmin)

    let list:Company[]=[]
    if(isSuperadmin){
      const{data,error}=await supabase.from('companies').select('id,name,legal_name,cnpj,phone,email').order('name')
      if(error)console.error('Erro ao carregar empresas do superadmin:',error)
      list=(data||[]) as Company[]
    }else{
      const{data,error}=await supabase
        .from('company_users')
        .select('company_id, companies(id,name,legal_name,cnpj,phone,email)')
        .eq('user_id',user.id)
      if(error){
        console.error('Erro ao carregar empresas do usuário:',error)
        setCompanies([]);setActive(null);setLoading(false);return
      }
      list=(data||[]).map((row:any)=>row.companies).filter(Boolean) as Company[]
    }
    setCompanies(list)

    const saved=localStorage.getItem('consulta-pro-company')
    const selected=list.find(c=>c.id===saved)||list[0]||null
    setActive(selected)
    if(selected)localStorage.setItem('consulta-pro-company',selected.id)
    else localStorage.removeItem('consulta-pro-company')
    setLoading(false)
  }

  useEffect(()=>{
    refresh()
    if(!supabase)return
    const{data}=supabase.auth.onAuthStateChange(()=>refresh())
    return()=>data.subscription.unsubscribe()
  },[])

  const setActiveCompany=(c:Company)=>{
    if(!companies.some(x=>x.id===c.id))return
    setActive(c)
    localStorage.setItem('consulta-pro-company',c.id)
  }

  return <TenantContext.Provider value={{companies,activeCompany,loading,setActiveCompany,refresh}}>{children}</TenantContext.Provider>
}

export function useTenant(){const v=useContext(TenantContext);if(!v)throw new Error('useTenant must be used inside TenantProvider');return v}
