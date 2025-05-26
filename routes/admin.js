// routes/admin.js
// Admin dashboard for viewing user analytics and system stats

const express = require('express');
const router = express.Router();
const { logger } = require('../utils/enhancedLogger');

/**
 * Admin dashboard - HTML view of all analytics
 */
router.get('/dashboard', async (req, res) => {
    try {
        const analytics = await logger.getUsageAnalytics();
        const allUserStats = await logger.getAllUserStats();

        if (!analytics) {
            return res.status(500).send('Error loading analytics');
        }

        const dashboardHTML = `
<!DOCTYPE html>
<html>
<head>
    <title>AI-RIVU Admin Dashboard</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        * { box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; 
            margin: 0; padding: 20px; background: #f8f9fa; line-height: 1.6;
        }
        .container { max-width: 1400px; margin: 0 auto; }
        .header { background: white; padding: 30px; border-radius: 12px; margin-bottom: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header h1 { margin: 0 0 10px 0; color: #2c3e50; font-size: 2.5em; }
        .header p { color: #7f8c8d; margin: 0; font-size: 1.1em; }
        
        .stats-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); 
            gap: 20px; 
            margin-bottom: 30px; 
        }
        .stat-card { 
            background: white; 
            padding: 25px; 
            border-radius: 12px; 
            text-align: center; 
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            transition: transform 0.2s ease;
        }
        .stat-card:hover { transform: translateY(-2px); }
        .stat-number { 
            font-size: 2.8em; 
            font-weight: 700; 
            color: #3498db; 
            margin-bottom: 8px;
            display: block;
        }
        .stat-label { 
            color: #7f8c8d; 
            font-size: 0.95em; 
            text-transform: uppercase; 
            letter-spacing: 0.5px;
        }
        
        .card { 
            background: white; 
            padding: 30px; 
            margin: 20px 0; 
            border-radius: 12px; 
            box-shadow: 0 2px 8px rgba(0,0,0,0.1); 
        }
        .card h2 { 
            color: #2c3e50; 
            margin: 0 0 25px 0; 
            font-size: 1.8em;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
        }
        
        .usage-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); 
            gap: 30px; 
        }
        .usage-section h3 { 
            color: #34495e; 
            margin: 0 0 15px 0; 
            font-size: 1.3em;
        }
        .usage-item { 
            display: flex; 
            justify-content: space-between; 
            padding: 8px 0; 
            border-bottom: 1px solid #ecf0f1;
        }
        .usage-item:last-child { border-bottom: none; }
        .usage-name { color: #2c3e50; font-weight: 500; }
        .usage-count { 
            color: #3498db; 
            font-weight: 600; 
            background: #ebf3fd; 
            padding: 2px 8px; 
            border-radius: 12px; 
            font-size: 0.9em;
        }
        
        .user-table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 20px; 
            background: white;
        }
        .user-table th { 
            background: #34495e; 
            color: white; 
            padding: 15px 12px; 
            text-align: left; 
            font-weight: 600;
            text-transform: uppercase;
            font-size: 0.85em;
            letter-spacing: 0.5px;
        }
        .user-table td { 
            padding: 12px; 
            border-bottom: 1px solid #ecf0f1; 
        }
        .user-table tr:hover { background: #f8f9fa; }
        .active-user { 
            color: #27ae60; 
            font-weight: 600; 
            background: #d5f4e6; 
            padding: 4px 8px; 
            border-radius: 12px; 
            font-size: 0.85em;
        }
        .inactive-user { 
            color: #e74c3c; 
            font-weight: 600; 
            background: #fadbd8; 
            padding: 4px 8px; 
            border-radius: 12px; 
            font-size: 0.85em;
        }
        
        @media (max-width: 768px) {
            .container { padding: 10px; }
            .stats-grid { grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 15px; }
            .usage-grid { grid-template-columns: 1fr; }
            .user-table { font-size: 0.9em; }
            .user-table th, .user-table td { padding: 8px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>AI-RIVU Analytics</h1>
            <p>Last updated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <span class="stat-number">${analytics.totalUsers}</span>
                <div class="stat-label">Total Users</div>
            </div>
            <div class="stat-card">
                <span class="stat-number">${analytics.activeUsers}</span>
                <div class="stat-label">Active Users (7d)</div>
            </div>
            <div class="stat-card">
                <span class="stat-number">${analytics.totalPapersGenerated}</span>
                <div class="stat-label">Papers Generated</div>
            </div>
            <div class="stat-card">
                <span class="stat-number">${analytics.totalDownloads}</span>
                <div class="stat-label">Downloads</div>
            </div>
            <div class="stat-card">
                <span class="stat-number">${analytics.totalLogins}</span>
                <div class="stat-label">Total Logins</div>
            </div>
            <div class="stat-card">
                <span class="stat-number">${analytics.downloadRate}%</span>
                <div class="stat-label">Download Rate</div>
            </div>
        </div>

        <div class="card">
            <h2>Usage Patterns</h2>
            <div class="usage-grid">
                <div class="usage-section">
                    <h3>Popular Subjects</h3>
                    ${Object.entries(analytics.popularSubjects)
                        .sort(([,a], [,b]) => b - a)
                        .slice(0, 8)
                        .map(([subject, count]) => `
                            <div class="usage-item">
                                <span class="usage-name">${subject}</span>
                                <span class="usage-count">${count}</span>
                            </div>
                        `).join('') || '<div class="usage-item"><span class="usage-name">No data yet</span></div>'}
                </div>
                <div class="usage-section">
                    <h3>Popular Classes</h3>
                    ${Object.entries(analytics.popularClasses)
                        .sort(([,a], [,b]) => b - a)
                        .slice(0, 8)
                        .map(([className, count]) => `
                            <div class="usage-item">
                                <span class="usage-name">Class ${className}</span>
                                <span class="usage-count">${count}</span>
                            </div>
                        `).join('') || '<div class="usage-item"><span class="usage-name">No data yet</span></div>'}
                </div>
            </div>
        </div>

        <div class="card">
            <h2>User Activity Details</h2>
            <div style="overflow-x: auto;">
                <table class="user-table">
                    <thead>
                        <tr>
                            <th>User Email</th>
                            <th>Papers</th>
                            <th>Downloads</th>
                            <th>Logins</th>
                            <th>Tokens Used</th>
                            <th>Last Activity</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.entries(allUserStats)
                            .sort(([,a], [,b]) => new Date(b.lastActivity) - new Date(a.lastActivity))
                            .map(([email, stats]) => {
                                const isActive = new Date(stats.lastActivity) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                                const lastActivity = new Date(stats.lastActivity).toLocaleDateString('en-IN');
                                return `
                                    <tr>
                                        <td>${email}</td>
                                        <td>${stats.totalPapersGenerated || 0}</td>
                                        <td>${stats.totalDownloads || 0}</td>
                                        <td>${stats.totalLogins || 0}</td>
                                        <td>${stats.tokensUsed || 0}</td>
                                        <td>${lastActivity}</td>
                                        <td>
                                            <span class="${isActive ? 'active-user' : 'inactive-user'}">
                                                ${isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                    </tr>
                                `;
                            }).join('') || '<tr><td colspan="7" style="text-align: center; color: #7f8c8d;">No users yet</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</body>
</html>`;

        res.send(dashboardHTML);
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).send(`
            <h1>Dashboard Error</h1>
            <p>Error loading dashboard: ${error.message}</p>
            <p><a href="/admin/dashboard">Try again</a></p>
        `);
    }
});

/**
 * API endpoint for getting user stats (for potential frontend integration)
 */
router.get('/api/user-stats/:email', async (req, res) => {
    try {
        const userStats = await logger.getUserStats(req.params.email);
        res.json(userStats || { message: 'User not found' });
    } catch (error) {
        console.error('User stats error:', error);
        res.status(500).json({ error: 'Failed to get user stats' });
    }
});

/**
 * API endpoint for getting usage analytics
 */
router.get('/api/analytics', async (req, res) => {
    try {
        const analytics = await logger.getUsageAnalytics();
        res.json(analytics);
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ error: 'Failed to get analytics' });
    }
});

module.exports = router;
