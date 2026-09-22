import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import './PortaEntrada.css';

const BACKGROUND_IMAGE =
  '/midia/imagens/erica-marsland-huynh-bwrB_UAiv3s-unsplash.jpg';
const DOOR_AUDIO = '/midia/sons/door-open-close-click.wav';

const keypadRows = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['clear', '0', 'confirm'],
];

function formatPhoneNumber(digits) {
  const normalizedDigits = digits.slice(0, 11);

  if (normalizedDigits.length <= 2) {
    return normalizedDigits;
  }

  if (normalizedDigits.length <= 7) {
    return `(${normalizedDigits.slice(0, 2)}) ${normalizedDigits.slice(2)}`;
  }

  return `(${normalizedDigits.slice(0, 2)}) ${normalizedDigits.slice(
    2,
    7,
  )}-${normalizedDigits.slice(7)}`;
}

function playAudio(audio) {
  const playback = audio.play();

  if (playback !== undefined) {
    playback.catch((error) => {
      console.error('Não foi possível reproduzir o áudio.', error);
    });
  }
}

function playCreepyAudio() {
  const audio = new Audio(DOOR_AUDIO);
  playAudio(audio);
}

function playBeep() {
  // Reservado para o efeito sonoro de cada número.
}

export default function PortaEntrada({ onConfirm, onStartAudio }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const openingTimeoutRef = useRef(null);

  useEffect(() => () => {
    if (openingTimeoutRef.current) {
      window.clearTimeout(openingTimeoutRef.current);
    }
  }, []);

  const handleEnter = useCallback(() => {
    if (isOpen) {
      return;
    }

    setIsOpen(true);
    playCreepyAudio();
  }, [isOpen]);

  const handleDigit = useCallback((digit) => {
    setPin((currentPin) => {
      if (currentPin.length >= 11) {
        return currentPin;
      }

      return `${currentPin}${digit}`;
    });
    playBeep();
  }, []);

  const handleClear = useCallback(() => {
    setPin('');
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!pin || !onConfirm || isOpening || isLoading) {
      return;
    }

    setIsLoading(true);
    let userData;
    let error;

    try {
      const result = await supabase
        .from('convidados')
        .select('*')
        .eq('telefone', pin)
        .maybeSingle();

      userData = result.data;
      error = result.error;
    } catch (requestError) {
      setIsLoading(false);
      console.error('Não foi possível validar o telefone.', requestError);
      setPin('');
      setShakeKey((key) => key + 1);
      return;
    }

    setIsLoading(false);

    if (error) {
      console.error('Não foi possível validar o telefone.', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      setPin('');
      setShakeKey((key) => key + 1);
      return;
    }

    if (!userData) {
      console.warn('Acesso negado: nenhum convidado corresponde ao telefone.', {
        digitCount: pin.length,
      });
      setPin('');
      setShakeKey((key) => key + 1);
      return;
    }

    setIsOpening(true);
    onStartAudio?.();
    openingTimeoutRef.current = window.setTimeout(() => {
      onConfirm(userData);
    }, 1500);
  }, [isLoading, isOpening, onConfirm, onStartAudio, pin]);

  return (
    <main className={`porta-entrada ${isOpen ? 'porta-entrada--open' : ''}`}>
      <motion.div
        aria-hidden="true"
        className="porta-entrada__background"
        initial={{ scale: 1, filter: 'blur(0px)' }}
        animate={{
          scale: isOpening ? 4.5 : isOpen ? 1.65 : 1,
          filter: isOpening || isOpen ? 'blur(5px)' : 'blur(0px)',
          opacity: isOpening ? 0 : 1,
        }}
        transition={
          isOpening
            ? { duration: 1.5, ease: 'easeInOut' }
            : { duration: 1.8, ease: [0.22, 1, 0.36, 1] }
        }
        style={{ backgroundImage: `url("${BACKGROUND_IMAGE}")` }}
      />

      <div className="porta-entrada__shade" />

      <AnimatePresence mode="wait">
        {!isOpen ? (
          <motion.button
            key="enter"
            className="porta-entrada__enter"
            type="button"
            onClick={handleEnter}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span>Toque aqui para entrar</span>
          </motion.button>
        ) : !isOpening ? (
          <motion.section
            key={shakeKey}
            aria-label="Teclado numérico"
            className="porta-entrada__panel"
            initial={{ opacity: 0, y: 24 }}
            animate={{
              opacity: 1,
              y: 0,
              x: shakeKey ? [0, -12, 12, -8, 8, 0] : 0,
            }}
            exit={{ opacity: 0, y: 12, transition: { duration: 1 } }}
            transition={{
              delay: shakeKey ? 0 : 1.1,
              duration: shakeKey ? 0.45 : 0.7,
              ease: 'easeOut',
            }}
          >
            <p className="porta-entrada__eyebrow">Digite seu telefone</p>
            <div className="porta-entrada__display" aria-live="polite">
              {formatPhoneNumber(pin) || '—'}
            </div>

            <div className="porta-entrada__keypad">
              {keypadRows.flat().map((key) => {
                if (key === 'clear') {
                  return (
                    <button
                      className="porta-entrada__key porta-entrada__key--utility"
                      key={key}
                      type="button"
                      onClick={handleClear}
                      disabled={isOpening || isLoading}
                    >
                      Limpar
                    </button>
                  );
                }

                if (key === 'confirm') {
                  return (
                    <button
                      className="porta-entrada__key porta-entrada__key--confirm"
                      key={key}
                      type="button"
                      onClick={handleConfirm}
                      disabled={isOpening || isLoading}
                    >
                      Confirmar
                    </button>
                  );
                }

                return (
                  <button
                    className="porta-entrada__key"
                    key={key}
                    type="button"
                    onClick={() => handleDigit(key)}
                    disabled={isOpening || isLoading}
                  >
                    {key}
                  </button>
                );
              })}
            </div>
          </motion.section>
        ) : null}
      </AnimatePresence>
    </main>
  );
}
