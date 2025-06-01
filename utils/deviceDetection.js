// utils/deviceDetection.js
/**
 * Detects device information from request headers
 */

function detectDevice(req) {
  const userAgent = req.get('User-Agent') || '';
  
  // Device type detection
  let deviceType = 'Desktop';
  if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
    if (/iPad/.test(userAgent)) {
      deviceType = 'Tablet';
    } else {
      deviceType = 'Mobile';
    }
  } else if (/Tablet/.test(userAgent)) {
    deviceType = 'Tablet';
  }
  
  // Browser detection
  let browser = 'Unknown';
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
    browser = 'Chrome';
  } else if (userAgent.includes('Firefox')) {
    browser = 'Firefox';
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    browser = 'Safari';
  } else if (userAgent.includes('Edg')) {
    browser = 'Edge';
  }
  
  // Operating system detection
  let operatingSystem = 'Unknown';
  if (userAgent.includes('Windows')) {
    operatingSystem = 'Windows';
  } else if (userAgent.includes('Mac')) {
    operatingSystem = 'macOS';
  } else if (userAgent.includes('Linux')) {
    operatingSystem = 'Linux';
  } else if (userAgent.includes('Android')) {
    operatingSystem = 'Android';
  } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    operatingSystem = 'iOS';
  }
  
  // Screen size (if available from custom header)
  const screenSize = req.get('X-Screen-Size') || 'Unknown';
  
  return {
    deviceType,
    browser,
    operatingSystem,
    screenSize,
    userAgent: userAgent.substring(0, 200) // Limit length for storage
  };
}

module.exports = {
  detectDevice
};
