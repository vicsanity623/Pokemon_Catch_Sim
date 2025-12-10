const PokeDetail = {
    currentIndex: null,
    
    // Evolution Data (Mapping IDs to their next evolution)
    evolutions: {
        1: 2, 2: 3, // Bulbasaur -> Ivysaur -> Venusaur
        4: 5, 5: 6, // Charmander -> Charmeleon -> Charizard
        7: 8, 8: 9, // Squirtle -> Wartortle -> Blastoise
        25: 26,     // Pikachu -> Raichu
        133: 134,   // Eevee -> Vaporeon (Simplified)
        92: 93, 93: 94, // Gastly -> Haunter -> Gengar
        143: null,  // Snorlax (No evo)
        150: null   // Mewtwo (No evo)
    },

    // Costs
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
        // Refresh storage grid in background in case stats changed
        UI.openStorage(); 
    },

    render: () => {
        const p = Data.storage[PokeDetail.currentIndex];
        if(!p) return PokeDetail.close();

        // Calculate Attributes based on CP (Mocking logic)
        const weight = (p.cp / 100).toFixed(2);
        const height = (p.cp / 1000).toFixed(2);
        const hp = Math.floor(p.cp / 10);
        
        // Resources
        const dust = Data.inventory['Stardust'] || 0;
        // In this simple version, we use generic "Candy". 
        // To be exact like GO, we'd need specific candy types. 
        // For now, we will use the "Pinap Berry" count or a new generic "Rare Candy" logic.
        // **Modification**: Let's create a generic "Candy" pool for simplicity in this version, 
        // derived from the Pokemon's catch data or just use universal candy.
        // For this demo, let's use the 'Pinap Berry' count as "Candies" for visual simplicity, 
        // OR better: Let's assume Data.user has a 'candy' property we added in v12.
        
        // Let's use the generic Data.user.candy we added in the previous version
        const candy = Data.user.candy || 0; 

        // DOM Elements
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
                        <span class="pd-res-label">${p.name.toUpperCase()} CANDY</span>
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

                <!-- EVOLVE BUTTON (Only if evolution exists) -->
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
        
        // Init Stardust if missing
        if(!Data.inventory['Stardust']) Data.inventory['Stardust'] = 0;
        if(!Data.user.candy) Data.user.candy = 0;

        if (Data.inventory['Stardust'] >= cost.dust && Data.user.candy >= cost.candy) {
            // Pay
            Data.inventory['Stardust'] -= cost.dust;
            Data.user.candy -= cost.candy;
            
            // Effect
            const boost = Math.floor(Math.random() * 30) + 10;
            p.cp += boost;
            
            Game.save();
            PokeDetail.render(); // Re-render to show new stats
            UI.toast(`Power Up! +${boost} CP`, "#4CAF50");
        } else {
            UI.toast("Not enough Candy or Stardust!", "red");
        }
    },

    evolve: () => {
        const p = Data.storage[PokeDetail.currentIndex];
        const nextId = PokeDetail.evolutions[p.id];
        const cost = PokeDetail.costs.evolve;

        if(!nextId) return;

        if (Data.user.candy >= cost.candy) {
            // Pay
            Data.user.candy -= cost.candy;
            
            // Effect
            p.id = nextId;
            p.cp = Math.floor(p.cp * 1.6); // Big CP Jump
            // Fetch new name (simple logic, in real app needs DB lookup)
            // We will just clear the name so it re-fetches or use generic logic
            // For this demo, let's look up the name in our Meta list if possible, or generic
            const metaMon = Meta.mons.find(m => m.id === nextId);
            p.name = metaMon ? metaMon.n : "Evolved Form"; 

            Game.save();
            PokeDetail.render();
            UI.toast(`Evolved into ${p.name}!`, "#9C27B0");
            
            // Trigger a flash effect
            document.querySelector('.pd-hero').classList.add('evolve-flash');
        } else {
            UI.toast("Not enough Candy!", "red");
        }
    }
};