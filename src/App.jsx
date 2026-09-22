import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { VscChevronRight, VscDebugPause, VscPlay } from 'react-icons/vsc';
import ConvidadosView from './components/ConvidadosView';
import PortaEntrada from './components/PortaEntrada';
import VotacaoData from './components/VotacaoData';
import {
  formatarCaminhoImagem,
  PLACEHOLDER_PROFILE,
} from './lib/formatarCaminhoImagem';
import { supabase } from './lib/supabase';
import './App.css';

const PLACEHOLDER_COVER =
  '/midia/imagens/sabina-music-rich-OJy0JHnoUZQ-unsplash.jpg';
function readStoredUser() {
  const storedUser = localStorage.getItem('halloween_user');

  if (!storedUser) {
    return null;
  }

  try {
    const userData = JSON.parse(storedUser);

    if (userData && typeof userData === 'object') {
      return userData;
    }
  } catch (error) {
    console.warn('Sessão persistida inválida; ela será removida.', error);
  }

  localStorage.removeItem('halloween_user');
  return null;
}

function HalloweenPlayer({
  audioRef,
  playlist,
  currentTrack,
  isPlaying,
  onTogglePlayback,
  onNextTrack,
  isVisible,
}) {
  const track = playlist[currentTrack];

  return (
    <div className={`halloween-player${isVisible ? '' : ' halloween-player--hidden'}`}>
      <div className="halloween-player__track-info">
        <img
          className="halloween-player__cover"
          src={track.capa || PLACEHOLDER_COVER}
          alt={`Capa de ${track.titulo}`}
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = PLACEHOLDER_COVER;
          }}
        />
        <div>
          <strong className="halloween-player__title">{track.titulo}</strong>
          <span className="halloween-player__artist">{track.artista}</span>
        </div>
      </div>
      <div className="halloween-player__controls">
        <button
          className="halloween-player__button"
          type="button"
          onClick={onTogglePlayback}
          aria-label={isPlaying ? 'Pausar música' : 'Reproduzir música'}
        >
          {isPlaying ? <VscDebugPause /> : <VscPlay />}
        </button>
        <button
          className="halloween-player__button"
          type="button"
          onClick={onNextTrack}
          aria-label="Avançar música"
        >
          <VscChevronRight />
        </button>
      </div>
      <audio ref={audioRef} src={track.src} />
    </div>
  );
}

function App() {
  const audioRef = useRef(null);
  const hasStartedRef = useRef(false);
  const loadedTrackRef = useRef(null);
  const [playlist] = useState([
    {
      src: '/midia/musicas/Calling All The Monsters.mp3',
      titulo: 'Calling All The Monsters',
      artista: 'China Anne McClain',
      capa: '/midia/musicas/Calling All The Monsters.jpg',
    },
    {
      src: '/midia/musicas/Monster High.mp3',
      titulo: 'Monster High',
      artista: 'KATSEYE',
      capa: '/midia/musicas/Monster High.jpg',
    },
  ]);
  const [currentTrack, setCurrentTrack] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loggedUser, setLoggedUser] = useState(() => readStoredUser());
  const [telaAtual, setTelaAtual] = useState('inicio');
  const isValidated = Boolean(loggedUser);
  const [message, setMessage] = useState('');
  const pressTimer = useRef(null);
  const usuarioLogado = loggedUser;
  const saudacao =
    usuarioLogado?.genero?.toLowerCase() === 'f' ? 'bem-vinda,' : 'bem-vindo,';

  function handleLogout() {
    audioRef.current?.pause();

    if (!window.confirm('Deseja realmente sair da conta?')) {
      return;
    }

    localStorage.removeItem('halloween_user');
    setLoggedUser(null);
  }

  function iniciarPressao() {
    cancelarPressao();
    pressTimer.current = setTimeout(() => {
      handleLogout();
      pressTimer.current = null;
    }, 2000);
  }

  function cancelarPressao() {
    if (pressTimer.current !== null) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }

  useEffect(
    () => () => {
      if (pressTimer.current !== null) {
        clearTimeout(pressTimer.current);
      }
    },
    [],
  );

  useEffect(() => {
    const audio = audioRef.current;

    audio?.pause();
  }, []);

  useEffect(() => {
    const storedUser = readStoredUser();

    if (!storedUser?.id) {
      return;
    }

    let isActive = true;

    async function refreshStoredUser() {
      const { data, error } = await supabase
        .from('convidados')
        .select('*')
        .eq('id', storedUser.id)
        .single();

      if (error) {
        console.warn('Não foi possível atualizar a sessão persistida.', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
        return;
      }

      if (isActive && data) {
        setLoggedUser(data);
        localStorage.setItem('halloween_user', JSON.stringify(data));
      }
    }

    refreshStoredUser();

    return () => {
      isActive = false;
    };
  }, []);

  const startAudio = useCallback(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    audio.currentTime = 13.5;
    hasStartedRef.current = true;
    loadedTrackRef.current = currentTrack;
    const playback = audio.play();

    if (playback !== undefined) {
      playback.catch((error) => {
        console.warn('Erro no áudio:', error);
      });
    }
  }, [currentTrack]);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio || !hasStartedRef.current || loadedTrackRef.current === currentTrack) {
      return;
    }

    loadedTrackRef.current = currentTrack;
    audio.load();
    audio.currentTime = 0;
    const playback = audio.play();

    if (playback !== undefined) {
      playback.catch((error) => {
        console.warn('Erro no áudio:', error);
      });
    }
  }, [currentTrack]);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return undefined;
    }

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setCurrentTrack((track) => (track + 1) % playlist.length);
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [playlist.length]);

  const togglePlayback = useCallback(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    if (audio.paused) {
      const playback = audio.play();

      if (playback !== undefined) {
        playback.catch((error) => {
          console.warn('Erro no áudio:', error);
        });
      }
    } else {
      audio.pause();
    }
  }, []);

  const nextTrack = useCallback(() => {
    hasStartedRef.current = true;
    setCurrentTrack((track) => (track + 1) % playlist.length);
  }, [playlist.length]);

  function handleConfirm(userData) {
    localStorage.setItem('halloween_user', JSON.stringify(userData));
    setLoggedUser(userData);
    setMessage('');
    return userData;
  }

  return (
    <>
      {!isValidated && (
        <PortaEntrada onConfirm={handleConfirm} onStartAudio={startAudio} />
      )}
      {isValidated && (
        <motion.main
          className="halloween-hub"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        >
          <div className="halloween-hub__content">
            {telaAtual === 'convidados' ? (
              <ConvidadosView
                anfitriao={loggedUser}
                onBack={() => setTelaAtual('inicio')}
              />
            ) : (
              <>
                <section
                  className="halloween-me-tile"
                  aria-label="Perfil do convidado"
                  onMouseDown={iniciarPressao}
                  onMouseUp={cancelarPressao}
                  onMouseLeave={cancelarPressao}
                  onTouchStart={iniciarPressao}
                  onTouchEnd={cancelarPressao}
                  onTouchCancel={cancelarPressao}
                >
                  <div className="halloween-me-tile__welcome">
                    <span className="halloween-me-tile__greeting">
                      {saudacao}
                    </span>
                    <span className="halloween-me-tile__name">
                      {(loggedUser?.nome || 'convidado').toLowerCase()}
                    </span>
                  </div>
                  <img
                    className="halloween-me-tile__photo"
                    src={formatarCaminhoImagem(loggedUser?.foto_url)}
                    alt={loggedUser?.nome ? `Foto de ${loggedUser.nome}` : 'Foto do convidado'}
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = PLACEHOLDER_PROFILE;
                    }}
                  />
                </section>
                <VotacaoData
                  usuarioLogado={loggedUser}
                  onUserUpdate={setLoggedUser}
                  onOpenGuests={() => setTelaAtual('convidados')}
                />
              </>
            )}
          </div>
        </motion.main>
      )}
      {!isValidated && message && <p className="app-message">{message}</p>}
      <HalloweenPlayer
        audioRef={audioRef}
        playlist={playlist}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        onTogglePlayback={togglePlayback}
        onNextTrack={nextTrack}
        isVisible={isValidated}
      />
    </>
  );
}

export default App;
