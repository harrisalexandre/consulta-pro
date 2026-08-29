export type Status='agendado'|'confirmado'|'realizado'|'cancelado'|'faltou';
export interface Company{id:string;name:string;legalName:string;cnpj:string}
export interface Professional{id:string;companyId:string;name:string;specialty:string;register:string;active:boolean}
export interface Patient{id:string;companyId:string;name:string;phone:string;email:string;birth:string;active:boolean}
export interface Appointment{id:string;companyId:string;patientId:string;professionalId:string;date:string;start:string;end:string;type:string;status:Status}
export interface WhatsAppIntegration{id:string;companyId:string;number:string;instance:string;status:'connected'|'disconnected'|'connecting'|'error'}
export interface Automation{id:string;companyId:string;name:string;type:string;hoursBefore:number;channel:'WhatsApp';active:boolean;message:string}
