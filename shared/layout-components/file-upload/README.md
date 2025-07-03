# File Upload Component

A modern, responsive drag-and-drop file upload component with S3 integration.

## Features

- 🖱️ **Drag & Drop** - Intuitive drag and drop interface
- 📁 **Multiple Files** - Support for single or multiple file uploads
- 🎨 **Modern UI** - Beautiful, responsive design with animations
- 📊 **Progress Tracking** - Real-time upload progress indicators
- 🖼️ **Image Previews** - Automatic image thumbnails
- 📋 **File Validation** - Size and type validation
- 🗑️ **File Management** - Delete files from S3
- 🔒 **Secure** - JWT authentication required
- 📱 **Responsive** - Works on all screen sizes

## Quick Start

```tsx
import { FileUpload } from '@/shared/layout-components/file-upload';

function MyComponent() {
  const handleUploadSuccess = (file) => {
    console.log('Uploaded:', file.url);
  };

  return (
    <FileUpload
      onUploadSuccess={handleUploadSuccess}
      onUploadError={(error) => console.error(error)}
      multiple={true}
      maxFiles={5}
      accept="image/*,.pdf"
    />
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onUploadSuccess` | `(file: UploadedFile) => void` | - | Callback when file uploads successfully |
| `onUploadError` | `(error: string) => void` | - | Callback when upload fails |
| `onFileRemove` | `(fileKey: string) => void` | - | Callback when file is removed |
| `multiple` | `boolean` | `false` | Allow multiple file selection |
| `accept` | `string` | - | File types to accept (e.g., "image/*,.pdf") |
| `maxFiles` | `number` | `5` | Maximum number of files |
| `className` | `string` | `""` | Additional CSS classes |
| `disabled` | `boolean` | `false` | Disable the component |

## API Response Types

```typescript
interface UploadedFile {
  url: string;          // S3 file URL
  key: string;          // S3 file key
  originalName: string; // Original filename
  mimeType: string;     // File MIME type
  size: number;         // File size in bytes
}
```

## Usage Examples

### Single Image Upload
```tsx
<FileUpload
  accept="image/*"
  onUploadSuccess={(file) => setImageUrl(file.url)}
/>
```

### Multiple Document Upload
```tsx
<FileUpload
  multiple
  maxFiles={10}
  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
  onUploadSuccess={(file) => addToDocuments(file)}
  onUploadError={(error) => showNotification(error)}
/>
```

### Excel & Spreadsheet Upload
```tsx
<FileUpload
  multiple
  accept=".xls,.xlsx,.csv"
  onUploadSuccess={(file) => {
    console.log('Spreadsheet uploaded:', file.originalName);
    // Process Excel data
  }}
/>
```

### Custom Styling
```tsx
<FileUpload
  className="my-custom-uploader"
  multiple
  onUploadSuccess={handleSuccess}
/>
```

## File Size & Type Limits

- **Maximum Size**: 5MB per file
- **Supported Types**: All file types including:
  - **Documents**: PDF, Word (.doc/.docx), PowerPoint (.ppt/.pptx), Text (.txt)
  - **Spreadsheets**: Excel (.xls/.xlsx), CSV (.csv)
  - **Images**: JPEG, PNG, GIF, WebP, etc.
  - **Archives**: ZIP, RAR, 7Z, etc.
  - **Media**: Video and audio files
- **Validation**: Client-side and server-side validation

## Authentication

The component requires a JWT token in localStorage:

```javascript
localStorage.setItem('authToken', 'your-jwt-token');
```

## Styling

The component uses SCSS modules with these main classes:

- `.file-upload-container` - Main wrapper
- `.file-upload-dropzone` - Drop area
- `.file-upload-list` - Uploaded files list
- `.file-preview` - Individual file preview
- `.upload-progress` - Progress bar

### Custom Styling Example

```scss
.my-custom-uploader {
  .file-upload-dropzone {
    border-color: #your-color;
    background: #your-background;
  }
  
  .file-upload-dropzone:hover {
    border-color: #your-hover-color;
  }
}
```

## Error Handling

Common errors and solutions:

- **"Authentication token is required"** - Set JWT token in localStorage
- **"File size exceeds 5MB limit"** - Compress or split large files
- **"Cannot upload more than X files"** - Respect the maxFiles limit
- **Network errors** - Check API endpoint and connectivity

## Components Included

1. **FileUpload** - Main drag & drop component
2. **FilePreview** - Individual file display with actions
3. **UploadProgress** - Progress bar component
4. **FileUploadService** - API service for uploads/deletes

## Browser Support

- Chrome 60+
- Firefox 60+
- Safari 12+
- Edge 79+

## Dependencies

- React 16.8+
- Modern browser with File API support
- JWT authentication system
- S3-compatible storage backend 