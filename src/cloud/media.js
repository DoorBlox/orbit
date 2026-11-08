/** Auth-scoped private image storage. Browser receives no service-role key. */
const BUCKET='orbit-private-media';
const TYPES={'image/png':'png','image/jpeg':'jpg','image/webp':'webp'};
const MAX=5*1024*1024;
const ID='[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const pathPattern=new RegExp('^('+ID+')/('+ID+')\\.(png|jpg|webp)$','i');
export function validMediaPath(path){
  return typeof path==='string'&&path.length<=100&&pathPattern.test(path);
}
export function validMediaOwner(path,userId){
  return validMediaPath(path)&&typeof userId==='string'&&path.toLowerCase().startsWith(userId.toLowerCase()+'/');
}
export async function validateImage(file){
  if(!file||typeof file.slice!=='function'||!Number.isInteger(file.size)||
    file.size<12||file.size>MAX||!Object.hasOwn(TYPES,file.type))
    throw Error('Choose a PNG, JPEG or WebP image under 5 MB.');
  const bytes=new Uint8Array(await file.slice(0,12).arrayBuffer());
  const png=[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v);
  const jpg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
  const webp=String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&
    String.fromCharCode(...bytes.slice(8,12))==='WEBP';
  if((file.type==='image/png'&&!png)||(file.type==='image/jpeg'&&!jpg)||
    (file.type==='image/webp'&&!webp))throw Error('The image file signature does not match its type.');
  return TYPES[file.type];
}
export function createPrivateMedia(client,{ownerId}={}){
  if(!client?.storage||!client?.auth?.getUser||typeof ownerId!=='string'||!ownerId)
    throw Error('Authenticated media access is required.');
  const bucket=client.storage.from(BUCKET);
  async function checkUser(){
    const response=await client.auth.getUser();
    if(response.error||response.data?.user?.id!==ownerId)throw Error('Your media session expired. Sign in again.');
  }
  return {
    async upload(file){
      const extension=await validateImage(file);
      await checkUser();
      const filename=globalThis.crypto.randomUUID();
      const path=ownerId+'/'+filename+'.'+extension;
      const result=await bucket.upload(path,file,{contentType:file.type,upsert:false,cacheControl:'3600'});
      if(result.error)throw Error('Private upload failed. Try again.');
      return path;
    },
    async signedUrl(path){
      if(!validMediaOwner(path,ownerId))throw Error('Image belongs to another space or is invalid.');
      await checkUser();
      const result=await bucket.createSignedUrl(path,600);
      if(result.error||!result.data?.signedUrl)throw Error('Cannot load the private image.');
      return result.data.signedUrl;
    }
  };
}
