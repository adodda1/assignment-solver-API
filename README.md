# IIT Madras Assignment Solver API

This API automatically answers questions from IIT Madras' Online Degree in Data Science graded assignments.

## Features

- Accepts questions and file attachments via POST requests
- Processes different file types (ZIP, CSV)
- Uses OpenAI's GPT-4o to generate answers for complex questions
- Returns answers in the required JSON format

## API Usage

The API accepts POST requests with questions and optional file attachments as multipart/form-data.

Example curl request:
```bash
curl -X POST "https://your-app.vercel.app/api/" \
  -H "Content-Type: multipart/form-data" \
  -F "question=Download and unzip file abcd.zip which has a single extract.csv file inside. What is the value in the \"answer\" column of the CSV file?" \
  -F "file=@abcd.zip"
```

Response format:
```json
{
  "answer": "1234567890"
}
```

## Deployment Instructions

### Deploy to Vercel

1. Install the Vercel CLI:
   ```
   npm install -g vercel
   ```

2. Login to Vercel:
   ```
   vercel login
   ```

3. Add your OpenAI API key as a secret:
   ```
   vercel secrets add openai_api_key your-openai-api-key
   ```

4. Deploy the application:
   ```
   vercel
   ```

5. For production deployment:
   ```
   vercel --prod
   ```

### Local Development

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env` file with your OpenAI API key:
   ```
   OPENAI_API_KEY=your-openai-api-key
   ```

3. Start the development server:
   ```
   npm run dev
   ```

## Requirements

- Node.js 18 or higher
- OpenAI API key