'use client'
import {useRouter} from 'next/navigation'
import {useState} from 'react'

async function patch(id,body){
 const r=await fetch(`/api/admin/leads/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 const data=await r.json().catch(()=>({ok:false,error:'Ошибка ответа сервера'}));
 if(!data.ok)throw new Error(data.error||data.details||'Не удалось выполнить действие');
 return data;
}

export default function LeadActions({lead}){
 const router=useRouter();
 const [busy,setBusy]=useState('');
 const [message,setMessage]=useState('');
 const [comment,setComment]=useState('');
 const [commentPublic,setCommentPublic]=useState(false);
 async function run(label,body){
  setBusy(label);setMessage('');
  try{await patch(lead.id,body);setMessage('Сохранено');router.refresh()}catch(e){setMessage(String(e.message||e))}
  setBusy('');
 }
 async function saveComment(e){e.preventDefault();if(!comment.trim())return;await run('comment',{action:'comment',comment,is_public:commentPublic});setComment('');setCommentPublic(false)}
 return <section className="card" style={{padding:22,marginTop:18}}><h2 style={{marginTop:0}}>Действия менеджера</h2>{message&&<p className="notice">{message}</p>}<div className="cardActions"><button className="btn" disabled={!!busy} onClick={()=>run('in_progress',{action:'lead_status',status:'in_progress'})}>В работу</button><button className="btn" disabled={!!busy} onClick={()=>run('waiting_client',{action:'lead_status',status:'waiting_client'})}>Ждём клиента</button><button className="btn primary" disabled={!!busy} onClick={()=>run('completed',{action:'lead_status',status:'completed'})}>Выполнена</button><button className="btn danger" disabled={!!busy} onClick={()=>run('declined',{action:'lead_status',status:'declined'})}>Отказ</button></div><div className="cardActions"><button className="btn" disabled={!!busy} onClick={()=>run('verified',{action:'contact_status',contact_status:'verified'})}>Проверен</button><button className="btn" disabled={!!busy} onClick={()=>run('duplicate',{action:'contact_status',contact_status:'duplicate'})}>Дубль</button><button className="btn danger" disabled={!!busy} onClick={()=>run('spam',{action:'contact_status',contact_status:'spam'})}>Спам</button><button className="btn primary" disabled={!!busy} onClick={()=>run('confirm_customer',{action:'confirm_customer'})}>Подтвердить как клиента</button></div><form className="form" onSubmit={saveComment} style={{marginTop:16}}><textarea className="input" value={comment} onChange={e=>setComment(e.target.value)} placeholder="Комментарий менеджера"/><label className="notice" style={{display:'flex',gap:10,alignItems:'center',margin:0}}><input type="checkbox" checked={commentPublic} onChange={e=>setCommentPublic(e.target.checked)}/>Показать клиенту в кабинете</label><button className="btn primary" disabled={!!busy}>{busy==='comment'?'Сохраняем...':'Добавить комментарий'}</button></form></section>
}
