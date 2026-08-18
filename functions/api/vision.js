import { analyzeImage } from '../../shared/tello-claude.js';
import { pagesHandler } from '../../shared/http.js';

export const onRequestPost = pagesHandler(analyzeImage);
