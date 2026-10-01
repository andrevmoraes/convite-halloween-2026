import React, { useState, useEffect } from 'react';
import './ContagemRegressivaTile.css';

const ContagemRegressivaTile = () => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      let year = now.getFullYear();
      let targetDate = new Date(year, 9, 17, 17, 0, 0); // 17 de Outubro às 17h (Mês é zero-indexed)

      if (now > targetDate) {
        targetDate = new Date(year + 1, 9, 17, 17, 0, 0);
      }

      const difference = targetDate - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000); // Atualiza a cada segundo

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="metro-tile tile-contagem">
      <div className="tile-contagem__content">
        <div className="tile-contagem__numbers">
          <div className="tile-contagem__block">
            <span className="tile-contagem__value">{String(timeLeft.days).padStart(2, "0")}</span>
            <span className="tile-contagem__label">dias</span>
          </div>
          <div className="tile-contagem__block">
            <span className="tile-contagem__value">{String(timeLeft.hours).padStart(2, "0")}</span>
            <span className="tile-contagem__label">horas</span>
          </div>
          <div className="tile-contagem__block">
            <span className="tile-contagem__value">{String(timeLeft.minutes).padStart(2, "0")}</span>
            <span className="tile-contagem__label">min</span>
          </div>
          <div className="tile-contagem__block">
            <span className="tile-contagem__value">{String(timeLeft.seconds).padStart(2, "0")}</span>
            <span className="tile-contagem__label">seg</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContagemRegressivaTile;
