# PDF Summary AI - Frontend

A modern React frontend for the PDF Summary AI application, built with TypeScript, Vite, and Tailwind CSS.

## Features

- **Real-time Processing**: WebSocket integration for live progress updates
- **Drag & Drop Upload**: Intuitive file upload with validation
- **Progress Visualization**: Detailed processing stage indicators
- **Summary Display**: Rich summary viewer with evaluation metrics
- **Document Management**: List, view, and manage uploaded documents
- **Responsive Design**: Works on desktop and mobile devices
- **Error Handling**: Comprehensive error boundaries and user feedback

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **Zustand** for state management
- **React Query** for API calls
- **WebSocket** for real-time updates
- **Lucide React** for icons

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your backend URLs:
```env
VITE_API_URL=http://localhost:3000/api
VITE_WS_URL=ws://localhost:3000
```

3. Start the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

### Backend Integration

Make sure the backend is running with the following endpoints:

#### REST API Endpoints
- `POST /api/documents/upload` - Upload PDF files
- `GET /api/documents` - List documents
- `GET /api/documents/:id` - Get document details
- `POST /api/documents/:id/summarize` - Generate summary
- `DELETE /api/documents/:id` - Delete document

#### WebSocket Endpoints
- `WS /ws/progress/:documentId` - Real-time progress updates

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── ui/              # Reusable UI components
│   │   ├── UploadForm.tsx   # File upload component
│   │   ├── ProgressTracker.tsx # Real-time progress display
│   │   ├── SummaryViewer.tsx # Summary and evaluation display
│   │   ├── DocumentList.tsx # Document management
│   │   └── ErrorBoundary.tsx # Error handling
│   ├── hooks/
│   │   ├── useWebSocket.ts  # WebSocket integration
│   │   └── useDocuments.ts  # API integration
│   ├── stores/
│   │   ├── documentStore.ts # Document state management
│   │   └── websocketStore.ts # WebSocket state management
│   ├── types/
│   │   └── api.ts           # TypeScript interfaces
│   ├── lib/
│   │   └── utils.ts         # Utility functions
│   ├── config/
│   │   └── env.ts           # Environment configuration
│   ├── App.tsx              # Main application component
│   └── main.tsx             # Application entry point
├── public/
├── package.json
├── tailwind.config.js
├── postcss.config.js
└── tsconfig.json
```

## Key Components

### UploadForm
- Drag & drop file upload
- File validation (PDF, TXT, DOC, DOCX, max 50MB)
- Upload progress tracking
- Error handling and user feedback

### ProgressTracker
- Real-time progress visualization
- Processing stage indicators
- WebSocket integration for live updates
- Fallback to polling if WebSocket fails

### SummaryViewer
- Rich summary display with sections
- Evaluation metrics visualization
- Performance statistics (tokens, cost, model)
- Expandable content sections

### DocumentList
- Document management interface
- Status indicators and progress bars
- Quality score display
- Delete and download actions

### WebSocket Integration
- Automatic connection management
- Reconnection logic with exponential backoff
- Message parsing and state updates
- Connection status indicators

## State Management

### Zustand Stores

#### Document Store
Manages document-related state:
- Document list and current document
- Upload progress and processing status
- Error handling and loading states

#### WebSocket Store
Manages WebSocket connections:
- Connection state per document
- Message handling and routing
- Reconnection attempts and status

### React Query
Handles API interactions:
- Document CRUD operations
- Caching and background updates
- Error handling and retries
- Loading state management

## Styling

Built with Tailwind CSS for:
- Responsive design
- Consistent spacing and colors
- Dark/light mode support (extensible)
- Custom component variants

## Error Handling

- **Error Boundary**: Catches React errors and displays user-friendly messages
- **API Error Handling**: Graceful handling of network and server errors
- **WebSocket Fallback**: Falls back to polling if WebSocket fails
- **Loading States**: Clear feedback for all async operations

## Performance

- **Code Splitting**: Lazy loading of components
- **Memoization**: React.memo and useMemo for expensive operations
- **WebSocket Optimization**: Efficient message handling and state updates
- **Bundle Optimization**: Tree shaking and minification

## Development

### Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### TypeScript

Strict TypeScript configuration with:
- Strict type checking
- Path mapping for clean imports
- Interface definitions for all API responses
- Type-safe WebSocket message handling

## Production Deployment

1. Build the application:
```bash
npm run build
```

2. The `dist/` folder contains the production build

3. Serve with any static server (nginx, Apache, Vercel, etc.)

4. Configure environment variables on your hosting platform

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

1. Follow the existing code style and patterns
2. Add TypeScript interfaces for new API endpoints
3. Update state management for new features
4. Add comprehensive error handling
5. Test WebSocket integration thoroughly
6. Ensure responsive design works on all screen sizes

## Troubleshooting

### WebSocket Connection Issues
- Check that the backend WebSocket server is running
- Verify `VITE_WS_URL` configuration
- Check browser console for connection errors

### API Connection Issues
- Verify `VITE_API_URL` configuration
- Check backend server is running
- Check CORS configuration on backend

### Upload Issues
- Verify file type and size limits
- Check network connectivity
- Check backend upload configuration

### Build Issues
- Clear node_modules and reinstall
- Check Node.js version compatibility
- Verify all dependencies are installed