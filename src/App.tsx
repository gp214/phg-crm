import { useState, useEffect, useRef } from 'react';
import { 
  Layers, Plus, Search, Filter, Calendar, User as UserIcon, 
  Clock, Trash2, X, Kanban, List, CheckCircle2, 
  AlertCircle, Sparkles, FolderPlus, Building2, 
  Paperclip, Phone, Mail, MapPin, 
  FileText, Upload, Bell, MessageSquare, Send, ShieldCheck, Lock
} from 'lucide-react';
import { api, Project, Task, User, Contact, Notice, Message } from './services/api';
import { CalendarTab } from './components/Calendar';

function App() {
  // Stati di Autenticazione
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Stati principali
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [view, setView] = useState<'list' | 'kanban'>('list');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Navigazione PHG CRM
  const [currentTab, setCurrentTab] = useState<'projects' | 'contacts' | 'notices' | 'messages' | 'security' | 'calendar'>('projects');

  // Simulazione Utente Attivo
  const [activeUser, setActiveUser] = useState<User | null>(null);

  // Stato Anagrafiche Clienti & Fornitori
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactSearchQuery, setContactSearchQuery] = useState<string>('');
  const [contactTypeFilter, setContactTypeFilter] = useState<'all' | 'client' | 'supplier'>('all');
  const [isNewContactOpen, setIsNewContactOpen] = useState<boolean>(false);

  // Form Nuovo Contatto
  const [newContactName, setNewContactName] = useState<string>('');
  const [newContactType, setNewContactType] = useState<'client' | 'supplier'>('client');
  const [newContactEmail, setNewContactEmail] = useState<string>('');
  const [newContactPhone, setNewContactPhone] = useState<string>('');
  const [newContactAddress, setNewContactAddress] = useState<string>('');
  const [newContactVat, setNewContactVat] = useState<string>('');

  // Filtri e Ricerca Task
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // Gestione modali e input rapidi Task / Progetto / Utente
  const [isNewProjectOpen, setIsNewProjectOpen] = useState<boolean>(false);
  const [newProjName, setNewProjName] = useState<string>('');
  const [newProjDesc, setNewProjDesc] = useState<string>('');
  
  const [isNewUserOpen, setIsNewUserOpen] = useState<boolean>(false);
  const [newUserName, setNewUserName] = useState<string>('');
  const [newUserEmail, setNewUserEmail] = useState<string>('');
  
  const [inlineTaskTitle, setInlineTaskTitle] = useState<string>('');
  const [inlineAssigneeId, setInlineAssigneeId] = useState<string>('');

  // Stato Bacheca Avvisi
  const [notices, setNotices] = useState<Notice[]>([]);
  const [isNewNoticeOpen, setIsNewNoticeOpen] = useState<boolean>(false);
  const [newNoticeTitle, setNewNoticeTitle] = useState<string>('');
  const [newNoticeContent, setNewNoticeContent] = useState<string>('');

  // Stato Messaggistica
  const [activeChatUser, setActiveChatUser] = useState<User | null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [newChatMessage, setNewChatMessage] = useState<string>('');

  // Caricamento allegati
  const [uploading, setUploading] = useState<boolean>(false);

  // Riferimento per lo scroll automatico della chat
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Gestione Sicurezza
  const [secCurrentPassword, setSecCurrentPassword] = useState('');
  const [secNewPassword, setSecNewPassword] = useState('');
  const [secConfirmPassword, setSecConfirmPassword] = useState('');
  const [secError, setSecError] = useState<string | null>(null);
  const [secSuccess, setSecSuccess] = useState<string | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecError(null);
    setSecSuccess(null);
    
    if (secNewPassword !== secConfirmPassword) {
      setSecError('Le nuove password non coincidono');
      return;
    }
    if (secNewPassword.length < 6) {
      setSecError('La nuova password deve essere di almeno 6 caratteri');
      return;
    }

    try {
      await api.changePassword(secCurrentPassword, secNewPassword);
      setSecSuccess('Password aggiornata con successo! Al prossimo accesso usa la nuova password.');
      setSecCurrentPassword('');
      setSecNewPassword('');
      setSecConfirmPassword('');
    } catch (err: any) {
      setSecError(err.message || 'Impossibile aggiornare la password');
    }
  };

  // Caricamento iniziale
  useEffect(() => {
    async function loadInitialData() {
      try {
        setLoading(true);
        // Verifica se c'è un token attivo
        if (localStorage.getItem('phg_token')) {
          try {
            const currentUser = await api.getCurrentUser();
            setActiveUser(currentUser);
            setIsAuthenticated(true);
          } catch (e) {
            // Token non valido o scaduto
            localStorage.removeItem('phg_token');
            setIsAuthenticated(false);
            setLoading(false);
            return;
          }
        } else {
          // Nessun token, utente non autenticato
          setLoading(false);
          return;
        }

        const fetchedUsers = await api.getUsers();
        setUsers(fetchedUsers);

        const fetchedProjects = await api.getProjects();
        setProjects(fetchedProjects);
        
        if (fetchedProjects.length > 0) {
          setSelectedProject(fetchedProjects[0]);
        }

        const fetchedContacts = await api.getContacts();
        setContacts(fetchedContacts);

        const fetchedNotices = await api.getNotices();
        setNotices(fetchedNotices);

        setError(null);
      } catch (err: any) {
        console.error(err);
        setError('Errore di connessione al backend. Assicurati che il server sia in esecuzione.');
      } finally {
        setLoading(false);
      }
    }
    loadInitialData();
  }, []);

  // Ricarica i task quando cambia il progetto selezionato
  useEffect(() => {
    if (!selectedProject) return;
    const projId = selectedProject.id;
    async function loadTasks() {
      try {
        const fetchedTasks = await api.getProjectTasks(projId);
        setTasks(fetchedTasks);
      } catch (err) {
        console.error('Errore nel recupero dei task del progetto:', err);
      }
    }
    loadTasks();
  }, [selectedProject]);

  // Polling dei messaggi in tempo reale e caricamento avvisi quando cambia scheda
  useEffect(() => {
    if (currentTab === 'notices') {
      api.getNotices().then(setNotices).catch(console.error);
    }
  }, [currentTab]);

  // Caricamento chat history e polling
  useEffect(() => {
    if (currentTab !== 'messages' || !activeUser || !activeChatUser) return;

    const loadChat = async () => {
      try {
        const msgs = await api.getMessages(activeUser.id, activeChatUser.id);
        setChatMessages(msgs);
      } catch (err) {
        console.error(err);
      }
    };

    loadChat();
    const interval = setInterval(loadChat, 3000);

    return () => clearInterval(interval);
  }, [currentTab, activeUser, activeChatUser]);

  // Scroll automatico all'ultimo messaggio
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Gestori azioni Progetto
  const handleSelectProject = (project: Project) => {
    setSelectedProject(project);
    setSelectedTask(null);
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim() || users.length === 0) return;
    try {
      const defaultOwnerId = users[0].id;
      const created = await api.createProject(newProjName, newProjDesc, defaultOwnerId);
      setProjects([...projects, created]);
      setSelectedProject(created);
      setNewProjName('');
      setNewProjDesc('');
      setIsNewProjectOpen(false);
    } catch (err) {
      console.error(err);
      alert('Impossibile creare il progetto.');
    }
  };

  const handleDeleteProject = async (projectId: number) => {
    if (!confirm('Sei sicuro di voler eliminare questo progetto? Tutti i task verranno rimossi.')) return;
    try {
      await api.deleteProject(projectId);
      const remaining = projects.filter(p => p.id !== projectId);
      setProjects(remaining);
      setSelectedProject(remaining.length > 0 ? remaining[0] : null);
      setSelectedTask(null);
    } catch (err) {
      console.error(err);
      alert('Errore durante l\'eliminazione del progetto.');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;
    try {
      const avatarUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(newUserName)}`;
      const created = await api.createUser(newUserName, newUserEmail, avatarUrl);
      setUsers([...users, created]);
      setNewUserName('');
      setNewUserEmail('');
      setIsNewUserOpen(false);
    } catch (err: any) {
      console.error(err);
      alert('Impossibile creare il membro del team. Controlla che l\'email non sia già registrata.');
    }
  };

  // Gestori azioni Task
  const handleCreateTaskInline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !inlineTaskTitle.trim()) return;

    try {
      const taskData: Partial<Task> = {
        title: inlineTaskTitle,
        status: 'todo',
        priority: 'medium',
        assignee_id: inlineAssigneeId ? parseInt(inlineAssigneeId) : undefined
      };

      const created = await api.createTask(selectedProject.id, taskData);
      
      if (created.assignee_id) {
        created.assignee = users.find(u => u.id === created.assignee_id);
      }
      
      setTasks([...tasks, created]);
      setInlineTaskTitle('');
      setInlineAssigneeId('');
    } catch (err) {
      console.error(err);
      alert('Impossibile creare il task.');
    }
  };

  const handleUpdateTaskField = async (taskId: number, field: keyof Task, value: any) => {
    try {
      const updates = { [field]: value };
      const updated = await api.updateTask(taskId, updates);
      
      if (updated.assignee_id) {
        updated.assignee = users.find(u => u.id === updated.assignee_id);
      } else {
        updated.assignee = undefined;
      }

      setTasks(tasks.map(t => t.id === taskId ? { ...t, ...updated } : t));
      
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask({ ...selectedTask, ...updated });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    if (!confirm('Eliminare definitivamente questo task?')) return;
    try {
      await api.deleteTask(taskId);
      setTasks(tasks.filter(t => t.id !== taskId));
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask(null);
      }
    } catch (err) {
      console.error(err);
      alert('Errore durante l\'eliminazione del task.');
    }
  };

  // Drag & Drop
  const handleDragStart = (e: React.DragEvent, taskId: number) => {
    e.dataTransfer.setData('text/plain', taskId.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetStatus: 'todo' | 'in_progress' | 'completed') => {
    e.preventDefault();
    const taskIdStr = e.dataTransfer.getData('text/plain');
    if (!taskIdStr) return;
    const taskId = parseInt(taskIdStr);
    handleUpdateTaskField(taskId, 'status', targetStatus);
  };

  // Allegati
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTask) return;
    try {
      setUploading(true);
      const newAttachment = await api.uploadAttachment(selectedTask.id, file);
      
      const updatedTask = {
        ...selectedTask,
        attachments: [...(selectedTask.attachments || []), newAttachment]
      };
      
      setSelectedTask(updatedTask);
      setTasks(tasks.map(t => t.id === selectedTask.id ? updatedTask : t));
    } catch (err) {
      console.error(err);
      alert('Errore durante il caricamento dell\'allegato.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: number) => {
    if (!confirm('Sei sicuro di voler eliminare questo allegato?')) return;
    try {
      await api.deleteAttachment(attachmentId);
      if (selectedTask) {
        const updatedTask = {
          ...selectedTask,
          attachments: (selectedTask.attachments || []).filter(a => a.id !== attachmentId)
        };
        setSelectedTask(updatedTask);
        setTasks(tasks.map(t => t.id === selectedTask.id ? updatedTask : t));
      }
    } catch (err) {
      console.error(err);
      alert('Impossibile eliminare l\'allegato.');
    }
  };

  // Contatti (Anagrafiche)
  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName.trim()) return;

    try {
      const created = await api.createContact({
        name: newContactName,
        type: newContactType,
        email: newContactEmail || undefined,
        phone: newContactPhone || undefined,
        address: newContactAddress || undefined,
        vat_number: newContactVat || undefined
      });
      setContacts([...contacts, created]);
      setNewContactName('');
      setNewContactEmail('');
      setNewContactPhone('');
      setNewContactAddress('');
      setNewContactVat('');
      setIsNewContactOpen(false);
    } catch (err) {
      console.error(err);
      alert('Impossibile creare il contatto.');
    }
  };

  const handleDeleteContact = async (contactId: number) => {
    if (!confirm('Eliminare definitivamente questo contatto?')) return;
    try {
      await api.deleteContact(contactId);
      setContacts(contacts.filter(c => c.id !== contactId));
    } catch (err) {
      console.error(err);
      alert('Impossibile eliminare il contatto.');
    }
  };

  // Bacheca Avvisi
  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoticeTitle.trim() || !newNoticeContent.trim() || !activeUser) return;

    try {
      const created = await api.createNotice({
        title: newNoticeTitle,
        content: newNoticeContent,
        author_id: activeUser.id
      });
      created.author = activeUser;
      setNotices([created, ...notices]);
      setNewNoticeTitle('');
      setNewNoticeContent('');
      setIsNewNoticeOpen(false);
    } catch (err) {
      console.error(err);
      alert('Impossibile creare l\'avviso.');
    }
  };

  const handleDeleteNotice = async (noticeId: number) => {
    if (!confirm('Eliminare questo avviso?')) return;
    try {
      await api.deleteNotice(noticeId);
      setNotices(notices.filter(n => n.id !== noticeId));
    } catch (err) {
      console.error(err);
      alert('Impossibile eliminare l\'avviso.');
    }
  };

  // Messaggistica
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatMessage.trim() || !activeUser || !activeChatUser) return;

    try {
      const sent = await api.sendMessage(activeUser.id, activeChatUser.id, newChatMessage);
      sent.sender = activeUser;
      sent.receiver = activeChatUser;
      setChatMessages([...chatMessages, sent]);
      setNewChatMessage('');
    } catch (err) {
      console.error(err);
      alert('Impossibile inviare il messaggio.');
    }
  };

  // Filtra i task
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (task.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Filtra i contatti
  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = contact.name.toLowerCase().includes(contactSearchQuery.toLowerCase()) ||
                          (contact.email || '').toLowerCase().includes(contactSearchQuery.toLowerCase()) ||
                          (contact.vat_number || '').toLowerCase().includes(contactSearchQuery.toLowerCase());
    const matchesType = contactTypeFilter === 'all' || contact.type === contactTypeFilter;
    return matchesSearch && matchesType;
  });

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <span className="px-2.5 py-1 text-xs font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-full">Alta</span>;
      case 'medium':
        return <span className="px-2.5 py-1 text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-full">Media</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold bg-sky-500/10 text-sky-500 border border-sky-500/20 rounded-full">Bassa</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Completato</span>;
      case 'in_progress':
        return <span className="px-2.5 py-1 text-xs font-semibold bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 rounded-full flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> In Corso</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold bg-slate-500/10 text-slate-500 border border-slate-500/20 rounded-full flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" /> Da Fare</span>;
    }
  };

  const getAvatarInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const getAvatarBg = (name: string) => {
    const colors = ['bg-indigo-600', 'bg-emerald-600', 'bg-rose-600', 'bg-amber-600', 'bg-violet-600', 'bg-sky-600'];
    const charCodeSum = name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return colors[charCodeSum % colors.length];
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    try {
      const res = await api.login(loginEmail, loginPassword);
      localStorage.setItem('phg_token', res.access_token);
      
      const currentUser = await api.getCurrentUser();
      setActiveUser(currentUser);
      setIsAuthenticated(true);
      
      const usersData = await api.getUsers();
      setUsers(usersData);
      const projectsData = await api.getProjects();
      setProjects(projectsData);
      if (projectsData.length > 0) setSelectedProject(projectsData[0]);
      const contactsData = await api.getContacts();
      setContacts(contactsData);
      const noticesData = await api.getNotices();
      setNotices(noticesData);
    } catch (err: any) {
      setLoginError(err.message || 'Errore di accesso');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('phg_token');
    setIsAuthenticated(false);
    setActiveUser(null);
    window.location.reload();
  };

  if (!isAuthenticated && !loading) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] text-slate-200 font-sans flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900/50 border border-slate-800 rounded-2xl p-8 shadow-2xl backdrop-blur-sm">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center mb-4 shadow-lg shadow-brand-500/20">
              <Building2 size={32} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">PHG CRM</h1>
            <p className="text-slate-400 mt-2 text-sm">Accedi alla piattaforma</p>
          </div>
          
          {loginError && (
            <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg text-sm flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Email</label>
              <input
                type="email"
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-slate-200 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all placeholder:text-slate-600"
                placeholder="marco.rossi@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Password</label>
              <input
                type="password"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-slate-200 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all placeholder:text-slate-600"
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-brand-600 hover:bg-brand-500 text-white font-medium py-3 rounded-xl shadow-lg shadow-brand-500/20 transition-all active:scale-95"
            >
              Accedi
            </button>
            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => alert("Per motivi di sicurezza, contatta l'amministratore del sistema o il tuo referente IT per reimpostare la password.")}
                className="text-xs text-brand-400 hover:text-brand-300 font-medium transition-colors"
              >
                Hai dimenticato la password?
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 font-medium">Caricamento in corso...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center space-y-6">
        <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-rose-500" />
        </div>
        <div className="space-y-2 max-w-md">
          <h2 className="text-2xl font-bold">Errore di Connessione</h2>
          <p className="text-slate-400">{error}</p>
        </div>
        <button 
          onClick={() => window.location.reload()} 
          className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 font-semibold transition"
        >
          Riprova a Connetterti
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex relative overflow-hidden font-sans">
      
      {/* SIDEBAR */}
      <aside className="w-72 bg-slate-950 border-r border-slate-800 flex flex-col shrink-0 z-20">
        {/* Brand Header */}
        <div className="h-16 border-b border-slate-800 flex items-center px-6 space-x-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center shadow-md">
            <Building2 className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">PHG CRM</span>
        </div>

        {/* Tab Navigation Switcher */}
        <div className="px-4 py-3 border-b border-slate-800/60 grid grid-cols-2 gap-2">
          <button
            onClick={() => { setCurrentTab('projects'); setSelectedTask(null); }}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition ${
              currentTab === 'projects' 
                ? 'bg-brand-600 text-white shadow-lg' 
                : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> PM
          </button>
          <button
            onClick={() => { setCurrentTab('contacts'); setSelectedTask(null); }}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition ${
              currentTab === 'contacts' 
                ? 'bg-brand-600 text-white shadow-lg' 
                : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" /> CRM
          </button>
          <button
            onClick={() => { setCurrentTab('notices'); setSelectedTask(null); }}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition ${
              currentTab === 'notices' 
                ? 'bg-brand-600 text-white shadow-lg' 
                : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Bell className="w-3.5 h-3.5" /> Bacheca
          </button>
          <button
            onClick={() => { setCurrentTab('messages'); setSelectedTask(null); }}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition ${
              currentTab === 'messages' 
                ? 'bg-brand-600 text-white shadow-lg' 
                : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" /> Chat
          </button>
          <button
            onClick={() => { setCurrentTab('calendar'); setSelectedTask(null); }}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition ${
              currentTab === 'calendar' 
                ? 'bg-brand-600 text-white shadow-lg' 
                : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" /> Calendario
          </button>
          <button
            onClick={() => { setCurrentTab('security'); setSelectedTask(null); }}
            className={`col-span-2 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition ${
              currentTab === 'security' 
                ? 'bg-brand-600 text-white shadow-lg' 
                : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" /> Gestione Sicurezza
          </button>
        </div>

        {/* Dynamic Sidebar Content */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          
          {currentTab === 'projects' && (
            <>
              {/* Projects Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider px-2">
                  <span>Progetti</span>
                  <button 
                    onClick={() => setIsNewProjectOpen(!isNewProjectOpen)}
                    className="hover:text-white transition"
                    title="Crea Nuovo Progetto"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {isNewProjectOpen && (
                  <form onSubmit={handleCreateProject} className="bg-slate-900 border border-slate-800 p-3 rounded-xl space-y-3 mt-2 animate-fadeIn">
                    <input 
                      type="text" 
                      placeholder="Nome Progetto" 
                      value={newProjName}
                      onChange={(e) => setNewProjName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-brand-500 text-white placeholder-slate-500"
                      required
                    />
                    <textarea 
                      placeholder="Descrizione..." 
                      value={newProjDesc}
                      onChange={(e) => setNewProjDesc(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-brand-500 text-white placeholder-slate-500 h-16 resize-none"
                    />
                    <div className="flex justify-end gap-2 text-xs">
                      <button 
                        type="button" 
                        onClick={() => setIsNewProjectOpen(false)}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg"
                      >
                        Annulla
                      </button>
                      <button 
                        type="submit" 
                        className="px-2.5 py-1.5 bg-brand-600 hover:bg-brand-500 rounded-lg font-semibold flex items-center gap-1"
                      >
                        <FolderPlus className="w-3 h-3" /> Crea
                      </button>
                    </div>
                  </form>
                )}

                <div className="space-y-1 mt-2">
                  {projects.map(p => {
                    const isActive = selectedProject?.id === p.id;
                    return (
                      <div 
                        key={p.id}
                        className={`group flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition cursor-pointer ${
                          isActive 
                            ? 'bg-brand-600 text-white shadow-lg' 
                            : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                        }`}
                        onClick={() => handleSelectProject(p)}
                      >
                        <span className="truncate">{p.name}</span>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProject(p.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 hover:text-rose-400 transition"
                          title="Elimina Progetto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Team Members Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider px-2">
                  <span>Membri del Team</span>
                  <button 
                    onClick={() => setIsNewUserOpen(!isNewUserOpen)}
                    className="hover:text-white transition"
                    title="Aggiungi Membro del Team"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {isNewUserOpen && (
                  <form onSubmit={handleCreateUser} className="bg-slate-900 border border-slate-800 p-3 rounded-xl space-y-3 mt-2 animate-fadeIn">
                    <input 
                      type="text" 
                      placeholder="Nome Membro" 
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-brand-500 text-white placeholder-slate-500"
                      required
                    />
                    <input 
                      type="email" 
                      placeholder="Indirizzo Email" 
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-brand-500 text-white placeholder-slate-500"
                      required
                    />
                    <div className="flex justify-end gap-2 text-xs">
                      <button 
                        type="button" 
                        onClick={() => setIsNewUserOpen(false)}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg"
                      >
                        Annulla
                      </button>
                      <button 
                        type="submit" 
                        className="px-2.5 py-1.5 bg-brand-600 hover:bg-brand-500 rounded-lg font-semibold"
                      >
                        Aggiungi
                      </button>
                    </div>
                  </form>
                )}

                <div className="space-y-2">
                  {users.map(u => (
                    <div key={u.id} className="flex items-center space-x-3 px-2">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${getAvatarBg(u.name)}`}>
                        {getAvatarInitials(u.name)}
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-medium text-slate-200">{u.name}</p>
                        <p className="text-[10px] text-slate-500 truncate">{u.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {currentTab === 'contacts' && (
            <>
              {/* Contacts Tab Sidebar Filters */}
              <div className="space-y-4">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2">
                  <span>Filtra Contatti</span>
                </div>
                <div className="space-y-1">
                  <button
                    onClick={() => setContactTypeFilter('all')}
                    className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition flex items-center justify-between ${
                      contactTypeFilter === 'all' 
                        ? 'bg-slate-900 text-brand-400 font-semibold' 
                        : 'text-slate-400 hover:bg-slate-900/60 hover:text-white'
                    }`}
                  >
                    <span>Tutti i Contatti</span>
                    <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded-full text-slate-400">{contacts.length}</span>
                  </button>
                  <button
                    onClick={() => setContactTypeFilter('client')}
                    className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition flex items-center justify-between ${
                      contactTypeFilter === 'client' 
                        ? 'bg-slate-900 text-brand-400 font-semibold' 
                        : 'text-slate-400 hover:bg-slate-900/60 hover:text-white'
                    }`}
                  >
                    <span>Solo Clienti</span>
                    <span className="text-[10px] bg-indigo-950/60 px-1.5 py-0.5 rounded-full text-indigo-400 border border-indigo-900/30">{contacts.filter(c => c.type === 'client').length}</span>
                  </button>
                  <button
                    onClick={() => setContactTypeFilter('supplier')}
                    className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition flex items-center justify-between ${
                      contactTypeFilter === 'supplier' 
                        ? 'bg-slate-900 text-brand-400 font-semibold' 
                        : 'text-slate-400 hover:bg-slate-900/60 hover:text-white'
                    }`}
                  >
                    <span>Solo Fornitori</span>
                    <span className="text-[10px] bg-amber-950/60 px-1.5 py-0.5 rounded-full text-amber-400 border border-amber-900/30">{contacts.filter(c => c.type === 'supplier').length}</span>
                  </button>
                </div>
              </div>

              {/* Statistics Card */}
              <div className="bg-gradient-to-br from-slate-950/40 to-slate-900/20 border border-slate-800/80 rounded-2xl p-4 space-y-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Statistiche Anagrafiche</span>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/40">
                    <p className="text-lg font-extrabold text-white">{contacts.filter(c => c.type === 'client').length}</p>
                    <p className="text-[9px] text-slate-500 font-medium">Clienti</p>
                  </div>
                  <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/40">
                    <p className="text-lg font-extrabold text-white">{contacts.filter(c => c.type === 'supplier').length}</p>
                    <p className="text-[9px] text-slate-500 font-medium">Fornitori</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {currentTab === 'notices' && (
            <div className="space-y-4">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2">
                <span>Azioni Bacheca</span>
              </div>
              <button
                onClick={() => setIsNewNoticeOpen(!isNewNoticeOpen)}
                className="w-full py-2 px-3 bg-brand-600 hover:bg-brand-500 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-brand-500/10"
              >
                <Plus className="w-3.5 h-3.5" /> Pubblica Avviso
              </button>
              <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3.5 text-xs text-slate-400 space-y-2">
                <p className="font-semibold text-slate-300">Bacheca Globale</p>
                <p className="leading-relaxed">Tutti i membri del team possono pubblicare annunci ed avvisi visibili a chiunque all'interno di PHG CRM.</p>
              </div>
            </div>
          )}

          {currentTab === 'messages' && (
            <div className="space-y-4">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2">
                <span>Membri in Chat</span>
              </div>
              {/* Lista Membri in Sidebar per la Chat */}
              <div className="space-y-1.5">
                {users.filter(u => u.id !== activeUser?.id).map(u => {
                  const isActiveChat = activeChatUser?.id === u.id;
                  return (
                    <button
                      key={u.id}
                      onClick={() => setActiveChatUser(u)}
                      className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl transition text-left ${
                        isActiveChat 
                          ? 'bg-slate-900 text-brand-400 font-semibold' 
                          : 'text-slate-400 hover:bg-slate-900/60 hover:text-white'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white ${getAvatarBg(u.name)}`}>
                        {getAvatarInitials(u.name)}
                      </div>
                      <div className="truncate flex-1">
                        <p className="text-xs font-bold leading-tight">{u.name}</p>
                        <p className="text-[10px] text-slate-500 truncate leading-none mt-1">{u.email}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-800 text-center text-xs text-slate-655">
          PHG CRM v0.2.0 (CRM & PM)
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0 z-10">
        
        {/* TOP BAR / HEADER */}
        <header className="h-16 border-b border-slate-800 bg-slate-950/20 backdrop-blur-md flex items-center justify-between px-8 relative shrink-0">
          
          <div className="flex items-center space-x-4">
            {currentTab === 'projects' && (
              <>
                <h2 className="text-xl font-bold tracking-tight text-white">{selectedProject?.name || 'Seleziona un Progetto'}</h2>
                {selectedProject?.description && (
                  <span className="hidden md:inline text-xs text-slate-400 max-w-sm truncate border-l border-slate-800 pl-4">
                    {selectedProject.description}
                  </span>
                )}
              </>
            )}
            {currentTab === 'contacts' && (
              <h2 className="text-xl font-bold tracking-tight text-white">Gestione Clienti & Fornitori</h2>
            )}
            {currentTab === 'notices' && (
              <h2 className="text-xl font-bold tracking-tight text-white">Bacheca Avvisi del Team</h2>
            )}
            {currentTab === 'messages' && (
              <h2 className="text-xl font-bold tracking-tight text-white">Messaggistica Interna</h2>
            )}
            {currentTab === 'security' && (
              <h2 className="text-xl font-bold tracking-tight text-white">Gestione Sicurezza</h2>
            )}
            {currentTab === 'calendar' && (
              <h2 className="text-xl font-bold tracking-tight text-white">Calendario Appuntamenti</h2>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {/* Project View Toggles */}
            {currentTab === 'projects' && (
              <div className="flex items-center bg-slate-950/60 p-1 rounded-xl border border-slate-800">
                <button 
                  onClick={() => setView('list')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    view === 'list' 
                      ? 'bg-slate-850 text-brand-400 shadow-md' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <List className="w-3.5 h-3.5" /> Elenco
                </button>
                <button 
                  onClick={() => setView('kanban')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    view === 'kanban' 
                      ? 'bg-slate-850 text-brand-400 shadow-md' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Kanban className="w-3.5 h-3.5" /> Bacheca
                </button>
              </div>
            )}

            {/* Utente Attivo e Logout */}
            {activeUser && (
              <div className="flex items-center space-x-4 border-l border-slate-800 pl-4">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shadow-md ${getAvatarBg(activeUser.name)}`}>
                    {getAvatarInitials(activeUser.name)}
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-xs font-bold text-white leading-tight">{activeUser.name}</p>
                    <p className="text-[10px] text-slate-400 leading-tight">Utente Attivo</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 bg-slate-800/50 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded-lg border border-slate-700 hover:border-red-500/30 transition-all"
                  title="Esci"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

        </header>

        {/* WORKSPACE & CONTENT AREA */}
        <div className="flex-1 flex overflow-hidden">
          
          {currentTab === 'projects' && (
            /* --- PROJECT WORKSPACE --- */
            <div className="flex-1 flex flex-col overflow-y-auto px-8 py-6 space-y-6">
              
              {/* Action Bar (Filters & Search) */}
              <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-950/20 border border-slate-800/60 p-4 rounded-2xl backdrop-blur-sm">
                <div className="flex items-center space-x-3 flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 text-slate-500" />
                  <input 
                    type="text" 
                    placeholder="Cerca task..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent border-none focus:outline-none text-sm text-white placeholder-slate-500 w-full"
                  />
                </div>

                <div className="flex items-center space-x-3 text-xs">
                  <div className="flex items-center space-x-1 text-slate-400">
                    <Filter className="w-3.5 h-3.5" />
                    <span>Stato:</span>
                  </div>
                  <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-slate-300 focus:outline-none focus:border-brand-500"
                  >
                    <option value="all">Tutti</option>
                    <option value="todo">Da Fare</option>
                    <option value="in_progress">In Corso</option>
                    <option value="completed">Completato</option>
                  </select>

                  <div className="flex items-center space-x-1 text-slate-400">
                    <span>Priorità:</span>
                  </div>
                  <select 
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-slate-300 focus:outline-none focus:border-brand-500"
                  >
                    <option value="all">Tutte</option>
                    <option value="low">Bassa</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                  </select>
                </div>
              </div>

              {selectedProject ? (
                <>
                  {/* --- RENDER LIST VIEW --- */}
                  {view === 'list' && (
                    <div className="bg-slate-950/20 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm shadow-xl">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-800 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-950/40">
                              <th className="px-6 py-4">Titolo Attività</th>
                              <th className="px-6 py-4">Assegnatario</th>
                              <th className="px-6 py-4">Scadenza</th>
                              <th className="px-6 py-4">Priorità</th>
                              <th className="px-6 py-4">Allegati</th>
                              <th className="px-6 py-4">Stato</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60 text-sm">
                            {filteredTasks.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                  Nessun task trovato per questo progetto.
                                </td>
                              </tr>
                            ) : (
                              filteredTasks.map(task => (
                                <tr 
                                  key={task.id}
                                  onClick={() => setSelectedTask(task)}
                                  className={`hover:bg-slate-850/40 transition cursor-pointer group ${selectedTask?.id === task.id ? 'bg-slate-800/30' : ''}`}
                                >
                                  <td className="px-6 py-4 font-semibold text-slate-100 flex items-center gap-3">
                                    <div 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const nextStatus = task.status === 'completed' ? 'todo' : 'completed';
                                        handleUpdateTaskField(task.id, 'status', nextStatus);
                                      }}
                                      className={`w-5 h-5 rounded-full border flex items-center justify-center transition cursor-pointer ${
                                        task.status === 'completed' 
                                          ? 'bg-emerald-500 border-emerald-500 text-white' 
                                          : 'border-slate-600 hover:border-brand-500'
                                      }`}
                                    >
                                      {task.status === 'completed' && <CheckCircle2 className="w-3.5 h-3.5" />}
                                    </div>
                                    <span className={task.status === 'completed' ? 'line-through text-slate-500 font-normal' : ''}>
                                      {task.title}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4">
                                    {task.assignee ? (
                                      <div className="flex items-center space-x-2.5">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] text-white ${getAvatarBg(task.assignee.name)}`}>
                                          {getAvatarInitials(task.assignee.name)}
                                        </div>
                                        <span className="font-medium text-slate-300 text-xs">{task.assignee.name}</span>
                                      </div>
                                    ) : (
                                      <span className="text-slate-600 text-xs font-medium">— Nessuno</span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 text-xs font-semibold text-slate-400">
                                    {task.due_date ? (
                                      <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {task.due_date}</span>
                                    ) : (
                                      <span className="text-slate-600">—</span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4">{getPriorityBadge(task.priority)}</td>
                                  <td className="px-6 py-4">
                                    {task.attachments && task.attachments.length > 0 ? (
                                      <span className="flex items-center gap-1 text-xs text-brand-400 font-semibold">
                                        <Paperclip className="w-3.5 h-3.5" /> {task.attachments.length}
                                      </span>
                                    ) : (
                                      <span className="text-slate-600">—</span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4">{getStatusBadge(task.status)}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Inline Task Creation Footer */}
                      <form onSubmit={handleCreateTaskInline} className="border-t border-slate-800 p-4 bg-slate-950/40 flex flex-wrap items-center gap-3">
                        <input 
                          type="text" 
                          placeholder="+ Aggiungi nuova attività inline..." 
                          value={inlineTaskTitle}
                          onChange={(e) => setInlineTaskTitle(e.target.value)}
                          className="bg-transparent border-none text-sm text-white placeholder-slate-500 focus:outline-none flex-1 min-w-[200px]"
                          required
                        />
                        
                        <select 
                          value={inlineAssigneeId}
                          onChange={(e) => setInlineAssigneeId(e.target.value)}
                          className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-brand-500"
                        >
                          <option value="">Assegna a...</option>
                          {users.map(u => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                          ))}
                        </select>

                        <button 
                          type="submit" 
                          className="px-4 py-1.5 bg-brand-600 hover:bg-brand-500 rounded-lg text-xs font-bold transition flex items-center gap-1"
                        >
                          Aggiungi
                        </button>
                      </form>
                    </div>
                  )}

                  {/* --- RENDER KANBAN VIEW --- */}
                  {view === 'kanban' && (
                    <div className="grid md:grid-cols-3 gap-6 flex-1 items-start">
                      
                      {/* Da Fare Column */}
                      <div 
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, 'todo')}
                        className="bg-slate-950/20 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-4 backdrop-blur-sm min-h-[500px]"
                      >
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                          <span className="font-bold text-sm text-slate-300 tracking-wide uppercase flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                            Da Fare ({filteredTasks.filter(t => t.status === 'todo').length})
                          </span>
                        </div>
                        
                        <div className="flex flex-col gap-3">
                          {filteredTasks.filter(t => t.status === 'todo').map(task => (
                            <div 
                              key={task.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, task.id)}
                              onClick={() => setSelectedTask(task)}
                              className="bg-slate-900 border border-slate-800 p-4 rounded-xl hover:border-slate-700 transition cursor-grab active:cursor-grabbing hover:shadow-lg hover:shadow-black/20"
                            >
                              <h4 className="font-bold text-sm text-slate-100 mb-2 leading-snug">{task.title}</h4>
                              <p className="text-xs text-slate-400 line-clamp-2 mb-4">{task.description || 'Nessuna descrizione.'}</p>
                              
                              <div className="flex items-center justify-between border-t border-slate-800/60 pt-3">
                                {task.assignee ? (
                                  <div className="flex items-center space-x-1.5" title={task.assignee.name}>
                                    <div className={`w-5.5 h-5.5 rounded-full flex items-center justify-center font-bold text-[9px] text-white ${getAvatarBg(task.assignee.name)}`}>
                                      {getAvatarInitials(task.assignee.name)}
                                    </div>
                                    <span className="text-[11px] font-medium text-slate-300 truncate max-w-[80px]">{task.assignee.name.split(' ')[0]}</span>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-slate-650">— Inassegnato</span>
                                )}
                                {getPriorityBadge(task.priority)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* In Corso Column */}
                      <div 
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, 'in_progress')}
                        className="bg-slate-950/20 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-4 backdrop-blur-sm min-h-[500px]"
                      >
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                          <span className="font-bold text-sm text-slate-300 tracking-wide uppercase flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-brand-500 animate-pulse" />
                            In Corso ({filteredTasks.filter(t => t.status === 'in_progress').length})
                          </span>
                        </div>
                        
                        <div className="flex flex-col gap-3">
                          {filteredTasks.filter(t => t.status === 'in_progress').map(task => (
                            <div 
                              key={task.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, task.id)}
                              onClick={() => setSelectedTask(task)}
                              className="bg-slate-900 border border-slate-800 p-4 rounded-xl hover:border-slate-700 transition cursor-grab active:cursor-grabbing hover:shadow-lg hover:shadow-black/20"
                            >
                              <h4 className="font-bold text-sm text-slate-100 mb-2 leading-snug">{task.title}</h4>
                              <p className="text-xs text-slate-400 line-clamp-2 mb-4">{task.description || 'Nessuna descrizione.'}</p>
                              
                              <div className="flex items-center justify-between border-t border-slate-800/60 pt-3">
                                {task.assignee ? (
                                  <div className="flex items-center space-x-1.5" title={task.assignee.name}>
                                    <div className={`w-5.5 h-5.5 rounded-full flex items-center justify-center font-bold text-[9px] text-white ${getAvatarBg(task.assignee.name)}`}>
                                      {getAvatarInitials(task.assignee.name)}
                                    </div>
                                    <span className="text-[11px] font-medium text-slate-300 truncate max-w-[80px]">{task.assignee.name.split(' ')[0]}</span>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-slate-650">— Inassegnato</span>
                                )}
                                {getPriorityBadge(task.priority)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Completato Column */}
                      <div 
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, 'completed')}
                        className="bg-slate-950/20 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-4 backdrop-blur-sm min-h-[500px]"
                      >
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                          <span className="font-bold text-sm text-slate-300 tracking-wide uppercase flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                            Completati ({filteredTasks.filter(t => t.status === 'completed').length})
                          </span>
                        </div>
                        
                        <div className="flex flex-col gap-3">
                          {filteredTasks.filter(t => t.status === 'completed').map(task => (
                            <div 
                              key={task.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, task.id)}
                              onClick={() => setSelectedTask(task)}
                              className="bg-slate-900 border border-slate-800 p-4 rounded-xl hover:border-slate-700 transition cursor-grab active:cursor-grabbing hover:shadow-lg hover:shadow-black/20 opacity-75"
                            >
                              <h4 className="font-bold text-sm text-slate-100 mb-2 leading-snug line-through text-slate-400">{task.title}</h4>
                              <p className="text-xs text-slate-500 line-clamp-2 mb-4">{task.description || 'Nessuna descrizione.'}</p>
                              
                              <div className="flex items-center justify-between border-t border-slate-800/60 pt-3">
                                {task.assignee ? (
                                  <div className="flex items-center space-x-1.5" title={task.assignee.name}>
                                    <div className={`w-5.5 h-5.5 rounded-full flex items-center justify-center font-bold text-[9px] text-white ${getAvatarBg(task.assignee.name)}`}>
                                      {getAvatarInitials(task.assignee.name)}
                                    </div>
                                    <span className="text-[11px] font-medium text-slate-400 truncate max-w-[80px]">{task.assignee.name.split(' ')[0]}</span>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-slate-655">— Inassegnato</span>
                                )}
                                {getPriorityBadge(task.priority)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  )}
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-3">
                  <Sparkles className="w-12 h-12 text-slate-600" />
                  <p>Crea un progetto per iniziare ad inserire le attività.</p>
                </div>
              )}
            </div>
          )}

          {currentTab === 'contacts' && (
            /* --- CONTACTS WORKSPACE --- */
            <div className="flex-1 flex flex-col overflow-y-auto px-8 py-6 space-y-6">
              
              {/* Action Bar Contacts */}
              <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-950/20 border border-slate-800/60 p-4 rounded-2xl backdrop-blur-sm">
                <div className="flex items-center space-x-3 flex-1 min-w-[250px]">
                  <Search className="w-4 h-4 text-slate-500" />
                  <input 
                    type="text" 
                    placeholder="Cerca per nome, email o Partita IVA..." 
                    value={contactSearchQuery}
                    onChange={(e) => setContactSearchQuery(e.target.value)}
                    className="bg-transparent border-none focus:outline-none text-sm text-white placeholder-slate-500 w-full"
                  />
                </div>

                <button
                  onClick={() => setIsNewContactOpen(!isNewContactOpen)}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-brand-500/10"
                >
                  <Plus className="w-4 h-4" /> Nuova Anagrafica
                </button>
              </div>

              {isNewContactOpen && (
                <form onSubmit={handleCreateContact} className="bg-slate-950/40 border border-slate-850 p-6 rounded-2xl space-y-4 animate-fadeIn">
                  <h3 className="text-sm font-bold text-brand-400 uppercase tracking-wider">Aggiungi Contatto</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase">Ragione Sociale / Nome</label>
                      <input 
                        type="text" 
                        value={newContactName}
                        onChange={(e) => setNewContactName(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-brand-500 text-white placeholder-slate-600"
                        placeholder="es. ACME Corporation"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase">Tipologia</label>
                      <select 
                        value={newContactType}
                        onChange={(e) => setNewContactType(e.target.value as 'client' | 'supplier')}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-brand-500 text-slate-350"
                      >
                        <option value="client">Cliente</option>
                        <option value="supplier">Fornitore</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase">Email</label>
                      <input 
                        type="email" 
                        value={newContactEmail}
                        onChange={(e) => setNewContactEmail(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-brand-500 text-white placeholder-slate-600"
                        placeholder="es. info@azienda.it"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase">Telefono</label>
                      <input 
                        type="text" 
                        value={newContactPhone}
                        onChange={(e) => setNewContactPhone(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-brand-500 text-white placeholder-slate-600"
                        placeholder="es. +39 02 123456"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase">Indirizzo</label>
                      <input 
                        type="text" 
                        value={newContactAddress}
                        onChange={(e) => setNewContactAddress(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-brand-500 text-white placeholder-slate-600"
                        placeholder="es. Via Roma 1, Milano"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase">Partita IVA / Codice Fiscale</label>
                      <input 
                        type="text" 
                        value={newContactVat}
                        onChange={(e) => setNewContactVat(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-brand-500 text-white placeholder-slate-600"
                        placeholder="es. IT01234567890"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 text-xs pt-2">
                    <button 
                      type="button" 
                      onClick={() => setIsNewContactOpen(false)}
                      className="px-4 py-2 bg-slate-850 hover:bg-slate-800 rounded-xl font-medium"
                    >
                      Annulla
                    </button>
                    <button 
                      type="submit" 
                      className="px-4 py-2 bg-brand-600 hover:bg-brand-500 rounded-xl font-bold"
                    >
                      Salva Contatto
                    </button>
                  </div>
                </form>
              )}

              {filteredContacts.length === 0 ? (
                <div className="bg-slate-950/20 border border-slate-800 rounded-2xl p-16 text-center text-slate-500 backdrop-blur-sm">
                  <Building2 className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                  <p className="font-semibold text-sm">Nessuna anagrafica trovata.</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredContacts.map(contact => (
                    <div 
                      key={contact.id}
                      className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700/80 transition relative hover:shadow-xl hover:shadow-black/20 group"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          contact.type === 'client' 
                            ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' 
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {contact.type === 'client' ? 'Cliente' : 'Fornitore'}
                        </span>
                        
                        <button
                          onClick={() => handleDeleteContact(contact.id)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 rounded-lg transition"
                          title="Elimina Anagrafica"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <h4 className="font-bold text-white text-base mb-3.5 truncate">{contact.name}</h4>
                      
                      <div className="space-y-2.5 text-xs text-slate-400">
                        {contact.email && (
                          <p className="flex items-center gap-2 truncate">
                            <Mail className="w-3.5 h-3.5 text-slate-500" />
                            <a href={`mailto:${contact.email}`} className="hover:text-brand-400 transition">{contact.email}</a>
                          </p>
                        )}
                        {contact.phone && (
                          <p className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 text-slate-500" />
                            <span>{contact.phone}</span>
                          </p>
                        )}
                        {contact.address && (
                          <p className="flex items-center gap-2 truncate" title={contact.address}>
                            <MapPin className="w-3.5 h-3.5 text-slate-500" />
                            <span>{contact.address}</span>
                          </p>
                        )}
                        {contact.vat_number && (
                          <p className="flex items-center gap-2">
                            <FileText className="w-3.5 h-3.5 text-slate-500" />
                            <span className="font-mono text-[11px] text-slate-500">P.IVA: {contact.vat_number}</span>
                          </p>
                        )}
                      </div>

                      <div className="border-t border-slate-800/40 mt-4 pt-3.5 flex justify-between items-center text-[10px] text-slate-500">
                        <span>Aggiunto il: {new Date(contact.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {currentTab === 'notices' && (
            /* --- NOTICE BOARD WORKSPACE --- */
            <div className="flex-1 flex flex-col overflow-y-auto px-8 py-6 space-y-6">
              
              {isNewNoticeOpen && (
                <form onSubmit={handleCreateNotice} className="bg-slate-950/40 border border-slate-850 p-6 rounded-2xl space-y-4 animate-fadeIn max-w-2xl">
                  <h3 className="text-sm font-bold text-brand-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Bell className="w-4 h-4" /> Pubblica un Avviso in Bacheca
                  </h3>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase">Titolo Avviso</label>
                      <input 
                        type="text" 
                        value={newNoticeTitle}
                        onChange={(e) => setNewNoticeTitle(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-brand-500 text-white placeholder-slate-650"
                        placeholder="es. Chiusura uffici festività o rilascio feature"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase">Contenuto dell'Avviso</label>
                      <textarea 
                        value={newNoticeContent}
                        onChange={(e) => setNewNoticeContent(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-brand-500 text-white placeholder-slate-650 h-32 resize-none"
                        placeholder="Scrivi l'avviso per il team qui..."
                        required
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 text-xs pt-2">
                    <button 
                      type="button" 
                      onClick={() => setIsNewNoticeOpen(false)}
                      className="px-4 py-2 bg-slate-850 hover:bg-slate-800 rounded-xl font-medium"
                    >
                      Annulla
                    </button>
                    <button 
                      type="submit" 
                      className="px-4 py-2 bg-brand-600 hover:bg-brand-500 rounded-xl font-bold"
                    >
                      Pubblica Avviso
                    </button>
                  </div>
                </form>
              )}

              {notices.length === 0 ? (
                <div className="bg-slate-950/20 border border-slate-800 rounded-2xl p-16 text-center text-slate-500 backdrop-blur-sm">
                  <Bell className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                  <p className="font-semibold text-sm">Nessun avviso in bacheca.</p>
                  <p className="text-xs text-slate-600 mt-1">Clicca su "Pubblica Avviso" in sidebar per inserire il primo.</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  {notices.map(notice => (
                    <div 
                      key={notice.id} 
                      className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800/80 rounded-2xl p-6 hover:border-slate-750 transition relative group hover:shadow-xl"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white ${notice.author ? getAvatarBg(notice.author.name) : 'bg-slate-800'}`}>
                            {notice.author ? getAvatarInitials(notice.author.name) : 'A'}
                          </div>
                          <div>
                            <h5 className="text-xs font-bold text-slate-200">{notice.author ? notice.author.name : 'Autore'}</h5>
                            <p className="text-[10px] text-slate-500">{new Date(notice.created_at).toLocaleDateString()} alle {new Date(notice.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                        </div>

                        {activeUser && notice.author_id === activeUser.id && (
                          <button
                            onClick={() => handleDeleteNotice(notice.id)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 rounded-lg transition"
                            title="Elimina Avviso"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <h4 className="font-bold text-white text-base mb-2.5 leading-snug">{notice.title}</h4>
                      <p className="text-sm text-slate-350 leading-relaxed whitespace-pre-wrap">{notice.content}</p>
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}

          {currentTab === 'messages' && (
            /* --- MESSAGES WORKSPACE --- */
            <div className="flex-1 flex overflow-hidden">
              {activeChatUser ? (
                <div className="flex-1 flex flex-col bg-slate-950/15 overflow-hidden">
                  
                  {/* Chat Header */}
                  <div className="h-14 border-b border-slate-800/60 px-6 flex items-center justify-between bg-slate-950/20 shrink-0">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white ${getAvatarBg(activeChatUser.name)}`}>
                        {getAvatarInitials(activeChatUser.name)}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white leading-tight">{activeChatUser.name}</h4>
                        <p className="text-[10px] text-slate-550 leading-none mt-0.5">{activeChatUser.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Message History */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {chatMessages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-600 text-center space-y-2">
                        <MessageSquare className="w-10 h-10 text-slate-800" />
                        <p className="text-xs">Nessun messaggio in questa conversazione.</p>
                        <p className="text-[10px] text-slate-700">Invia il primo messaggio per iniziare la chat.</p>
                      </div>
                    ) : (
                      chatMessages.map(msg => {
                        const isMe = msg.sender_id === activeUser?.id;
                        return (
                          <div 
                            key={msg.id} 
                            className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${
                              isMe 
                                ? 'bg-brand-600 text-white rounded-tr-none' 
                                : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-750/30'
                            }`}>
                              <p className="leading-relaxed">{msg.content}</p>
                              <span className={`block text-[9px] mt-1 text-right ${isMe ? 'text-brand-300' : 'text-slate-500'}`}>
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Message Input Footer */}
                  <form onSubmit={handleSendMessage} className="border-t border-slate-800/80 p-4 bg-slate-950/40 flex items-center gap-3 shrink-0">
                    <input 
                      type="text" 
                      placeholder={`Scrivi un messaggio a ${activeChatUser.name.split(' ')[0]}...`}
                      value={newChatMessage}
                      onChange={(e) => setNewChatMessage(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-650 focus:outline-none focus:border-brand-500"
                      required
                    />
                    <button 
                      type="submit" 
                      className="px-4 py-2.5 bg-brand-600 hover:bg-brand-500 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-brand-500/10 text-white shrink-0"
                    >
                      <span>Invia</span> <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>

                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-4">
                  <div className="w-14 h-14 bg-slate-950/40 border border-slate-850 rounded-2xl flex items-center justify-center shadow-lg text-slate-700">
                    <MessageSquare className="w-7 h-7" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="font-semibold text-sm text-slate-400">Nessuna conversazione selezionata.</p>
                    <p className="text-xs text-slate-600 max-w-xs">Seleziona un membro del team dall'elenco a sinistra per iniziare a scambiare messaggi in sicurezza.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentTab === 'security' && (
            <div className="flex-1 p-8 overflow-y-auto">
              <div className="max-w-2xl mx-auto space-y-6">
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden backdrop-blur-sm">
                  <div className="absolute top-0 right-0 p-8 opacity-5">
                    <ShieldCheck size={120} />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                    <Lock className="text-brand-500" size={20} /> Modifica Password
                  </h3>
                  <p className="text-sm text-slate-400 mb-6">Aggiorna regolarmente la tua password per mantenere sicuro il tuo account.</p>
                  
                  {secError && (
                    <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg text-sm flex items-center gap-2">
                      <AlertCircle size={16} />
                      <span>{secError}</span>
                    </div>
                  )}
                  {secSuccess && (
                    <div className="mb-6 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3 rounded-lg text-sm flex items-center gap-2">
                      <CheckCircle2 size={16} />
                      <span>{secSuccess}</span>
                    </div>
                  )}

                  <form onSubmit={handlePasswordChange} className="space-y-4 relative z-10">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Password Attuale</label>
                      <input
                        type="password"
                        value={secCurrentPassword}
                        onChange={e => setSecCurrentPassword(e.target.value)}
                        className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-slate-200 outline-none focus:border-brand-500 transition-all placeholder:text-slate-700"
                        placeholder="••••••••"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Nuova Password</label>
                      <input
                        type="password"
                        value={secNewPassword}
                        onChange={e => setSecNewPassword(e.target.value)}
                        className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-slate-200 outline-none focus:border-brand-500 transition-all placeholder:text-slate-700"
                        placeholder="••••••••"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Conferma Nuova Password</label>
                      <input
                        type="password"
                        value={secConfirmPassword}
                        onChange={e => setSecConfirmPassword(e.target.value)}
                        className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-slate-200 outline-none focus:border-brand-500 transition-all placeholder:text-slate-700"
                        placeholder="••••••••"
                        required
                      />
                    </div>
                    <div className="pt-4">
                      <button
                        type="submit"
                        className="bg-brand-600 hover:bg-brand-500 text-white font-medium py-2.5 px-6 rounded-xl shadow-lg shadow-brand-500/20 transition-all active:scale-95"
                      >
                        Aggiorna Password
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {currentTab === 'calendar' && (
            <CalendarTab users={users} activeUser={activeUser} />
          )}

          {/* TASK DETAILS SIDE PANEL */}
          {selectedTask && currentTab === 'projects' && (
            <div className="w-96 bg-slate-950 border-l border-slate-800 flex flex-col shrink-0 relative z-10 transition duration-300 ease-in-out shadow-2xl">
              
              {/* Header pannello */}
              <div className="h-16 px-6 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-brand-400 uppercase tracking-wider">Dettaglio Attività</span>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => handleDeleteTask(selectedTask.id)}
                    className="p-1.5 hover:bg-rose-500/10 hover:text-rose-400 text-slate-500 rounded-lg transition"
                    title="Elimina Task"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setSelectedTask(null)}
                    className="p-1.5 hover:bg-slate-900 text-slate-500 rounded-lg transition"
                  >
                    <X className="w-4.5 h-4.5 text-slate-400" />
                  </button>
                </div>
              </div>

              {/* Corpo dettagli */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Titolo */}
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase">Titolo</label>
                  <input 
                    type="text" 
                    value={selectedTask.title} 
                    onChange={(e) => handleUpdateTaskField(selectedTask.id, 'title', e.target.value)}
                    className="w-full bg-transparent border-none text-lg font-bold text-white focus:outline-none focus:ring-1 focus:ring-brand-500 rounded px-1.5 py-1"
                  />
                </div>

                {/* Assegnatario */}
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase flex items-center gap-1">
                    <UserIcon className="w-3 h-3" /> Assegnatario
                  </label>
                  <select 
                    value={selectedTask.assignee_id || ''} 
                    onChange={(e) => {
                      const val = e.target.value ? parseInt(e.target.value) : null;
                      handleUpdateTaskField(selectedTask.id, 'assignee_id', val);
                    }}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-300 focus:outline-none focus:border-brand-500"
                  >
                    <option value="">Inassegnato</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>

                {/* Scadenza */}
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Data Scadenza
                  </label>
                  <input 
                    type="date" 
                    value={selectedTask.due_date || ''} 
                    onChange={(e) => handleUpdateTaskField(selectedTask.id, 'due_date', e.target.value || null)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-sm text-slate-300 focus:outline-none focus:border-brand-500"
                  />
                </div>

                {/* Priorità */}
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase">Priorità</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['low', 'medium', 'high'].map(p => {
                      const isSelected = selectedTask.priority === p;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => handleUpdateTaskField(selectedTask.id, 'priority', p)}
                          className={`py-1.5 rounded-lg text-xs font-semibold border transition ${
                            isSelected 
                              ? p === 'high' 
                                ? 'bg-rose-500/20 border-rose-500 text-rose-300' 
                                : p === 'medium'
                                  ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                                  : 'bg-sky-500/20 border-sky-500 text-sky-300'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {p === 'high' ? 'Alta' : p === 'medium' ? 'Media' : 'Bassa'}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Stato */}
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase">Stato</label>
                  <select 
                    value={selectedTask.status} 
                    onChange={(e) => handleUpdateTaskField(selectedTask.id, 'status', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-300 focus:outline-none focus:border-brand-500"
                  >
                    <option value="todo">Da Fare</option>
                    <option value="in_progress">In Corso</option>
                    <option value="completed">Completato</option>
                  </select>
                </div>

                {/* Descrizione */}
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase">Descrizione</label>
                  <textarea 
                    value={selectedTask.description || ''} 
                    onChange={(e) => handleUpdateTaskField(selectedTask.id, 'description', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-sm text-slate-300 focus:outline-none focus:border-brand-500 h-32 resize-none"
                    placeholder="Aggiungi una descrizione dettagliata del task..."
                  />
                </div>

                {/* Allegati */}
                <div className="space-y-3 border-t border-slate-800/80 pt-4">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase flex items-center gap-1">
                    <Paperclip className="w-3.5 h-3.5 text-slate-500" /> Allegati ({selectedTask.attachments?.length || 0})
                  </label>
                  
                  <div className="space-y-2">
                    {selectedTask.attachments && selectedTask.attachments.length > 0 ? (
                      selectedTask.attachments.map(att => (
                        <div key={att.id} className="flex items-center justify-between bg-slate-900/60 border border-slate-800 p-2.5 rounded-xl text-xs group">
                          <a 
                            href={`${import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:8000'}/uploads/${att.filepath}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="flex items-center gap-2 hover:text-brand-400 transition truncate max-w-[240px]"
                            title="Apri allegato"
                          >
                            <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span className="truncate">{att.filename}</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => handleDeleteAttachment(att.id)}
                            className="text-slate-500 hover:text-rose-400 p-1 rounded transition opacity-0 group-hover:opacity-100"
                            title="Elimina allegato"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-600 italic">Nessun allegato per questa attività.</p>
                    )}
                  </div>

                  <div className="relative mt-2">
                    <input 
                      type="file" 
                      id="attachment-upload"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                    <label 
                      htmlFor="attachment-upload"
                      className={`flex items-center justify-center gap-2 w-full border border-dashed border-slate-800 hover:border-slate-700 hover:bg-slate-900/40 py-3 rounded-xl text-xs text-slate-400 font-semibold cursor-pointer transition ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                      {uploading ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></div>
                          Caricamento...
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5 text-slate-500" />
                          Carica file o documento
                        </>
                      )}
                    </label>
                  </div>
                </div>

              </div>
              
              <div className="p-4 border-t border-slate-800 text-[10px] text-slate-500 flex justify-between">
                <span>Creato il: {new Date(selectedTask.created_at).toLocaleDateString()}</span>
                <span>Aggiornato il: {new Date(selectedTask.updated_at).toLocaleDateString()}</span>
              </div>

            </div>
          )}

        </div>
      </div>
      
    </div>
  );
}

export default App;
