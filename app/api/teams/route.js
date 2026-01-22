import dbConnect from '@/lib/db';
import Team from '@/models/Team';
import Player from '@/models/Player'; // Ensure Player model is registered
import { NextResponse } from 'next/server';

export async function GET(request) {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category'); // e.g., 'men', 'women', 'kids'

    if (!category) {
        // Return summary of active sessions
        try {
            const sessions = await Team.aggregate([
                { $group: { _id: "$category", count: { $sum: 1 } } }
            ]);
            return NextResponse.json({ sessions });
        } catch (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
    }

    // Standardize category to Title Case for DB query (Men, Women, Kids)
    const catTitle = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();

    try {
        const teams = await Team.find({ category: catTitle })
            .populate('playersBought')
            .sort({ remainingBudget: -1 });
        return NextResponse.json({ teams });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    console.log('[API] POST /api/teams called');
    await dbConnect();
    console.log('[API] DB Connected');
    try {
        const body = await request.json();
        console.log('[API] Body received:', body);
        const { category, teams } = body;

        // teams: [{ name: 'A', totalBudget: 100 }, ...]

        if (!category || !teams || !Array.isArray(teams)) {
            return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
        }

        const catTitle = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();

        // Optional: Clear existing teams for this category to reset?
        // User logic: "enter number of teams... then button of start". 
        // This implies a fresh start or overwriting.
        // I will delete existing teams for this category to ensure clean state.
        await Team.deleteMany({ category: catTitle });

        const teamsToCreate = teams.map(t => ({
            name: t.name,
            totalBudget: t.totalBudget,
            remainingBudget: t.totalBudget, // Start full
            category: catTitle
        }));

        await Team.insertMany(teamsToCreate);

        return NextResponse.json({ success: true, count: teamsToCreate.length });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request) {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    if (!category) return NextResponse.json({ error: 'Category required' }, { status: 400 });

    const catTitle = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();

    try {
        await Team.deleteMany({ category: catTitle });

        // Dynamically import Player model to avoid circular dept issues if any
        const mongoose = (await import('mongoose')).default;
        // Make sure Player model is compiled
        await import('@/models/Player');
        const Player = mongoose.models.Player;

        if (Player) {
            await Player.deleteMany({ category: catTitle });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
