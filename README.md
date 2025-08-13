# CalcpadS3 - Node.js TypeScript Edition

A modern self-hosted file management system with MinIO blob storage and multi-user authentication, rebuilt with Node.js TypeScript and Vue.js.

## Quick Start

### Development Mode (with hot reload and debugging)
```bash
# Load development environment variables and start
docker compose --env-file .env.development up --build

# Or use the shorthand:
NODE_ENV=development docker compose up --build
```

### Production Mode
```bash
# Load production environment variables and start
docker compose --env-file .env.production up --build

# Or use the shorthand (default):
docker compose up --build
```

### Local Development (API only)
```bash
cd api
npm install
npm run dev:local
```

## Project Structure

```
CalcpadS3/
├── api/                    # Node.js TypeScript API
│   ├── src/               # Source code
│   ├── .env.development   # Development environment config
│   ├── .env.production    # Production environment config
│   └── Dockerfile         # Multi-stage Dockerfile for dev/prod
├── viewer/                # Vue.js web application
│   ├── index.html        # Main HTML file
│   ├── app.js            # Vue.js application logic
│   └── config.js         # Configuration
├── frontend/              # Legacy WPF application (deprecated)
├── backend/               # Legacy C# API (deprecated)
├── docker-compose.yml     # Docker compose with conditional environments
├── .env.development       # Development Docker environment
├── .env.production        # Production Docker environment
├── start-dev.sh           # Development startup script
├── start-prod.sh          # Production startup script
└── stop.sh                # Stop all services script
```

## Environment Configurations

### Development Features
- Hot reload for API changes
- Source code mounting
- Debug port (9229) exposed
- SQLite tools included
- Separate volumes (suffixed with `-dev`)

### Production Features
- Optimized build
- No source mounting
- Pruned dependencies
- Production-ready configuration

## Services

### MinIO Object Storage
- **Development**: `localhost:9000` (API), `localhost:9001` (Console)
- **Production**: `localhost:9000` (API), `localhost:9001` (Console)
- **Credentials**: `calcpad-admin` / `calcpad-password-123`

### API Server
- **Development**: `localhost:5000` (API), `localhost:9229` (Debug)
- **Production**: `localhost:5000`

### Web Viewer
- Open `viewer/index.html` in browser
- Default credentials: `admin` / `admin` (set during initialization)

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration (Admin only)
- `GET /api/auth/profile` - Get current user profile

### File Management
- `GET /api/blobstorage/list-with-metadata` - List files with metadata
- `POST /api/blobstorage/upload` - Upload file
- `GET /api/blobstorage/download/{fileName}` - Download file
- `GET /api/blobstorage/base64/{fileName}` - Get file as base64

### Tags
- `GET /api/tags` - List all tags
- `POST /api/tags` - Create tag (Admin only)
- `DELETE /api/tags/{id}` - Delete tag (Admin only)

### Users (Admin only)
- `GET /api/user` - List all users
- `PUT /api/user/{id}` - Update user
- `DELETE /api/user/{id}` - Delete user

## Development Workflow

1. **Start Development Environment**:
   ```bash
   docker compose --env-file .env.development up --build
   ```

2. **Make API Changes**: Edit files in `api/src/` - changes will hot reload

3. **View Logs**: 
   ```bash
   docker compose logs -f calcpad-api-dev
   ```

4. **Debug**: Connect debugger to `localhost:9229`

5. **Test**: Open `viewer/index.html` and test functionality

## Production Deployment

1. **Build and Deploy**:
   ```bash
   docker compose --env-file .env.production up -d --build
   ```

2. **Environment Variables**: Update `.env.production` with production values

3. **SSL/HTTPS**: Configure reverse proxy (nginx, traefik, etc.)

## Configuration

### API Configuration
Edit `api/.env.development` or `api/.env.production`:
- Database path
- MinIO settings
- JWT configuration
- Authentication providers

### Viewer Configuration
Edit `viewer/config.js`:
- API base URL
- File upload limits
- UI preferences

## Authentication

### Local Authentication (Default)
- JWT-based with configurable expiry
- BCrypt password hashing
- Role-based access control

### OIDC Support
Set in environment:
```bash
AUTH_PROVIDER=OIDC
OIDC_ENABLED=true
OIDC_AUTHORITY=https://your-provider.com
OIDC_CLIENT_ID=your-client-id
OIDC_CLIENT_SECRET=your-secret
```

## User Roles

1. **Viewer (1)**: Read-only access
2. **Contributor (2)**: Upload files, manage tags
3. **Admin (3)**: Full access including user management

## Troubleshooting

### Common Issues

1. **Build fails**: Ensure Docker has enough memory allocated
2. **MinIO connection fails**: Check if port 9000 is available
3. **API connection fails**: Verify API is running on port 5000
4. **Permission errors**: Check file permissions for mounted volumes

### Debug Commands

```bash
# Check container status
docker compose ps

# View logs
docker compose logs calcpad-api-dev

# Shell into container
docker compose exec calcpad-api-dev sh

# Rebuild without cache
docker compose build --no-cache
```

## Migration from C# Version

The Node.js version maintains API compatibility with the original C# version. Existing data and configurations should work with minimal changes.

### Key Differences
- Port changed from 5159 to 5000
- Environment variables use NODE_ENV instead of ASPNETCORE_ENVIRONMENT
- Configuration files now use .env format instead of appsettings.json

## Contributing

1. Use development environment for changes
2. Follow TypeScript best practices
3. Test both API and viewer functionality
4. Update documentation as needed