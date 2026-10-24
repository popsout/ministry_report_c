import { describe, expect, it } from 'vitest';
import { readAuthReturn } from '../src/lib/auth';
describe('OAuth callback',()=>{
 it('취소 결과를 안전한 안내로 바꾸고 오류 내용을 주소에서 제거한다',()=>{
  const r=readAuthReturn(new URL('https://example.com/?error=access_denied&error_description=sensitive&preview=1'))!;
  expect(r.message).toContain('취소');expect(r.cleanUrl).toBe('/?preview=1');
 });
 it('해시의 오류도 정리하고 제공자 오류 원문을 노출하지 않는다',()=>{
  const r=readAuthReturn(new URL('https://example.com/#error=server_error&error_description=private'))!;
  expect(r.message).not.toContain('private');expect(r.cleanUrl).toBe('/');
 });
 it('성공 PKCE 코드는 SDK에서 처리하도록 보존한다',()=>{
  const u=new URL('https://example.com/?code=example');expect(readAuthReturn(u)).toBeNull();expect(u.searchParams.get('code')).toBe('example');
 });
});
