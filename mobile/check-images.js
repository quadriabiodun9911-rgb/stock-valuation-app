const Jimp = require('jimp');
const glob = require('glob');
const files = glob.sync('**/*.{png,jpg,jpeg}', {cwd: process.cwd(), nodir:true});
(async ()=>{
  let hadErr = false;
  for(const f of files){
    try{
      await Jimp.read(f);
      console.log('OK', f);
    }catch(e){
      console.error('ERR', f, e && e.message ? e.message : e);
      hadErr = true;
    }
  }
  if(hadErr) process.exit(2);
})();
