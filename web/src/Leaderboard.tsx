/** @jsx React.createElement */
/** @jsxFrag React.Fragment */
import { supabase } from 'modules/utils/api';
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
    <td style={styles.td_small}>{row.final_timestamp}</td>
  </tr>
);

async function fetchLeaderboardData(contest_hashid: string): Promise<LeaderboardRow[]> {
  // Fetch leaderboard data from the server, using the supabase api
  /*
  CREATE OR REPLACE FUNCTION public.get_contest_leaderboard(
  p_contest_hashid text
)
RETURNS TABLE (
  player_id text,
  name text,
  levels_solved bigint,
  total_moves bigint,
  last_improvement_at timestamptz
)*/
  let {data, error} = await supabase
    .rpc('get_contest_leaderboard', { p_contest_hashid: contest_hashid });

    if (error) {
      console.error('Error fetching leaderboard data:', error);
      return [];
    }
    if (!data) {
      return [];
    }
    // Map data to LeaderboardRow[]
    return data.map((entry, index) => ({
      rank: index + 1,
      name: entry.name,
      levels_solved: Number(entry.levels_solved),
      total_moves: entry.total_moves.toString(),
      final_timestamp: new Date(entry.last_improvement_at).toLocaleString(),
    }));
}

interface LeaderboardProps {
  contest_hashid: string;
} 

export const Leaderboard: React.FC<LeaderboardProps> = ({contest_hashid}) => {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboardAndUpdate = async () => {
      try {
        const data = await fetchLeaderboardData(contest_hashid);
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
        <h1 style={styles.title}>Unflip EvolveUX Leaderboard</h1>
        
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
    maxWidth: '200px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    // whiteSpace: 'nowrap',


  } as React.CSSProperties,
  td_small: {
    padding: '12px',
    color: '#555',
    fontSize: '0.8em',

  } as React.CSSProperties,
};
