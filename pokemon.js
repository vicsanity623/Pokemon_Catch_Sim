const PokeDetail = {
    currentIndex: null,
    
    // Hardcoded Evolutions for the "Starter" set (Expanded for the demo logic)
    // In a real full app, this would query an API, but for this persistent local demo we map the common ones.
    evolutions: {
        1: 2, 2: 3, // Bulbasaur -> Ivysaur -> Venusaur
        4: 5, 5: 6, // Charmander -> Charmeleon -> Charizard
        7: 8, 8: 9, // Squirtle -> Wartortle -> Blastoise
        25: 26,     // Pikachu -> Raichu
        133: 134,   // Eevee -> Vaporeon
        92: 93, 93: 94, // Gastly -> Haunter -> Gengar
        
        // Add a few more common base forms for the demo feel
        172: 25,    // Pichu -> Pikachu (If we wanted babies, but we are spawning base)
        10: 11, 11: 12, // Caterpie
        13: 14, 14: 15, // Weedle
        16: 17, 17: 18, // Pidgey
    },

    costs: {
        powerUp: { dust: 200, candy: 1 },
        evolve: { dust: 0, candy: 25 }
    },

    open: (storageIndex) => {
        PokeDetail.currentIndex = storageIndex;
        PokeDetail.render();
        document.getElementById('pokemon-detail-screen').classList.add('active');
    },

    close: () => {
        document.getElementById('pokemon-detail-screen').classList.remove('active');
        UI.openStorage(); // Refresh storage grid
    },

    render: () => {
        const p = Data.storage[PokeDetail.currentIndex];
        if(!p) return PokeDetail.close();

        // Stats
        const weight = (p.cp / 100).toFixed(2);
        const height = (p.cp / 1000).toFixed(2);
        const hp = Math.floor(p.cp / 10);
        
        // Resources
        const dust = Data.inventory['Stardust'] || 0;
        const candy = Data.user.candy || 0; 
        
        // LOGIC CHANGE: Use Family Name for Candy, fallback to Name if missing
        const candyName = p.family || p.name;

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

                <div class="pd-resources">
                    <div class="pd-res">
                        <div class="pd-dust-icon"></div>
                        <span>${dust}</span>
                        <span class="pd-res-label">STARDUST</span>
                    </div>
                    <div class="pd-res">
                        <div class="pd-candy-icon"></div>
                        <span>${candy}</span>
                        <!-- CORRECTED CANDY NAME -->
                        <span class="pd-res-label">${candyName.toUpperCase()} CANDY</span>
                    </div>
                </div>

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

                ${PokeDetail.evolutions[p.id] ? `
                <div class="pd-action-btn pd-evolve-btn" onclick="PokeDetail.evolve()">
                    <div class="pd-btn-left">
                        <span class="pd-btn-title">EVOLVE</span>
                    </div>
                    <div class="pd-btn-right">
                        <div class="pd-cost-item">
                            <span class="pd-candy-tiny"></span> ${PokeDetail.costs.evolve.candy}
                        </div>
                    </div>
                </div>` : ''}

            </div>
            <button class="pd-close-fab" onclick="PokeDetail.close()">✕</button>
        `;
    },

    powerUp: () => {
        const p = Data.storage[PokeDetail.currentIndex];
        const cost = PokeDetail.costs.powerUp;
        
        if(!Data.inventory['Stardust']) Data.inventory['Stardust'] = 0;
        if(!Data.user.candy) Data.user.candy = 0;

        if (Data.inventory['Stardust'] >= cost.dust && Data.user.candy >= cost.candy) {
            Data.inventory['Stardust'] -= cost.dust;
            Data.user.candy -= cost.candy;
            const boost = Math.floor(Math.random() * 30) + 10;
            p.cp += boost;
            Game.save();
            PokeDetail.render(); 
            UI.toast(`Power Up! +${boost} CP`, "#4CAF50");
        } else {
            UI.toast("Not enough resources!", "red");
        }
    },

    evolve: () => {
        const p = Data.storage[PokeDetail.currentIndex];
        const nextId = PokeDetail.evolutions[p.id];
        const cost = PokeDetail.costs.evolve;

        if(!nextId) return;

        if (Data.user.candy >= cost.candy) {
            Data.user.candy -= cost.candy;
            
            p.id = nextId;
            p.cp = Math.floor(p.cp * 1.6);
            
            // We need the new name. For the demo list, we can try to guess or fetch.
            // Simple approach: Check our Meta list or just use "Evolved Form" if unknown in offline mode.
            // Ideally, we'd fetch the name, but to keep it simple and synchronous:
            const metaMon = Meta.mons.find(m => m.id === nextId);
            p.name = metaMon ? metaMon.n : "Evolved Form"; 
            
            // NOTE: p.family is NOT changed here. It remains "Gastly" even if name is "Gengar".

            Game.save();
            PokeDetail.render();
            UI.toast(`Evolved!`, "#9C27B0");
            document.querySelector('.pd-hero').classList.add('evolve-flash');
        } else {
            UI.toast("Not enough Candy!", "red");
        }
    }
};