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

    // COMPLETE LIST OF BASE POKEMON IDS (Preventing evolutions in wild)
    allBaseIds: [
        1, 4, 7, 10, 13, 16, 19, 21, 23, 27, 29, 32, 35, 37, 39, 41, 43, 46, 48, 50, 52, 54, 56, 58, 60, 63, 66, 69, 72, 74, 77, 79, 81, 83, 84, 86, 88, 90, 92, 95, 96, 98, 100, 102, 104, 106, 108, 109, 111, 113, 114, 115, 116, 118, 120, 122, 123, 124, 125, 126, 127, 128, 129, 131, 132, 133, 137, 138, 140, 142, 147, 152, 155, 158, 161, 163, 165, 167, 170, 172, 173, 174, 175, 177, 179, 183, 185, 187, 190, 191, 193, 194, 198, 200, 201, 202, 203, 204, 206, 207, 209, 211, 213, 214, 215, 216, 218, 220, 222, 223, 225, 227, 228, 231, 234, 235, 236, 238, 239, 240, 241, 246, 252, 255, 258, 261, 263, 265, 270, 273, 276, 278, 280, 283, 285, 287, 290, 293, 296, 298, 299, 300, 302, 304, 307, 309, 311, 312, 313, 314, 315, 316, 318, 320, 322, 324, 325, 327, 328, 331, 333, 335, 336, 337, 338, 339, 341, 343, 345, 347, 349, 351, 352, 353, 355, 357, 358, 359, 360, 361, 363, 366, 369, 370, 371, 374, 387, 390, 393, 396, 399, 401, 403, 406, 408, 410, 412, 415, 417, 418, 420, 422, 425, 427, 431, 433, 434, 436, 438, 439, 440, 441, 442, 443, 446, 447, 449, 451, 453, 455, 456, 458, 459, 479, 495, 498, 501, 504, 506, 509, 511, 513, 515, 517, 519, 522, 524, 527, 529, 531, 532, 535, 538, 539, 540, 543, 546, 548, 550, 551, 554, 556, 557, 559, 561, 562, 564, 566, 568, 570, 572, 574, 577, 580, 582, 585, 587, 588, 590, 592, 594, 595, 597, 599, 602, 605, 607, 610, 613, 615, 616, 618, 619, 621, 622, 624, 626, 627, 629, 631, 632, 633, 636, 650, 653, 656, 659, 661, 664, 667, 669, 672, 674, 676, 677, 679, 682, 684, 686, 688, 690, 692, 694, 696, 698, 701, 702, 703, 704, 707, 708, 710, 712, 714, 722, 725, 728, 731, 734, 736, 739, 741, 742, 744, 746, 747, 749, 751, 753, 755, 757, 759, 761, 764, 765, 766, 769, 771, 774, 775, 776, 777, 778, 780, 781, 782, 810, 813, 816, 819, 821, 824, 827, 829, 831, 833, 835, 837, 840, 843, 845, 846, 848, 850, 852, 854, 856, 859, 862, 863, 868, 871, 872, 874, 875, 876, 877, 878, 880, 884, 885, 906, 909, 912, 915, 917, 919, 921, 924, 926, 928, 931, 932, 935, 938, 940, 942, 944, 946, 948, 951, 953, 955, 957, 960, 962, 963, 965, 967, 969, 971, 974, 976, 977, 978, 979, 981, 996, 999, 1001, 1005, 1007, 1009, 1012, 1018, 1020, 1022, 1024
    ],

    getSpawnableIds: () => {
        const lvl = Data.user.level || 1;
        let maxId = 151; // Gen 1 (Lvl 1-75)

        if (lvl >= 425) maxId = 1025;      // Gen 9
        else if (lvl >= 375) maxId = 905;  // Gen 8
        else if (lvl >= 325) maxId = 809;  // Gen 7
        else if (lvl >= 275) maxId = 721;  // Gen 6
        else if (lvl >= 225) maxId = 649;  // Gen 5
        else if (lvl >= 175) maxId = 493;  // Gen 4
        else if (lvl >= 125) maxId = 386;  // Gen 3
        else if (lvl >= 76) maxId = 251;   // Gen 2

        return Explore.allBaseIds.filter(id => id <= maxId);
    },

    generateMap: () => {
        const map = document.getElementById('world-map');
        map.innerHTML = '';
        Explore.objects = [];

        let stops = Data.mapData ? Data.mapData.filter(o => o.type === 'stop') : [];
        let gyms = Data.mapData ? Data.mapData.filter(o => o.type === 'gym') : [];
        let raids = Data.mapData ? Data.mapData.filter(o => o.type === 'raid') : [];
        let terminals = Data.mapData ? Data.mapData.filter(o => o.type === 'terminal') : [];

        // Check validation (reduced count + terminal existence)
        const validCounts = stops.length === 5 && gyms.length === 3 && raids.length === 3 && terminals.length >= 1;

        if (!validCounts || Data.mapData.length === 0) {
            console.log("Regenerating Map with new constraints...");
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

            addObjects(1, 'terminal'); // Add the new Terminal
            addObjects(5, 'stop');
            addObjects(3, 'gym');
            addObjects(3, 'raid');

            // DYNAMIC SPAWNS BASED ON LEVEL
            const spawnable = Explore.getSpawnableIds();

            for (let i = 0; i < 7; i++) {
                let p, tries = 0;
                do {
                    p = getRandomPos();
                    tries++;
                } while (isTooClose(p, objs, 100) && tries < 100);

                const id = spawnable[Math.floor(Math.random() * spawnable.length)];
                objs.push({ x: p.x, y: p.y, type: 'wild', id: id });
            }

            Data.mapData = objs;
            Game.save();
        }

        const raidPool = [
            3, 6, 9, 65, 94, 130, 143, 149,
            144, 145, 146, 150, 243, 244, 245, 248, 249, 250, 384, 382, 383
        ];

        Data.mapData.forEach(obj => {
            let el = document.createElement('div');

            // --- GYM RENDER ---
            if (obj.type === 'gym') {
                el.className = 'map-obj gym';
                // Show defender if exists
                if (obj.defender) {
                    el.innerHTML = `
                        <div class="gym-dome" style="border-color:#FF5722;"></div>
                        <img src="${ASSETS.poke + obj.defender.id + '.png'}" 
                             style="position:absolute; width:40px; height:40px; top:50%; left:50%; transform:translate(-50%, -60%); z-index:2;">
                     `;
                } else {
                    el.innerHTML = `<div class="gym-dome"></div>`;
                }

                // --- RAID RENDER ---
            } else if (obj.type === 'raid') {
                el.className = 'map-obj raid';

                // Initialize Unique Raid Data if missing
                if (!obj.bossId || !obj.raidExpiry) {
                    obj.bossId = raidPool[Math.floor(Math.random() * raidPool.length)];
                    obj.raidExpiry = Date.now() + 120000;
                    obj.raidLevel = 1;
                    // Auto-save happens periodically or on interaction, but let's ensure consistency
                }

                el.innerHTML = `
                    <div class="raid-timer">00:00</div>
                    <img class="raid-boss-preview" src="${ASSETS.poke + obj.bossId + '.png'}" 
                         style="width:50px; height:50px; position:absolute; top:50%; left:50%; transform:translate(-50%, -50%);">
                `;

            } else if (obj.type === 'stop') {
                el.className = 'map-obj pokestop';
            } else if (obj.type === 'terminal') {
                // New Terminal Rendering
                el.className = 'map-obj terminal';
                el.innerHTML = `
                    <div class="terminal-screen">LEADER<br>BOARD</div>
                    <div class="terminal-stand"></div>
                `;
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

        // --- UPDATE RAID TIMERS & ROTATION ---
        const now = Date.now();
        const raidPool = [3, 6, 9, 65, 94, 130, 143, 149, 144, 145, 146, 150, 243, 244, 245, 248, 249, 250, 384, 382, 383];

        Explore.objects.forEach(obj => {
            if (obj.type === 'raid') {
                // Check Expiry
                if (now > obj.raidExpiry) {
                    // Rotate Boss using Data.mapData reference to persist
                    const mapObj = Data.mapData.find(m => m.x === obj.x && m.y === obj.y && m.type === 'raid');
                    if (mapObj) {
                        mapObj.bossId = raidPool[Math.floor(Math.random() * raidPool.length)];
                        mapObj.raidExpiry = now + 120000; // 2 minutes

                        // Update local object
                        obj.bossId = mapObj.bossId;
                        obj.raidExpiry = mapObj.raidExpiry;
                        obj.raidLevel = mapObj.raidLevel;

                        Game.save();

                        // Update Sprite
                        const img = obj.el.querySelector('.raid-boss-preview');
                        if (img) img.src = ASSETS.poke + obj.bossId + '.png';
                    }
                }

                // Update Timer Text
                const timeLeft = Math.max(0, obj.raidExpiry - now);
                const minutes = Math.floor(timeLeft / 60000);
                const seconds = Math.floor((timeLeft % 60000) / 1000);
                const timerDiv = obj.el.querySelector('.raid-timer');
                if (timerDiv) {
                    timerDiv.innerText = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
                }
            }
        });

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
                        if (obj.cooldown && Date.now() < obj.cooldown) return;
                        Explore.triggerEncounter(obj.id, obj);
                        obj.el.style.display = 'none';
                        obj.cooldown = Date.now() + 260000;
                        setTimeout(() => { if (obj.el) obj.el.style.display = 'block'; }, 260000);
                    } else if (obj.type === 'stop') {
                        Explore.spinStop(obj);
                    } else if (obj.type === 'gym') {
                        Explore.openGym(obj);
                    } else if (obj.type === 'raid') {
                        Explore.openRaid(obj);
                    } else if (obj.type === 'terminal') {
                        Explore.openLeaderboard(obj);
                    }
                }
            });
        }
        Explore.frameId = requestAnimationFrame(Explore.update);
    },

    // ... (Joystick setup remains same) ...
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

    // ... (Encounter/Stop/Gym logic remains same until openLeaderboard) ...
    triggerEncounter: (id, objRef) => {
        window.addEventListener('touchend', end);
        zone.addEventListener('mousedown', start);
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', end);
    },

    triggerEncounter: (id, objRef) => {
        cancelAnimationFrame(Explore.frameId);
        Explore.isInteracting = true;

        // ---------------------------------------------------------
        // SCIENTIFIC DATA: 
        // ---------------------------------------------------------
        const allBasePokemonIds = [
            1, 4, 7, 10, 13, 16, 19, 21, 23, 27, 29, 32, 35, 37, 39, 41, 43, 46, 48, 50, 52, 54, 56, 58, 60, 63, 66, 69, 72, 74, 77, 79, 81, 83, 84, 86, 88, 90, 92, 95, 96, 98, 100, 102, 104, 106, 108, 109, 111, 113, 114, 115, 116, 118, 120, 122, 123, 124, 125, 126, 127, 128, 129, 131, 132, 133, 137, 138, 140, 142, 147, 152, 155, 158, 161, 163, 165, 167, 170, 172, 173, 174, 175, 177, 179, 183, 185, 187, 190, 191, 193, 194, 198, 200, 201, 202, 203, 204, 206, 207, 209, 211, 213, 214, 215, 216, 218, 220, 222, 223, 225, 227, 228, 231, 234, 235, 236, 238, 239, 240, 241, 246, 252, 255, 258, 261, 263, 265, 270, 273, 276, 278, 280, 283, 285, 287, 290, 293, 296, 298, 299, 300, 302, 304, 307, 309, 311, 312, 313, 314, 315, 316, 318, 320, 322, 324, 325, 327, 328, 331, 333, 335, 336, 337, 338, 339, 341, 343, 345, 347, 349, 351, 352, 353, 355, 357, 358, 359, 360, 361, 363, 366, 369, 370, 371, 374, 387, 390, 393, 396, 399, 401, 403, 406, 408, 410, 412, 415, 417, 418, 420, 422, 425, 427, 431, 433, 434, 436, 438, 439, 440, 441, 442, 443, 446, 447, 449, 451, 453, 455, 456, 458, 459, 479, 495, 498, 501, 504, 506, 509, 511, 513, 515, 517, 519, 522, 524, 527, 529, 531, 532, 535, 538, 539, 540, 543, 546, 548, 550, 551, 554, 556, 557, 559, 561, 562, 564, 566, 568, 570, 572, 574, 577, 580, 582, 585, 587, 588, 590, 592, 594, 595, 597, 599, 602, 605, 607, 610, 613, 615, 616, 618, 619, 621, 622, 624, 626, 627, 629, 631, 632, 633, 636, 650, 653, 656, 659, 661, 664, 667, 669, 672, 674, 676, 677, 679, 682, 684, 686, 688, 690, 692, 694, 696, 698, 701, 702, 703, 704, 707, 708, 710, 712, 714, 722, 725, 728, 731, 734, 736, 739, 741, 742, 744, 746, 747, 749, 751, 753, 755, 757, 759, 761, 764, 765, 766, 769, 771, 774, 775, 776, 777, 778, 780, 781, 782, 810, 813, 816, 819, 821, 824, 827, 829, 831, 833, 835, 837, 840, 843, 845, 846, 848, 850, 852, 854, 856, 859, 862, 863, 868, 871, 872, 874, 875, 876, 877, 878, 880, 884, 885, 906, 909, 912, 915, 917, 919, 921, 924, 926, 928, 931, 932, 935, 938, 940, 942, 944, 946, 948, 951, 953, 955, 957, 960, 962, 963, 965, 967, 969, 971, 974, 976, 977, 978, 979, 981, 996, 999, 1001, 1005, 1007, 1009, 1012, 1018, 1020, 1022, 1024
        ];

        // ---------------------------------------------------------
        // YOUR GAME LOGIC
        // ---------------------------------------------------------
        const wildObj = objRef || Explore.objects.find(obj => obj.type === 'wild' && obj.id === id);

        if (wildObj) {
            // Pick from the master list
            const newId = allBasePokemonIds[Math.floor(Math.random() * allBasePokemonIds.length)];

            wildObj.id = newId;

            // Update in saved map data
            const mapObj = Data.mapData.find(item => item.x === wildObj.x && item.y === wildObj.y && item.type === 'wild');
            if (mapObj) {
                mapObj.id = newId;
                Game.save();
            }

            // Update sprite
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
        obj.el.style.background = "#E91E63"; // Change color to purple

        // --- 1. DETERMINE REWARDS ---

        // XP & Stardust
        const xp = 500;
        const stardust = Math.floor(Math.random() * 101) + 100; // Random 100 to 200

        // Balls: 60% Poke, 30% Great, 10% Ultra
        const ballRoll = Math.random();
        let ballType = 'Poke Ball';
        if (ballRoll > 0.90) ballType = 'Ultra Ball';
        else if (ballRoll > 0.60) ballType = 'Great Ball';

        const ballCount = Math.floor(Math.random() * 3) + 2; // 2 to 4 items

        // Berries: Random selection
        const berryRoll = Math.random();
        let berryType = 'Razz Berry';
        if (berryRoll > 0.66) berryType = 'Pinap Berry';
        else if (berryRoll > 0.33) berryType = 'Nanab Berry';

        const berryCount = Math.floor(Math.random() * 2) + 1; // 1 to 2 items

        // --- 2. UPDATE DATA ---

        // Helper to safely add items even if key doesn't exist yet
        const addItem = (name, amount) => {
            Data.inventory[name] = (Data.inventory[name] || 0) + amount;
        };

        addItem(ballType, ballCount);
        addItem(berryType, berryCount);
        addItem('Stardust', stardust); // Adds Stardust to inventory

        Data.user.xp += xp;

        // Check Level Up
        if (Data.user.xp >= Data.user.nextLevelXp) setTimeout(Game.levelUp, 1000);

        Game.save();
        UI.updateHUD();

        // --- 3. UI VISUALS ---
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;

        // Float text staggered so they don't overlap
        UI.spawnFloatText(`+${ballCount} ${ballType}`, cx, cy - 90, "#2196F3"); // Blue
        setTimeout(() => UI.spawnFloatText(`+${berryCount} ${berryType}`, cx, cy - 50, "#E91E63"), 300); // Pink
        setTimeout(() => UI.spawnFloatText(`+${stardust} Stardust`, cx, cy - 10, "#9C27B0"), 600); // Purple
        setTimeout(() => UI.spawnFloatText(`+${xp} XP`, cx, cy + 30, "#FFEB3B"), 900); // Yellow

        // Unlock player movement
        setTimeout(() => { Explore.isInteracting = false; }, 500);

        // Reset Stop Cooldown (2 minutes)
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
        // REFACTOR: Use local defender object
        if (obj.defender) {
            const def = obj.defender;
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
        Explore.x += 100;

        // Set 60s cooldown
        if (Explore.currentGymObj) {
            Explore.currentGymObj.cooldown = Date.now() + 60000;
            // Force redraw to show/hide defender on map
            Explore.generateMap();
        }
    },

    // --- LEADERBOARD LOGIC ---
    openLeaderboard: (obj) => {
        if (Explore.isInteracting) return;
        Explore.isInteracting = true;
        Explore.joystick.active = false;

        const modal = document.getElementById('leaderboard-modal');
        modal.style.display = 'flex';

        // Populate
        const highScore = Data.user.raidHighScore || 0;
        const container = document.getElementById('leaderboard-entries');

        // Currently singular, but architected for rows
        container.innerHTML = `
            <div class="leaderboard-score-row">
                <span>PLAYER 1</span>
                <span>${highScore.toLocaleString()} DMG</span>
            </div>
            <div style="text-align:center; font-size:10px; color:#666; margin-top:5px;">
                (HIGHEST TOTAL DAMAGE IN A SINGLE RAID)
            </div>
        `;
    },

    closeLeaderboard: () => {
        document.getElementById('leaderboard-modal').style.display = 'none';
        Explore.isInteracting = false;
        Explore.joystick.active = false;
        Explore.x += 100; // Bump player away to prevent instant reproc
    },

    deployDefender: () => {
        UI.openStorage(true, (index) => {
            const p = Data.storage[index];
            if (!p) { UI.closeStorage(); return; }

            // Save to THIS gym
            if (Explore.currentGymObj) {
                // Find in Data.mapData to persist
                const mapObj = Data.mapData.find(m => m.x === Explore.currentGymObj.x && m.y === Explore.currentGymObj.y && m.type === 'gym');
                if (mapObj) {
                    mapObj.defender = { ...p, start: Date.now() };
                    Explore.currentGymObj.defender = mapObj.defender;

                    // Remove from storage
                    Data.storage.splice(index, 1);
                    Game.save();
                }
            }

            UI.closeStorage();
            // Re-render gym view
            Explore.openGym(Explore.currentGymObj);
        });
    },

    recallDefender: () => {
        if (!Explore.currentGymObj || !Explore.currentGymObj.defender) { Explore.closeGym(); return; }

        const def = Explore.currentGymObj.defender;
        const start = def.start || Date.now();
        const minutes = Math.floor((Date.now() - start) / 60000);
        const earned = Math.min(100, minutes);

        if (!Data.candyBag) Data.candyBag = {};
        if (!Data.candyBag[def.family]) Data.candyBag[def.family] = 0;
        Data.candyBag[def.family] += earned;
        UI.spawnFloatText(`+${earned} ${def.family} Candy`, window.innerWidth / 2, window.innerHeight / 2, "#E91E63");

        const { start: _, ...pokemonData } = def;
        Data.storage.unshift(pokemonData);

        // CLEAR DEFENDER FROM THIS GYM
        const mapObj = Data.mapData.find(m => m.x === Explore.currentGymObj.x && m.y === Explore.currentGymObj.y && m.type === 'gym');
        if (mapObj) {
            mapObj.defender = null;
            Explore.currentGymObj.defender = null;
            Game.save();
        }

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

        // Ensure bossId exists (should be handled by update/generateMap)
        Explore.currentRaidBossId = obj.bossId;
        document.getElementById('raid-boss-img').src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${obj.bossId}.png`;

        // Use UNIQUE Raid Level
        const difficultyLvl = obj.raidLevel || 1;
        const bossHpEstimate = 5000 + ((difficultyLvl - 1) * 500);

        document.getElementById('battle-team').innerHTML = `
            <div style="text-align:center; width:100%;">
                <h3 style="color:#F44336; margin:0;">RAID LEVEL ${difficultyLvl}</h3>
                <p style="color:#666; font-size:12px;">Boss HP: ${bossHpEstimate}</p>
                <div id="raid-team-slots" style="display:flex; justify-content:center; gap:20px; margin:20px 0;"></div>
                <button id="btn-start-raid" class="btn-action" style="background:#F44336; width:100%; justify-content:center;" onclick="Explore.startRaidBattle()">START BATTLE</button>
            </div>
        `;

        const slotsDiv = document.getElementById('raid-team-slots');
        const sortedPokemon = [...Data.storage].sort((a, b) => (b.cp || 0) - (a.cp || 0));
        for (let i = 0; i < 3; i++) {
            const mon = sortedPokemon[i];
            if (mon) {
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

        // UNIQUE DIFFICULTY
        const raidLvl = Explore.currentRaidObj.raidLevel || 1;

        let maxBossHp = 5000 + ((raidLvl - 1) * 500);
        let bossHp = maxBossHp;
        const baseBossDamage = 30 + ((raidLvl - 1) * 2);

        // DAMAGE TRACKING
        let totalDamageDealt = 0;

        let pokes = [];
        const sortedPokemon = [...Data.storage].sort((a, b) => (b.cp || 0) - (a.cp || 0));
        for (let i = 0; i < 3; i++) {
            const m = sortedPokemon[i];
            if (m) {
                pokes.push({
                    idx: i,
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
                    const move = p.moves[Math.floor(Math.random() * p.moves.length)];
                    const dmg = Math.floor(move.power + (Math.random() * 20));
                    bossHp -= dmg;
                    totalDamageDealt += dmg; // Track damage

                    const bossRect = document.getElementById('raid-boss-img').getBoundingClientRect();
                    const jitterX = (Math.random() - 0.5) * 50;
                    const jitterY = (Math.random() - 0.5) * 50;
                    UI.spawnFloatText(`${move.name} ${dmg}`, bossRect.left + bossRect.width / 2 + jitterX, bossRect.top + jitterY, "#fff");
                }
            });

            const pct = Math.max(0, (bossHp / maxBossHp) * 100);
            document.getElementById('raid-hp-fill').style.width = pct + '%';

            const bossImg = document.getElementById('raid-boss-img');
            bossImg.classList.add('attack-anim');
            setTimeout(() => bossImg.classList.remove('attack-anim'), 200);

            // 2. BOSS ATTACKS ONE PLAYER
            const alive = pokes.filter(p => p.curHp > 0);
            if (alive.length > 0) {
                const victim = alive[Math.floor(Math.random() * alive.length)];
                const bossDmg = Math.floor(Math.random() * 40) + baseBossDamage;
                victim.curHp -= bossDmg;

                const vBar = document.getElementById(`hp-bar-${victim.idx}`);
                const vPct = Math.max(0, (victim.curHp / victim.maxHp) * 100);
                if (vBar) vBar.style.width = vPct + '%';

                const vSlot = document.getElementById(`raid-slot-${victim.idx}`);
                if (vSlot) {
                    vSlot.style.transform = 'translate(2px, 2px)';
                    setTimeout(() => vSlot.style.transform = 'translate(0,0)', 100);
                }
            }

            // 3. CHECK END CONDITIONS
            const hasEnded = bossHp <= 0 || (alive.length === 0 && pokes.length > 0);

            if (hasEnded) {
                clearInterval(Explore.raidInterval);

                if (totalDamageDealt > (Data.user.raidHighScore || 0)) {
                    Data.user.raidHighScore = totalDamageDealt;
                    UI.spawnFloatText(`NEW HIGH SCORE: ${totalDamageDealt}!`, window.innerWidth / 2, window.innerHeight / 2 + 50, "#0f0");
                } else {
                    UI.spawnFloatText(`Total Dmg: ${totalDamageDealt}`, window.innerWidth / 2, window.innerHeight / 2 + 50, "#ccc");
                }

                if (bossHp <= 0) {
                    // WIN
                    UI.spawnFloatText("RAID WON!", window.innerWidth / 2, window.innerHeight / 2, "#FFC107");

                    // --- CANDY REWARDS FOR TEAM ---
                    let delay = 300;
                    pokes.forEach(p => {
                        const originalMon = sortedPokemon[p.idx];
                        if (originalMon) {
                            const family = originalMon.family || originalMon.name;
                            const amount = Math.floor(Math.random() * 16) + 10; // 10-25

                            if (!Data.candyBag[family]) Data.candyBag[family] = 0;
                            Data.candyBag[family] += amount;

                            setTimeout(() => {
                                UI.spawnFloatText(`+${amount} ${family} Candy`, window.innerWidth / 2, window.innerHeight / 2 - 50, "#E91E63");
                            }, delay);
                            delay += 400;
                        }
                    });

                    // INCREASE RAID LEVEL (UNIQUE)
                    if (Explore.currentRaidObj) {
                        Explore.currentRaidObj.cooldown = Date.now() + 120000;
                        const mapObj = Data.mapData.find(item => item.x === Explore.currentRaidObj.x && item.y === Explore.currentRaidObj.y && item.type === 'raid');
                        if (mapObj) {
                            // Increase unique level
                            mapObj.raidLevel = (mapObj.raidLevel || 1) + 1;
                            Explore.currentRaidObj.raidLevel = mapObj.raidLevel;
                        }
                    }
                    Game.save();

                    setTimeout(() => {
                        Explore.closeRaid();
                        Explore.triggerEncounter(Explore.currentRaidBossId);
                    }, 2000 + delay); // Wait for candies to show
                } else {
                    // LOSE
                    UI.spawnFloatText("TEAM FAINTED!", window.innerWidth / 2, window.innerHeight / 2, "red");
                    Game.save(); // Save the score update
                    setTimeout(() => {
                        Explore.closeRaid();
                    }, 2000);
                }
            }

        }, 1200);
    },

    closeRaid: () => {
        clearInterval(Explore.raidInterval);
        document.getElementById('raid-modal').style.display = 'none';
        Explore.joystick.active = false;
        Explore.isInteracting = false;
        Explore.x += 100;
    }
};
