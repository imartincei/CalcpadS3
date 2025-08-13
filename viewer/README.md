# CalcpadS3 Viewer - Vue.js Web Application

A modern web-based file management interface for CalcpadS3, built with Vue.js and designed to work seamlessly in WebView components.

## Features

- **Authentication**: JWT-based login with role-based access control
- **File Management**: Upload, download, view metadata, and manage file tags
- **Tag System**: Create, assign, and filter files by tags
- **User Management**: Admin can create, update, and delete users
- **Responsive Design**: Works on desktop and mobile devices
- **WebView Compatible**: Designed to work in WebView components for desktop apps

## Usage

### Standalone Web App
1. Ensure your CalcpadS3 API is running on port 5000
2. Open `index.html` in a web browser
3. Login with your credentials

### In WebView Component
The application is designed to work seamlessly in WebView components:

#### WPF WebView2
```csharp
webView.NavigateToString(File.ReadAllText("viewer/index.html"));
```

#### Electron
```javascript
mainWindow.loadFile('viewer/index.html');
```

#### Tauri
```rust
tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
```

## Configuration

Edit `config.js` to customize:
- API base URL
- File upload limits
- UI preferences

## File Structure

```
viewer/
├── index.html          # Main HTML file with Vue app
├── app.js             # Vue.js application logic
├── config.js          # Configuration settings
└── README.md          # This file
```

## API Integration

The application connects to the CalcpadS3 Node.js API with the following endpoints:

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get current user profile

### Files
- `GET /api/blobstorage/list-with-metadata` - List files with metadata
- `POST /api/blobstorage/upload` - Upload file
- `GET /api/blobstorage/download/{fileName}` - Download file
- `GET /api/blobstorage/tags/{fileName}` - Get file tags
- `PUT /api/blobstorage/tags/{fileName}` - Update file tags

### Tags
- `GET /api/tags` - List all tags
- `POST /api/tags` - Create new tag
- `DELETE /api/tags/{id}` - Delete tag

### Users (Admin only)
- `GET /api/user` - List all users
- `POST /api/auth/register` - Create new user
- `PUT /api/user/{id}` - Update user
- `DELETE /api/user/{id}` - Delete user

## Roles and Permissions

1. **Viewer (Role 1)**: Can view and download files
2. **Contributor (Role 2)**: Can upload files and manage tags
3. **Admin (Role 3)**: Full access including user management

## Browser Compatibility

- Chrome 88+
- Firefox 78+
- Safari 14+
- Edge 88+

## Development

To modify the application:

1. Edit `app.js` for functionality changes
2. Edit `index.html` for UI/styling changes
3. Update `config.js` for configuration changes

The application uses Vue 3 via CDN, so no build process is required.

## Security Notes

- Authentication tokens are stored in localStorage
- All API calls include proper authorization headers
- File uploads are validated on both client and server
- Admin operations require proper role verification

## Troubleshooting

### Common Issues

1. **Login fails**: Check API URL in config.js
2. **Files don't load**: Verify API server is running
3. **Upload fails**: Check file size limits and permissions
4. **CORS errors**: Ensure API server has proper CORS configuration

### Browser Console

Check the browser console for detailed error messages and network requests.