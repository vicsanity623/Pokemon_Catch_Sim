const PokeDetail = {
    currentIndex: null,
    
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

        const weight = (p.cp / 100).toFixed(2);
        const height = (p.cp / 1000).toFixed(2);
        const hp = Math.floor(p.cp / 10);
        
        const dust = Data.inventory['Stardust'] || 0;
        
        // CORRECT CANDY LOOKUP
        const familyName = p.family || p.name;
        const candy = (Data.candyBag && Data.candyBag[familyName]) ? Data.candyBag[familyName] : 0;

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
        const familyName = p.family || p.name;
        
        if(!Data.inventory['Stardust']) Data.inventory['Stardust'] = 0;
        if(!Data.candyBag[familyName]) Data.candyBag[familyName] = 0;

        if (Data.inventory['Stardust'] >= cost.dust && Data.candyBag[familyName] >= cost.candy) {
            Data.inventory['Stardust'] -= cost.dust;
            Data.candyBag[familyName] -= cost.candy;
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
        const familyName = p.family || p.name;

        if(!p.nextId) return;

        if (Data.candyBag[familyName] >= cost.candy) {
            Data.candyBag[familyName] -= cost.candy;
            
            p.id = p.nextId;
            p.cp = Math.floor(p.cp * 1.6);
            
            // Temporary Name
            p.name = "Evolving...";
            PokeDetail.render();

            fetch(`https://pokeapi.co/api/v2/pokemon/${p.id}`)
                .then(r => r.json())
                .then(d => {
                    p.name = d.name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                    // Do NOT update p.family here.
                    return fetch(d.species.url);
                })
                .then(r => r.json())
                .then(sd => fetch(sd.evolution_chain.url))
                .then(r => r.json())
                .then(evoData => {
                    // Find if there is another evolution after this one
                    const chain = evoData.chain;
                    let nextNextId = null;
                    const getUrlId = (url) => url.split('/').filter(Boolean).pop();

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
                    
                    p.nextId = nextNextId;
                    
                    Game.save();
                    PokeDetail.render();
                    UI.toast(`Evolved!`, "#9C27B0");
                    document.querySelector('.pd-hero').classList.add('evolve-flash');
                })
                .catch(() => {
                    p.name = "Evolved Form";
                    p.nextId = null; 
                    Game.save();
                    PokeDetail.render();
                });

        } else {
            UI.toast("Not enough Candy!", "red");
        }
    }
};