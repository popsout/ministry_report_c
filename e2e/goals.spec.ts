import {test,expect} from '@playwright/test';
test('보조 목표 전환과 정규 50시간이 월 합계로 계산된다',async({page})=>{
 await page.goto('/?preview=1');const summary=page.getByRole('region',{name:'이번 달 목표 달성 현황'});
 await expect(summary).toContainText('83.3%');await expect(summary).toContainText('2시간 30분');
 page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'30시간',exact:true}).click();
 await expect(summary).toContainText('41.7%');await expect(summary).toContainText('17시간 30분');
 await page.getByRole('button',{name:'전체 기록',exact:true}).click();await expect(summary).toContainText('41.7%');
 await page.getByRole('combobox',{name:'이 달의 파이오니아 신분'}).selectOption('정규 파이오니아');
 await expect(summary).toContainText('50시간');await expect(summary).toContainText('37시간 30분');await expect(summary).toContainText('25%');
 await expect(page.getByRole('group',{name:'보조 파이오니아 월 목표'})).toHaveCount(0);
 await page.getByRole('combobox',{name:'이 달의 파이오니아 신분'}).selectOption('일반');await expect(summary).toHaveCount(0);
});
test('보조 목표를 월별로 저장하고 초기화 후에도 유지한다',async({page})=>{
 await page.goto('/');const role=page.getByRole('combobox',{name:'이 달의 파이오니아 신분'});
 await role.selectOption('보조 파이오니아');page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'30시간',exact:true}).click();await page.reload();
 await expect(page.getByRole('button',{name:'30시간',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'다음 달',exact:true}).click();await role.selectOption('보조 파이오니아');
 await expect(page.getByRole('button',{name:'15시간',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'이전 달',exact:true}).click();
 await page.getByRole('button',{name:'봉사 기록하기',exact:true}).click();await page.getByRole('button',{name:'기록 저장',exact:true}).click();
 await expect(page.getByRole('region',{name:'이번 달 목표 달성 현황'})).toContainText('28시간');
 page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'월간 초기화',exact:true}).click();await page.reload();
 await expect(page.getByRole('button',{name:'30시간',exact:true})).toHaveAttribute('aria-pressed','true');
 await expect(page.getByRole('region',{name:'이번 달 목표 달성 현황'})).toContainText('0%');
});
test('목표 달성·초과 달성 시 잔여는 0이며 표시 막대는 넘치지 않는다',async({page})=>{
 await page.goto('/?preview=1');await page.getByRole('button',{name:'봉사 기록하기',exact:true}).click();
 await page.getByRole('combobox',{name:'시간',exact:true}).selectOption('3');await page.getByRole('button',{name:'기록 저장',exact:true}).click();
 const summary=page.getByRole('region',{name:'이번 달 목표 달성 현황'});await expect(summary).toContainText('목표를 달성');await expect(summary).toContainText('0시간');
 await expect(summary.getByRole('progressbar')).toHaveAttribute('aria-valuenow','100');
 const celebration=page.getByRole('region',{name:'목표 달성 축하'});
 await expect(celebration).toBeVisible();await expect(celebration).toContainText('15시간');
 await expect(page.locator('.app')).toHaveClass(/goal-achieved/);
 const fullscreen=page.getByRole('region',{name:'전체 화면 축하 폭죽'});
 await expect(fullscreen).toBeVisible();
 await expect(fullscreen).toHaveCSS('background-color','rgba(0, 0, 0, 0)');
 await expect(fullscreen).toHaveCSS('background-image','none');
 await expect(page.getByRole('button',{name:'전체 화면 폭죽 멈추기'})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'축하 폭죽 다시 보기'})).toHaveCount(0);
 await expect(fullscreen).toHaveCount(0,{timeout:4500});
 expect(await celebration.locator('.firework i').first().evaluate(el=>getComputedStyle(el).animationIterationCount)).toBe('infinite');
 await page.emulateMedia({reducedMotion:'reduce'});
 expect(await celebration.locator('.firework i').first().evaluate(el=>getComputedStyle(el).animationName)).toBe('none');
 page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'30시간',exact:true}).click();
 await expect(celebration).toHaveCount(0);await expect(fullscreen).toHaveCount(0);await expect(page.locator('.app')).not.toHaveClass(/goal-achieved/);

});
for(const width of [360,768])test(`${width}px에서 목표 선택 박스가 넘치지 않는다`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.goto('/?preview=1');
 await expect(page.getByRole('button',{name:'30시간',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('목표 전환을 확인하며 취소 시 목표를 유지하고 같은 선택에는 확인하지 않는다',async({page})=>{
 await page.goto('/?preview=1');await expect(page.getByRole('heading',{level:1})).toHaveText('My Ministry Journal');
 let dialogs=0;page.on('dialog',d=>{dialogs++;if(dialogs===1){expect(d.message()).toContain('15시간에서 30시간');void d.dismiss();}else{expect(d.message()).toContain('15시간에서 30시간');void d.accept();}});
 await page.getByRole('button',{name:'15시간',exact:true}).click();expect(dialogs).toBe(0);
 await page.getByRole('button',{name:'30시간',exact:true}).click();await expect(page.getByRole('button',{name:'15시간',exact:true})).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('.donut')).toHaveAccessibleName(/목표 15시간/);
 await page.getByRole('button',{name:'30시간',exact:true}).click();await expect(page.getByRole('button',{name:'30시간',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'30시간',exact:true}).click();expect(dialogs).toBe(2);
});

test('최초 목표 달성에서 3초만 재생하며 새로고침과 재달성에는 반복하지 않는다',async({page})=>{
 await page.clock.setFixedTime(new Date(2026,10,3,12));
 await page.addInitScript(()=>{
  if(localStorage.getItem('chagok.journal.v1'))return;
  localStorage.setItem('chagok.journal.v1',JSON.stringify({version:1,settings:[{month:'2026-11-01',role:'보조 파이오니아',updated_at:''}],entries:[1,2].map(day=>({id:String(day),user_id:'local',service_date:`2026-11-0${day}`,service_type:'호별',minutes:420,note:'',updated_at:''}))}));
 });
 await page.goto('/');const effect=page.getByRole('region',{name:'전체 화면 축하 폭죽'});
 await expect(effect).toHaveCount(0);
 await page.getByRole('button',{name:'봉사 기록하기',exact:true}).click();await page.getByRole('button',{name:'기록 저장',exact:true}).click();
 await expect(effect).toBeVisible();await expect(effect).toHaveCount(0,{timeout:4500});
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('chagok.journal.v1')!).settings[0].goalCelebrated)).toBe(true);
 await page.reload();await expect(page.getByRole('region',{name:'목표 달성 축하'})).toBeVisible();await expect(effect).toHaveCount(0);
 await page.getByRole('button',{name:'다음 달',exact:true}).click();await page.getByRole('button',{name:'이전 달',exact:true}).click();await expect(effect).toHaveCount(0);
 page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'월간 초기화',exact:true}).click();
 for(let i=0;i<2;i++){
  await page.getByRole('button',{name:'봉사 기록하기',exact:true}).click();await page.getByRole('combobox',{name:'시간',exact:true}).selectOption('8');await page.getByRole('button',{name:'기록 저장',exact:true}).click();
 }
 await expect(page.getByRole('region',{name:'목표 달성 축하'})).toBeVisible();await expect(effect).toHaveCount(0);
});
