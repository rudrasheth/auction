const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Define minimal schemas
const TeamSchema = new mongoose.Schema({
    name: String,
    category: String,
    totalBudget: Number,
}, { strict: false });

const Team = mongoose.models.Team || mongoose.model('Team', TeamSchema);

// Hardcoded URI if dotenv fails (using the one from verified .env.local)
const MONGODB_URI = 'mongodb+srv://rudrasheth2201_db_user:P5WnRTxvKzD9Txe2@cluster0.smoeucz.mongodb.net/?appName=Cluster0';

async function testSessions() {
    try {
        console.log('Connecting to DB...');
        await mongoose.connect(MONGODB_URI);

        console.log('--- Step 1: Create Men Session ---');
        // Clear Men
        await Team.deleteMany({ category: 'Men' });
        // Create Men Teams
        await Team.create([
            { name: 'Men Team 1', category: 'Men' },
            { name: 'Men Team 2', category: 'Men' }
        ]);
        const menCount1 = await Team.countDocuments({ category: 'Men' });
        console.log(`Men Count: ${menCount1}`);

        console.log('--- Step 2: Create Women Session ---');
        // Clear Women
        await Team.deleteMany({ category: 'Women' });
        // Create Women Teams
        await Team.create([
            { name: 'Women Team 1', category: 'Women' },
            { name: 'Women Team 2', category: 'Women' },
            { name: 'Women Team 3', category: 'Women' }
        ]);
        const womenCount1 = await Team.countDocuments({ category: 'Women' });
        console.log(`Women Count: ${womenCount1}`);

        console.log('--- Step 3: Verify Men Session Still Exists ---');
        const menCount2 = await Team.countDocuments({ category: 'Men' });
        console.log(`Men Count After Women Creation: ${menCount2}`);

        if (menCount1 === menCount2) {
            console.log('SUCCESS: Men session persisted.');
        } else {
            console.log('FAILURE: Men session was deleted or modified!');
        }

    } catch (err) {
        console.error('Test Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

testSessions();
