// routes/admin.js - Enhanced version with detailed analytics
const express = require('express');
const router = express.Router();
const { logger } = require('../utils/enhancedLogger');

/**
 * Enhanced Admin dashboard with detailed question analytics
 */
router.get('/dashboard', async (req, res) => {
    try {
        const analytics = await logger.getUsageAnalytics();
        const allUserStats = await logger.getAllUserStats();
        const detailedLogs = await logger.getDetailedActivityLogs(); // New method

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
            margin: 0; padding: 10px; background: #f8f9fa; line-height: 1.6;
        }
        .container { max-width: 1400px; margin: 0 auto; }
        .header { 
            background: white; padding: 20px; border-radius: 12px; 
            margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); 
        }
        .header h1 { margin: 0 0 10px 0; color: #2c3e50; font-size: 2em; }
        .header p { color: #7f8c8d; margin: 0; font-size: 1em; }
        
        .stats-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
            gap: 15px; 
            margin-bottom: 20px; 
        }
        .stat-card { 
            background: white; 
            padding: 20px; 
            border-radius: 12px; 
            text-align: center; 
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            transition: transform 0.2s ease;
        }
        .stat-card:hover { transform: translateY(-2px); }
        .stat-number { 
            font-size: 2.2em; 
            font-weight: 700; 
            color: #3498db; 
            margin-bottom: 5px;
            display: block;
        }
        .stat-label { 
            color: #7f8c8d; 
            font-size: 0.85em; 
            text-transform: uppercase; 
            letter-spacing: 0.5px;
        }
        
        .card { 
            background: white; 
            padding: 20px; 
            margin: 15px 0; 
            border-radius: 12px; 
            box-shadow: 0 2px 8px rgba(0,0,0,0.1); 
        }
        .card h2 { 
            color: #2c3e50; 
            margin: 0 0 20px 0; 
            font-size: 1.5em;
            border-bottom: 3px solid #3498db;
            padding-bottom: 8px;
        }
        
        .usage-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
            gap: 20px; 
        }
        .usage-section h3 { 
            color: #34495e; 
            margin: 0 0 15px 0; 
            font-size: 1.2em;
        }
        .usage-item { 
            display: flex; 
            justify-content: space-between; 
            padding: 6px 0; 
            border-bottom: 1px solid #ecf0f1;
            font-size: 0.9em;
        }
        .usage-item:last-child { border-bottom: none; }
        .usage-name { color: #2c3e50; font-weight: 500; }
        .usage-count { 
            color: #3498db; 
            font-weight: 600; 
            background: #ebf3fd; 
            padding: 2px 6px; 
            border-radius: 8px; 
            font-size: 0.85em;
        }
        
        .activity-table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 15px; 
            background: white;
            font-size: 0.85em;
        }
        .activity-table th { 
            background: #34495e; 
            color: white; 
            padding: 10px 8px; 
            text-align: left; 
            font-weight: 600;
            text-transform: uppercase;
            font-size: 0.75em;
            letter-spacing: 0.5px;
        }
        .activity-table td { 
            padding: 8px; 
            border-bottom: 1px solid #ecf0f1; 
            vertical-align: top;
        }
        .activity-table tr:hover { background: #f8f9fa; }
        .active-user { 
            color: #27ae60; 
            font-weight: 600; 
            background: #d5f4e6; 
            padding: 2px 6px; 
            border-radius: 8px; 
            font-size: 0.8em;
        }
        .inactive-user { 
            color: #e74c3c; 
            font-weight: 600; 
            background: #fadbd8; 
            padding: 2px 6px; 
            border-radius: 8px; 
            font-size: 0.8em;
        }
        
        .detail-cell {
            max-width: 200px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        
        .detail-cell:hover {
            overflow: visible;
            white-space: normal;
            background: #fff3cd;
            position: relative;
            z-index: 1;
        }
        
        .timestamp {
            font-size: 0.8em;
            color: #6c757d;
        }
        
        @media (max-width: 768px) {
            body { padding: 5px; }
            .container { padding: 0; }
            .stats-grid { grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; }
            .usage-grid { grid-template-columns: 1fr; }
            .activity-table { font-size: 0.75em; }
            .activity-table th, .activity-table td { padding: 6px 4px; }
            .header { padding: 15px; }
            .header h1 { font-size: 1.5em; }
            .card { padding: 15px; margin: 10px 0; }
            .detail-cell { max-width: 120px; }
        }
        
        .refresh-btn {
            background: #3498db;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.9em;
            margin-left: 10px;
        }
        
        .refresh-btn:hover {
            background: #2980b9;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>AI-RIVU Analytics Dashboard</h1>
            <p>Last updated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                <button class="refresh-btn" onclick="window.location.reload()">Refresh Data</button>
            </p>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <span class="stat-number">${analytics.totalUsers}</span>
                <div class="stat-label">Total Users</div>
            </div>
            <div class="stat-card">
                <span class="stat-number">${analytics.activeUsers}</span>
                <div class="stat-label">Active (7d)</div>
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
                        .slice(0, 10)
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
                        .slice(0, 10)
                        .map(([className, count]) => `
                            <div class="usage-item">
                                <span class="usage-name">Class ${className}</span>
                                <span class="usage-count">${count}</span>
                            </div>
                        `).join('') || '<div class="usage-item"><span class="usage-name">No data yet</span></div>'}
                </div>
                <div class="usage-section">
                    <h3>Question Types</h3>
                    ${Object.entries(analytics.popularQuestionTypes || {})
                        .sort(([,a], [,b]) => b - a)
                        .slice(0, 10)
                        .map(([type, count]) => `
                            <div class="usage-item">
                                <span class="usage-name">${type}</span>
                                <span class="usage-count">${count}</span>
                            </div>
                        `).join('') || '<div class="usage-item"><span class="usage-name">No data yet</span></div>'}
                </div>
            </div>
        </div>

        <div class="card">
            <h2>User Summary</h2>
            <div style="overflow-x: auto;">
                <table class="activity-table">
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Papers</th>
                            <th>Downloads</th>
                            <th>Logins</th>
                            <th>Tokens</th>
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
                                        <td class="timestamp">${lastActivity}</td>
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

        <div class="card">
            <h2>Recent Detailed Activity</h2>
            <div style="overflow-x: auto;">
                <table class="activity-table">
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th>User</th>
                            <th>Action</th>
                            <th>Subject</th>
                            <th>Class</th>
                            <th>Question Types</th>
                            <th>Instructions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(detailedLogs || [])
                            .slice(-50)
                            .reverse()
                            .map(log => {
                                const time = new Date(log.timestamp).toLocaleString('en-IN', { 
                                    timeZone: 'Asia/Kolkata',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                });
                                const details = log.details || {};
                                const questionTypes = details.questionDetails ? 
                                    details.questionDetails.map(q => `${q.type}(${q.num})`).join(', ') : '';
                                const instructions = details.additionalConditions || '';
                                
                                return `
                                    <tr>
                                        <td class="timestamp">${time}</td>
                                        <td>${log.email}</td>
                                        <td>${log.action.split(' - ')[0]}</td>
                                        <td>${details.subject || ''}</td>
                                        <td>${details.class || details.className || ''}</td>
                                        <td class="detail-cell" title="${questionTypes}">${questionTypes}</td>
                                        <td class="detail-cell" title="${instructions}">${instructions}</td>
                                    </tr>
                                `;
                            }).join('') || '<tr><td colspan="7" style="text-align: center; color: #7f8c8d;">No activity yet</td></tr>'}
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

// Keep existing API endpoints
router.get('/api/user-stats/:email', async (req, res) => {
    try {
        const userStats = await logger.getUserStats(req.params.email);
        res.json(userStats || { message: 'User not found' });
    } catch (error) {
        console.error('User stats error:', error);
        res.status(500).json({ error: 'Failed to get user stats' });
    }
});

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
