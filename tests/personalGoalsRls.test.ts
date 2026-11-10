import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { emptyGoals } from '../src/lib/goals';
const A = '11111111-1111-4111-8111-111111111111', B = '22222222-2222-4222-8222-222222222222';
it('목표 RLS는 계정 간 접근·위조·오래된 수정을 차단하고 봉사 데이터를 보존한다', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); insert into auth.users values('${A}'),('${B}'); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth to authenticated; create publication supabase_realtime;`);
    await db.exec(readFileSync(new URL('../supabase/003_personal_journals.sql', import.meta.url), 'utf8'));
    const journal = JSON.stringify({ version: 1, entries: [], settings: [] });
    await db.query('insert into public.personal_journals(user_id,document,revision) values($1,$2,1)', [A, journal]);
    const before = await db.query('select * from public.personal_journals');
    const policiesBefore = await db.query("select * from pg_policies where tablename='personal_journals'");
    const sql = readFileSync(new URL('../supabase/007_personal_goals.sql', import.meta.url), 'utf8');
    await db.exec(sql); await db.exec(sql);
    expect(await db.query('select * from public.personal_journals')).toEqual(before);
    expect(await db.query("select * from pg_policies where tablename='personal_journals'")).toEqual(policiesBefore);
    await db.exec('set role anon');
    await expect(db.query('select * from public.personal_goals')).rejects.toMatchObject({ code: '42501' });
    await db.exec('reset role; set role authenticated'); await db.query("select set_config('request.jwt.claim.sub',$1,false)", [A]);
    await db.query('insert into public.personal_goals(user_id,document,revision) values($1,$2,1)', [A, JSON.stringify(emptyGoals())]);
    await expect(db.query('insert into public.personal_goals(user_id,document,revision) values($1,$2,1)', [B, JSON.stringify(emptyGoals())])).rejects.toMatchObject({ code: '42501' });
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [B]);
    expect((await db.query('select * from public.personal_goals')).rows).toHaveLength(0);
    expect((await db.query('update public.personal_goals set revision=2 where user_id=$1 returning user_id', [A])).rows).toHaveLength(0);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [A]);
    await expect(db.query('update public.personal_goals set revision=1')).rejects.toMatchObject({ code: 'P0001' });
    expect((await db.query('update public.personal_goals set revision=2 where revision=1 returning revision')).rows).toEqual([{ revision: 2 }]);
    expect((await db.query('update public.personal_goals set revision=2 where revision=1 returning revision')).rows).toHaveLength(0);
    await expect(db.query('delete from public.personal_goals')).rejects.toMatchObject({ code: '42501' });
  } finally { await db.close(); }
}, 30000);
