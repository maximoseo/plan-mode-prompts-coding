import { useState, useEffect } from 'react';
import { openrouterApi } from '@/lib/api/openrouter';
import { MODEL_CATALOG, DEFAULT_MODEL, type ModelInfo } from '@/lib/models/catalog';

const STORAGE_KEY = 'selected-model';

export function useModelSelection() {
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_MODEL;
  });

  const [availableModels, setAvailableModels] = useState<ModelInfo[]>(MODEL_CATALOG);
  const [liveModels, setLiveModels] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, selectedModel);
  }, [selectedModel]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    openrouterApi.listModels().then(({ data, error }) => {
      if (cancelled || error || !data) {
        setIsLoading(false);
        return;
      }
      const liveIds = new Set(data.map(m => m.id));
      setLiveModels(liveIds);

      const available = MODEL_CATALOG.filter(m => liveIds.has(m.id));
      setAvailableModels(available.length > 0 ? available : MODEL_CATALOG);
      setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const selectModel = (modelId: string) => {
    setSelectedModel(modelId);
  };

  const isModelAvailable = (modelId: string) => liveModels.size === 0 || liveModels.has(modelId);

  return {
    selectedModel,
    selectModel,
    availableModels,
    isModelAvailable,
    isLoading,
  };
}
