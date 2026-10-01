import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, MotionConfig } from 'framer-motion';

import ConvidadosView from './components/ConvidadosView';
import EditarPerfil from './components/EditarPerfil';
import PortaEntrada from './components/PortaEntrada';
import VotacaoData from './components/VotacaoData';
import DataEventoTile from './components/DataEventoTile';
import ContagemRegressivaTile from './components/ContagemRegressivaTile';
import MuralTile from './components/MuralTile';
import JogosView from './components/JogosView';
import JogosTile from './components/JogosTile';
import {
  formatarCaminhoImagem,
  PLACEHOLDER_PROFILE,
} from './lib/formatarCaminhoImagem';
import { supabase } from './lib/supabase';
import './App.css';

const PLACEHOLDER_COVER =
  '/midia/imagens/sabina-music-rich-OJy0JHnoUZQ-unsplash.jpg';
const ENDERECO_EVENTO =
  'Av. Coronel João Leite, 300 - Centro, Mogi Mirim - SP, 13800-034';

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
    <>
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
            {isPlaying ? (
              <img className="halloween-player__icon" width="96" height="96" src="https://img.icons8.com/windows/96/pause--v1.png" alt="pause--v1"/>
            ) : (
              <img className="halloween-player__icon" width="96" height="96" src="https://img.icons8.com/windows/96/play--v1.png" alt="play--v1"/>
            )}
          </button>
          <button
            className="halloween-player__button"
            type="button"
            onClick={onNextTrack}
            aria-label="Avançar música"
          >
            <img className="halloween-player__icon" width="96" height="96" src="https://img.icons8.com/windows/96/end.png" alt="end"/>
          </button>
        </div>
        <audio ref={audioRef} src={track.src} />
      </div>
    </>
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
  const [copiado, setCopiado] = useState(false);
  const copiadoTimer = useRef(null);
  const isApple = /iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent);
  const localRef =
    'Condomínio Edifício Samambaia I II - R. Cel. João Leite, 300 - Centro, Mogi Mirim - SP, 13800-034';
  const queryEncoded = encodeURIComponent(localRef);
  const linkMapa = isApple
    ? `https://maps.apple.com/?q=${queryEncoded}`
    : `https://www.google.com/maps/search/?api=1&query=${queryEncoded}`;


  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    const handleFocus = (e) => {
      const tag = e.target.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') {
        setIsKeyboardOpen(true);
      }
    };
    const handleBlur = (e) => {
      const tag = e.target.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') {
        setIsKeyboardOpen(false);
      }
    };

    window.addEventListener('focusin', handleFocus);
    window.addEventListener('focusout', handleBlur);

    return () => {
      window.removeEventListener('focusin', handleFocus);
      window.removeEventListener('focusout', handleBlur);
    if (copiadoTimer.current !== null) {
      clearTimeout(copiadoTimer.current);
    }
    };
  }, []);


  async function handleCopiarEndereco() {
    try {
      await navigator.clipboard.writeText(ENDERECO_EVENTO);
      setCopiado(true);
      if (copiadoTimer.current !== null) {
        clearTimeout(copiadoTimer.current);
      }
      copiadoTimer.current = setTimeout(() => {
        setCopiado(false);
        copiadoTimer.current = null;
      }, 2000);
    } catch (error) {
      console.warn('Não foi possível copiar o endereço:', error);
    }
  }

  const usuarioLogado = loggedUser;
  const saudacao = 'olá,';

  function handleLogout() {
    audioRef.current?.pause();

    if (!window.confirm('Deseja realmente sair da conta?')) {
      return;
    }

    localStorage.removeItem('halloween_user');
    setLoggedUser(null);
    setTelaAtual('inicio');
  }

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
    <MotionConfig reducedMotion="always">
      {!isValidated && (
        <PortaEntrada onConfirm={handleConfirm} onStartAudio={startAudio} />
      )}
      {isValidated && (
        <motion.main
          className="halloween-hub"
        >
          {telaAtual === 'convidados' ? (
            <div className="halloween-hub__content">
              <ConvidadosView
                anfitriao={loggedUser}
                onBack={() => setTelaAtual('inicio')}
              />
            </div>
          ) : telaAtual === 'editar_perfil' ? (
            <div className="halloween-hub__content">
              <EditarPerfil
                usuarioLogado={loggedUser}
                onUserUpdate={(userData) => {
                  setLoggedUser(userData);
                  localStorage.setItem('halloween_user', JSON.stringify(userData));
                }}
                onBack={() => setTelaAtual('inicio')}
                onLogout={handleLogout}
              />
            </div>
          ) : telaAtual === 'jogos' ? (
            <div className="halloween-hub__content">
              <JogosView
                onBack={() => setTelaAtual('inicio')}
              />
            </div>
          ) : (
            <div className="metro-start-grid">
              {/* Tile 1: WhatsApp (2 colunas de largura, 2 unidades de altura - Lado Esquerdo) */}
              <a
                className="metro-tile tile-small-2x2 tile-whatsapp"
                href="https://chat.whatsapp.com/BDC19peviuB0GBOlRKlDoh?s=cl&p=i&mlu=4&ilr=4"
                target="_blank"
                rel="noopener noreferrer"
              >
                <div className="tile-icon">
                  <img
                    src="/midia/Digital_Glyph_White_RGB_2026.svg"
                    alt="WhatsApp"
                    width="42"
                    height="42"
                    className="tile-icon-img"
                    style={{ filter: 'none' }}
                  />
                </div>
                <span className="tile-label">entrar no grupo</span>
              </a>

              {/* Tile 2: Me Tile (4 colunas de largura, 2 unidades de altura - Lado Direito) */}
              <section
                className="metro-tile tile-me"
                aria-label="Perfil do convidado"
                onClick={() => setTelaAtual('editar_perfil')}
                style={{ cursor: 'pointer' }}
              >
                <div className="tile-me__welcome">
                  <span className="tile-me__greeting">{saudacao}</span>
                  <span className="tile-me__name">
                    {(loggedUser?.nome || 'convidado').toLowerCase()}
                  </span>
                </div>
                <div className="tile-me__photo-container">
                  <img
                    className="tile-me__photo"
                    src={formatarCaminhoImagem(loggedUser?.foto_url)}
                    alt={loggedUser?.nome ? `Foto de ${loggedUser.nome}` : 'Foto do convidado'}
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = PLACEHOLDER_PROFILE;
                    }}
                  />
                </div>
              </section>

              {/* Tile Evento ICS */}
              <DataEventoTile />

              {/* Tile Contagem Regressiva: 4 colunas de largura, alinhado a esquerda */}
              <ContagemRegressivaTile />

              {/* Tile Jogos: 2 colunas de largura (ao lado da contagem) */}
              <JogosTile onClick={() => setTelaAtual('jogos')} />

              {/* Card Escolha a Data: 6 colunas de largura */}
              <div className="tile-votacao-wrapper">
                <VotacaoData
                  usuarioLogado={loggedUser}
                  onUserUpdate={setLoggedUser}
                />
              </div>

              {/* Tile Mural de Recados: 6 colunas de largura */}
              <MuralTile usuarioLogado={loggedUser} />

              {/* Tile Convidados: 6 colunas de largura, 1 unidade de altura */}
              <button
                className="metro-tile tile-wide-2x1"
                type="button"
                onClick={() => setTelaAtual('convidados')}
              >
                <div className="tile-icon">
                  <img width="96" height="96" src="https://img.icons8.com/windows/96/gender-neutral-user.png" alt="convidados" className="tile-icon-img" />
                </div>
                <span className="tile-label">convidados</span>
              </button>

              {/* Tile Small 1: Fotos do ano passado (2 colunas) */}
              <a
                className="metro-tile tile-small-2x2"
                href="https://photos.app.goo.gl/wFj9Z5LN3UyxQPuv5"
                target="_blank"
                rel="noopener noreferrer"
              >
                <div className="tile-icon">
                  <svg
                    width="38"
                    height="38"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.35"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M12 12V3a4.5 4.5 0 0 1 0 9z" />
                    <path d="M12 12h9a4.5 4.5 0 0 1-9 0z" />
                    <path d="M12 12v9a4.5 4.5 0 0 1 0-9z" />
                    <path d="M12 12H3a4.5 4.5 0 0 1 9 0z" />
                  </svg>
                </div>
                <span className="tile-label">fotos do ano passado</span>
              </a>

              {/* Tile Small 2: Copiar Endereço (2 colunas) */}
              <button
                className="metro-tile tile-small-2x2"
                type="button"
                onClick={handleCopiarEndereco}
              >
                <div className="tile-icon">
                  <img width="96" height="96" src="https://img.icons8.com/windows/96/copy.png" alt="copy" className="tile-icon-img" />
                </div>
                <span className="tile-label">{copiado ? 'copiado!' : 'copiar endereço'}</span>
              </button>

              {/* Tile Small 3: Abrir Mapa (2 colunas) */}
              <a
                className="metro-tile tile-wide-2x1"
                href={linkMapa}
                target="_blank"
                rel="noopener noreferrer"
              >
                <div className="tile-icon">
                  <img width="96" height="96" src="https://img.icons8.com/windows/96/marker.png" alt="marker" className="tile-icon-img" />
                </div>
                <span className="tile-label">abrir mapa</span>
              </a>
            </div>
          )}
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
        isVisible={isValidated && !isKeyboardOpen}
      />
    </MotionConfig>
  );
}

export default App;
