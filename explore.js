const Explore = {
    x: 0,
    y: 0,
    speed: 5,
    objects: [],
    frameId: null,
    
    init: () => {
        // Only run if we are in Explore mode
        if (document.getElementById('explore-screen').classList.contains('active')) {
            Explore.generateMap();
            Explore.setupJoystick();
            Explore.startLoop();
        }
    },

    start: () => {
        // Switch Screens
        document.getElementById('catch-screen').classList.remove('active');
        document.getElementById('explore-screen').classList.add('active');
        
        // Ensure HUD is correct
        UI.updateHUD();
        
        // Start Map Logic
        if (Explore.objects.length === 0) Explore.init();
        else Explore.startLoop();
    },

    startLoop: () => {
        if (!Explore.frameId) Explore.frameId = requestAnimationFrame(Explore.update);
    },

    generateMap: () => {
        const map = document.getElementById('world-map');
        map.innerHTML = ''; // Clear old
        Explore.objects = [];

        // Generate 25 Objects randomly
        for (let i = 0; i < 25; i++) {
            const typeProb = Math.random();
            let el, objType;
            // Random Coords (2000x2000 map)
            const x = Math.random() * 1800 + 100; 
            const y = Math.random() * 1800 + 100;

            if (typeProb < 0.08) {
                // GYM (8%)
                el = document.createElement('div'); 
                el.className = 'map-obj gym';
                el.innerHTML = `<div class="gym-dome"></div>`;
                objType = 'gym';
            } else if (typeProb < 0.12) {
                // RAID (4%)
                el = document.createElement('div'); 
                el.className = 'map-obj raid';
                el.innerHTML = `<div class="raid-timer">02:00</div>`;
                objType = 'raid';
            } else if (typeProb < 0.4) {
                // POKESTOP (28%)
                el = document.createElement('div'); 
                el.className = 'map-obj pokestop';
                objType = 'stop';
            } else {
                // WILD SPAWN (60%)
                el = document.createElement('div'); 
                el.className = 'map-obj wild-spawn';
                const id = Math.floor(Math.random() * 150) + 1; 
                el.innerHTML = `<img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png" width="50">`;
                objType = 'wild';
            }

            el.style.left = x + 'px';
            el.style.top = y + 'px';
            map.appendChild(el);
            Explore.objects.push({ x, y, type: objType, el });
        }
    },

    // JOYSTICK LOGIC
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
        // Mouse fallback
        zone.addEventListener('mousedown', start);
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', end);
    },

    update: () => {
        if (!document.getElementById('explore-screen').classList.contains('active')) return;

        // Move Map
        Explore.x -= Explore.joystick.dx * Explore.speed;
        Explore.y -= Explore.joystick.dy * Explore.speed;

        // Clamp Map
        Explore.x = Math.max(-900, Math.min(900, Explore.x));
        Explore.y = Math.max(-900, Math.min(900, Explore.y));

        document.getElementById('world-map').style.transform = `translate(calc(-50% + ${Explore.x}px), calc(-50% + ${Explore.y}px))`;

        // Interaction Check (Distance < 50px)
        const px = 1000 - Explore.x; // Player X on Map
        const py = 1000 - Explore.y; // Player Y on Map

        Explore.objects.forEach(obj => {
            if (obj.x === -9999) return; // Hidden object
            const dist = Math.sqrt(Math.pow(obj.x - px, 2) + Math.pow(obj.y - py, 2));
            
            if (dist < 50) {
                if (obj.type === 'wild') {
                    // Start Catching
                    Explore.triggerEncounter(null);
                    // Hide object temporarily
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
        document.getElementById('explore-screen').classList.remove('active');
        document.getElementById('catch-screen').classList.add('active');
        Game.spawn(id); // Call Catch Game spawn logic
    },

    spinStop: (obj) => {
        if(obj.spun) return;
        obj.spun = true;
        obj.el.style.background = "#E91E63"; // Visually spun
        UI.spawnFloatText("+ Items", window.innerWidth/2, window.innerHeight/2, "#2196F3");
        // Give Loot
        Data.inventory['Poke Ball'] += 3;
        Data.inventory['Razz Berry'] += 1;
        Game.save();
        UI.updateHUD(); // Flash XP/Items?
        setTimeout(() => { 
            obj.spun = false; 
            obj.el.style.background = "#2196F3"; 
        }, 15000); // 15s Cooldown
    },

    /* --- GYM LOGIC --- */
    openGym: (obj) => {
        const modal = document.getElementById('gym-modal');
        modal.style.display = 'flex';
        Explore.joystick.active = false; // Stop moving
        
        const slot = document.getElementById('gym-defender-slot');
        if (Data.gymDefenders && Data.gymDefenders.length > 0) {
            const def = Data.gymDefenders[0];
            // Calculate Candy Earned
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
        // Simple: Deploy first pokemon in storage
        const p = Data.storage[0];
        
        // Remove from storage? Or just mark as deployed? 
        // For simplicity, we clone it to gym and remove from bag
        Data.gymDefenders = [{ id: p.id, name: p.name, start: Date.now(), family: p.family }];
        Data.storage.splice(0, 1); 
        Game.save();
        Explore.openGym(); // Refresh UI
    },

    recallDefender: () => {
        const def = Data.gymDefenders[0];
        const minutes = Math.floor((Date.now() - def.start) / 60000);
        const earned = Math.min(100, minutes);
        
        // Give Candy
        if(!Data.candyBag[def.family]) Data.candyBag[def.family] = 0;
        Data.candyBag[def.family] += earned;
        UI.spawnFloatText(`+${earned} ${def.family} Candy`, window.innerWidth/2, window.innerHeight/2, "#E91E63");

        // Return to Storage
        Data.storage.unshift({
            id: def.id, name: def.name, cp: Math.floor(Math.random()*2000)+100, 
            family: def.family, date: new Date().toLocaleDateString()
        });
        
        Data.gymDefenders = [];
        Game.save();
        Explore.closeGym();
    },

    /* --- RAID LOGIC --- */
    openRaid: (obj) => {
        const modal = document.getElementById('raid-modal');
        modal.style.display = 'flex';
        Explore.joystick.active = false;

        // Generate Boss (Can be legendary here!)
        const bossId = [150, 144, 145, 146, 243, 244, 245, 384][Math.floor(Math.random()*8)]; // Mewtwo, Birds, Dogs, Rayquaza
        
        document.getElementById('raid-boss-img').src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${bossId}.png`;
        document.getElementById('raid-title').innerText = "MEGA RAID";
        
        // Show Player Team (First 3)
        const teamContainer = document.getElementById('battle-team');
        teamContainer.innerHTML = '';
        for(let i=0; i<3; i++) {
            if(Data.storage[i]) {
                teamContainer.innerHTML += `<div class="battle-mon"><img src="${ASSETS.poke + Data.storage[i].id + '.png'}"></div>`;
            } else {
                teamContainer.innerHTML += `<div class="battle-mon" style="background:#eee"></div>`;
            }
        }

        // Auto Battle
        let hp = 100;
        const bar = document.getElementById('raid-hp-fill');
        bar.style.width = '100%';
        
        const battleInterval = setInterval(() => {
            if(modal.style.display === 'none') { clearInterval(battleInterval); return; }
            
            hp -= 15; // Damage per tick
            bar.style.width = hp + '%';
            
            // Visual Shake
            document.getElementById('raid-boss-img').classList.add('attack-anim');
            setTimeout(() => document.getElementById('raid-boss-img').classList.remove('attack-anim'), 200);

            if(hp <= 0) {
                clearInterval(battleInterval);
                modal.style.display = 'none';
                // Trigger Catch with Boss ID
                Explore.triggerEncounter(bossId);
            }
        }, 1500);
    },
    
    closeRaid: () => { document.getElementById('raid-modal').style.display = 'none'; }
};