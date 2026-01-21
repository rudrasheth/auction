import Link from 'next/link';

export default function Home() {
  const categories = ['Men', 'Women', 'Kids'];

  return (
    <main className="container flex-center" style={{ minHeight: '100vh', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
      <div className="animate-float" style={{ textAlign: 'center', marginBottom: '6rem' }}>
        <h1 className="animate-fade-in" style={{ fontSize: '5rem', marginBottom: '0.5rem', lineHeight: 1 }}>
          <span className="text-gradient">Premier</span> <br />
          <span className="text-gradient-purple">Auction League</span>
        </h1>
        <p className="animate-fade-in stagger-1" style={{ fontSize: '1.5rem', color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto', marginTop: '2rem' }}>
          The ultimate professional bidding platform. <br /> Select a category to begin the auction.
        </p>
      </div>

      <div className="grid-3 animate-fade-in stagger-2" style={{ width: '100%', maxWidth: '1200px' }}>
        {categories.map((cat, idx) => (
          <Link href={`/${cat.toLowerCase()}`} key={cat} style={{ textDecoration: 'none', animationDelay: `${0.2 + (idx * 0.1)}s` }}>
            <div className="glass-card flex-center animate-fade-in" style={{ height: '320px', flexDirection: 'column', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
              <div style={{
                position: 'absolute', top: '-50%', left: '-50%', width: '200%', height: '200%',
                background: `radial-gradient(circle at center, ${idx === 1 ? 'rgba(139, 92, 246, 0.15)' : 'rgba(245, 158, 11, 0.15)'}, transparent 60%)`,
                zIndex: -1,
                opacity: 0.6
              }} />
              <h2 className={idx === 1 ? "text-gradient-purple" : "text-gradient"} style={{ fontSize: '3rem', marginBottom: '1rem' }}>{cat}</h2>
              <span className="btn-secondary" style={{ marginTop: 'auto', width: '80%', textAlign: 'center' }}>Enter Arena &rarr;</span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
