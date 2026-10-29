const fs=require('node:fs'),path=require('node:path');
async function createShortcut(root){
 if(process.platform!=='win32')return;
 const png=await require('sharp')(path.join(root,'public','favicon.svg')).resize(256,256).png().toBuffer();
 const header=Buffer.alloc(22);header.writeUInt16LE(1,2);header.writeUInt16LE(1,4);header.writeUInt16LE(1,10);header.writeUInt16LE(32,12);header.writeUInt32LE(png.length,14);header.writeUInt32LE(22,18);
 const icon=path.join(root,'public','lemmata.ico');fs.writeFileSync(icon,Buffer.concat([header,png]));
 const script=path.join(root,'scripts','setup-shortcut.ps1');
 await require('./setup-core.cjs').run('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',script,'-Root',root]);
 console.log('  Created Lemmata Setup.lnk with the Lemmata icon.');
}
module.exports={createShortcut};
