import type { CreateEventData, HealthResponse, PhotoVaultEvent } from '../types';

const API_BASE_URL = '/api';

export async function fetchHealthStatus(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/health`);
  if (!response.ok) {
    throw new Error(`Failed to fetch health status: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export async function fetchEvents(): Promise<PhotoVaultEvent[]> {
  const response = await fetch(`${API_BASE_URL}/events`);
  if (!response.ok) {
    throw new Error(`Failed to fetch events: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export async function fetchEventById(id: number): Promise<PhotoVaultEvent> {
  const response = await fetch(`${API_BASE_URL}/events/${id}`);
  if (!response.ok) {
    throw new Error(`Event not found with ID ${id}`);
  }
  return response.json();
}

export async function fetchEventByCode(accessCode: string): Promise<PhotoVaultEvent> {
  const response = await fetch(`${API_BASE_URL}/events/code/${encodeURIComponent(accessCode.trim().toUpperCase())}`);
  if (!response.ok) {
    throw new Error(`Gallery not found for access code: ${accessCode}`);
  }
  return response.json();
}

export async function createEvent(data: CreateEventData): Promise<PhotoVaultEvent> {
  const response = await fetch(`${API_BASE_URL}/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    if (response.status === 502 || response.status === 503 || response.status === 504) {
      throw new Error('Backend server is unavailable (HTTP ' + response.status + '). Ensure Spring Boot backend is running on port 8080.');
    }
    let message = `Failed to create event: HTTP ${response.status}`;
    try {
      const errorText = await response.text();
      try {
        const json = JSON.parse(errorText);
        message = json.message || json.error || errorText;
      } catch {
        if (errorText && errorText.length < 200) message = errorText;
      }
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return response.json();
}

export async function updateEvent(id: number, data: Partial<CreateEventData>): Promise<PhotoVaultEvent> {
  const response = await fetch(`${API_BASE_URL}/events/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to update event: HTTP ${response.status}`);
  }

  return response.json();
}

export async function deleteEvent(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/events/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`Failed to delete event: HTTP ${response.status}`);
  }
}
