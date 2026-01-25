/** @jsx React.createElement */
/** @jsxFrag React.Fragment */
import React, { useState, useEffect } from 'react';

interface LeaderboardRow {
  rank: number;
  name: string;
  levels_solved: number;
  total_moves: string;
  final_timestamp: string;
}

interface LeaderboardTableRowProps {
  row: LeaderboardRow;
  styles: Record<string, React.CSSProperties>;
}

const LeaderboardTableRow: React.FC<LeaderboardTableRowProps> = ({ row, styles }) => (
  <tr key={row.rank} style={styles.tr}>
    <td style={styles.td}>{row.rank}</td>
    <td style={styles.td}>{row.name}</td>
    <td style={styles.td}>{row.levels_solved}</td>
    <td style={styles.td}>{row.total_moves}</td>
    <td style={styles.td}>{row.final_timestamp}</td>
  </tr>
);

function fetchLeaderboardData(): Promise<LeaderboardRow[]> {
  // This function should fetch data from an API endpoint.
  // Here we return mock data for demonstration purposes.
  return Promise.resolve([
    { rank: 1, name: 'Alice', levels_solved: 10, total_moves: '150', final_timestamp: '00:25:30' },
    { rank: 2, name: 'Bob', levels_solved: 9, total_moves: '160', final_timestamp: '00:30:45' },
    { rank: 3, name: 'Charlie', levels_solved: 8, total_moves: '170', final_timestamp: '00:35:20' },
  ]);
}

export const Leaderboard: React.FC = () => {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboardAndUpdate = async () => {
      try {
        const data = await fetchLeaderboardData();
        setRows(data);
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
      } finally {
        setLoading(false);
      }
    };
    const id = setInterval(fetchLeaderboardAndUpdate, 500);
    return () => clearInterval(id);
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
                    <th style={styles.th}>Levels Solved</th>
                    <th style={styles.th}>Total Moves</th>
                    <th style={styles.th}>Final Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <LeaderboardTableRow key={row.rank} row={row} styles={styles} />
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
