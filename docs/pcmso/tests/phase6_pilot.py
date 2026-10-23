"""Pilot acceptance: authenticated UI + API. Creates clearly labelled simulation fixtures.
Run with python3 docs/pcmso/tests/phase6_pilot.py after minting the approved pilot session.
No credentials or CPF are printed; no outbound notifications are made.
"""
import asyncio
import json
import os
from pathlib import Path
from playwright.async_api import async_playwright

COMPANY = '052c8fc4-b377-4f86-84a5-5c581a2896e5'
PROGRAM = '3aba417b-66a7-4d01-9266-e24f1b482c66'
SCREEN = Path('/tmp/browser/pcmso6')

async def main():
    SCREEN.mkdir(parents=True, exist_ok=True)
    with open(os.path.expanduser('~/.cache/lovable-auth/session.json')) as f:
        session = json.load(f)
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 1280, 'height': 1800})
        page = await context.new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        await page.goto('http://localhost:8080')
        await page.evaluate('([k,v])=>localStorage.setItem(k,v)', [session['storage_key'], json.dumps(session['session'])])
        await page.goto('http://localhost:8080/pcmso/empresa/' + COMPANY)
        await page.get_by_role('button', name='Nova solicitação', exact=True).wait_for()
        # Set up fictional fixtures through the same user-authorized client as the application.
        fixture = await page.evaluate('''async ([company,program]) => {
          const {supabase:s}=await import('/src/integrations/supabase/client.ts');
          const check=r=>{if(r.error)throw Error(r.error.message);return r.data};
          let w=check(await s.from('pcmso_workers').select('id').eq('company_id',company).eq('registration_number','TESTE-FASE6'))[0];
          if(!w) w=check(await s.from('pcmso_workers').insert({company_id:company,full_name:'Trabalhador fictício — teste fase 6',cpf:'52998224725',registration_number:'TESTE-FASE6'}).select('id').single());
          const e=check(await s.from('pcmso_exam_catalog').select('id').eq('company_id',company).limit(1))[0];
          if(!e)throw Error('Missing pilot exam catalogue fixture');
          let t=check(await s.from('pcmso_protocols').select('id').eq('company_id',company).eq('justification','Protocolo fictício para simulação da fase 6'))[0];
          if(!t)t=check(await s.from('pcmso_protocols').insert({company_id:company,program_id:program,exam_id:e.id,exam_name:'Teste',exam_type:'periodico',periodicity_months:12,scope:'todos',justification:'Protocolo fictício para simulação da fase 6'}).select('id').single());
          else check(await s.from('pcmso_protocols').update({active:true}).eq('id',t.id));
          return {worker:w.id,protocol:t.id};
        }''', [COMPANY, PROGRAM])
        await page.reload()
        await page.get_by_role('button', name='Nova solicitação', exact=True).click()
        await page.get_by_role('combobox', name='Trabalhador da convocação').click()
        await page.get_by_role('option', name='Trabalhador fictício — teste fase 6', exact=True).click()
        await page.get_by_role('combobox', name='Protocolo da convocação').click()
        await page.get_by_role('option').first.click()
        await page.get_by_label('Prazo', exact=True).fill('2026-10-22')
        await page.get_by_role('button', name='Criar solicitação', exact=True).click()
        await page.get_by_role('dialog').wait_for(state='hidden')
        await page.get_by_text('Vencido', exact=True).first.wait_for()
        await page.get_by_role('button', name='Atualizar convocação de Trabalhador fictício — teste fase 6').last.click()
        await page.get_by_label('Data do agendamento').fill('2026-10-26')
        await page.get_by_label('Local', exact=True).fill('Local fictício — sem envio externo')
        await page.get_by_label('Motivo da alteração').fill('Agendamento fictício de aceite')
        await page.get_by_role('button', name='Salvar convocação', exact=True).click()
        await page.get_by_role('dialog').wait_for(state='hidden')
        await page.reload()
        await page.get_by_text('Local fictício — sem envio externo', exact=True).last.wait_for()
        await page.screenshot(path=str(SCREEN / 'scheduled.png'))
        results = await page.evaluate('''async ([company,worker,protocol])=>{
          const {supabase:s}=await import('/src/integrations/supabase/client.ts');
          const check=r=>{if(r.error)throw Error(r.error.message);return r.data};
          const assert=(b,m)=>{if(!b)throw Error(m);};
          const orders=check(await s.from('pcmso_exam_orders').select('*').eq('company_id',company).eq('worker_id',worker).order('created_at',{ascending:false}));
          const o=orders[0]; assert(o.status==='agendado','UI scheduling not persisted');
          const params={_company_id:company,_worker_id:worker,_protocol_id:protocol,_due_date:o.due_date,_request_key:o.request_key};
          assert(check(await s.rpc('pcmso_request_exam',params))===o.id,'Retry duplicated order');
          assert((await s.rpc('pcmso_request_exam',{...params,_due_date:'2026-10-27'})).error,'Reused key payload conflict not rejected');
          assert((await s.rpc('pcmso_request_exam',{...params,_company_id:'aaaaaaaa-0000-0000-0000-00000000000a',_request_key:crypto.randomUUID()})).error,'Cross-company access not blocked');
          assert((await s.from('pcmso_exam_orders').update({status:'compareceu'}).eq('id',o.id)).error,'Direct API write bypasses RPC');
          assert((await s.from('pcmso_exam_order_history').insert({company_id:company,order_id:o.id,content:{},reason:'Fake',actor_id:o.created_by})).error,'History forge permitted');
          assert((await s.from('pcmso_exam_orders').delete().eq('id',o.id)).error,'Delete permitted');
          check(await s.rpc('pcmso_worker_event',{_worker_id:worker,_event:'mudanca_funcao',_date:'2026-10-23',_role:'Função fictícia alterada',_sector:'Setor de teste'}));
          const after=check(await s.from('pcmso_exam_orders').select('worker_snapshot,protocol_snapshot').eq('id',o.id).single());
          assert(JSON.stringify(after.worker_snapshot)===JSON.stringify(o.worker_snapshot),'Employment change rewrote order');
          assert(JSON.stringify(after.protocol_snapshot)===JSON.stringify(o.protocol_snapshot),'Protocol snapshot changed');
          assert((await s.rpc('pcmso_update_exam_order',{_order_id:o.id,_status:'agendado',_scheduled_date:null,_location:'',_reason:'Teste inválido'})).error,'Scheduling without date permitted');
          assert((await s.rpc('pcmso_update_exam_order',{_order_id:o.id,_status:'cancelado',_scheduled_date:null,_location:'',_reason:''})).error,'Cancellation without reason permitted');
          return ['Idempotency','Payload conflict','Company isolation','Direct writes denied','History immutable','Delete denied','Employment preserved','Date required','Reason required'];
        }''', [COMPANY, fixture['worker'], fixture['protocol']])
        await page.get_by_role('button', name='Atualizar convocação de Trabalhador fictício — teste fase 6').last.click()
        await page.get_by_role('combobox', name='Situação da convocação').click()
        await page.get_by_role('option', name='Cancelado', exact=True).click()
        await page.get_by_label('Motivo da alteração').fill('Teste encerrado — nenhuma convocação real enviada')
        await page.get_by_role('button', name='Salvar convocação', exact=True).click()
        await page.get_by_role('dialog').wait_for(state='hidden')
        await page.get_by_role('button', name='Histórico da convocação de Trabalhador fictício — teste fase 6').last.click()
        await page.get_by_text('Teste encerrado — nenhuma convocação real enviada', exact=True).wait_for()
        await page.screenshot(path=str(SCREEN / 'history.png'))
        await page.get_by_role('button', name='Fechar', exact=True).click()
        terminal = await page.evaluate('''async ([company,worker,protocol])=>{
          const {supabase:s}=await import('/src/integrations/supabase/client.ts');
          const {data:orders,error}=await s.from('pcmso_exam_orders').select('*').eq('company_id',company).eq('worker_id',worker).order('created_at',{ascending:false});
          if(error)throw Error(error.message);const o=orders[0];
          if(o.status!=='cancelado')throw Error('Cancellation not persisted');
          const r=await s.rpc('pcmso_update_exam_order',{_order_id:o.id,_status:'agendado',_scheduled_date:'2026-10-26',_location:'',_reason:'Reabertura inválida'});
          if(!r.error)throw Error('Cancelled order reopened');
          const disable=await s.from('pcmso_protocols').update({active:false}).eq('id',protocol);
          if(disable.error)throw Error(disable.error.message);
          const inactive=await s.rpc('pcmso_request_exam',{_company_id:company,_worker_id:worker,_protocol_id:protocol,_due_date:'2026-10-27',_request_key:crypto.randomUUID()});
          if(!inactive.error)throw Error('Inactive protocol allowed');return true;
        }''', [COMPANY, fixture['worker'], fixture['protocol']])
        assert terminal
        await page.set_viewport_size({'width':390,'height':844})
        await page.reload()
        await page.get_by_role('button',name='Nova solicitação',exact=True).wait_for()
        assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth'), 'Mobile overflow'
        await page.get_by_role('heading',name='Convocações de exames').scroll_into_view_if_needed()
        await page.screenshot(path=str(SCREEN / 'mobile.png'))
        await context.clear_cookies()
        await page.evaluate('localStorage.clear()')
        await page.reload()
        await page.wait_for_timeout(1500)
        assert await page.get_by_role('button',name='Nova solicitação',exact=True).count()==0, 'Signed-out UI accessible'
        assert await page.evaluate('''async()=>{const {supabase:s}=await import('/src/integrations/supabase/client.ts');const r=await s.from('pcmso_exam_orders').select('id');return !!r.error||!r.data?.length}'''), 'Signed-out API accessible'
        assert not errors, errors
        print('PASS: UI create, schedule, reload, cancel and history; ' + ', '.join(results))
        print('PASS: terminal state, inactive protocol, mobile overflow, signed-out UI/API; runtime errors: 0')
        await browser.close()

asyncio.run(main())