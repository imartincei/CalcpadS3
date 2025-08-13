// Configuration file for CalcpadS3 Viewer
const CONFIG = {
    API_BASE_URL: 'http://localhost:5000',
    
    // For production, update this to your actual API URL
    // API_BASE_URL: 'https://your-api-domain.com',
    
    // MinIO settings (if direct access needed)
    MINIO: {
        endpoint: 'localhost:9000',
        useSSL: false
    },
    
    // File upload settings
    MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
    
    // UI settings
    DEFAULT_TAB: 'files',
    FILES_PER_PAGE: 50
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}