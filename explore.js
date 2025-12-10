const Explore = {
    x: 0,
    y: 0,
    speed: 5,
    objects: [],
    frameId: null,
    
    init: () => {
        UI.updateHUD();
        Explore.generateMap();
        Explore.setupJoystick();
        Explore.startLoop();
    },

    start: () => {
        document.getElementById('catch-screen').classList.remove('active');
        document.getElementById('explore-screen').classList.add('active');
        Explore.frameId = requestAnimationFrame(Explore.update);
    },

    generateMap: () => {
        const map = document.getElementById('world-map');
        // Clear previous
        map.innerHTML = '';
        Explore.objects = [];

        // Generate Random Points of Interest
        for (let i = 0; i < 20; i++) {
            const type = Math.random();
            let el, objType;
            const x = Math.random() * 1800 + 100;
            const y = Math.random() * 1800 + 100;

            if (type < 0.1) {
                // GYM
                el = document.createElement('div'); el.className = 'map-obj gym';
                el.innerHTML = `<div class="gym-dome"></div>`;
                objType = 'gym';
            } else if (type < 0.15) {
                // RAID
                el = document.createElement('div'); el.className = 'map-obj raid';
                el.innerHTML = `<div class="raid-timer">02:00</div>`;
                objType = 'raid';
            } else if (type < 0.5) {
                // POKESTOP
                el = document.createElement('div'); el.className = 'map-obj pokestop';
                objType = 'stop';
            } else {
                // WILD SPAWN
                el = document.createElement('div'); el.className = 'map-obj wild-spawn';
                const id = Math.floor(Math.random() * 150) + 1; // Gen 1 bias for map icons
                el.innerHTML = `<img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png" width="50">`;
                objType = 'wild';
            }

            el.style.left = x + 'px';
            el.style.top = y + 'px';
            map.appendChild(el);
            Explore.objects.push({ x, y, type: objType, el });
        }
    },

    // Simple Joystick Logic
    joystick: { active: false, dx: 0, dy: 0, startX:0, startY:0 },
    
    setupJoystick: () => {
        const zone = document.getElementById('joystick-zone');
        const knob = document.getElementById('joystick-knob');
        
        const start = (e) => {
            const p = e.touches ? e.touches[0] : e;
            Explore.joystick.active = true;
            Explore.joystick.startX = p.clientX;
            Explore.joystick.startY = p.clientY;
        };
        const move = (e) => {
            if (!Explore.joystick.active) return;
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
            Explore.joystick.dx = dx / maxDist; // Normalized -1 to 1
            Explore.joystick.dy = dy / maxDist;
        };
        const end = () => {
            Explore.joystick.active = false;
            Explore.joystick.dx = 0; Explore.joystick.dy = 0;
            knob.style.transform = `translate(-50%, -50%)`;
        };

        zone.addEventListener('touchstart', start);
        window.addEventListener('touchmove', move);
        window.addEventListener('touchend', end);
        zone.addEventListener('mousedown', start);
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', end);
    },

    update: () => {
        if (!document.getElementById('explore-screen').classList.contains('active')) return;

        // Move Map relative to Player (Player stays center)
        Explore.x -= Explore.joystick.dx * Explore.speed;
        Explore.y -= Explore.joystick.dy * Explore.speed;

        // Boundary Check (2000px map)
        Explore.x = Math.max(-900, Math.min(900, Explore.x));
        Explore.y = Math.max(-900, Math.min(900, Explore.y));

        document.getElementById('world-map').style.transform = `translate(calc(-50% + ${Explore.x}px), calc(-50% + ${Explore.y}px))`;

        // Interaction Check
        // Player is effectively at 0,0 relative to map center logic
        // Object coords are relative to map center 0,0 top-left offset...
        // Actually, objects are absolute on the 2000px map.
        // Map Center is 1000,1000.
        // Player is at Map X/Y relative to 1000,1000.
        
        // Correct math: Player is at Map Coord: (1000 - Explore.x, 1000 - Explore.y)
        const px = 1000 - Explore.x;
        const py = 1000 - Explore.y;

        Explore.objects.forEach(obj => {
            const dist = Math.sqrt(Math.pow(obj.x - px, 2) + Math.pow(obj.y - py, 2));
            if (dist < 40) { // Collision
                if (obj.type === 'wild') {
                    // Trigger Catch
                    Explore.triggerEncounter();
                    // Move obj away so we don't instant re-trigger
                    obj.x = -9999; obj.el.style.display='none';
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

    triggerEncounter: () => {
        cancelAnimationFrame(Explore.frameId);
        document.getElementById('explore-screen').classList.remove('active');
        document.getElementById('catch-screen').classList.add('active');
        Game.spawn();
    },

    spinStop: (obj) => {
        if(obj.spun) return;
        obj.spun = true;
        obj.el.style.background = "#E91E63"; // Turn purple
        UI.spawnFloatText("+ Items", window.innerWidth/2, window.innerHeight/2, "#2196F3");
        // Give items
        Data.inventory['Poke Ball'] += 3;
        Data.inventory['Razz Berry'] += 1;
        Game.save();
        UI.updateHUD();
        setTimeout(() => { obj.spun = false; obj.el.style.background = "#2196F3"; }, 10000); // Cooldown
    },

    openGym: (obj) => {
        // Simplified Gym Modal
        const modal = document.getElementById('gym-modal');
        modal.style.display = 'flex';
        // Show defender logic here (placeholder)
        const slot = document.getElementById('gym-defender-slot');
        if(Data.gymDefenders.length > 0) {
            const def = Data.gymDefenders[0];
            slot.innerHTML = `<img src="${ASSETS.poke + def.id + '.png'}" width="80"><br>${def.name}<br>Generating Candy...`;
        } else {
            slot.innerHTML = `<div style="color:#888">Empty</div>`;
        }
        // Force joystick stop
        Explore.joystick.active = false;
    },
    
    closeGym: () => { document.getElementById('gym-modal').style.display = 'none'; },
    
    deployDefender: () => {
        if(Data.storage.length === 0) { UI.spawnFloatText("No Pokemon!", window.innerWidth/2, window.innerHeight/2, "red"); return; }
        if(Data.gymDefenders.length > 0) { UI.spawnFloatText("Gym Full!", window.innerWidth/2, window.innerHeight/2, "red"); return; }
        
        // Pick first for demo
        const p = Data.storage[0];
        Data.gymDefenders.push({ id: p.id, name: p.name, start: Date.now() });
        Game.save();
        Explore.openGym(); // Refresh
    },

    openRaid: (obj) => {
        const modal = document.getElementById('raid-modal');
        modal.style.display = 'flex';
        // Set Random Raid Boss
        const id = Math.floor(Math.random()*100)+1; // Gen 1 boss
        document.getElementById('raid-boss-img').src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
        Explore.joystick.active = false;
        
        // Auto Battle Sim
        let hp = 100;
        const bar = document.getElementById('raid-hp-fill');
        const interval = setInterval(() => {
            hp -= 10;
            bar.style.width = hp + '%';
            document.getElementById('raid-boss-img').classList.add('attack-anim');
            setTimeout(() => document.getElementById('raid-boss-img').classList.remove('attack-anim'), 200);
            
            if(hp <= 0) {
                clearInterval(interval);
                modal.style.display = 'none';
                Explore.triggerEncounter(); // Catch boss after win
            }
            if(modal.style.display === 'none') clearInterval(interval);
        }, 1000);
    },
    
    closeRaid: () => { document.getElementById('raid-modal').style.display = 'none'; }
};