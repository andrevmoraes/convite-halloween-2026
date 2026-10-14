import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  formatarCaminhoImagem,
  PLACEHOLDER_PROFILE,
} from '../lib/formatarCaminhoImagem';
import './MuralDisplay.css';

const STORY_DURATION = 5000;
function formatRelativeTime(dateString) {
  const date = new Date(dateString);
  const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60000);

  if (diffMinutes < 1) return 'agora';
  if (diffMinutes < 60) return `há ${diffMinutes} min`;
  if (diffMinutes < 1440) return `há ${Math.floor(diffMinutes / 60)} h`;
  return `há ${Math.floor(diffMinutes / 1440)} d`;
}

export default function MuralDisplay() {
  const [stories, setStories] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const currentStory = stories[currentIndex];

  useEffect(() => {
    let isActive = true;

    async function fetchStories() {
      const { data, error } = await supabase
        .from('mural')
        .select('id, imagem_url, texto, created_at, id_convidado, convidados(nome, foto_url)')
        .not('imagem_url', 'is', null)
        .order('created_at', { ascending: true });

      if (!isActive) return;

      if (error) {
        console.error('Erro ao carregar fotos do mural:', error);
        setErrorMessage('não foi possível carregar o mural.');
      } else {
        setStories(data || []);
        setErrorMessage('');
        setCurrentIndex((index) => Math.min(index, Math.max((data || []).length - 1, 0)));
      }
      setIsLoading(false);
    }

    fetchStories();
    const channel = supabase
      .channel('mural-display-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mural' }, fetchStories)
      .subscribe();

    return () => {
      isActive = false;
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (stories.length < 2) return undefined;

    const timer = window.setTimeout(() => {
      setCurrentIndex((index) => (index + 1) % stories.length);
    }, STORY_DURATION);

    return () => window.clearTimeout(timer);
  }, [stories.length, currentIndex]);

  if (isLoading) {
    return <main className="mural-display mural-display--status">carregando mural...</main>;
  }

  if (errorMessage) {
    return <main className="mural-display mural-display--status">{errorMessage}</main>;
  }

  if (!currentStory) {
    return (
      <main className="mural-display mural-display--status">
        <span className="mural-display__empty-mark">+</span>
        <span>aguardando fotos da festa...</span>
      </main>
    );
  }

  const authorName = currentStory.convidados?.nome?.split(' ')[0] || 'convidado';

  return (
    <main className="mural-display">
      <div
        className="mural-display__backdrop"
        aria-hidden="true"
        key={`backdrop-${currentStory.id}`}
        style={{ backgroundImage: `url("${currentStory.imagem_url}")` }}
      />
      <div className="mural-display__progress" aria-label={`foto ${currentIndex + 1} de ${stories.length}`}>
        {stories.map((story, index) => (
          <span
            className={`mural-display__progress-segment${index === currentIndex ? ' mural-display__progress-segment--active' : ''}${index < currentIndex ? ' mural-display__progress-segment--past' : ''}`}
            key={story.id}
          >
            {index === currentIndex && <span className="mural-display__progress-fill" />}
          </span>
        ))}
      </div>

      <header className="mural-display__header">
        <div className="mural-display__author">
          <img
            className="mural-display__avatar"
            src={formatarCaminhoImagem(currentStory.convidados?.foto_url)}
            alt=""
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = PLACEHOLDER_PROFILE;
            }}
          />
          <div className="mural-display__identity">
            <h1>{authorName.toLowerCase()}</h1>
            <p>{formatRelativeTime(currentStory.created_at)}</p>
          </div>
        </div>
      </header>

      <div className="mural-display__stage">
        <img
          key={currentStory.id}
          className="mural-display__story-image"
          src={currentStory.imagem_url}
          alt={`Foto publicada por ${authorName}`}
        />
      </div>

      {currentStory.texto && (
        <div className="mural-display__caption">
          <p>{currentStory.texto}</p>
        </div>
      )}
    </main>
  );
}
