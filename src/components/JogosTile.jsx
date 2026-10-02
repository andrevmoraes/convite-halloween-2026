import { useEffect, useState } from 'react';

const imagePaths = [
  '/midia/tiles/bingo.png',
  '/midia/tiles/just-dance.png',
  '/midia/tiles/spotify.png',
  '/midia/tiles/xbox-one.png'
];

const conteudos = imagePaths;

export default function JogosTile({ onClick }) {
  const [flipCount, setFlipCount] = useState(0);
  const [contentCount, setContentCount] = useState(0);

  useEffect(() => {
    let innerTimeoutId;
    const intervalId = setInterval(() => {
      setFlipCount((c) => c + 1);
      innerTimeoutId = setTimeout(() => {
        setContentCount((c) => c + 1);
      }, 620);
    }, 5500);
    return () => {
      clearInterval(intervalId);
      clearTimeout(innerTimeoutId);
    };
  }, []);

  const getIndex = (count) => count % conteudos.length;
  const isFaceAVisible = contentCount % 2 === 0;
  const indexA = isFaceAVisible ? getIndex(contentCount) : getIndex(contentCount + 1);
  const indexB = !isFaceAVisible ? getIndex(contentCount) : getIndex(contentCount + 1);

  const renderFace = (index) => {
    const src = conteudos[index];

    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          backgroundColor: '#000',
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          alignItems: 'flex-start',
        }}
      >
        <img
          src={src}
          alt="atração"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <span
          className="tile-label"
          style={{
            position: 'relative',
            zIndex: 1,
            width: '100%',
            margin: 0,
            padding: '8px 12px',
            background: 'rgba(0,0,0,0.6)',
          }}
        >
          atrações
        </span>
      </div>
    );
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="tile-small-2x2"
      style={{
        perspective: '1000px',
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
          transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
          transformStyle: 'preserve-3d',
          willChange: 'transform',
          transform: `rotateX(${flipCount * 180}deg)`,
        }}
      >
        <div style={{ position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'translateZ(0)' }}>
          {renderFace(indexA)}
        </div>
        <div style={{ position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateX(180deg) translateZ(0)' }}>
          {renderFace(indexB)}
        </div>
      </div>
    </button>
  );
}
