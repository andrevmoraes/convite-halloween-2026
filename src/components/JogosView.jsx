import { useEffect } from 'react';
import { Ticket } from 'lucide-react';
import './JogosView.css';

export default function JogosView({ onBack }) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  return (
    <div className="jogos-view-container">
      <header className="jogos-header">
        <button className="jogos-back-btn" onClick={onBack} type="button" aria-label="Voltar">
          <img width="96" height="96" src="https://img.icons8.com/windows/96/circled-left-2.png" alt="voltar" />
        </button>
        <h1 className="jogos-title">atrações</h1>
      </header>

      <div className="jogos-cards-scroll">
        <div className="jogos-cards-list">

        {/* Card Karaokê */}
        <div className="jogo-card card-karaoke">
          <div className="jogo-info">
            <h2>karaokê</h2>
            <p>solte a voz com a galera. adicione música na playlist.</p>
          </div>
          <a
            href="https://open.spotify.com/playlist/6u19bCX2HHdfpUawF5WL0T?si=aab24e28310f4526&pt=211244d0433be628184824b2ee394b19"
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

        {/* Card After */}
        <div className="jogo-card card-after">
          <div className="jogo-info">
            <h2>after</h2>
            <p>
              a noite não acaba cedo! às 21h45 faremos um esquenta na praça e
              depois esticamos para o Profeta Pub (@profetapub). se você vai
              nessa com a gente, lembre de já garantir seu ingresso!
            </p>
          </div>
          <div className="after-actions">
            <a
              href="https://www.instagram.com/profetapub/"
              target="_blank"
              rel="noopener noreferrer"
              className="jogo-btn btn-after-instagram"
            >
              <svg
                className="after-action-icon"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                aria-hidden="true"
              >
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
              </svg>
              acessar instagram
            </a>
            <a
              href="https://www.sympla.com.br/evento/rebola-raba-djs-lavs-kohuru-rezenha-dos-djs/3615318"
              target="_blank"
              rel="noopener noreferrer"
              className="jogo-btn btn-after-ticket"
            >
              <Ticket size={24} strokeWidth={1.75} aria-hidden="true" />
              comprar ingresso
            </a>
          </div>
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

        <a className="mural-display-link" href="/mural-display">
          abrir mural em tela cheia
        </a>

        </div>
      </div>
    </div>
  );
}
