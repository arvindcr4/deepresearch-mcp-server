import dotenv from 'dotenv';
import path from 'path';

export default async function globalSetup() {
  // Load test environment variables
  dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });
  
  // Set default test environment variables if not provided
  if (!process.env.NEO4J_TEST_URI) {
    process.env.NEO4J_TEST_URI = 'bolt://localhost:7687';
    process.env.NEO4J_USER = 'neo4j';
    process.env.NEO4J_PASSWORD = 'password';
  }
  
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error'; // Minimize logging during tests
  
  console.log('🧪 Global test setup completed');
}