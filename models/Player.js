import mongoose from 'mongoose';

const PlayerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    category: { type: String, required: true, enum: ['Men', 'Women', 'Kids'] },
    status: { type: String, default: 'Unsold', enum: ['Unsold', 'Sold'] },
    soldTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
    soldPrice: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.models.Player || mongoose.model('Player', PlayerSchema);
