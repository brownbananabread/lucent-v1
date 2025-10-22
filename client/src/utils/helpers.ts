/**
 * Local storage key for saved mines
 */
const SAVED_MINES_KEY = 'savedMines';

/**
 * Interface for saved mine data
 */
export interface SavedMine {
  mine_id: string;
  timestamp: number;
}

/**
 * Get all saved mines from local storage
 * @returns Array of saved mine objects
 */
export const getSavedMines = (): SavedMine[] => {
  try {
    const saved = localStorage.getItem(SAVED_MINES_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error('Error reading saved mines from localStorage:', error);
    return [];
  }
};

/**
 * Check if a mine is saved
 * @param mine_id - Mine ID to check
 * @returns True if mine is saved
 */
export const isMineSaved = (mine_id: string): boolean => {
  const savedMines = getSavedMines();
  return savedMines.some(mine => mine.mine_id === mine_id);
};

/**
 * Save a mine to local storage
 * @param mine_id - Mine ID to save
 * @returns True if successfully saved
 */
export const saveMine = (mine_id: string): boolean => {
  try {
    const savedMines = getSavedMines();
    const newMine: SavedMine = {
      mine_id,
      timestamp: Date.now()
    };
    
    // Check if mine is already saved
    if (savedMines.some(mine => mine.mine_id === mine_id)) {
      return false; // Already saved
    }
    
    const updatedMines = [...savedMines, newMine];
    localStorage.setItem(SAVED_MINES_KEY, JSON.stringify(updatedMines));
    return true;
  } catch (error) {
    console.error('Error saving mine to localStorage:', error);
    return false;
  }
};

/**
 * Remove a mine from local storage
 * @param mine_id - Mine ID to remove
 * @returns True if successfully removed
 */
export const removeSavedMine = (mine_id: string): boolean => {
  try {
    const savedMines = getSavedMines();
    const updatedMines = savedMines.filter(mine => mine.mine_id !== mine_id);
    localStorage.setItem(SAVED_MINES_KEY, JSON.stringify(updatedMines));
    return true;
  } catch (error) {
    console.error('Error removing mine from localStorage:', error);
    return false;
  }
};

/**
 * Toggle save status of a mine
 * @param mine_id - Mine ID to toggle
 * @returns True if mine is now saved, false if removed
 */
export const toggleMineSave = (mine_id: string): boolean => {
  if (isMineSaved(mine_id)) {
    removeSavedMine(mine_id);
    return false;
  } else {
    saveMine(mine_id);
    return true;
  }
}; 