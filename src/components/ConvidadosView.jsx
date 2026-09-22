import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  formatarCaminhoImagem,
  PLACEHOLDER_PROFILE,
} from '../lib/formatarCaminhoImagem';
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

  const normalizedHostName = (anfitriao?.nome || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const isAndre = normalizedHostName.includes('andre');
  const andreGuest = guests.find((guest) => {
    const normalizedGuestName = (guest.nome || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

    return normalizedGuestName.includes('andre');
  });
  const andrePhoto = andreGuest?.foto_url || '/midia/foto-perfil/andre-moraes.png';

  function openGuestForm() {
    setFormError('');
    setIsFormOpen(true);
  }

  function closeGuestForm() {
    if (isSaving) {
      return;
    }

    setFormError('');
    setIsFormOpen(false);
  }

  function handleFormChange(event) {
    const { name, value } = event.target;
    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
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

      setGuests((currentGuests) =>
        [...currentGuests, data].sort((firstGuest, secondGuest) =>
          (firstGuest.nome || '').localeCompare(secondGuest.nome || '', 'pt-BR'),
        ),
      );
      setFormData({ nome: '', genero: '', telefone: '' });
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
              <p className="convidados-view__highlight-message">
                "se você está nessa lista é porque eu gosto de você e você está
                convidado para o maior evento do ano."
              </p>
            </motion.div>
            <motion.div className="convidados-view__list" variants={panoramaVariants}>
              {guests.map((guest) => (
                <motion.div
                  className="convidados-view__person"
                  key={guest.id}
                  variants={turnstileVariants}
                >
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
                </motion.div>
              ))}
            </motion.div>
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

      {isAndre && (
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
        </>
      )}
    </motion.section>
  );
}
