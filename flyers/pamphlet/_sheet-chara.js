// キャラ画像の顔矩形を目で測るための一覧（100px方眼つき）
const fs=require('fs');const {PNG}=require('pngjs');
const DIR='images/chara/final';
const files=fs.readdirSync(DIR).filter(f=>f.endsWith('.png')).sort();
const CELL=360, COLS=4, rows=Math.ceil(files.length/COLS);
const out=new PNG({width:CELL*COLS,height:CELL*rows});
for(let i=0;i<out.width*out.height;i++){out.data[i*4]=245;out.data[i*4+1]=245;out.data[i*4+2]=250;out.data[i*4+3]=255;}
const put=(x,y,r,g,b)=>{if(x<0||y<0||x>=out.width||y>=out.height)return;const d=(y*out.width+x)*4;out.data[d]=r;out.data[d+1]=g;out.data[d+2]=b;};
files.forEach((f,n)=>{
  const p=PNG.sync.read(fs.readFileSync(DIR+'/'+f));
  const s=Math.min(CELL/p.width,CELL/p.height);
  const gx=(n%COLS)*CELL, gy=Math.floor(n/COLS)*CELL;
  for(let y=0;y<Math.round(p.height*s);y++)for(let x=0;x<Math.round(p.width*s);x++){
    const sx=Math.round(x/s), sy=Math.round(y/s); if(sx>=p.width||sy>=p.height)continue;
    const si=(sy*p.width+sx)*4, a=p.data[si+3]/255; if(a<0.02)continue;
    const di=((gy+y)*out.width+gx+x)*4;
    for(let c=0;c<3;c++)out.data[di+c]=Math.round(p.data[si+c]*a+out.data[di+c]*(1-a));
  }
  // 元画像100pxごとの方眼
  for(let gxx=0;gxx<p.width;gxx+=100){const X=gx+Math.round(gxx*s);for(let y=0;y<Math.round(p.height*s);y+=2)put(X,gy+y,255,0,0);}
  for(let gyy=0;gyy<p.height;gyy+=100){const Y=gy+Math.round(gyy*s);for(let x=0;x<Math.round(p.width*s);x+=2)put(gx+x,Y,255,0,0);}
  for(let x=0;x<CELL;x++){put(gx+x,gy,120,120,140);put(gx+x,gy+CELL-1,120,120,140);}
  for(let y=0;y<CELL;y++){put(gx,gy+y,120,120,140);put(gx+CELL-1,gy+y,120,120,140);}
});
fs.writeFileSync('images/chara/_sheet.png',PNG.sync.write(out));
console.log(files.map((f,i)=>i+':'+f).join(' | '));
