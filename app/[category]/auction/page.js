'use client';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';

export default function AuctionRoom({ params }) {
    const { category } = use(params);
    const router = useRouter();

    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);

    // Auction State
    const [playerName, setPlayerName] = useState('');
    const [bidAmount, setBidAmount] = useState('');
    const [selectedTeam, setSelectedTeam] = useState('');
    const [lastSold, setLastSold] = useState(null); // { name, amount, team, playerId }
    const [isProcessing, setIsProcessing] = useState(false);
    const [finished, setFinished] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [editAmount, setEditAmount] = useState('');
    const [editTeam, setEditTeam] = useState('');

    const fetchTeams = async () => {
        try {
            console.log('[Auction] Fetching teams for category:', category);
            const res = await fetch(`/api/teams?category=${category}`);
            const data = await res.json();
            console.log('[Auction] Teams data received:', data);

            if (res.ok && data.teams) {
                setTeams(data.teams);
            } else {
                console.error('[Auction] Failed to fetch teams:', data.error);
                // alert('Failed to load teams: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('[Auction] Error fetching teams:', error);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchTeams();
    }, [category]);

    const handleSell = async () => {
        if (!playerName || !bidAmount || !selectedTeam) {
            alert('Please fill all fields');
            return;
        }

        setIsProcessing(true);
        const res = await fetch('/api/auction/sell', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                playerName,
                amount: Number(bidAmount),
                teamId: selectedTeam,
                category
            })
        });

        const data = await res.json();
        if (res.ok) {
            // Success
            setLastSold({
                name: playerName,
                amount: bidAmount,
                team: teams.find(t => t._id === selectedTeam)?.name,
                playerId: data.player._id
            });
            setPlayerName('');
            setBidAmount('');
            setSelectedTeam('');
            await fetchTeams(); // Refresh budget
        } else {
            alert(data.error);
        }
        setIsProcessing(false);
    };



    const handleSaveEdit = async () => {
        if (!editName || !editAmount) return;

        setIsProcessing(true);
        const res = await fetch('/api/auction/edit', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                playerId: lastSold.playerId,
                newName: editName,
                newAmount: Number(editAmount),
                newTeamId: editTeam // Send new Team ID
            })
        });

        const data = await res.json();
        if (res.ok) {
            setLastSold(prev => ({ ...prev, name: editName, amount: editAmount }));
            setIsEditing(false);
            await fetchTeams();
        } else {
            alert(data.error);
        }
        setIsProcessing(false);
    };

    const handleDownloadExcel = async () => {
        // Dynamic import to include xlsx only when needed
        const XLSX = (await import('xlsx'));

        const rows = [];

        // Arrange data team-wise
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
                // Include teams with no players to show they participated
                rows.push({
                    'Team Name': team.name,
                    'Player Name': 'No Players',
                    'Sold Price': 0,
                    'Category': category
                });
            }
        });

        if (rows.length === 0) {
            alert("No data to export.");
            return;
        }

        // Create Worksheet
        const worksheet = XLSX.utils.json_to_sheet(rows);

        // Auto-adjust column width (approximate)
        const colWidths = [{ wch: 20 }, { wch: 20 }, { wch: 10 }, { wch: 10 }];
        worksheet['!cols'] = colWidths;

        // Create Workbook
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Auction Summary");

        // Write and Download
        XLSX.writeFile(workbook, `${category}_auction_list.xlsx`);
    };



    if (loading) return <div className="flex-center" style={{ height: '100vh' }}>Loading Auction...</div>;

    if (finished) {
        return (
            <div className="container flex-center" style={{ height: '100vh', flexDirection: 'column' }}>
                <div className="glass-card animate-fade-in" style={{ textAlign: 'center', maxWidth: '600px', width: '100%', borderColor: 'var(--primary)' }}>
                    <h1 className="text-gradient">Auction Complete</h1>
                    <p style={{ fontSize: '1.2rem', marginBottom: '2rem', color: 'var(--text-muted)' }}>
                        The {category} auction session has been concluded.
                    </p>

                    <div className="col">
                        <button onClick={handleDownloadExcel} className="btn-primary" style={{ width: '100%', fontSize: '1.2rem' }}>
                            Download Full Player List Excel �
                        </button>

                        <div style={{ margin: '2rem 0', borderTop: '1px solid var(--glass-border)' }}></div>


                        <button onClick={() => setFinished(false)} className="btn-secondary" style={{ width: '100%' }}>
                            Return to Auction Room
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container" style={{ maxWidth: '1400px', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 350px', gap: '2rem', height: '90vh' }}>

            {/* Main Stage */}
            <div className="col" style={{ justifyContent: 'center' }}>
                <div className="flex-between">
                    <h1 className="text-gradient" style={{ textTransform: 'capitalize' }}>{category} Auction Live</h1>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button onClick={() => setFinished(true)} className="btn-secondary" style={{ background: 'var(--primary)', color: '#000', fontWeight: 'bold', border: 'none' }}>
                            Finish Auction
                        </button>
                        <button onClick={() => router.push(`/${category}`)} className="btn-secondary" style={{ fontSize: '0.8rem' }}>Back to Auction Table</button>
                    </div>
                </div>

                {/* Auctioneer Podium */}
                <div className="glass-card animate-fade-in" style={{ padding: '3rem', border: '1px solid rgba(245, 158, 11, 0.3)', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '5px', background: 'linear-gradient(90deg, var(--primary), var(--secondary))' }}></div>
                    <h2 style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '2.5rem', textTransform: 'uppercase', letterSpacing: '0.1em' }} className="text-gradient">
                        Current Player
                    </h2>

                    <div className="col" style={{ gap: '1.5rem' }}>
                        <div>
                            <label style={{ fontSize: '1.1rem' }}>Player Name</label>
                            <input
                                value={playerName}
                                onChange={(e) => setPlayerName(e.target.value)}
                                placeholder="Enter Player Name..."
                                style={{ fontSize: '1.8rem', padding: '1rem', fontWeight: 'bold' }}
                            />
                        </div>

                        <div className="grid-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
                            <div>
                                <label style={{ fontSize: '1.1rem' }}>Winning Bid</label>
                                <input
                                    type="number"
                                    value={bidAmount}
                                    onChange={(e) => setBidAmount(e.target.value)}
                                    placeholder="Amount"
                                    style={{ fontSize: '1.8rem', padding: '1rem', color: 'var(--primary)', fontWeight: 'bold' }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '1.1rem' }}>Sold To</label>
                                <select
                                    value={selectedTeam}
                                    onChange={(e) => setSelectedTeam(e.target.value)}
                                    style={{ fontSize: '1.3rem', padding: '1rem', height: '100%' }}
                                >
                                    <option value="">Select Team</option>
                                    {teams.map(t => (
                                        <option key={t._id} value={t._id} disabled={t.remainingBudget < (Number(bidAmount) || 0)}>
                                            {t.name} (Budget: {t.remainingBudget.toLocaleString()})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <button
                            onClick={handleSell}
                            className="btn-primary"
                            disabled={isProcessing}
                            style={{ fontSize: '1.5rem', marginTop: '1rem', padding: '1.5rem', width: '100%' }}
                        >
                            {isProcessing ? 'Processing Sale...' : 'SOLD! 🔨'}
                        </button>
                    </div>
                </div>

                {/* Activity Log / Auction History */}
                <div className="glass-card" style={{ marginTop: '2rem', maxHeight: '400px', overflowY: 'auto' }}>
                    <h3 className="text-gradient" style={{ marginBottom: '1rem', position: 'sticky', top: 0, background: 'var(--background)', zIndex: 1, paddingBottom: '0.5rem', borderBottom: '1px solid var(--glass-border)' }}>
                        Auction Log
                    </h3>

                    {teams.flatMap(t => t.playersBought.map(p => ({ ...p, teamName: t.name })))
                        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
                        .map((player, idx) => (
                            <div key={player._id} className="animate-fade-in" style={{
                                padding: '1rem',
                                background: idx === 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.03)',
                                borderLeft: `4px solid ${idx === 0 ? 'var(--success)' : 'var(--text-muted)'}`,
                                marginBottom: '0.8rem',
                                borderRadius: '4px'
                            }}>
                                <div className="flex-between">
                                    <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{player.name}</span>
                                    <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>₹ {player.soldPrice?.toLocaleString()}</span>
                                </div>
                                <div className="flex-between" style={{ marginTop: '0.4rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                    <span>Sold to <strong style={{ color: 'var(--secondary)' }}>{player.teamName}</strong></span>
                                    <span>{new Date(player.updatedAt).toLocaleTimeString()}</span>
                                </div>
                                {idx === 0 && (
                                    <div style={{ marginTop: '0.8rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                        <button
                                            onClick={() => {
                                                setLastSold({ name: player.name, amount: player.soldPrice, team: player.teamName, playerId: player._id });
                                                setEditName(player.name);
                                                setEditAmount(player.soldPrice);
                                                setIsEditing(true);
                                            }}
                                            className="btn-secondary"
                                            style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                                        >
                                            Edit ✏️
                                        </button>

                                    </div>
                                )}
                            </div>
                        ))}

                    {teams.every(t => t.playersBought.length === 0) && (
                        <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No players sold yet.</p>
                    )}
                </div>
            </div>

            {/* Leaderboard / Team Tracker */}
            <div className="glass-card" style={{ overflowY: 'auto', maxHeight: '100%' }}>
                <h2 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem', marginBottom: '1rem' }}>Team Standings</h2>
                <div className="col">
                    {teams.sort((a, b) => b.remainingBudget - a.remainingBudget).map((team, idx) => (
                        <div key={team._id} style={{
                            padding: '1rem',
                            background: 'rgba(255,255,255,0.03)',
                            borderRadius: '8px',
                            borderLeft: `4px solid ${idx === 0 ? 'var(--primary)' : 'var(--text-muted)'}`
                        }}>
                            <div className="flex-between">
                                <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{team.name}</span>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{team.playersBought?.length || 0} Players</span>
                            </div>
                            <div style={{ marginTop: '0.5rem', fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--success)' }}>
                                {team.remainingBudget.toLocaleString()}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                Total: {team.totalBudget.toLocaleString()}
                            </div>
                        </div>
                    ))}
                </div>
            </div>


            {/* Edit Modal */}
            {
                isEditing && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)',
                        zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <div className="glass-card animate-fade-in" style={{ width: '90%', maxWidth: '500px', padding: '2rem' }}>
                            <h2 className="text-gradient" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Edit Detail</h2>

                            <div className="col" style={{ gap: '1rem' }}>
                                <div>
                                    <label>Correct Name</label>
                                    <input
                                        value={editName}
                                        onChange={e => setEditName(e.target.value)}
                                        style={{ width: '100%', padding: '1rem', fontSize: '1.2rem', marginTop: '0.5rem' }}
                                    />
                                </div>
                                <div>
                                    <label>Correct Price</label>
                                    <input
                                        type="number"
                                        value={editAmount}
                                        onChange={e => setEditAmount(e.target.value)}
                                        style={{ width: '100%', padding: '1rem', fontSize: '1.2rem', marginTop: '0.5rem' }}
                                    />
                                </div>
                                <div>
                                    <label>Correct Team</label>
                                    <select
                                        value={editTeam}
                                        onChange={e => setEditTeam(e.target.value)}
                                        style={{ width: '100%', padding: '1rem', fontSize: '1.2rem', marginTop: '0.5rem' }}
                                    >
                                        {teams.map(t => (
                                            <option key={t._id} value={t._id}>
                                                {t.name} (Rem: {t.remainingBudget})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex-between" style={{ marginTop: '1rem' }}>
                                    <button onClick={() => setIsEditing(false)} className="btn-secondary" style={{ width: '48%' }}>Cancel</button>
                                    <button onClick={handleSaveEdit} className="btn-primary" style={{ width: '48%' }} disabled={isProcessing}>
                                        {isProcessing ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
