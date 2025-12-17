window.DailyRewards = {
    schedule: [
        { day: 0, label: "Day 0", img: "rare-candy.png", rewards: { 'XP': 100 } }, // NEW DAY 0 (XP Icon)
        { day: 1, label: "Day 1", img: "poke-ball.png", rewards: { 'Poke Ball': 100, 'Stardust': 500 } },
        { day: 2, label: "Day 2", img: "great-ball.png", rewards: { 'Great Ball': 20, 'Stardust': 1000 } },
        { day: 3, label: "Day 3", img: "razz-berry.png", rewards: { 'Razz Berry': 20, 'Stardust': 1500 } },
        { day: 4, label: "Day 4", img: "ultra-ball.png", rewards: { 'Ultra Ball': 50, 'XP': 2000 } },
        { day: 5, label: "Day 5", img: "pinap-berry.png", rewards: { 'Pinap Berry': 50, 'Stardust': 2500 } },
        { day: 6, label: "Day 6", img: "ultra-ball.png", rewards: { 'Ultra Ball': 100, 'XP': 5000 } },
        { day: 7, label: "Day 7", img: "ultra-ball.png", rewards: { 'Ultra Ball': 200, 'Stardust': 10000, 'XP': 10000 } }
    ],

    // State
    isAvailable: false,
    currentStep: 0,

    init: () => {
        DailyRewards.check();
    },

    check: () => {
        const now = new Date();
        const todayKey = `${now.getUTCFullYear()}-${now.getUTCMonth() + 1}-${now.getUTCDate()}`;
        const lastClaim = localStorage.getItem('daily_last_claim');

        let step = parseInt(localStorage.getItem('daily_streak'));
        if (isNaN(step)) step = 0;

        if (lastClaim === todayKey) {
            DailyRewards.isAvailable = false;
        } else {
            DailyRewards.isAvailable = true;
        }

        DailyRewards.currentStep = step;
        DailyRewards.updateIcon();

        // Auto-open for NEW players
        if (DailyRewards.isAvailable && step === 0 && !sessionStorage.getItem('daily_shown')) {
            setTimeout(() => {
                DailyRewards.openUI();
                sessionStorage.setItem('daily_shown', 'true');
            }, 1500);
        }
    },

    updateIcon: () => {
        const dot = document.getElementById('daily-dot');
        if (dot) dot.style.display = DailyRewards.isAvailable ? 'block' : 'none';

        const btn = document.getElementById('btn-daily-calendar');
        if (btn) {
            if (DailyRewards.isAvailable) {
                btn.style.animation = 'pulse 2s infinite';
            } else {
                btn.style.animation = 'none';
            }
        }
    },

    openUI: () => {
        const modal = document.getElementById('daily-modal');
        const grid = document.getElementById('daily-grid-content');
        const btn = document.getElementById('btn-claim-reward');

        modal.style.display = 'flex';
        grid.innerHTML = '';

        const step = DailyRewards.currentStep;

        DailyRewards.schedule.forEach(d => {
            const el = document.createElement('div');
            el.className = 'daily-day';

            if (d.day < step) {
                el.classList.add('claimed');
            } else if (d.day === step) {
                if (DailyRewards.isAvailable) {
                    el.classList.add('active');
                    el.style.border = '2px solid #FF9800';
                    el.style.transform = 'scale(1.1)';
                } else {
                    el.style.opacity = '0.6';
                    el.style.border = '2px solid #ccc';
                }
            } else {
                el.style.opacity = '0.4';
            }

            let imgSrc = d.img;
            if (!imgSrc) imgSrc = 'poke-ball.png';

            const assetsItem = (typeof ASSETS !== 'undefined') ? ASSETS.item : 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/';

            // Allow berries, balls, AND candy to use standard asset path (or rely on full url if needed)
            // If it has .png but no http, assume it's an asset item
            if (imgSrc.indexOf('http') === -1) {
                imgSrc = assetsItem + imgSrc;
            }

            el.innerHTML = `
                <div class="daily-day-num">${d.label}</div>
                <img src="${imgSrc}" onerror="this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png'">
                <span>${Object.keys(d.rewards)[0]}</span>
            `;
            grid.appendChild(el);
        });

        if (DailyRewards.isAvailable) {
            btn.disabled = false;
            btn.innerText = "CLAIM REWARD";
            btn.style.background = "#FF9800";
            btn.style.cursor = "pointer";
        } else {
            btn.disabled = true;
            btn.innerText = "COME BACK TOMORROW";
            btn.style.background = "#ccc";
            btn.style.cursor = "default";
        }
    },

    claim: () => {
        if (!DailyRewards.isAvailable) return;

        const now = new Date();
        const todayKey = `${now.getUTCFullYear()}-${now.getUTCMonth() + 1}-${now.getUTCDate()}`;

        let step = DailyRewards.currentStep;
        if (step < 0 || step >= DailyRewards.schedule.length) step = 1;

        const reward = DailyRewards.schedule.find(s => s.day === step) || DailyRewards.schedule[0];

        let msg = "";
        for (let key in reward.rewards) {
            const qty = reward.rewards[key];
            if (typeof Data !== 'undefined') {
                if (key === 'XP') {
                    if (!Data.user) Data.user = { xp: 0 };
                    Data.user.xp += qty;
                    msg += `+${qty} XP `;
                } else {
                    if (!Data.inventory) Data.inventory = {};
                    if (!Data.inventory[key]) Data.inventory[key] = 0;
                    Data.inventory[key] += qty;
                    msg += `+${qty} ${key} `;
                }
            }
        }

        let nextStep = step + 1;
        if (step >= 7) nextStep = 1;

        // SAVE
        localStorage.setItem('daily_last_claim', todayKey);
        localStorage.setItem('daily_streak', nextStep);

        if (typeof Game !== 'undefined') Game.save();
        if (typeof UI !== 'undefined') UI.updateHUD();

        DailyRewards.check();
        // DailyRewards.openUI(); // Do NOT re-open UI, per request

        // CLOSE MODAL IMMEDIATELY
        document.getElementById('daily-modal').style.display = 'none';

        // Custom Float Text (4 Seconds)
        const floatEl = document.createElement('div');
        floatEl.className = 'float-text';
        floatEl.innerText = msg.trim();
        floatEl.style.left = (window.innerWidth / 2) + 'px';
        floatEl.style.top = (window.innerHeight / 2) + 'px';
        floatEl.style.color = '#FF9800'; // Orange
        floatEl.style.fontSize = '36px';
        floatEl.style.zIndex = '3000';
        floatEl.style.textShadow = '0 2px 5px rgba(0,0,0,0.5)';
        // Override animation duration
        floatEl.style.animation = 'floatUp 4s ease-out forwards';

        document.body.appendChild(floatEl);

        setTimeout(() => floatEl.remove(), 4000);

        // Confetti
        for (let i = 0; i < 20; i++) {
            setTimeout(() => {
                if (window.FX && FX.sparkle) {
                    FX.sparkle(window.innerWidth / 2 + (Math.random() - 0.5) * 300, window.innerHeight / 2 + (Math.random() - 0.5) * 300);
                }
            }, i * 50);
        }
    }
};