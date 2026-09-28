import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  formatarCaminhoImagem,
  PLACEHOLDER_PROFILE,
} from '../lib/formatarCaminhoImagem';
import EditarPerfil from './EditarPerfil';
import VotacaoData from './VotacaoData';
import './ConvidadosView.css';

const panoramaVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const turnstileVariants = {
  hidden: {
    opacity: 0,
    x: 80,
    rotateY: -20,
  },
  visible: {
    opacity: 1,
    x: 0,
    rotateY: 0,
    transition: {
      ease: 'easeOut',
      duration: 0.35,
    },
  },
};

function getBadgeData(value) {
  if (!value) return null;
  
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const pixPago = parsed.pix_pago === true;
      if (parsed.presenca === 'nao') return { text: 'não vai', type: 'nao-vai', pixPago };
      if (parsed.presenca === 'sim') {
        if (parsed.contribuicao === 'pix') return { text: 'PIX', type: 'pix', pixPago };
        if (parsed.contribuicao === 'prato' && parsed.comida) return { text: parsed.comida.toLowerCase(), type: 'prato', pixPago };
        return { text: 'confirmado', type: 'confirmado', pixPago };
      }
    }
  } catch {
    // Tratamento de Dados Legados
  }
  
  return null;
}

export default function ConvidadosView({ anfitriao, onBack }) {
  const [guests, setGuests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    nome: '',
    genero: '',
    telefone: '',
  });
  const [fotoArquivo, setFotoArquivo] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);

  const normalizedHostName = (anfitriao?.nome || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const isAdmin = normalizedHostName.includes('andre');
  const andreGuest = guests.find((guest) => {
    const normalizedGuestName = (guest.nome || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

    return normalizedGuestName.includes('andre');
  });
  const andrePhoto = andreGuest?.foto_url || '/midia/foto-perfil/andre-moraes.png';

  const [editingGuest, setEditingGuest] = useState(null);

  function openGuestForm() {
    setFormError('');
    setIsFormOpen(true);
  }

  function closeGuestForm() {
    if (isSaving) {
      return;
    }

    setFormError('');
    setFotoArquivo(null);
    setFotoPreview(null);
    setIsFormOpen(false);
  }

  function handleFormChange(event) {
    const { name, value } = event.target;
    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  }

  function handleFotoChange(event) {
    const file = event.target.files[0];
    if (file) {
      setFotoArquivo(file);
      setFotoPreview(URL.createObjectURL(file));
    }
  }

  function handleEditClick(guest) {
    if (editingGuest?.id === guest.id) {
      setEditingGuest(null);
    } else {
      setEditingGuest(guest);
    }
  }

  async function handleTogglePix(guest) {
    if (!isAdmin) return;
    
    try {
      let parsed = {};
      if (guest.data_votada) {
        parsed = JSON.parse(guest.data_votada);
      }
      
      parsed.pix_pago = !parsed.pix_pago;
      const newVotada = JSON.stringify(parsed);
      
      setGuests((currentGuests) =>
        currentGuests.map((g) =>
          g.id === guest.id ? { ...g, data_votada: newVotada } : g
        )
      );

      const { error } = await supabase
        .from('convidados')
        .update({ data_votada: newVotada })
        .eq('id', guest.id);
        
      if (error) {
        console.error('Erro ao atualizar PIX', error);
      }
    } catch (e) {
      console.error('Erro ao fazer parse do JSON do PIX', e);
    }
  }

  function handleGenderChange(genero) {
    setFormData((currentData) => ({
      ...currentData,
      genero,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');

    const nome = formData.nome.trim();
    const telefone = formData.telefone.trim();

    if (!nome) {
      setFormError('informe o nome do convidado.');
      return;
    }

    setIsSaving(true);

    try {
      const { data, error } = await supabase
        .from('convidados')
        .insert({
          nome,
          genero: formData.genero || null,
          telefone: telefone || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Não foi possível cadastrar o convidado.', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
        setFormError('não foi possível cadastrar o convidado.');
        return;
      }

      if (fotoArquivo) {
        const fileExt = fotoArquivo.name.split('.').pop();
        const fileName = `${data.id}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, fotoArquivo, { upsert: true });

        if (uploadError) {
          console.error('Erro ao fazer upload da foto:', uploadError);
        } else {
          const { data: publicUrlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);

          const fotoUrlFinal = `${publicUrlData.publicUrl}?t=${Date.now()}`;
          
          await supabase
            .from('convidados')
            .update({ foto_url: fotoUrlFinal })
            .eq('id', data.id);
            
          data.foto_url = fotoUrlFinal;
        }
      }

      setGuests((currentGuests) =>
        [...currentGuests, data].sort((firstGuest, secondGuest) =>
          (firstGuest.nome || '').localeCompare(secondGuest.nome || '', 'pt-BR'),
        ),
      );
      setFormData({ nome: '', genero: '', telefone: '' });
      setFotoArquivo(null);
      setFotoPreview(null);
      setIsFormOpen(false);
    } catch (error) {
      console.error('Erro inesperado ao cadastrar o convidado.', error);
      setFormError('não foi possível cadastrar o convidado.');
    } finally {
      setIsSaving(false);
    }
  }

  useEffect(() => {
    let isActive = true;

    async function loadGuests() {
      try {
        const { data, error } = await supabase
          .from('convidados')
          .select('*')
          .order('nome', { ascending: true });

        if (!isActive) {
          return;
        }

        if (error) {
          console.error('Não foi possível carregar os convidados.', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
          });
          setErrorMessage('Não foi possível carregar os convidados agora.');
          setIsLoading(false);
          return;
        }

        setGuests(data || []);
        setIsLoading(false);
      } catch (error) {
        if (!isActive) {
          return;
        }

        console.error('Erro inesperado ao carregar os convidados.', error);
        setErrorMessage('Não foi possível carregar os convidados agora.');
        setIsLoading(false);
      }
    }

    loadGuests();

    return () => {
      isActive = false;
    };
  }, []);

  const confirmedGuests = guests.filter((guest) => {
    const normalizedName = (guest.nome || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if (normalizedName.includes('andre')) return false;

    const badge = getBadgeData(guest.data_votada);
    return badge && badge.type !== 'nao-vai';
  });

  const absentGuests = guests.filter((guest) => {
    const badge = getBadgeData(guest.data_votada);
    return badge && badge.type === 'nao-vai';
  });

  return (
    <motion.section
      className="convidados-view"
      aria-labelledby="convidados-title"
      variants={panoramaVariants}
      initial="hidden"
      animate="visible"
    >
      <header className="convidados-view__header">
        <h1 id="convidados-title">convidados</h1>
      </header>

      <motion.div className="convidados-view__content" variants={panoramaVariants}>
        {isLoading && (
          <motion.p className="convidados-view__status" variants={turnstileVariants}>
            carregando...
          </motion.p>
        )}
        {errorMessage && (
          <motion.p
            className="convidados-view__status convidados-view__status--error"
            variants={turnstileVariants}
          >
            {errorMessage}
          </motion.p>
        )}
        {!isLoading && !errorMessage && (
          <>
            <motion.div
              className="convidados-view__highlight"
              variants={turnstileVariants}
            >
              <img
                className="convidados-view__highlight-photo"
                src={formatarCaminhoImagem(andrePhoto)}
                alt="Foto de André"
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = PLACEHOLDER_PROFILE;
                }}
              />
              <div className="convidados-view__highlight-text">
                <h2 className="convidados-view__highlight-name">
                  {(andreGuest?.nome || 'andré moraes').toLowerCase()}
                </h2>
                <p className="convidados-view__highlight-message">
                  "se você está nessa lista é porque eu gosto de você e você está
                  convidado para o maior evento do ano."
                </p>
              </div>
            </motion.div>
            {confirmedGuests.length > 0 ? (
              <motion.div className="convidados-view__list" variants={panoramaVariants}>
                {confirmedGuests.map((guest) => {
                  const badge = getBadgeData(guest.data_votada);
                  const isPixPago = badge && badge.type === 'pix' && badge.pixPago;
                  const badgeClasses = `metro-vote-badge metro-vote-badge--${badge?.type} ${isPixPago ? 'badge-pix-pago' : ''} ${badge?.type === 'pix' && isAdmin ? 'badge-pix-admin' : ''}`;

                  return (
                    <motion.div
                      className="convidados-view__person-wrapper"
                      key={guest.id}
                      variants={turnstileVariants}
                    >
                      <div className="convidados-view__person">
                        <img
                          className="convidados-view__photo"
                          src={formatarCaminhoImagem(guest.foto_url)}
                          alt={`Foto de ${guest.nome || 'convidado'}`}
                          onError={(event) => {
                            event.currentTarget.onerror = null;
                            event.currentTarget.src = PLACEHOLDER_PROFILE;
                          }}
                        />
                        <span className="convidados-view__name">
                          {(guest.nome || 'convidado').toLowerCase()}
                        </span>
                        {isAdmin && (
                          <button 
                            type="button" 
                            className="convidados-view__edit-btn" 
                            onClick={() => handleEditClick(guest)}
                          >
                            editar
                          </button>
                        )}
                        {badge && (
                          <span 
                            className={badgeClasses}
                            onClick={() => {
                              if (isAdmin && badge.type === 'pix') handleTogglePix(guest);
                            }}
                          >
                            {badge.text}
                          </span>
                        )}
                      </div>

                    </motion.div>
                  );
                })}
              </motion.div>
            ) : (
              <motion.div className="metro-empty-state" variants={turnstileVariants}>nenhum convidado confirmado ainda.</motion.div>
            )}

            {absentGuests.length > 0 && (
              <motion.div className="convidados-view__absent-section" variants={panoramaVariants}>
                <h3 className="convidados-view__absent-title">não vão</h3>
                <div className="convidados-view__list">
                  {absentGuests.map((guest) => (
                    <motion.div
                      className="convidados-view__person-wrapper"
                      key={guest.id}
                      variants={turnstileVariants}
                    >
                      <div className="convidados-view__person convidados-view__person--absent">
                        <img
                          className="convidados-view__photo"
                          src={formatarCaminhoImagem(guest.foto_url)}
                          alt={`Foto de ${guest.nome || 'convidado'}`}
                          onError={(event) => {
                            event.currentTarget.onerror = null;
                            event.currentTarget.src = PLACEHOLDER_PROFILE;
                          }}
                        />
                        <span className="convidados-view__name">
                          {(guest.nome || 'convidado').toLowerCase()}
                        </span>
                        {isAdmin && (
                          <button 
                            type="button" 
                            className="convidados-view__edit-btn" 
                            onClick={() => handleEditClick(guest)}
                          >
                            editar
                          </button>
                        )}
                      </div>

                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            <motion.button
              className="convidados-view__back"
              type="button"
              onClick={onBack}
              aria-label="Voltar para a página inicial"
              variants={turnstileVariants}
            >
              ← voltar
            </motion.button>
          </>
        )}
      </motion.div>

      {isAdmin && (
        <>
          <button
            className="convidados-view__add"
            type="button"
            onClick={openGuestForm}
            aria-label="Adicionar convidado"
          >
            +
          </button>

          {isFormOpen && (
            <div
              className="convidados-view__modal-backdrop"
              role="presentation"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                  closeGuestForm();
                }
              }}
            >
              <motion.div
                className="convidados-view__modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="novo-convidado-title"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h2 id="novo-convidado-title">novo convidado</h2>
                <form onSubmit={handleSubmit}>
                  <div className="convidados-view__photo-upload-container">
                    <label className="convidados-view__photo-upload-label">
                      <input
                        type="file"
                        accept="image/*"
                        className="convidados-view__photo-upload-input"
                        onChange={handleFotoChange}
                      />
                      {fotoPreview ? (
                        <img src={fotoPreview} alt="Preview" className="convidados-view__photo-preview" />
                      ) : (
                        <>
                          <svg className="convidados-view__photo-upload-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z"/>
                            <path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/>
                          </svg>
                          <span className="convidados-view__photo-upload-text">adicionar foto</span>
                        </>
                      )}
                    </label>
                  </div>

                  <label htmlFor="guest-name">nome</label>
                  <input
                    id="guest-name"
                    name="nome"
                    type="text"
                    value={formData.nome}
                    onChange={handleFormChange}
                    autoFocus
                    required
                  />

                  <fieldset>
                    <legend>gênero</legend>
                    <div className="convidados-view__gender-options">
                      {['m', 'f'].map((gender) => (
                        <button
                          className={`convidados-view__gender ${
                            formData.genero === gender
                              ? 'convidados-view__gender--selected'
                              : ''
                          }`}
                          key={gender}
                          type="button"
                          aria-pressed={formData.genero === gender}
                          onClick={() => handleGenderChange(gender)}
                        >
                          {gender}
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  <label htmlFor="guest-phone">telefone</label>
                  <input
                    id="guest-phone"
                    name="telefone"
                    type="tel"
                    value={formData.telefone}
                    onChange={handleFormChange}
                    inputMode="tel"
                  />

                  {formError && (
                    <p className="convidados-view__form-error" role="alert">
                      {formError}
                    </p>
                  )}

                  <div className="convidados-view__form-actions">
                    <button type="submit" disabled={isSaving}>
                      {isSaving ? 'salvando...' : 'salvar'}
                    </button>
                    <button type="button" onClick={closeGuestForm} disabled={isSaving}>
                      cancelar
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}

          {editingGuest && (
            <div
              className="convidados-view__modal-backdrop"
              role="presentation"
              style={{ zIndex: 10, display: 'block', overflowY: 'auto', padding: '2rem 1rem 12rem 1rem' }}
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                  setEditingGuest(null);
                }
              }}
            >
              <div style={{ margin: '0 auto', width: 'min(100%, 42rem)', borderRadius: '8px', overflow: 'hidden', background: '#000', border: '1px solid #333' }}>
                <EditarPerfil
                  usuarioLogado={editingGuest}
                  onUserUpdate={(updatedGuest) => {
                    setGuests((currentGuests) =>
                      currentGuests.map((g) => (g.id === updatedGuest.id ? updatedGuest : g)).sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'))
                    );
                    setEditingGuest(null);
                  }}
                  onBack={() => setEditingGuest(null)}
                />
                <div style={{ background: '#000', padding: '1.5rem', borderTop: '1px solid #333' }}>
                  <VotacaoData
                    usuarioLogado={editingGuest}
                    skipLocalStorage={true}
                    onUserUpdate={(updatedGuest) => {
                      setGuests((currentGuests) =>
                        currentGuests.map((g) => (g.id === updatedGuest.id ? updatedGuest : g)).sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'))
                      );
                      setEditingGuest(updatedGuest);
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </motion.section>
  );
}
