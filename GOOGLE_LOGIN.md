> 보류된 후속 작업 문서입니다. 현재 앱은 로그인 없는 한 기기 저장을 우선하며, 아래 Google 로그인 UI는 현재 화면에서 사용하지 않습니다. 온라인 연동 단계에서 다시 검토하세요.

# 구글 로그인 연결

앱의 Google 로그인 버튼과 PKCE 인증 복귀 처리는 구현되어 있습니다. 실제 Google 계정 로그인은 아래 외부 설정과 앱 배포 주소가 필요합니다. Google Cloud의 OAuth 클라이언트 시크릿은 Supabase에만 입력하며, 앱 코드·GitHub·채팅에는 입력하지 않습니다.

## 1. UI를 먼저 확인하기

앱 주소 끝에 `?preview=1`을 붙이거나, 로그인 전 화면에서 **예시 화면 보기**를 누르세요. 예시 데이터로 입력·수정·통계를 살펴볼 수 있습니다. 이 모드의 변경은 온라인에 저장되지 않고, 새로고침하면 초기화됩니다. **실제 기록장으로** 링크로 돌아갈 수 있습니다.

## 2. 사용할 웹 주소 준비

실제 휴대폰/PC에서는 동일한 HTTPS 배포 주소를 사용합니다. 무료 정적 호스팅에 빌드 명령 `npm run build`, 출력 디렉터리 `dist`와 기존 `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`를 등록하세요. 클라우드 환경 게시와 웹사이트 배포는 별개입니다. 이 저장소에서 공개 웹사이트 배포는 아직 하지 않았습니다.

## 3. Google Cloud OAuth 클라이언트 만들기

1. https://console.cloud.google.com/ 에서 프로젝트를 만들거나 선택합니다. OAuth 설정을 위해 유료 API나 결제 계정을 추가할 필요는 없습니다.
2. **Google Auth Platform** (또는 **APIs & Services → OAuth consent screen**)에서 시작합니다. 앱 이름 `차곡`, 지원 이메일, 연락처 이메일을 입력합니다.
3. 개인 Google 계정이라면 Audience는 **External**로 구성합니다. 개인 시험 사용 단계에서는 Testing 상태로 두고 **Test users에 본인 Google 이메일**을 추가합니다. 추가 API 권한을 요청하지 말고 기본 로그인용 `openid`, 이메일, 프로필 범위만 사용합니다.
4. **Clients → Create client** (또는 **Credentials → Create OAuth client ID**)를 선택하고 유형은 **Web application**으로 합니다.
5. **Authorized redirect URIs**에 다음을 정확히 등록합니다. 앱 주소가 아니라 Supabase 인증 콜백 주소입니다.

   `https://bectruddvgctsnhbbehx.supabase.co/auth/v1/callback`

6. Authorized JavaScript origins를 입력하는 경우 실제 앱의 origin (`https://배포도메인`, 경로 제외)을 사용합니다.
7. 생성된 **Client ID**와 **Client secret**을 확인합니다. Google 설정 변경은 반영에 시간이 걸릴 수 있습니다.

## 4. Supabase에서 Google 활성화

1. Supabase 프로젝트 **Authentication → Sign In / Providers → Google**로 이동합니다. 화면 버전에 따라 Providers 메뉴 위치는 다를 수 있습니다.
2. Google 제공자를 활성화하고 위의 Client ID와 Client secret을 입력한 뒤 저장합니다.
3. **Authentication → URL Configuration**에서 **Site URL**을 실제 앱 HTTPS 주소로 지정합니다.
4. **Redirect URLs**에도 앱의 정확한 복귀 주소 (`https://배포도메인/`)를 등록합니다. 하위 경로에 배포한다면 그 경로까지 동일하게 등록합니다. 와일드카드로 아무 사이트나 허용하지 않습니다.

Google의 redirect URI는 Supabase `/auth/v1/callback`, Supabase의 Redirect URL은 앱 주소입니다. 두 주소의 역할이 다릅니다.

## 5. 실제 검증

1. 앱에서 **구글로 로그인 → Google 계정으로 계속하기**를 누릅니다. 같은 브라우저에서 인증을 완료합니다 (PKCE 검증 정보가 브라우저에 저장됩니다).
2. 구글 동의 후 앱으로 복귀하고, 기록 1건을 저장합니다. 새로고침해도 남는지 확인합니다.
3. 다른 기기에서 같은 앱 주소/같은 Google 계정으로 로그인해 생성·수정·삭제, 월별 신분 변경이 반영되는지 확인합니다.
4. 서로 같은 기록을 열고 한쪽에서 먼저 저장한 뒤 다른 쪽에서 저장해 충돌 안내를 확인합니다.
5. 구글 동의를 취소하면 앱에서 취소 안내가 표시되는지 확인합니다.

현재 자동 테스트는 OAuth 시작 요청/PKCE/오류 안내를 모의 인증 응답으로 검증합니다. Google의 실제 동의 화면, 인증 완료, 로그인한 사용자의 RLS와 실기기 동기화는 이 설정을 완료한 후 검증해야 합니다.

## 자주 만나는 오류

- `redirect_uri_mismatch`: Google 클라이언트의 Authorized redirect URIs에 Supabase 콜백 주소를 확인합니다.
- `access_denied`: 본인 이메일이 Google 테스트 사용자에 포함됐는지 확인합니다.
- 앱 대신 다른 주소로 복귀: Supabase Site URL/Redirect URLs가 실제 배포 주소와 일치하는지 확인합니다.
- 구글 로그인 연결 준비 안내: Supabase Google 제공자가 아직 활성화되지 않은 상태입니다.

공식 안내: https://supabase.com/docs/guides/auth/social-login/auth-google
