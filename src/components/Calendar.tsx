import React, { useState, useEffect } from 'react';
import { api, CalendarEvent, User } from '../services/api';
import { ChevronLeft, ChevronRight, Plus, Users, X, Calendar as CalendarIcon } from 'lucide-react';

interface CalendarProps {
  users: User[];
  activeUser: User | null;
}

export function CalendarTab({ users, activeUser }: CalendarProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dateStr, setDateStr] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [participantIds, setParticipantIds] = useState<number[]>([]);

  const loadEvents = async () => {
    try {
      const fetched = await api.getEvents();
      setEvents(fetched);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const start = new Date(`${dateStr}T${startTime}:00`).toISOString();
      const end = new Date(`${dateStr}T${endTime}:00`).toISOString();
      await api.createEvent({
        title,
        description,
        start_time: start,
        end_time: end,
        participant_ids: participantIds
      });
      setIsModalOpen(false);
      setTitle('');
      setDescription('');
      setParticipantIds([]);
      loadEvents();
    } catch (err) {
      alert("Errore nella creazione dell'evento");
    }
  };

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));

  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => {
    let day = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    // Adattiamo a lunedì come primo giorno
    return day === 0 ? 6 : day - 1; 
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  
  const monthName = currentDate.toLocaleString('it-IT', { month: 'long', year: 'numeric' });
  const monthNameCapitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  // Helper per filtrare gli eventi di un giorno
  const getEventsForDay = (day: number) => {
    return events.filter(ev => {
      const evDate = new Date(ev.start_time);
      return evDate.getDate() === day && 
             evDate.getMonth() === currentDate.getMonth() && 
             evDate.getFullYear() === currentDate.getFullYear();
    }).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  };

  const toggleParticipant = (id: number) => {
    if (participantIds.includes(id)) {
      setParticipantIds(participantIds.filter(pid => pid !== id));
    } else {
      setParticipantIds([...participantIds, id]);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950/20">
      {/* Header Calendario */}
      <div className="p-6 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-slate-900 rounded-xl border border-slate-800 p-1">
            <button onClick={prevMonth} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition">
              <ChevronLeft size={18} />
            </button>
            <span className="px-4 font-bold text-white w-48 text-center">{monthNameCapitalized}</span>
            <button onClick={nextMonth} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition">
              <ChevronRight size={18} />
            </button>
          </div>
          <button 
            onClick={() => setCurrentDate(new Date())}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-sm font-semibold text-slate-300 rounded-xl border border-slate-800 transition"
          >
            Oggi
          </button>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-5 py-2.5 rounded-xl font-medium transition shadow-lg shadow-brand-500/20 active:scale-95"
        >
          <Plus size={18} /> Nuovo Impegno
        </button>
      </div>

      {/* Griglia Calendario */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="grid grid-cols-7 gap-px bg-slate-800 rounded-2xl overflow-hidden border border-slate-800">
          {/* Intestazioni Giorni */}
          {['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'].map(day => (
            <div key={day} className="bg-slate-900 p-3 text-center">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{day}</span>
            </div>
          ))}

          {/* Celle Vuote */}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="bg-slate-950/50 min-h-[120px] p-2" />
          ))}

          {/* Giorni del Mese */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dayEvents = getEventsForDay(day);
            const isToday = 
              day === new Date().getDate() && 
              currentDate.getMonth() === new Date().getMonth() && 
              currentDate.getFullYear() === new Date().getFullYear();

            return (
              <div key={day} className={`bg-slate-900 min-h-[120px] p-2 border-t border-slate-800/50 relative group transition hover:bg-slate-800/50`}>
                <div className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold mb-2 ${isToday ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20' : 'text-slate-400'}`}>
                  {day}
                </div>
                
                <div className="space-y-1 overflow-y-auto max-h-[80px] scrollbar-hide">
                  {dayEvents.map(ev => {
                    const isBusy = ev.title.startsWith("Occupato");
                    return (
                      <div 
                        key={ev.id} 
                        className={`text-[10px] px-2 py-1.5 rounded-lg truncate cursor-default border ${
                          isBusy 
                            ? 'bg-slate-800/50 text-slate-400 border-slate-700/50' 
                            : 'bg-brand-500/10 text-brand-300 border-brand-500/20 font-medium'
                        }`}
                        title={isBusy ? ev.title : `${ev.title} (${new Date(ev.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})})`}
                      >
                        <span className="mr-1 opacity-70">
                          {new Date(ev.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                        {ev.title}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal Nuovo Evento */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between shrink-0">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <CalendarIcon className="text-brand-500" size={20} /> Nuovo Impegno
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white transition">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreate} className="p-6 overflow-y-auto space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Titolo</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-slate-200 outline-none focus:border-brand-500 transition"
                  placeholder="Es. Riunione Team"
                  required
                />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Descrizione</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-slate-200 outline-none focus:border-brand-500 transition min-h-[80px]"
                  placeholder="Dettagli opzionali..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Data</label>
                  <input
                    type="date"
                    value={dateStr}
                    onChange={e => setDateStr(e.target.value)}
                    className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-slate-200 outline-none focus:border-brand-500 transition"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Inizio</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={e => setStartTime(e.target.value)}
                      className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-slate-200 outline-none focus:border-brand-500 transition"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Fine</label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={e => setEndTime(e.target.value)}
                      className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-slate-200 outline-none focus:border-brand-500 transition"
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Users size={14} /> Invita Membri (Opzionale)
                </label>
                <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-2 max-h-40 overflow-y-auto space-y-1">
                  {users.filter(u => u.id !== activeUser?.id).map(user => (
                    <label key={user.id} className="flex items-center p-2 hover:bg-slate-800/50 rounded-lg cursor-pointer transition">
                      <input 
                        type="checkbox"
                        checked={participantIds.includes(user.id)}
                        onChange={() => toggleParticipant(user.id)}
                        className="w-4 h-4 rounded border-slate-700 text-brand-500 focus:ring-brand-500 focus:ring-offset-slate-900 bg-slate-900"
                      />
                      <span className="ml-3 text-sm text-slate-300">{user.name}</span>
                    </label>
                  ))}
                  {users.filter(u => u.id !== activeUser?.id).length === 0 && (
                    <p className="text-xs text-slate-500 text-center py-2">Nessun altro membro disponibile.</p>
                  )}
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-medium text-slate-400 hover:text-white transition"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-xl transition shadow-lg shadow-brand-500/20 active:scale-95"
                >
                  Salva Impegno
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
