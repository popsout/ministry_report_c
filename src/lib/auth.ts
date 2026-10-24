// Only translate known OAuth outcomes. Never display raw provider errors or tokens.
export function readAuthReturn(url: URL) {
  const fragment = new URLSearchParams(url.hash.slice(1));
  const error = url.searchParams.get('error') || fragment.get('error');
  if (!error) return null;
  const message = error === 'access_denied'
    ? '구글 로그인이 취소되었거나 권한이 허용되지 않았습니다. 다시 시도해 주세요.'
    : '구글 로그인에 실패했습니다. 연결 설정을 확인한 뒤 다시 시도해 주세요.';
  for (const key of ['error', 'error_code', 'error_description']) {
    url.searchParams.delete(key);
    fragment.delete(key);
  }
  url.hash = fragment.toString();
  return { message, cleanUrl: url.pathname + url.search + url.hash };
}
