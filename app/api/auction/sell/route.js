import dbConnect from '@/lib/db';
import Team from '@/models/Team';
import Player from '@/models/Player';
import mongoose from 'mongoose';
import { NextResponse } from 'next/server';

export async function POST(request) {
    await dbConnect();

    // Start a transaction for data integrity
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { playerName, category, teamId, amount } = await request.json();

        if (!playerName || !category || !teamId || amount === undefined) {
            throw new Error('Missing required fields');
        }

        const catTitle = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
        const cost = Number(amount);

        // 1. Get Team
        const team = await Team.findById(teamId).session(session);
        if (!team) throw new Error('Team not found');

        // Check Budget
        if (team.remainingBudget < cost) {
            throw new Error(`Insufficient funds. Team has ${team.remainingBudget}, needs ${cost}`);
        }

        // 2. Create Player
        const player = new Player({
            name: playerName,
            category: catTitle,
            status: 'Sold',
            soldTo: teamId,
            soldPrice: cost
        });
        await player.save({ session });

        // 3. Update Team
        team.remainingBudget -= cost;
        team.playersBought.push(player._id);
        await team.save({ session });

        await session.commitTransaction();
        return NextResponse.json({ success: true, player, team });
    } catch (err) {
        await session.abortTransaction();
        return NextResponse.json({ error: err.message }, { status: 400 });
    } finally {
        session.endSession();
    }
}
