import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Start the MCP server process
const serverProcess = spawn('node', ['dist/index.js', '--manual'], {
  cwd: __dirname,
  env: {
    ...process.env,
    NEO4J_URI: 'bolt://localhost:7687',
    NEO4J_USER: 'neo4j',
    NEO4J_PASSWORD: 'password2',
    LOG_LEVEL: 'info',
    NODE_ENV: 'development',
    BACKUP_FILE_DIR: './atlas-backups',
    BACKUP_MAX_COUNT: '15',
  },
})

// Listen for server output
serverProcess.stdout.on('data', (data) => {
  console.log(`Server stdout: ${data}`)
})

serverProcess.stderr.on('data', (data) => {
  console.error(`Server stderr: ${data}`)
})

// Wait for server to initialize
setTimeout(() => {
  console.log('Sending project creation request to server...')

  // Create a test project
  const createProjectRequest = {
    type: 'MCPToolUse',
    name: 'atlas_project_create',
    input: {
      mode: 'single',
      name: 'Test Project',
      description: 'A test project to verify installation',
      status: 'active',
      completionRequirements:
        'Verify that the ATLAS MCP server is installed and working correctly',
      taskType: 'verification',
      outputFormat: 'bullet points',
      responseFormat: 'formatted',
    },
  }

  serverProcess.stdin.write(JSON.stringify(createProjectRequest) + '\n')

  // Wait for response and then check if the project was created
  setTimeout(() => {
    console.log('Sending project list request to server...')

    // List all projects
    const listProjectsRequest = {
      type: 'MCPToolUse',
      name: 'atlas_project_list',
      input: {
        mode: 'all',
        responseFormat: 'formatted',
      },
    }

    serverProcess.stdin.write(JSON.stringify(listProjectsRequest) + '\n')

    // Terminate after getting the response
    setTimeout(() => {
      console.log('Test completed. Exiting...')
      serverProcess.kill()
      process.exit(0)
    }, 3000)
  }, 3000)
}, 3000)
