import React, { createContext, useContext, useEffect, useState } from 'react';
import { StudioConfigItem, studioConfigService } from '@/services/studioConfigService';

interface StudioConfigState {
  themes: StudioConfigItem[];
  templates: StudioConfigItem[];
  aiModels: StudioConfigItem[];
  editingTools: StudioConfigItem[];
  categories: StudioConfigItem[];
}

const StudioDynamicContext = createContext<StudioConfigState>({
  themes: [],
  templates: [],
  aiModels: [],
  editingTools: [],
  categories: []
});

export const useDynamicStudio = () => useContext(StudioDynamicContext);

export const StudioDynamicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<StudioConfigState>({
    themes: [],
    templates: [],
    aiModels: [],
    editingTools: [],
    categories: []
  });

  useEffect(() => {
    const unsubThemes = studioConfigService.subscribeToThemes(d => setState(s => ({ ...s, themes: d.filter(x => x.isEnabled) })));
    const unsubTemplates = studioConfigService.subscribeToTemplates(d => setState(s => ({ ...s, templates: d.filter(x => x.isEnabled) })));
    const unsubAi = studioConfigService.subscribeToAIModels(d => setState(s => ({ ...s, aiModels: d.filter(x => x.isEnabled) })));
    const unsubTools = studioConfigService.subscribeToEditingTools(d => setState(s => ({ ...s, editingTools: d.filter(x => x.isEnabled) })));
    const unsubCats = studioConfigService.subscribeToCategories(d => setState(s => ({ ...s, categories: d.filter(x => x.isEnabled) })));
    
    return () => {
      unsubThemes();
      unsubTemplates();
      unsubAi();
      unsubTools();
      unsubCats();
    };
  }, []);

  return (
    <StudioDynamicContext.Provider value={state}>
      {children}
    </StudioDynamicContext.Provider>
  );
};
