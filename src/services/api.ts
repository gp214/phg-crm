const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Helper per ottenere l'header di autorizzazione
const getAuthHeaders = (isFormData = false) => {
  const token = localStorage.getItem('phg_token');
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
};

// Funzione helper per gestire il fetch con controllo 401
const fetchAuth = async (url: string, options: RequestInit = {}) => {
  const res = await fetch(url, options);
  if (res.status === 401) {
    // Se non autorizzato, ripulisci il token e forza il logout (ricaricando la pagina)
    localStorage.removeItem('phg_token');
    window.location.reload();
  }
  return res;
};

export interface User {
  id: number;
  name: string;
  email: string;
  avatar_url?: string;
  created_at: string;
}

export interface ProjectMember {
  id: number;
  project_id: number;
  user_id: number;
  role: string;
  created_at: string;
  user?: User;
}

export interface Attachment {
  id: number;
  task_id: number;
  filename: string;
  filepath: string;
  created_at: string;
}

export interface Contact {
  id: number;
  name: string;
  type: 'client' | 'supplier';
  email?: string;
  phone?: string;
  address?: string;
  vat_number?: string;
  created_at: string;
}

export interface Task {
  id: number;
  project_id: number;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
  assignee_id?: number;
  created_at: string;
  updated_at: string;
  assignee?: User;
  attachments?: Attachment[];
}

export interface Project {
  id: number;
  name: string;
  description?: string;
  owner_id: number;
  created_at: string;
  updated_at: string;
  owner?: User;
  tasks?: Task[];
  members?: ProjectMember[];
}

export interface Notice {
  id: number;
  title: string;
  content: string;
  author_id: number;
  created_at: string;
  author?: User;
}

export interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  created_at: string;
  is_read: number;
  sender?: User;
  receiver?: User;
}

export interface EventParticipant {
  id: number;
  event_id: number;
  user_id: number;
  user?: User;
}

export interface CalendarEvent {
  id: number;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  creator_id: number;
  created_at: string;
  creator?: User;
  participants?: EventParticipant[];
}

export const api = {
  // --- AUTENTICAZIONE ---
  async login(email: string, password: string): Promise<{ access_token: string }> {
    const formData = new URLSearchParams();
    formData.append('username', email); // OAuth2 richiede 'username'
    formData.append('password', password);

    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData
    });
    if (!res.ok) throw new Error('Email o password errati');
    return res.json();
  },

  async getCurrentUser(): Promise<User> {
    const res = await fetchAuth(`${API_BASE_URL}/auth/me`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Sessione scaduta');
    return res.json();
  },

  async changePassword(current_password: string, new_password: string): Promise<void> {
    const res = await fetchAuth(`${API_BASE_URL}/users/me/password`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ current_password, new_password })
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Errore durante il cambio password');
    }
  },

  // --- UTENTI ---
  async getUsers(): Promise<User[]> {
    const res = await fetchAuth(`${API_BASE_URL}/users/`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Errore durante il recupero degli utenti');
    return res.json();
  },

  async createUser(name: string, email: string, avatarUrl?: string): Promise<User> {
    const res = await fetchAuth(`${API_BASE_URL}/users/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name, email, avatar_url: avatarUrl, password: 'password123' }) // Password default per semplicità MVP
    });
    if (!res.ok) throw new Error('Errore durante la creazione dell\'utente');
    return res.json();
  },

  async deleteUser(userId: number): Promise<void> {
    const res = await fetchAuth(`${API_BASE_URL}/users/${userId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Errore durante l\'eliminazione dell\'utente');
  },

  async adminResetPassword(userId: number, newPassword: string): Promise<void> {
    // Supponendo esista un endpoint backend per l'admin per resettare la password
    const res = await fetchAuth(`${API_BASE_URL}/users/${userId}/reset-password`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ new_password: newPassword })
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Errore durante il reset della password');
    }
  },

  // --- PROGETTI ---
  async getProjects(): Promise<Project[]> {
    const res = await fetchAuth(`${API_BASE_URL}/projects/`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Errore durante il recupero dei progetti');
    return res.json();
  },

  async getProject(projectId: number): Promise<Project> {
    const res = await fetchAuth(`${API_BASE_URL}/projects/${projectId}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Errore durante il recupero del progetto');
    return res.json();
  },

  async createProject(name: string, description: string, ownerId: number): Promise<Project> {
    const res = await fetchAuth(`${API_BASE_URL}/projects/?owner_id=${ownerId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name, description })
    });
    if (!res.ok) throw new Error('Errore durante la creazione del progetto');
    return res.json();
  },

  async deleteProject(projectId: number): Promise<void> {
    const res = await fetchAuth(`${API_BASE_URL}/projects/${projectId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Errore durante l\'eliminazione del progetto');
  },

  // --- TASK ---
  async getProjectTasks(projectId: number): Promise<Task[]> {
    const res = await fetchAuth(`${API_BASE_URL}/projects/${projectId}/tasks`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Errore durante il recupero dei task');
    return res.json();
  },

  async createTask(projectId: number, task: Partial<Task>): Promise<Task> {
    const res = await fetchAuth(`${API_BASE_URL}/projects/${projectId}/tasks`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        title: task.title,
        description: task.description || '',
        status: task.status || 'todo',
        priority: task.priority || 'medium',
        due_date: task.due_date || null,
        assignee_id: task.assignee_id || null
      })
    });
    if (!res.ok) throw new Error('Errore durante la creazione del task');
    return res.json();
  },

  async updateTask(taskId: number, updates: Partial<Task>): Promise<Task> {
    const res = await fetchAuth(`${API_BASE_URL}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Errore durante l\'aggiornamento del task');
    return res.json();
  },

  async deleteTask(taskId: number): Promise<void> {
    const res = await fetchAuth(`${API_BASE_URL}/tasks/${taskId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Errore durante l\'eliminazione del task');
  },

  // --- ALLEGATI ---
  async uploadAttachment(taskId: number, file: File): Promise<Attachment> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetchAuth(`${API_BASE_URL}/tasks/${taskId}/attachments`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: formData
    });
    if (!res.ok) throw new Error('Errore durante il caricamento dell\'allegato');
    return res.json();
  },

  async deleteAttachment(attachmentId: number): Promise<void> {
    const res = await fetchAuth(`${API_BASE_URL}/attachments/${attachmentId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Errore durante l\'eliminazione dell\'allegato');
  },

  // --- CONTATTI (CLIENTI & FORNITORI) ---
  async getContacts(): Promise<Contact[]> {
    const res = await fetchAuth(`${API_BASE_URL}/contacts/`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Errore durante il recupero dei contatti');
    return res.json();
  },

  async createContact(contact: Partial<Contact>): Promise<Contact> {
    const res = await fetchAuth(`${API_BASE_URL}/contacts/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(contact)
    });
    if (!res.ok) throw new Error('Errore durante la creazione del contatto');
    return res.json();
  },

  async deleteContact(contactId: number): Promise<void> {
    const res = await fetchAuth(`${API_BASE_URL}/contacts/${contactId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Errore durante l\'eliminazione del contatto');
  },

  // --- AVVISI (BACHECA) ---
  async getNotices(): Promise<Notice[]> {
    const res = await fetchAuth(`${API_BASE_URL}/notices/`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Errore durante il recupero degli avvisi');
    return res.json();
  },

  async createNotice(notice: Partial<Notice>): Promise<Notice> {
    const res = await fetchAuth(`${API_BASE_URL}/notices/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(notice)
    });
    if (!res.ok) throw new Error('Errore durante la creazione dell\'avviso');
    return res.json();
  },

  async deleteNotice(noticeId: number): Promise<void> {
    const res = await fetchAuth(`${API_BASE_URL}/notices/${noticeId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Errore durante l\'eliminazione dell\'avviso');
  },

  // --- MESSAGGI (CHAT) ---
  async getMessages(userAId: number, userBId: number): Promise<Message[]> {
    const res = await fetchAuth(`${API_BASE_URL}/messages/${userAId}/${userBId}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Errore durante il recupero dei messaggi');
    return res.json();
  },

  async sendMessage(senderId: number, receiverId: number, content: string): Promise<Message> {
    const res = await fetchAuth(`${API_BASE_URL}/messages/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ sender_id: senderId, receiver_id: receiverId, content })
    });
    if (!res.ok) throw new Error('Errore durante l\'invio del messaggio');
    return res.json();
  },

  // --- CALENDARIO (EVENTI) ---
  async getEvents(): Promise<CalendarEvent[]> {
    const res = await fetchAuth(`${API_BASE_URL}/events/`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Errore durante il recupero degli eventi');
    return res.json();
  },

  async createEvent(eventData: { title: string, description: string, start_time: string, end_time: string, participant_ids: number[] }): Promise<CalendarEvent> {
    const res = await fetchAuth(`${API_BASE_URL}/events/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(eventData)
    });
    if (!res.ok) throw new Error('Errore durante la creazione dell\'evento');
    return res.json();
  },

  async updateEvent(eventId: number, updates: Partial<{ title: string, description: string, start_time: string, end_time: string, participant_ids: number[] }>): Promise<CalendarEvent> {
    const res = await fetchAuth(`${API_BASE_URL}/events/${eventId}`, {
      method: 'PATCH', // Assumiamo una patch per l'aggiornamento parziale
      headers: getAuthHeaders(),
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Errore durante l\'aggiornamento dell\'evento');
    return res.json();
  },

  async deleteEvent(eventId: number): Promise<void> {
    const res = await fetchAuth(`${API_BASE_URL}/events/${eventId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Errore durante l\'eliminazione dell\'evento');
  }
};
