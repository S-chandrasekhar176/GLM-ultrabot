'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { startEngine, stopEngine } from '@/lib/api';
import { useEngineStatus } from './useApi';
import { useStore } from '@/lib/store';

export function useEngine() {
  const queryClient = useQueryClient();
  const setEngineStatus = useStore((s) => s.engine.setEngineStatus);

  const statusQuery = useEngineStatus();

  const startMutation = useMutation({
    mutationFn: startEngine,
    onSuccess: () => {
      setEngineStatus('running');
      queryClient.invalidateQueries({ queryKey: ['engine-status'] });
    },
  });

  const stopMutation = useMutation({
    mutationFn: stopEngine,
    onSuccess: () => {
      setEngineStatus('stopped');
      queryClient.invalidateQueries({ queryKey: ['engine-status'] });
    },
  });

  const pause = () => {
    setEngineStatus('paused');
  };

  const resume = () => {
    // Resume re-starts the engine
    startMutation.mutate();
  };

  return {
    ...statusQuery,
    start: startMutation.mutate,
    startAsync: startMutation.mutateAsync,
    stop: stopMutation.mutate,
    stopAsync: stopMutation.mutateAsync,
    pause,
    resume,
    isStarting: startMutation.isPending,
    isStopping: stopMutation.isPending,
  };
}

export default useEngine;
