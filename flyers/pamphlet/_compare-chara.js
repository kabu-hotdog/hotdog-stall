// 元 / フラット化 / 2色 の比較シート（4体ずつ）
const fs=require('fs');const {PNG}=require('pngjs');
const dirs=['images/chara/final','images/chara/flat','images/chara/duotone'];
const files=['01-パーカー腕のばし.png','04-NFL.png','06-おなか.png','08-枕で寝る.png'];
const CELL=300;
const out=new PNG({width:CELL*files.length,height:CELL*dirs.length});
for(let i=0;i<out.width*out.height;i++){out.data[i*4]=250;out.data[i*4+1]=248;out.data[i*4+2]=244;out.data[i*4+3]=255;}
dirs.forEach((d,row)=>files.forEach((f,col)=>{
  const p=PNG.sync.read(fs.readFileSync(d+'/'+f));
  const s=Math.min(CELL/p.width,CELL/p.height);
  const gx=col*CELL, gy=row*CELL;
  for(let y=0;y<Math.round(p.height*s);y++)for(let x=0;x<Math.round(p.width*s);x++){
    const sx=Math.round(x/s),sy=Math.round(y/s);if(sx>=p.width||sy>=p.height)continue;
    const si=(sy*p.width+sx)*4,a=p.data[si+3]/255;if(a<0.02)continue;
    const di=((gy+y)*out.width+gx+x)*4;
    for(let c=0;c<3;c++)out.data[di+c]=Math.round(p.data[si+c]*a+out.data[di+c]*(1-a));
  }
}));
fs.writeFileSync('images/chara/_compare.png',PNG.sync.write(out));
console.log('上段=元 / 中段=フラット化 / 下段=2色');
