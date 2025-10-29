const API_BASE_URL = import.meta.env.VITE_BE_URL || 'http://localhost:3000';

// Helper to get auth headers for file upload
const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken');
  if (!token) {
    throw new Error('Authentication required. Please login.');
  }
  return {
    'Authorization': `Bearer ${token}`,
    // Don't set Content-Type for FormData - let browser set it with boundary
  };
};

export interface UploadResponse {
  success: boolean;
  url?: string;
  filename?: string;
  originalName?: string;
  size?: number;
  mimetype?: string;
  error?: string;
  message?: string;
}

/**
 * Upload file to the server
 */
export const uploadFile = async (file: File): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const headers = getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    if (result.success) {
      return result;
    } else {
      throw new Error(result.message || 'Upload failed');
    }
  } catch (error) {
    throw error;
  }
};
