import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Team from '@/models/Team';
import Player from '@/models/Player';
import * as XLSX from 'xlsx';

export async function GET(request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category');

        if (!category) {
            return NextResponse.json({ error: 'Category is required' }, { status: 400 });
        }

        const teams = await Team.find({ category }).populate('playersBought');
        const rows = [];

        teams.forEach(team => {
            if (team.playersBought && team.playersBought.length > 0) {
                team.playersBought.forEach(player => {
                    rows.push({
                        'Team Name': team.name,
                        'Player Name': player.name || 'Unknown',
                        'Sold Price': player.soldPrice || 0,
                        'Category': category
                    });
                });
            } else {
                rows.push({
                    'Team Name': team.name,
                    'Player Name': 'No Players',
                    'Sold Price': 0,
                    'Category': category
                });
            }
        });

        // Even if empty, returns an empty sheet
        const worksheet = XLSX.utils.json_to_sheet(rows);
        const colWidths = [{ wch: 20 }, { wch: 20 }, { wch: 10 }, { wch: 10 }];
        worksheet['!cols'] = colWidths;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Auction Summary");

        const buf = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

        return new NextResponse(buf, {
            status: 200,
            headers: {
                'Content-Disposition': `attachment; filename="${category}_auction_list.xlsx"`,
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            },
        });
    } catch (error) {
        console.error('Export Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
