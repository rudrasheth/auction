const mongoose = require('mongoose');
const XLSX = require('xlsx');
const path = require('path');

// Hardcoded URI to avoid dotenv dependency issues in this throwaway script
const MONGODB_URI = 'mongodb+srv://rudrasheth2201_db_user:P5WnRTxvKzD9Txe2@cluster0.smoeucz.mongodb.net/?appName=Cluster0';

const PlayerSchema = new mongoose.Schema({
    name: String,
    category: String,
    soldTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    soldPrice: Number
});

const TeamSchema = new mongoose.Schema({
    name: String,
    totalBudget: Number,
    remainingBudget: Number,
    category: String,
    playersBought: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }]
});

// Use existing models if defined, or define new ones
const Player = mongoose.models.Player || mongoose.model('Player', PlayerSchema);
const Team = mongoose.models.Team || mongoose.model('Team', TeamSchema);

async function generateExcel() {
    try {
        console.log('Connecting to DB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected.');

        const category = 'Men';
        const teams = await Team.find({ category }).populate('playersBought');

        console.log(`Found ${teams.length} teams for category ${category}`);

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

        if (rows.length === 0) {
            console.log('No data found to export.');
            return;
        }

        const worksheet = XLSX.utils.json_to_sheet(rows);
        const colWidths = [{ wch: 20 }, { wch: 20 }, { wch: 10 }, { wch: 10 }];
        worksheet['!cols'] = colWidths;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Auction Summary");

        // Save to the project root
        const outputPath = path.resolve('d:\\EBPL Auction', `${category}_auction_list_debug.xlsx`);
        XLSX.writeFile(workbook, outputPath);

        console.log(`Excel file successfully created at: ${outputPath}`);

    } catch (err) {
        console.error('Error generating Excel:', err);
    } finally {
        await mongoose.disconnect();
    }
}

generateExcel();
