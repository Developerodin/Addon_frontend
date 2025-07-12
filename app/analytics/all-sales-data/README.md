# All Sales Data Page

This page displays all sales transactions with comprehensive filtering and sorting capabilities.

## Features

### 🔍 **Advanced Filtering**
- **Date Range Filtering**: Filter by start and end dates
- **Search Functionality**: Search across stores, products, categories, and cities
- **Quick Date Ranges**: Predefined buttons for common date ranges
  - Today
  - Yesterday
  - Last 7 Days
  - Last 30 Days
  - This Month
  - Last Month

### 📊 **Data Display**
- **Comprehensive Table**: Shows all sales transaction details
- **Sortable Columns**: Click any column header to sort
- **Pagination**: Navigate through large datasets (20 items per page)
- **Responsive Design**: Works on all device sizes

### 📋 **Data Fields**
- **Date**: Transaction date
- **Store**: Store name and ID
- **City**: Store location
- **Product**: Product name and code
- **Category**: Product category
- **Quantity**: Units sold
- **NSV**: Net Sales Value
- **GSV**: Gross Sales Value

### 🎯 **API Integration**
- **Endpoint**: `GET /dashboard/all-sales-data`
- **Parameters**: `startDate`, `endDate` (optional)
- **Authentication**: JWT token required
- **Response**: Paginated sales data with metadata

## Usage

### From Dashboard
1. Navigate to the main dashboard
2. Click "View All" button in the "Monthly NSV & Qty Trend" card
3. You'll be redirected to this page

### Direct Access
- URL: `/analytics/all-sales-data`
- Requires authentication

### Filtering Data
1. **Date Range**: Select start and end dates
2. **Search**: Type keywords to filter results
3. **Quick Filters**: Use predefined date range buttons
4. **Apply**: Click "Filter" to apply changes
5. **Reset**: Click "Reset" to clear all filters

### Sorting
- Click any column header to sort
- Click again to reverse sort order
- Visual indicators show current sort field and direction

## Technical Details

### API Response Format
```json
{
  "status": "success",
  "data": {
    "sales": [
      {
        "_id": "sale_id",
        "date": "2024-01-15T10:30:00.000Z",
        "nsv": 5000,
        "gsv": 6000,
        "quantity": 10,
        "storeName": "Store Name",
        "storeId": "STORE001",
        "storeCity": "City Name",
        "productName": "Product Name",
        "productCode": "PROD001",
        "categoryName": "Category Name"
      }
    ],
    "totalCount": 1500,
    "dateRange": {
      "startDate": "2024-01-01",
      "endDate": "2024-12-31"
    }
  }
}
```

### Performance Considerations
- **Client-side Pagination**: Fast navigation through large datasets
- **Debounced Search**: Efficient filtering without excessive API calls
- **Memoized Sorting**: Optimized sorting performance
- **Loading States**: User feedback during data fetching

### Error Handling
- **Network Errors**: Retry functionality
- **Authentication Errors**: Redirect to login
- **Empty Results**: Helpful messaging and suggestions
- **Validation**: Date range validation

## Dependencies

- **React**: UI framework
- **Next.js**: Routing and SSR
- **Dashboard Service**: API integration
- **Utility Functions**: Formatting helpers
- **Tailwind CSS**: Styling

## Future Enhancements

- [ ] Export to Excel/CSV functionality
- [ ] Advanced filtering (by store, category, etc.)
- [ ] Real-time data updates
- [ ] Chart visualizations
- [ ] Bulk actions
- [ ] Saved filters 