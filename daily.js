const DailyRewards = {
    // Reward Schedule
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
        // Current UTC Date (YYYY-MM-DD) ensures global 00:00 reset
        const now = new Date();
        const todayKey = `${now.getUTCFullYear()}-${now.getUTCMonth() + 1}-${now.getUTCDate()}`;
        
        // Load saved state
        const lastClaim = localStorage.getItem('daily_last_claim');
        let streak = parseInt(localStorage.getItem('daily_streak') || 0);

        // If already claimed today, do nothing
        if (lastClaim === todayKey) return;

        // Check streak continuity
        const yesterday = new Date(now);
        yesterday.setUTCDate(now.getUTCDate() - 1);
        const yesterdayKey = `${yesterday.getUTCFullYear()}-${yesterday.getUTCMonth() + 1}-${yesterday.getUTCDate()}`;

        if (lastClaim === yesterdayKey) {
            streak++; // Continue streak
        } else {
            streak = 1; // Reset streak if missed a day
        }

        // Loop streak (1-7)
        if (streak > 7) streak = 1;

        // Save new state immediately so it doesn't pop up again on refresh
        localStorage.setItem('daily_last_claim', todayKey);
        localStorage.setItem('daily_streak', streak);

        // Give Rewards
        DailyRewards.grant(streak);
    },

    grant: (day) => {
        const rewardData = DailyRewards.schedule[day - 1];
        let floatText = `Daily Reward (Day ${day})\n`;

        // Process items
        for (let item in rewardData.rewards) {
            const qty = rewardData.rewards[item];
            
            if (item === 'XP') {
                Data.user.xp += qty;
                floatText += `+${qty} XP\n`;
                // Check Level Up
                if (Data.user.xp >= Data.user.nextLevelXp) {
                    setTimeout(Game.levelUp, 1000);
                }
            } else if (item === 'Stardust') {
                Data.inventory['Stardust'] += qty;
                floatText += `+${qty} Stardust\n`;
            } else {
                if (!Data.inventory[item]) Data.inventory[item] = 0;
                Data.inventory[item] += qty;
                floatText += `+${qty} ${item}\n`;
            }
        }

        Game.save();
        UI.updateHUD();

        // Show Visuals
        setTimeout(() => {
            // Center Screen Float
            UI.spawnFloatText(floatText, window.innerWidth / 2, window.innerHeight / 2, "#FFC107");
            // Play Sound effect visual (sparkles)
            for(let i=0; i<10; i++) {
                setTimeout(() => {
                    FX.sparkle(window.innerWidth/2 + (Math.random()-0.5)*200, window.innerHeight/2 + (Math.random()-0.5)*200);
                }, i * 100);
            }
        }, 1500); // Small delay to let game load
    }
};