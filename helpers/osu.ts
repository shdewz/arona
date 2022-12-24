require('dotenv').config();
const fetch = require('node-fetch');
const moment = require('moment');
const channelModel = require('../models/channel_schema.js');
const baseurl = 'https://osu.ppy.sh/api/v2';
const tools = require('./osu-tools.js');

let osuauth: any = { token: null, expires: 0 };

export const getUser = async (user_id: string, mode: string) => {
    let data = await apiCall(baseurl + `/users/${user_id}${mode ? `/${mode}` : ''}`);
    return data.error ? { error: `User **${user_id}** not found.` } : data;
};

export const getBeatmap = async (beatmap_id: string, options: beatmapOptions) => {
    let data = await apiCall(baseurl + `/beatmaps/${beatmap_id}`);
    if (data.error) return { error: `Beatmap **${beatmap_id}** not found.` };
    if (options.mods !== 'NM') data.mods = tools.reverseMods(options.mods);

    if (options.calc_diff) data.diff = await tools.diffCalc(data.id, { ...options, mods: data.mods });
    data.stats = tools.getModStats(data.cs, data.ar, data.accuracy, data.drain, data.bpm, options.mods);

    if (options.lb) data.lb = await apiCall(baseurl + `/beatmaps/${beatmap_id}/scores`);
    return data;
};

export const getUserScores = async (user_id: string, mode: string, type: string, limit: number) => {
    let data = await apiCall(baseurl + `/users/${user_id}/scores/${type}?` + new URLSearchParams({
        ...(mode && { mode: mode }),
        limit: limit.toString(),
        include_fails: '1'
    }));
    return data.error ? { error: `User **${user_id}** not found.` } : data;
};

export const getScore = async (score_id: string, mode: string) => {
    let data = await apiCall(baseurl + `/scores/${mode}/${score_id}`);
    return data.error ? { error: `Score **${score_id}** not found.` } : data;
}

export const getBeatmapScores = async (beatmap_id: string, user_id: string, mode: string) => {
    let data = await apiCall(baseurl + `/beatmaps/${beatmap_id}/scores/users/${user_id}/all?` + new URLSearchParams({ ...(mode && { mode: mode }) }));
    return data.error ? { error: `No scores found for user **${user_id}**.` } : data.scores;
};

export const updateBeatmap = async (channel_id: string, beatmap_id: string) => {
    await channelModel.findOneAndUpdate({ id: channel_id }, { last_beatmap: beatmap_id }, { upsert: true, new: true });
};

const getAuth = async () => { return !osuauth.token || osuauth.expires - 5000 < moment.utc().valueOf() ? await authorize() : osuauth }

const authorize = async () => {
    let response = await fetch('https://osu.ppy.sh/oauth/token', {
        method: 'post',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
            'grant_type': 'client_credentials',
            'client_id': process.env.OSU_CLIENT_ID,
            'client_secret': process.env.OSU_CLIENT_SECRET,
            'scope': 'public'
        })
    });
    let token = await response.json();
    osuauth = { token: token, expires: moment.utc().valueOf() + token.expires_in };
    return osuauth;
}

const apiCall = async (url: string) => {
    let auth = await getAuth();
    let response = await fetch(url, { headers: { Authorization: `Bearer ${auth.token.access_token}` } });
    let data = await response.json();
    return data ?? response;
}
