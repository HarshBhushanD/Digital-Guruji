const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer-core');
const chrome = require('@sparticuz/chromium');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const handleError = (res, error, message) => {
  console.error(message, error);
  return res.status(500).json({
    error: `${message}: ${error.message}`,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
};

app.post('/api/capture-screenshot', async (req, res) => {
  let browser = null;
  try {
    const { html, css, title } = req.body;
    if (!html || !css) {
      return res.status(400).json({ error: 'Missing required HTML or CSS data' });
    }

    const processedHtml = html.includes('id="infographicContainer"')
      ? html
      : `<div id="infographicContainer">${html}</div>`;

    const tempHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>${css}</style>
        </head>
        <body style="margin: 0; padding: 0;">
          ${processedHtml}
        </body>
      </html>
    `;

    browser = await puppeteer.launch({
      args: chrome.args,
      executablePath: await chrome.executablePath,
      headless: true,
      ignoreHTTPSErrors: true
    });

    const page = await browser.newPage();
    await page.setContent(tempHtml, {
      waitUntil: ['load', 'networkidle0'],
      timeout: 30000
    });

    let element = await page.$('#infographicContainer') || await page.$('body');
    if (!element) throw new Error('Could not find content to screenshot');

    const screenshot = await element.screenshot({
      type: 'png',
      omitBackground: true
    });

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(title.replace(/ /g, '-'))}.png"`);
    return res.send(screenshot);
  } catch (error) {
    return handleError(res, error, 'Failed to generate screenshot');
  } finally {
    if (browser) await browser.close();
  }
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// const express = require('express');
// const cors = require('cors');
// const puppeteer = require('puppeteer');
// const bodyParser = require('body-parser');
// const path = require('path');

// const app = express();
// const PORT = process.env.PORT || 3000;

// // Allow cross-origin requests
// app.use(cors());
// app.use(bodyParser.json({ limit: '50mb' }));
// app.use(express.static(path.join(__dirname, 'public')));

// // Helper function to handle errors
// const handleError = (res, error, message) => {
//   console.error(message, error);
//   return res.status(500).json({ 
//     error: `${message}: ${error.message}`,
//     stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
//   });
// };

// app.post('/api/capture-screenshot', async (req, res) => {
//   let browser = null;
//   try {
//     const { html, css, title } = req.body;
    
//     if (!html || !css) {
//       return res.status(400).json({ error: 'Missing required HTML or CSS data' });
//     }
    
//     // Make sure the infographicContainer ID exists in the HTML
//     const processedHtml = html.includes('id="infographicContainer"') 
//       ? html 
//       : `<div id="infographicContainer">${html}</div>`;
    
//     const tempHtml = `
//       <!DOCTYPE html>
//       <html>
//         <head>
//           <meta charset="UTF-8">
//           <meta name="viewport" content="width=device-width, initial-scale=1.0">
//           <style>${css}</style>
//         </head>
//         <body style="margin: 0; padding: 0;">
//           ${processedHtml}
//         </body>
//       </html>
//     `;
    
//     // Launch puppeteer with optimized settings for deployment environments
//     browser = await puppeteer.launch({
//       args: [
//         '--no-sandbox', 
//         '--disable-setuid-sandbox',
//         '--disable-dev-shm-usage',
//         '--disable-gpu',
//         '--disable-features=site-per-process',
//         '--single-process'
//       ],
//       headless: 'new',
//       executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
//     });
    
//     const page = await browser.newPage();
    
//     // Set viewport size to ensure consistent rendering
//     await page.setViewport({ width: 1200, height: 800, deviceScaleFactor: 2 });
    
//     // Set content with longer timeout
//     await page.setContent(tempHtml, { 
//       waitUntil: ['load', 'networkidle0'],
//       timeout: 30000 
//     });
    
//     // Add retry logic for finding the element
//     let element = null;
//     for (let i = 0; i < 3; i++) {
//       element = await page.$('#infographicContainer');
//       if (element) break;
//       await page.waitForTimeout(500);
//     }
    
//     if (!element) {
//       console.warn('Could not find #infographicContainer, falling back to body');
//       element = await page.$('body');
//       if (!element) {
//         throw new Error('Could not find any content to screenshot');
//       }
//     }
    
//     // Take screenshot with improved settings
//     const screenshot = await element.screenshot({
//       type: 'png',
//       omitBackground: true,
//       encoding: 'binary'
//     });
    
//     // Send as attachment
//     res.set({
//       'Content-Type': 'image/png',
//       'Content-Disposition': `attachment; filename="${encodeURIComponent(title.replace(/ /g, '-'))}.png"`,
//       'Content-Length': screenshot.length,
//       'Cache-Control': 'no-cache'
//     });
    
//     return res.end(screenshot);
//   } catch (error) {
//     return handleError(res, error, 'Failed to generate screenshot');
//   } finally {
//     // Ensure browser is always closed
//     if (browser) {
//       try {
//         await browser.close();
//       } catch (closeError) {
//         console.error('Error closing browser:', closeError);
//       }
//     }
//   }
// });

// // Health check endpoint
// app.get('/api/health', (req, res) => {
//   res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
// });

// app.get('/', (req, res) => {
//   res.sendFile(path.join(__dirname, 'public', 'index.html'));
// });

// // Error handling middleware
// app.use((err, req, res, next) => {
//   handleError(res, err, 'Server error');
// });

// // Start the server
// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });

// // Handle graceful shutdown
// process.on('SIGTERM', () => {
//   console.log('SIGTERM received, shutting down gracefully');
//   process.exit(0);
// });

// process.on('SIGINT', () => {
//   console.log('SIGINT received, shutting down gracefully');
//   process.exit(0);
// });
