import { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { formatarCaminhoImagem } from '../lib/formatarCaminhoImagem';
import './EditarPerfil.css';

const panoramaVariants = {
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

export default function EditarPerfil({ usuarioLogado, onUserUpdate, onBack, onLogout }) {
  const [formData, setFormData] = useState({
    nome: usuarioLogado?.nome || '',
    telefone: usuarioLogado?.telefone || '',
    genero: usuarioLogado?.genero || '',
  });
  const [fotoArquivo, setFotoArquivo] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(
    usuarioLogado?.foto_url ? formatarCaminhoImagem(usuarioLogado.foto_url) : null
  );
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  function handleFormChange(event) {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  }

  function handleGenderChange(genero) {
    setFormData((current) => ({ ...current, genero }));
  }

  function handleFotoChange(event) {
    const file = event.target.files[0];
    if (file) {
      setFotoArquivo(file);
      setFotoPreview(URL.createObjectURL(file));
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');

    const nome = formData.nome.trim();
    if (!nome) {
      setFormError('informe o seu nome.');
      return;
    }

    setIsSaving(true);

    try {
      let fotoUrlFinal = usuarioLogado?.foto_url;

      if (fotoArquivo) {
        const fileExt = fotoArquivo.name.split('.').pop();
        const fileName = `${usuarioLogado.id}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, fotoArquivo, { upsert: true });

        if (uploadError) {
          console.error('Erro ao fazer upload da foto:', uploadError);
          setFormError('não foi possível enviar a foto.');
          setIsSaving(false);
          return;
        }

        const { data: publicUrlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);

        fotoUrlFinal = `${publicUrlData.publicUrl}?t=${Date.now()}`;
      }

      const { data, error } = await supabase
        .from('convidados')
        .update({
          nome,
          telefone: formData.telefone.trim() || null,
          genero: formData.genero || null,
          foto_url: fotoUrlFinal,
        })
        .eq('id', usuarioLogado.id)
        .select()
        .single();

      if (error) {
        console.error('Não foi possível atualizar o perfil.', error);
        setFormError('não foi possível salvar as alterações.');
        setIsSaving(false);
        return;
      }

      onUserUpdate(data);
      onBack();
    } catch (error) {
      console.error('Erro inesperado ao atualizar o perfil.', error);
      setFormError('não foi possível salvar as alterações.');
      setIsSaving(false);
    }
  }

  return (
    <motion.section
      className="editar-perfil-view"
      aria-labelledby="editar-perfil-title"
      variants={panoramaVariants}
      initial="hidden"
      animate="visible"
    >
      <header className="editar-perfil-view__header">
        <h1 id="editar-perfil-title">editar perfil</h1>
      </header>

      <div className="editar-perfil-view__content">
        <form onSubmit={handleSubmit} className="editar-perfil-view__form">
          <div className="editar-perfil-view__photo-container">
            <label className="editar-perfil-view__photo-label">
              <input
                type="file"
                accept="image/*"
                className="editar-perfil-view__photo-input"
                onChange={handleFotoChange}
              />
              {fotoPreview ? (
                <img src={fotoPreview} alt="Sua foto" className="editar-perfil-view__photo-preview" />
              ) : (
                <>
                  <svg className="editar-perfil-view__photo-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z"/>
                    <path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/>
                  </svg>
                  <span className="editar-perfil-view__photo-text">alterar foto</span>
                </>
              )}
            </label>
          </div>

          <label htmlFor="perfil-nome">nome</label>
          <input
            id="perfil-nome"
            name="nome"
            type="text"
            value={formData.nome}
            onChange={handleFormChange}
            required
          />

          <fieldset>
            <legend>gênero</legend>
            <div className="editar-perfil-view__gender-options">
              {['m', 'f'].map((gender) => (
                <button
                  className={`editar-perfil-view__gender ${
                    formData.genero === gender
                      ? 'editar-perfil-view__gender--selected'
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

          <label htmlFor="perfil-telefone">telefone</label>
          <input
            id="perfil-telefone"
            name="telefone"
            type="tel"
            value={formData.telefone}
            onChange={handleFormChange}
            inputMode="tel"
          />

          {formError && (
            <p className="editar-perfil-view__error" role="alert">
              {formError}
            </p>
          )}

          <div className="editar-perfil-view__actions">
            <button type="submit" disabled={isSaving}>
              {isSaving ? 'salvando...' : 'salvar alterações'}
            </button>
            <button type="button" onClick={onBack} disabled={isSaving}>
              cancelar
            </button>
          </div>

          <div className="editar-perfil-view__logout">
            <button type="button" onClick={onLogout} disabled={isSaving} className="editar-perfil-view__btn-logout">
              sair da conta
            </button>
          </div>
        </form>
      </div>
    </motion.section>
  );
}
