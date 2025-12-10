const Explore = {
    x: 0,
    y: 0,
    speed: 5,
    objects: [],
    frameId: null,
    raidInterval: null,
    
    init: () => {
        if (document.getElementById('explore-screen').classList.contains('active')) {
            // Only generate map if empty (first load)
            if (Explore.objects.length === 0) Explore.generateMap();
            Explore.setupJoystick();
            Explore.startLoop();
        }
    },

    start: () => {
        // CLEANUP
        cancelAnimationFrame(Game.state.animationFrame); 
        
        // UI SWITCH
        document.getElementById('catch-screen').classList.remove('active');
        document.getElementById('explore-screen').classList.add('active');
        document.getElementById('result-overlay').classList.remove('visible');
        document.getElementById('result-overlay').style.display = 'none';

        UI.updateHUD();
        
        // RESET INPUTS (Fixes frozen joystick)
        Explore.joystick.active = false;
        Explore.joystick.dx = 0; 
        Explore.joystick.dy = 0;
        const knob = document.getElementById('joystick-knob');
        if(knob) knob.style.transform = `translate(-50%, -50%)`;

        // RESTART LOOP
        if (Explore.objects.length === 0) Explore.init();
        else Explore.startLoop();
    },

    startLoop: () => {
        if (Explore.frameId) cancelAnimationFrame(Explore.frameId);
        Explore.frameId = requestAnimationFrame(Explore.update);
    },

    generateMap: () => {
        const map = document.getElementById('world-map');
        map.innerHTML = '';
        Explore.objects = [];

        for (let i = 0; i < 25; i++) {
            const typeProb = Math.random();
            let el, objType, id = null;
            const x = Math.random() * 1800 + 100; 
            const y = Math.random() * 1800 + 100;

            if (typeProb < 0.08) {
                el = document.createElement('div'); el.className = 'map-obj gym';
                el.innerHTML = `<div class="gym-dome"></div>`; objType = 'gym';
            } else if (typeProb < 0.12) {
                el = document.createElement('div'); el.className = 'map-obj raid';
                el.innerHTML = `<div class="raid-timer">02:00</div>`; objType = 'raid';
            } else if (typeProb < 0.4) {
                el = document.createElement('div'); el.className = 'map-obj pokestop';
                objType = 'stop';
            } else {
                el = document.createElement('div'); el.className = 'map-obj wild-spawn';
                id = [1,4,7,25,133,16,19,43,69,60][Math.floor(Math.random()*10)]; 
                const realId = Math.floor(Math.random() * 150) + 1;
                el.innerHTML = `<img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${realId}.png" width="50">`;
                objType = 'wild';
                id = realId; 
            }

            el.style.left = x + 'px';
            el.style.top = y + 'px';
            map.appendChild(el);
            Explore.objects.push({ x, y, type: objType, el, id, spun: false });
        }
    },

    joystick: { active: false, dx: 0, dy: 0, startX:0, startY:0 },
    
    setupJoystick: () => {
        const zone = document.getElementById('joystick-zone');
        const knob = document.getElementById('joystick-knob');
        
        const start = (e) => {
            e.preventDefault();
            const p = e.touches ? e.touches[0] : e;
            Explore.joystick.active = true;
            Explore.joystick.startX = p.clientX;
            Explore.joystick.startY = p.clientY;
            knob.style.transition = 'none';
        };
        const move = (e) => {
            if (!Explore.joystick.active) return;
            e.preventDefault();
            const p = e.touches ? e.touches[0] : e;
            const maxDist = 35;
            let dx = p.clientX - Explore.joystick.startX;
            let dy = p.clientY - Explore.joystick.startY;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist > maxDist) {
                const ratio = maxDist / dist;
                dx *= ratio; dy *= ratio;
            }
            knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
            Explore.joystick.dx = dx / maxDist;
            Explore.joystick.dy = dy / maxDist;
        };
        const end = () => {
            Explore.joystick.active = false;
            Explore.joystick.dx = 0; Explore.joystick.dy = 0;
            knob.style.transition = 'transform 0.2s';
            knob.style.transform = `translate(-50%, -50%)`;
        };

        zone.addEventListener('touchstart', start, {passive:false});
        window.addEventListener('touchmove', move, {passive:false});
        window.addEventListener('touchend', end);
        zone.addEventListener('mousedown', start);
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', end);
    },

    update: () => {
        if (!document.getElementById('explore-screen').classList.contains('active')) return;

        Explore.x -= Explore.joystick.dx * Explore.speed;
        Explore.y -= Explore.joystick.dy * Explore.speed;
        Explore.x = Math.max(-900, Math.min(900, Explore.x));
        Explore.y = Math.max(-900, Math.min(900, Explore.y));

        document.getElementById('world-map').style.transform = `translate(calc(-50% + ${Explore.x}px), calc(-50% + ${Explore.y}px))`;

        const px = 1000 - Explore.x;
        const py = 1000 - Explore.y;

        Explore.objects.forEach(obj => {
            if (obj.x === -9999) return;
            const dist = Math.sqrt(Math.pow(obj.x - px, 2) + Math.pow(obj.y - py, 2));
            
            if (dist < 50) {
                if (obj.type === 'wild') {
                    Explore.triggerEncounter(obj.id);
                    obj.el.style.display = 'none';
                    obj.x = -9999; 
                } else if (obj.type === 'stop') {
                    Explore.spinStop(obj);
                } else if (obj.type === 'gym') {
                    Explore.openGym(obj);
                } else if (obj.type === 'raid') {
                    Explore.openRaid(obj);
                }
            }
        });

        Explore.frameId = requestAnimationFrame(Explore.update);
    },

    triggerEncounter: (id) => {
        cancelAnimationFrame(Explore.frameId);
        setTimeout(() => {
            document.getElementById('explore-screen').classList.remove('active');
            document.getElementById('catch-screen').classList.add('active');
            Game.spawn(id); 
        }, 500);
    },

    spinStop: (obj) => {
        if(obj.spun) return; // Cooldown active
        obj.spun = true;
        
        // Visual Change
        obj.el.style.background = "#E91E63"; 
        
        // Rewards Logic
        const balls = Math.floor(Math.random() * 3) + 2; // 2-5 Balls
        const berries = Math.floor(Math.random() * 2) + 1; // 1-3 Berries
        const xp = 100;
        
        Data.inventory['Poke Ball'] += balls;
        Data.inventory['Razz Berry'] += berries;
        Data.user.xp += xp;

        // Level Up Check
        if (Data.user.xp >= Data.user.nextLevelXp) setTimeout(Game.levelUp, 1000);
        
        Game.save();
        UI.updateHUD();

        // Specific Floating Text
        const cx = window.innerWidth/2;
        const cy = window.innerHeight/2;
        
        UI.spawnFloatText(`+${balls} Poke Balls`, cx, cy - 50, "#2196F3");
        setTimeout(() => UI.spawnFloatText(`+${berries} Razz Berries`, cx, cy, "#E91E63"), 300);
        setTimeout(() => UI.spawnFloatText(`+${xp} XP`, cx, cy + 50, "#FFEB3B"), 600);

        // 120 Second Cooldown
        setTimeout(() => { 
            obj.spun = false; 
            obj.el.style.background = "#2196F3"; 
        }, 120000); 
    },

    openGym: (obj) => {
        const modal = document.getElementById('gym-modal');
        modal.style.display = 'flex';
        Explore.joystick.active = false;
        
        const slot = document.getElementById('gym-defender-slot');
        if (Data.gymDefenders && Data.gymDefenders.length > 0) {
            const def = Data.gymDefenders[0];
            const minutes = Math.floor((Date.now() - def.start) / 60000);
            const candyEarned = Math.min(100, minutes);
            
            slot.innerHTML = `
                <img src="${ASSETS.poke + def.id + '.png'}" width="80" style="display:block; margin:0 auto;">
                <div style="font-weight:bold; font-size:18px;">${def.name}</div>
                <div style="color:#E91E63; font-weight:bold;">+${candyEarned} Candy Generated</div>
                <button onclick="Explore.recallDefender()" style="margin-top:10px; padding:8px 20px; background:#FF5722; color:white; border:none; border-radius:20px;">Recall</button>
            `;
            document.getElementById('btn-deploy').style.display = 'none';
        } else {
            slot.innerHTML = `<div style="color:#888; font-size:18px;">Gym is Empty</div>`;
            document.getElementById('btn-deploy').style.display = 'flex';
        }
    },
    
    closeGym: () => { document.getElementById('gym-modal').style.display = 'none'; },

    deployDefender: () => {
        if(Data.storage.length === 0) return;
        const p = Data.storage[0];
        Data.gymDefenders = [{ id: p.id, name: p.name, start: Date.now(), family: p.family }];
        Data.storage.splice(0, 1); 
        Game.save();
        Explore.openGym();
    },

    recallDefender: () => {
        const def = Data.gymDefenders[0];
        const minutes = Math.floor((Date.now() - def.start) / 60000);
        const earned = Math.min(100, minutes);
        
        if(!Data.candyBag[def.family]) Data.candyBag[def.family] = 0;
        Data.candyBag[def.family] += earned;
        UI.spawnFloatText(`+${earned} ${def.family} Candy`, window.innerWidth/2, window.innerHeight/2, "#E91E63");

        Data.storage.unshift({
            id: def.id, name: def.name, cp: Math.floor(Math.random()*2000)+100, 
            family: def.family, date: new Date().toLocaleDateString()
        });
        
        Data.gymDefenders = [];
        Game.save();
        Explore.closeGym();
    },

    currentRaidBossId: null,

    openRaid: (obj) => {
        const modal = document.getElementById('raid-modal');
        modal.style.display = 'flex';
        Explore.joystick.active = false;

        const bossId = [150, 144, 145, 146, 243, 244, 245, 384][Math.floor(Math.random()*8)];
        Explore.currentRaidBossId = bossId;
        
        document.getElementById('raid-boss-img').src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${bossId}.png`;
        
        document.getElementById('battle-team').innerHTML = `
            <div style="text-align:center; width:100%;">
                <p style="color:#666; font-size:14px;">Select your team to fight!</p>
                <div id="raid-team-slots" style="display:flex; justify-content:center; gap:10px; margin:10px 0;"></div>
                <button id="btn-start-raid" class="btn-action" style="background:#F44336; width:100%; justify-content:center;" onclick="Explore.startRaidBattle()">START BATTLE</button>
            </div>
        `;
        
        const slotsDiv = document.getElementById('raid-team-slots');
        for(let i=0; i<3; i++) {
            if(Data.storage[i]) {
                slotsDiv.innerHTML += `<div class="battle-mon"><img src="${ASSETS.poke + Data.storage[i].id + '.png'}"></div>`;
            } else {
                slotsDiv.innerHTML += `<div class="battle-mon" style="background:#eee"></div>`;
            }
        }
        
        document.getElementById('raid-hp-fill').style.width = '100%';
    },

    startRaidBattle: () => {
        document.getElementById('btn-start-raid').style.display = 'none';
        
        let hp = 100;
        const bar = document.getElementById('raid-hp-fill');
        
        Explore.raidInterval = setInterval(() => {
            if(document.getElementById('raid-modal').style.display === 'none') { 
                clearInterval(Explore.raidInterval); 
                return; 
            }
            
            hp -= 15; 
            bar.style.width = hp + '%';
            
            const boss = document.getElementById('raid-boss-img');
            boss.classList.add('attack-anim');
            setTimeout(() => boss.classList.remove('attack-anim'), 200);

            if(hp <= 0) {
                clearInterval(Explore.raidInterval);
                
                // WIN REWARD
                UI.spawnFloatText("RAID WON! +1000 XP", window.innerWidth/2, window.innerHeight/2, "#FFC107");
                Data.user.xp += 1000;
                if (Data.user.xp >= Data.user.nextLevelXp) setTimeout(Game.levelUp, 1500);
                Game.save();
                UI.updateHUD();

                setTimeout(() => {
                    document.getElementById('raid-modal').style.display = 'none';
                    Explore.triggerEncounter(Explore.currentRaidBossId); 
                }, 2000);
            }
        }, 1500);
    },
    
    closeRaid: () => { 
        clearInterval(Explore.raidInterval);
        document.getElementById('raid-modal').style.display = 'none'; 
    }
};