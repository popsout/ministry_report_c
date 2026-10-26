import { parseBibleEvents, type BibleEvent } from './bible';
const DB='chagok-private-reading',STORE='vaults';
const encoder=new TextEncoder();
export type Vault={userId:string; version:1; iterations:number; salt:string; iv:string; ciphertext:string; savedAt:string};
function bytes(value:string){return Uint8Array.from(atob(value),c=>c.charCodeAt(0));}
function base64(value:Uint8Array){let out='';for(const byte of value)out+=String.fromCharCode(byte);return btoa(out);}
function openDb():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{
 const request=indexedDB.open(DB,1);request.onupgradeneeded=()=>request.result.createObjectStore(STORE,{keyPath:'userId'});
 request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(Error('기기 저장소를 열지 못했습니다.'));
});}
async function transaction<T>(mode:IDBTransactionMode,run:(store:IDBObjectStore)=>IDBRequest<T>):Promise<T>{
 const db=await openDb();return new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,mode);const request=run(tx.objectStore(STORE));
  tx.oncomplete=()=>{db.close();resolve(request.result);};
  tx.onerror=tx.onabort=()=>{db.close();reject(Error('기기 저장 공간을 확인해 주세요.'));};
 });
}
async function keyFor(password:string,salt:Uint8Array,iterations:number){
 const material=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveKey']);
 return crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt,iterations},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
export async function saveBibleVault(userId:string,password:string,events:BibleEvent[]){
 if(password.length<8)throw Error('기기 잠금 암호를 8자 이상 입력해 주세요.');
 const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
 const iterations=310000,key=await keyFor(password,salt,iterations);
 const data=encoder.encode(JSON.stringify(parseBibleEvents(events)));
 const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encoder.encode(`bible:v1:${userId}`)},key,data);
 const vault:Vault={userId,version:1,iterations,salt:base64(salt),iv:base64(iv),ciphertext:base64(new Uint8Array(ciphertext)),savedAt:new Date().toISOString()};
 await transaction('readwrite',store=>store.put(vault));return vault;
}
export async function unlockBibleVault(vault:Vault,password:string){
 if(vault.version!==1 || vault.iterations!==310000)throw Error('지원하지 않는 저장 형식입니다. 다시 저장해 주세요.');
 try{
  const key=await keyFor(password,bytes(vault.salt),vault.iterations);
  const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(vault.iv),additionalData:encoder.encode(`bible:v1:${vault.userId}`)},key,bytes(vault.ciphertext));
  return parseBibleEvents(JSON.parse(new TextDecoder().decode(plain)));
 }catch{throw Error('잠금 암호가 다르거나 저장 자료가 손상되었습니다.');}
}
export const listBibleVaults=()=>transaction('readonly',store=>store.getAll()) as Promise<Vault[]>;
export const deleteBibleVault=(userId:string)=>transaction('readwrite',store=>store.delete(userId));
export async function clearBibleVaults(){await transaction('readwrite',store=>store.clear());}
