require('dotenv').config();
import mongoose from 'mongoose';

export const init = () => {
    mongoose.connect(process.env.MONGODB);
    const db = mongoose.connection;

    db.on('error', console.error.bind(console, 'connection error:'));
    db.once('open', () => console.log('Database connection successful'));
};