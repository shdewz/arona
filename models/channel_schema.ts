const mongoose = require('mongoose');

const channelSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    last_beatmap: Number
});

const model = mongoose.model('channels', channelSchema);
export default model;
