import React from 'react';
import './DataEventoTile.css';

const DataEventoTile = () => {
  const handleDownloadIcs = () => {
    const year = new Date().getFullYear();
    // 17 de Outubro, 17:00 às 21:50 (GMT-3).
    // UTC: 17:00 + 3 = 20:00 -> 200000Z
    // UTC: 21:50 + 3 = 00:50 (do dia seguinte) -> 005000Z
    const dtStart = `${year}1017T200000Z`;
    const dtEnd = `${year}1018T005000Z`;

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Andrelloween//NONSGML v1.0//EN
BEGIN:VEVENT
UID:${new Date().getTime()}@andrelloween
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTSTART:${dtStart}
DTEND:${dtEnd}
SUMMARY:Andrelloween 🎃
DESCRIPTION:Festa de Halloween do André!
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'andrelloween.ics');
    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <button
      className="metro-tile tile-data-evento"
      type="button"
      onClick={handleDownloadIcs}
      aria-label="Adicionar evento à agenda"
    >
      <div className="data-evento-content">
        <span className="data-evento-title">dia 17 de outubro</span>
        <span className="data-evento-time">17h00 às 21h50</span>
        <span className="data-evento-support">toque para adicionar à agenda</span>
      </div>
      <div className="data-evento-icon">
        <img width="96" height="96" src="https://img.icons8.com/windows/96/calendar.png" alt="calendar"/>
      </div>
    </button>
  );
};

export default DataEventoTile;
