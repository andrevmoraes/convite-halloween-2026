import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { VscChevronRight, VscDebugPause, VscPlay } from 'react-icons/vsc';
import ConvidadosView from './components/ConvidadosView';
import EditarPerfil from './components/EditarPerfil';
import PortaEntrada from './components/PortaEntrada';
import VotacaoData from './components/VotacaoData';
import DataEventoTile from './components/DataEventoTile';
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


  useEffect(() => () => {
    if (copiadoTimer.current !== null) {
      clearTimeout(copiadoTimer.current);
    }
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
          ) : (
            <div className="metro-start-grid">
              {/* Tile 1: WhatsApp (2 colunas de largura, 2 unidades de altura - Lado Esquerdo) */}
              <a
                className="metro-tile tile-small-2x2"
                href="https://chat.whatsapp.com/BDC19peviuB0GBOlRKlDoh?s=cl&p=i&mlu=4&ilr=4"
                target="_blank"
                rel="noopener noreferrer"
              >
                <div className="tile-icon">
                  <img
                    src="https://img.icons8.com/windows/96/whatsapp--v1.png"
                    alt="WhatsApp"
                    width="42"
                    height="42"
                    className="tile-icon-img"
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

              {/* Card Escolha a Data: 6 colunas de largura */}
              <div className="tile-votacao-wrapper">
                <VotacaoData
                  usuarioLogado={loggedUser}
                  onUserUpdate={setLoggedUser}
                />
              </div>

              {/* Tile Convidados: 6 colunas de largura, 1 unidade de altura */}
              <button
                className="metro-tile tile-wide-full"
                type="button"
                onClick={() => setTelaAtual('convidados')}
              >
                <span className="tile-label">confirmados e seus pratos</span>
              </button>

              {/* Tile Small 1: Fotos do ano passado (2 colunas) */}
              <a
                className="metro-tile tile-small-2x2"
                href="https://photos.app.goo.gl/wFj9Z5LN3UyxQPuv5"
                target="_blank"
                rel="noopener noreferrer"
              >
                <div className="tile-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    width="42"
                    height="42"
                    fill="currentColor"
                    aria-hidden="true"
                    style={{ display: 'block' }}
                  >
                    <path d="M 12.523438 0 C 11.692337 0 11 0.69233831 11 1.5234375 L 11 6.5605469 C 9.8291681 5.4286609 8.2493011 4.7148438 6.5 4.7148438 C 2.9215128 4.7148438 0 7.6373978 0 11.214844 L 0 11.476562 C 0 12.307663 0.69233831 13 1.5234375 13 L 6.5605469 13 C 5.4286609 14.170832 4.7148438 15.750699 4.7148438 17.5 C 4.7148438 21.078268 7.6365758 24 11.214844 24 L 11.476562 24 C 12.307663 24 13 23.307662 13 22.476562 L 13 17.439453 C 14.170832 18.571339 15.750699 19.285156 17.5 19.285156 C 21.078268 19.285156 24 16.363424 24 12.785156 L 24 12.523438 C 24 11.692337 23.307662 11 22.476562 11 L 17.439453 11 C 18.571339 9.8291681 19.285156 8.2493011 19.285156 6.5 C 19.285156 2.9215128 16.362602 0 12.785156 0 L 12.523438 0 z M 13 2.0429688 C 15.38969 2.1602393 17.285156 4.0788001 17.285156 6.5 C 17.285156 8.9214127 15.390696 10.839773 13 10.957031 L 13 2.0429688 z M 6.5 6.7148438 C 8.9214127 6.7148438 10.839773 8.6093044 10.957031 11 L 2.0429688 11 C 2.1602393 8.6103099 4.0788001 6.7148436 6.5 6.7148438 z M 13.042969 13 L 21.957031 13 C 21.839773 15.390696 19.921413 17.285156 17.5 17.285156 C 15.078587 17.285156 13.160227 15.390696 13.042969 13 z M 11 13.042969 L 11 21.957031 C 8.6093044 21.839773 6.7148436 19.921413 6.7148438 17.5 C 6.7148438 15.078587 8.6093044 13.160227 11 13.042969 z" />
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
                    <rect x="9" y="9" width="13" height="13" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </div>
                <span className="tile-label">{copiado ? 'copiado!' : 'copiar endereço'}</span>
              </button>

              {/* Tile Small 3: Abrir Mapa (2 colunas) */}
              <a
                className="metro-tile tile-small-2x2"
                href={linkMapa}
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
                    <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
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
        isVisible={isValidated}
      />
    </>
  );
}

export default App;
