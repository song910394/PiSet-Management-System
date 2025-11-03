# Replit.md

## Overview

This is a full-stack baking cost management system built with React, Express, and TypeScript. The application provides comprehensive tools for managing materials, recipes, products, packaging, and nutrition information for a bakery business. It features a modern UI built with shadcn/ui components and Tailwind CSS, with data persistence using Drizzle ORM and PostgreSQL.

## System Architecture

The application follows a monorepo structure with clear separation between client and server code:

- **Frontend**: React SPA with TypeScript, located in the `client/` directory
- **Backend**: Express.js REST API with TypeScript, located in the `server/` directory
- **Shared**: Common types and database schema, located in the `shared/` directory
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations

The architecture implements a traditional client-server model where the React frontend communicates with the Express backend through REST API endpoints.

## Key Components

### Frontend Architecture
- **UI Framework**: React with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for client-side routing
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **File Upload**: Multer for handling multipart/form-data
- **Excel Processing**: SheetJS (xlsx) for Excel file import/export

### Database Schema
The system manages several core entities:
- **Materials**: Raw ingredients with pricing and nutritional information
- **Recipes**: Product formulations with ingredient quantities
- **Products**: Sellable items with recipes and packaging
- **Packaging**: Packaging materials with cost information
- **Nutrition Facts**: Nutritional information for materials and calculated values for products

### UI Components
- Comprehensive component library using Radix UI primitives
- Custom modals for data entry and editing
- Reusable pagination and search/filter components
- Dashboard with statistics and key performance indicators

## Data Flow

1. **User Interaction**: Users interact with React components in the frontend
2. **API Requests**: Frontend makes HTTP requests to Express backend using TanStack Query
3. **Data Processing**: Backend processes requests, validates data, and interacts with database
4. **Database Operations**: Drizzle ORM handles type-safe database queries to PostgreSQL
5. **Response Handling**: Backend returns JSON responses to frontend
6. **UI Updates**: Frontend updates UI based on API responses and manages loading states

The application supports both real-time data fetching and optimistic updates for better user experience.

## External Dependencies

### Database
- **Neon Database**: Serverless PostgreSQL database for data persistence
- **Connection Pooling**: @neondatabase/serverless for optimal database connections

### UI/UX Libraries
- **Radix UI**: Accessible, unstyled UI primitives for building the design system
- **Lucide React**: Icon library for consistent iconography
- **TanStack Query**: Server state management and caching
- **React Hook Form**: Form state management and validation

### Development Tools
- **Vite**: Fast development server and build tool
- **TypeScript**: Type safety across the entire application
- **Tailwind CSS**: Utility-first CSS framework for styling

### File Processing
- **SheetJS (xlsx)**: Excel file reading and writing capabilities
- **Multer**: Multipart form data handling for file uploads

## Deployment Strategy

The application is configured for deployment on Replit with the following setup:

### Development Mode
- Vite dev server serves the React frontend with HMR
- Express server runs with tsx for TypeScript execution
- Database migrations handled through Drizzle Kit

### Production Build
- Frontend built using Vite and served as static files
- Backend bundled using esbuild for optimal performance
- Static assets served by Express in production

### Database Management
- Schema changes managed through Drizzle migrations
- Environment variables for database connection
- Push-based schema updates for development

The deployment supports both development and production environments with appropriate configuration for each.

## Changelog

```
Changelog:
- July 04, 2025. Initial setup
- July 05, 2025. Comprehensive code review and optimization:
  - Enhanced recipe Excel import/export with ingredient format "material_name:quantity"
  - Added database indexes for materials and recipes tables (name and category fields)
  - Completed full system debugging and performance optimization
  - Verified all 6 modules working correctly with Traditional Chinese interface
  - Updated product categories to: 罐裝餅乾、禮盒、小包點心、蛋糕甜點
  - Updated packaging categories to: 禮盒、禮盒配件、餅乾袋、紙箱提袋、DM貼紙、其他
  - Enhanced category compatibility across modals, pages, and import/export functions
  - Fixed material editing modal form data loading and TypeScript type safety
  - System ready for production deployment
- July 07, 2025. Recipe management and backup functionality improvements:
  - Fixed recipe batch import/export to support ingredient lists in format "material1:quantity,material2:quantity,..."
  - Updated server-side recipe API to handle nested data structure from client
  - Simplified client-side import to use server API instead of client-side processing
  - Implemented complete backup and restore functionality with working API endpoints
  - Fixed backup restore process to actually restore data instead of simulation
  - Added comprehensive error handling for backup/restore operations
- July 08, 2025. Recipe export and backup restore fixes:
  - Fixed recipe export functionality to use server-side API ensuring consistent format
  - Updated client-side export to use /api/recipes/export endpoint for proper ingredient formatting
  - Fixed backup restore issue with nutrition facts having null material_id values
  - Enhanced restore process to skip invalid nutrition data and continue with valid entries
  - Added products export/import API endpoints with full recipe and packaging details
  - Updated products management to export recipes in "recipe1:quantity,recipe2:quantity,..." format
  - Updated products management to export packaging in "packaging1:quantity,packaging2:quantity,..." format
  - Enhanced products import to parse and link recipes and packaging by name matching
  - Implemented nutrition facts import functionality with material name matching
  - Added server-side nutrition import API that matches Excel data to existing materials by name
  - Enhanced nutrition import to handle Chinese column names and missing data gracefully
  - Removed pagination from nutrition management and nutrition tables pages for better user experience
  - Both pages now display all data in a single scrollable list without page limits
- July 10, 2025. Automatic backup and restore system implementation:
  - Implemented comprehensive automatic backup system with daily scheduling at 2AM
  - Added 7-day backup retention policy with automatic cleanup of old backup files
  - Created complete backup/restore API endpoints (/api/backup/create, /api/backup/list, /api/backup/restore, /api/backup/delete)
  - Built enhanced backup management UI with server backup listing, manual backup creation, and comprehensive restore functionality
  - Added support for both local file upload restore and server backup restore with detailed warnings and confirmations
  - Implemented backup file management with size formatting, date formatting, and secure deletion
  - System automatically creates initial backup on startup and schedules recurring daily backups
  - Enhanced backup data includes complete system state with materials, recipes, products, packaging, and nutrition data
  - Backup restore process handles data conflicts gracefully by updating existing records or creating new ones
  - Added comprehensive error handling and user feedback for all backup operations
- July 16, 2025. Fixed password change functionality:
  - Fixed password modification system to properly store and persist new passwords
  - Implemented file-based settings storage (app-settings.json) for password and profit margin settings
  - Password changes now correctly update the stored password and require the new password for future logins
  - Added proper password validation and authentication flow
  - Settings are automatically loaded on server startup and saved when modified
  - Both password and profit margin settings now persist across server restarts
- July 17, 2025. Management fee percentage feature and backup optimization:
  - Added managementFeePercentage field to products database schema with 3% default
  - Implemented individual product management fee settings with automatic cost calculations
  - Updated UI to display original cost, management fee%, adjusted cost, profit, and profit margin
  - Enhanced product Modal with management fee input field and real-time calculations
  - Modified product import/export to support management fee percentage field
  - Optimized backup system: changed from daily scheduled backups to first daily login triggers
  - Reduced backup retention from 7 days to 5 most recent files with automatic cleanup
  - All profit calculations now use adjusted cost (original cost + management fee) instead of original cost
- July 18, 2025. Database-based settings system with real-time synchronization:
  - Replaced file-based settings (app-settings.json) with PostgreSQL database storage using userSettings table
  - Implemented bcrypt password hashing for secure authentication instead of plain text passwords
  - Added real-time database synchronization for all settings (profit margin colors, passwords)
  - All devices now load latest settings from database as single source of truth, no local caching
  - Password changes are immediately saved to database with secure hash encryption
  - Profit margin settings are instantly persisted to database and synchronized across all devices
  - Enhanced authentication system to use database verification with bcrypt password comparison
  - Fixed frontend settings page to properly handle real-time database-loaded settings with useEffect
  - All settings changes now have immediate server persistence ensuring data consistency across devices
- August 4, 2025. Complete nutrition label management system implementation:
  - Fixed nutrition label CRUD operations (create/delete) with proper data type conversion
  - Completely replaced Puppeteer with Canvas-based nutrition label generation for better system compatibility
  - Resolved Chinese font rendering issues in generated labels with proper font configuration
  - Implemented dual-language nutrition labels (English/Chinese) compliant with Taiwan regulations
  - Successfully enabled PDF, PNG, and JPG nutrition label generation with proper file downloads
  - Enhanced backup system to include all nutrition-related database tables
  - Fixed servingSize field type conversion from number to string format in API endpoints
  - Resolved database constraint violations by implementing automatic nutrition calculation
  - Fixed all variable reference errors in nutrition calculation functions
  - Implemented robust error handling for nutrition label operations
  - All nutrition label management functions now work correctly including creation, deletion, and file generation
  - System automatically calculates nutrition values when creating new nutrition labels
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```