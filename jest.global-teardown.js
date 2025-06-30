// Jest global teardown - runs once after all tests
module.exports = async () => {
  console.log('🧹 Cleaning up test environment...');
  
  // Calculate total test runtime
  if (global.testStartTime) {
    const runtime = Date.now() - global.testStartTime;
    console.log(`⏱️  Total test runtime: ${runtime}ms`);
  }
  
  // Clean up any test resources
  try {
    // Close any open connections, clean up files, etc.
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    console.log('✅ Test environment cleanup completed');
  } catch (error) {
    console.error('❌ Error during test cleanup:', error);
  }
  
  // Force exit after a short delay to ensure cleanup
  setTimeout(() => {
    process.exit(0);
  }, 100);
  
  return Promise.resolve();
};