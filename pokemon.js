const PokeDetail = {
    currentIndex: null,
    
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
        UI.openStorage(); 
    },

    render: () => {
        const p = Data.storage[PokeDetail.currentIndex];
        if(!p) return PokeDetail.close();

        // Calculate Attributes based on CP
        const weight = (p.cp / 100).toFixed(2);
        const height = (p.cp / 1000).toFixed(2);
        const hp = Math.floor(p.cp / 10);
        
        const dust = Data.inventory['Stardust'] || 0;
        
        // FIX: Ensure we look up the candy using the exact family name saved in Data.candyBag
        const familyName = p.family || p.name;
        const candy = (Data.candyBag && Data.candyBag[familyName]) ? Data.candyBag[familyName] : 0;

        // CHECK IF EVOLUTION IS AVAILABLE FROM SAVED DATA
        const canEvolve = p.nextId && p.nextId !== null;

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
                        <span class="pd-res-label">${familyName.toUpperCase()} CANDY</span>
                    </div>
                </div>

                <!-- POWER UP -->
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

                <!-- EVOLVE (Dynamic Check) -->
                ${canEvolve ? `
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
        const cost = PokeDetail.costs.evolve;

        if(!p.nextId) return;

        if (Data.user.candy >= cost.candy) {
            Data.user.candy -= cost.candy;
            
            // 1. Update ID and Stats
            const oldId = p.id;
            p.id = p.nextId;
            p.cp = Math.floor(p.cp * 1.6);
            
            // 2. Fetch New Name (Attempt)
            // We set a temporary name, then try to fetch the real one
            p.name = "Evolving...";
            PokeDetail.render();

            fetch(`https://pokeapi.co/api/v2/pokemon/${p.id}`)
                .then(r => r.json())
                .then(d => {
                    // Clean Name
                    p.name = d.name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                    
                    // 3. Check if there is a FURTHER evolution (Grandchild)
                    // We must fetch the species again to see if this new form has an evolution
                    return fetch(d.species.url);
                })
                .then(r => r.json())
                .then(sd => {
                    return fetch(sd.evolution_chain.url);
                })
                .then(r => r.json())
                .then(evoData => {
                    // Traverse chain to find what comes after current p.id
                    const chain = evoData.chain;
                    let nextNextId = null;
                    const getUrlId = (url) => url.split('/').filter(Boolean).pop();

                    // Recursive finder
                    const findNext = (node) => {
                        if(getUrlId(node.species.url) == p.id) {
                            if(node.evolves_to.length > 0) {
                                nextNextId = getUrlId(node.evolves_to[0].species.url);
                            }
                        } else {
                            node.evolves_to.forEach(child => findNext(child));
                        }
                    };
                    findNext(chain);
                    
                    p.nextId = nextNextId; // Update next step (e.g. Ivysaur -> Venusaur)
                    Game.save();
                    PokeDetail.render();
                    UI.toast(`Evolution Complete!`, "#9C27B0");
                    document.querySelector('.pd-hero').classList.add('evolve-flash');
                })
                .catch(() => {
                    // Offline Fallback
                    p.name = "Evolved Form";
                    p.nextId = null; // Assume final form if offline
                    Game.save();
                    PokeDetail.render();
                });

        } else {
            UI.toast("Not enough Candy!", "red");
        }
    }
};