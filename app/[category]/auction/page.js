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

    const fetchTeams = async () => {
        const res = await fetch(`/api/teams?category=${category}`);
        const data = await res.json();
        if (data.teams) {
            setTeams(data.teams);
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

    const handleUndo = async () => {
        if (!lastSold || !lastSold.playerId) return;
        if (!confirm(`Are you sure you want to UNDO the sale of ${lastSold.name}? This will refund the team and remove the player.`)) return;

        setIsProcessing(true);
        const res = await fetch('/api/auction/undo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playerId: lastSold.playerId })
        });

        if (res.ok) {
            setLastSold(null);
            await fetchTeams();
        } else {
            alert('Undo failed');
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
                newAmount: Number(editAmount)
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

    const handleDownloadCSV = () => {
        // Headers: Team Name, Player Name, Sold Price, Category
        const headers = ['Team Name', 'Player Name', 'Price', 'Category'];
        const rows = [];

        teams.forEach(team => {
            if (team.playersBought && team.playersBought.length > 0) {
                team.playersBought.forEach(player => {
                    const pName = typeof player === 'object' ? player.name : 'Unknown';
                    const pPrice = typeof player === 'object' ? player.soldPrice : 0;
                    rows.push([team.name, pName, pPrice, category]);
                });
            } else {
                // Optional: Include teams with no players?
                rows.push([team.name, 'No Players', 0, category]);
            }
        });

        if (rows.length === 0) {
            alert("No players found to download.");
            return;
        }

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${category}_player_list.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDeleteAuction = async () => {
        if (!confirm('CRITICAL WARNING: This will DELETE all teams and players for this category permanently. Are you sure?')) return;

        await fetch(`/api/teams?category=${category}`, { method: 'DELETE' });
        router.push(`/${category}`);
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
                        <button onClick={handleDownloadCSV} className="btn-primary" style={{ width: '100%', fontSize: '1.2rem' }}>
                            Download Full Player List CSV 📥
                        </button>

                        <div style={{ margin: '2rem 0', borderTop: '1px solid var(--glass-border)' }}></div>

                        <button onClick={handleDeleteAuction} className="btn-secondary" style={{ width: '100%', borderColor: 'var(--danger)', color: 'var(--danger)' }}>
                            Delete Session & Exit 🗑️
                        </button>
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
                        <button onClick={() => router.push(`/${category}`)} className="btn-secondary" style={{ fontSize: '0.8rem' }}>Setup / Exit</button>
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

                {/* Activity Log */}
                {lastSold && (
                    <div className="glass-card animate-fade-in pulse-effect" style={{ marginTop: '2rem', background: 'rgba(16, 185, 129, 0.1)', borderColor: 'var(--success)' }}>
                        <div className="flex-between" style={{ alignItems: 'flex-start' }}>
                            <div>
                                <h3 style={{ color: 'var(--success)', margin: 0 }}>Last Sale</h3>
                                <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>Just Now</span>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                    onClick={() => {
                                        setEditName(lastSold.name);
                                        setEditAmount(lastSold.amount);
                                        setIsEditing(true);
                                    }}
                                    className="btn-secondary"
                                    style={{
                                        fontSize: '0.9rem',
                                        padding: '8px 16px',
                                        borderColor: 'var(--primary)',
                                        color: 'var(--primary)',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    Edit ✏️
                                </button>
                                <button
                                    onClick={handleUndo}
                                    className="btn-secondary"
                                    style={{
                                        fontSize: '0.9rem',
                                        padding: '8px 16px',
                                        background: 'rgba(239, 68, 68, 0.2)',
                                        borderColor: 'var(--danger)',
                                        color: '#fff',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    Undo Mistake ↩️
                                </button>
                            </div>
                        </div>
                        <p style={{ fontSize: '1.8rem', margin: '0.5rem 0', lineHeight: 1.2 }}>
                            <span style={{ color: 'white', fontWeight: 'bold' }}>{lastSold.name}</span> <br />
                            <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>sold to</span> <br />
                            <span className="text-gradient" style={{ fontWeight: 'bold' }}>{lastSold.team}</span>
                        </p>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--success)', marginTop: '0.5rem' }}>
                            ₹ {Number(lastSold.amount).toLocaleString()}
                        </div>
                    </div>
                )}
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
