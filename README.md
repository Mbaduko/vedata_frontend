# Vedata Frontend

React-based web application for the Vedata veterinary data management system.

## Tech Stack

- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite 6
- **Routing:** React Router 6
- **Styling:** CSS Variables with custom theme system
- **Icons:** Lucide React
- **HTTP Client:** Fetch API with custom wrapper
- **State:** React Context API

## Project Structure

```
src/
├── assets/           # Images and static files
├── components/       # Reusable components
│   └── widgets/      # Dashboard widgets
├── context/          # Global state management
│   ├── AuthContext.tsx    # Authentication state
│   └── DataContext.tsx    # App data (deprecated - use API)
├── data/             # Mock data (deprecated)
├── pages/            # Route page components
├── services/         # API integration
│   └── api.ts        # HTTP client and auth API
├── theme/            # CSS theme tokens
├── types/            # TypeScript type definitions
├── App.tsx           # Root component with routing
└── main.tsx          # React entry point
```

## Setup

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Defaults are fine for local development

# Start dev server
npm run dev
```

The app will run on http://localhost:5173

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run Oxlint |

## Environment Variables

Create a `.env` file:

```env
VITE_API_URL=http://localhost:4000/api/v1
```

## Authentication

The app uses JWT-based authentication with HTTP-only cookies:

1. **Login:** Users authenticate with email/password
2. **Tokens:** Access token (7 days) + refresh token (30 days)
3. **Storage:** HTTP-only cookies (XSS protection)
4. **State:** Managed by AuthContext
5. **Routes:** Protected with RequireAuth wrapper

**Default Credentials:**
- Email: admin@vedata.rw
- Password: admin123456

## Features

### Pages & Routes

**Public:**
- `/login` - Authentication

**Protected (All Roles):**
- `/dashboard` - Overview with role-specific widgets

**Vet & Technician:**
- `/animals` - Animal registry
- `/animals/register` - Register new animal
- `/animals/:id` - Animal details
- `/owners` - Owner database
- `/owners/:id` - Owner details
- `/vaccinations/record` - Record vaccination
- `/vaccinations/due` - Due vaccinations list

**Veterinarian Only:**
- `/zones` - Zone management
- `/zones/:id` - Zone details
- `/team` - Team management
- `/team/:id` - Technician details

**Technician Only:**
- `/my-activity` - Personal activity log

**Superadmin Only:**
- `/zones` - Full zone management
- `/config/diseases` - Disease configuration
- `/config/species` - Species configuration
- `/users` - User management
- `/roles` - Role management
- `/audit-log` - System audit log

### Components

**Layout:**
- `DashboardLayout` - Main app layout with sidebar and header

**Core:**
- `DataTable` - Reusable table component
- `StatusBadge` - Status indicators
- `MetricCard` - Dashboard metrics
- `ZoneTree` - Hierarchical zone visualization
- `Wizard` - Multi-step form wizard
- `EmptyState` - Empty state placeholder
- `ImpactConfirmDialog` - Confirmation dialog for destructive actions
- `GracePeriodCountdown` - Edit grace period countdown
- `RollUpToggle` - Zone hierarchy rollup toggle
- `AnimalOwnerSearch` - Combined search component
- `CameraCapture` - Photo capture for vaccinations

**Widgets:**
- `SystemMetricsWidget` - System-wide statistics
- `MyMetricsWidget` - Personal metrics
- `ZoneOverviewWidget` - Zone statistics
- `ZoneMetricCards` - Zone metric cards
- `RecentEntriesWidget` - Recent activity
- `DueVaccinationsWidget` - Upcoming vaccinations
- `TeamActivityWidget` - Team member activity
- `RecentAuditWidget` - Recent audit entries

### State Management

**AuthContext:**
```typescript
const { user, loading, error, login, logout, clearError } = useAuth();
```

**DataContext (Deprecated):**
Local state management - replace with API calls.

### API Integration

**Service Layer:**
```typescript
import { authApi } from './services/api';

// Login
const response = await authApi.login({ email, password });

// Get current user
const user = await authApi.getMe();

// Logout
await authApi.logout();
```

**Error Handling:**
```typescript
try {
  await authApi.login(credentials);
} catch (error) {
  if (error instanceof ApiError) {
    console.error(error.message, error.statusCode);
  }
}
```

## Theme System

Custom CSS variables in `src/theme/tokens.css`:

```css
:root[data-theme="light"] {
  --color-bg: #ffffff;
  --color-ink: #1a1a1a;
  --color-brand: #3b82f6;
  /* ... more tokens */
}

:root[data-theme="dark"] {
  --color-bg: #0a0a0a;
  --color-ink: #f5f5f5;
  --color-brand: #60a5fa;
  /* ... more tokens */
}
```

**Usage:**
```css
.button {
  background: var(--color-brand);
  color: var(--color-bg);
}
```

## Routing

**Protected Routes:**
```typescript
<Route 
  path="/dashboard" 
  element={
    <RequireAuth>
      <Layout><Dashboard /></Layout>
    </RequireAuth>
  } 
/>
```

**Role-Based Routes:**
```typescript
<Route 
  path="/users" 
  element={
    <RequireAuth allowedRoles={['superadmin']}>
      <Layout><Users /></Layout>
    </RequireAuth>
  } 
/>
```

## Development

### Adding a New Page

1. Create page component in `src/pages/`
2. Add route in `App.tsx`
3. Add navigation item if needed
4. Implement API calls in page

### Adding API Integration

1. Define types in `src/types/`
2. Create API methods in `src/services/api.ts`
3. Use in components with error handling
4. Update state management as needed

### Styling Guidelines

- Use CSS variables for colors
- Follow existing component patterns
- Keep responsive design in mind
- Use Lucide React for icons
- Maintain accessibility (ARIA labels, keyboard nav)

## Building for Production

```bash
# Build
npm run build

# Preview
npm run preview

# Output in dist/
```

**Build Output:**
- Optimized and minified assets
- Code splitting by route
- Tree-shaken dependencies
- Hashed filenames for caching

## Browser Support

- Chrome/Edge (last 2 versions)
- Firefox (last 2 versions)
- Safari (last 2 versions)

## Troubleshooting

### CORS Errors
- Check VITE_API_URL in .env
- Verify backend CORS_ORIGIN setting
- Ensure backend is running

### Login Issues
- Check backend is running on port 4000
- Verify credentials
- Check browser console for errors

### Build Failures
- Clear node_modules and reinstall
- Check for TypeScript errors: `npm run typecheck`
- Verify all imports are correct

## Next Steps

To complete API integration:

1. Create API service methods for remaining endpoints
2. Replace DataContext mock data with API calls
3. Implement loading and error states
4. Add optimistic updates for better UX
5. Implement data caching strategy

## Documentation

- **Main README:** [../README.md](../README.md)
- **Quick Start:** [../QUICKSTART.md](../QUICKSTART.md)
- **API Details:** [../vedata_backend/README.md](../vedata_backend/README.md)
