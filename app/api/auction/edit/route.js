import dbConnect from '@/lib/db';
import Team from '@/models/Team';
import Player from '@/models/Player';
import mongoose from 'mongoose';
import { NextResponse } from 'next/server';

export async function PUT(request) {
    await dbConnect();

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { playerId, newName, newAmount } = await request.json();

        if (!playerId || !newName || !newAmount) {
            throw new Error('Missing required fields');
        }

        // 1. Get Player
        const player = await Player.findById(playerId).session(session);
        if (!player) throw new Error('Player not found');

        if (player.status !== 'Sold' || !player.soldTo) {
            throw new Error('Player is not sold, cannot edit transaction');
        }

        // 2. Get Team
        const team = await Team.findById(player.soldTo).session(session);
        if (!team) throw new Error('Team not found');

        // 3. Adjust Budget
        // Logic: Refund old price, deduct new price
        // e.g. Old: 100, New: 150. Difference: +50. Budget should decrease by 50.
        // e.g. Old: 100, New: 80.  Difference: -20. Budget should increase by 20.
        const priceDifference = Number(newAmount) - player.soldPrice;

        // Check if team has enough budget for the increase
        if (priceDifference > 0 && team.remainingBudget < priceDifference) {
            throw new Error(`Team does not have enough budget for this increase (Short by ${priceDifference - team.remainingBudget})`);
        }

        team.remainingBudget -= priceDifference;

        // 4. Update Player
        player.name = newName;
        player.soldPrice = Number(newAmount);

        await team.save({ session });
        await player.save({ session });

        await session.commitTransaction();
        return NextResponse.json({ success: true, player, team });
    } catch (err) {
        await session.abortTransaction();
        return NextResponse.json({ error: err.message }, { status: 400 });
    } finally {
        session.endSession();
    }
}
