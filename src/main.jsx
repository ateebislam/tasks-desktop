import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/geist-mono/500.css';
import './index.css';
import Root from './App.jsx';
import { applyTheme, readTheme, installThemeShortcut } from './theme.js';
import { installScrollbars } from './scrollbars.js';
import { installTruncationTips } from './truncation-tips.js';

applyTheme(readTheme());
installThemeShortcut();
installScrollbars();
installTruncationTips();

createRoot(document.getElementById('root')).render(<Root />);
