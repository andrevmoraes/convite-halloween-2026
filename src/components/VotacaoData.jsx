import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
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
  const headerRef = useRef(null);

  // Inicializa colapsado somente se já tiver votado completamente.
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return rsvpInit.presenca === 'nao' || (rsvpInit.presenca === 'sim' && rsvpInit.contribuicao !== null);
  });

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
          if (acompanhantesRef.current) {
            const offset = 24;
            const elementPosition = acompanhantesRef.current.getBoundingClientRect().top;
            window.scrollTo({ top: elementPosition + window.scrollY - offset, behavior: 'smooth' });
          }
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
          if (detalhesRef.current) {
            const offset = 24;
            const elementPosition = detalhesRef.current.getBoundingClientRect().top;
            window.scrollTo({ top: elementPosition + window.scrollY - offset, behavior: 'smooth' });
          }
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

  const handleToggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      if (!next) { // Só rola a tela se estiver expandindo
        setTimeout(() => {
          if (headerRef.current) {
            const offset = 24; // Espaçamento adequado do topo
            const elementPosition = headerRef.current.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.scrollY - offset;
            
            window.scrollTo({
              top: offsetPosition,
              behavior: 'smooth'
            });
          }
        }, 150);
      }
      return next;
    });
  };

  const springConfig = { type: "spring", stiffness: 300, damping: 25 };

  return (
    <LayoutGroup>
      <motion.section layout className="rsvp-container" aria-labelledby="rsvp-title">
        <motion.div layout className="rsvp-grid" ref={headerRef} transition={springConfig}>
          
          <motion.div 
            layout 
            className="rsvp-header" 
            onClick={handleToggleCollapse} 
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
          >
            <h2 id="rsvp-title" className="rsvp-title" style={{ margin: 0 }}>
              confirme sua presença
            </h2>
            <motion.div
              animate={{ rotate: isCollapsed ? 180 : 0 }}
              transition={{ duration: 0.3 }}
              style={{ display: 'flex' }}
            >
              <img width="96" height="96" src="https://img.icons8.com/windows/96/collapse-arrow.png" alt="collapse-arrow" className="tile-icon-img" style={{ width: '28px', height: '28px', margin: 0 }} />
            </motion.div>
          </motion.div>

          <AnimatePresence initial={false} mode="wait">
            {isCollapsed ? (
              <motion.div
                key="collapsed"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={springConfig}
                style={{ overflow: 'hidden', cursor: 'pointer' }}
                onClick={(e) => { setIsCollapsed(false); e.stopPropagation(); }}
              >
                {presenca && (
                  <p style={{ margin: 0, color: '#aaaaaa', fontSize: '1.1rem', fontWeight: 300 }}>
                    {presenca === 'sim' 
                      ? <><span style={{ color: '#fff' }}>eu vou</span> {contribuicao === 'pix' ? '• mandar PIX (R$ 25)' : contribuicao === 'prato' ? '• levar prato' : ''}</>
                      : <span style={{ color: '#ff4d4d' }}>não vou</span>}
                  </p>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="expanded"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={springConfig}
                style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'hidden' }}
              >
                <motion.p layout className="rsvp-subtitle">
                  <span className="rsvp-disclaimer">
                    ainda não tem certeza? você pode desmarcar suas escolhas clicando nelas novamente e voltar aqui depois!
                  </span>
                </motion.p>

                <motion.div layout className="rsvp-options">
                  <motion.button
                    className={`rsvp-tile ${presenca === 'sim' ? 'rsvp-tile--selected' : ''}`}
                    onClick={() => togglePresenca('sim')}
                    transition={springConfig}
                  >
                    eu vou
                  </motion.button>
                  <motion.button
                    className={`rsvp-tile rsvp-tile--red ${presenca === 'nao' ? 'rsvp-tile--selected' : ''}`}
                    onClick={() => togglePresenca('nao')}
                    transition={springConfig}
                  >
                    não vou
                  </motion.button>
                </motion.div>

                <AnimatePresence initial={false}>
                  {presenca === 'sim' && (
                    <motion.div
                      layout
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={springConfig}
                      className="rsvp-expanded-section"
                      ref={acompanhantesRef}
                      style={{ overflow: 'hidden' }}
                    >
                      <motion.div layout className="rsvp-field" style={{ marginBottom: 16 }}>
                        <label htmlFor="acompanhantes">
                          vai levar alguém? (acompanhantes restritos a cônjuges ou combinados previamente. informe nome e celular para participar do app na festa)
                        </label>
                        <textarea
                          id="acompanhantes"
                          rows="3"
                          value={acompanhantesInput}
                          onChange={(e) => setAcompanhantesInput(e.target.value)}
                          placeholder="ex: maria (11) 99999-9999"
                        />
                      </motion.div>

                      <motion.div layout className="rsvp-field">
                        <label>como vai contribuir? (fique à vontade para trazer a sua bebida alcoólica e não esqueça sua fantasia!)</label>
                        <span className="rsvp-drink-notice"> </span>

                        <div className="rsvp-options rsvp-options--small">
                          <motion.button
                            className={`rsvp-tile rsvp-tile--small ${contribuicao === 'pix' ? 'rsvp-tile--selected' : ''}`}
                            onClick={() => toggleContribuicao('pix')}
                            transition={springConfig}
                          >
                            vou mandar um PIX (R$ 25)
                          </motion.button>
                          <motion.button
                            className={`rsvp-tile rsvp-tile--small ${contribuicao === 'prato' ? 'rsvp-tile--selected' : ''}`}
                            onClick={() => toggleContribuicao('prato')}
                            transition={springConfig}
                          >
                            vou levar um prato
                          </motion.button>
                        </div>
                      </motion.div>

                      <AnimatePresence initial={false}>
                        {contribuicao === 'pix' && (
                          <motion.div
                            layout
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={springConfig}
                            className="rsvp-field rsvp-pix-container"
                            ref={detalhesRef}
                            style={{ overflow: 'hidden', marginTop: 16 }}
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
                            layout
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={springConfig}
                            className="rsvp-field"
                            ref={detalhesRef}
                            style={{ overflow: 'hidden', marginTop: 16 }}
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
              </motion.div>
            )}
          </AnimatePresence>

          {errorMessage && (
            <motion.div layout className="rsvp-status-area">
              <p className="rsvp-error" role="alert">
                {errorMessage}
              </p>
            </motion.div>
          )}
        </motion.div>
      </motion.section>
    </LayoutGroup>
  );
}
