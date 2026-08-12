/* ════════════════════════════════════════════════════
   ANALYTICS TRACKER — localStorage-based game metrics
   Tracks: sessions, completion rate, times, difficulty
   ════════════════════════════════════════════════════ */

const Analytics = (() => {
  const STORAGE_KEY = 'everyDropCounts_analytics';

  function getAnalytics() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {
      totalSessions: 0,
      completedSessions: 0,
      failedSessions: 0,
      byDifficulty: {
        easy: { plays: 0, completions: 0, totalTime: 0, times: [] },
        normal: { plays: 0, completions: 0, totalTime: 0, times: [] },
        hard: { plays: 0, completions: 0, totalTime: 0, times: [] }
      },
      sessions: [], // Array of individual session records
      startDate: new Date().toISOString()
    };
  }

  function saveAnalytics(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  return {
    // Called when game starts
    startSession(difficulty) {
      const analytics = getAnalytics();
      const session = {
        id: Date.now(),
        difficulty,
        startTime: new Date().toISOString(),
        completed: false,
        puzzleTime: 0,
        distM: 0,
        moves: 0
      };
      
      analytics.totalSessions++;
      analytics.byDifficulty[difficulty].plays++;
      analytics.sessions.unshift(session); // Most recent first
      
      // Keep only last 100 sessions to avoid bloating storage
      if (analytics.sessions.length > 100) {
        analytics.sessions.pop();
      }
      
      saveAnalytics(analytics);
      return session.id;
    },

    // Called when puzzle is completed/failed
    endSession(sessionId, completed, puzzleTime, distM, moves) {
      const analytics = getAnalytics();
      const session = analytics.sessions.find(s => s.id === sessionId);
      
      if (session) {
        session.completed = completed;
        session.puzzleTime = puzzleTime;
        session.distM = distM;
        session.moves = moves;
        session.endTime = new Date().toISOString();

        const diff = session.difficulty;
        if (completed) {
          analytics.completedSessions++;
          analytics.byDifficulty[diff].completions++;
          analytics.byDifficulty[diff].totalTime += puzzleTime;
        } else {
          analytics.failedSessions++;
        }
        
        analytics.byDifficulty[diff].times.push(puzzleTime);
        // Keep only last 50 times per difficulty
        if (analytics.byDifficulty[diff].times.length > 50) {
          analytics.byDifficulty[diff].times.shift();
        }
      }
      
      saveAnalytics(analytics);
    },

    // Get resume-ready stats
    getStats() {
      const analytics = getAnalytics();
      const stats = {
        totalPlays: analytics.totalSessions,
        totalCompleted: analytics.completedSessions,
        completionRate: analytics.totalSessions > 0 
          ? Math.round((analytics.completedSessions / analytics.totalSessions) * 100) 
          : 0,
        byDifficulty: {}
      };

      Object.keys(analytics.byDifficulty).forEach(diff => {
        const d = analytics.byDifficulty[diff];
        const avgTime = d.completions > 0 ? Math.round(d.totalTime / d.completions) : 0;
        const rate = d.plays > 0 ? Math.round((d.completions / d.plays) * 100) : 0;
        
        stats.byDifficulty[diff] = {
          plays: d.plays,
          completions: d.completions,
          completionRate: rate,
          averageTime: avgTime + 's',
          times: d.times.length > 0 ? d.times : []
        };
      });

      return stats;
    },

    // Get all raw analytics for export
    getAllData() {
      return getAnalytics();
    },

    // Export as JSON
    exportJSON() {
      const data = this.getAllData();
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `every-drop-counts-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    },

    // Export as CSV
    exportCSV() {
      const data = this.getAllData();
      const sessions = data.sessions;
      
      let csv = 'Date,Difficulty,Completed,Puzzle Time (s),Distance (m),Moves\n';
      sessions.forEach(s => {
        const date = new Date(s.startTime).toLocaleDateString();
        csv += `${date},${s.difficulty},${s.completed ? 'Yes' : 'No'},${s.puzzleTime},${s.distM},${s.moves}\n`;
      });
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `every-drop-counts-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    },

    // Clear all data
    clearData() {
      if (confirm('Are you sure you want to delete all analytics data?')) {
        localStorage.removeItem(STORAGE_KEY);
        return true;
      }
      return false;
    }
  };
})();
