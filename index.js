// Import required packages
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const AdmZip = require('adm-zip');
const csv = require('csv-parser');
const app = express();
const PORT = process.env.PORT || 3000;

// Set up OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Configure storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage });

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Helper function to handle ZIP files
async function processZipFile(filePath) {
  try {
    const zip = new AdmZip(filePath);
    const extractDir = path.join(path.dirname(filePath), 'extract_' + path.basename(filePath, '.zip'));
    
    // Create extraction directory if it doesn't exist
    if (!fs.existsSync(extractDir)) {
      fs.mkdirSync(extractDir, { recursive: true });
    }
    
    // Extract the zip file
    zip.extractAllTo(extractDir, true);
    
    // Return the extraction directory path
    return extractDir;
  } catch (error) {
    console.error('Error processing ZIP file:', error);
    throw error;
  }
}

// Helper function to process CSV files
async function processCsvFile(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        resolve(results);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

// Main API endpoint
app.post('/api', upload.single('file'), async (req, res) => {
  try {
    const { question } = req.body;
    
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }
    
    let answer = '';
    let fileData = null;
    
    // Process file if it exists
    if (req.file) {
      const filePath = req.file.path;
      const fileExtension = path.extname(filePath).toLowerCase();
      
      // Handle different file types
      if (fileExtension === '.zip') {
        const extractDir = await processZipFile(filePath);
        
        // Look for CSV files in the extracted directory
        const files = fs.readdirSync(extractDir);
        const csvFiles = files.filter(file => path.extname(file).toLowerCase() === '.csv');
        
        if (csvFiles.length > 0) {
          // Process the first CSV file found
          const csvFilePath = path.join(extractDir, csvFiles[0]);
          fileData = await processCsvFile(csvFilePath);
          
          // Handle specific case for "answer" column
          if (question.includes('"answer" column') && fileData.length > 0 && fileData[0].answer) {
            answer = fileData[0].answer;
          }
        }
      } else if (fileExtension === '.csv') {
        fileData = await processCsvFile(filePath);
      }
      
      // Clean up uploaded files
      setTimeout(() => {
        try {
          fs.unlinkSync(filePath);
        } catch (err) {
          console.error('Error cleaning up uploaded file:', err);
        }
      }, 60000); // Clean up after 1 minute
    }
    
    // If we don't have an answer yet, use OpenAI to generate one
    if (!answer) {
      let prompt = `Answer the following question from an IIT Madras Data Science assignment as concisely as possible, providing only the exact answer that should be entered in the assignment form: ${question}`;
      
      if (fileData) {
        // Limit the amount of data sent to OpenAI to avoid token limits
        const sampleData = fileData.slice(0, 10);
        prompt += `\n\nThe attached file contains the following data (showing first ${sampleData.length} rows):\n${JSON.stringify(sampleData)}`;
      }
      
      const completion = await openai.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that answers data science assignment questions concisely and accurately. Provide only the exact answer without explanations, introductions, or additional text."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        model: "gpt-4o",
        temperature: 0,
      });
      
      answer = completion.choices[0].message.content.trim();
      
      // Clean up any potential explanation text (we just want the raw answer)
      if (answer.includes('\n')) {
        // Take the last line, which often contains just the answer
        answer = answer.split('\n').filter(line => line.trim() !== '').pop().trim();
      }
      
      // Remove any typical prefixes like "Answer:" or "The answer is:"
      answer = answer.replace(/^(answer:|the answer is:|the value is:)/i, '').trim();
    }
    
    return res.json({ answer });
  } catch (error) {
    console.error('Error processing request:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;