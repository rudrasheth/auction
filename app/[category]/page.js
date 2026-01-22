'use client';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';

export default function SetupPage({ params }) {
    const { category } = use(params);
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [existingTeams, setExistingTeams] = useState([]); // This will now hold teams for current category
    const [activeSessions, setActiveSessions] = useState([]); // All active sessions summary

    // Form State
    const [numTeams, setNumTeams] = useState('');
    const [budget, setBudget] = useState('');
    const [teamNames, setTeamNames] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        // Fetch current category teams
        const fetchCurrent = fetch(`/api/teams?category=${category}`).then(res => res.json());
        // Fetch all active sessions summary
        const fetchAll = fetch(`/api/teams`).then(res => res.json());

        Promise.all([fetchCurrent, fetchAll])
            .then(([currentData, allData]) => {
                if (currentData.teams) {
                    setExistingTeams(currentData.teams);
                }
                if (allData.sessions) {
                    setActiveSessions(allData.sessions);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [category]);

    const handleNumChange = (e) => {
        const n = parseInt(e.target.value) || 0;
        setNumTeams(n);
        // Preserve existing names if growing, slice if shrinking
        setTeamNames(prev => {
            const newArr = [...prev];
            if (n > newArr.length) {
                while (newArr.length < n) newArr.push('');
            } else {
                newArr.splice(n);
            }
            return newArr;
        });
    };

    const updateName = (idx, val) => {
        const newNames = [...teamNames];
        newNames[idx] = val;
        setTeamNames(newNames);
    };

    const handleDeleteSession = async (targetCategory) => {
        if (!confirm(`Are you sure you want to DELETE the ${targetCategory} session? This will remove all teams and sold players permanently.`)) return;

        setLoading(true);
        try {
            const res = await fetch(`/api/teams?category=${targetCategory}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                if (targetCategory.toLowerCase() === category.toLowerCase()) {
                    setExistingTeams([]);
                }
                // Refresh active sessions
                const refresh = await fetch('/api/teams').then(r => r.json());
                if (refresh.sessions) setActiveSessions(refresh.sessions);

                alert('Session deleted successfully.');
            } else {
                alert('Failed to delete session.');
            }
        } catch (error) {
            console.error('Error deleting session:', error);
            alert('Error deleting session.');
        }
        setLoading(false);
    };

    const startAuction = async () => {
        setIsSubmitting(true);
        const teamsPayload = teamNames.map(name => ({
            name: name || `Team ${Math.random().toString(36).substr(2, 5)}`,
            totalBudget: Number(budget)
        }));

        try {
            const res = await fetch('/api/teams', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ category, teams: teamsPayload })
            });

            if (res.ok) {
                router.push(`/${category}/auction`);
            } else {
                const text = await res.text();
                try {
                    const data = JSON.parse(text);
                    alert(`Failed to setup: ${data.error || 'Unknown error'}`);
                } catch (e) {
                    console.error('Failed to parse error response:', text);
                    alert(`Failed to setup: Server returned ${res.status} ${res.statusText}. Check server logs.`);
                }
                setIsSubmitting(false);
            }
        } catch (error) {
            console.error('Error starting auction:', error);
            alert('Failed to setup: Network or Server Error. Check if the server is running and accessible.');
            setIsSubmitting(false);
        }
    };



    if (loading) return (
        <div className="flex-center" style={{ height: '100vh' }}>
            <h2 className="animate-fade-in">Loading System...</h2>
        </div>
    );

    return (
        <div className="container animate-fade-in">
            <div className="flex-between" style={{ marginBottom: '2rem' }}>
                <h1 style={{ textTransform: 'capitalize' }}>{category} Auction Setup</h1>
                <button onClick={() => router.push('/')} className="btn-secondary">Back to Home</button>
            </div>

            {activeSessions.length > 0 && (
                <div className="glass-card" style={{ marginBottom: '2rem', border: '1px solid var(--secondary)' }}>
                    <h3 className="text-gradient">Active Sessions Found</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                        {activeSessions
                            .filter(session => session._id.toLowerCase() === category.toLowerCase())
                            .map((session, idx) => (
                                <div key={idx} style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                                    <h4 style={{ textTransform: 'capitalize', marginBottom: '0.5rem' }}>{session._id} Auction</h4>
                                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{session.count} Teams Active</p>
                                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                                        <button
                                            onClick={() => router.push(`/${session._id.toLowerCase()}/auction`)}
                                            className="btn-primary"
                                            style={{ flex: 1, fontSize: '0.9rem' }}
                                        >
                                            Continue &rarr;
                                        </button>
                                        <button
                                            onClick={() => handleDeleteSession(session._id)}
                                            className="btn-secondary"
                                            style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', borderColor: '#ef4444', padding: '0.5rem' }}
                                            title="Delete Session"
                                        >
                                            &#10005;
                                        </button>
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
            )}

            <div className="glass-card">
                <h2>{existingTeams.length > 0 ? 'Start New Session' : 'Configure Session'}</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
                    {existingTeams.length > 0 ? 'Warning: This will clear the current session.' : 'Enter details to initialize the auction.'}
                </p>

                <div className="grid-3" style={{ marginBottom: '2rem' }}>
                    <div className="col">
                        <label>Number of Teams</label>
                        <input
                            type="number"
                            placeholder="e.g. 5"
                            value={numTeams}
                            onChange={handleNumChange}
                        />
                    </div>
                    <div className="col">
                        <label>Total Budget per Team</label>
                        <input
                            type="number"
                            placeholder="e.g. 10000000"
                            value={budget}
                            onChange={(e) => setBudget(e.target.value)}
                        />
                    </div>
                </div>

                {numTeams > 0 && (
                    <div style={{ marginBottom: '2rem' }}>
                        <label>Team Names</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                            {Array.from({ length: numTeams }).map((_, i) => (
                                <input
                                    key={i}
                                    placeholder={`Team ${i + 1} Name`}
                                    value={teamNames[i]}
                                    onChange={(e) => updateName(i, e.target.value)}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {numTeams > 0 && budget > 0 && (
                    <button
                        className="btn-primary"
                        style={{ width: '100%', fontSize: '1.2rem' }}
                        onClick={startAuction}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Initializing...' : 'Start Auction'}
                    </button>
                )}
            </div>
        </div>
    );
}
