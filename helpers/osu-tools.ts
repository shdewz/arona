const fs = require('fs');
const rosu = require('rosu-pp');
const osu = require('ojsama');
const request = require('request-promise');

const emotes = [
    { name: 'XH', color: 0xcb1699, emoji: '<:rankingSSH:871388940836413471>' },
    { name: 'X', color: 0xcb1699, emoji: '<:rankingSS:871388941205508126>' },
    { name: 'SH', color: 0x01a9b7, emoji: '<:rankingSH:871388941281021963>' },
    { name: 'S', color: 0x01a9b7, emoji: '<:rankingS:871388941058732084>' },
    { name: 'A', color: 0x84d71c, emoji: '<:rankingA:871388941088096316>' },
    { name: 'B', color: 0xe2b130, emoji: '<:rankingB:871388941130014740>' },
    { name: 'C', color: 0xfb8a5a, emoji: '<:rankingC:871388941188747265>' },
    { name: 'D', color: 0xf45755, emoji: '<:rankingD:871388941151002665>' },
    { name: 'F', color: 0xe1e1e1, emoji: '<:rankingF:871388941222297620>' },
    { name: 'miss', color: 0xf52424, emoji: '<:miss:891674271800262706>' },
    { name: 'hit300', color: 0x26abf8, emoji: '<:hit300:891673481115238492>' },
    { name: 'hit100', color: 0x23ec57, emoji: '<:hit100:891673481568194610>' },
    { name: 'hit50', color: 0xedc936, emoji: '<:hit50:891673481538846730>' },
    { name: 'increase', color: 0x55ee5c, emoji: '<:increase:949320646318510121>' },
    { name: 'decrease', color: 0xf94c4c, emoji: '<:decrease:949320646301745252>' },
    { name: 'twitter', color: 0xdcddde, emoji: '<:twitter:949331827775135784>' },
    { name: 'discord', color: 0xdcddde, emoji: '<:discord:949331827460550757>' },
];

const downloadMap = async (beatmap_id: string) => {
    if (fs.existsSync(`src/beatmaps/${beatmap_id}.osu`)) return;
    fs.writeFileSync(`src/beatmaps/${beatmap_id}.osu`, await request(`https://osu.ppy.sh/osu/${beatmap_id}`));
}

export const getEmote = (name: string) => { return emotes.find(r => r.name === name); };

export const getMods = (mods: number) => { return osu.modbits.string(mods) };

export const reverseMods = (mods: string | Array<string>, basic: boolean) => {
    mods = Array.isArray(mods) ? mods : mods.match(/.{2}/g);
    if (basic) { mods = mods.map(mod => mod.replace('NC', 'DT')).filter(mod => ['HR', 'DT', 'HT', 'EZ'].includes(mod)); }
    return osu.modbits.from_string(mods.join(''));
};

export const guessFc = (beatmap, combo: number, hits: hitCount) => hits.count_miss == 0 && combo + ((hits.count_50 + hits.count_100) / 2) >= beatmap.max_combo;

export const getAcc = (hits) => (hits.count_300 * 300 + hits.count_100 * 100 + hits.count_50 * 50) / (hits.count_300 * 300 + hits.count_100 * 300 + hits.count_50 * 300 + hits.count_miss * 300);

export const diffCalc = async (beatmap_id: string, scores: Array<diffCalcScore>) => {
    await downloadMap(beatmap_id);
    return await rosu.calculate({
        path: `src/beatmaps/${beatmap_id}.osu`,
        params: scores
    });
}

export const getModStats = (cs_raw: number, ar_raw: number, od_raw: number, hp_raw: number, bpm_raw: number, mods: string) => {
    mods = mods.replace('NC', 'DT');

    let speed = mods.includes('DT') ? 1.5 : mods.includes('HT') ? 0.75 : 1;

    let ar = mods.includes('HR') ? ar_raw * 1.4 : mods.includes('EZ') ? ar_raw * 0.5 : ar_raw;
    let ar_ms = Math.max(Math.min(ar <= 5 ? 1800 - 120 * ar : 1200 - 150 * (ar - 5), 1800), 450) / speed;
    ar = ar <= 5 ? (1800 - ar_ms) / 120 : 5 + (1200 - ar_ms) / 150;

    let cs = Math.min(mods.includes('HR') ? cs_raw * 1.3 : mods.includes('EZ') ? cs_raw * 0.5 : cs_raw, 10);
    let hp = Math.min(mods.includes('HR') ? hp_raw * 1.4 : mods.includes('EZ') ? hp_raw * 0.5 : hp_raw, 10);

    let od = mods.includes('HR') ? od_raw * 1.4 : mods.includes('EZ') ? od_raw * 0.5 : od_raw;
    od = Math.min((79.5 - (Math.min(79.5, Math.max(19.5, 79.5 - Math.ceil(6 * od))) / speed)) / 6, 11);

    return { cs, ar, od, hp, bpm: bpm_raw * speed }
};