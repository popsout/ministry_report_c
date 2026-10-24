import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { describe,it,expect } from 'vitest';
const A='11111111-1111-4111-8111-111111111111', B='22222222-2222-4222-8222-222222222222';
const document=JSON.stringify({version:1,entries:[],settings:[]});
describe('실제 PostgreSQL 엔진의 행 접근 정책 (격리된 로컬 DB)',()=>{
 it('익명·타인 접근·계정 위조·오래된 수정·직접 삭제를 차단한다',async()=>{
  const db=new PGlite();
  try{
   await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); insert into auth.users values('${A}'),('${B}'); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth to authenticated; create publication supabase_realtime;`);
   await db.exec(readFileSync(new URL('../supabase/003_personal_journals.sql',import.meta.url),'utf8'));
   await db.exec('set role anon');
   await expect(db.query('select * from public.personal_journals')).rejects.toMatchObject({code:'42501'});
   await expect(db.query(`insert into public.personal_journals(user_id,document,revision) values($1,$2,1)`,[A,document])).rejects.toMatchObject({code:'42501'});
   await db.exec('reset role;set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[A]);
   await db.query('insert into public.personal_journals(user_id,document,revision) values($1,$2,1)',[A,document]);
   expect((await db.query('select user_id from public.personal_journals')).rows).toEqual([{user_id:A}]);
   await expect(db.query('insert into public.personal_journals(user_id,document,revision) values($1,$2,1)',[B,document])).rejects.toMatchObject({code:'42501'});
   await db.query("select set_config('request.jwt.claim.sub',$1,false)",[B]);
   expect((await db.query('select * from public.personal_journals where user_id=$1',[A])).rows).toHaveLength(0);
   expect((await db.query('update public.personal_journals set revision=2 where user_id=$1 returning user_id',[A])).rows).toHaveLength(0);
   await db.query('insert into public.personal_journals(user_id,document,revision) values($1,$2,1)',[B,document]);
   await expect(db.query('update public.personal_journals set revision=1 where user_id=$1',[B])).rejects.toMatchObject({code:'P0001'});
   await expect(db.query('update public.personal_journals set user_id=$1,revision=2 where user_id=$2',[A,B])).rejects.toMatchObject({code:'P0001'});
   expect((await db.query('update public.personal_journals set revision=2 where user_id=$1 and revision=1 returning revision',[B])).rows).toEqual([{revision:2}]);
   expect((await db.query('update public.personal_journals set revision=2 where user_id=$1 and revision=1 returning revision',[B])).rows).toHaveLength(0);
   await expect(db.query('delete from public.personal_journals where user_id=$1',[B])).rejects.toMatchObject({code:'42501'});
  }finally{await db.close();}
 },30000);
});
