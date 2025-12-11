const PokeDetail = {
    currentIndex: null,

    costs: {
        powerUp: { dust: 200, candy: 1 },
        // Base evolve cost, but we override this with specific data
        evolve: { dust: 0, candy: 25 }
    },

    open: (storageIndex) => {
        PokeDetail.currentIndex = storageIndex;
        PokeDetail.render();
        document.getElementById('pokemon-detail-screen').classList.add('active');
    },

    close: () => {
        document.getElementById('pokemon-detail-screen').classList.remove('active');
        UI.openStorage();
    },

    render: () => {
        const p = Data.storage[PokeDetail.currentIndex];
        if (!p) return PokeDetail.close();

        const weight = (p.cp / 100).toFixed(2);
        const height = (p.cp / 1000).toFixed(2);
        const hp = Math.floor(p.cp / 10);

        const dust = Data.inventory['Stardust'] || 0;

        // CORRECT CANDY LOOKUP
        const familyName = p.family || p.name;
        const candy = (Data.candyBag && Data.candyBag[familyName]) ? Data.candyBag[familyName] : 0;

        const canEvolve = p.nextId && p.nextId !== null;
        
        // Determine dynamic evolve cost for Display
        const currentEvolveCost = p.evolveCost || 25;

        const screen = document.getElementById('pokemon-detail-screen');

        screen.innerHTML = `
            <div class="pd-header">
                <div class="pd-cp-label">CP <span class="pd-cp-val">${p.cp}</span></div>
            </div>
            
            <div class="pd-hero">
                <img src="${ASSETS.poke + p.id + '.png'}" class="pd-sprite">
            </div>

            <div class="pd-info-card">
                <div class="pd-name-row">
                    <span class="pd-name">${p.name}</span>
                    <i class="pd-pencil">✎</i>
                </div>
                
                <div class="pd-hp-bar">
                    <div class="pd-hp-fill" style="width:100%"></div>
                </div>
                <div class="pd-hp-text">${hp} / ${hp} HP</div>

                <div class="pd-stats-row">
                    <div class="pd-stat">
                        <span class="pd-stat-val">${weight}kg</span>
                        <span class="pd-stat-label">Weight</span>
                    </div>
                    <div class="pd-stat">
                        <span class="pd-stat-val">Normal</span>
                        <span class="pd-stat-label">Type</span>
                    </div>
                    <div class="pd-stat">
                        <span class="pd-stat-val">${height}m</span>
                        <span class="pd-stat-label">Height</span>
                    </div>
                </div>

                ${p.moves && p.moves.length > 0 ? `
                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
                    <div style="text-align: center; font-weight: bold; color: #888; font-size: 12px; margin-bottom: 10px;">MOVES</div>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        ${p.moves.map(move => `
                            <div style="display: flex; justify-content: space-between; align-items: center; background: #f5f5f5; padding: 8px 12px; border-radius: 8px;">
                                <span style="font-size: 14px; font-weight: 500; color: #333;">${move.name}</span>
                                <span style="font-size: 14px; font-weight: bold; color: #2196F3;">⚡${move.power}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}

                <div class="pd-resources">
                    <div class="pd-res">
                        <div class="pd-dust-icon"></div>
                        <span>${dust}</span>
                        <span class="pd-res-label">STARDUST</span>
                    </div>
                    <div class="pd-res">
                        <div class="pd-candy-icon"></div>
                        <span>${candy}</span>
                        <span class="pd-res-label">${familyName.toUpperCase()} CANDY</span>
                    </div>
                </div>

                <!-- POWER UP BUTTON -->
                <div class="pd-action-btn" onclick="PokeDetail.powerUp()">
                    <div class="pd-btn-left">
                        <span class="pd-btn-title">POWER UP</span>
                    </div>
                    <div class="pd-btn-right">
                        <div class="pd-cost-item">
                            <span class="pd-dust-tiny"></span> ${PokeDetail.costs.powerUp.dust}
                        </div>
                        <div class="pd-cost-item">
                            <span class="pd-candy-tiny"></span> ${PokeDetail.costs.powerUp.candy}
                        </div>
                    </div>
                </div>

                <!-- EVOLVE BUTTON -->
                ${canEvolve ? `
                <div class="pd-action-btn pd-evolve-btn" onclick="PokeDetail.evolve()">
                    <div class="pd-btn-left">
                        <span class="pd-btn-title">EVOLVE</span>
                    </div>
                    <div class="pd-btn-right">
                        <div class="pd-cost-item">
                            <span class="pd-candy-tiny"></span> ${currentEvolveCost}
                        </div>
                    </div>
                </div>` : ''}

                <!-- TRANSFER (DELETE) BUTTON -->
                <div class="pd-action-btn" style="background-color: #607D8B; margin-top: 15px;" onclick="PokeDetail.transfer()">
                    <div class="pd-btn-left">
                        <span class="pd-btn-title">TRANSFER</span>
                    </div>
                    <div class="pd-btn-right">
                        <div class="pd-cost-item">
                            <span class="pd-candy-tiny"></span> +5
                        </div>
                    </div>
                </div>

            </div>
            <button class="pd-close-fab" onclick="PokeDetail.close()">✕</button>
        `;
    },

    powerUp: () => {
        const p = Data.storage[PokeDetail.currentIndex];
        const cost = PokeDetail.costs.powerUp;
        const familyName = p.family || p.name;

        if (!Data.inventory['Stardust']) Data.inventory['Stardust'] = 0;
        if (!Data.candyBag[familyName]) Data.candyBag[familyName] = 0;

        if (Data.inventory['Stardust'] >= cost.dust && Data.candyBag[familyName] >= cost.candy) {
            Data.inventory['Stardust'] -= cost.dust;
            Data.candyBag[familyName] -= cost.candy;
            const boost = Math.floor(Math.random() * 30) + 10;
            p.cp += boost;

            // INCREASE MOVE POWER
            if (p.moves && p.moves.length > 0) {
                p.moves.forEach(move => {
                    const moveBoost = Math.floor(Math.random() * 6) + 3; 
                    move.power += moveBoost;
                });
            } else {
                p.moves = [
                    { name: 'Tackle', power: 40, type: 'normal' },
                    { name: 'Quick Attack', power: 40, type: 'normal' }
                ];
            }

            Game.save();
            PokeDetail.render();
            UI.toast(`Power Up! +${boost} CP`, "#4CAF50");
        } else {
            UI.toast("Not enough resources!", "red");
        }
    },

    evolve: () => {
        const p = Data.storage[PokeDetail.currentIndex];
        
        // --- 1. DETERMINE COST ---
        const currentCost = p.evolveCost || 25;
        const familyName = p.family || p.name; 

        if (!p.nextId) {
            UI.toast("Cannot evolve further!", "gray");
            return;
        }

        // --- 2. CHECK CANDY ---
        const currentCandy = Data.candyBag[familyName] || 0;

        if (currentCandy >= currentCost) {
            // Deduct Candy
            Data.candyBag[familyName] -= currentCost;

            // --- 3. APPLY EVOLUTION & STAT BOOSTS ---
            const oldId = p.id;
            p.id = p.nextId; 
            
            // Boost CP (Multiplied by 1.6)
            p.cp = Math.floor(p.cp * 1.6);
            
            // Boost Attacks (Permanent Power Increase)
            if (p.moves && Array.isArray(p.moves)) {
                p.moves.forEach(move => {
                    // Add +10 to +20 power
                    const boost = Math.floor(Math.random() * 11) + 10; 
                    move.power = (move.power || 20) + boost;
                });
            } else {
                // Fallback for older saves
                p.moves = [{ name: 'Tackle', power: 45 }, { name: 'Struggle', power: 55 }];
            }

            // UI Feedback
            p.name = "Evolving...";
            PokeDetail.render();
            document.querySelector('.pd-hero').classList.add('evolve-flash');

            // --- 4. FETCH DATA ---
            fetch(`https://pokeapi.co/api/v2/pokemon/${p.id}`)
                .then(r => r.json())
                .then(d => {
                    // A. SET NAME IMMEDIATELY
                    // This ensures that even if the evolution chain check fails later, 
                    // we still have the correct name (e.g. "Marowak") instead of "Evolved Form".
                    p.name = d.name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                    
                    // Save RIGHT NOW to lock in the name
                    Game.save();
                    PokeDetail.render(); 

                    // B. Fetch Species Data for Next Evolution Check
                    return fetch(d.species.url);
                })
                .then(r => r.json())
                .then(sd => fetch(sd.evolution_chain.url))
                .then(r => r.json())
                .then(evoData => {
                    
                    // --- 5. FIND NEXT EVOLUTION ID ---
                    const chain = evoData.chain;
                    let nextNextId = null;
                    
                    const getUrlId = (url) => {
                        const parts = url.split('/').filter(Boolean);
                        return parseInt(parts.pop());
                    };

                    // Recursive search to find CURRENT Pokemon in the chain
                    const findNext = (node) => {
                        const nodeId = getUrlId(node.species.url);
                        
                        // Compare as Numbers to be strictly safe
                        if (nodeId === parseInt(p.id)) {
                            // We found the current form! Does it have a child?
                            if (node.evolves_to.length > 0) {
                                nextNextId = getUrlId(node.evolves_to[0].species.url);
                            }
                        } else {
                            // Keep looking deeper
                            node.evolves_to.forEach(child => findNext(child));
                        }
                    };

                    findNext(chain);

                    // Update nextId for the NEXT time they want to evolve
                    p.nextId = nextNextId;
                    
                    // --- COST DOUBLING LOGIC ---
                    // 25 -> 50 -> 100. Caps at 100.
                    let newCost = currentCost * 2;
                    if (newCost > 100) newCost = 100;
                    p.evolveCost = newCost;

                    Game.save();
                    PokeDetail.render(); 
                    
                    UI.toast(`Success! Evolved to ${p.name}!`, "#9C27B0");
                    setTimeout(() => {
                        const hero = document.querySelector('.pd-hero');
                        if(hero) hero.classList.remove('evolve-flash');
                    }, 1000);
                })
                .catch((err) => {
                    console.error("Evolution Data Error:", err);
                    
                    // --- THE FIX ---
                    // Only overwrite the name if we truly failed to get it earlier.
                    // If p.name is "Marowak", leave it alone!
                    if (p.name === "Evolving...") {
                        p.name = "Evolved Form";
                    }

                    // If we failed to find the chain, set nextId to null 
                    // so the user isn't stuck with a broken evolve button.
                    p.nextId = null;
                    
                    Game.save();
                    PokeDetail.render();
                    UI.toast("Evolved, but next evolution data unavailable.", "orange");
                });

        } else {
            UI.toast(`Need ${currentCost} Candy! (Have ${currentCandy})`, "red");
        }
    },

    transfer: () => {
        const p = Data.storage[PokeDetail.currentIndex];
        if (!p) return;

        // --- CONFIRMATION DIALOG ---
        if (confirm(`Are you sure you want to transfer ${p.name} to the Professor?\n\nYou will lose this Pokemon and receive 5 Candy.`)) {
            
            const familyName = p.family || p.name;
            
            // --- 1. ADD CANDY ---
            if (!Data.candyBag[familyName]) Data.candyBag[familyName] = 0;
            Data.candyBag[familyName] += 5;

            // --- 2. REMOVE FROM STORAGE ---
            // Splice removes the item at this index
            Data.storage.splice(PokeDetail.currentIndex, 1);

            // --- 3. SAVE AND EXIT ---
            Game.save();
            
            // Close the detail view because the Pokemon is gone
            PokeDetail.close();
            
            // Show toast message
            UI.toast(`Transferred! +5 ${familyName} Candy`, "#2196F3");
        }
    }
};