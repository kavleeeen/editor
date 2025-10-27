const API_BASE_URL = 'http://localhost:3000/api/v1';

export interface SaveCanvasRequest {
  designData: {
    version: string;
    objects: any[];
    background: string | null;
    width?: number;
    height?: number;
  };
  metadata?: {
    title?: string;
  };
}

export interface GetCanvasResponse {
  success: boolean;
  id: string;
  data: {
    id: string;
    designData: SaveCanvasRequest['designData'];
    metadata?: {
      title?: string;
      createdAt?: string;
      updatedAt?: string;
      version?: string;
    };
  };
}

export interface SaveCanvasResponse {
  success: boolean;
  id: string;
  message: string;
  data?: {
    id: string;
    createdAt?: string;
    updatedAt?: string;
  };
}

/**
 * Save canvas design to backend
 */
export const saveCanvas = async (id: string, request: SaveCanvasRequest): Promise<SaveCanvasResponse> => {
  const response = await fetch(`${API_BASE_URL}/canvas/${id}/save`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Failed to save canvas: ${response.statusText}`);
  }

  return response.json();
};

/**
 * Load canvas design from backend
 */
export const loadCanvas = async (id: string): Promise<GetCanvasResponse> => {
  const response = await fetch(`${API_BASE_URL}/canvas/${id}`);

  if (!response.ok) {
    throw new Error(`Failed to load canvas: ${response.statusText}`);
  }

  return response.json();
};

export interface CanvasListItem {
  _id: string;
  id?: string;
  metadata?: {
    title?: string;
    createdAt?: string;
    updatedAt?: string;
    version?: string;
  };
}

export interface PaginationInfo {
  total: number;
  limit: number;
  offset: number;
}

export interface ListCanvasesResponse {
  success: boolean;
  data: CanvasListItem[];
  pagination?: PaginationInfo;
}

/**
 * List all canvas designs
 */
export const listCanvases = async (limit = 50, offset = 0): Promise<ListCanvasesResponse> => {
  const response = await fetch(`${API_BASE_URL}/canvas?limit=${limit}&offset=${offset}`);

  if (!response.ok) {
    throw new Error(`Failed to list canvases: ${response.statusText}`);
  }

  return response.json();
};

