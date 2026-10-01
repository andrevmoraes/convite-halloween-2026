import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { formatarCaminhoImagem, PLACEHOLDER_PROFILE } from '../lib/formatarCaminhoImagem';
import './MuralTile.css';

export default function MuralTile({ usuarioLogado }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const feedRef = useRef(null);
  const inputRef = useRef(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [inputBottom, setInputBottom] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const handle = () => {
      const isOpen = vv.height < window.innerHeight * 0.75;
      setKeyboardOpen(isOpen);
      if (isOpen) setInputBottom(window.innerHeight - vv.height);
      else setInputBottom(0);
    };

    vv.addEventListener('resize', handle);
    return () => vv.removeEventListener('resize', handle);
  }, []);

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('mural')
      .select('id, texto, created_at, id_convidado, convidados(nome, foto_url)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar mural:', error);
    } else {
      setMessages(data || []);
    }
  };

  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel('mural_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mural' }, (payload) => {
        fetchMessages();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !usuarioLogado?.id || isSubmitting) return;

    setIsSubmitting(true);
    const { error } = await supabase
      .from('mural')
      .insert({
        texto: newMessage.trim(),
        id_convidado: usuarioLogado.id
      });

    if (error) {
      console.error('Erro ao postar mensagem no mural:', error);
    } else {
      setNewMessage('');
      await fetchMessages();
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Deseja realmente apagar este recado?")) return;

    const { error } = await supabase
      .from('mural')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir recado:', error);
    } else {
      await fetchMessages();
    }
  };

  const startEdit = (msg) => {
    setEditingId(msg.id);
    setEditContent(msg.texto);
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;

    const { error } = await supabase
      .from('mural')
      .update({ texto: editContent.trim() })
      .eq('id', editingId);

    if (error) {
      console.error('Erro ao atualizar recado:', error);
    } else {
      setEditingId(null);
      setEditContent('');
      await fetchMessages();
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  const formatRelativeTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'agora mesmo';
    if (diffMins < 60) return `há ${diffMins} min`;
    if (diffHours < 24) return `há ${diffHours} h`;
    if (diffDays === 1) return 'ontem';
    if (diffDays < 7) return `há ${diffDays} dias`;

    // Se for mais antigo ou a data for inválida
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="mural-tile">
      <div className="mural-header">
        <h2 className="mural-title">mural</h2>
        <a
          href="https://chat.whatsapp.com/BDC19peviuB0GBOlRKlDoh?s=cl&p=i&mlu=4&ilr=4"
          target="_blank"
          rel="noopener noreferrer"
          className="mural-whatsapp-btn"
        >
          <img src="https://img.icons8.com/windows/96/whatsapp--v1.png" alt="WhatsApp" />
          <span>conversar no whatsapp</span>
        </a>
      </div>
      <div className="mural-feed" ref={feedRef}>
        {messages.map((msg) => {
          const authorName = msg.convidados?.nome?.split(' ')[0] || 'convidado';
          const authorPhoto = msg.convidados?.foto_url;

          return (
            <div key={msg.id} className="mural-message">
              <img
                className="mural-photo"
                src={formatarCaminhoImagem(authorPhoto)}
                alt={`Foto de ${authorName}`}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = PLACEHOLDER_PROFILE;
                }}
              />
              <div className="mural-content">
                <div className="mural-meta">
                  <span className="mural-name">{authorName}</span>
                  <span className="mural-time">{formatRelativeTime(msg.created_at)}</span>
                  {usuarioLogado?.id === msg.id_convidado && (
                    <div className="mural-actions">
                      <button type="button" onClick={() => startEdit(msg)} title="Editar" className="mural-action-btn">
                        <img width="96" height="96" src="https://img.icons8.com/windows/96/edit--v1.png" alt="edit" />
                      </button>
                      <button type="button" onClick={() => handleDelete(msg.id)} title="Excluir" className="mural-action-btn">
                        <img width="96" height="96" src="https://img.icons8.com/windows/96/trash.png" alt="trash" />
                      </button>
                    </div>
                  )}
                </div>
                {editingId === msg.id ? (
                  <div className="mural-edit-area">
                    <input
                      type="text"
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSaveEdit();
                        }
                      }}
                      autoFocus
                    />
                    <div className="mural-edit-actions">
                      <button type="button" onClick={handleSaveEdit}>salvar</button>
                      <button type="button" onClick={cancelEdit}>cancelar</button>
                    </div>
                  </div>
                ) : (
                  <p className="mural-text">{msg.texto}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <form
        className="mural-input-area"
        onSubmit={handleSubmit}
        style={keyboardOpen ? {
          position: 'fixed',
          bottom: inputBottom,
          left: 0,
          right: 0,
          zIndex: 100,
        } : undefined}
      >
        <input
          ref={inputRef}
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="mande um recado..."
          disabled={isSubmitting}
        />
        <button type="submit" disabled={isSubmitting || !newMessage.trim()}>
          <img width="96" height="96" src="https://img.icons8.com/windows/96/sent.png" alt="sent" />
        </button>
      </form>
    </div>
  );
}
