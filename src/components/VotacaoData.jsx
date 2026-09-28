import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import './VotacaoData.css';

function parseRSVP(value) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch (e) {
    // Dados legados ou erro de parse, tratamos como ausência de resposta (null)
  }
  return null;
}

export default function VotacaoData({ usuarioLogado, onUserUpdate, skipLocalStorage = false }) {
  const [user, setUser] = useState(usuarioLogado);
  const [errorMessage, setErrorMessage] = useState('');

  const rsvpInit = parseRSVP(usuarioLogado?.data_votada) || {};
  const [presenca, setPresenca] = useState(rsvpInit.presenca || null);
  const [contribuicao, setContribuicao] = useState(rsvpInit.contribuicao || null);

  const [acompanhantes, setAcompanhantes] = useState(rsvpInit.acompanhantes || '');
  const [comida, setComida] = useState(rsvpInit.comida || '');

  const [acompanhantesInput, setAcompanhantesInput] = useState(rsvpInit.acompanhantes || '');
  const [comidaInput, setComidaInput] = useState(rsvpInit.comida || '');

  const [pixCopiado, setPixCopiado] = useState(false);
  const isInitialMount = useRef(true);
  const acompanhantesRef = useRef(null);
  const detalhesRef = useRef(null);

  useEffect(() => {
    const syncUser = window.setTimeout(() => {
      setUser(usuarioLogado);
      const rsvp = parseRSVP(usuarioLogado?.data_votada) || {};
      setPresenca(rsvp.presenca || null);
      setAcompanhantes(rsvp.acompanhantes || '');
      setContribuicao(rsvp.contribuicao || null);
      setComida(rsvp.comida || '');
      setAcompanhantesInput(rsvp.acompanhantes || '');
      setComidaInput(rsvp.comida || '');
    }, 0);
    return () => window.clearTimeout(syncUser);
  }, [usuarioLogado]);

  useEffect(() => {
    const handler = setTimeout(() => setAcompanhantes(acompanhantesInput), 700);
    return () => clearTimeout(handler);
  }, [acompanhantesInput]);

  useEffect(() => {
    const handler = setTimeout(() => setComida(comidaInput), 700);
    return () => clearTimeout(handler);
  }, [comidaInput]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    async function doSave() {
      setErrorMessage('');

      const currentRsvp = parseRSVP(user.data_votada) || {};

      const rsvpData = {
        ...currentRsvp,
        presenca,
        acompanhantes: presenca === 'sim' ? acompanhantes : '',
        contribuicao: presenca === 'sim' ? contribuicao : null,
        comida: presenca === 'sim' && contribuicao === 'prato' ? comida : ''
      };

      const serialized = JSON.stringify(rsvpData);

      const { error } = await supabase
        .from('convidados')
        .update({ data_votada: serialized })
        .eq('id', user.id);

      if (error) {
        setErrorMessage('não foi possível salvar. verifique sua conexão.');
        return;
      }

      const updatedUser = { ...user, data_votada: serialized };
      setUser(updatedUser);
      onUserUpdate?.(updatedUser);
      if (!skipLocalStorage) {
        localStorage.setItem('halloween_user', JSON.stringify(updatedUser));
      }
    }

    doSave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presenca, acompanhantes, contribuicao, comida]);

  const togglePresenca = (val) => {
    setPresenca(prev => {
      const newVal = prev === val ? null : val;
      if (newVal === 'sim') {
        setTimeout(() => {
          acompanhantesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
      }
      return newVal;
    });
  };

  const toggleContribuicao = (val) => {
    setContribuicao(prev => {
      const newVal = prev === val ? null : val;
      if (newVal) {
        setTimeout(() => {
          detalhesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 150);
      }
      return newVal;
    });
  };

  const handleCopyPix = () => {
    navigator.clipboard.writeText('19997132723');
    setPixCopiado(true);
    setTimeout(() => setPixCopiado(false), 2000);
  };

  return (
    <section className="rsvp-container" aria-labelledby="rsvp-title">
      <div className="rsvp-grid">
        <h2 id="rsvp-title" className="rsvp-title">
          confirme sua presença
        </h2>
        <p className="rsvp-subtitle">
          <span className="rsvp-disclaimer">
            ainda não tem certeza? você pode desmarcar suas escolhas clicando nelas novamente e voltar aqui depois!
          </span>
          <br></br>
        </p>

        <div className="rsvp-options">
          <button
            className={`rsvp-tile ${presenca === 'sim' ? 'rsvp-tile--selected' : ''}`}
            onClick={() => togglePresenca('sim')}
          >
            eu vou
          </button>
          <button
            className={`rsvp-tile rsvp-tile--red ${presenca === 'nao' ? 'rsvp-tile--selected' : ''}`}
            onClick={() => togglePresenca('nao')}
          >
            não vou
          </button>
        </div>

        <AnimatePresence initial={false}>
          {presenca === 'sim' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="rsvp-expanded-section"
              ref={acompanhantesRef}
            >
              <div className="rsvp-field">
                <label htmlFor="acompanhantes">
                  <br></br>vai levar alguém? (acompanhantes restritos a cônjuges ou combinados previamente. informe nome e celular para participar do app na festa)
                </label>
                <textarea
                  id="acompanhantes"
                  rows="3"
                  value={acompanhantesInput}
                  onChange={(e) => setAcompanhantesInput(e.target.value)}
                  placeholder="ex: maria (11) 99999-9999"
                />
              </div>

              <div className="rsvp-field">
                <label><br></br>como vai contribuir? (fique à vontade para trazer a sua bebida alcoólica e não esqueça sua fantasia!)</label>
                <span className="rsvp-drink-notice"> </span>
                <div className="rsvp-options rsvp-options--small">
                  <button
                    className={`rsvp-tile rsvp-tile--small ${contribuicao === 'pix' ? 'rsvp-tile--selected' : ''}`}
                    onClick={() => toggleContribuicao('pix')}
                  >
                    vou mandar um PIX (R$ 25)
                  </button>
                  <button
                    className={`rsvp-tile rsvp-tile--small ${contribuicao === 'prato' ? 'rsvp-tile--selected' : ''}`}
                    onClick={() => toggleContribuicao('prato')}
                  >
                    vou levar um prato
                  </button>
                </div>
              </div>

              <AnimatePresence initial={false}>
                {contribuicao === 'pix' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="rsvp-field rsvp-pix-container"
                    ref={detalhesRef}
                  >
                    <div className="rsvp-options rsvp-options--small">
                      <button
                        className="rsvp-tile rsvp-tile--small rsvp-tile--action"
                        onClick={handleCopyPix}
                      >
                        {pixCopiado ? 'copiado!' : 'copiar chave pix (19997132723)'}
                      </button>
                      <a
                        href="https://api.whatsapp.com/send/?phone=551140041515&text=Enviar+para+19997132723+o+valor+de+R%24+25&type=phone_number&app_absent=0"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rsvp-tile rsvp-tile--small rsvp-tile--action rsvp-tile--link"
                      >
                        pix via whatsapp itaú
                      </a>
                    </div>
                  </motion.div>
                )}

                {contribuicao === 'prato' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="rsvp-field"
                    ref={detalhesRef}
                  >
                    <label htmlFor="comida">o que você vai levar?</label>
                    <input
                      id="comida"
                      type="text"
                      value={comidaInput}
                      onChange={(e) => setComidaInput(e.target.value)}
                      placeholder="ex: bolo de cenoura, brigadeiro..."
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {errorMessage && (
          <div className="rsvp-status-area">
            <p className="rsvp-error" role="alert">
              {errorMessage}
            </p>
          </div>
        )}
      </div>
    </section >
  );
}
