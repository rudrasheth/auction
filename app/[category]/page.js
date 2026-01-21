'use client';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';

export default function SetupPage({ params }) {
    const { category } = use(params);
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [existingTeams, setExistingTeams] = useState([]);

    // Form State
    const [numTeams, setNumTeams] = useState('');
    const [budget, setBudget] = useState('');
    const [teamNames, setTeamNames] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        // Check for existing session
        fetch(`/api/teams?category=${category}`)
            .then(res => res.json())
            .then(data => {
                if (data.teams) {
                    setExistingTeams(data.teams);
                }
                setLoading(false);
            })
            .catch(err => setLoading(false));
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

    const startAuction = async () => {
        setIsSubmitting(true);
        const teamsPayload = teamNames.map(name => ({
            name: name || `Team ${Math.random().toString(36).substr(2, 5)}`,
            totalBudget: Number(budget)
        }));

        const res = await fetch('/api/teams', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category, teams: teamsPayload })
        });

        if (res.ok) {
            router.push(`/${category}/auction`);
        } else {
            alert('Failed to setup');
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

            {existingTeams.length > 0 && (
                <div className="glass-card" style={{ marginBottom: '2rem', border: '1px solid var(--secondary)' }}>
                    <h3 className="text-gradient">Active Session Found</h3>
                    <p>There is an ongoing auction with {existingTeams.length} teams.</p>
                    <button
                        onClick={() => router.push(`/${category}/auction`)}
                        className="btn-primary"
                        style={{ marginTop: '1rem', width: '100%' }}
                    >
                        Continue Auction &rarr;
                    </button>
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
