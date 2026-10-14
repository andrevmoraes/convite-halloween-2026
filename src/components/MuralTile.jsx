import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import { formatarCaminhoImagem, PLACEHOLDER_PROFILE } from '../lib/formatarCaminhoImagem';
import { processarImagem } from '../lib/processarImagem';
import './MuralTile.css';

export default function MuralTile({ usuarioLogado }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [newImage, setNewImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageError, setImageError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [selectedStory, setSelectedStory] = useState(null);
  const feedRef = useRef(null);
  const inputRef = useRef(null);
  const stories = messages.filter((message) => message.imagem_url);
  const normalizedUserName = (usuarioLogado?.nome || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const isAdmin = normalizedUserName.includes('andre');

  useEffect(() => {
    if (!selectedStory) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setSelectedStory(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedStory]);

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('mural')
      .select('id, texto, imagem_url, created_at, id_convidado, convidados(nome, foto_url)')
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
    if (!newImage || !usuarioLogado?.id || isSubmitting) return;

    setIsSubmitting(true);
    let imageUrl = null;

    if (newImage) {
      const filePath = `${usuarioLogado.id}/${crypto.randomUUID()}.webp`;
      const { error: uploadError } = await supabase.storage
        .from('mural-images')
        .upload(filePath, newImage, { contentType: 'image/webp' });

      if (uploadError) {
        console.error('Erro ao enviar imagem para o mural:', uploadError);
        setIsSubmitting(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from('mural-images')
        .getPublicUrl(filePath);
      imageUrl = publicUrlData.publicUrl;
    }

    const { error } = await supabase
      .from('mural')
      .insert({
        texto: newMessage.trim() || null,
        imagem_url: imageUrl,
        id_convidado: usuarioLogado.id
      });

    if (error) {
      console.error('Erro ao postar mensagem no mural:', error);
    } else {
      setNewMessage('');
      setNewImage(null);
      setImagePreview(null);
      await fetchMessages();
    }
    setIsSubmitting(false);
  };

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const processedFile = await processarImagem(file, { maxDimension: 1920 });
      setNewImage(processedFile);
      setImagePreview(URL.createObjectURL(processedFile));
      setImageError('');
    } catch (error) {
      console.error('Erro ao processar a imagem do mural:', error);
      setNewImage(null);
      setImagePreview(null);
      setImageError('não foi possível processar essa imagem.');
      return;
    }
  };

  const handleRemoveImage = () => {
    setNewImage(null);
    setImagePreview(null);
    setImageError('');
  };

  const handleDelete = async (id) => {
    const message = messages.find((item) => item.id === id);
    const canManage = isAdmin || message?.id_convidado === usuarioLogado?.id;
    if (!canManage) return;

    if (!window.confirm("Deseja realmente apagar este recado?")) return;

    const { error } = await supabase
      .from('mural')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir recado:', error);
    } else {
      if (selectedStory?.id === id) {
        setSelectedStory(null);
      }
      await fetchMessages();
    }
  };

  const startEdit = (msg) => {
    const canManage = isAdmin || msg.id_convidado === usuarioLogado?.id;
    if (!canManage) return;

    setEditingId(msg.id);
    setEditContent(msg.texto || '');
  };

  const handleSaveEdit = async () => {
    const message = messages.find((item) => item.id === editingId);
    const canManage = isAdmin || message?.id_convidado === usuarioLogado?.id;
    if (!canManage) return;
    const updatedCaption = editContent.trim() || null;

    const { error } = await supabase
      .from('mural')
      .update({ texto: updatedCaption })
      .eq('id', editingId);

    if (error) {
      console.error('Erro ao atualizar recado:', error);
    } else {
      setMessages((currentMessages) =>
        currentMessages.map((item) =>
          item.id === editingId ? { ...item, texto: updatedCaption } : item
        )
      );
      setSelectedStory((currentStory) =>
        currentStory?.id === editingId
          ? { ...currentStory, texto: updatedCaption }
          : currentStory
      );
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

  const handleStoriesWheel = (event) => {
    const feed = feedRef.current;
    if (!feed || feed.scrollWidth <= feed.clientWidth) return;

    if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
      feed.scrollLeft += event.deltaY;
    }
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
      <div className="mural-feed" ref={feedRef} onWheel={handleStoriesWheel}>
        {stories.length === 0 ? (
          <div className="mural-empty">
            <span className="mural-empty__mark">+</span>
            <span>as fotos da festa aparecerão aqui</span>
          </div>
        ) : (
          <div className="mural-stories" aria-label="Stories publicados no mural">
            {stories.map((msg) => {
          const authorName = msg.convidados?.nome?.split(' ')[0] || 'convidado';
          const authorPhoto = msg.convidados?.foto_url;

          return (
            <article key={msg.id} className="mural-story">
              <div className="mural-story__image-wrap">
                <button
                  type="button"
                  className="mural-story__image-button"
                  onClick={() => setSelectedStory(msg)}
                  aria-label={`Abrir story de ${authorName}`}
                >
                  <img
                    className="mural-story__image"
                    src={msg.imagem_url}
                    alt={`Story de ${authorName}`}
                  />
                  {msg.texto && (
                    <span className="mural-story__caption" title={msg.texto}>
                      {msg.texto}
                    </span>
                  )}
                </button>
              </div>
              <div className="mural-story__info">
                <img
                  className="mural-story__avatar"
                  src={formatarCaminhoImagem(authorPhoto)}
                  alt=""
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = PLACEHOLDER_PROFILE;
                  }}
                />
                <div>
                  <strong className="mural-story__name">{authorName}</strong>
                  <span className="mural-story__time">{formatRelativeTime(msg.created_at)}</span>
                </div>
              </div>
            </article>
          );
            })}
          </div>
        )}
      </div>

      {selectedStory && createPortal(
        <div
          className="mural-story-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Visualização do story"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedStory(null);
            }
          }}
        >
          <div className="mural-story-modal__content">
            <button
              type="button"
              className="mural-story-modal__close"
              onClick={() => setSelectedStory(null)}
              aria-label="Fechar story"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 32 32"
                aria-hidden="true"
              >
                <path d="M 7.21875 5.78125 L 5.78125 7.21875 L 14.5625 16 L 5.78125 24.78125 L 7.21875 26.21875 L 16 17.4375 L 24.78125 26.21875 L 26.21875 24.78125 L 17.4375 16 L 26.21875 7.21875 L 24.78125 5.78125 L 16 14.5625 Z" />
              </svg>
            </button>
            <img
              className="mural-story-modal__image"
              src={selectedStory.imagem_url}
              alt={`Foto publicada por ${selectedStory.convidados?.nome?.split(' ')[0] || 'convidado'}`}
            />
            {editingId === selectedStory.id ? (
              <div className="mural-story-modal__edit-area">
                <input
                  type="text"
                  value={editContent}
                  onChange={(event) => setEditContent(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') handleSaveEdit();
                  }}
                  autoFocus
                  aria-label="Editar legenda"
                />
                <div className="mural-edit-actions">
                  <button type="button" onClick={handleSaveEdit}>salvar</button>
                  <button type="button" onClick={cancelEdit}>cancelar</button>
                </div>
              </div>
            ) : selectedStory.texto ? (
              <p className="mural-story-modal__caption">{selectedStory.texto}</p>
            ) : null}
            {(isAdmin || usuarioLogado?.id === selectedStory.id_convidado) && (
              <div className="mural-story-modal__actions">
                <button
                  type="button"
                  onClick={() => startEdit(selectedStory)}
                  className="mural-story-modal__action"
                >
                  editar legenda
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(selectedStory.id)}
                  className="mural-story-modal__action mural-story-modal__action--danger"
                >
                  excluir story
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      <form
        className={`mural-input-area${newImage ? '' : ' mural-input-area--empty'}`}
        onSubmit={handleSubmit}
      >
        {!newImage ? (
          <label className="mural-story-picker" title="Postar um story">
            <input type="file" accept="image/*" onChange={handleImageChange} disabled={isSubmitting} />
            <svg viewBox="0 0 32 32" aria-hidden="true">
              <path d="M 11.5 6 L 11.1875 6.40625 L 10 8 L 3 8 L 3 26 L 29 26 L 29 8 L 22 8 L 20.8125 6.40625 L 20.5 6 Z M 12.5 8 L 19.5 8 L 20.6875 9.59375 L 21 10 L 27 10 L 27 24 L 5 24 L 5 10 L 11 10 L 11.3125 9.59375 Z M 8 11 C 7.449219 11 7 11.449219 7 12 C 7 12.550781 7.449219 13 8 13 C 8.550781 13 9 12.550781 9 12 C 9 11.449219 8.550781 11 8 11 Z M 16 11 C 12.699219 11 10 13.699219 10 17 C 10 20.300781 12.699219 23 16 23 C 19.300781 23 22 20.300781 22 17 C 22 13.699219 19.300781 11 16 11 Z M 16 13 C 18.222656 13 20 14.777344 20 17 C 20 19.222656 18.222656 21 16 21 C 13.777344 21 12 19.222656 12 17 C 12 14.777344 13.777344 13 16 13 Z" />
            </svg>
            <span>postar um story</span>
            {imageError && <span className="mural-image-error" role="alert">{imageError}</span>}
          </label>
        ) : (
          <>
          <button
            type="button"
            className="mural-image-picker"
            title="Excluir foto"
            onClick={handleRemoveImage}
            disabled={isSubmitting}
            aria-label="Excluir foto selecionada"
          >
            <svg viewBox="0 0 32 32" aria-hidden="true">
              <path d="M 14 4 C 12.841 4 12 4.841 12 6 L 12 7 L 6 7 L 6 9 L 7 9 L 7 25 C 7 26.654 8.346 28 10 28 L 19.771484 28 L 21.771484 26 L 10 26 C 9.449 26 9 25.552 9 25 L 9 9 L 23 9 L 23 18.671875 L 25 20.671875 L 25 9 L 26 9 L 26 7 L 20 7 L 20 6 C 20 4.841 19.159 4 18 4 L 14 4 z M 14 6 L 18 6 L 18 7 L 14 7 L 14 6 z M 11 12 L 11 23 L 13 23 L 13 12 L 11 12 z M 15 12 L 15 23 L 17 23 L 17 12 L 15 12 z M 19 12 L 19 19.472656 L 21 17.472656 L 21 12 L 19 12 z M 21.400391 19.900391 L 20 21.300781 L 24.650391 25.949219 L 20 30.599609 L 21.400391 32 L 26.050781 27.349609 L 30.599609 31.900391 L 32 30.5 L 27.449219 25.949219 L 32 21.400391 L 30.599609 20 L 26.050781 24.550781 z" />
            </svg>
          </button>
        <div className="mural-compose-fields">
          {imagePreview && (
            <img className="mural-image-preview" src={imagePreview} alt="Pré-visualização da foto" />
          )}
          {imageError && <p className="mural-image-error" role="alert">{imageError}</p>}
          <input
            ref={inputRef}
            className="mural-caption-input"
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={imagePreview ? 'adicione uma legenda...' : 'mande um recado...'}
            disabled={isSubmitting}
          />
        </div>
        <button type="submit" disabled={isSubmitting || !newImage}>
          <img width="96" height="96" src="https://img.icons8.com/windows/96/sent.png" alt="sent" />
        </button>
          </>
        )}
      </form>
    </div>
  );
}
