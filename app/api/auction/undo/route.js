import dbConnect from '@/lib/db';
import Team from '@/models/Team';
import Player from '@/models/Player';
import { NextResponse } from 'next/server';

export async function POST(request) {
    await dbConnect();

    try {
        const body = await request.json();
        console.log('[API Undo] Request Body:', body);
        const { playerId } = body;

        if (!playerId) {
            console.error('[API Undo] Player ID missing');
            throw new Error('Player ID is required');
        }

        // 1. Find the player
        const player = await Player.findById(playerId);
        if (!player) {
            console.error('[API Undo] Player not found:', playerId);
            throw new Error('Player not found');
        }

        console.log('[API Undo] Found player:', player.name, 'Sold to:', player.soldTo);

        const cost = player.soldPrice || 0;
        const teamId = player.soldTo;

        // 2. Refund the Team
        if (teamId) {
            const team = await Team.findById(teamId);
            if (team) {
                console.log('[API Undo] Refunding team:', team.name, 'Amount:', cost);
                team.remainingBudget += cost;
                // Remove player from team's list
                team.playersBought = team.playersBought.filter(
                    (p) => p.toString() !== playerId
                );
                await team.save();
            } else {
                console.warn('[API Undo] Team not found for refund:', teamId);
            }
        }

        // 3. Delete the player
        console.log('[API Undo] Deleting player record');
        await Player.findByIdAndDelete(playerId);

        return NextResponse.json({ success: true, message: 'Undo successful' });

    } catch (error) {
        console.error('[API Undo] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
