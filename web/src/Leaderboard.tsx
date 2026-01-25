/** @jsx React.createElement */
/** @jsxFrag React.Fragment */
import React, { useState, useEffect } from 'react';

interface LeaderboardEntry {
  rank: number;
  username: string;
  score: number;
  time?: string;
}

export const Leaderboard: React.FC = () => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch leaderboard data
    const fetchLeaderboard = async () => {
      try {
        // Replace with actual API call when available
        // const response = await fetch('/api/leaderboard');
        // const data = await response.json();
        // setEntries(data);

        // Mock data for now
        setEntries([
          { rank: 1, username: 'Player1', score: 9999, time: '2 hours ago' },
          { rank: 2, username: 'Player2', score: 9500, time: '3 hours ago' },
          { rank: 3, username: 'Player3', score: 9200, time: '1 day ago' },
          { rank: 4, username: 'Player4', score: 8800, time: '2 days ago' },
          { rank: 5, username: 'Player5', score: 8500, time: '3 days ago' },
        ]);
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <h1 style={styles.title}>Leaderboard</h1>
        
        {loading ? (
          <div style={styles.loading}>Loading...</div>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead style={styles.thead}>
                <tr>
                  <th style={styles.th}>Rank</th>
                  <th style={styles.th}>Player</th>
                  <th style={styles.th}>Score</th>
                  <th style={styles.th}>Time</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.rank} style={styles.tr}>
                    <td style={styles.td}>{entry.rank}</td>
                    <td style={styles.td}>{entry.username}</td>
                    <td style={styles.td}>{entry.score.toLocaleString()}</td>
                    <td style={styles.td}>{entry.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    padding: '20px',
    fontFamily: 'SourceSans3, sans-serif',
  } as React.CSSProperties,
  content: {
    maxWidth: '800px',
    margin: '0 auto',
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '40px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  } as React.CSSProperties,
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    marginBottom: '30px',
    textAlign: 'center',
    color: '#333',
  } as React.CSSProperties,
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '18px',
    color: '#666',
  } as React.CSSProperties,
  tableWrapper: {
    overflowX: 'auto',
  } as React.CSSProperties,
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '20px',
  } as React.CSSProperties,
  thead: {
    backgroundColor: '#f0f0f0',
    borderBottom: '2px solid #ddd',
  } as React.CSSProperties,
  th: {
    padding: '12px',
    textAlign: 'left' as const,
    fontWeight: 'bold',
    color: '#333',
  } as React.CSSProperties,
  tr: {
    borderBottom: '1px solid #eee',
    ':hover': {
      backgroundColor: '#f9f9f9',
    }
  } as React.CSSProperties,
  td: {
    padding: '12px',
    color: '#555',
  } as React.CSSProperties,
};
