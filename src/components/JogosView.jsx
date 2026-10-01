import { motion } from 'framer-motion';
import './JogosView.css';

export default function JogosView({ onBack }) {
  return (
    <motion.div
      className="jogos-view-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <header className="jogos-header">
        <button className="jogos-back-btn" onClick={onBack} type="button" aria-label="Voltar">
          <img width="96" height="96" src="https://img.icons8.com/windows/96/circled-left-2.png" alt="voltar" />
        </button>
        <h1 className="jogos-title">atrações</h1>
      </header>

      <div className="jogos-cards-list">

        {/* Card Karaokê */}
        <div className="jogo-card card-karaoke">
          <div className="jogo-info">
            <h2>karaokê</h2>
            <p>solte a voz com a galera. adicione música na playlist.</p>
          </div>
          <a
            href="https://open.spotify.com/playlist/6u19bCX2HHdfpUawF5WL0T?si=fb9f62fdafba4346&pt=4efa0dc863c96d88de4b85a4beb02cf9"
            target="_blank"
            rel="noopener noreferrer"
            className="jogo-btn btn-spotify"
            onClick={(e) => {
              // Previne erro até que o link do spotify seja inserido
              if (e.currentTarget.getAttribute('href') === '#') {
                e.preventDefault();
                alert("O link da Jam será disponibilizado no dia do evento!");
              }
            }}
          >
            <img width="96" height="96" src="https://img.icons8.com/windows/96/1db954/spotify.png" alt="spotify" />
            abrir playlist
          </a>
        </div>

        {/* Card Just Dance */}
        <div className="jogo-card card-justdance">
          <div className="jogo-info">
            <h2>just dance</h2>
            <p>prepare-se para suar a camisa. confira o catálogo completo de coreografias disponíveis.</p>
          </div>
          <a
            href="https://andrevmoraes.github.io/justdance/"
            target="_blank"
            rel="noopener noreferrer"
            className="jogo-btn btn-justdance"
          >
            <img width="96" height="96" src="https://img.icons8.com/windows/96/e1306c/controller.png" alt="gamepad" />
            ver músicas disponíveis
          </a>
        </div>

        {/* Card Bingo */}
        <div className="jogo-card card-bingo">
          <div className="jogo-info">
            <h2>bingo</h2>
            <p>teremos cartelas distribuídas na hora se eu ficar com preguiça de desenvolver um bingo online. preste atenção nos números e concorra a prêmios.</p>
          </div>
        </div>

      </div>
    </motion.div>
  );
}
