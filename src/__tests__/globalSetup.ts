/**
 * Global Test Setup
 * Runs once before all tests
 */

export default async function globalSetup() {
  // Load test environment
  try {
    const { config } = await import('dotenv');
    config({ path: '.env.test' });
  } catch (error) {
    // dotenv is optional for tests
  }
  
  console.log('🚀 Setting up test environment...');
  
  // Set global test environment variables
  if (typeof process !== 'undefined') {
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'error'; // Reduce log noise in tests
  }
  
  // Note: For CI/CD, you might want to start a Neo4j test instance here
  // For now, we'll assume it's available or mock it in individual tests
  
  console.log('✅ Test environment setup complete');
}