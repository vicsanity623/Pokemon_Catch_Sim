const DailyRewards = {
    schedule: [
        { day: 1, label: "Day 1", rewards: { 'Pinap Berry': 50, 'Stardust': 1000 } },
        { day: 2, label: "Day 2", rewards: { 'Pinap Berry': 50, 'Stardust': 5000 } },
        { day: 3, label: "Day 3", rewards: { 'Ultra Ball': 100, 'Pinap Berry': 100, 'Stardust': 20000 } },
        { day: 4, label: "Day 4", rewards: { 'Great Ball': 100, 'Stardust': 5000, 'XP': 10000 } },
        { day: 5, label: "Day 5", rewards: { 'Ultra Ball': 100, 'Stardust': 20000 } },
        { day: 6, label: "Day 6", rewards: { 'Pinap Berry': 200, 'Stardust': 50000 } },
        { day: 7, label: "Day 7", rewards: { 'Ultra Ball': 500, 'Pinap Berry': 500, 'XP': 20000 } }
    ],

    check: () => {
        console.log("Checking Daily Rewards...");
        
        // Ensure Data exists before proceeding
        if (typeof Data === 'undefined') {
            console.error("Data object not found. Retrying in 500ms...");
            setTimeout(DailyRewards.check, 500);
            return;
        }

        const now = new Date();
        const todayKey = `${now.getUTCFullYear()}-${now.getUTCMonth() + 1}-${now.getUTCDate()}`;
        
        const lastClaim = localStorage.getItem('daily_last_claim');
        let streak = parseInt(localStorage.getItem('daily_streak') || 0);

        console.log(`Last Claim: ${lastClaim}, Today: ${todayKey}`);

        if (lastClaim === todayKey) {
            console.log("Already claimed today.");
            return;
        }

        const yesterday = new Date(now);
        yesterday.setUTCDate(now.getUTCDate() - 1);
        const yesterdayKey = `${yesterday.getUTCFullYear()}-${yesterday.getUTCMonth() + 1}-${yesterday.getUTCDate()}`;

        if (lastClaim === yesterdayKey) {
            streak++;
        } else {
            streak = 1;
        }

        if (streak > 7) streak = 1;

        localStorage.setItem('daily_last_claim', todayKey);
        localStorage.setItem('daily_streak', streak);

        console.log(`Granting Day ${streak} reward!`);
        DailyRewards.grant(streak);
    },

    grant: (day) => {
        const rewardData = DailyRewards.schedule[day - 1];
        let floatText = `Daily Reward (Day ${day})\n`;

        for (let item in rewardData.rewards) {
            const qty = rewardData.rewards[item];
            if (item === 'XP') {
                Data.user.xp += qty;
                floatText += `+${qty} XP\n`;
            } else if (item === 'Stardust') {
                Data.inventory['Stardust'] += qty;
                floatText += `+${qty} Stardust\n`;
            } else {
                if (!Data.inventory[item]) Data.inventory[item] = 0;
                Data.inventory[item] += qty;
                floatText += `+${qty} ${item}\n`;
            }
        }

        // Save and Update UI
        if(typeof Game !== 'undefined') Game.save();
        if(typeof UI !== 'undefined') {
            UI.updateHUD();
            setTimeout(() => {
                UI.spawnFloatText(floatText, window.innerWidth / 2, window.innerHeight / 2, "#FFC107");
                // Sparkle Effect
                if(typeof FX !== 'undefined') {
                    for(let i=0; i<10; i++) {
                        setTimeout(() => {
                            FX.sparkle(window.innerWidth/2 + (Math.random()-0.5)*200, window.innerHeight/2 + (Math.random()-0.5)*200);
                        }, i * 100);
                    }
                }
            }, 1000);
        }
    }
};