# Replenishment Dashboard

A comprehensive dashboard for managing demand forecasting and inventory replenishment with modern UI and production-ready features.

## Features

### 📊 Dashboard Overview
- **Summary Cards**: Display key metrics including total forecasts, average accuracy, total replenishments, and current accuracy
- **Real-time Data**: Live updates from the backend API
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices

### 🔍 Data Visualization
- **Forecast vs Actual Trends**: Visual comparison of forecasted vs actual sales quantities
- **Accuracy Distribution**: Detailed breakdown of forecast accuracy over time
- **Interactive Charts**: Modern chart components with color-coded indicators

### 📋 Data Management
- **Comprehensive Table**: Shows all required fields:
  - Store and Product information
  - Forecast Quantity
  - Actual Sales Quantity (editable)
  - Current Stock
  - Replenishment Quantity
  - Deviation (forecast vs actual)
  - Accuracy percentage
- **Inline Editing**: Update actual sales quantities directly in the table
- **Pagination**: Handle large datasets efficiently

### 🎛️ Advanced Filtering
- **Store Filter**: Filter by specific stores
- **Product Filter**: Filter by specific products
- **Month Filter**: Filter by specific months (last 12 months)
- **Real-time Filtering**: Instant results as filters are applied

### ⚡ Actions & Operations
- **Generate Forecast**: Create new forecasts with different methods (moving average, weighted average)
- **Calculate Replenishment**: Generate replenishment recommendations with variability options
- **Update Actuals**: Modify actual sales data to improve forecast accuracy

### 🛡️ Error Handling & Production Features
- **Comprehensive Error Handling**: Graceful error states with user-friendly messages
- **Loading States**: Skeleton loaders and loading indicators
- **Error Boundary**: Catches and handles unexpected errors
- **API Integration**: Full integration with backend APIs
- **TypeScript**: Fully typed for better development experience

## API Integration

The dashboard integrates with the following backend APIs:

### Forecasting APIs
- `GET /v1/forecasts` - Get all forecasts (paginated)
- `POST /v1/forecasts/generate` - Generate new forecast
- `GET /v1/forecasts/:storeId/:productId/:month` - Get specific forecast
- `PUT /v1/forecasts/:id` - Update forecast with actual sales

### Replenishment APIs
- `GET /v1/replenishment` - Get all replenishments (paginated)
- `POST /v1/replenishment/calculate` - Calculate new replenishment
- `GET /v1/replenishment/:storeId/:productId/:month` - Get specific replenishment

### Analytics APIs
- `GET /v1/analytics/accuracy` - Get forecast accuracy metrics
- `GET /v1/analytics/trends` - Get forecast trends
- `GET /v1/analytics/summary` - Get summary statistics

## Component Structure

```
shared/components/replenishment/
├── ReplenishmentSummaryCards.tsx    # Summary metrics cards
├── ReplenishmentFilters.tsx         # Filter controls
├── ReplenishmentTable.tsx           # Main data table
├── ReplenishmentCharts.tsx          # Trend and accuracy charts
├── ReplenishmentActions.tsx         # Action buttons and modals
├── ReplenishmentErrorBoundary.tsx   # Error handling
└── index.ts                         # Component exports
```

## Usage

### Basic Usage
```tsx
import { useReplenishment } from '@/shared/hooks/useReplenishment';
import {
  ReplenishmentSummaryCards,
  ReplenishmentFilters,
  ReplenishmentTable,
  ReplenishmentCharts,
  ReplenishmentActions
} from '@/shared/components/replenishment';

function ReplenishmentPage() {
  const {
    forecasts,
    replenishments,
    accuracy,
    trends,
    summary,
    loading,
    error,
    generateForecast,
    calculateReplenishment,
    updateForecast
  } = useReplenishment();

  return (
    <div>
      <ReplenishmentSummaryCards 
        summary={summary} 
        accuracy={accuracy} 
        loading={loading} 
      />
      <ReplenishmentActions 
        onGenerateForecast={generateForecast}
        onCalculateReplenishment={calculateReplenishment}
        loading={loading}
      />
      <ReplenishmentFilters />
      <ReplenishmentCharts 
        trends={trends} 
        accuracy={accuracy} 
        loading={loading} 
      />
      <ReplenishmentTable 
        forecasts={forecasts}
        replenishments={replenishments}
        loading={loading}
        onUpdateForecast={updateForecast}
      />
    </div>
  );
}
```

### Custom Hooks
The dashboard uses a custom hook `useReplenishment` that provides:
- Data fetching and caching
- Error handling
- Loading states
- Filter management
- Pagination
- CRUD operations

## Styling

The dashboard uses Tailwind CSS classes and follows the existing design system:
- **Box Components**: Consistent card layouts
- **Form Controls**: Standardized input and select styles
- **Buttons**: Primary, secondary, and outline button variants
- **Colors**: Success (green), warning (yellow), danger (red), info (blue)
- **Icons**: Remix Icons for consistent iconography

## Performance Features

- **Lazy Loading**: Components load data only when needed
- **Pagination**: Efficient handling of large datasets
- **Debounced Filters**: Prevents excessive API calls
- **Error Boundaries**: Isolates errors to prevent full app crashes
- **Loading States**: Provides feedback during data operations

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile responsive design
- Progressive enhancement

## Development

### Prerequisites
- Node.js 18+
- Next.js 13+
- TypeScript
- Tailwind CSS

### Setup
1. Install dependencies
2. Configure API endpoints in `shared/data/utilities/api.ts`
3. Ensure backend APIs are running
4. Start the development server

### Testing
- Component testing with React Testing Library
- API integration testing
- Error handling validation
- Responsive design testing

## Production Deployment

The dashboard is production-ready with:
- Comprehensive error handling
- Loading states and fallbacks
- TypeScript for type safety
- Responsive design
- Optimized performance
- Security considerations (API authentication)

## Contributing

1. Follow the existing code structure
2. Maintain TypeScript types
3. Add proper error handling
4. Include loading states
5. Test on multiple devices
6. Update documentation

## License

This project follows the same license as the parent application. 