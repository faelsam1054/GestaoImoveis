import { useCallback, useEffect, useRef, useState } from "react";
import { registrarUltimaAtividade } from "@/lib/atividade";

// Eventos que contam como atividade real do usuario. Requisicoes automaticas
// (polling de notificacoes, refetch do react-query, websocket) nao passam por
// aqui - so interacao de verdade com a pagina reseta o timer.
const EVENTOS_ATIVIDADE = ["mousemove", "keydown", "click", "scroll", "touchstart", "wheel"] as const;
const DEBOUNCE_MS = 500;

interface UseIdleTimerOptions {
  timeout: number;
  warningBefore: number;
  onIdle: () => void;
  ativo: boolean;
}

interface UseIdleTimerResult {
  avisando: boolean;
  restanteMs: number;
  continuarConectado: () => void;
}

export function useIdleTimer({ timeout, warningBefore, onIdle, ativo }: UseIdleTimerOptions): UseIdleTimerResult {
  const [avisando, setAvisando] = useState(false);
  const [restanteMs, setRestanteMs] = useState(warningBefore);

  const idleTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const warningTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const onIdleRef = useRef(onIdle);
  onIdleRef.current = onIdle;

  const limparTimers = useCallback(() => {
    clearTimeout(idleTimeoutRef.current);
    clearTimeout(warningTimeoutRef.current);
    clearInterval(intervalRef.current);
  }, []);

  const agendar = useCallback(() => {
    registrarUltimaAtividade();
    limparTimers();
    setAvisando(false);
    setRestanteMs(warningBefore);

    warningTimeoutRef.current = setTimeout(() => {
      const inicioAviso = Date.now();
      setAvisando(true);
      setRestanteMs(warningBefore);
      intervalRef.current = setInterval(() => {
        setRestanteMs(Math.max(0, warningBefore - (Date.now() - inicioAviso)));
      }, 250);
    }, timeout - warningBefore);

    idleTimeoutRef.current = setTimeout(() => {
      limparTimers();
      setAvisando(false);
      onIdleRef.current();
    }, timeout);
  }, [timeout, warningBefore, limparTimers]);

  const registrarAtividade = useCallback(() => {
    // Debounce: mousemove/scroll disparam dezenas de vezes por segundo -
    // sem isso, reagendar os timers a cada evento pesaria desnecessariamente.
    if (debounceRef.current) return;
    debounceRef.current = setTimeout(() => {
      debounceRef.current = undefined;
    }, DEBOUNCE_MS);
    agendar();
  }, [agendar]);

  useEffect(() => {
    if (!ativo) {
      limparTimers();
      return;
    }

    agendar();
    for (const evento of EVENTOS_ATIVIDADE) {
      window.addEventListener(evento, registrarAtividade, { passive: true });
    }
    return () => {
      limparTimers();
      clearTimeout(debounceRef.current);
      for (const evento of EVENTOS_ATIVIDADE) {
        window.removeEventListener(evento, registrarAtividade);
      }
    };
  }, [ativo, agendar, registrarAtividade, limparTimers]);

  const continuarConectado = useCallback(() => {
    agendar();
  }, [agendar]);

  return { avisando, restanteMs, continuarConectado };
}
