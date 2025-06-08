// routes/admin.js - Enhanced version with detailed analytics
const express = require('express');
const router = express.Router();
const { logger } = require('../utils/enhancedLogger');


// multer support for CSV uploads
let multer;
let multerAvailable = false;
try {
    multer = require('multer');
    multerAvailable = true;
    console.log('✅ Multer available - CSV upload enabled');
} catch (error) {
    console.warn('⚠️ Multer not available. CSV upload will be disabled.');
    multer = null;
    multerAvailable = false;
}



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



/**
 * GET /admin/users - User management interface  
 * NEW ROUTE - doesn't conflict with existing dashboard
 */
router.get('/users', async (req, res) => {
    try {
        const { getUsers } = require('../utils/fileUtils');
        const users = getUsers();
        const allUserStats = await logger.getAllUserStats();

        // Calculate active users safely
        const activeUsersCount = Object.values(allUserStats).filter(stats => {
            if (!stats.lastActivity) return false;
            const lastActivity = new Date(stats.lastActivity);
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            return lastActivity > sevenDaysAgo;
        }).length;

        // Build user table rows safely
        const userTableRows = Object.entries(users)
            .sort(([,a], [,b]) => {
                const aStats = allUserStats[a] || {};
                const bStats = allUserStats[b] || {};
                return new Date(bStats.lastActivity || 0) - new Date(aStats.lastActivity || 0);
            })
            .map(([email, userData]) => {
                const stats = allUserStats[email] || {};
                const lastActivity = stats.lastActivity ? 
                    new Date(stats.lastActivity).toLocaleDateString('en-IN') : 'Never';
                const isActive = stats.lastActivity && 
                    new Date(stats.lastActivity) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                const tokenUsage = `${userData.tokens_used || 0} / ${userData.token_limit || 10000}`;
                const tokensPercentage = ((userData.tokens_used || 0) / (userData.token_limit || 10000) * 100).toFixed(1);
                
                return `
                    <tr>
                        <td style="font-weight: 500;">${email}</td>
                        <td>${stats.schoolName || userData.schoolName || '-'}</td>
                        <td>
                            <div style="font-size: 0.9em;">${tokenUsage}</div>
                            <div style="font-size: 0.8em; color: #666;">${tokensPercentage}% used</div>
                        </td>
                        <td style="text-align: center;">${stats.totalPapersGenerated || 0}</td>
                        <td style="font-size: 0.9em;">${lastActivity}</td>
                        <td>
                            <span class="${isActive ? 'status-active' : 'status-inactive'}">
                                ${isActive ? 'Active' : 'Inactive'}
                            </span>
                        </td>
                        <td>
                            <button class="btn" style="font-size: 0.8em; padding: 6px 10px;" 
                                    onclick="editUser('${email}')">Edit</button>
                            <button class="btn btn-danger" style="font-size: 0.8em; padding: 6px 10px; margin-left: 5px;" 
                                    onclick="deleteUser('${email}')">Delete</button>
                        </td>
                    </tr>
                `;
            }).join('');

        // Build CSV upload section based on multer availability
        const csvUploadSection = multerAvailable ? `
                    <div class="bulk-section">
                        <h3>Bulk User Creation</h3>
                        <p style="margin: 5px 0; color: #666; font-size: 0.9em;">
                            Upload CSV with columns: email, password, school_name (optional)
                        </p>
                        <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                            <input type="file" id="csvFile" accept=".csv" style="flex: 1; min-width: 200px;">
                            <button type="button" class="btn" id="uploadBtn">Upload CSV</button>
                            <a href="data:text/csv;charset=utf-8,email,password,school_name%0Ateacher1@school.com,password123,ABC School%0Ateacher2@school.com,password456,XYZ School" 
                               download="user_template.csv" style="color: #3498db; text-decoration: none; font-size: 0.9em;">
                               Download Template
                            </a>
                        </div>
                    </div>` : `
                    <div class="bulk-section" style="opacity: 0.6; pointer-events: none;">
                        <h3>Bulk User Creation</h3>
                        <p style="margin: 5px 0; color: #e74c3c; font-size: 0.9em;">
                            CSV upload requires multer dependency: npm install multer
                        </p>
                        <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                            <input type="file" id="csvFile" accept=".csv" style="flex: 1; min-width: 200px;" disabled>
                            <button type="button" class="btn" id="uploadBtn" disabled>Upload CSV</button>
                            <a href="data:text/csv;charset=utf-8,email,password,school_name%0Ateacher1@school.com,password123,ABC School%0Ateacher2@school.com,password456,XYZ School" 
                               download="user_template.csv" style="color: #3498db; text-decoration: none; font-size: 0.9em;">
                               Download Template
                            </a>
                        </div>
                    </div>`;

        // Build CSV upload JavaScript based on multer availability
        const csvUploadScript = multerAvailable ? `
        // CSV Upload functionality
        document.getElementById('uploadBtn').addEventListener('click', async () => {
            const fileInput = document.getElementById('csvFile');
            const uploadBtn = document.getElementById('uploadBtn');
            
            if (!fileInput.files[0]) {
                alert('Please select a CSV file');
                return;
            }
            
            uploadBtn.disabled = true;
            uploadBtn.textContent = 'Uploading...';
            
            const formData = new FormData();
            formData.append('csvFile', fileInput.files[0]);
            
            try {
                const response = await fetch('/admin/api/bulk-create-users', {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    alert(result.message);
                    window.location.reload();
                } else {
                    throw new Error(result.message);
                }
            } catch (error) {
                alert('Upload failed: ' + error.message);
            } finally {
                uploadBtn.disabled = false;
                uploadBtn.textContent = 'Upload CSV';
            }
        });` : '// CSV upload disabled - multer not available';

        const userManagementHTML = `
<!DOCTYPE html>
<html>
<head>
    <title>AI-RIVU User Management</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        * { box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; 
            margin: 0; padding: 10px; background: #f8f9fa; line-height: 1.6;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { 
            background: white; padding: 20px; border-radius: 12px; 
            margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); 
            display: flex; justify-content: space-between; align-items: center;
        }
        .header h1 { margin: 0; color: #2c3e50; font-size: 2em; }
        .header .nav-links a { 
            margin-left: 15px; padding: 8px 16px; background: #3498db; 
            color: white; text-decoration: none; border-radius: 6px; 
        }
        .header .nav-links a:hover { background: #2980b9; }
        
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .card { 
            background: white; padding: 20px; border-radius: 12px; 
            box-shadow: 0 2px 8px rgba(0,0,0,0.1); 
        }
        .card h2 { 
            color: #2c3e50; margin: 0 0 20px 0; font-size: 1.5em;
            border-bottom: 3px solid #3498db; padding-bottom: 8px;
        }
        
        .form-group { margin-bottom: 15px; }
        .form-group label { 
            display: block; margin-bottom: 5px; font-weight: 600; color: #2c3e50; 
        }
        .form-group input, .form-group select { 
            width: 100%; padding: 10px; border: 2px solid #e0e0e0; 
            border-radius: 6px; font-size: 14px; 
        }
        .form-group input:focus, .form-group select:focus { 
            border-color: #3498db; outline: none; 
        }
        
        .btn { 
            background: #2A9D8F; color: white; border: none; 
            padding: 12px 20px; border-radius: 6px; cursor: pointer; 
            font-weight: 600; transition: all 0.3s;
        }
        .btn:hover { background: #22867a; transform: translateY(-1px); }
        .btn:disabled { background: #ccc; cursor: not-allowed; transform: none; }
        
        .btn-danger { background: #e74c3c; }
        .btn-danger:hover { background: #c0392b; }
        
        .users-table { 
            width: 100%; border-collapse: collapse; margin-top: 15px; 
            background: white; font-size: 0.9em;
        }
        .users-table th { 
            background: #34495e; color: white; padding: 12px 8px; 
            text-align: left; font-weight: 600;
        }
        .users-table td { 
            padding: 10px 8px; border-bottom: 1px solid #ecf0f1; 
        }
        .users-table tr:hover { background: #f8f9fa; }
        
        .status-active { 
            color: #27ae60; font-weight: 600; 
            background: #d5f4e6; padding: 2px 6px; border-radius: 4px; 
        }
        .status-inactive { 
            color: #e74c3c; font-weight: 600; 
            background: #fadbd8; padding: 2px 6px; border-radius: 4px; 
        }
        
        .success-message, .error-message { 
            padding: 12px; border-radius: 6px; margin: 15px 0; 
            font-weight: 500; display: none;
        }
        .success-message { background: #d5f4e6; color: #27ae60; border: 1px solid #27ae60; }
        .error-message { background: #fadbd8; color: #e74c3c; border: 1px solid #e74c3c; }
        
        .bulk-section { 
            margin-top: 20px; padding: 15px; background: #f8f9fa; 
            border-radius: 8px; border-left: 4px solid #3498db; 
        }
        .bulk-section h3 { margin: 0 0 10px 0; color: #2c3e50; }
        
        @media (max-width: 768px) {
            .grid { grid-template-columns: 1fr; }
            .header { flex-direction: column; gap: 10px; text-align: center; }
            .users-table { font-size: 0.8em; }
            .users-table th, .users-table td { padding: 8px 4px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>AI-RIVU User Management</h1>
            <div class="nav-links">
                <a href="/admin/dashboard">Analytics Dashboard</a>
                <a href="/admin/users">User Management</a>
            </div>
        </div>

        <div class="grid">
            <!-- Create Single User -->
            <div class="card">
                <h2>Create New User</h2>
                
                <div id="success-message" class="success-message"></div>
                <div id="error-message" class="error-message"></div>
                
                <form id="createUserForm">
                    <div class="form-group">
                        <label for="email">Teacher Email*</label>
                        <input type="email" id="email" required placeholder="teacher@school.com">
                    </div>
                    
                    <div class="form-group">
                        <label for="password">Password*</label>
                        <input type="password" id="password" required placeholder="Minimum 6 characters">
                        <small style="color: #666;">Teacher can change this after first login</small>
                    </div>
                    
                    <div class="form-group">
                        <label for="schoolName">School Name (Optional)</label>
                        <input type="text" id="schoolName" placeholder="ABC Public School">
                    </div>
                    
                    <div class="form-group">
                        <label for="tokenLimit">Token Limit</label>
                        <select id="tokenLimit">
                            <option value="10000">Standard (10,000 tokens)</option>
                            <option value="25000">Extended (25,000 tokens)</option>
                            <option value="50000">Premium (50,000 tokens)</option>
                        </select>
                    </div>
                    
                    <button type="submit" class="btn" id="createBtn">Create User</button>
                </form>
                
                <!-- Bulk Creation Section -->
                ${csvUploadSection}
            </div>

            <!-- User Statistics -->
            <div class="card">
                <h2>User Statistics</h2>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                    <div style="text-align: center; padding: 15px; background: #3498db; color: white; border-radius: 8px;">
                        <div style="font-size: 2em; font-weight: 700;">${Object.keys(users).length}</div>
                        <div style="font-size: 0.9em;">Total Users</div>
                    </div>
                    <div style="text-align: center; padding: 15px; background: #27ae60; color: white; border-radius: 8px;">
                        <div style="font-size: 2em; font-weight: 700;">${activeUsersCount}</div>
                        <div style="font-size: 0.9em;">Active (7 days)</div>
                    </div>
                </div>
                
                <!-- Quick Actions -->
                <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 15px;">
                    <button class="btn" onclick="exportUsers()">Export Users CSV</button>
                    <button class="btn btn-danger" onclick="showBulkDelete()">Bulk Actions</button>
                </div>
                
                <!-- Bulk Delete Section (Hidden by default) -->
                <div id="bulkDeleteSection" style="display: none; background: #fadbd8; padding: 15px; border-radius: 8px; margin: 15px 0;">
                    <h4 style="margin: 0 0 10px 0; color: #e74c3c;">⚠️ Bulk Delete Users</h4>
                    <p style="margin: 5px 0; font-size: 0.9em;">Enter email addresses (one per line) to delete:</p>
                    <textarea id="bulkDeleteEmails" placeholder="teacher1@school.com&#10;teacher2@school.com" 
                              style="width: 100%; height: 80px; margin: 10px 0; padding: 8px; border: 1px solid #ccc; border-radius: 4px;"></textarea>
                    <div style="display: flex; gap: 10px;">
                        <button class="btn btn-danger" onclick="bulkDeleteUsers()">Delete Users</button>
                        <button class="btn" onclick="hideBulkDelete()" style="background: #95a5a6;">Cancel</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Users List -->
        <div class="card" style="margin-top: 20px;">
            <h2>All Users (${Object.keys(users).length})</h2>
            <div style="overflow-x: auto;">
                <table class="users-table">
                    <thead>
                        <tr>
                            <th>Email</th>
                            <th>School</th>
                            <th>Token Usage</th>
                            <th>Papers Generated</th>
                            <th>Last Activity</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${userTableRows || '<tr><td colspan="7" style="text-align: center; color: #7f8c8d;">No users yet</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <script>
        // Create single user
        document.getElementById('createUserForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const createBtn = document.getElementById('createBtn');
            const successMsg = document.getElementById('success-message');
            const errorMsg = document.getElementById('error-message');
            
            createBtn.disabled = true;
            createBtn.textContent = 'Creating...';
            
            const formData = {
                email: document.getElementById('email').value.trim(),
                password: document.getElementById('password').value,
                schoolName: document.getElementById('schoolName').value.trim(),
                tokenLimit: parseInt(document.getElementById('tokenLimit').value)
            };
            
            try {
                const response = await fetch('/admin/api/create-user', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    successMsg.textContent = result.message;
                    successMsg.style.display = 'block';
                    errorMsg.style.display = 'none';
                    document.getElementById('createUserForm').reset();
                    
                    // Refresh page after 2 seconds
                    setTimeout(() => window.location.reload(), 2000);
                } else {
                    throw new Error(result.message);
                }
            } catch (error) {
                errorMsg.textContent = error.message;
                errorMsg.style.display = 'block';
                successMsg.style.display = 'none';
            } finally {
                createBtn.disabled = false;
                createBtn.textContent = 'Create User';
            }
        });
        
        ${csvUploadScript}
        
        // User actions
        function editUser(email) {
            const newTokenLimit = prompt('Enter new token limit for ' + email + ':', '10000');
            if (newTokenLimit && !isNaN(newTokenLimit)) {
                updateUserTokenLimit(email, parseInt(newTokenLimit));
            }
        }
        
        async function updateUserTokenLimit(email, tokenLimit) {
            try {
                const response = await fetch('/admin/api/update-user', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, tokenLimit })
                });
                
                const result = await response.json();
                if (response.ok) {
                    alert('User updated successfully');
                    window.location.reload();
                } else {
                    throw new Error(result.message);
                }
            } catch (error) {
                alert('Update failed: ' + error.message);
            }
        }
        
        function deleteUser(email) {
            if (confirm('Are you sure you want to delete user: ' + email + '?')) {
                fetch('/admin/api/delete-user', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                })
                .then(response => response.json())
                .then(result => {
                    if (result.success) {
                        alert('User deleted successfully');
                        window.location.reload();
                    } else {
                        throw new Error(result.message);
                    }
                })
                .catch(error => alert('Delete failed: ' + error.message));
            }
        }
        
        function exportUsers() {
            window.location.href = '/admin/api/export-users';
        }
        
        function showBulkDelete() {
            document.getElementById('bulkDeleteSection').style.display = 'block';
        }
        
        function hideBulkDelete() {
            document.getElementById('bulkDeleteSection').style.display = 'none';
            document.getElementById('bulkDeleteEmails').value = '';
        }
        
        function bulkDeleteUsers() {
            const emails = document.getElementById('bulkDeleteEmails').value
                .split('\\n')
                .map(email => email.trim())
                .filter(email => email.length > 0);
            
            if (emails.length === 0) {
                alert('Please enter at least one email address');
                return;
            }
            
            if (confirm('Are you sure you want to delete ' + emails.length + ' users?')) {
                fetch('/admin/api/bulk-delete-users', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ emails })
                })
                .then(response => response.json())
                .then(result => {
                    alert(result.message);
                    if (result.success) {
                        window.location.reload();
                    }
                })
                .catch(error => alert('Bulk delete failed: ' + error.message));
            }
        }
    </script>
</body>
</html>`;

        res.send(userManagementHTML);
    } catch (error) {
        console.error('User management dashboard error:', error);
        res.status(500).send('Error loading user management dashboard');
    }
});

/**
 * POST /admin/api/create-user - Create single user
 */
router.post('/api/create-user', async (req, res) => {
    try {
        const { email, password, schoolName, tokenLimit } = req.body;
        
        // Validation
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }
        
        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'Invalid email format' });
        }
        
        const { getUsers, saveUsers } = require('../utils/fileUtils');
        const { hashPassword } = require('../utils/passwordUtils');
        
        const users = getUsers();
        
        // Check if user already exists
        if (users[email]) {
            return res.status(400).json({ message: 'User already exists with this email' });
        }
        
        // Hash password and create user
        const hashedPassword = await hashPassword(password);
        
        users[email] = {
            password: hashedPassword,
            tokens_used: 0,
            token_limit: tokenLimit || 10000,
            schoolName: schoolName || null,
            created_at: new Date().toISOString(),
            created_by: 'admin'
        };
        
        await saveUsers();
        
        // Log the creation
        await logger.logActivity('ADMIN', 'User Created', {
            newUser: email,
            schoolName: schoolName,
            tokenLimit: tokenLimit,
            createdBy: 'admin',
            creationTime: new Date().toISOString()
        });
        
        res.json({ 
            success: true, 
            message: `User ${email} created successfully`,
            user: {
                email,
                schoolName,
                tokenLimit: tokenLimit || 10000
            }
        });
        
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ message: 'Failed to create user: ' + error.message });
    }
});

/**
 * POST /admin/api/bulk-create-users - Create multiple users from CSV
 */
router.post('/api/bulk-create-users', (req, res, next) => {
    if (!multerAvailable) {
        return res.status(400).json({ message: 'CSV upload not available. Install multer: npm install multer' });
    }
    
    const upload = multer().single('csvFile');
    upload(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ message: 'File upload error: ' + err.message });
        }
        
        try {
            if (!req.file) {
                return res.status(400).json({ message: 'CSV file is required' });
            }
            
            const csvContent = req.file.buffer.toString('utf-8');
            const lines = csvContent.split('\n').filter(line => line.trim());
            
            if (lines.length < 2) {
                return res.status(400).json({ message: 'CSV must have at least a header and one data row' });
            }
            
            const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
            const emailIndex = headers.indexOf('email');
            const passwordIndex = headers.indexOf('password');
            const schoolIndex = headers.indexOf('school_name');
            
            if (emailIndex === -1 || passwordIndex === -1) {
                return res.status(400).json({ message: 'CSV must have email and password columns' });
            }
            
            const { getUsers, saveUsers } = require('../utils/fileUtils');
            const { hashPassword } = require('../utils/passwordUtils');
            const users = getUsers();
            
            let created = 0;
            let skipped = 0;
            const errors = [];
            
            for (let i = 1; i < lines.length; i++) {
                const cells = lines[i].split(',').map(c => c.trim());
                const email = cells[emailIndex];
                const password = cells[passwordIndex];
                const schoolName = schoolIndex !== -1 ? cells[schoolIndex] : '';
                
                if (!email || !password) {
                    errors.push(`Row ${i + 1}: Missing email or password`);
                    continue;
                }
                
                if (users[email]) {
                    skipped++;
                    continue;
                }
                
                try {
                    const hashedPassword = await hashPassword(password);
                    users[email] = {
                        password: hashedPassword,
                        tokens_used: 0,
                        token_limit: 10000,
                        schoolName: schoolName || null,
                        created_at: new Date().toISOString(),
                        created_by: 'admin_bulk'
                    };
                    created++;
                } catch (error) {
                    errors.push(`Row ${i + 1}: ${error.message}`);
                }
            }
            
            if (created > 0) {
                await saveUsers();
            }
            
            // Log bulk creation
            await logger.logActivity('ADMIN', 'Bulk User Creation', {
                totalRows: lines.length - 1,
                created,
                skipped,
                errors: errors.length,
                createdBy: 'admin',
                creationTime: new Date().toISOString()
            });
            
            res.json({
                success: true,
                message: `Bulk creation completed: ${created} created, ${skipped} skipped, ${errors.length} errors`,
                details: { created, skipped, errors }
            });
            
        } catch (error) {
            console.error('Bulk create users error:', error);
            res.status(500).json({ message: 'Bulk creation failed: ' + error.message });
        }
    });
});

/**
 * POST /admin/api/update-user - Update user details
 */
router.post('/api/update-user', async (req, res) => {
    try {
        const { email, tokenLimit, schoolName } = req.body;
        
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }
        
        const { getUsers, saveUsers } = require('../utils/fileUtils');
        const users = getUsers();
        
        if (!users[email]) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Update user
        if (tokenLimit !== undefined) {
            users[email].token_limit = parseInt(tokenLimit);
        }
        if (schoolName !== undefined) {
            users[email].schoolName = schoolName;
        }
        
        users[email].updated_at = new Date().toISOString();
        users[email].updated_by = 'admin';
        
        await saveUsers();
        
        // Log the update
        await logger.logActivity('ADMIN', 'User Updated', {
            updatedUser: email,
            changes: { tokenLimit, schoolName },
            updatedBy: 'admin',
            updateTime: new Date().toISOString()
        });
        
        res.json({ 
            success: true, 
            message: `User ${email} updated successfully` 
        });
        
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ message: 'Failed to update user: ' + error.message });
    }
});

/**
 * DELETE /admin/api/delete-user - Delete single user
 */
router.delete('/api/delete-user', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }
        
        const { getUsers, saveUsers } = require('../utils/fileUtils');
        const users = getUsers();
        
        if (!users[email]) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        delete users[email];
        await saveUsers();
        
        // Log the deletion
        await logger.logActivity('ADMIN', 'User Deleted', {
            deletedUser: email,
            deletedBy: 'admin',
            deletionTime: new Date().toISOString()
        });
        
        res.json({ 
            success: true, 
            message: `User ${email} deleted successfully` 
        });
        
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ message: 'Failed to delete user: ' + error.message });
    }
});

/**
 * DELETE /admin/api/bulk-delete-users - Delete multiple users
 */
router.delete('/api/bulk-delete-users', async (req, res) => {
    try {
        const { emails } = req.body;
        
        if (!emails || !Array.isArray(emails) || emails.length === 0) {
            return res.status(400).json({ message: 'Email array is required' });
        }
        
        const { getUsers, saveUsers } = require('../utils/fileUtils');
        const users = getUsers();
        
        let deleted = 0;
        let notFound = 0;
        
        emails.forEach(email => {
            if (users[email]) {
                delete users[email];
                deleted++;
            } else {
                notFound++;
            }
        });
        
        if (deleted > 0) {
            await saveUsers();
        }
        
        // Log bulk deletion
        await logger.logActivity('ADMIN', 'Bulk User Deletion', {
            totalEmails: emails.length,
            deleted,
            notFound,
            deletedBy: 'admin',
            deletionTime: new Date().toISOString()
        });
        
        res.json({
            success: true,
            message: `Bulk deletion completed: ${deleted} deleted, ${notFound} not found`,
            details: { deleted, notFound }
        });
        
    } catch (error) {
        console.error('Bulk delete users error:', error);
        res.status(500).json({ message: 'Bulk deletion failed: ' + error.message });
    }
});

/**
 * GET /admin/api/export-users - Export users as CSV
 */
router.get('/api/export-users', async (req, res) => {
    try {
        const { getUsers } = require('../utils/fileUtils');
        const users = getUsers();
        const allUserStats = await logger.getAllUserStats();
        
        // Create CSV content
        const headers = ['email', 'school_name', 'token_limit', 'tokens_used', 'papers_generated', 'last_activity', 'created_at'];
        const csvLines = [headers.join(',')];
        
        Object.entries(users).forEach(([email, userData]) => {
            const stats = allUserStats[email] || {};
            const row = [
                email,
                userData.schoolName || '',
                userData.token_limit || 10000,
                userData.tokens_used || 0,
                stats.totalPapersGenerated || 0,
                stats.lastActivity || '',
                userData.created_at || ''
            ];
            csvLines.push(row.join(','));
        });
        
        const csvContent = csvLines.join('\n');
        const timestamp = new Date().toISOString().split('T')[0];
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="ai-rivu-users-${timestamp}.csv"`);
        res.send(csvContent);
        
        // Log export
        await logger.logActivity('ADMIN', 'Users Export', {
            totalUsers: Object.keys(users).length,
            exportedBy: 'admin',
            exportTime: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Export users error:', error);
        res.status(500).json({ message: 'Failed to export users: ' + error.message });
    }
});
