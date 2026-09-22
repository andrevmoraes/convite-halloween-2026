import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import './VotacaoData.css';

const OPCOES_DATA = [
  { id: 1, texto: '03 de outubro - eleições' },
  { id: 2, texto: '10 de outubro' },
  { id: 3, texto: '17 de outubro' },
  { id: 4, texto: '24 de outubro - eleições' },
  { id: 5, texto: '31 de outubro 🎃' },
];

function normalizeVotes(value) {
  if (value === null || value === undefined || value === '') {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== 'ausente')
      .map(Number)
      .filter(Number.isInteger);
  }

  if (typeof value === 'string') {
    const trimmedValue = value.trim();

    if (!trimmedValue) {
      return [];
    }

    try {
      const parsedValue = JSON.parse(trimmedValue);

      if (Array.isArray(parsedValue)) {
        return parsedValue
          .filter((item) => item !== 'ausente')
          .map(Number)
          .filter(Number.isInteger);
      }
    } catch {
      // A coluna text também aceita o formato CSV legado.
    }

    return trimmedValue
      .split(',')
      .filter((item) => item.trim() !== 'ausente')
      .map((item) => Number(item.trim()))
      .filter(Number.isInteger);
  }

  const numericValue = Number(value);
  return Number.isInteger(numericValue) ? [numericValue] : [];
}

function isAbsent(value) {
  if (Array.isArray(value)) {
    return value.includes('ausente');
  }

  if (typeof value === 'string') {
    const trimmedValue = value.trim();

    if (trimmedValue === 'ausente') {
      return true;
    }

    try {
      const parsedValue = JSON.parse(trimmedValue);
      return Array.isArray(parsedValue) && parsedValue.includes('ausente');
    } catch {
      return trimmedValue.split(',').some((item) => item.trim() === 'ausente');
    }
  }

  return false;
}

function serializeVotes(voteIds) {
  return voteIds.join(',');
}

export default function VotacaoData({
  usuarioLogado,
  onUserUpdate,
  onOpenGuests,
}) {
  const [user, setUser] = useState(usuarioLogado);
  const [guests, setGuests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingVote, setSavingVote] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const pendingVoteRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    const syncUser = window.setTimeout(() => {
      setUser(usuarioLogado);
    }, 0);

    return () => window.clearTimeout(syncUser);
  }, [usuarioLogado]);

  const selectedVotes = useMemo(() => normalizeVotes(user?.data_votada), [user]);
  const userIsAbsent = useMemo(() => isAbsent(user?.data_votada), [user]);

  const voteResults = useMemo(() => {
    const results = {};

    guests.forEach((guest) => {
      normalizeVotes(guest.data_votada).forEach((dateId) => {
        if (!results[dateId]) {
          results[dateId] = { count: 0, names: [] };
        }

        results[dateId].count += 1;

        if (guest.nome && !results[dateId].names.includes(guest.nome)) {
          results[dateId].names.push(guest.nome);
        }
      });
    });

    return results;
  }, [guests]);

  const totalVotes = useMemo(
    () =>
      guests.reduce(
        (total, guest) => total + normalizeVotes(guest.data_votada).length,
        0,
      ),
    [guests],
  );
  const absentGuests = useMemo(
    () => guests.filter((guest) => isAbsent(guest.data_votada)),
    [guests],
  );
  const absentGuestNames = useMemo(
    () =>
      absentGuests
        .map((guest) => guest.nome)
        .filter(Boolean)
        .map((name) => name.toLowerCase()),
    [absentGuests],
  );

  const loadVotes = useCallback(async () => {
    const { data, error } = await supabase
      .from('convidados')
      .select('id, nome, data_votada');

    if (error) {
      console.error('Não foi possível carregar os votos.', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      setErrorMessage('Não foi possível carregar os resultados agora.');
      setIsLoading(false);
      return;
    }

    const nextGuests = data || [];
    const pendingVote = pendingVoteRef.current;
    const guestsWithOptimisticVote = pendingVote
      ? nextGuests.map((guest) =>
          guest.id === pendingVote.userId
            ? { ...guest, data_votada: pendingVote.serializedVotes }
            : guest,
        )
      : nextGuests;

    setGuests(guestsWithOptimisticVote);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    Promise.resolve().then(loadVotes);

    const pollingId = window.setInterval(loadVotes, 3000);

    return () => window.clearInterval(pollingId);
  }, [loadVotes]);

  const saveSelection = async (serializedVotes, previousGuests) => {
    const previousUser = user;
    const updatedUser = { ...user, data_votada: serializedVotes };

    pendingVoteRef.current = {
      userId: user.id,
      serializedVotes,
    };
    setErrorMessage('');
    setUser(updatedUser);
    onUserUpdate?.(updatedUser);
    setGuests((currentGuests) =>
      currentGuests.map((guest) =>
        guest.id === user.id
          ? { ...guest, data_votada: serializedVotes }
          : guest,
      ),
    );
    setSavingVote(true);

    const { error } = await supabase
      .from('convidados')
      .update({ data_votada: serializedVotes })
      .eq('id', user.id);

    pendingVoteRef.current = null;

    if (error) {
      console.error('Não foi possível registrar o voto.', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      setUser(previousUser);
      onUserUpdate?.(previousUser);
      setGuests(previousGuests);
      setErrorMessage('Não foi possível registrar seu voto. Tente novamente.');
      setSavingVote(false);
      return;
    }

    localStorage.setItem('halloween_user', JSON.stringify(updatedUser));
    setSavingVote(false);
  };

  const handleVote = async (dateId) => {
    if (!user?.id || savingVote) {
      return;
    }

    const previousVotes = normalizeVotes(user.data_votada);
    const nextVotes = previousVotes.includes(dateId)
      ? previousVotes.filter((voteId) => voteId !== dateId)
      : [...previousVotes, dateId];
    const serializedVotes = serializeVotes(nextVotes);

    if (dateId === 1) {
      if (!audioRef.current) {
        audioRef.current = new Audio('/midia/sons/mean_girls.mp3');
      }

      if (audioRef.current.paused) {
        audioRef.current.play().catch((error) => console.warn(error));
      }
    }

    const previousGuests = guests;
    await saveSelection(serializedVotes, previousGuests);
  };

  const handleDecline = async () => {
    if (!user?.id || savingVote) {
      return;
    }

    const previousGuests = guests;
    const serializedVotes = userIsAbsent ? serializeVotes([]) : 'ausente';

    await saveSelection(serializedVotes, previousGuests);
  };

  return (
    <section className="votacao-data" aria-labelledby="votacao-data-title">
      <div className="votacao-data__grid voting-tile">
        <h2 id="votacao-data-title" className="votacao-data__title-tile">
          escolha a data
        </h2>
        <p className="votacao-data__subtitle">
          atenção: os domingos 04 e 25 de outubro são dias de eleição. selecione
          uma ou mais datas que funcionam para você.
        </p>

        {OPCOES_DATA.map((date) => {
          const result = voteResults[date.id] || { count: 0, names: [] };
          const percentage =
            totalVotes > 0 ? Math.round((result.count / totalVotes) * 100) : 0;
          const isSelected = selectedVotes.includes(date.id);

          return (
            <button
              className={`votacao-data__tile${
                isSelected ? ' votacao-data__tile--selected' : ''
              }`}
              key={date.id}
              type="button"
              onClick={() => handleVote(date.id)}
              disabled={savingVote || isLoading}
              aria-pressed={isSelected}
            >
              <span className="votacao-data__tile-content">
                <span className="votacao-data__tile-meta">
                  <span className="votacao-data__voters">
                    {result.count} {result.count === 1 ? 'voto' : 'votos'} (
                    {percentage}%) -{' '}
                    {result.names.length > 0
                      ? result.names.join(', ').toLowerCase()
                      : 'ninguém ainda'}
                  </span>
                  <span className="votacao-data__progress-track" aria-hidden="true">
                    <span
                      className="votacao-data__progress"
                      style={{ width: `${percentage}%` }}
                    />
                  </span>
                </span>
                <strong>{date.texto}</strong>
              </span>
            </button>
          );
        })}
        <div
          className={`votacao-data__absence${
            userIsAbsent ? ' votacao-data__absence--selected' : ''
          }`}
        >
          <button
            className={`votacao-data__absence-button${
              userIsAbsent ? ' votacao-data__absence-button--selected' : ''
            }`}
            type="button"
            onClick={handleDecline}
            disabled={savingVote || isLoading}
            aria-pressed={userIsAbsent}
          >
            não vou poder ir
          </button>
          <p className="votacao-data__absence-summary">
            {absentGuestNames.length > 0
              ? `não vão: ${absentGuestNames.join(', ')}`
              : 'ninguém ainda'}
          </p>
        </div>
      </div>
      <button
        className="votacao-data__guests-tile"
        type="button"
        onClick={onOpenGuests}
      >
        convidados
      </button>

      {errorMessage && (
        <p className="votacao-data__error" role="alert">
          {errorMessage}
        </p>
      )}
    </section>
  );
}
