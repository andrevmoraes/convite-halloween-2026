import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import { formatarCaminhoImagem, PLACEHOLDER_PROFILE } from '../lib/formatarCaminhoImagem';
import { processarImagem } from '../lib/processarImagem';
import './MuralTile.css';

const STORY_DURATION = 5000;

export default function MuralTile({ usuarioLogado }) {
  const [messages, setMessages] = useState([]);
  const [newImage, setNewImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageError, setImageError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(null);
  const [storyProgress, setStoryProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [slideDirection, setSlideDirection] = useState('next');
  const [prevStoryUrl, setPrevStoryUrl] = useState(null);
  const [isUiHidden, setIsUiHidden] = useState(false);

  const feedRef = useRef(null);
  const fileInputRef = useRef(null);
  const isPausedRef = useRef(false);
  const hideUiTimeoutRef = useRef(null);
  const pointerStartRef = useRef({ x: 0, y: 0, time: 0 });
  const isDraggingRef = useRef(false);
  const dragOffsetYRef = useRef(0);
  const elapsedTimeRef = useRef(0);

  const stories = messages.filter((message) => message.imagem_url);
  const normalizedUserName = (usuarioLogado?.nome || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const isAdmin =
    normalizedUserName.includes('andre') ||
    String(usuarioLogado?.telefone || '').includes('997132723');

  const selectedStory = selectedStoryIndex !== null ? stories[selectedStoryIndex] : null;

  useEffect(() => {
    if (selectedStory?.imagem_url) {
      setPrevStoryUrl((current) => current || selectedStory.imagem_url);
    }
  }, [selectedStory?.imagem_url]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Reseta o progresso e o tempo decorrido ao trocar de story
  useEffect(() => {
    elapsedTimeRef.current = 0;
    setStoryProgress(0);
    if (hideUiTimeoutRef.current) {
      clearTimeout(hideUiTimeoutRef.current);
      hideUiTimeoutRef.current = null;
    }
    setIsUiHidden(false);
  }, [selectedStoryIndex]);

  // Pré-carrega as imagens vizinhas para que a transição e o blur sejam instantâneos
  useEffect(() => {
    if (selectedStoryIndex === null) return;

    const urls = [
      stories[selectedStoryIndex + 1]?.imagem_url,
      stories[selectedStoryIndex - 1]?.imagem_url,
    ].filter(Boolean);

    urls.forEach((url) => {
      const img = new Image();
      img.src = url;
    });
  }, [selectedStoryIndex, stories]);

  // Temporizador de 5 segundos por story com suporte a pausa
  useEffect(() => {
    if (selectedStoryIndex === null) return undefined;

    let animationFrameId;
    let lastTime = performance.now();

    const tick = (now) => {
      const delta = now - lastTime;
      lastTime = now;

      if (!isPausedRef.current) {
        elapsedTimeRef.current += delta;
        const currentProgress = (elapsedTimeRef.current / STORY_DURATION) * 100;

        if (currentProgress >= 100) {
          elapsedTimeRef.current = 0;
          setStoryProgress(0);
          setSlideDirection('next');
          setSelectedStoryIndex((currentIdx) => {
            if (currentIdx !== null && currentIdx < stories.length - 1) {
              return currentIdx + 1;
            }
            return null; // Fecha ao finalizar o último story
          });
          return; // Para o loop deste story; o novo selectedStoryIndex iniciará o próximo
        }

        setStoryProgress(currentProgress);
      }

      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [selectedStoryIndex, stories.length]);

  // Navegação por teclado no Story Viewer
  useEffect(() => {
    if (selectedStoryIndex === null) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setSelectedStoryIndex(null);
      } else if (event.key === 'ArrowRight') {
        setSlideDirection('next');
        setSelectedStoryIndex((prev) => (prev < stories.length - 1 ? prev + 1 : null));
      } else if (event.key === 'ArrowLeft') {
        setSlideDirection('prev');
        setSelectedStoryIndex((prev) => (prev > 0 ? prev - 1 : prev));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedStoryIndex, stories.length]);

  const handlePointerDown = (event) => {
    if (event.button !== undefined && event.button !== 0) return;

    try {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    } catch (e) {
      // Ignora caso o navegador não suporte pointer capture
    }

    pointerStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      time: Date.now(),
    };
    isDraggingRef.current = false;
    dragOffsetYRef.current = 0;
    setDragOffsetY(0);
    setIsPaused(true);

    // Inicia temporizador de 3 segundos para sumir o nome/controles com fadeout
    if (hideUiTimeoutRef.current) clearTimeout(hideUiTimeoutRef.current);
    hideUiTimeoutRef.current = setTimeout(() => {
      setIsUiHidden(true);
    }, 3000);
  };

  const handlePointerMove = (event) => {
    if (!pointerStartRef.current.time) return;

    const deltaY = event.clientY - pointerStartRef.current.y;
    const deltaX = event.clientX - pointerStartRef.current.x;

    // Detecta intenção de arrastar para baixo (pelo menos 8px para baixo e mais vertical que horizontal)
    if (deltaY > 8 && Math.abs(deltaY) > Math.abs(deltaX)) {
      if (hideUiTimeoutRef.current) {
        clearTimeout(hideUiTimeoutRef.current);
        hideUiTimeoutRef.current = null;
      }
      isDraggingRef.current = true;
      setIsDragging(true);
      const boundedY = Math.max(0, deltaY);
      dragOffsetYRef.current = boundedY;
      setDragOffsetY(boundedY);
    }
  };

  const handlePointerUp = (event, isRightSide) => {
    try {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    } catch (e) {
      // Ignora caso não suporte
    }

    const startTime = pointerStartRef.current.time;
    pointerStartRef.current.time = 0;

    const holdDuration = Date.now() - startTime;
    const currentOffsetY = dragOffsetYRef.current;
    const wasDragging = isDraggingRef.current;

    if (hideUiTimeoutRef.current) {
      clearTimeout(hideUiTimeoutRef.current);
      hideUiTimeoutRef.current = null;
    }
    setIsUiHidden(false);
    setIsPaused(false);
    isDraggingRef.current = false;
    setIsDragging(false);

    // Se arrastou para baixo por mais de 80px, fecha o story!
    if (wasDragging && currentOffsetY > 80) {
      setDragOffsetY(0);
      setSelectedStoryIndex(null);
      return;
    }

    // Se arrastou menos de 80px, restaura para o topo
    if (wasDragging) {
      setDragOffsetY(0);
      return;
    }

    setDragOffsetY(0);

    // Se foi apenas um toque rápido (sem arrasto significativo e menos de 400ms)
    if (!wasDragging && holdDuration < 400) {
      if (isRightSide) {
        setSlideDirection('next');
        setSelectedStoryIndex((prev) => {
          if (prev !== null && prev < stories.length - 1) {
            return prev + 1;
          }
          return null; // Fecha ao finalizar/passar do último story
        });
      } else {
        setSlideDirection('prev');
        setSelectedStoryIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
        setStoryProgress(0);
      }
    }
  };

  const handlePointerCancel = (event) => {
    try {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    } catch (e) {
      // Ignora
    }
    if (hideUiTimeoutRef.current) {
      clearTimeout(hideUiTimeoutRef.current);
      hideUiTimeoutRef.current = null;
    }
    setIsUiHidden(false);
    pointerStartRef.current.time = 0;
    isDraggingRef.current = false;
    setIsDragging(false);
    setDragOffsetY(0);
    setIsPaused(false);
  };

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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mural' }, () => {
        fetchMessages();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const processedFile = await processarImagem(file, { maxDimension: 1920 });
      setNewImage(processedFile);
      setImagePreview(URL.createObjectURL(processedFile));
      setImageError('');
    } catch (error) {
      console.error('Erro ao processar imagem do mural:', error);
      setNewImage(null);
      setImagePreview(null);
      setImageError('não foi possível processar essa imagem.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCancelPreview = () => {
    if (isSubmitting) return;
    setNewImage(null);
    setImagePreview(null);
    setImageError('');
  };

  const handleSubmit = async () => {
    if (!newImage || !usuarioLogado?.id || isSubmitting) return;

    setIsSubmitting(true);
    setImageError('');
    let imageUrl = null;

    try {
      const filePath = `${usuarioLogado.id}/${crypto.randomUUID()}.webp`;
      const { error: uploadError } = await supabase.storage
        .from('mural-images')
        .upload(filePath, newImage, { contentType: 'image/webp' });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage
        .from('mural-images')
        .getPublicUrl(filePath);
      imageUrl = publicUrlData.publicUrl;

      const { error: insertError } = await supabase
        .from('mural')
        .insert({
          texto: null,
          imagem_url: imageUrl,
          id_convidado: usuarioLogado.id,
        });

      if (insertError) {
        throw insertError;
      }

      setNewImage(null);
      setImagePreview(null);
      await fetchMessages();
    } catch (err) {
      console.error('Erro ao publicar story no mural:', err);
      setImageError('erro ao enviar story. tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    const story = stories.find((item) => item.id === id);
    const canManage = isAdmin || story?.id_convidado === usuarioLogado?.id;
    if (!canManage) return;

    if (!window.confirm('Deseja realmente apagar este story?')) return;

    const { error } = await supabase
      .from('mural')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir recado:', error);
    } else {
      setSelectedStoryIndex((prev) => {
        if (prev === null) return null;
        if (stories.length <= 1) return null;
        if (prev >= stories.length - 1) return stories.length - 2;
        return prev;
      });
      await fetchMessages();
    }
  };

  const formatRelativeTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60000);

    if (diffMinutes < 1) return 'agora';
    if (diffMinutes < 60) return `há ${diffMinutes} min`;
    if (diffMinutes < 1440) return `há ${Math.floor(diffMinutes / 60)} h`;
    return `há ${Math.floor(diffMinutes / 1440)} d`;
  };

  const handleStoriesWheel = (event) => {
    const feed = feedRef.current;
    if (!feed || feed.scrollWidth <= feed.clientWidth) return;

    if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
      feed.scrollLeft += event.deltaY;
    }
  };

  const agora = new Date();
  const isDiaDaFestaOuDepois =
    (agora.getFullYear() === 2026 && agora.getMonth() === 9 && agora.getDate() >= 17) ||
    agora.getFullYear() > 2026 ||
    (agora.getFullYear() === 2026 && agora.getMonth() > 9);

  // O mural fica visível para o André sempre, e para os outros apenas no dia da festa (17 de outubro) em diante
  if (!isAdmin && !isDiaDaFestaOuDepois) {
    return null;
  }

  return (
    <div className="mural-tile">
      {/* Input de arquivo invisível acionado pelo card de ação */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageChange}
        style={{ display: 'none' }}
        tabIndex={-1}
        aria-hidden="true"
      />

      <div className="mural-header">
        <div className="mural-header__title-group">
          <h2 className="mural-title">mural</h2>
          <span className="mural-header__count">
            {stories.length === 0
              ? 'nenhuma foto ainda'
              : `${stories.length} ${stories.length === 1 ? 'story' : 'stories'}`}
          </span>
        </div>
      </div>

      <div className="mural-feed" ref={feedRef} onWheel={handleStoriesWheel}>
        {/* Card 1: Tile de Ação "+ postar story" */}
        <article className="mural-story-card mural-story-card--action">
          <button
            type="button"
            className="mural-story-card__button mural-story-add-card"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Postar um story"
          >
            <div className="mural-story-add-card__inner">
              <div className="mural-story-add-card__icon">
                <svg
                  viewBox="0 0 24 24"
                  width="36"
                  height="36"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M11 3h2v8h8v2h-8v8h-2v-8H3v-2h8V3z" />
                </svg>
              </div>
              <div className="mural-story-add-card__text">
                <span className="mural-story-add-card__primary">postar</span>
                <span className="mural-story-add-card__secondary">story</span>
              </div>
            </div>
          </button>
        </article>

        {/* Stories publicados em formato 9:16 vertical */}
        {stories.map((msg, index) => {
          const authorName = msg.convidados?.nome?.split(' ')[0] || 'convidado';
          const authorPhoto = msg.convidados?.foto_url;

          return (
            <article key={msg.id} className="mural-story-card">
              <button
                type="button"
                className="mural-story-card__button"
                onClick={() => {
                  setSlideDirection('next');
                  setSelectedStoryIndex(index);
                }}
                aria-label={`Abrir story de ${authorName}`}
              >
                <img
                  className="mural-story-card__img"
                  src={msg.imagem_url}
                  alt={`Story de ${authorName}`}
                  loading="lazy"
                />
                <div className="mural-story-card__author">
                  <img
                    className="mural-story-card__avatar"
                    src={formatarCaminhoImagem(authorPhoto)}
                    alt=""
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = PLACEHOLDER_PROFILE;
                    }}
                  />
                  <div className="mural-story-card__identity">
                    <strong className="mural-story-card__name">{authorName.toLowerCase()}</strong>
                    <span className="mural-story-card__time">
                      {formatRelativeTime(msg.created_at)}
                    </span>
                  </div>
                </div>
              </button>
            </article>
          );
        })}
      </div>

      {/* Modal 1: Prévia Rápida com botão Publicar */}
      {imagePreview &&
        createPortal(
          <div
            className="mural-preview-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Prévia do story"
          >
            <div className="mural-preview-modal__content">
              <div className="mural-preview-modal__header">
                <h3 className="mural-preview-modal__title">prévia do story</h3>
              </div>

              <div className="mural-preview-modal__image-wrapper">
                <img
                  className="mural-preview-modal__image"
                  src={imagePreview}
                  alt="Pré-visualização da foto"
                />
              </div>

              {imageError && (
                <p className="mural-preview-modal__error" role="alert">
                  {imageError}
                </p>
              )}

              {isSubmitting ? (
                <div className="mural-preview-modal__loading">
                  <div className="metro-progress-bar">
                    <span className="metro-progress-dot" />
                    <span className="metro-progress-dot" />
                    <span className="metro-progress-dot" />
                    <span className="metro-progress-dot" />
                    <span className="metro-progress-dot" />
                  </div>
                  <span className="mural-preview-modal__loading-text">publicando story...</span>
                </div>
              ) : (
                <div className="mural-preview-modal__actions">
                  <button
                    type="button"
                    className="mural-preview-btn mural-preview-btn--primary"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                  >
                    publicar story
                  </button>
                  <button
                    type="button"
                    className="mural-preview-btn mural-preview-btn--cancel"
                    onClick={handleCancelPreview}
                    disabled={isSubmitting}
                  >
                    cancelar
                  </button>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}

      {/* Modal 2: Story Viewer Fullscreen (Navegação Instagram/Windows Phone) */}
      {selectedStory &&
        createPortal(
          <div
            className="mural-story-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Visualização do story"
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedStoryIndex(null);
            }}
          >
            {/* Fundo com Lente Fixa de Blur (sempre ativa, fotos trocam instantaneamente por baixo) */}
            <div className="mural-story-modal__backdrop" aria-hidden="true">
              {prevStoryUrl && prevStoryUrl !== selectedStory.imagem_url && (
                <img
                  src={prevStoryUrl}
                  alt=""
                  className="mural-story-modal__backdrop-source mural-story-modal__backdrop-source--prev"
                />
              )}
              <img
                key={selectedStory.id}
                src={selectedStory.imagem_url}
                alt=""
                decoding="async"
                className="mural-story-modal__backdrop-source mural-story-modal__backdrop-source--curr"
                onLoad={() => setPrevStoryUrl(selectedStory.imagem_url)}
              />
              <div className="mural-story-modal__backdrop-lens" />
            </div>

            <div
              className={`mural-story-modal__wrapper ${isUiHidden ? 'is-ui-hidden' : ''} ${
                isDragging ? 'is-dragging' : ''
              }`}
              style={{
                transform:
                  dragOffsetY > 0
                    ? `translate3d(0, ${dragOffsetY}px, 0) scale(${Math.max(
                        0.82,
                        1 - dragOffsetY / 1200
                      )})`
                    : undefined,
                opacity:
                  dragOffsetY > 0 ? Math.max(0.2, 1 - dragOffsetY / 500) : undefined,
                transition: isDragging
                  ? 'none'
                  : 'transform 0.24s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.24s ease-out',
              }}
            >
              {/* Faixa Superior Unificada com Vidro Fosco (Estilo Metro App Bar) */}
              <div className="mural-story-modal__top-bar">
                {/* Cópia da imagem no fundo do cabeçalho para gerar o blur colorido perfeito atrás dos controles */}
                <div className="mural-story-modal__top-bar-bg" aria-hidden="true">
                  <img
                    key={selectedStory.id}
                    src={selectedStory.imagem_url}
                    alt=""
                    decoding="async"
                    className="mural-story-modal__top-bar-bg-img"
                  />
                  <div className="mural-story-modal__top-bar-bg-lens" />
                </div>

                {/* Linhas contadoras de progresso no topo da faixa */}
                {stories.length > 0 && (
                  <div className="mural-story-modal__progress-bar">
                    {stories.map((s, idx) => {
                      let fillWidth = '0%';
                      if (idx < selectedStoryIndex) fillWidth = '100%';
                      else if (idx === selectedStoryIndex) fillWidth = `${storyProgress}%`;

                      return (
                        <div key={s.id} className="mural-story-modal__progress-segment">
                          <div
                            className="mural-story-modal__progress-fill"
                            style={{ width: fillWidth }}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Linha única com Foto, Nome, Tempo e Botões de Ação */}
                <div className="mural-story-modal__header-row">
                  <div className="mural-story-modal__author">
                    <img
                      className="mural-story-modal__avatar"
                      src={formatarCaminhoImagem(selectedStory.convidados?.foto_url)}
                      alt=""
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = PLACEHOLDER_PROFILE;
                      }}
                    />
                    <div className="mural-story-modal__identity">
                      <span className="mural-story-modal__name">
                        {(selectedStory.convidados?.nome?.split(' ')[0] || 'convidado').toLowerCase()}
                      </span>
                      <span className="mural-story-modal__time">
                        {formatRelativeTime(selectedStory.created_at)}
                      </span>
                    </div>
                  </div>

                  <div className="mural-story-modal__controls">
                    {(isAdmin || usuarioLogado?.id === selectedStory.id_convidado) && (
                      <button
                        type="button"
                        className="mural-story-modal__delete-btn"
                        onClick={() => handleDelete(selectedStory.id)}
                        title="Excluir story"
                        aria-label="Excluir story"
                      >
                        <svg viewBox="0 0 32 32" aria-hidden="true">
                          <path d="M 14 4 C 12.841 4 12 4.841 12 6 L 12 7 L 6 7 L 6 9 L 7 9 L 7 25 C 7 26.654 8.346 28 10 28 L 19.771484 28 L 21.771484 26 L 10 26 C 9.449 26 9 25.552 9 25 L 9 9 L 23 9 L 23 18.671875 L 25 20.671875 L 25 9 L 26 9 L 26 7 L 20 7 L 20 6 C 20 4.841 19.159 4 18 4 L 14 4 z M 14 6 L 18 6 L 18 7 L 14 7 L 14 6 z M 11 12 L 11 23 L 13 23 L 13 12 L 11 12 z M 15 12 L 15 23 L 17 23 L 17 12 L 15 12 z M 19 12 L 19 19.472656 L 21 17.472656 L 21 12 L 19 12 z M 21.400391 19.900391 L 20 21.300781 L 24.650391 25.949219 L 20 30.599609 L 21.400391 32 L 26.050781 27.349609 L 30.599609 31.900391 L 32 30.5 L 27.449219 25.949219 L 32 21.400391 L 30.599609 20 L 26.050781 24.550781 L 21.400391 19.900391 z" />
                        </svg>
                      </button>
                    )}
                    <button
                      type="button"
                      className="mural-story-modal__close-btn"
                      onClick={() => setSelectedStoryIndex(null)}
                      aria-label="Fechar story"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>

              {/* Mídia do Story */}
              <div className="mural-story-modal__media-container">
                <img
                  key={selectedStory.id}
                  className={`mural-story-modal__media mural-story-modal__media--${slideDirection}`}
                  src={selectedStory.imagem_url}
                  alt={`Story de ${selectedStory.convidados?.nome?.split(' ')[0] || 'convidado'}`}
                />

                {/* Áreas de toque invisíveis estilo Instagram com arrastar para fechar e segurar para pausar */}
                <button
                  type="button"
                  className="mural-story-modal__tap-zone mural-story-modal__tap-zone--left"
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={(e) => handlePointerUp(e, false)}
                  onPointerCancel={handlePointerCancel}
                  aria-label="Story anterior ou arrastar para fechar"
                />

                <button
                  type="button"
                  className="mural-story-modal__tap-zone mural-story-modal__tap-zone--right"
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={(e) => handlePointerUp(e, true)}
                  onPointerCancel={handlePointerCancel}
                  aria-label="Próximo story ou arrastar para fechar"
                />
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
