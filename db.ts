require('dotenv').config();
import mongoose from 'mongoose';
const db_key: string = process.env.MONGODB ?? '';

export const init = () => {
    mongoose.connect(db_key);
    const db = mongoose.connection;

    db.on('error', console.error.bind(console, 'connection error:'));
    db.once('open', () => console.log('Database connection successful'));
};