import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { expect,it } from 'vitest';
const admin='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
it('일반 계정은 접근할 수 없고 서버 관리자 목록만 읽기 권한을 부여한다',async()=>{
 const db=new PGlite();
 try{
  await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);insert into auth.users values('${admin}'),('${other}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;`);
  const schema=readFileSync(new URL('../supabase/004_bible_reading.sql',import.meta.url),'utf8');await db.exec(schema);await db.exec(schema);
  await db.query('insert into bible_private.bible_admins values($1)',[admin]);
  await db.exec("insert into public.bible_reading_events(id,era_id,era_title,era_order,event_order,title,summary,passages) values('test','era','시대',1,1,'비공개 사건','본문이 아닌 테스트 요약','[]')");
  await db.exec('set role anon');await expect(db.query('select * from public.bible_reading_events')).rejects.toMatchObject({code:'42501'});
  await db.exec('reset role;set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[other]);
  expect((await db.query('select public.is_bible_admin() as allowed')).rows).toEqual([{allowed:false}]);
  expect((await db.query('select * from public.bible_reading_events')).rows).toEqual([]);
  await expect(db.query('insert into bible_private.bible_admins values($1)',[other])).rejects.toMatchObject({code:'42501'});
  await expect(db.exec("update public.bible_reading_events set summary='overwrite'")).rejects.toMatchObject({code:'42501'});
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[admin]);
  expect((await db.query('select public.is_bible_admin() as allowed')).rows).toEqual([{allowed:true}]);
  expect((await db.query('select id from public.bible_reading_events')).rows).toEqual([{id:'test'}]);
  await expect(db.exec("delete from public.bible_reading_events")).rejects.toMatchObject({code:'42501'});
  await db.exec('reset role');await db.query('delete from bible_private.bible_admins where user_id=$1',[admin]);await db.exec('set role authenticated');
  expect((await db.query('select * from public.bible_reading_events')).rows).toEqual([]);
 }finally{await db.close();}
},60000);
