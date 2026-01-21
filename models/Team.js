import mongoose from 'mongoose';

const TeamSchema = new mongoose.Schema({
    name: { type: String, required: true },
    category: { type: String, required: true, enum: ['Men', 'Women', 'Kids'] },
    totalBudget: { type: Number, required: true },
    remainingBudget: { type: Number, required: true },
    playersBought: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }],
}, { timestamps: true });

export default mongoose.models.Team || mongoose.model('Team', TeamSchema);
