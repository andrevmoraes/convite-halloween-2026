import React, { useState, useEffect } from 'react';

const imagePaths = [
  '/midia/tiles/bingo.png',
  '/midia/tiles/just-dance.png',
  '/midia/tiles/spotify.png',
  '/midia/tiles/xbox-one.png'
];

const conteudos = [
  'main', // Indica a face principal com texto
  ...imagePaths
];

export default function JogosTile({ onClick }) {
  const [flipCount, setFlipCount] = useState(0);
  const [contentCount, setContentCount] = useState(0);

  useEffect(() => {
    let innerTimeoutId;

    const intervalId = setInterval(() => {
      // 1. Dispara a rotação
      setFlipCount((c) => c + 1);
      
      // 2. Troca o conteúdo da face que ficou oculta no meio do giro (300ms)
      innerTimeoutId = setTimeout(() => {
        setContentCount((c) => c + 1);
      }, 300);

    }, 5500);

    return () => {
      clearInterval(intervalId);
      clearTimeout(innerTimeoutId);
    };
  }, []);

  const getIndex = (count) => count % conteudos.length;

  // Usa o contentCount atrasado para calcular o que cada face deve mostrar
  const isFaceAVisible = contentCount % 2 === 0;

  const indexA = isFaceAVisible ? getIndex(contentCount) : getIndex(contentCount + 1);
  const indexB = !isFaceAVisible ? getIndex(contentCount) : getIndex(contentCount + 1);

  const renderFace = (index) => {
    const content = conteudos[index];
    
    if (content === 'main') {
      return (
        <div 
          className="metro-tile" 
          style={{ 
            width: '100%', 
            height: '100%', 
            backgroundColor: 'var(--accent-color)', 
            display: 'flex', 
            flexDirection: 'column', 
            padding: '12px 16px',
            position: 'absolute'
          }}
        >
          <span 
            className="tile-label" 
            style={{ 
              alignSelf: 'flex-start', 
              marginTop: 'auto',
              fontSize: '1.2rem',
              fontWeight: 400,
              lineHeight: 1.1 
            }}
          >
            descubra as atrações
          </span>
        </div>
      );
    }
    
    return (
      <div 
        className="metro-tile"
        style={{ 
          width: '100%', 
          height: '100%', 
          position: 'absolute',
          backgroundColor: '#000',
          padding: 0
        }}
      >
        <img 
          src={content} 
          alt="jogo" 
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
        />
      </div>
    );
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="tile-small-2x2"
      style={{
        perspective: '1000px', // Ativa o ambiente 3D para as filhas
        padding: 0,
        backgroundColor: 'transparent',
        border: 'none',
        outline: 'none',
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)', // Curva suave do Windows Phone
          transformStyle: 'preserve-3d', // Garante que as faces obedeçam ao espaço 3D
          transform: `rotateX(${flipCount * 180}deg)`, // Gira a tile inteira!
        }}
      >
        {/* FACE A (Frente original) */}
        <div
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            backfaceVisibility: 'hidden', // Esconde quando girar
            WebkitBackfaceVisibility: 'hidden',
          }}
        >
          {renderFace(indexA)}
        </div>

        {/* FACE B (Costas original) */}
        <div
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            backfaceVisibility: 'hidden', // Esconde quando girar
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateX(180deg)', // Já começa de costas, esperando a tile girar
          }}
        >
          {renderFace(indexB)}
        </div>
      </div>
    </button>
  );
}
