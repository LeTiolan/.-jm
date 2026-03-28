// ================= GAME SETUP =================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const bgCanvas = document.getElementById("bgCanvas");
const bgCtx = bgCanvas.getContext("2d");
const fxCanvas = document.getElementById("fxCanvas");
const fxCtx = fxCanvas.getContext("2d");

canvas.width = bgCanvas.width = fxCanvas.width = window.innerWidth;
canvas.height = bgCanvas.height = fxCanvas.height = window.innerHeight;

let keys = {};
let mouse = {x:0, y:0, down:false};

window.addEventListener("keydown",e=>keys[e.key.toLowerCase()]=true);
window.addEventListener("keyup",e=>keys[e.key.toLowerCase()]=false);
window.addEventListener("mousemove",e=>{mouse.x=e.clientX; mouse.y=e.clientY;});
window.addEventListener("mousedown",()=>mouse.down=true);
window.addEventListener("mouseup",()=>mouse.down=false);

// ================= AUDIO =================
let audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let masterGain = audioCtx.createGain();
masterGain.connect(audioCtx.destination);
masterGain.gain.value = 0.5;

function playTone(freq,duration,volume=0.3,type="sine"){
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type=type;
    osc.frequency.setValueAtTime(freq,audioCtx.currentTime);
    gain.gain.setValueAtTime(volume,audioCtx.currentTime);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

// ================= BACKGROUND EFFECTS =================
let stars=[];
for(let i=0;i<200;i++){
    stars.push({x:Math.random()*canvas.width,y:Math.random()*canvas.height,size:Math.random()*2+1,speed:Math.random()*0.5+0.2});
}
function drawBackground(){
    bgCtx.clearRect(0,0,bgCanvas.width,bgCanvas.height);
    for(let s of stars){
        s.y += s.speed;
        if(s.y>bgCanvas.height)s.y=0;
        bgCtx.fillStyle = "rgba(255,255,255,0.7)";
        bgCtx.beginPath();
        bgCtx.arc(s.x,s.y,s.size,0,Math.PI*2);
        bgCtx.fill();
    }
}

// ================= PLAYER =================
const player = {
    x:canvas.width/2,
    y:canvas.height/2,
    size:22,
    speed:4,
    color:"#6aa9ff",
    hp:100,
    maxHp:100,
    energy:100,
    maxEnergy:100,
    xp:0,
    level:1,
    score:0
};

function drawPlayer(){
    ctx.fillStyle=player.color;
    ctx.beginPath();
    ctx.arc(player.x,player.y,player.size,0,Math.PI*2);
    ctx.fill();
}

// ================= ENEMIES =================
let enemies=[];
let enemyId=0;

function spawnEnemy(){
    let edge=Math.floor(Math.random()*4);
    let x=edge===1?canvas.width:edge===3?0:Math.random()*canvas.width;
    let y=edge===0?0:edge===2?canvas.height:Math.random()*canvas.height;
    enemies.push({
        id:enemyId++,
        x:x,
        y:y,
        size:16,
        speed:Math.random()*1.5+1,
        color:"#ff4d6d",
        hp:30,
        maxHp:30
    });
}

function drawEnemies(){
    for(let e of enemies){
        ctx.fillStyle=e.color;
        ctx.beginPath();
        ctx.arc(e.x,e.y,e.size,0,Math.PI*2);
        ctx.fill();
    }
}

// ================= PROJECTILES =================
let projectiles=[];
function shootProjectile(x,y,tx,ty,speed=6,color="#fff"){
    let angle=Math.atan2(ty-y,tx-x);
    projectiles.push({x:x,y:y,dx:Math.cos(angle)*speed,dy:Math.sin(angle)*speed,size:6,color:color});
}

function drawProjectiles(){
    for(let p of projectiles){
        ctx.fillStyle=p.color;
        ctx.beginPath();
        ctx.arc(p.x,p.y,p.size,0,Math.PI*2);
        ctx.fill();
    }
}

// ================= DAMAGE NUMBERS =================
let damages=[];
function addDamage(x,y,value){
    damages.push({x:x,y:y,value:value,alpha:1});
}

function drawDamages(){
    fxCtx.clearRect(0,0,fxCanvas.width,fxCanvas.height);
    for(let d of damages){
        fxCtx.fillStyle=`rgba(255,255,255,${d.alpha})`;
        fxCtx.font="16px Arial";
        fxCtx.fillText(d.value,d.x,d.y);
        d.y-=0.5;
        d.alpha-=0.02;
    }
    damages = damages.filter(d=>d.alpha>0);
}

// ================= GAME LOOP =================
function update(){
    // player movement
    if(keys["w"])player.y-=player.speed;
    if(keys["s"])player.y+=player.speed;
    if(keys["a"])player.x-=player.speed;
    if(keys["d"])player.x+=player.speed;

    // bounds
    player.x=Math.max(player.size,Math.min(canvas.width-player.size,player.x));
    player.y=Math.max(player.size,Math.min(canvas.height-player.size,player.y));

    // shooting
    if(mouse.down && player.energy>=2){
        shootProjectile(player.x,player.y,mouse.x,mouse.y);
        player.energy-=0.5;
        playTone(800,0.05,0.1,"square");
    }

    // regenerate energy
    player.energy=Math.min(player.maxEnergy,player.energy+0.2);

    // enemies follow player
    for(let e of enemies){
        let angle=Math.atan2(player.y-e.y,player.x-e.x);
        e.x+=Math.cos(angle)*e.speed;
        e.y+=Math.sin(angle)*e.speed;

        // collision with player
        let dx=e.x-player.x;
        let dy=e.y-player.y;
        let dist=Math.sqrt(dx*dx+dy*dy);
        if(dist<e.size+player.size){
            player.hp-=0.2;
        }
    }

    // projectiles collision
    for(let p of projectiles){
        for(let e of enemies){
            let dx=e.x-p.x;
            let dy=e.y-p.y;
            let dist=Math.sqrt(dx*dx+dy*dy);
            if(dist<e.size+p.size){
                e.hp-=10;
                addDamage(e.x,e.y,10);
                projectiles.splice(projectiles.indexOf(p),1);
                playTone(1200,0.03,0.15,"triangle");
                if(e.hp<=0){
                    enemies.splice(enemies.indexOf(e),1);
                    player.score+=5;
                    playTone(400,0.1,0.2,"sawtooth");
                }
                break;
            }
        }
    }

    // spawn enemies periodically
    if(Math.random()<0.02)spawnEnemy();

    // update damages
    drawDamages();
}

// ================= DRAW =================
function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    drawPlayer();
    drawEnemies();
    drawProjectiles();
}

// ================= HUD UPDATE =================
function updateHUD(){
    document.getElementById("hpText").innerText=Math.floor(player.hp)+"/"+player.maxHp;
    document.getElementById("hpBar").style.width=(player.hp/player.maxHp*100)+"%";

    document.getElementById("enText").innerText=Math.floor(player.energy);
    document.getElementById("enBar").style.width=(player.energy/player.maxEnergy*100)+"%";

    document.getElementById("scoreText").innerText=player.score;
}

// ================= ANIMATION LOOP =================
function loop(){
    drawBackground();
    update();
    draw();
    updateHUD();
    requestAnimationFrame(loop);
}

loop();
