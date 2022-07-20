const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    user_id: { type: String, required: true, unique: true },
    osu_id: Number,
    location: {
        string: String,
        lat: Number,
        lon: Number
    },
    prefs: {
        score_style: String
    }
});

const model = mongoose.model('users', userSchema);
export default model;