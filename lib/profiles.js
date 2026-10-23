import {randomUUID} from 'node:crypto';
export const publisherSource='https://huggingface.co/nvidia/NVIDIA-Nemotron-Labs-Dory1.0-4B-BF16';
// NVIDIA specifies temperature/top_p. Other values explicitly disable optional
// sampling transforms; they are neutral defaults, not extra publisher claims.
export const defaultSampling=Object.freeze({temperature:1,top_p:.95,top_k:0,min_p:0,typical_p:1,repeat_penalty:1,presence_penalty:0,frequency_penalty:0,mirostat:0,dry_multiplier:0,xtc_probability:0});
export function freshProfile(){return {id:randomUUID(),name:'Dory · 2 loops',modelPath:'',executable:'',context:262144,loops:2,kvMode:'per_loop',kvK:'f16',kvV:'f16',port:8250,gpu:0,gpuLayers:999,threads:4,batchThreads:8,batch:512,ubatch:128,maxTokens:32768,enabled:true,sampling:{...defaultSampling},environment:{},options:{},extraArgs:[]};}
const owned=new Set(['--model','--alias','--host','--port','--ctx-size','--parallel','--override-kv','--reasoning','--jinja','--cache-type-k','--cache-type-v','--n-gpu-layers','--threads','--threads-batch','--batch-size','--ubatch-size','--cache-ram','--flash-attn','--no-context-shift']);
export function validateProfile(input){
 if(!input||typeof input!=='object')throw Error('Invalid Dory profile.');
 const p=structuredClone(input);
 if(!/^[a-zA-Z0-9_-]{1,100}$/.test(p.id)||typeof p.name!=='string'||!p.name.trim())throw Error('A valid profile ID and name are required.');
 for(const [key,min,max]of [['loops',1,4],['context',256,262144],['port',1024,65535],['gpu',0,64],['gpuLayers',0,999],['threads',1,256],['batchThreads',1,256],['batch',1,32768],['ubatch',1,32768],['maxTokens',1,262144]])if(!Number.isInteger(p[key])||p[key]<min||p[key]>max)throw Error(`Invalid ${key}.`);
 if(p.ubatch>p.batch||p.maxTokens>p.context)throw Error('Microbatch/output limit exceeds batch/context.');
 if(!['per_loop','last_loop'].includes(p.kvMode))throw Error('KV mode must be per_loop or last_loop.');
 for(const k of ['kvK','kvV'])if(!['f16','q8_0','q4_0'].includes(p[k]))throw Error('Unsupported KV type.');
 for(const k of ['modelPath','executable'])if(typeof p[k]!=='string')throw Error('Invalid '+k);
 if(typeof p.enabled!=='boolean')throw Error('Invalid enabled setting.');
 if(!p.environment||Array.isArray(p.environment)||typeof p.environment!=='object'||Object.values(p.environment).some(v=>typeof v!=='string'))throw Error('Environment must contain string values.');
 if(!p.options||Array.isArray(p.options)||typeof p.options!=='object')throw Error('Options must be an object.');
 for(const [k,v]of Object.entries(p.options))if(!/^--[a-z][a-z0-9-]*$/.test(k)||owned.has(k)||!(typeof v==='string'||typeof v==='number'||typeof v==='boolean')||typeof v==='number'&&!Number.isFinite(v))throw Error('Invalid or managed engine option: '+k);
 if(!Array.isArray(p.extraArgs)||p.extraArgs.length)throw Error('Use named engine options; raw arguments cannot override loop/context ownership.');
 const s=p.sampling;if(!s||Object.keys(s).length!==Object.keys(defaultSampling).length)throw Error('Invalid sampling settings.');
 for(const k of Object.keys(defaultSampling))if(!Number.isFinite(s[k]))throw Error('Invalid sampler '+k);
 if(s.temperature<0||s.temperature>5||s.top_p<=0||s.top_p>1||!Number.isInteger(s.top_k)||s.top_k<0||s.min_p<0||s.min_p>1||s.typical_p<=0||s.typical_p>1||s.repeat_penalty<=0||Math.abs(s.presence_penalty)>2||Math.abs(s.frequency_penalty)>2||![0,1,2].includes(s.mirostat)||s.dry_multiplier<0||s.xtc_probability<0||s.xtc_probability>1)throw Error('Sampling settings outside supported ranges.');
 for(const key of ['status','activeRequests','log'])delete p[key];return p;
}
export function launchArgs(input){const p=validateProfile(input);const a=['--model',p.modelPath,'--alias',p.id,'--host','127.0.0.1','--port',String(p.port),'--ctx-size',String(p.context),'--parallel','1','--override-kv',`dory.num_loops=int:${p.loops},dory.recurrent_kv_cache_mode=str:${p.kvMode}`,'--reasoning','on','--jinja','--cache-type-k',p.kvK,'--cache-type-v',p.kvV,'--n-gpu-layers',String(p.gpuLayers),'--threads',String(p.threads),'--threads-batch',String(p.batchThreads),'--batch-size',String(p.batch),'--ubatch-size',String(p.ubatch),'--cache-ram','0','--flash-attn','on','--no-context-shift'];for(const[k,v]of Object.entries(p.options))if(v!==false)a.push(k,...(v===true?[]:[String(v)]));return a;}
export function applySampling(body,p){Object.assign(body,p.sampling);body.chat_template_kwargs={...body.chat_template_kwargs,enable_thinking:true};}
