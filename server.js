const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;


app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// app.post('/api/capture-screenshot', async (req, res) => {
//   try {
//     const { html, css, title } = req.body;

//     const tempHtml = `
//       <!DOCTYPE html>
//       <html>
//         <head>
//           <style>${css}</style>
//         </head>
//         <body>
//           ${html}
//         </body>
//       </html>
//     `;

//     const browser = await puppeteer.launch();
//     const page = await browser.newPage();
    
//     await page.setContent(tempHtml, { waitUntil: 'networkidle0' });
    
//     const element = await page.$('#infographicContainer');
//     const screenshot = await element.screenshot({
//       type: 'png',
//       omitBackground: true
//     });
    
//     await browser.close();
    
//     res.setHeader('Content-Type', 'image/png');
//     res.setHeader('Content-Disposition', `attachment; filename="${title.replace(/ /g, '-')}.png"`);
//     res.send(screenshot);
//   } catch (error) {
//     console.error('Error generating screenshot:', error);
//     res.status(500).json({ error: 'Failed to generate screenshot' });
//   }
// });
app.post('/api/capture-screenshot', async (req, res) => {
    try {
      const { html, css, title } = req.body;
      
      // Make sure the infographicContainer ID exists in the HTML
      const processedHtml = html.includes('id="infographicContainer"') 
        ? html 
        : `<div id="infographicContainer">${html}</div>`;
      
      const tempHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>${css}</style>
          </head>
          <body>
            ${processedHtml}
          </body>
        </html>
      `;
      
      const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const page = await browser.newPage();
      
      await page.setContent(tempHtml, { waitUntil: 'networkidle0' });
      
      // Try to find the element, fall back to body if not found
      let element = await page.$('#infographicContainer');
      if (!element) {
        console.warn('Could not find #infographicContainer, falling back to body');
        element = await page.$('body');
      }
      
      const screenshot = await element.screenshot({
        type: 'png',
        omitBackground: true
      });
      
      await browser.close();
      
      // Send as attachment
      res.set({
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="${title.replace(/ /g, '-')}.png"`,
        'Content-Length': screenshot.length,
        'Cache-Control': 'no-cache'
      });
      
      res.end(screenshot);
    } catch (error) {
      console.error('Error generating screenshot:', error);
      res.status(500).json({ error: `Failed to generate screenshot: ${error.message}` });
    }
  });

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});