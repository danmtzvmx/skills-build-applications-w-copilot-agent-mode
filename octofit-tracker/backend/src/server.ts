import express from 'express'
import type { ErrorRequestHandler } from 'express'
import { connectDatabase } from './config/database.js'
import apiRouter from './routes.js'

const app = express()
const PORT = Number(process.env.PORT) || 8000
const codespaceName = process.env.CODESPACE_NAME
const apiBaseUrl = codespaceName
  ? `https://${codespaceName}-8000.app.github.dev`
  : `http://localhost:${PORT}`

app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'octofit-tracker-backend' })
})

app.get('/api/config', (_req, res) => {
  res.json({ apiBaseUrl })
})

app.use('/api', apiRouter)

const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  console.error('API request failed:', error)
  res.status(500).json({ error: 'Internal server error' })
}

app.use(errorHandler)

async function startServer(): Promise<void> {
  await connectDatabase()
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`OctoFit Tracker backend running at ${apiBaseUrl}`)
  })
}

startServer().catch((error: unknown) => {
  console.error('Error starting OctoFit Tracker backend:', error)
  process.exitCode = 1
})
