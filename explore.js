const Explore = {
    x: 0,
    y: 0,
    speed: 3,
    objects: [],
    frameId: null,
    raidInterval: null,
    isInteracting: false,

    init: () => {
        if (document.getElementById('explore-screen').classList.contains('active')) {
            if (Explore.objects.length === 0) Explore.generateMap();
            Explore.setupJoystick();
            Explore.startLoop();
        }
    },

    start: () => {
        cancelAnimationFrame(Game.state.animationFrame);
        document.getElementById('catch-screen').classList.remove('active');
        document.getElementById('explore-screen').classList.add('active');
        document.getElementById('result-overlay').classList.remove('visible');
        document.getElementById('result-overlay').style.display = 'none';
        UI.updateHUD();

        Explore.joystick.active = false;
        Explore.joystick.dx = 0;
        Explore.joystick.dy = 0;
        const knob = document.getElementById('joystick-knob');
        if (knob) knob.style.transform = `translate(-50%, -50%)`;

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

        const baseIds = [1, 4, 7, 10, 13, 16, 19, 21, 23, 25, 27, 29, 32, 35, 37, 39, 41, 43, 46, 48, 50, 52, 54, 56, 58, 60, 63, 66, 69, 72, 74, 77, 79, 81, 83, 84, 86, 88, 90, 92, 95, 96, 98, 100, 102, 104, 106, 108, 109, 111, 113, 114, 115, 116, 118, 120, 122, 123, 124, 125, 126, 127, 128, 129, 131, 132, 133, 137, 138, 140, 142, 143, 147];

        let stops = Data.mapData ? Data.mapData.filter(o => o.type === 'stop') : [];
        let gyms = Data.mapData ? Data.mapData.filter(o => o.type === 'gym') : [];
        let raids = Data.mapData ? Data.mapData.filter(o => o.type === 'raid') : [];

        const validCounts = stops.length === 5 && gyms.length === 3 && raids.length === 3;

        if (!validCounts || Data.mapData.length === 0) {
            Data.mapData = [];
            const safeDistance = 200;
            const poiBuffer = 150;
            const objs = [];

            const getRandomPos = () => {
                const angle = Math.random() * Math.PI * 2;
                const radius = (Math.random() * 800) + 200;
                return { x: 1000 + Math.cos(angle) * radius, y: 1000 + Math.sin(angle) * radius };
            };

            const isTooClose = (p, list, buffer) => {
                // Dist from Player Start (1000,1000 is center of map div which is 2000x2000)
                const distCenter = Math.sqrt(Math.pow(p.x - 1000, 2) + Math.pow(p.y - 1000, 2));
                if (distCenter < safeDistance) return true;

                for (let o of list) {
                    const d = Math.sqrt(Math.pow(p.x - o.x, 2) + Math.pow(p.y - o.y, 2));
                    if (d < buffer) return true;
                }
                return false;
            };

            const addObjects = (count, type) => {
                for (let i = 0; i < count; i++) {
                    let p, tries = 0;
                    do {
                        p = getRandomPos();
                        tries++;
                    } while (isTooClose(p, objs, poiBuffer) && tries < 100);
                    objs.push({ x: p.x, y: p.y, type: type, id: null });
                }
            };

            addObjects(5, 'stop');
            addObjects(3, 'gym');
            addObjects(3, 'raid');

            for (let i = 0; i < 15; i++) {
                let p, tries = 0;
                do {
                    p = getRandomPos();
                    tries++;
                } while (isTooClose(p, objs, 100) && tries < 100);
                const id = baseIds[Math.floor(Math.random() * baseIds.length)];
                objs.push({ x: p.x, y: p.y, type: 'wild', id: id });
            }

            Data.mapData = objs;
            Game.save();
        }

        Data.mapData.forEach(obj => {
            let el = document.createElement('div');
            if (obj.type === 'gym') {
                el.className = 'map-obj gym';
                el.innerHTML = `<div class="gym-dome"></div>`;
            } else if (obj.type === 'raid') {
                el.className = 'map-obj raid';
                el.innerHTML = `<div class="raid-timer">02:00</div>`;
            } else if (obj.type === 'stop') {
                el.className = 'map-obj pokestop';
            } else if (obj.type === 'wild') {
                el.className = 'map-obj wild-spawn';
                el.innerHTML = `<img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${obj.id}.png" width="80">`;
            }
            el.style.left = obj.x + 'px';
            el.style.top = obj.y + 'px';
            map.appendChild(el);
            Explore.objects.push({ ...obj, el, spun: false });
        });
    },

    update: () => {
        if (!document.getElementById('explore-screen').classList.contains('active')) return;

        if (!Explore.isInteracting) {
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
                        // Check if on cooldown
                        if (obj.cooldown && Date.now() < obj.cooldown) return;

                        Explore.triggerEncounter(obj.id, obj);
                        obj.el.style.display = 'none';

                        // Set 60s cooldown
                        obj.cooldown = Date.now() + 60000;

                        // Respawn after 60 seconds
                        setTimeout(() => {
                            if (obj.el) obj.el.style.display = 'block';
                        }, 60000);
                    } else if (obj.type === 'stop') {
                        Explore.spinStop(obj);
                    } else if (obj.type === 'gym') {
                        Explore.openGym(obj);
                    } else if (obj.type === 'raid') {
                        Explore.openRaid(obj);
                    }
                }
            });
        }
        Explore.frameId = requestAnimationFrame(Explore.update);
    },

    joystick: { active: false, dx: 0, dy: 0, startX: 0, startY: 0 },

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
            const dist = Math.sqrt(dx * dx + dy * dy);
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
        zone.addEventListener('touchstart', start, { passive: false });
        window.addEventListener('touchmove', move, { passive: false });
        window.addEventListener('touchend', end);
        zone.addEventListener('mousedown', start);
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', end);
    },

    triggerEncounter: (id, objRef) => {
        cancelAnimationFrame(Explore.frameId);
        Explore.isInteracting = true;

        // Regenerate wild Pokemon with random species for next time
        const baseIds = [1, 4, 7, 10, 13, 16, 19, 21, 23, 25, 27, 29, 32, 35, 37, 39, 41, 43, 46, 48, 50, 52, 54, 56, 58, 60, 63, 66, 69, 72, 74, 77, 79, 81, 83, 84, 86, 88, 90, 92, 95, 96, 98, 100, 102, 104, 106, 108, 109, 111, 113, 114, 115, 116, 118, 120, 122, 123, 124, 125, 126, 127, 128, 129, 131, 132, 133, 137, 138, 140, 142, 143, 147];
        const wildObj = objRef || Explore.objects.find(obj => obj.type === 'wild' && obj.id === id);
        if (wildObj) {
            // Assign new random species
            const newId = baseIds[Math.floor(Math.random() * baseIds.length)];
            wildObj.id = newId;

            // Update in saved map data
            const mapObj = Data.mapData.find(item => item.x === wildObj.x && item.y === wildObj.y && item.type === 'wild');
            if (mapObj) {
                mapObj.id = newId;
                Game.save();
            }

            // Update sprite for next appearance (increased to 80px)
            wildObj.el.innerHTML = `<img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${newId}.png" width="80">`;
        }

        setTimeout(() => {
            document.getElementById('explore-screen').classList.remove('active');
            document.getElementById('catch-screen').classList.add('active');
            Game.spawn(id);
            Explore.isInteracting = false;
        }, 500);
    },

    spinStop: (obj) => {
        if (obj.spun || Explore.isInteracting) return;
        Explore.isInteracting = true;
        obj.spun = true;
        obj.el.style.background = "#E91E63";

        const balls = Math.floor(Math.random() * 3) + 2;
        const berries = Math.floor(Math.random() * 2) + 1;
        const xp = 100;

        Data.inventory['Poke Ball'] += balls;
        Data.inventory['Razz Berry'] += berries;
        Data.user.xp += xp;

        if (Data.user.xp >= Data.user.nextLevelXp) setTimeout(Game.levelUp, 1000);
        Game.save();
        UI.updateHUD();

        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        UI.spawnFloatText(`+${balls} Poke Balls`, cx, cy - 50, "#2196F3");
        setTimeout(() => UI.spawnFloatText(`+${berries} Razz Berries`, cx, cy, "#E91E63"), 300);
        setTimeout(() => UI.spawnFloatText(`+${xp} XP`, cx, cy + 50, "#FFEB3B"), 600);

        // UNLOCK PLAYER AFTER SHORT DELAY (FIX)
        setTimeout(() => { Explore.isInteracting = false; }, 1000);

        // RESET STOP COOLDOWN
        setTimeout(() => {
            obj.spun = false;
            obj.el.style.background = "#2196F3";
        }, 120000);
    },

    currentGymObj: null, // Track active gym

    openGym: (obj) => {
        if (Explore.isInteracting) return;

        // Check Cooldown
        if (obj.cooldown && Date.now() < obj.cooldown) {
            const timeLeft = Math.ceil((obj.cooldown - Date.now()) / 1000);
            UI.spawnFloatText(`Gym Cooldown: ${timeLeft}s`, window.innerWidth / 2, window.innerHeight / 2, "#E91E63");
            return;
        }

        Explore.isInteracting = true;
        Explore.currentGymObj = obj;

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

    closeGym: () => {
        document.getElementById('gym-modal').style.display = 'none';
        Explore.joystick.active = false;
        Explore.isInteracting = false;
        Explore.x += 10;

        // Set 60s cooldown
        if (Explore.currentGymObj) {
            Explore.currentGymObj.cooldown = Date.now() + 60000;
        }
    },

    deployDefender: () => {
        UI.openStorage(true, (index) => {
            const p = Data.storage[index];
            if (!p) { UI.closeStorage(); return; }
            Data.gymDefenders = [{ id: p.id, name: p.name, start: Date.now(), family: p.family }];
            Data.storage.splice(index, 1);
            Game.save();
            UI.closeStorage();
            Explore.openGym();
        });
    },

    recallDefender: () => {
        if (!Data.gymDefenders || Data.gymDefenders.length === 0) { Explore.closeGym(); return; }
        const def = Data.gymDefenders[0];
        const start = def.start || Date.now();
        const minutes = Math.floor((Date.now() - start) / 60000);
        const earned = Math.min(100, minutes);
        if (!Data.candyBag) Data.candyBag = {};
        if (!Data.candyBag[def.family]) Data.candyBag[def.family] = 0;
        Data.candyBag[def.family] += earned;
        UI.spawnFloatText(`+${earned} ${def.family} Candy`, window.innerWidth / 2, window.innerHeight / 2, "#E91E63");
        Data.storage.unshift({
            id: def.id,
            name: def.name,
            cp: Math.floor(Math.random() * 2000) + 100,
            family: def.family,
            date: new Date().toLocaleDateString()
        });
        Data.gymDefenders = [];
        Game.save();
        Explore.closeGym();
    },

    currentRaidBossId: null,
    currentRaidObj: null,

    openRaid: (obj) => {
        if (Explore.isInteracting) return;
        if (obj.cooldown && Date.now() < obj.cooldown) {
            const timeLeft = Math.ceil((obj.cooldown - Date.now()) / 1000);
            UI.spawnFloatText(`Raid Cooldown: ${timeLeft}s`, window.innerWidth / 2, window.innerHeight / 2, "red");
            return;
        }

        Explore.isInteracting = true;
        Explore.currentRaidObj = obj;
        const modal = document.getElementById('raid-modal');
        modal.style.display = 'flex';
        Explore.joystick.active = false;

        if (!obj.bossId) {
            obj.bossId = [150, 144, 145, 146, 243, 244, 245, 384][Math.floor(Math.random() * 8)];
            const mapObj = Data.mapData.find(item => item.x === obj.x && item.y === obj.y && item.type === obj.type);
            if (mapObj) mapObj.bossId = obj.bossId;
            Game.save();
        }
        Explore.currentRaidBossId = obj.bossId;
        document.getElementById('raid-boss-img').src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${obj.bossId}.png`;

        // RENDER TEAM WITH HP BARS
        document.getElementById('battle-team').innerHTML = `
            <div style="text-align:center; width:100%;">
                <p style="color:#666; font-size:14px;">Select your team to fight!</p>
                <div id="raid-team-slots" style="display:flex; justify-content:center; gap:20px; margin:20px 0;"></div>
                <button id="btn-start-raid" class="btn-action" style="background:#F44336; width:100%; justify-content:center;" onclick="Explore.startRaidBattle()">START BATTLE</button>
            </div>
        `;

        const slotsDiv = document.getElementById('raid-team-slots');
        // Sort Pokemon by CP (highest first) and select top 3
        const sortedPokemon = [...Data.storage].sort((a, b) => (b.cp || 0) - (a.cp || 0));
        for (let i = 0; i < 3; i++) {
            const mon = sortedPokemon[i];
            if (mon) {
                // Ensure Moves/HP exist (backwards compat)
                if (!mon.moves) mon.moves = [{ name: 'Tackle', power: 20 }, { name: 'Struggle', power: 30 }];
                if (!mon.maxHp) mon.maxHp = Math.floor(mon.cp / 10) + 50;

                slotsDiv.innerHTML += `
                    <div id="raid-slot-${i}" class="raid-slot" style="display:flex; flex-direction:column; align-items:center; width:60px;">
                        <div class="battle-mon"><img src="${ASSETS.poke + mon.id + '.png'}"></div>
                        <div style="background:#ddd; width:100%; height:8px; margin-top:5px; border-radius:4px; overflow:hidden;">
                            <div id="hp-bar-${i}" style="width:100%; height:100%; background:#4CAF50; transition:width 0.2s"></div>
                        </div>
                        <div style="font-size:10px; font-weight:bold; overflow:hidden; white-space:nowrap; width:100%; text-align:center;">${mon.cp} CP</div>
                    </div>`;
            } else {
                slotsDiv.innerHTML += `<div class="battle-mon" style="background:#eee"></div>`;
            }
        }
        document.getElementById('raid-hp-fill').style.width = '100%';
    },

    startRaidBattle: () => {
        document.getElementById('btn-start-raid').style.display = 'none';

        // INIT BATTLE STATE
        let bossHp = 5000; // Hardcoded boss HP
        let maxBossHp = 5000;
        let pokes = []; // { index, curHp, maxHp, moves, elId }

        // Use same sorted array as display
        const sortedPokemon = [...Data.storage].sort((a, b) => (b.cp || 0) - (a.cp || 0));
        for (let i = 0; i < 3; i++) {
            const m = sortedPokemon[i];
            if (m) {
                pokes.push({
                    idx: i,
                    // Use saved MaxHP or calc logic
                    curHp: m.maxHp || Math.floor(m.cp / 10) + 50,
                    maxHp: m.maxHp || Math.floor(m.cp / 10) + 50,
                    moves: m.moves || [{ name: 'Attack', power: 20 }],
                    name: m.name
                });
            }
        }

        Explore.raidInterval = setInterval(() => {
            if (document.getElementById('raid-modal').style.display === 'none') {
                clearInterval(Explore.raidInterval);
                return;
            }

            // 1. PLAYERS ATTACK
            pokes.forEach(p => {
                if (p.curHp > 0) {
                    // Pick Random Move
                    const move = p.moves[Math.floor(Math.random() * p.moves.length)];
                    const dmg = Math.floor(move.power + (Math.random() * 20));
                    bossHp -= dmg;

                    // Show Float Text on Boss
                    const bossRect = document.getElementById('raid-boss-img').getBoundingClientRect();
                    const jitterX = (Math.random() - 0.5) * 50;
                    const jitterY = (Math.random() - 0.5) * 50;
                    UI.spawnFloatText(`${move.name} ${dmg}`, bossRect.left + bossRect.width / 2 + jitterX, bossRect.top + jitterY, "#fff");
                }
            });

            // Update Boss Bar
            const pct = Math.max(0, (bossHp / maxBossHp) * 100);
            document.getElementById('raid-hp-fill').style.width = pct + '%';

            // Boss Anim
            const bossImg = document.getElementById('raid-boss-img');
            bossImg.classList.add('attack-anim');
            setTimeout(() => bossImg.classList.remove('attack-anim'), 200);

            // 2. BOSS ATTACKS ONE PLAYER
            const alive = pokes.filter(p => p.curHp > 0);
            if (alive.length > 0) {
                const victim = alive[Math.floor(Math.random() * alive.length)];
                const bossDmg = Math.floor(Math.random() * 40) + 30; // 30-70 dmg
                victim.curHp -= bossDmg;

                // Update Victim Bar
                const vBar = document.getElementById(`hp-bar-${victim.idx}`);
                const vPct = Math.max(0, (victim.curHp / victim.maxHp) * 100);
                if (vBar) vBar.style.width = vPct + '%';

                // Anim Victim Shake
                const vSlot = document.getElementById(`raid-slot-${victim.idx}`);
                if (vSlot) {
                    vSlot.style.transform = 'translate(2px, 2px)';
                    setTimeout(() => vSlot.style.transform = 'translate(0,0)', 100);
                }
            }

            // 3. CHECK END CONDITIONS
            if (bossHp <= 0) {
                clearInterval(Explore.raidInterval);
                // WIN
                UI.spawnFloatText("RAID WON!", window.innerWidth / 2, window.innerHeight / 2, "#FFC107");

                if (Explore.currentRaidObj) Explore.currentRaidObj.cooldown = Date.now() + 120000;

                setTimeout(() => {
                    Explore.closeRaid();
                    // TRIGGER CATCH
                    Explore.triggerEncounter(Explore.currentRaidBossId);
                }, 2000);
            } else if (alive.length === 0 && pokes.length > 0) { // Only if we actually had a team
                clearInterval(Explore.raidInterval);
                // LOSE
                UI.spawnFloatText("TEAM FAINTED!", window.innerWidth / 2, window.innerHeight / 2, "red");
                setTimeout(() => {
                    Explore.closeRaid();
                    // NO CATCH, JUST RETURN
                }, 2000);
            }

        }, 1200); // Turn every 1.2s
    },

    closeRaid: () => {
        clearInterval(Explore.raidInterval);
        document.getElementById('raid-modal').style.display = 'none';
        Explore.joystick.active = false;
        Explore.isInteracting = false;
        Explore.x += 10;
    }
};