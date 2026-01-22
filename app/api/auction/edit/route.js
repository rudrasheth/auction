import dbConnect from '@/lib/db';
import Team from '@/models/Team';
import Player from '@/models/Player';
import { NextResponse } from 'next/server';

export async function PUT(request) {
    await dbConnect();

    // Removed Transaction for Local DB compatibility
    try {
        const body = await request.json();
        console.log('[API Edit] Request Body:', body);
        const { playerId, newName, newAmount, newTeamId } = body;

        if (!playerId || !newName || !newAmount || !newTeamId) {
            throw new Error('Missing required fields');
        }

        // 1. Get Player
        const player = await Player.findById(playerId);
        if (!player) throw new Error('Player not found');

        if (player.status !== 'Sold' || !player.soldTo) {
            throw new Error('Player is not sold, cannot edit transaction');
        }

        const oldTeamId = player.soldTo.toString();
        const oldPrice = player.soldPrice;
        const newPrice = Number(newAmount);

        // 2. Logic Split: Same Team vs New Team
        if (oldTeamId === newTeamId) {
            // SAME TEAM TRANSFER
            const priceDifference = newPrice - oldPrice;
            const team = await Team.findById(oldTeamId);
            if (!team) throw new Error('Team not found');

            // Check Budget for increase
            if (priceDifference > 0 && team.remainingBudget < priceDifference) {
                throw new Error(`Team does not have enough budget (Short by ${priceDifference - team.remainingBudget})`);
            }

            team.remainingBudget -= priceDifference;
            // Update player name/price in simple flow (no list change needed)
            // But we should save team to persist budget
            await team.save();

        } else {
            // TEAM TRANSFER
            const oldTeam = await Team.findById(oldTeamId);
            const newTeam = await Team.findById(newTeamId);

            if (!oldTeam || !newTeam) throw new Error('One of the teams not found');

            // Check New Team Budget
            if (newTeam.remainingBudget < newPrice) {
                throw new Error(`New Team ${newTeam.name} does not have enough budget (${newTeam.remainingBudget} < ${newPrice})`);
            }

            // Refund Old Team
            oldTeam.remainingBudget += oldPrice;
            oldTeam.playersBought = oldTeam.playersBought.filter(p => p.toString() !== playerId);
            await oldTeam.save();

            // Charge New Team
            newTeam.remainingBudget -= newPrice;
            newTeam.playersBought.push(playerId);
            await newTeam.save();
        }

        // 3. Update Player Record
        player.name = newName;
        player.soldPrice = newPrice;
        player.soldTo = newTeamId;
        await player.save();

        return NextResponse.json({ success: true, player });

    } catch (err) {
        console.error('[API Edit] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 400 });
    }
}
