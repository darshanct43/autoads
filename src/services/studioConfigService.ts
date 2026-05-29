import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  onSnapshot, 
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface StudioConfigItem {
  id?: string;
  name: string;
  description?: string;
  isEnabled: boolean;
  category?: string;
  imageUrl?: string;
  config?: any;
  createdAt?: any;
}

const THEMES_COL = 'studioConfig_themes';
const TEMPLATES_COL = 'studioConfig_templates';
const AI_MODELS_COL = 'studioConfig_aiModels';
const EDITING_TOOLS_COL = 'studioConfig_editingTools';
const CAMPAIGN_CATEGORIES_COL = 'studioConfig_campaignCategories';

const handleConfigUpdate = async (colName: string, data: Partial<StudioConfigItem>) => {
  if (data.id) {
    const { id, ...updates } = data;
    await updateDoc(doc(db, colName, id), { ...updates });
  } else {
    await addDoc(collection(db, colName), { ...data, createdAt: serverTimestamp() });
  }
};

export const studioConfigService = {
  // Themes
  subscribeToThemes(callback: (items: StudioConfigItem[]) => void) {
    return onSnapshot(query(collection(db, THEMES_COL)), (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudioConfigItem)));
    });
  },
  saveTheme(data: Partial<StudioConfigItem>) { return handleConfigUpdate(THEMES_COL, data); },
  deleteTheme(id: string) { return deleteDoc(doc(db, THEMES_COL, id)); },

  // Templates
  subscribeToTemplates(callback: (items: StudioConfigItem[]) => void) {
    return onSnapshot(query(collection(db, TEMPLATES_COL)), (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudioConfigItem)));
    });
  },
  saveTemplate(data: Partial<StudioConfigItem>) { return handleConfigUpdate(TEMPLATES_COL, data); },
  deleteTemplate(id: string) { return deleteDoc(doc(db, TEMPLATES_COL, id)); },

  // AI Models
  subscribeToAIModels(callback: (items: StudioConfigItem[]) => void) {
    return onSnapshot(query(collection(db, AI_MODELS_COL)), (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudioConfigItem)));
    });
  },
  saveAIModel(data: Partial<StudioConfigItem>) { return handleConfigUpdate(AI_MODELS_COL, data); },
  deleteAIModel(id: string) { return deleteDoc(doc(db, AI_MODELS_COL, id)); },

  // Editing Tools
  subscribeToEditingTools(callback: (items: StudioConfigItem[]) => void) {
    return onSnapshot(query(collection(db, EDITING_TOOLS_COL)), (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudioConfigItem)));
    });
  },
  saveEditingTool(data: Partial<StudioConfigItem>) { return handleConfigUpdate(EDITING_TOOLS_COL, data); },
  deleteEditingTool(id: string) { return deleteDoc(doc(db, EDITING_TOOLS_COL, id)); },

  // Campaign Categories
  subscribeToCategories(callback: (items: StudioConfigItem[]) => void) {
    return onSnapshot(query(collection(db, CAMPAIGN_CATEGORIES_COL)), (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudioConfigItem)));
    });
  },
  saveCategory(data: Partial<StudioConfigItem>) { return handleConfigUpdate(CAMPAIGN_CATEGORIES_COL, data); },
  deleteCategory(id: string) { return deleteDoc(doc(db, CAMPAIGN_CATEGORIES_COL, id)); },
};
