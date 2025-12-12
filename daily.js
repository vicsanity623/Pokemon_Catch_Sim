const DailyRewards = {
    schedule: [
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
    currentStreak: 0,

    init: () => {
        // Just call check to set initial state
        DailyRewards.check();
    },

    check: () => {
        if (typeof Data === 'undefined') return;

        const now = new Date();
        const todayKey = `${now.getUTCFullYear()}-${now.getUTCMonth() + 1}-${now.getUTCDate()}`;
        const lastClaim = localStorage.getItem('daily_last_claim');
        let streak = parseInt(localStorage.getItem('daily_streak') || 0);

        // Calculate Streak for Display
        if (lastClaim) {
            const yesterday = new Date(now);
            yesterday.setUTCDate(now.getUTCDate() - 1);
            const yesterdayKey = `${yesterday.getUTCFullYear()}-${yesterday.getUTCMonth() + 1}-${yesterday.getUTCDate()}`;

            // If we missed a day, reset visual streak (unless we are claiming today to restore it?)
            // Actually, simpler: if last claim wasn't yesterday or today, streak is broken.
            const d1 = new Date(lastClaim);
            const d2 = new Date(todayKey);
            const diffTime = Math.abs(d2 - d1);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (lastClaim !== todayKey && lastClaim !== yesterdayKey) {
                // Streak broken effectively, but we don't reset DB until claim
                // For UI we can show streak 1
            }
        }

        if (lastClaim === todayKey) {
            DailyRewards.isAvailable = false;
        } else {
            DailyRewards.isAvailable = true;
        }

        DailyRewards.currentStreak = streak;
        DailyRewards.updateIcon();
    },

    updateIcon: () => {
        const dot = document.getElementById('daily-dot');
        if (dot) dot.style.display = DailyRewards.isAvailable ? 'block' : 'none';
    },

    openUI: () => {
        const modal = document.getElementById('daily-modal');
        const grid = document.getElementById('daily-grid-content');
        const btn = document.getElementById('btn-claim-reward');

        modal.style.display = 'flex';
        grid.innerHTML = '';

        // Determine effective streak for display
        // If available, the streak will be current + 1 (unless 7)
        let displayDay = DailyRewards.currentStreak;

        const now = new Date();
        const todayKey = `${now.getUTCFullYear()}-${now.getUTCMonth() + 1}-${now.getUTCDate()}`;
        const lastClaim = localStorage.getItem('daily_last_claim');

        // Logic: 
        // If claimed today, we verify streak is correct in DB.
        // If not claimed, we predict next streak.

        let nextDay = DailyRewards.currentStreak + 1;

        // Reset check
        if (DailyRewards.isAvailable && lastClaim) {
            const yesterday = new Date(now);
            yesterday.setUTCDate(now.getUTCDate() - 1);
            const yesterdayKey = `${yesterday.getUTCFullYear()}-${yesterday.getUTCMonth() + 1}-${yesterday.getUTCDate()}`;
            if (lastClaim !== yesterdayKey) nextDay = 1;
        } else if (DailyRewards.isAvailable && !lastClaim) {
            nextDay = 1;
        }

        if (nextDay > 7) nextDay = 1;

        // Render Cards
        DailyRewards.schedule.forEach(d => {
            const el = document.createElement('div');
            el.className = 'daily-day';

            // Logic for styling
            // Active: The day we are about to claim
            // Claimed: Days already passed in current streak

            if (DailyRewards.isAvailable) {
                if (d.day < nextDay) el.classList.add('claimed');
                if (d.day === nextDay) el.classList.add('active');
            } else {
                // Determine based on current streak (which includes today)
                if (d.day <= DailyRewards.currentStreak) el.classList.add('claimed');
            }

            // Image Mapping
            let imgSrc = d.img;
            // Use existing assets
            if (imgSrc.includes('ball') || imgSrc.includes('berry')) {
                imgSrc = ASSETS.item + imgSrc;
            } else {
                imgSrc = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/rare-candy.png';
            }

            el.innerHTML = `
                <div class="daily-day-num">${d.label}</div>
                <img src="${imgSrc}">
                <span>${Object.keys(d.rewards)[0]}</span>
            `;
            grid.appendChild(el);
        });

        // Setup Button
        if (DailyRewards.isAvailable) {
            btn.disabled = false;
            btn.innerText = "CLAIM REWARD";
            btn.style.background = "#FF9800";
        } else {
            btn.disabled = true;
            btn.innerText = "COME BACK TOMORROW";
            btn.style.background = "#ccc";
        }
    },

    claim: () => {
        if (!DailyRewards.isAvailable) return;

        const now = new Date();
        const todayKey = `${now.getUTCFullYear()}-${now.getUTCMonth() + 1}-${now.getUTCDate()}`;
        const lastClaim = localStorage.getItem('daily_last_claim');
        let streak = parseInt(localStorage.getItem('daily_streak') || 0);

        // Reset check logic again
        if (lastClaim) {
            const yesterday = new Date(now);
            yesterday.setUTCDate(now.getUTCDate() - 1);
            const yesterdayKey = `${yesterday.getUTCFullYear()}-${yesterday.getUTCMonth() + 1}-${yesterday.getUTCDate()}`;

            if (lastClaim === yesterdayKey) {
                streak++;
            } else {
                streak = 1;
            }
        } else {
            streak = 1;
        }

        if (streak > 7) streak = 1;

        // SAVE
        localStorage.setItem('daily_last_claim', todayKey);
        localStorage.setItem('daily_streak', streak);

        // Grant Items
        const reward = DailyRewards.schedule[streak - 1];
        let msg = "";

        for (let key in reward.rewards) {
            const qty = reward.rewards[key];
            if (key === 'XP') {
                Data.user.xp += qty;
                msg += `+${qty} XP `;
            } else {
                if (!Data.inventory[key]) Data.inventory[key] = 0;
                Data.inventory[key] += qty;
                msg += `+${qty} ${key} `;
            }
        }

        Game.save();
        UI.updateHUD();
        DailyRewards.check(); // Update state
        DailyRewards.openUI(); // Re-render UI to show claimed state logic

        UI.toast(msg, "#4CAF50");

        // Confetti/Sparkle
        for (let i = 0; i < 20; i++) {
            setTimeout(() => {
                FX.sparkle(window.innerWidth / 2 + (Math.random() - 0.5) * 300, window.innerHeight / 2 + (Math.random() - 0.5) * 300);
            }, i * 50);
        }
    }
};