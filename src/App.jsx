
import React, { useState, useEffect, useRef, useLayoutEffect, useCallback, useMemo, createContext, useContext } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { check as checkForUpdate } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { getVersion } from '@tauri-apps/api/app';
import { emit, listen } from '@tauri-apps/api/event';
import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';
import { updateFade } from './scrollbars.js';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { register as registerShortcut, unregister as unregisterShortcut } from '@tauri-apps/plugin-global-shortcut';
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import { readTheme, setTheme, toggleTheme } from './theme.js';
import { Toaster, toast as sonner } from './components/ui/sonner.jsx';
import { DEVICE_ID, cloudNote, cloudLive, cloudStart, onCloudStatus, onCloudNotice, cloudConfigure, cloudSignIn, cloudSignOut, cloudForget, cloudFirstSync, cloudSyncNow, cloudFlush, cloudEnsureDoc, cloudDeleteDoc, cloudProfileLive, cloudProfileNote,
  cloudSignInGoogle, cloudMe, onCloudTeam, cloudPause, cloudResume, cloudForgetSyncState, cloudCanRecover, cloudRecoverStore, cloudReadStore, cloudEditStore, cloudInvite, cloudUpdateInvite, cloudCancelInvite, cloudUpdateMember, cloudRemoveMember, cloudClaim, cloudSetLogger, cloudTeam as cloudTeamNow, cloudStatus } from './cloud.js';
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } from './cloud-config.js';
const cn = (...a) => a.filter(Boolean).join(' ');

/* =========================================================
   Icons (lucide)
   ========================================================= */
const Icon = ({ children, className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cn(/(^|\s)size-/.test(className || '') ? '' : 'size-4', 'shrink-0', className)} aria-hidden="true">{children}</svg>
);
const I = {
  plus: p => <Icon {...p}><path d="M5 12h14"/><path d="M12 5v14"/></Icon>,
  play: p => <Icon {...p}><polygon points="6 3 20 12 6 21 6 3"/></Icon>,
  panelLeft: p => <Icon {...p}><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/></Icon>,
  pause: p => <Icon {...p}><rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/></Icon>,
  more: p => <Icon {...p}><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></Icon>,
  calendar: p => <Icon {...p}><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></Icon>,
  left: p => <Icon {...p}><path d="m15 18-6-6 6-6"/></Icon>,
  right: p => <Icon {...p}><path d="m9 18 6-6-6-6"/></Icon>,
  down: p => <Icon {...p}><path d="m6 9 6 6 6-6"/></Icon>,
  updown: p => <Icon {...p}><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></Icon>,
  arrowUp: p => <Icon {...p}><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></Icon>,
  arrowDown: p => <Icon {...p}><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></Icon>,
  columns: p => <Icon {...p}><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="M15 3v18"/></Icon>,
  trash: p => <Icon {...p}><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></Icon>,
  pencil: p => <Icon {...p}><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></Icon>,
  check: p => <Icon {...p}><path d="M20 6 9 17l-5-5"/></Icon>,
  x: p => <Icon {...p}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></Icon>,
  reset: p => <Icon {...p}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></Icon>,
  clipboard: p => <Icon {...p}><rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></Icon>,
  timer: p => <Icon {...p}><line x1="10" x2="14" y1="2" y2="2"/><line x1="12" x2="15" y1="14" y2="11"/><circle cx="12" cy="14" r="8"/></Icon>,
  cloud: p => <Icon {...p}><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></Icon>,
  cloudCheck: p => <Icon {...p}><path d="m17 15-5.5 5.5L9 18"/><path d="M5 17.743A7 7 0 1 1 15.71 10h1.79a4.5 4.5 0 0 1 1.5 8.742"/></Icon>,
  cloudOff: p => <Icon {...p}><path d="m2 2 20 20"/><path d="M5.782 5.782A7 7 0 0 0 9 19h8.5a4.5 4.5 0 0 0 1.307-.193"/><path d="M21.532 16.5A4.5 4.5 0 0 0 17.5 10h-1.79A7.008 7.008 0 0 0 10 5.07"/></Icon>,
  hdd: p => <Icon {...p}><line x1="22" x2="2" y1="12" y2="12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/><line x1="6" x2="6.01" y1="16" y2="16"/><line x1="10" x2="10.01" y1="16" y2="16"/></Icon>,
  zap: p => <Icon {...p}><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></Icon>,
  folder: p => <Icon {...p}><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></Icon>,
  arrowRight: p => <Icon {...p}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></Icon>,
  search: p => <Icon {...p}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></Icon>,
  copy: p => <Icon {...p}><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></Icon>,
  sliders: p => <Icon {...p}><path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/></Icon>,
  keyboard: p => <Icon {...p}><path d="M10 8h.01"/><path d="M12 12h.01"/><path d="M14 8h.01"/><path d="M16 12h.01"/><path d="M18 8h.01"/><path d="M6 8h.01"/><path d="M7 16h10"/><path d="M8 12h.01"/><rect width="20" height="16" x="2" y="4" rx="2"/></Icon>,
  chart: p => <Icon {...p}><path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></Icon>,
  inbox: p => <Icon {...p}><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></Icon>,
  listCheck: p => <Icon {...p}><path d="M11 18H3"/><path d="m15 18 2 2 4-4"/><path d="M16 12H3"/><path d="M16 6H3"/></Icon>,
  alert: p => <Icon {...p}><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></Icon>,
  trendUp: p => <Icon {...p}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></Icon>,
  flag: p => <Icon {...p}><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></Icon>,
  paperclip: p => <Icon {...p}><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></Icon>,
  upload: p => <Icon {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/></Icon>,
  download: p => <Icon {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/></Icon>,
  eye: p => <Icon {...p}><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></Icon>,
  file: p => <Icon {...p}><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></Icon>,
  sun: p => <Icon {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></Icon>,
  moon: p => <Icon {...p}><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></Icon>,
  monitor: p => <Icon {...p}><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></Icon>,
  loader: p => <Icon {...p}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></Icon>,
  grip: p => <Icon {...p}><circle cx="9" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="18" r="1"/></Icon>,
  layers: p => <Icon {...p}><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/></Icon>,
  ban: p => <Icon {...p}><circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/></Icon>,
  calendarCheck: p => <Icon {...p}><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="m9 16 2 2 4-4"/></Icon>,
  grid: p => <Icon {...p}><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></Icon>,
  up: p => <Icon {...p}><path d="m18 15-6-6-6 6"/></Icon>,
  lock: p => <Icon {...p}><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></Icon>,
  info: p => <Icon {...p}><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></Icon>,
  external: p => <Icon {...p}><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></Icon>,
  panelRight: p => <Icon {...p}><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M15 3v18"/></Icon>,
  panelCenter: p => <Icon {...p}><rect width="18" height="18" x="3" y="3" rx="2"/><rect width="10" height="10" x="7" y="7" rx="1"/></Icon>,
  maximize: p => <Icon {...p}><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></Icon>,
  home: p => <Icon {...p}><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></Icon>,
  table: p => <Icon {...p}><path d="M12 3v18"/><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/></Icon>,
  rows: p => <Icon {...p}><path d="M3 5h.01"/><path d="M3 12h.01"/><path d="M3 19h.01"/><path d="M8 5h13"/><path d="M8 12h13"/><path d="M8 19h13"/></Icon>,
  kanban: p => <Icon {...p}><path d="M6 5v11"/><path d="M12 5v6"/><path d="M18 5v14"/></Icon>,
  refresh: p => <Icon {...p}><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></Icon>,
  logout: p => <Icon {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></Icon>,
  user: p => <Icon {...p}><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></Icon>,
  gear: p => <Icon {...p}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></Icon>,
  sparkles: p => <Icon {...p}><path d="M9.94 15.5A2 2 0 0 0 8.5 14.06l-6.14-1.58a.5.5 0 0 1 0-.96L8.5 9.94A2 2 0 0 0 9.94 8.5l1.58-6.14a.5.5 0 0 1 .96 0L14.06 8.5A2 2 0 0 0 15.5 9.94l6.14 1.58a.5.5 0 0 1 0 .96L15.5 14.06a2 2 0 0 0-1.44 1.44l-1.58 6.14a.5.5 0 0 1-.96 0z"/></Icon>,
  archive: p => <Icon {...p}><rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/></Icon>,
  phone: p => <Icon {...p}><rect width="14" height="20" x="5" y="2" rx="2"/><path d="M12 18h.01"/></Icon>,
  globe: p => <Icon {...p}><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></Icon>,
  shield: p => <Icon {...p}><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></Icon>,
  layout: p => <Icon {...p}><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></Icon>,
  code: p => <Icon {...p}><path d="m16 18 6-6-6-6"/><path d="m8 6-6 6 6 6"/></Icon>,
  palette: p => <Icon {...p}><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.65-.75 1.65-1.69 0-.44-.18-.84-.44-1.13-.29-.29-.44-.65-.44-1.13a1.64 1.64 0 0 1 1.67-1.67h2c3.05 0 5.56-2.5 5.56-5.55C21.97 6.01 17.46 2 12 2z"/></Icon>,
  penTool: p => <Icon {...p}><path d="M15.7 21.3a1 1 0 0 1-1.4 0l-1.6-1.6a1 1 0 0 1 0-1.4l5.6-5.6a1 1 0 0 1 1.4 0l1.6 1.6a1 1 0 0 1 0 1.4Z"/><path d="m18 13-1.4-6.8a1 1 0 0 0-.8-.8L9 4l-5.3 5.3a1 1 0 0 0-.3.6L2 22l12.1-1.4a1 1 0 0 0 .6-.3L20 15"/><path d="m2.3 2.3 7.3 7.3"/><circle cx="11" cy="11" r="2"/></Icon>,
  database: p => <Icon {...p}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/></Icon>,
  server: p => <Icon {...p}><rect width="20" height="8" x="2" y="2" rx="2"/><rect width="20" height="8" x="2" y="14" rx="2"/><path d="M6 6h.01"/><path d="M6 18h.01"/></Icon>,
  box: p => <Icon {...p}><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></Icon>,
  rocket: p => <Icon {...p}><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></Icon>,
  cart: p => <Icon {...p}><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></Icon>,
  card: p => <Icon {...p}><rect width="20" height="14" x="2" y="5" rx="2"/><path d="M2 10h20"/></Icon>,
  users: p => <Icon {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></Icon>,
  mail: p => <Icon {...p}><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></Icon>,
  chat: p => <Icon {...p}><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></Icon>,
  bell: p => <Icon {...p}><path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/></Icon>,
  star: p => <Icon {...p}><path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/></Icon>,
  circleDot: p => <Icon {...p}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="1"/></Icon>,
};

/* =========================================================
   shadcn/ui components (ported to a single file)
   ========================================================= */
const buttonVariants = {
  default: 'bg-primary text-primary-foreground shadow hover:bg-primary/90',
  destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
  outline: 'border ui-fill hover:text-accent-foreground', // 0.20.2: filled grey, no outline (see .ui-fill in index.css)
  secondary: 'ui-fill text-secondary-foreground',
  ghost: 'hover:bg-accent hover:text-accent-foreground',
  link: 'text-primary underline-offset-4 hover:underline',
};
const buttonSizes = { default: 'h-9 px-4 py-2', sm: 'h-8 rounded-md px-3 text-xs', lg: 'h-10 rounded-md px-8', icon: 'h-9 w-9', 'icon-sm': 'h-8 w-8' };
const Button = React.forwardRef(({ variant = 'default', size = 'default', className, type = 'button', ...p }, ref) => (
  <button ref={ref} type={type} className={cn('inline-flex items-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50', /(^|\s)justify-/.test(className || '') ? '' : 'justify-center', buttonVariants[variant], buttonSizes[size], className)} {...p} />
));

const inputCls = 'flex h-9 w-full rounded-md border border-input px-3 py-1 text-base transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm ui-field';
const Input = React.forwardRef(({ className, ...p }, ref) => <input ref={ref} className={cn(inputCls, className)} {...p} />);
const Textarea = React.forwardRef(({ className, ...p }, ref) => (
  <textarea ref={ref} className={cn('flex min-h-[60px] w-full rounded-md border border-input px-3 py-2 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm ui-field', className)} {...p} />
));
const Label = ({ className, ...p }) => <label className={cn('text-sm font-medium leading-none', className)} {...p} />;
const Field = ({ label, htmlFor, children, className, hint }) => (
  <div className={cn('grid gap-2', className)}>
    <Label htmlFor={htmlFor}>{label}</Label>
    {children}
    {hint && <p className="text-[0.8rem] text-muted-foreground">{hint}</p>}
  </div>
);

const NativeSelect = ({ className, children, ...p }) => (
  <div className={cn('relative', className)}>
    <select className={cn(inputCls, 'appearance-none pr-8 cursor-pointer bg-background')} {...p}>{children}</select>
    <I.down className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 opacity-50" />
  </div>
);

const badgeVariants = {
  default: 'border-transparent bg-primary text-primary-foreground shadow',
  secondary: 'border-transparent bg-secondary text-secondary-foreground',
  destructive: 'border-transparent bg-destructive text-destructive-foreground shadow',
  outline: 'text-foreground',
};
const Badge = ({ variant = 'default', className, ...p }) => (
  <span className={cn('inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors whitespace-nowrap ui-fill', badgeVariants[variant], className)} {...p} />
);

const Card = ({ className, ...p }) => <div className={cn('rounded-xl border text-card-foreground ui-card', className)} {...p} />;

const Kbd = ({ children, className }) => (
  <kbd className={cn('pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground ui-fill', className)}>{children}</kbd>
);

// The signed-in person, so their Google photo can be shown wherever their name appears.
const MeContext = createContext(null);
// Your photo: one you picked, else your Google photo. '' means you removed it (0.19.13).
const photoOf = u => (!u || u.photo === '' ? null : u.photo || u.picture || null);
let meNow = null; // the signed-in person, for code outside React (Do not disturb mutes desktop notifications)
const Avatar = ({ name, className, picture }) => {
  const me = useContext(MeContext);
  const pic = picture || (me && photoOf(me) && name && norm(name) === norm(me.name) && !nameClash.has(norm(name)) ? photoOf(me) : null);
  const initials = (name || '').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
  return (
    <span className={cn('relative flex h-6 w-6 shrink-0 overflow-hidden rounded-full', className)}>
      {pic
        ? <img src={pic} alt="" className="h-full w-full object-cover" />
        : <span className="flex h-full w-full items-center justify-center rounded-full bg-muted text-[10px] font-medium">{initials || <I.user className="size-3" />}</span>}
    </span>
  );
};

const Separator = ({ className }) => <div role="separator" className={cn('shrink-0 bg-border h-px w-full', className)} />;

const Tabs = ({ value, onChange, items }) => (
  <div role="tablist" className="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground max-w-full overflow-x-auto">
    {items.map(it => (
      <button key={it.value} role="tab" type="button" aria-selected={value === it.value} data-state={value === it.value ? 'active' : 'inactive'}
        onClick={() => onChange(it.value)}
        className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow">
        {it.label}
        <span className="tnum text-xs text-muted-foreground">{it.count}</span>
      </button>
    ))}
  </div>
);

const Alert = ({ className, ...p }) => <div role="status" className={cn('relative w-full rounded-lg border px-4 py-3 text-sm ui-inset', className)} {...p} />;

const Table = ({ className, ...p }) => (
  <div className="relative w-full overflow-auto"><table className={cn('w-full caption-bottom text-sm', className)} {...p} /></div>
);
const TableHeader = p => <thead className="[&_tr]:border-b" {...p} />;
const TableBody = p => <tbody className="[&_tr:last-child]:border-0" {...p} />;
const TableRow = ({ className, ...p }) => <tr className={cn('border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted', className)} {...p} />;
const TableHead = ({ className, ...p }) => <th className={cn('h-10 px-2 text-left align-middle font-medium text-muted-foreground whitespace-nowrap', className)} {...p} />;
const TableCell = ({ className, ...p }) => <td className={cn('p-2 align-middle', className)} {...p} />;

const Empty = ({ icon, title, description, children }) => (
  <div className="flex flex-col items-center justify-center gap-4 p-12 text-center">
    <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-foreground">{icon}</div>
    <div className="grid gap-1 max-w-sm">
      <h3 className="text-lg font-medium tracking-tight">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
    {children}
  </div>
);

/* Floating layer used by Popover, Dropdown Menu and Combobox */
function useDismiss(open, setOpen, refs) {
  useEffect(() => {
    if (!open) return;
    // A click in a dropdown opened from inside this one (a Select in the sort popover) keeps this one open.
    // A dropdown opened from inside this one (a Select in the sort menu) is a later [data-float] panel:
    // clicks in it keep this one open, and Escape closes only it.
    const mine = () => refs.map(r => r.current).find(el => el && el.dataset && el.dataset.float);
    const isChild = el => { const m = mine(); return !!m && !!el && el !== m && !!(m.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING); };
    const down = e => { if (!refs.some(r => r.current && r.current.contains(e.target)) && !isChild(e.target.closest && e.target.closest('[data-float]'))) setOpen(false); };
    const key = e => { if (e.key === 'Escape' && ![...document.querySelectorAll('[data-float]')].some(isChild)) { e.stopPropagation(); setOpen(false); } };
    const away = () => setOpen(false);
    document.addEventListener('mousedown', down);
    document.addEventListener('touchstart', down, { passive: true });
    document.addEventListener('keydown', key, true);
    window.addEventListener('resize', away);
    return () => {
      document.removeEventListener('mousedown', down);
      document.removeEventListener('touchstart', down);
      document.removeEventListener('keydown', key, true);
      window.removeEventListener('resize', away);
    };
  }, [open]);
}
/* Motion (0.19.14): keeps a closing menu, dialog or panel on screen for its 150ms closing animation.
   Returns [mounted, closing, last]: `last` is what was showing while it was open, so the closing
   picture doesn't change underneath the animation. With "reduce motion" on, it closes at once. */
const OUT_MS = 150;
const reducedMotion = () => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
function usePresence(open, content) {
  const [mounted, setMounted] = useState(open);
  const last = useRef(content);
  if (open) last.current = content;
  useEffect(() => {
    if (open) { setMounted(true); return; }
    if (!mounted) return;
    if (reducedMotion()) { setMounted(false); return; }
    const id = setTimeout(() => setMounted(false), OUT_MS);
    return () => clearTimeout(id);
  }, [open]);
  return [open || mounted, !open && mounted, open ? content : last.current];
}

function Floating({ anchorRef, open, align = 'start', matchWidth, minMatch, className, children, panelRef }) {
  const [pos, setPos] = useState(null);
  const [shown, closing, kids] = usePresence(open, children);
  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;
    const place = () => {
      const r = anchorRef.current.getBoundingClientRect();
      const el = panelRef.current; const h = el ? el.offsetHeight : 0; const w = el ? el.offsetWidth : 0;
      const below = window.innerHeight - r.bottom;
      const top = below < h + 12 && r.top > h + 12 ? r.top - h - 4 : r.bottom + 4;
      let left = align === 'end' ? r.right - w : r.left;
      left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
      setPos({ top, left, width: matchWidth ? r.width : undefined, minWidth: minMatch ? r.width : undefined });
    };
    place();
    const id = requestAnimationFrame(place);
    window.addEventListener('scroll', place, true);
    return () => { cancelAnimationFrame(id); window.removeEventListener('scroll', place, true); };
  }, [open]);
  if (!shown) return null;
  return createPortal(
    <div ref={closing ? undefined : panelRef} data-float={closing ? undefined : '1'} aria-hidden={closing || undefined} style={{ position: 'fixed', top: pos ? pos.top : -9999, left: pos ? pos.left : -9999, width: pos && pos.width, minWidth: pos && pos.minWidth, maxWidth: 'calc(100vw - 16px)' }}
      className={cn('z-[80] rounded-md border bg-popover text-popover-foreground outline-none anim-pop ui-float', closing && 'anim-out', className)}>
      {kids}
    </div>, document.body);
}

/* quiet: grey icons that brighten on hover, as in the more-tools menu (0.19.12).
   An item with `toggle` (true/false) shows a switch and keeps the menu open. */
function DropdownMenu({ trigger, items, align = 'end', quiet = false, className }) {
  const [open, setOpen] = useState(false);
  const a = useRef(null), p = useRef(null);
  useDismiss(open, setOpen, [a, p]);
  useEffect(() => { if (open && p.current) { const f = p.current.querySelector('[role=menuitem]'); f && f.focus(); } }, [open]);
  const onKey = e => {
    const els = [...p.current.querySelectorAll('[role=menuitem]')]; const i = els.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); els[(i + 1) % els.length].focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); els[(i - 1 + els.length) % els.length].focus(); }
    if (e.key === 'Tab') setOpen(false);
  };
  return (
    <>
      {trigger({ ref: a, open, onClick: e => { e.stopPropagation(); setOpen(o => !o); }, 'aria-haspopup': 'menu', 'aria-expanded': open })}
      <Floating anchorRef={a} panelRef={p} open={open} align={align} className={cn('min-w-[10rem] p-1', className)}>
        <div role="menu" className={quiet ? 'menu-quiet' : undefined} onKeyDown={onKey} onClick={e => e.stopPropagation()}>
          {items.map((it, i) => it === 'sep'
            ? <div key={i} className="-mx-1 my-1 h-px bg-muted" />
            : <button key={i} role={it.toggle !== undefined ? 'menuitemcheckbox' : 'menuitem'} aria-checked={it.toggle !== undefined ? !!it.toggle : undefined} type="button"
                onClick={() => { if (it.toggle === undefined) setOpen(false); it.onSelect(); }}
                className={cn('group relative flex w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent focus:bg-accent focus:text-accent-foreground',
                  quiet && 'gap-2.5 rounded-md',
                  it.destructive && 'text-destructive hover:text-destructive focus:text-destructive')}>
                {it.icon}{it.label}
                {it.toggle !== undefined
                  ? <span aria-hidden="true" className={cn('ml-auto inline-flex h-4 w-7 shrink-0 items-center rounded-full p-0.5 transition-colors', it.toggle ? 'bg-primary' : 'bg-input')}>
                      <span className={cn('block size-3 rounded-full bg-background shadow-sm transition-transform', it.toggle && 'translate-x-3')} /></span>
                  : it.shortcut && <span className={cn('ml-auto text-xs', quiet ? 'tnum text-muted-foreground' : 'tracking-widest opacity-60')}>{it.shortcut}</span>}
              </button>)}
        </div>
      </Floating>
    </>
  );
}

/* Select: the app's own dropdown, used everywhere instead of the system one.
   options: [{ value, label, node?, icon?, group?, divider? }]
   multiple: value is a list; picking ticks or unticks an option and keeps the list open. */
function Select({ value, onChange, options, placeholder = 'Choose…', variant = 'field', className, id, label, footer, searchable, renderValue, icon, menuClassName, creatable, multiple }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [hi, setHi] = useState(0);
  const a = useRef(null), p = useRef(null), inp = useRef(null), lst = useRef(null);
  useDismiss(open, setOpen, [a, p]);
  const picked = o => (multiple ? (value || []).includes(o.value) : o.value === value);
  const sel = multiple ? ((value || []).length ? options.filter(picked) : null) : options.find(o => o.value === value);
  const canSearch = searchable ?? options.length > 8;
  const nq = norm(q);
  // creatable(text) returns an option for what you typed when nothing matches it exactly (e.g. a new person).
  const list = [...options.filter(o => !nq || norm(o.label).includes(nq) || (o.search && norm(o.search).includes(nq))),
    ...(creatable && nq && !options.some(o => norm(o.label) === nq) ? [creatable(q.trim())] : [])];
  useEffect(() => {
    if (!open) return;
    setQ('');
    setHi(Math.max(0, options.findIndex(o => o.value === value)));
    setTimeout(() => { (inp.current || lst.current) && (inp.current || lst.current).focus(); }, 0);
  }, [open]);
  useEffect(() => {
    if (!open || !lst.current) return;
    const el = lst.current.querySelector(`[data-i="${hi}"]`);
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
  }, [hi, open]);
  const pick = o => {
    if (multiple) { const v = value || []; onChange(v.includes(o.value) ? v.filter(x => x !== o.value) : [...v, o.value]); return; }
    onChange(o.value); setOpen(false); setTimeout(() => a.current && a.current.focus(), 0);
  };
  const onKey = e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi(h => Math.min(h + 1, list.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi(h => Math.max(h - 1, 0)); }
    else if (e.key === 'Home') { e.preventDefault(); setHi(0); }
    else if (e.key === 'End') { e.preventDefault(); setHi(list.length - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); if (list[hi]) pick(list[hi]); }
    else if (e.key === 'Tab') setOpen(false);
  };
  const triggerCls = {
    field: 'flex h-9 w-full items-center gap-2 rounded-md border border-input px-3 text-left text-base md:text-sm transition-colors hover:border-foreground/20 ui-field',
    ghost: 'inline-flex h-8 max-w-full items-center gap-2 rounded-md border border-transparent px-2 text-left text-sm transition-colors hover:bg-muted ui-quiet',
    chip: 'inline-flex h-7 max-w-[16rem] items-center gap-1.5 rounded-full border border-border px-2.5 text-xs text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground ui-fill',
    // A dropdown that reads as one word in a sentence (Automations, 0.19.12).
    word: 'inline-flex h-7 max-w-[16rem] items-center gap-1 rounded-md border border-border bg-secondary px-2 text-left text-[13px] font-medium text-foreground transition-colors hover:border-foreground/20 ui-fill',
  }[variant];
  let lastGroup = null;
  return (
    <>
      <button ref={a} id={id} type="button" aria-haspopup="listbox" aria-expanded={open} aria-label={label}
        onClick={() => setOpen(o => !o)}
        onKeyDown={e => { if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { e.preventDefault(); setOpen(true); } }}
        className={cn(triggerCls, 'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring', open && variant !== 'chip' && 'border-input', className)}>
        {icon}
        <span className={cn('flex min-w-0 items-center truncate', variant !== 'word' && 'flex-1', !sel && 'text-muted-foreground')}>
          {sel ? (renderValue ? renderValue(sel) : multiple ? <span className="flex flex-wrap items-center gap-1">{sel.map(o => <React.Fragment key={o.value}>{o.node || o.label}</React.Fragment>)}</span> : (sel.node || <span className="truncate">{sel.label}</span>)) : placeholder}
        </span>
        <I.down className={cn('shrink-0 opacity-50 transition-transform', variant === 'chip' || variant === 'word' ? 'size-3' : 'size-4', open && 'rotate-180')} />
      </button>
      <Floating anchorRef={a} panelRef={p} open={open} minMatch className={cn('p-1 min-w-[14rem]', menuClassName)}>
        <div onKeyDown={onKey}>
          {canSearch && (
            <input ref={inp} value={q} onChange={e => { setQ(e.target.value); setHi(0); }} placeholder="Search…" aria-label="Search options"
              className="mb-1 h-8 w-full border-b bg-transparent px-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none" />
          )}
          <div ref={lst} role="listbox" tabIndex={-1} aria-activedescendant={list[hi] ? `opt-${hi}` : undefined}
            className="max-h-[min(22rem,55vh)] overflow-y-auto focus-visible:outline-none">
            {list.map((o, i) => {
              const head = !nq && o.group && o.group !== lastGroup ? o.group : null;
              if (o.group) lastGroup = o.group;
              return (
                <React.Fragment key={String(o.value) + i}>
                  {(head && i > 0) || (o.divider && !nq && i > 0) ? <div className="mx-1 my-1 h-px bg-border" /> : null}
                  {head && <div className="px-2 pb-0.5 pt-1.5 text-xs text-muted-foreground">{head}</div>}
                  <div id={`opt-${i}`} data-i={i} role="option" aria-selected={picked(o)}
                    onMouseEnter={() => setHi(i)} onMouseDown={e => e.preventDefault()} onClick={() => pick(o)}
                    className={cn('flex min-h-8 cursor-default items-center gap-2 rounded-sm px-2 py-1 text-sm', i === hi && 'bg-accent text-accent-foreground')}>
                    {multiple && <span aria-hidden="true" className={cn('flex size-3.5 shrink-0 items-center justify-center rounded-[4px] border', picked(o) ? 'border-primary bg-primary text-primary-foreground' : 'border-input')}>{picked(o) && <I.check className="size-2.5" />}</span>}
                    {o.icon}
                    <span className="flex min-w-0 flex-1 items-center">{o.node || <span className="truncate">{o.label}</span>}</span>
                    {!multiple && o.value === value && <I.check className="size-3.5 shrink-0 text-muted-foreground" />}
                  </div>
                </React.Fragment>
              );
            })}
            {list.length === 0 && <div className="px-2 py-2 text-sm text-muted-foreground">Nothing found</div>}
          </div>
          {footer && (
            <>
              <div className="mx-1 my-1 h-px bg-border" />
              {footer(() => setOpen(false))}
            </>
          )}
        </div>
      </Floating>
    </>
  );
}

/* Popover */
function Popover({ trigger, children, align = 'start', className }) {
  const [open, setOpen] = useState(false);
  const a = useRef(null), p = useRef(null);
  useDismiss(open, setOpen, [a, p]);
  return (
    <>
      {trigger({ ref: a, open, onClick: () => setOpen(o => !o), 'aria-expanded': open })}
      <Floating anchorRef={a} panelRef={p} open={open} align={align} className={className}>{typeof children === 'function' ? children(() => setOpen(false)) : children}</Floating>
    </>
  );
}

/* Checkbox & Toggle Group */
const Checkbox = ({ checked, onChange, label }) => (
  <button type="button" role="checkbox" aria-checked={checked} aria-label={label} data-state={checked ? 'checked' : 'unchecked'} onClick={() => onChange(!checked)}
    className="peer flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-primary shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground">
    {checked && <I.check className="size-3" />}
  </button>
);
const ToggleGroup = ({ value, onChange, items, label }) => (
  <div role="radiogroup" aria-label={label} className="inline-flex items-center rounded-md shadow-sm">
    {items.map((it, i) => (
      <button key={it.value} type="button" role="radio" aria-checked={value === it.value} data-state={value === it.value ? 'on' : 'off'} onClick={e => onChange(it.value, e.currentTarget)}
        className={cn('inline-flex h-9 items-center justify-center gap-1.5 border border-input px-3 text-sm font-medium transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:z-10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring data-[state=on]:bg-accent data-[state=on]:text-accent-foreground ui-field',
          i === 0 ? 'rounded-l-md' : '-ml-px', i === items.length - 1 && 'rounded-r-md')}>
        {it.icon}{it.label}
      </button>
    ))}
  </div>
);

/* Calendar + Date Picker */
const pad = n => String(n).padStart(2, '0');
const toISO = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromISO = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };

// max (an ISO date) greys out the days after it, and marks that day: a task can't be due after its bucket ends.
function Calendar({ selected, onSelect, max }) {
  const base = selected ? fromISO(selected) : new Date();
  const [month, setMonth] = useState(new Date(base.getFullYear(), base.getMonth(), 1));
  const start = new Date(month); start.setDate(1 - month.getDay());
  const days = Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  const today = toISO(new Date());
  const nav = 'inline-flex items-center justify-center rounded-md h-7 w-7 border border-input p-0 opacity-50 hover:opacity-100 hover:bg-accent ui-field';
  return (
    <div className="p-3">
      <div className="relative flex items-center justify-center pt-1 pb-3">
        <button type="button" className={cn(nav, 'absolute left-1')} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Previous month"><I.left /></button>
        <div className="text-sm font-medium">{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</div>
        <button type="button" className={cn(nav, 'absolute right-1')} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Next month"><I.right /></button>
      </div>
      <div className="grid grid-cols-7">
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => <div key={d} className="w-8 text-center text-[0.8rem] font-normal text-muted-foreground pb-1">{d}</div>)}
        {days.map(d => {
          const iso = toISO(d), outside = d.getMonth() !== month.getMonth(), sel = iso === selected, isToday = iso === today;
          const late = !!max && iso > max, isMax = !!max && iso === max;
          return (
            <button key={iso} type="button" onClick={() => !late && onSelect(iso)} disabled={late} title={isMax ? 'Last possible day' : late ? 'After the last possible day' : undefined}
              className={cn('relative h-8 w-8 p-0 text-sm rounded-md font-normal tnum transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                isToday && !sel && 'bg-accent text-accent-foreground',
                sel && 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
                outside && !sel && 'text-muted-foreground opacity-50',
                late && 'cursor-not-allowed text-muted-foreground/40 line-through hover:bg-transparent hover:text-muted-foreground/40',
                isMax && !sel && 'ring-1 ring-inset ring-amber-500/70')}>
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
function DatePicker({ id, value, onChange, className, placeholder = 'Pick a date', format = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }, variant = 'outline', icon = true, max, note, resetLabel, onReset }) {
  const [open, setOpen] = useState(false);
  const a = useRef(null), p = useRef(null);
  useDismiss(open, setOpen, [a, p]);
  return (
    <>
      <Button id={id} ref={a} variant={variant} onClick={() => setOpen(o => !o)} className={cn('w-full justify-start text-left font-normal', !value && 'text-muted-foreground', className)}>
        {icon && <I.calendar />}
        {value ? fromISO(value).toLocaleDateString(undefined, format) : placeholder}
      </Button>
      <Floating anchorRef={a} panelRef={p} open={open} className="w-auto p-0">
        {note && <div className="max-w-[17rem] border-b px-3 py-2 text-xs leading-relaxed text-muted-foreground">{note}</div>}
        <Calendar selected={value} max={max} onSelect={v => { onChange(v); setOpen(false); }} />
        <div className="flex gap-2 border-t p-2">
          <Button size="sm" variant="ghost" className="flex-1" disabled={!!max && toISO(new Date()) > max} onClick={() => { onChange(toISO(new Date())); setOpen(false); }}>Today</Button>
          {onReset
            ? <Button size="sm" variant="ghost" className="flex-1" onClick={() => { onReset(); setOpen(false); }} disabled={value === max}>{resetLabel}</Button>
            : <Button size="sm" variant="ghost" className="flex-1" onClick={() => { onChange(''); setOpen(false); }} disabled={!value}>Clear</Button>}
        </div>
      </Floating>
    </>
  );
}

/* Combobox (assignee) */
function Combobox({ id, value, onChange, options, placeholder, createLabel = v => `Assign to “${v}”`, icon, inputClassName, hideIcon }) {
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const a = useRef(null), p = useRef(null);
  useDismiss(open, setOpen, [a, p]);
  const q = value.trim().toLowerCase();
  const list = options.filter(o => !q || o.toLowerCase().includes(q));
  const exact = options.some(o => o.toLowerCase() === q);
  const rows = [...list, ...(q && !exact ? [{ create: value.trim() }] : [])];
  const pick = r => { onChange(typeof r === 'string' ? r : r.create); setOpen(false); };
  const onKey = e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setHi(h => Math.min(h + 1, rows.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi(h => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter' && open && rows[hi]) { e.preventDefault(); pick(rows[hi]); }
  };
  return (
    <div ref={a} className="relative">
      <Input id={id} value={value} placeholder={placeholder} autoComplete="off" role="combobox" aria-expanded={open}
        onFocus={() => { setOpen(true); setHi(0); }} onChange={e => { onChange(e.target.value); setOpen(true); setHi(0); }} onKeyDown={onKey} className={cn(!hideIcon && 'pr-8', inputClassName)} />
      {!hideIcon && <I.updown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 opacity-50" />}
      <Floating anchorRef={a} panelRef={p} open={open && rows.length > 0} matchWidth className="p-1 max-h-60 overflow-auto">
        <div role="listbox">
          {rows.map((r, i) => {
            const label = typeof r === 'string' ? r : createLabel(r.create);
            const sel = typeof r === 'string' && r === value;
            return (
              <button key={label} type="button" role="option" aria-selected={sel} onMouseEnter={() => setHi(i)} onMouseDown={e => e.preventDefault()} onClick={() => pick(r)}
                className={cn('relative flex w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none', i === hi && 'bg-accent text-accent-foreground')}>
                {typeof r === 'string' ? (icon ? icon(r) : <Avatar name={r} className="h-5 w-5" />) : <I.plus />}
                <span className="truncate">{label}</span>
                {sel && <I.check className="ml-auto" />}
              </button>
            );
          })}
        </div>
      </Floating>
    </div>
  );
}

/* Sheet & Alert Dialog */
// Keeps a .scroll-fade element's edge fades right when its size or content changes (scrolling is handled globally).
function useEdgeFade(ref, on = true) {
  useLayoutEffect(() => {
    const el = ref.current; if (!on || !el) return;
    updateFade(el);
    const ro = new ResizeObserver(() => updateFade(el));
    ro.observe(el); [...el.children].forEach(c => ro.observe(c));
    const mo = new MutationObserver(() => { updateFade(el); [...el.children].forEach(c => ro.observe(c)); });
    mo.observe(el, { childList: true, subtree: true });
    return () => { ro.disconnect(); mo.disconnect(); };
  }, [on]);
}
function useLockScroll(on) {
  useEffect(() => { if (!on) return; const o = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = o; }; }, [on]);
}
const SHEET_VARIANTS = {
  side: 'fixed inset-y-0 right-0 z-50 flex h-full w-full flex-col border-l bg-background shadow-lg sm:w-[max(28rem,40vw)] sm:max-w-full anim-sheet',
  center: 'fixed left-1/2 top-1/2 z-50 flex h-[min(88vh,920px)] w-[min(880px,calc(100%-2rem))] flex-col overflow-hidden rounded-xl border bg-background anim-zoom ui-float',
  full: 'fixed inset-0 z-50 flex flex-col bg-background anim-fade',
};
function Sheet({ open, onClose, children, labelledBy, variant = 'side', onPick }) {
  useLockScroll(open);
  const [shown, closing, kids] = usePresence(open, children);
  useEffect(() => {
    if (!open) return;
    const k = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [open, onClose]);
  if (!shown) return null;
  return createPortal(
    <>
      {variant !== 'full' && <div className={cn('fixed inset-0 z-50 anim-fade', closing && 'anim-out', variant === 'side' ? 'bg-black/30' : 'bg-black/80')} onClick={e => {
        // With the side sheet open, clicking another task in the list behind it switches to that task.
        if (variant === 'side' && onPick) {
          e.currentTarget.style.pointerEvents = 'none';
          const under = document.elementFromPoint(e.clientX, e.clientY);
          e.currentTarget.style.pointerEvents = '';
          const row = under && under.closest && under.closest('[data-task-id]');
          if (row) { onPick(row.getAttribute('data-task-id')); return; }
        }
        onClose();
      }} />}
      <div role="dialog" aria-modal={closing ? undefined : 'true'} aria-hidden={closing || undefined} aria-labelledby={labelledBy}
        className={cn(SHEET_VARIANTS[variant] || SHEET_VARIANTS.side, closing && 'anim-out')}
        style={{ paddingTop: 'env(safe-area-inset-top,0px)', paddingBottom: 'env(safe-area-inset-bottom,0px)', ...(variant === 'center' ? { transform: 'translate(-50%,-50%)' } : {}) }}>
        {kids}
        <button type="button" onClick={onClose} aria-label="Close"
          className="absolute right-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          style={{ top: 'calc(1rem + env(safe-area-inset-top,0px))' }}><I.x /></button>
      </div>
    </>, document.body);
}
function AlertDialog({ open, title, description, confirmLabel, onConfirm, onCancel, cancelLabel = 'Cancel', destructive = true }) {
  const cancelRef = useRef(null);
  const [shown, closing, text] = usePresence(open, { title, description, confirmLabel, cancelLabel });
  useEffect(() => {
    if (!open) return;
    cancelRef.current && cancelRef.current.focus();
    const k = e => { if (e.key === 'Escape') { e.stopPropagation(); onCancel(); } };
    document.addEventListener('keydown', k, true);
    return () => document.removeEventListener('keydown', k, true);
  }, [open]);
  if (!shown) return null;
  return createPortal(
    <>
      <div className={cn('fixed inset-0 z-[70] bg-black/80 anim-fade', closing && 'anim-out')} />
      <div role="alertdialog" aria-modal={closing ? undefined : 'true'} aria-hidden={closing || undefined} className={cn('fixed left-1/2 top-1/2 z-[70] grid w-[calc(100%-2rem)] max-w-lg gap-4 rounded-lg border bg-background p-6 anim-zoom ui-float', closing && 'anim-out')} style={{ transform: 'translate(-50%,-50%)' }}>
        <div className="flex flex-col space-y-2 text-center sm:text-left">
          <h2 className="text-lg font-semibold">{text.title}</h2>
          <p className="text-sm text-muted-foreground">{text.description}</p>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button ref={cancelRef} variant="outline" onClick={onCancel}>{text.cancelLabel}</Button>
          <Button variant={destructive ? 'destructive' : 'default'} onClick={onConfirm}>{text.confirmLabel}</Button>
        </div>
      </div>
    </>, document.body);
}

/* Switch & Dialog */
const Switch = ({ checked, onChange, label }) => (
  <button type="button" role="switch" aria-checked={checked} aria-label={label} data-state={checked ? 'checked' : 'unchecked'} onClick={() => onChange(!checked)}
    className="inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=checked]:bg-primary data-[state=unchecked]:bg-input">
    <span data-state={checked ? 'checked' : 'unchecked'} className="pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0" />
  </button>
);
function Dialog({ open, onClose, title, description, children, footer, className }) {
  useLockScroll(open);
  const [shown, closing, view] = usePresence(open, { title, description, children, footer });
  useEffect(() => {
    if (!open) return;
    // An open @/# list inside the dialog takes Esc first.
    const k = e => { if (e.key === 'Escape') { if (e.target && e.target.closest && e.target.closest('[data-picking="1"]')) return; e.stopPropagation(); onClose(); } };
    document.addEventListener('keydown', k, true);
    return () => document.removeEventListener('keydown', k, true);
  }, [open, onClose]);
  if (!shown) return null;
  // The title and the buttons stay put; only the middle scrolls, with faded edges (0.19.12).
  return createPortal(
    <>
      <div className={cn('fixed inset-0 z-[70] bg-black/80 anim-fade', closing && 'anim-out')} onClick={closing ? undefined : onClose} />
      <div role="dialog" aria-modal={closing ? undefined : 'true'} aria-hidden={closing || undefined} aria-labelledby={closing ? undefined : 'dlg-title'}
        className={cn('fixed left-1/2 top-1/2 z-[70] flex max-h-[calc(100%-2rem)] w-[calc(100%-2rem)] flex-col gap-5 overflow-hidden rounded-lg border bg-background p-6 anim-zoom ui-float', closing && 'anim-out', className || 'max-w-2xl')} style={{ transform: 'translate(-50%,-50%)' }}>
        <div className="flex shrink-0 flex-col space-y-1.5 pr-6 text-left">
          <h2 id={closing ? undefined : 'dlg-title'} className="text-lg font-semibold leading-none tracking-tight break-words">{view.title}</h2>
          {view.description && <p className="text-sm text-muted-foreground">{view.description}</p>}
        </div>
        <DialogBody>{view.children}</DialogBody>
        {view.footer && <div className="flex shrink-0 flex-col-reverse gap-2 sm:flex-row sm:justify-end">{view.footer}</div>}
        <button type="button" onClick={onClose} aria-label="Close" className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"><I.x /></button>
      </div>
    </>, document.body);
}

// The scrolling middle of a dialog. The negative margins give focus rings and the scroll bar room at the edges.
function DialogBody({ children }) {
  const ref = useRef(null);
  useEdgeFade(ref);
  return <div ref={ref} className="scroll-fade -mx-6 -my-1 grid min-h-0 flex-1 gap-5 overflow-y-auto px-6 py-1">{children}</div>;
}

/* Toasts: shadcn/ui Sonner for the motion and stacking, drawn with the app's own toast design.
   Every message in the app goes through toast(title, description, opts); opts.undo adds an Undo button. */
// Set by the app, so a message's "Undo" button can undo the change it describes.
const undoHook = { current: null };
function ToastCard({ id, title, description, undo }) {
  return (
    <div className="flex w-[var(--width)] max-w-[calc(100vw-2rem)] items-start gap-3 rounded-lg border bg-background p-4 text-sm text-foreground ui-float">
      <div className="min-w-0 flex-1">
        <div className="font-medium">{title}</div>
        {description && <div className="text-muted-foreground mt-0.5">{description}</div>}
      </div>
      {undo && (
        <button type="button" onClick={() => { undoHook.current && undoHook.current(); sonner.dismiss(id); }}
          className="shrink-0 rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-muted ui-fill">Undo</button>
      )}
    </div>
  );
}
const toast = (title, description, opts = {}) => {
  const undo = !!opts.undo && !!undoHook.current;
  return sonner.custom(id => <ToastCard id={id} title={title} description={description} undo={undo} />,
    { ...(opts.id ? { id: opts.id } : {}), duration: opts.duration != null ? opts.duration : undo ? 6000 : 3000 });
};
// Errors and successes look the same as any other message.
toast.error = toast;
toast.success = toast;

/* =========================================================
   Data
   ========================================================= */
const STATUSES = [
  { id: 'todo', label: 'To do', dot: 'bg-orange-400', tone: 'bg-orange-100 text-orange-600 dark:bg-orange-950/70 dark:text-orange-300', icon: 'layers' },
  { id: 'doing', label: 'In progress', dot: 'bg-blue-500', tone: 'bg-blue-100 text-blue-600 dark:bg-blue-950/70 dark:text-blue-300', icon: 'loader' },
  { id: 'blocked', label: 'Blocked', dot: 'bg-red-500', tone: 'bg-red-100 text-red-600 dark:bg-red-950/70 dark:text-red-300', icon: 'ban' },
  { id: 'done', label: 'Done', dot: 'bg-emerald-500', tone: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/70 dark:text-emerald-300', icon: 'check' },
];
const S = Object.fromEntries(STATUSES.map((s, i) => [s.id, { ...s, i }]));
const LS = 'tasks-cache-v1';
const LS_RULES = 'tasks-rules-v1';
const RULES_DOC = '_rules';
const DEFAULT_PROJECTS = ['Kaufes - Mobile', 'Kaufes - Web'];
const DEFAULT_RULES = [{ id: 'r-kaufes', enabled: true, project: 'Kaufes - Mobile', trigger: 'done', action: 'copy', target: 'Kaufes - Web' }];
// Older versions only had "copy to another project when done" rules ({ from, to }).
const normalizeRule = r => r && r.trigger ? r : { id: r.id || newId(), enabled: r.enabled !== false, project: r.from || '', trigger: 'done', action: 'copy', target: r.to || '' };

/* Project colors (full class names, so Tailwind keeps them). */
const PROJECT_COLORS = {
  violet: { dot: 'bg-violet-500', soft: 'bg-violet-100 text-violet-700 dark:bg-violet-950/70 dark:text-violet-300', bar: 'bg-violet-500' },
  blue: { dot: 'bg-blue-500', soft: 'bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300', bar: 'bg-blue-500' },
  emerald: { dot: 'bg-emerald-500', soft: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300', bar: 'bg-emerald-500' },
  amber: { dot: 'bg-amber-500', soft: 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300', bar: 'bg-amber-500' },
  rose: { dot: 'bg-rose-500', soft: 'bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300', bar: 'bg-rose-500' },
  cyan: { dot: 'bg-cyan-500', soft: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/70 dark:text-cyan-300', bar: 'bg-cyan-500' },
  orange: { dot: 'bg-orange-500', soft: 'bg-orange-100 text-orange-700 dark:bg-orange-950/70 dark:text-orange-300', bar: 'bg-orange-500' },
  slate: { dot: 'bg-slate-500', soft: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300', bar: 'bg-slate-500' },
};
const COLOR_KEYS = Object.keys(PROJECT_COLORS);
// 0.19.13: each platform can have its own icon. Folder is the default, so platforms without one look as before.
// The icon is saved on the platform itself ({ id, name, color, icon }), which already syncs.
const PLATFORM_ICONS = [
  ['folder', 'Folder', 'default'], ['phone', 'Phone', 'mobile app ios android'], ['monitor', 'Desktop', 'computer screen pc mac'], ['globe', 'Globe', 'web website internet'],
  ['shield', 'Shield', 'admin security'], ['layout', 'Layout', 'dashboard panel page'], ['code', 'Code', 'developer api'], ['palette', 'Palette', 'design colour color'],
  ['penTool', 'Pen', 'design draw vector'], ['database', 'Database', 'data storage'], ['server', 'Server', 'backend hosting'], ['cloud', 'Cloud', 'hosting saas'],
  ['box', 'Box', 'package product'], ['rocket', 'Rocket', 'launch release'], ['cart', 'Cart', 'shop store ecommerce'], ['card', 'Card', 'payment billing'],
  ['users', 'People', 'team users customers crm'], ['mail', 'Mail', 'email newsletter'], ['chat', 'Chat', 'messages support'], ['bell', 'Bell', 'notifications alerts'],
  ['chart', 'Chart', 'analytics reports stats'], ['layers', 'Layers', 'stack'], ['star', 'Star', 'favourite favorite'], ['gear', 'Gear', 'settings config'],
];
const platformIconMap = { current: {} }; // norm(name) -> icon key; refreshed by the app as platforms change
const PIcon = ({ name, icon, className }) => {
  const k = icon || platformIconMap.current[norm(name || '')];
  const C = (k && PLATFORM_ICONS.some(x => x[0] === k) && I[k]) || I.folder;
  return <C className={className} />;
};
const autoColor = name => COLOR_KEYS[[...(name || '')].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % COLOR_KEYS.length];

/* Automations: "When a task [in project] [trigger] [its words], [action] [target]".
   0.19.14: a trigger can carry its own words in `when` ({ statuses, status, priority, person, days, hours, bstatus }),
   and a group can have "Only if" conditions in `only` ([{ field, op, value }]). Triggers marked hidden
   are kept for automations made before 0.19.14 and are only listed when one already uses them. */
const TRIGGERS = [
  { id: 'timer_started', label: 'timer starts', short: 'When its timer starts', group: 'Timer' },
  { id: 'timer_paused', label: 'timer is paused', short: 'When its timer is paused', group: 'Timer' },
  { id: 'timer_long', label: 'timer runs longer than', short: 'When its timer runs long', group: 'Timer', arg: 'hours' },
  { id: 'created', label: 'is created', short: 'When created', group: 'Status' },
  { id: 'status_to', label: 'status changes to', short: 'When its status changes', group: 'Status', arg: 'statuses' },
  { id: 'status_from', label: 'status changes from', short: 'When its status changes', group: 'Status', arg: 'statuses' },
  { id: 'started', label: 'is started (In progress)', short: 'When started', group: 'Status', hidden: true },
  { id: 'blocked', label: 'becomes blocked', short: 'When blocked', group: 'Status', hidden: true },
  { id: 'unblocked', label: 'is no longer blocked', short: 'When unblocked', group: 'Status', hidden: true },
  { id: 'done', label: 'is marked done', short: 'When done', group: 'Status' },
  { id: 'reopened', label: 'is reopened after being done', short: 'When reopened', group: 'Status' },
  { id: 'priority_to', label: 'priority changes to', short: 'When its priority changes', group: 'Details', arg: 'priority' },
  { id: 'assigned_to', label: 'gets assigned to', short: 'When assigned', group: 'Details', arg: 'person' },
  { id: 'assigned', label: 'gets a new assignee', short: 'When assigned', group: 'Details', hidden: true },
  { id: 'high', label: 'is set to High priority', short: 'When made High priority', group: 'Details', hidden: true },
  { id: 'deadline_changed', label: 'deadline is set or changed', short: 'When its deadline changes', group: 'Details' },
  { id: 'bucket_added', label: 'is added to a bucket', short: 'When added to a bucket', group: 'Details' },
  { id: 'file_added', label: 'gets a document attached', short: 'When a document is attached', group: 'Details' },
  { id: 'checklist', label: 'has its checklist finished', short: 'When the checklist is finished', group: 'Details' },
  { id: 'moved', label: 'is moved into the project', short: 'When moved into this project', group: 'Details' },
  { id: 'due_in', label: 'is due in', short: 'Before the deadline', group: 'Dates', arg: 'days' },
  { id: 'due_soon', label: 'is due tomorrow', short: 'A day before the deadline', group: 'Dates', hidden: true },
  { id: 'overdue', label: 'becomes overdue', short: 'When overdue', group: 'Dates' },
  { id: 'stale', label: 'has been in', short: 'When it sits in a status', group: 'Dates', arg: 'stale', menu: 'has been in a status for' },
  { id: 'bucket_moved', label: 'bucket moves to', short: 'When its bucket moves', group: 'Bucket', arg: 'bstatus', menu: 'its bucket moves to' },
];
// Triggers that depend on the time are checked when the app opens and every minute after.
const TIME_TRIGGERS = ['overdue', 'due_soon', 'due_in', 'stale', 'timer_long'];
const HOUR_OPTIONS = [['1', '1 hour'], ['2', '2 hours'], ['3', '3 hours'], ['4', '4 hours'], ['6', '6 hours'], ['8', '8 hours'], ['12', '12 hours']];
const DUE_IN_OPTIONS = [['1', '1 day'], ['2', '2 days'], ['3', '3 days'], ['5', '5 days'], ['7', 'a week'], ['14', '2 weeks']];
const STALE_OPTIONS = [['1', '1 day'], ['2', '2 days'], ['3', '3 days'], ['5', '5 days'], ['7', 'a week'], ['14', '2 weeks'], ['30', 'a month']];
const defaultWhen = id => ({ statuses: { statuses: [] }, hours: { hours: '4' }, days: { days: '1' }, stale: { status: 'doing', days: '3' }, priority: { priority: 'high' }, person: { person: '' }, bstatus: { bstatus: (BUCKET_STATUSES[0] || {}).id || 'planned' } })[(TRIGGERS.find(t => t.id === id) || {}).arg] || undefined;
const ACTIONS = [
  { id: 'status', label: 'change its status to', target: 'status' },
  { id: 'priority', label: 'set its priority to', target: 'priority' },
  { id: 'assign', label: 'assign it to', target: 'person' },
  { id: 'unassign', label: 'remove its assignee', target: 'none' },
  { id: 'deadline', label: 'set its deadline to', target: 'days' },
  { id: 'checklist', label: 'add checklist items', target: 'text', placeholder: 'For example: Brief, Design, Review' },
  { id: 'start_timer', label: 'start its timer', target: 'none', divider: true },
  { id: 'stop_timer', label: 'pause its timer', target: 'none' },
  { id: 'bucket', label: 'move it to bucket', target: 'bucket' },
  { id: 'unblock', label: 'clear what blocks it', target: 'none' },
  { id: 'copy', label: 'create a copy in', target: 'project', divider: true },
  { id: 'move', label: 'move it to', target: 'project' },
  { id: 'notify', label: 'notify me', target: 'text', optional: true, placeholder: 'Message (optional)' },
];
/* "Only if" conditions. They're checked on the task as it was just before the change that set the
   automation off ("timer starts, only if its status is To do"), or as it is now for time-based ones. */
const COND_FIELDS = [
  { id: 'status', label: 'its status', ops: [['is', 'is'], ['not', 'is not']] },
  { id: 'priority', label: 'its priority', ops: [['is', 'is'], ['not', 'is not']] },
  { id: 'assignee', label: 'its assignee', ops: [['is', 'is'], ['not', 'is not']] },
  { id: 'timer', label: 'its timer', ops: [['running', 'is running'], ['stopped', 'is not running']] },
];
const COND = Object.fromEntries(COND_FIELDS.map(c => [c.id, c]));
const condDefault = field => ({ field, op: COND[field].ops[0][0], value: field === 'status' ? [] : field === 'priority' ? 'high' : '' });
/* Rules from 0.19.14 that a PC on an older version can't read are stored switched off for it
   (enabled: false), with the real switch in `on` (v: 2). Older PCs then skip them instead of
   misreading them; this version reads `on`. */
const OLD_TRIGGER_IDS = ['created', 'started', 'blocked', 'unblocked', 'done', 'reopened', 'due_soon', 'overdue', 'checklist', 'assigned', 'high', 'file_added', 'moved'];
const OLD_ACTION_IDS = ['copy', 'move', 'status', 'priority', 'assign', 'unassign', 'deadline', 'checklist', 'stop_timer', 'notify'];
const ruleIsNew = r => r.scope !== 'bucket' && (!OLD_TRIGGER_IDS.includes(r.trigger) || !OLD_ACTION_IDS.includes(r.action)
  || (r.only && r.only.length > 0) || (r.action === 'status' && String(r.target || '').includes('|')));
const ruleIn = r => (r && r.v === 2 ? { ...r, enabled: r.on !== false } : r);
const ruleOut = r => { const { v, on, ...x } = r; return ruleIsNew(x) ? { ...x, v: 2, on: !!x.enabled, enabled: false } : x; };
// The workspace's task statuses, for the sentences automations show. Set by App on each render.
let STAGES_NOW = [];
// A status as automations store it: the group's id ("doing"), or "group|status id" for your own ones.
const statusKeyOf = d => (d.builtin ? d.group : `${d.group}|${d.id}`);
const taskStatusKey = (t, stages) => statusKeyOf(statusDef(t, stages));
const statusKeyLabel = k => { const d = statusList(STAGES_NOW).find(x => statusKeyOf(x) === k); return d ? d.name : (S[k] || { label: 'a deleted status' }).label; };
const condHolds = (c, t, stages) => {
  if (!c || !COND[c.field]) return true;
  if (c.field === 'timer') return !!t.timerStartedAt === (c.op === 'running');
  let hit;
  if (c.field === 'status') { const v = Array.isArray(c.value) ? c.value : []; if (!v.length) return true; hit = v.includes(taskStatusKey(t, stages)); }
  else if (c.field === 'priority') hit = (t.priority || 'normal') === c.value;
  else hit = norm(t.assignee) === norm(c.value);
  return c.op === 'not' ? !hit : hit;
};
const DEADLINE_OPTIONS = [['0', 'today'], ['1', 'tomorrow'], ['2', 'in 2 days'], ['3', 'in 3 days'], ['7', 'in a week'], ['14', 'in 2 weeks'], ['30', 'in a month'], ['none', 'no deadline']];
const TRIG = Object.fromEntries(TRIGGERS.map(t => [t.id, t]));
const ACT = Object.fromEntries(ACTIONS.map(a => [a.id, a]));
const norm = s => (s || '').trim().toLowerCase();
const LS_VIEW = 'tasks-view-v1';
const PRIORITIES = [{ id: 'low', label: 'Low', i: 2 }, { id: 'normal', label: 'Medium', i: 1 }, { id: 'high', label: 'High', i: 0 }];
const PRI_PILL = { high: 'bg-red-100 text-red-700 dark:bg-red-950/70 dark:text-red-300', normal: 'bg-orange-100 text-orange-700 dark:bg-orange-950/70 dark:text-orange-300', low: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' };
const P = Object.fromEntries(PRIORITIES.map(p => [p.id, p]));
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const targetText = r => {
  const kind = (ACT[r.action] || {}).target;
  if (kind === 'none') return '';
  if (r.action === 'status') return r.target ? statusKeyLabel(r.target) : '';
  if (r.action === 'priority') return (P[r.target] || {}).label;
  if (r.action === 'deadline') return (DEADLINE_OPTIONS.find(o => o[0] === r.target) || [])[1];
  if (kind === 'text') return r.target ? `“${r.target}”` : '';
  return r.target;
};
const describeRule = r => {
  if (r.scope === 'bucket') return `When a bucket moves to ${(BS[r.status] || { label: 'a deleted status' }).label}, create “${r.title || '{bucket}'}”${r.target ? ` in ${r.target}` : ''}`;
  const a = ACT[r.action] || {};
  const tail = a.target === 'none' || (a.optional && !r.target) ? '' : ` ${targetText(r) || '…'}`;
  return `${r.project ? `In ${r.project}, when` : 'When'} a task ${triggerText(r)}, ${a.label}${tail}`;
};
// The trigger with its own words: "status changes to Ready for dev or In review".
const triggerText = r => {
  const t = TRIG[r.trigger]; if (!t) return 'changes';
  const w = r.when || {}, pick = (list, v) => (list.find(o => o[0] === String(v)) || [])[1] || '…';
  const ors = l => l.length > 1 ? `${l.slice(0, -1).join(', ')} or ${l[l.length - 1]}` : l[0] || '…';
  if (t.arg === 'statuses') return `${t.label} ${ors((w.statuses || []).map(statusKeyLabel))}`;
  if (t.arg === 'hours') return `${t.label} ${pick(HOUR_OPTIONS, w.hours)}`;
  if (t.arg === 'days') return `${t.label} ${pick(DUE_IN_OPTIONS, w.days)}`;
  if (t.arg === 'stale') return `${t.label} ${w.status ? statusKeyLabel(w.status) : '…'} for ${pick(STALE_OPTIONS, w.days)}`;
  if (t.arg === 'priority') return `${t.label} ${(P[w.priority] || { label: '…' }).label}`;
  if (t.arg === 'person') return `${t.label} ${w.person || 'anyone'}`;
  if (t.arg === 'bstatus') return `${t.label} ${(BS[w.bstatus] || { label: '…' }).label}`;
  return t.label;
};

/* Buckets have a status that says where their work stands. Buckets from before 0.12 start as In design.
   Since 0.17 the list can be edited (rename, recolor, reorder, add, delete) and is kept in the
   workspace's settings as bucketStatuses. Done always exists: it decides what counts as finished. */
const BUCKET_COLORS = {
  slate: { dot: 'bg-slate-400', bar: 'border-slate-400/60 bg-slate-500/25' },
  gray: { dot: 'bg-zinc-400', bar: 'border-zinc-400/60 bg-zinc-500/25' },
  brown: { dot: 'bg-amber-700', bar: 'border-amber-700/70 bg-amber-700/25' },
  orange: { dot: 'bg-orange-500', bar: 'border-orange-500/70 bg-orange-500/25' },
  yellow: { dot: 'bg-yellow-500', bar: 'border-yellow-500/70 bg-yellow-500/25' },
  green: { dot: 'bg-emerald-500', bar: 'border-emerald-500/60 bg-emerald-500/20' },
  sky: { dot: 'bg-sky-500', bar: 'border-sky-500/70 bg-sky-500/25' },
  blue: { dot: 'bg-blue-500', bar: 'border-blue-500/70 bg-blue-500/25' },
  purple: { dot: 'bg-violet-500', bar: 'border-violet-500/70 bg-violet-500/25' },
  pink: { dot: 'bg-pink-500', bar: 'border-pink-500/70 bg-pink-500/25' },
  red: { dot: 'bg-red-500', bar: 'border-red-500/70 bg-red-500/25' },
};
const DEFAULT_BUCKET_STATUSES = [
  { id: 'planned', label: 'Planned', color: 'slate' },
  { id: 'design', label: 'In design', color: 'purple' },
  { id: 'ready', label: 'Ready for dev', color: 'sky' },
  { id: 'done', label: 'Done', color: 'green' },
];
let BUCKET_STATUSES = [], BS = {};
const applyBucketStatuses = list => {
  const src = Array.isArray(list) && list.length ? list : DEFAULT_BUCKET_STATUSES;
  const withDone = src.some(x => x.id === 'done') ? src : [...src, DEFAULT_BUCKET_STATUSES[3]];
  BUCKET_STATUSES = withDone.map(x => { const c = BUCKET_COLORS[x.color] || BUCKET_COLORS.gray; return { ...x, dot: c.dot, bar: c.bar }; });
  BS = Object.fromEntries(BUCKET_STATUSES.map(s => [s.id, s]));
};
applyBucketStatuses(null);
// A bucket whose status was deleted shows the first status (normally Planned).
const bucketStatus = b => (b && BS[b.status] ? b.status : b && !b.status && BS.design ? 'design' : BUCKET_STATUSES[0].id);
const BucketStatusPill = ({ status, className }) => (
  <span className={cn('inline-flex min-w-0 items-center gap-1.5', className)}><span className={cn('size-2 shrink-0 rounded-full', BS[status].dot)} /><span className="truncate">{BS[status].label}</span></span>
);
// A bucket automation creates one task when a bucket moves to a status. {bucket} in the title becomes the bucket's name.
const fillBucket = (text, b) => (text || '{bucket}').replace(/\{bucket\}/gi, b.name);

/* Scope tracking (0.19.3): why buckets keep growing.
   A task "joins" a bucket when it's created in it or moved into it (task.bucketJoin = { name, at }).
   Tasks that join after the bucket's planned start day are "added later". Each can carry a reason
   (task.addedReason): bug, change request, missed requirement or other; "planned" says it was part
   of the plan after all and stops it counting. When a bucket starts, its end date is kept as the
   original end (bucket.baseEnd), and every later change of the end is logged in bucket.moves. */
const ADD_REASONS = [
  { id: 'bug', label: 'Bug', short: 'bug', dot: 'bg-red-500', pill: 'bg-red-100 text-red-700 dark:bg-red-950/70 dark:text-red-300' },
  { id: 'change', label: 'Change request', short: 'change request', dot: 'bg-amber-500', pill: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300' },
  { id: 'missed', label: 'Missed requirement', short: 'missed requirement', dot: 'bg-violet-500', pill: 'bg-violet-100 text-violet-700 dark:bg-violet-950/70 dark:text-violet-300' },
  { id: 'other', label: 'Other', short: 'other', dot: 'bg-slate-400', pill: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
];
const AR = Object.fromEntries(ADD_REASONS.map(r => [r.id, r]));
const NO_REASON = { id: 'none', label: 'No reason yet', short: 'no reason', dot: 'bg-zinc-500/50', pill: 'bg-muted text-muted-foreground' };
const reasonOf = t => AR[t.addedReason] || NO_REASON;
// Tasks that join on the start day still count as planned: that's usually the planning itself.
const scopeFrom = b => (b && b.start ? +addDays(fromISO(b.start), 1) : null);
const joinedAt = t => (t.bucketJoin && t.bucketJoin.name === norm(t.bucket) ? t.bucketJoin.at : t.createdAt || 0);
// Tasks made by a bucket automation are part of the bucket's process, never added scope.
const joinedLate = (t, b) => { const s = scopeFrom(b); return s != null && !t.inbox && !(t.generatedBy && !t.generatedFrom) && joinedAt(t) >= s; };
const isAddedLater = (t, b) => joinedLate(t, b) && t.addedReason !== 'planned';
const nDays = n => `${n} ${n === 1 ? 'day' : 'days'}`;
const nTasks = n => `${n} ${n === 1 ? 'task' : 'tasks'}`;
/* Impact of added tasks (0.19.15): their tracked time turned into working days (8h a day, Monday to Friday),
   compared with how far the end has already moved. The app only suggests a new end; it never moves it by itself. */
const DAY_HOURS = 8, DAY_MS = DAY_HOURS * 3600000;
const isWeekend = d => d.getDay() === 0 || d.getDay() === 6;
const addWorkdays = (d, n) => { let x = new Date(d); while (n > 0) { x = addDays(x, 1); if (!isWeekend(x)) n--; } return x; };
const workdaysBetween = (a, b) => { if (+b === +a) return 0; if (b < a) return -workdaysBetween(b, a); let n = 0, x = new Date(a); while (x < b) { x = addDays(x, 1); if (!isWeekend(x)) n++; } return n; };
const fmtWorkDays = ms => { const d = Math.round(ms / DAY_MS * 2) / 2; return d < 0.5 ? 'under half a working day' : d === 0.5 ? 'about half a working day' : `about ${String(d).replace('.5', '½')} working ${d === 1 ? 'day' : 'days'}`; };
function bucketScope(b, tasks) {
  if (!b || !b.start) return null;
  const todayISO = toISO(new Date());
  const ts = tasks.filter(t => !t.inbox && norm(t.bucket) === norm(b.name));
  const added = ts.filter(t => isAddedLater(t, b)).sort((x, y) => joinedAt(y) - joinedAt(x));
  const reasons = [...ADD_REASONS, NO_REASON].map(r => ({ ...r, n: added.filter(t => reasonOf(t).id === r.id).length, time: added.filter(t => reasonOf(t).id === r.id).reduce((n, t) => n + elapsed(t), 0) })).filter(r => r.n);
  const open = ts.filter(t => t.status !== 'done'), openAdded = added.filter(t => t.status !== 'done');
  const started = b.start <= todayISO;
  const slip = b.baseEnd && b.end ? daysBetween(fromISO(b.baseEnd), fromISO(b.end)) : 0;
  const late = bucketStatus(b) !== 'done' && !!b.end && b.end < todayISO && open.length > 0;
  const time = added.reduce((n, t) => n + elapsed(t), 0), total = ts.reduce((n, t) => n + elapsed(t), 0);
  const moves = (b.moves || []).filter(m => m.from !== m.to);
  // The warning: tasks added after the start, and the bucket now ends later than planned or is past its end.
  let warn = '';
  if (added.length && slip > 0) warn = `Ends ${nDays(slip)} later than planned. ${nTasks(added.length)} ${added.length === 1 ? 'was' : 'were'} added after it started.`;
  else if (added.length && late) warn = `Past its end date with ${nTasks(open.length)} open, ${openAdded.length} of them added after it started.`;
  // How much of the added work the end date already allows for, and what's left to suggest.
  const need = time >= 3600000 ? Math.ceil(time / DAY_MS - 0.25) : 0;
  const covered = b.baseEnd && b.end ? Math.max(0, workdaysBetween(fromISO(b.baseEnd), fromISO(b.end))) : 0;
  const extra = bucketStatus(b) !== 'done' && b.end && started ? Math.max(0, need - covered) : 0;
  const suggestEnd = extra ? toISO(addWorkdays(fromISO(b.end), extra)) : null;
  return { ts, added, planned: ts.length - added.length, reasons, open, openAdded, started, slip, late, time, total, moves, warn, need, covered, extra, suggestEnd };
}

/* Local storage: everything is written as JSON files in the app's data folder on this computer.
   With cloud sync on, the main window also sends each change to Supabase (see cloud.js). */
const writers = {};
// While a backup is restored nothing may be saved over the restored files (0.20.3).
let savesFrozen = false;
// Writes are gathered for a moment (0.20.3), so a burst of changes is turned into JSON and written
// once, not once per change. flushAll() writes anything still waiting straight away.
const WRITE_DELAY = 250;
// "Save as" is opened by the Rust side (0.20.3), which then only writes to the place chosen there.
const saveDialog = ({ defaultPath, filters }) => invoke('pick_save', { name: defaultPath || '', filters: filters || [] });
/* The log file (0.20.3). Failures that used to disappear are written to logs/tasks.log in the data
   folder (Settings, "Log folder"), a few lines at a time. Logging never throws and never shows a message. */
const logBuf = []; let logTimer = null;
function logWarn(what, e) {
  try {
    const detail = e ? String((e && (e.stack || e.message)) || e).split('\n').slice(0, 3).join(' | ') : '';
    logBuf.push(`${new Date().toISOString()} [${WINDOW_LABEL}] ${what}${detail ? ': ' + detail : ''}`);
    if (logBuf.length > 400) logBuf.splice(0, logBuf.length - 400);
    if (!logTimer) logTimer = setTimeout(() => { logTimer = null; invoke('log_lines', { lines: logBuf.splice(0) }).catch(() => {}); }, 2000);
  } catch (x) { /* nothing more can be done */ }
}
if (typeof window !== 'undefined') {
  window.addEventListener('error', ev => logWarn('Error', ev.error || ev.message));
  window.addEventListener('unhandledrejection', ev => logWarn('Unhandled', ev.reason));
}
cloudSetLogger(logWarn);
function persist(name, obj) {
  if (savesFrozen) return;
  cloudNote(name, obj);
  const w = writers[name] || (writers[name] = { busy: false, next: undefined, timer: null });
  w.next = obj;
  if (w.busy || w.timer) return;
  w.timer = setTimeout(() => writeNow(name), WRITE_DELAY);
}
function writeNow(name) {
  const w = writers[name];
  if (!w) return;
  clearTimeout(w.timer); w.timer = null;
  if (w.busy || w.next === undefined) return;
  w.busy = true;
  (async () => {
    while (w.next !== undefined) {
      const content = JSON.stringify(w.next); w.next = undefined;
      try { await invoke('write_store', { name, content }); }
      catch (e) { logWarn('Could not save ' + name, e); toast.error('Couldn’t save your changes', String(e)); }
    }
    w.busy = false;
  })();
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function flushAll() {
  Object.keys(writers).forEach(n => { if (writers[n].timer) writeNow(n); });
  while (Object.values(writers).some(w => w.busy || w.timer)) await sleep(30);
}

/* Timers never keep running while Tasks is closed. The main window writes a heartbeat to the
   `session` file every 30 seconds, so after a crash or a hard shutdown the timers that were
   still marked running stop at the last moment Tasks was known to be open. */
const SESSION_START = Date.now();
let sessionData = null, lastHeartbeat = 0; // lastHeartbeat: from before this launch
let sessionLoad = null;
const loadSession = () => sessionLoad || (sessionLoad = invoke('read_store', { name: 'session' })
  .then(raw => { sessionData = { version: 1, ...(raw ? JSON.parse(raw) : {}) }; lastHeartbeat = sessionData.heartbeat || 0; return sessionData; })
  .catch(() => (sessionData = { version: 1 })));
const saveSession = patch => { sessionData = { ...(sessionData || { version: 1 }), ...patch }; persist('session', sessionData); };
const checkedWs = new Set(); // workspaces already checked for timers left running, this launch
// Set by the main window: stops all timers and remembers them before Tasks quits (also before an update installs).
let beforeQuit = async () => {};

/* Several windows can be open (the main one and tasks popped out on their own).
   Whenever one saves, it tells the others, which take over the new data. */
const WINDOW_LABEL = (() => { try { return getCurrentWindow().label; } catch (e) { return 'main'; } })();
// A backup is being restored in the main window (0.20.3): task windows stop saving and close.
if (WINDOW_LABEL.startsWith('task-')) listen('tasks-restoring', () => { savesFrozen = true; getCurrentWindow().close().catch(() => {}); }).catch(() => {});
// Column names can be changed per workspace. Marketing starts with names that suit its work.
const LABEL_KEYS = ['task', 'status', 'bucket', 'platform', 'assignee', 'deadline', 'priority', 'time'];
const LABEL_DEFAULTS = { task: 'Task', status: 'Status', bucket: 'Bucket', platform: 'Platform', assignee: 'Assignee', deadline: 'Deadline', priority: 'Priority', time: 'Time' };
const WS_LABELS = { marketing: { bucket: 'Campaign', platform: 'Channel' } };
const ARCHIVE_DAYS_DEFAULT = 30;
const TRASH_DAYS = 15;
const storeFor = (base, ws) => (ws === 'product' ? base : `${base}-${ws}`);
// Destructive buttons (delete, remove, move to Trash) stay quiet and turn red when you point at them.
const danger = 'hover:!text-destructive';
const plural = w => (/s$/i.test(w) ? w : /[^aeiou]y$/i.test(w) ? w.slice(0, -1) + 'ies' : w + 's');

// Other windows hear about a workspace's latest data once per burst of changes, not after every change (0.20.3).
const windowNews = {};
function tellWindows(event, ws, data) {
  const k = event + '|' + ws, n = windowNews[k] || (windowNews[k] = { data: null, timer: null });
  n.data = data;
  if (n.timer) return;
  n.timer = setTimeout(() => { n.timer = null; emit(event, { from: WINDOW_LABEL, ws, data: n.data }).catch(() => {}); }, WRITE_DELAY);
}
/* What every save stamps on a task (0.20.3: shared with the background workspaces): the time, when it was
   completed, who made it, when it joined its bucket, when its status changed, and which PC runs its timer. */
function stampTask(t, prev, now) {
  let doneAt = null;
  if (t.status === 'done') doneAt = (prev && prev.status === 'done' && (prev.doneAt || t.doneAt)) || t.doneAt || now;
  const x = { ...t, updatedAt: now, doneAt };
  // Who made a task (0.20): members can delete only their own.
  if (!prev && !x.createdBy && personKey !== 'local') x.createdBy = personKey;
  // Remember when the task joined its bucket, so tasks added after a bucket starts can be told apart.
  // Clearing the bucket keeps the record, so picking the same bucket again doesn't count as new.
  const bk = norm(x.bucket), j = x.bucketJoin;
  if (bk && (!j || j.name !== bk) && !(!j && prev && norm(prev.bucket) === bk)) {
    x.bucketJoin = { name: bk, at: now };
    const was = j ? j.name : norm(prev && prev.bucket);
    if (was && x.addedReason && x.addedReason === (prev && prev.addedReason)) delete x.addedReason; // the reason was for the old bucket
  }
  // Remember when the status last changed, for "has been in [status] for [days]" automations (0.19.14).
  if (!prev || prev.status !== x.status || (prev.stage || '') !== (x.stage || '')) x.statusAt = now;
  else if (prev.statusAt && !x.statusAt) x.statusAt = prev.statusAt;
  // Remember which PC runs a timer, so closing one PC never stops a timer running on another.
  if (x.timerStartedAt && (!prev || prev.timerStartedAt !== x.timerStartedAt)) x.timerDevice = DEVICE_ID;
  else if (!x.timerStartedAt) delete x.timerDevice;
  return x;
}
// Archiving finished tasks and emptying the Trash is housekeeping for the whole team, so one PC does it
// per workspace per day (0.20.3): the first to claim the day in automation_runs. The others leave it,
// which ends the races and the duplicate conflict notices. Not syncing: this PC is the only one.
// A stored project or bucket. A bare name (very old data) or an entry without a name must not stop the app (0.20.3).
const namedItem = x => (typeof x === 'string' && x.trim() ? { id: 'auto-' + x.trim().toLowerCase(), name: x.trim() } : x && typeof x === 'object' && typeof x.name === 'string' ? { ...x } : null);
// Ends the undo step in progress: what the workspace was before your edits, and after them.
function closeStep(h) {
  clearTimeout(h.timer);
  h.past.push({ before: h.pending, after: h.last });
  if (h.past.length > 30) h.past.shift();
  h.future = []; h.pending = null;
}
const houseDay = {};
async function houseTurn(ws) {
  const day = new Date().toISOString().slice(0, 10);
  if (houseDay[ws] === day) return true;
  const c = await cloudClaim('~house/' + ws, 'day@' + day, true);
  if (c) houseDay[ws] = day;
  return c; // true: this PC; false: another PC has today; null: couldn't ask yet
}
function useTasks(ws = 'product') {
  const isProduct = ws === 'product';
  const [loaded, setLoaded] = useState(false);
  // A data or archive file that couldn't be read (0.20.3): { store, error }. The workspace is never
  // loaded as empty then, so nothing is saved over the file or deleted from the cloud.
  const [damaged, setDamaged] = useState(null);
  const [tasks, setTasks] = useState({});
  const [rules, setRules] = useState(isProduct ? DEFAULT_RULES : []);
  const [projects, setProjects] = useState(isProduct ? null : []);
  const [stages, setStages] = useState([]);
  const [buckets, setBuckets] = useState([]);
  const [labels, setLabels] = useState({});
  const [settings, setSettings] = useState({ archiveDays: ARCHIVE_DAYS_DEFAULT });
  const [looseDocs, setLooseDocs] = useState([]);
  // Archive and Trash live in their own file, so the everyday list stays small and fast.
  const [arch, setArch] = useState({ archived: {}, trash: {} });
  const [archLoaded, setArchLoaded] = useState(false);
  const remote = useRef(null), remoteArch = useRef(null);
  // Undo history: snapshots of this workspace, grouped so a burst of changes is one step.
  // A change that didn't start with you here (another window, the cloud, undo itself) bumps
  // remoteTick in the same batch as the change (0.20.3), so the render that carries it is known for
  // certain and never becomes an undo step. Counting renders, as before, could drift.
  const hist = useRef({ past: [], future: [], last: null, pending: null, tick: 0, timer: null });
  const [, bumpHist] = useState(0);
  const [remoteTick, setRemoteTick] = useState(0);
  const notMine = () => setRemoteTick(x => x + 1);
  const apply = d => {
    notMine();
    setTasks(tasksIn(d.tasks || {}));
    if (Array.isArray(d.rules)) setRules(d.rules.map(normalizeRule));
    if (Array.isArray(d.projects)) setProjects(d.projects);
    setStages(Array.isArray(d.stages) ? d.stages : []);
    setBuckets(Array.isArray(d.buckets) ? d.buckets : []);
    setLabels(d.labels && typeof d.labels === 'object' ? d.labels : {});
    setSettings({ archiveDays: ARCHIVE_DAYS_DEFAULT, ...(d.settings || {}) });
    setLooseDocs(Array.isArray(d.looseDocs) ? d.looseDocs : []);
  };
  useEffect(() => {
    let un = null, un2 = null, dead = false;
    listen('tasks-data', e => {
      if (!e.payload || e.payload.from === WINDOW_LABEL || (e.payload.ws || 'product') !== ws) return;
      remote.current = JSON.stringify(e.payload.data);
      apply(e.payload.data);
    }).then(f => { if (dead) f(); else un = f; }).catch(() => {});
    listen('tasks-arch', e => {
      if (!e.payload || e.payload.from === WINDOW_LABEL || e.payload.ws !== ws) return;
      remoteArch.current = JSON.stringify(e.payload.data);
      notMine();
      setArch({ archived: tasksIn(e.payload.data.archived), trash: tasksIn(e.payload.data.trash) });
    }).then(f => { if (dead) f(); else un2 = f; }).catch(() => {});
    return () => { dead = true; try { un && un(); un2 && un2(); } catch (e) {} };
  }, []);
  // Changes from your other PCs (cloud sync). They don't become undo steps. Each handler is
  // registered once its file has been read, so nothing that arrived meanwhile is lost.
  const cloudData = patch => {
    notMine();
    const tp = {}, m = {};
    Object.entries(patch).forEach(([k, v]) => { if (k.startsWith('t/')) tp[k.slice(2)] = v; else if (k.startsWith('m/')) m[k.slice(2)] = v; });
    if (Object.keys(tp).length) setTasks(p => { const n = { ...p }; Object.entries(tp).forEach(([id, v]) => { if (v === null) delete n[id]; else n[id] = taskIn(v); }); return n; });
    if (Array.isArray(m.rules)) setRules(m.rules.map(normalizeRule));
    if (Array.isArray(m.projects)) setProjects(m.projects);
    if (Array.isArray(m.stages)) setStages(m.stages);
    if (Array.isArray(m.buckets)) setBuckets(m.buckets);
    if (m.labels && typeof m.labels === 'object') setLabels(m.labels);
    // Watch folders and the Trash cleanup list belong to this PC.
    if (m.settings && typeof m.settings === 'object') setSettings(s => ({ archiveDays: ARCHIVE_DAYS_DEFAULT, ...m.settings, ...(s.watchFolders ? { watchFolders: s.watchFolders } : {}), ...(s.purgeFiles ? { purgeFiles: s.purgeFiles } : {}) }));
    if (Array.isArray(m.looseDocs)) setLooseDocs(m.looseDocs);
  };
  const cloudArch = patch => {
    notMine();
    setArch(a => {
      const n = { archived: { ...a.archived }, trash: { ...a.trash } };
      Object.entries(patch).forEach(([k, v]) => { const f = k.startsWith('a/') ? n.archived : k.startsWith('x/') ? n.trash : null; if (!f) return; const id = k.slice(2); if (v === null) delete f[id]; else f[id] = taskIn(v); });
      return n;
    });
  };
  const cloudUn = useRef([]);
  useEffect(() => () => { cloudUn.current.forEach(f => f()); }, []);
  useEffect(() => {
    (async () => {
      let d = null, a = null;
      try {
        const raw = await invoke('read_store', { name: storeFor('data', ws) });
        if (raw) d = JSON.parse(raw);
      } catch (e) { setDamaged({ store: storeFor('data', ws), error: String(e).replace(/^DAMAGED: /, '') }); return; }
      try {
        const raw = await invoke('read_store', { name: storeFor('archive', ws) });
        if (raw) a = JSON.parse(raw);
      } catch (e) { setDamaged({ store: storeFor('archive', ws), error: String(e).replace(/^DAMAGED: /, '') }); return; }
      if (d) apply(d);
      setLoaded(true);
      cloudUn.current.push(cloudLive(storeFor('data', ws), cloudData, d));
      if (a) setArch({ archived: tasksIn(a.archived), trash: tasksIn(a.trash) });
      setArchLoaded(true);
      cloudUn.current.push(cloudLive(storeFor('archive', ws), cloudArch, a));
    })();
  }, []);
  useEffect(() => {
    if (!loaded) return;
    const data = { version: 4, tasks: tasksOut(tasks), rules, projects: projects || [], stages, buckets, labels, settings, looseDocs };
    // Came from another window, already saved there. Only compared right after such a change (0.20.3),
    // so an ordinary edit doesn't turn the whole workspace into JSON just to check.
    if (remote.current !== null) { const same = JSON.stringify(data) === remote.current; remote.current = null; if (same) return; }
    persist(storeFor('data', ws), data);
    tellWindows('tasks-data', ws, data);
  }, [tasks, rules, projects, stages, buckets, labels, settings, looseDocs, loaded]);
  useEffect(() => {
    if (!archLoaded) return;
    const out = { archived: tasksOut(arch.archived), trash: tasksOut(arch.trash) };
    if (remoteArch.current !== null) { const same = JSON.stringify(out) === remoteArch.current; remoteArch.current = null; if (same) return; }
    persist(storeFor('archive', ws), { version: 1, ...out });
    tellWindows('tasks-arch', ws, out);
  }, [arch, archLoaded]);

  useEffect(() => {
    if (!loaded || !archLoaded) return;
    const h = hist.current;
    const cur = { tasks, rules, projects, stages, buckets, labels, settings, looseDocs, arch };
    if (!h.last || h.tick !== remoteTick) {
      // Someone else's change: close the step you were in the middle of, so it holds only your own edits.
      if (h.last && h.pending) closeStep(h);
      h.tick = remoteTick; h.last = cur; return;
    }
    if (!h.pending) h.pending = h.last;
    h.last = cur;
    clearTimeout(h.timer);
    h.timer = setTimeout(() => { if (h.pending) { closeStep(h); bumpHist(x => x + 1); } }, 700);
  }, [tasks, rules, projects, stages, buckets, labels, settings, looseDocs, arch, loaded, archLoaded, remoteTick]);
  // Undo and redo put back only what you changed (0.20), so a teammate's newer change to the same
  // task or to another field is never wiped out.
  const restoreSnap = (sn, from) => {
    notMine();
    const back = (cur, a, b) => {
      const n = { ...cur };
      new Set([...Object.keys(a || {}), ...Object.keys(b || {})]).forEach(id => {
        const f = (a || {})[id], t = (b || {})[id];
        if (JSON.stringify(f) === JSON.stringify(t)) return;
        if (!t) { delete n[id]; return; }
        if (!f || !n[id]) { n[id] = t; return; }
        const x = { ...n[id] };
        new Set([...Object.keys(f), ...Object.keys(t)]).forEach(k => { if (JSON.stringify(f[k]) !== JSON.stringify(t[k])) { if (t[k] === undefined) delete x[k]; else x[k] = t[k]; } });
        n[id] = x;
      });
      return n;
    };
    const ch = k => JSON.stringify(from[k]) !== JSON.stringify(sn[k]);
    setTasks(c => back(c, from.tasks, sn.tasks));
    if (ch('rules')) setRules(sn.rules);
    if (ch('projects')) setProjects(sn.projects);
    if (ch('stages')) setStages(sn.stages);
    if (ch('buckets')) setBuckets(sn.buckets);
    if (ch('labels')) setLabels(sn.labels);
    if (ch('settings')) setSettings(sn.settings);
    if (ch('looseDocs')) setLooseDocs(sn.looseDocs);
    setArch(c => ({ archived: back(c.archived, from.arch.archived, sn.arch.archived), trash: back(c.trash, from.arch.trash, sn.arch.trash) }));
  };
  // Each step keeps the workspace before and after your own edits, so undoing it reverses exactly those.
  const flushHist = () => { const h = hist.current; clearTimeout(h.timer); if (h.pending) closeStep(h); };
  const undo = useCallback(() => {
    flushHist();
    const h = hist.current; if (!h.past.length) return false;
    const e = h.past.pop(); h.future.push(e); restoreSnap(e.before, e.after); bumpHist(x => x + 1); return true;
  }, []);
  const redo = useCallback(() => {
    flushHist();
    const h = hist.current; if (!h.future.length) return false;
    const e = h.future.pop(); h.past.push(e); restoreSnap(e.after, e.before); bumpHist(x => x + 1); return true;
  }, []);

  // Every save stamps the time, and records when a task was completed (cleared again if it's reopened).
  const saveMany = useCallback(list => {
    const now = Date.now();
    setTasks(p => {
      const n = { ...p };
      list.forEach(t => {
        n[t.id] = stampTask(t, p[t.id], now);
      });
      return n;
    });
  }, []);
  const remove = useCallback(id => { setTasks(p => { const n = { ...p }; delete n[id]; return n; }); }, []);
  const saveRules = useCallback(list => setRules(list), []);

  // Files no task (active, archived or in the Trash) uses anymore stay in Documents as "No task".
  const keepFiles = (files, stillUsed) => {
    const free = (files || []).filter(f => !stillUsed.some(t => (t.files || []).some(x => x.id === f.id)));
    if (free.length) setLooseDocs(l => [...l, ...free.filter(f => !l.some(x => x.id === f.id))]);
  };
  const tasksRef = useRef(tasks); tasksRef.current = tasks;
  const archRef = useRef(arch); archRef.current = arch;
  const trashTasks = useCallback(ids => {
    const now = Date.now(), cur = tasksRef.current, a = archRef.current;
    const moving = ids.map(id => cur[id] || a.archived[id]).filter(Boolean);
    if (!moving.length) return;
    setTasks(p => { const n = { ...p }; ids.forEach(id => delete n[id]); return n; });
    setArch(x => {
      const archived = { ...x.archived }, trash = { ...x.trash };
      moving.forEach(t => { delete archived[t.id]; trash[t.id] = { ...stopT(t), deletedAt: now }; });
      return { archived, trash };
    });
  }, []);
  const restoreTask = useCallback(id => {
    const a = archRef.current, t = a.archived[id] || a.trash[id];
    if (!t) return;
    const { archivedAt, deletedAt, ...rest } = t;
    setArch(x => { const archived = { ...x.archived }, trash = { ...x.trash }; delete archived[id]; delete trash[id]; return { archived, trash }; });
    setTasks(p => ({ ...p, [id]: { ...rest, doneAt: rest.status === 'done' ? Date.now() : null, updatedAt: Date.now() } }));
  }, []);
  const purgeTrash = useCallback(ids => {
    const a = archRef.current;
    const gone = ids.map(id => a.trash[id]).filter(Boolean);
    if (!gone.length) return;
    const rest = [...Object.values(tasksRef.current), ...Object.values(a.archived), ...Object.values(a.trash).filter(t => !ids.includes(t.id))];
    keepFiles(gone.flatMap(t => t.files || []), rest);
    setArch(x => { const trash = { ...x.trash }; ids.forEach(id => delete trash[id]); return { ...x, trash }; });
  }, []);
  // Archive finished tasks after the chosen number of days, and empty the Trash after 15 days.
  useEffect(() => {
    if (!loaded || !archLoaded || WINDOW_LABEL !== 'main') return;
    let off = false, again = null;
    const run = async () => {
      const turn = await houseTurn(ws); // another PC may be doing the housekeeping today (0.20.3)
      if (off) return;
      if (turn === null) { clearTimeout(again); again = setTimeout(run, 60000); return; }
      if (!turn) return;
      const now = Date.now(), days = Number(settings.archiveDays) || 0;
      if (days > 0) {
        const cutoff = now - days * 864e5;
        const old = Object.values(tasksRef.current).filter(t => t.status === 'done' && !t.timerStartedAt && (t.doneAt || t.updatedAt || t.createdAt || now) < cutoff);
        if (old.length) {
          setTasks(p => { const n = { ...p }; old.forEach(t => delete n[t.id]); return n; });
          setArch(x => { const archived = { ...x.archived }; old.forEach(t => { archived[t.id] = { ...t, archivedAt: now }; }); return { ...x, archived }; });
        }
      }
      const expired = Object.values(archRef.current.trash).filter(t => now - (t.deletedAt || now) > TRASH_DAYS * 864e5).map(t => t.id);
      if (expired.length) purgeTrash(expired);
    };
    run();
    const i = setInterval(run, 3600e3);
    return () => { off = true; clearInterval(i); clearTimeout(again); };
  }, [loaded, archLoaded, settings.archiveDays]);

  // Deleting a document removes it from every task. The file itself is deleted at the next start,
  // so Undo can still bring it back in this session.
  const deleteDocEverywhere = useCallback(f => {
    const strip = t => (t.files || []).some(x => x.id === f.id) ? { ...t, files: t.files.filter(x => x.id !== f.id) } : t;
    setTasks(p => { const n = {}; Object.entries(p).forEach(([k, t]) => { n[k] = strip(t); }); return n; });
    setArch(x => ({ archived: Object.fromEntries(Object.entries(x.archived).map(([k, t]) => [k, strip(t)])), trash: Object.fromEntries(Object.entries(x.trash).map(([k, t]) => [k, strip(t)])) }));
    setLooseDocs(l => l.filter(x => x.id !== f.id));
    setSettings(st => ({ ...st, purgeFiles: [...(st.purgeFiles || []).filter(x => x.id !== f.id), f] }));
  }, []);
  useEffect(() => {
    if (!loaded || !archLoaded || WINDOW_LABEL !== 'main' || !(settings.purgeFiles || []).length) return;
    const used = id => [...Object.values(tasksRef.current), ...Object.values(archRef.current.archived), ...Object.values(archRef.current.trash)]
      .some(t => (t.files || []).some(x => x.id === id)) || looseDocs.some(x => x.id === id);
    settings.purgeFiles.forEach(f => { if (!used(f.id)) deleteDoc(f); });
    setSettings(st => ({ ...st, purgeFiles: [] }));
  }, [loaded, archLoaded]);

  // Merging: the documents in `ids` become one record. A task that had any of them keeps one copy, where the first one was.
  const replaceDocsEverywhere = useCallback((ids, merged) => {
    const up = t => {
      const fs = t.files || []; if (!fs.some(x => ids.includes(x.id))) return t;
      const out = []; let put = false;
      fs.forEach(x => { if (!ids.includes(x.id)) out.push(x); else if (!put) { out.push(merged); put = true; } });
      return { ...t, files: out };
    };
    setTasks(p => Object.fromEntries(Object.entries(p).map(([k, t]) => [k, up(t)])));
    setArch(x => ({ archived: Object.fromEntries(Object.entries(x.archived).map(([k, t]) => [k, up(t)])), trash: Object.fromEntries(Object.entries(x.trash).map(([k, t]) => [k, up(t)])) }));
    setLooseDocs(l => {
      const used = [...Object.values(tasksRef.current), ...Object.values(archRef.current.archived)].some(t => (t.files || []).some(x => ids.includes(x.id)));
      const rest = l.filter(x => !ids.includes(x.id));
      return used ? rest : [...rest, merged];
    });
  }, []);
  const updateDocEverywhere = useCallback((id, fn) => {
    const up = t => (t.files || []).some(x => x.id === id) ? { ...t, files: t.files.map(x => x.id === id ? fn(x) : x) } : t;
    setTasks(p => Object.fromEntries(Object.entries(p).map(([k, t]) => [k, up(t)])));
    setArch(x => ({ archived: Object.fromEntries(Object.entries(x.archived).map(([k, t]) => [k, up(t)])), trash: Object.fromEntries(Object.entries(x.trash).map(([k, t]) => [k, up(t)])) }));
    setLooseDocs(l => l.map(x => x.id === id ? fn(x) : x));
  }, []);
  return {
    updateDocEverywhere,
    undo, redo, canUndo: hist.current.past.length > 0 || !!hist.current.pending, canRedo: hist.current.future.length > 0,
    deleteDocEverywhere, replaceDocsEverywhere,
    tasks, saveMany, remove, rules, saveRules, projects: projects || [], saveProjects: setProjects, stages, saveStages: setStages,
    buckets, saveBuckets: setBuckets, labels: { ...LABEL_DEFAULTS, ...(WS_LABELS[ws] || {}), ...labels }, saveLabels: setLabels,
    settings, saveSettings: setSettings, looseDocs, saveLooseDocs: setLooseDocs,
    archived: arch.archived, trash: arch.trash, trashTasks, restoreTask, purgeTrash, loaded: loaded && archLoaded, damaged,
  };
}

/* Desktop notifications (used by the "send me a notification" automation). Falls back to an in-app message. */
async function notifyDesktop(title, body) {
  if (statusOf(meNow).id === 'dnd') return; // Do not disturb (0.19.13)
  try {
    let ok = await isPermissionGranted();
    if (!ok) ok = (await requestPermission()) === 'granted';
    if (ok) { sendNotification({ title, body }); return; }
  } catch (e) { logWarn('Desktop notification failed', e); }
  toast(title, body);
}

/* Grouped notifications: everything of the same kind that arrives within a moment of each other
   becomes one message, like "12 tasks are overdue", instead of twelve. One task reads "1 task is overdue". */
const NOTE_VERBS = {
  created: ['was created', 'were created'], started: ['was started', 'were started'], blocked: ['is blocked', 'are blocked'],
  unblocked: ['is no longer blocked', 'are no longer blocked'], done: ['was marked done', 'were marked done'],
  reopened: ['was reopened', 'were reopened'], due_soon: ['is due tomorrow', 'are due tomorrow'], overdue: ['is overdue', 'are overdue'],
  checklist: ['has its checklist finished', 'have their checklists finished'], assigned: ['got a new assignee', 'got new assignees'],
  high: ['was set to High priority', 'were set to High priority'], file_added: ['got a document attached', 'got documents attached'],
  moved: ['was moved into its project', 'were moved into their projects'],
};
const countTasks = (n, [one, many]) => `${n} ${n === 1 ? 'task' : 'tasks'} ${n === 1 ? one : many}`;
// “Login page”, “Checkout”, “Search” and 9 more
const nameList = (titles, max = 3) => {
  const q = titles.map(t => `“${t || 'Untitled'}”`);
  if (q.length <= max) return q.length > 1 ? q.slice(0, -1).join(', ') + ' and ' + q[q.length - 1] : q[0] || '';
  return q.slice(0, max).join(', ') + ` and ${q.length - max} more`;
};
const noteQueue = { items: [], timer: null };
// n: { kind: an automation trigger (overdue, due_soon, ...) or 'conflict', message: the automation's own text, taskId, taskTitle }
function queueNote(n) {
  noteQueue.items.push(n);
  clearTimeout(noteQueue.timer);
  noteQueue.timer = setTimeout(flushNotes, 800);
}
function flushNotes() {
  const items = noteQueue.items; noteQueue.items = []; noteQueue.timer = null;
  const groups = new Map();
  items.forEach(n => {
    const key = n.kind + '|' + norm(n.message);
    const g = groups.get(key) || { ...n, tasks: [] };
    // The same task twice in one moment counts once.
    if (!n.taskId || !g.tasks.some(t => t.id === n.taskId)) g.tasks.push({ id: n.taskId, title: n.taskTitle, kept: n.kept });
    groups.set(key, g);
  });
  groups.forEach(g => {
    const n = g.tasks.length, names = nameList(g.tasks.map(t => t.title));
    if (g.kind === 'conflict') {
      if (n === 1) toast('Changed on two PCs at once', `${names} was also edited on your other PC. ${g.tasks[0].kept === 'other' ? 'Its newer edit was kept.' : 'Your newer edit here was kept.'}`);
      else toast(`${n} tasks were changed on two PCs at once`, `The newer edit was kept for each: ${names}.`);
      return;
    }
    const verbs = NOTE_VERBS[g.kind] || ['needs a look', 'need a look'];
    const msg = (g.message || '').trim();
    // The automation's own text ("Ping the PO") stays, unless it only repeats the kind ("Overdue", "Due tomorrow").
    const custom = msg && !verbs[0].includes(norm(msg)) && norm(msg) !== norm((TRIG[g.kind] || {}).short);
    notifyDesktop(countTasks(n, verbs), custom ? `${msg} · ${names}` : names);
  });
}

/* Self-updating: new versions are published as GitHub releases.
   The app checks a few seconds after it starts, and whenever you ask it to. */
function useUpdater() {
  const [version, setVersion] = useState('');
  const [update, setUpdate] = useState(null);
  const [progress, setProgress] = useState(null); // null = idle, -1 = downloading (size unknown), 0–100, 'installing'
  const look = useCallback(async manual => {
    try {
      const u = await checkForUpdate();
      if (u) setUpdate(u);
      else if (manual) toast('You’re up to date', `You have the latest version, ${await getVersion()}.`);
    } catch (e) {
      if (manual) toast.error('Couldn’t check for updates', 'Check your internet connection and try again.');
    }
  }, []);
  useEffect(() => {
    getVersion().then(setVersion).catch(() => {});
    // Shortly after launch, then every 6 hours (0.20.3): the app often stays in the tray for days.
    const t = WINDOW_LABEL === 'main' ? setTimeout(() => look(false), 4000) : null;
    const i = WINDOW_LABEL === 'main' ? setInterval(() => look(false), 6 * 3600e3) : null;
    return () => { clearTimeout(t); clearInterval(i); };
  }, [look]);
  const install = async () => {
    if (!update) return;
    try {
      await beforeQuit();
      await flushAll();
      await cloudFlush();
      let total = 0, got = 0;
      setProgress(-1);
      await update.downloadAndInstall(ev => {
        if (ev.event === 'Started') total = ev.data.contentLength || 0;
        else if (ev.event === 'Progress') { got += ev.data.chunkLength; if (total) setProgress(Math.min(99, Math.round(got / total * 100))); }
        else if (ev.event === 'Finished') setProgress('installing');
      });
      await relaunch();
    } catch (e) {
      setProgress(null);
      toast.error('The update didn’t install', String(e));
    }
  };
  return { version, update, progress, look, install, dismiss: () => setUpdate(null) };
}

/* Light, dark, or follow Windows. Remembered on this computer. */
const THEMES = [{ id: 'light', label: 'Light' }, { id: 'dark', label: 'Dark' }, { id: 'system', label: 'Match Windows' }];
function useTheme() {
  const [mode, setMode] = useState(readTheme);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const on = e => setSystemDark(e.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  // `from`: the control that was clicked, where the circle starts (see src/theme.js).
  const choose = (m, from) => setTheme(m, from);
  // flushSync so the new theme is fully drawn when the animation takes its "after" picture.
  useEffect(() => { const on = e => flushSync(() => setMode(e.detail)); window.addEventListener('tasks-theme', on); return () => window.removeEventListener('tasks-theme', on); }, []);
  const dark = mode === 'dark' || (mode === 'system' && systemDark);
  return { mode, dark, choose, toggle: from => choose(dark ? 'light' : 'dark', from) };
}

function ThemeToggle() {
  const th = useTheme();
  // One click switches light and dark (0.19.14). Match Windows lives in Settings > Appearance.
  const label = th.dark ? 'Switch to light mode' : 'Switch to dark mode';
  return (
    <Button variant="outline" size="icon" className="rounded-lg bg-card shadow-none" data-theme-toggle aria-label={label} title={`${label}  (Shift+D)`}
      onClick={e => th.toggle(e.currentTarget)}>{th.dark ? <I.moon /> : <I.sun />}</Button>
  );
}

/* Our own window buttons (0.19.14): the Windows title bar is off, so minimize, maximize and close live in the
   slim top row. Close does what the Windows one did (hide to the tray when that's on). */
function WindowControls() {
  const [max, setMax] = useState(false);
  useEffect(() => {
    let off;
    try {
      const w = getCurrentWindow();
      const read = () => w.isMaximized().then(setMax).catch(() => {});
      read();
      w.onResized(read).then(f => { off = f; }).catch(() => {});
    } catch (e) {}
    return () => { if (off) off(); };
  }, []);
  const act = f => () => { try { f(getCurrentWindow()).catch(() => {}); } catch (e) {} };
  const base = 'flex h-10 w-[46px] items-center justify-center text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring';
  return (
    <div className="flex shrink-0 self-stretch">
      <button type="button" onClick={act(w => w.minimize())} aria-label="Minimize" title="Minimize" className={cn(base, 'hover:bg-muted hover:text-foreground')}>
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M0 5.5h10" stroke="currentColor" /></svg>
      </button>
      <button type="button" onClick={act(w => w.toggleMaximize())} aria-label={max ? 'Restore' : 'Maximize'} title={max ? 'Restore' : 'Maximize'} className={cn(base, 'hover:bg-muted hover:text-foreground')}>
        {max
          ? <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M2.5 2.5V1.5a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-1" stroke="currentColor" fill="none" /><rect x="0.5" y="2.5" width="7" height="7" rx="1" stroke="currentColor" fill="none" /></svg>
          : <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><rect x="0.5" y="0.5" width="9" height="9" rx="1.5" stroke="currentColor" fill="none" /></svg>}
      </button>
      <button type="button" onClick={act(w => w.close())} aria-label="Close" title="Close" className={cn(base, 'hover:bg-red-600 hover:text-white')}>
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M0.5 0.5l9 9M9.5 0.5l-9 9" stroke="currentColor" /></svg>
      </button>
    </div>
  );
}

/* Each page's title and summary sit in the big page header at the top (0.19.14). Pages render
   <PageHead>, which moves itself into that header's slot (window-only pages keep it in place). */
const headSlot = { el: null, subs: new Set() };
const setHeadSlot = el => { if (headSlot.el === el) return; headSlot.el = el; headSlot.subs.forEach(f => f()); };
function useHeadSlot() {
  const [el, setEl] = useState(headSlot.el);
  useEffect(() => { const f = () => setEl(headSlot.el); headSlot.subs.add(f); f(); return () => { headSlot.subs.delete(f); }; }, []);
  return el;
}

/* Preferences for this computer. */
const PREF_DEFAULTS = { keepInTray: true, captureKey: 'Ctrl+Shift+Space', idleMinutes: 20, oneAtATime: false };
const readPrefs = () => { try { return { ...PREF_DEFAULTS, ...(JSON.parse(localStorage.getItem('tasks-prefs')) || {}) }; } catch (e) { return { ...PREF_DEFAULTS }; } };
const accel = k => k.split('+').map(p => p === 'Ctrl' ? 'CommandOrControl' : p === 'Win' ? 'Super' : p).join('+');

// Quick capture: a small window that floats over whatever you're doing.
async function openCaptureWindow() {
  try {
    const existing = await WebviewWindow.getByLabel('capture');
    if (existing) { await existing.show(); await existing.setFocus(); return; }
    new WebviewWindow('capture', { url: 'index.html#capture=1', title: 'Quick capture', width: CAPTURE_W, height: 132, center: true, resizable: false, decorations: false, alwaysOnTop: true, skipTaskbar: true, focus: true,
      transparent: true, shadow: false });
  } catch (e) { toast.error('Couldn’t open quick capture', String(e)); }
}

// The main window keeps a short copy of the bucket and platform lists here, so the quick capture window can offer them.
const captureListsKey = ws => 'tasks-capture-lists-' + (ws || 'product');
const readCaptureLists = ws => {
  try { const v = JSON.parse(localStorage.getItem(captureListsKey(ws))); if (v && Array.isArray(v.buckets)) return v; } catch (e) {}
  return { buckets: [], platforms: [], labels: { bucket: LABEL_DEFAULTS.bucket, platform: LABEL_DEFAULTS.platform } };
};
// "@" or "#" at the start of a word, up to the caret, opens a picker.
const captureToken = (text, caret) => {
  const m = /(^|\s)([@#])([^@#\n]{0,40})$/.exec(text.slice(0, caret));
  return m ? { kind: m[2] === '@' ? 'bucket' : 'platform', start: caret - m[3].length - 1, query: m[3] } : null;
};

// Quick capture box, used by the floating window and by Quick add in the app.
// The text box grows as you type, up to maxHeight, then scrolls. @ picks a bucket and # picks a platform.
function CaptureBox({ lists, maxHeight, onSave, onCancel, onPicking, compact }) {
  const [v, setV] = useState('');
  const [bucket, setBucket] = useState('');
  const [platform, setPlatform] = useState('');
  const [tok, setTok] = useState(null);
  const [hi, setHi] = useState(0);
  const skip = useRef(-1);
  const ta = useRef(null);
  const labels = lists.labels || {};
  const L = { bucket: labels.bucket || LABEL_DEFAULTS.bucket, platform: labels.platform || LABEL_DEFAULTS.platform };
  const options = useMemo(() => {
    if (!tok) return [];
    const q = norm(tok.query);
    const src = (tok.kind === 'bucket' ? lists.buckets : lists.platforms) || [];
    return src.filter(x => !q || norm(x.name).includes(q))
      .sort((a, b) => (norm(b.name).startsWith(q) - norm(a.name).startsWith(q)) || ((a.done ? 1 : 0) - (b.done ? 1 : 0)))
      .slice(0, 8);
  }, [tok, lists]);
  // A query with a space and no match is just text, so the picker steps aside.
  const picking = !!tok && (options.length > 0 || !/\s/.test(tok.query));
  useEffect(() => { onPicking && onPicking(picking); }, [picking]);
  useLayoutEffect(() => {
    const el = ta.current; if (!el) return;
    el.style.height = 'auto';
    const h = el.scrollHeight;
    el.style.height = Math.min(h, maxHeight) + 'px';
    el.style.overflowY = h > maxHeight ? 'auto' : 'hidden';
  }, [v, maxHeight]);
  useEffect(() => { const t = setTimeout(() => ta.current && ta.current.focus(), 50); return () => clearTimeout(t); }, []);
  const look = (text, caret) => {
    const t = captureToken(text, caret);
    if (t && t.start === skip.current) { setTok(null); return; }
    if (!t) skip.current = -1;
    setTok(t); setHi(0);
  };
  const pick = o => {
    const el = ta.current; const caret = el ? el.selectionStart : v.length;
    const left = v.slice(0, tok.start), right = v.slice(caret);
    const nv = /\s$/.test(left) && /^\s/.test(right) ? left + right.slice(1) : left + right;
    if (tok.kind === 'bucket') setBucket(o.name); else setPlatform(o.name);
    setV(nv); setTok(null); skip.current = -1;
    requestAnimationFrame(() => { if (ta.current) { ta.current.focus(); ta.current.setSelectionRange(tok.start, tok.start); } });
  };
  const save = () => onSave({ title: v.replace(/\s+/g, ' ').trim(), bucket, project: platform });
  // The Bucket and Platform buttons type @ or # at the caret, which opens the same list as typing it.
  const startPick = ch => {
    const el = ta.current; const c = el ? el.selectionStart : v.length;
    const left = v.slice(0, c), pre = left && !/\s$/.test(left) ? ' ' : '';
    const nv = left + pre + ch + v.slice(c), at = c + pre.length + 1;
    setV(nv); skip.current = -1;
    requestAnimationFrame(() => { if (ta.current) { ta.current.focus(); ta.current.setSelectionRange(at, at); } look(nv, at); });
  };
  const onKey = e => {
    if (picking && options.length && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { e.preventDefault(); setHi(h => (h + (e.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length); return; }
    if (picking && options.length && (e.key === 'Enter' || e.key === 'Tab')) { e.preventDefault(); pick(options[Math.min(hi, options.length - 1)]); return; }
    if (picking && e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); skip.current = tok.start; setTok(null); return; }
    if (e.key === 'Enter') { e.preventDefault(); save(); return; }
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onCancel(); }
  };
  const chip = (kind, name, dot, clear) => (
    <span key={kind} className="inline-flex h-6 max-w-[16rem] items-center gap-1.5 rounded-md border bg-muted/60 pl-2 pr-1 text-xs ui-fill">
      <span className="text-muted-foreground">{kind === 'bucket' ? '@' : '#'}</span>
      {dot && <span className={cn('size-2 shrink-0 rounded-full', dot)} />}
      <span className="truncate font-medium">{name}</span>
      <button type="button" onMouseDown={e => e.preventDefault()} onClick={clear} aria-label={`Remove ${L[kind].toLowerCase()} ${name}`}
        className="flex size-4 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"><I.x className="size-3" /></button>
    </span>
  );
  const dotOf = (kind, name) => (((kind === 'bucket' ? lists.buckets : lists.platforms) || []).find(x => norm(x.name) === norm(name)) || {}).dot;
  const list = picking && (
    <div role="listbox" aria-label={L[tok.kind]} className="border-t px-2 py-1.5">
      <div className="px-2 pb-1 pt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{plural(L[tok.kind])}</div>
      {options.length ? options.map((o, i) => (
        <div key={o.name} role="option" aria-selected={i === hi} onMouseDown={e => e.preventDefault()} onMouseEnter={() => setHi(i)} onClick={() => pick(o)}
          className={cn('flex h-[34px] cursor-pointer items-center gap-2 rounded-[10px] px-2 text-sm', i === hi && 'bg-muted')}>
          <span className={cn('size-2 shrink-0 rounded-full', o.dot || 'bg-zinc-400')} />
          <span className={cn('min-w-0 flex-1 truncate', o.done && 'text-muted-foreground')}>{o.name}</span>
          {o.note && <span className="shrink-0 text-xs text-muted-foreground">{o.note}</span>}
          {i === hi && <Kbd>Enter</Kbd>}
        </div>
      )) : <div className="px-2 py-1.5 text-sm text-muted-foreground">{tok.query ? `No ${L[tok.kind].toLowerCase()} matches “${tok.query}”` : `No ${plural(L[tok.kind]).toLowerCase()} yet`}</div>}
    </div>
  );
  const pill = (kind, name) => name ? (
    <span key={kind} className="inline-flex h-[30px] max-w-[15rem] items-center gap-1.5 rounded-lg border bg-muted pl-3 pr-1.5 text-[13px] ui-fill">
      {dotOf(kind, name) && <span className={cn('size-2 shrink-0 rounded-full', dotOf(kind, name))} />}
      <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => startPick(kind === 'bucket' ? '@' : '#')} title={`Change ${L[kind].toLowerCase()}`} className="truncate font-medium">{name}</button>
      <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => kind === 'bucket' ? setBucket('') : setPlatform('')} aria-label={`Remove ${L[kind].toLowerCase()} ${name}`}
        className="flex size-[18px] items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground"><I.x className="size-3" /></button>
    </span>
  ) : (
    <button key={kind} type="button" onMouseDown={e => e.preventDefault()} onClick={() => startPick(kind === 'bucket' ? '@' : '#')}
      className="inline-flex h-[30px] items-center gap-1.5 rounded-lg border px-3 text-[13px] text-muted-foreground hover:bg-muted hover:text-foreground ui-fill">
      {kind === 'bucket' ? <I.layers className="size-3.5" /> : <span className="w-3.5 text-center text-[15px] leading-none">#</span>}{L[kind]}
    </button>
  );
  if (!compact) return (
    <div>
      <div className="flex items-start gap-3.5 px-[22px] pb-4 pt-5">
        <I.plus className="mt-1 size-[22px] shrink-0 text-muted-foreground" />
        <textarea ref={ta} rows={1} value={v} aria-label="New task" spellCheck data-picking={picking ? '1' : undefined}
          placeholder="What needs doing?"
          onChange={e => { const t = e.target.value.replace(/\r?\n/g, ' '); setV(t); look(t, e.target.selectionStart); }}
          onSelect={e => look(e.target.value, e.target.selectionStart)}
          onKeyDown={onKey}
          className="min-w-0 flex-1 resize-none bg-transparent text-[21px] leading-[30px] tracking-[-0.01em] placeholder:text-muted-foreground focus-visible:outline-none" />
      </div>
      {list}
      <div className="flex items-center justify-between gap-2 border-t bg-muted/30 px-3.5 py-2.5">
        {picking ? (
          <div className="flex items-center gap-3.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><Kbd>↑↓</Kbd>move</span>
            <span className="inline-flex items-center gap-1.5"><Kbd>Enter</Kbd>pick</span>
            <span className="inline-flex items-center gap-1.5"><Kbd>Esc</Kbd>keep as text</span>
          </div>
        ) : <div className="flex min-w-0 items-center gap-1.5">{pill('bucket', bucket)}{pill('platform', platform)}</div>}
        <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
          {picking && tok.kind === 'platform'
            ? <span>Picking a {L.platform.toLowerCase()} sends it to Open</span>
            : platform ? <span className="inline-flex items-center gap-1.5"><I.arrowRight className="size-3.5" />Saves to <span className="font-medium text-foreground">Open</span></span>
              : <span className="inline-flex items-center gap-1.5"><I.inbox className="size-3.5" />Saves to Inbox</span>}
          {!picking && <Kbd>Enter ↵</Kbd>}
        </div>
      </div>
    </div>
  );
  return (
    <div className="grid gap-2">
      <div className="flex items-start gap-3">
        {!compact && <span className="mt-[3px] flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"><I.plus className="size-4" /></span>}
        <textarea ref={ta} rows={1} value={v} aria-label="New task" spellCheck data-picking={picking ? '1' : undefined}
          placeholder={`New task… @ for ${L.bucket.toLowerCase()}, # for ${L.platform.toLowerCase()}`}
          onChange={e => { const t = e.target.value.replace(/\r?\n/g, ' '); setV(t); look(t, e.target.selectionStart); }}
          onSelect={e => look(e.target.value, e.target.selectionStart)}
          onKeyDown={onKey}
          className={cn('min-w-0 flex-1 resize-none bg-transparent py-[5px] text-base leading-6 placeholder:text-muted-foreground focus-visible:outline-none', compact && 'rounded-md border border-input px-3 focus-visible:ring-1 focus-visible:ring-ring ui-field')} />
        {!compact && <Kbd className="mt-[7px]">Enter ↵</Kbd>}
      </div>
      {(bucket || platform) && (
        <div className={cn('flex flex-wrap gap-1.5', !compact && 'pl-10')}>
          {bucket && chip('bucket', bucket, dotOf('bucket', bucket), () => setBucket(''))}
          {platform && chip('platform', platform, dotOf('platform', platform), () => setPlatform(''))}
        </div>
      )}
      {picking && (
        <div role="listbox" aria-label={L[tok.kind]} className={cn('rounded-lg border bg-popover p-1 text-popover-foreground anim-pop ui-float', !compact && 'ml-10')}>
          <div className="px-2 pb-1 pt-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{plural(L[tok.kind])}</div>
          {options.length ? options.map((o, i) => (
            <div key={o.name} role="option" aria-selected={i === hi} onMouseDown={e => e.preventDefault()} onMouseEnter={() => setHi(i)} onClick={() => pick(o)}
              className={cn('flex h-8 cursor-pointer items-center gap-2 rounded-md px-2 text-sm', i === hi && 'bg-muted')}>
              <span className={cn('size-2 shrink-0 rounded-full', o.dot || 'bg-zinc-400')} />
              <span className={cn('min-w-0 flex-1 truncate', o.done && 'text-muted-foreground')}>{o.name}</span>
              {o.note && <span className="shrink-0 text-xs text-muted-foreground">{o.note}</span>}
              {i === hi && <Kbd>Enter</Kbd>}
            </div>
          )) : <div className="px-2 py-1.5 text-sm text-muted-foreground">{tok.query ? `No ${L[tok.kind].toLowerCase()} matches “${tok.query}”` : `No ${plural(L[tok.kind]).toLowerCase()} yet`}</div>}
        </div>
      )}
    </div>
  );
}

const CAPTURE_W = 720;
const CAPTURE_RADIUS = 14; // matches .capture-panel in index.css
function QuickCaptureWindow() {
  const [lists, setLists] = useState(() => { let ws = 'product'; try { ws = localStorage.getItem('tasks-ws') || 'product'; } catch (e) {} return readCaptureLists(ws); });
  const [maxH, setMaxH] = useState(() => Math.max(72, Math.round(((window.screen && window.screen.availHeight) || 900) * 0.3)));
  const box = useRef(null);
  const th = useTheme();
  const close = () => getCurrentWindow().close().catch(() => {});
  // A plain solid panel. The page behind it is the same color, so the rounded corners Windows cuts never show a sliver.
  useLayoutEffect(() => {
    document.documentElement.style.background = 'hsl(var(--popover))'; document.body.style.background = 'transparent';
  }, [th.dark]);
  // Sizes the window to the box and rounds its corners (capture_glass in lib.rs, with no blur). Outside Windows only the size changes.
  const height = useRef(0);
  const shape = () => {
    const h = height.current; if (!h) return;
    invoke('capture_glass', { width: CAPTURE_W, height: h, radius: CAPTURE_RADIUS, frost: 0, dark: th.dark })
      .catch(() => getCurrentWindow().setSize(new LogicalSize(CAPTURE_W, h)).catch(() => {}));
  };
  const shapeRef = useRef(shape); shapeRef.current = shape;
  useEffect(() => {
    let un = null;
    getCurrentWindow().onFocusChanged(({ payload }) => { if (!payload) close(); }).then(f => { un = f; }).catch(() => {});
    const onStore = () => { let ws = 'product'; try { ws = localStorage.getItem('tasks-ws') || 'product'; } catch (e) {} setLists(readCaptureLists(ws)); setMaxH(Math.max(72, Math.round(((window.screen && window.screen.availHeight) || 900) * 0.3))); };
    window.addEventListener('storage', onStore); window.addEventListener('focus', onStore);
    return () => { try { un && un(); } catch (e) {} window.removeEventListener('storage', onStore); window.removeEventListener('focus', onStore); };
  }, []);
  // The window follows the box: taller as the text wraps or a list opens.
  useEffect(() => {
    const el = box.current; if (!el || typeof ResizeObserver === 'undefined') return;
    let last = 0;
    const ro = new ResizeObserver(() => {
      const h = Math.ceil(el.getBoundingClientRect().height);
      if (h === last) return; last = h;
      height.current = h; shapeRef.current();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const save = async ({ title, bucket, project }) => {
    if (!title) return close();
    let ws = 'product'; try { ws = localStorage.getItem('tasks-ws') || 'product'; } catch (e) {}
    await emit('capture-task', { title, ws, bucket, project }).catch(() => {});
    close();
  };
  return (
    <div ref={box} className="capture-panel">
      <CaptureBox lists={lists} maxHeight={maxH} onSave={save} onCancel={close} />
    </div>
  );
}

/* Settings for this computer, plus the current workspace's watch folders. */
// Turns a key press into a shortcut like "Ctrl+Alt+Q". Letters, digits, F-keys, Space and common symbols are allowed.
const KEY_NAMES = { Backquote: '`', Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Backslash: '\\', Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/' };
function shortcutFromEvent(e) {
  const c = e.code || '';
  let key = null;
  if (/^Key[A-Z]$/.test(c)) key = c.slice(3);
  else if (/^Digit\d$/.test(c)) key = c.slice(5);
  else if (/^F([1-9]|1\d|2[0-4])$/.test(c)) key = c;
  else if (c === 'Space') key = 'Space';
  else if (KEY_NAMES[c]) key = c;
  if (!key) return null;
  const mods = [e.ctrlKey && 'Ctrl', e.altKey && 'Alt', e.shiftKey && 'Shift', e.metaKey && 'Win'].filter(Boolean);
  return { combo: [...mods, key].join('+'), ok: /^F\d+$/.test(key) || e.ctrlKey || e.altKey };
}
const showShortcut = k => (k || '').split('+').map(p => KEY_NAMES[p] || p).join(' + ');

function ShortcutRecorder({ value, onChange, error }) {
  const [rec, setRec] = useState(false);
  const [msg, setMsg] = useState('');
  return (
    <div className="grid gap-1.5">
      <div className="flex gap-2">
        <button type="button" onClick={() => { setRec(true); setMsg(''); }} onBlur={() => setRec(false)}
          onKeyDown={e => {
            if (!rec) return;
            e.preventDefault(); e.stopPropagation();
            if (e.key === 'Escape') { setRec(false); return; }
            if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return;
            const r = shortcutFromEvent(e);
            if (!r) { setMsg('That key can’t be used. Try a letter, a number, Space or F1–F12.'); return; }
            if (!r.ok) { setMsg('Include Ctrl or Alt, so the shortcut doesn’t get in the way of typing in other apps. Function keys work on their own.'); return; }
            setRec(false); setMsg(''); onChange(r.combo);
          }}
          className={cn(inputCls, 'h-9 flex-1 items-center justify-between text-left', rec && 'ring-1 ring-ring')}>
          <span className={cn(rec && 'text-muted-foreground')}>{rec ? 'Press the keys you want…' : value === 'Off' ? 'Off' : showShortcut(value)}</span>
          <span className="text-xs text-muted-foreground">{rec ? 'Esc to cancel' : 'Click to change'}</span>
        </button>
        <Button variant="outline" onClick={() => onChange(PREF_DEFAULTS.captureKey)} disabled={value === PREF_DEFAULTS.captureKey}>Reset</Button>
        <Button variant="ghost" onClick={() => onChange('Off')} disabled={value === 'Off'}>Off</Button>
      </div>
      {(msg || error) && <p className="text-[0.8rem] text-destructive">{msg || error}</p>}
    </div>
  );
}

/* Settings (0.19.13): pages on the left, one short line per setting, longer explanations behind ⓘ.
   Notifications moved here from Automations. They're still stored and synced as notify automations
   (one rule per event), so nothing about storage or cloud sync changed. */
const SETTINGS_PAGES = [
  { group: 'Account' },
  { id: 'profile', label: 'Profile', icon: 'user' },
  { id: 'members', label: 'Members', icon: 'users' },
  { id: 'teams', label: 'Roles & teams', icon: 'layers' },
  { group: 'App' },
  { id: 'general', label: 'General', icon: 'gear' },
  { id: 'appearance', label: 'Appearance', icon: 'sun' },
  { id: 'notifications', label: 'Notifications', icon: 'bell' },
  { id: 'shortcuts', label: 'Shortcuts', icon: 'keyboard' },
  { group: 'Workspace' },
  { id: 'workspace', label: 'Workspace', icon: 'layers' },
  { id: 'folders', label: 'Watch folders', icon: 'folder' },
  { group: 'Data' },
  { id: 'cloud', label: 'Cloud & backups', icon: 'cloud' },
  { id: 'about', label: 'About', icon: 'info' },
];
// Events you can be notified about, in the order they're listed.
const NOTIFY_TRIGGERS = ['due_soon', 'overdue', 'blocked', 'unblocked', 'done', 'reopened', 'started', 'created', 'assigned', 'high', 'checklist', 'file_added', 'moved'];
// ⓘ with the longer explanation in a small pop-up on hover or focus.
const InfoTip = ({ children, label = 'More info' }) => (
  <span className="group/tip relative inline-flex">
    <button type="button" aria-label={label} className="flex size-5 items-center justify-center rounded text-muted-foreground/60 transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"><I.info className="size-3.5" /></button>
    <span role="tooltip" className="pointer-events-none absolute left-1/2 top-full z-20 mt-1.5 w-64 -translate-x-1/2 rounded-md border bg-popover px-3 py-2 text-xs font-normal leading-snug text-popover-foreground opacity-0 transition-opacity group-hover/tip:opacity-100 group-focus-within/tip:opacity-100 ui-float">{children}</span>
  </span>
);
const SRow = ({ label, info, children, className }) => (
  <div className={cn('group/row flex min-h-9 items-center gap-3 text-sm', className)}>
    <div className="flex min-w-0 flex-1 items-center gap-1.5"><span className="truncate">{label}</span>{info && <InfoTip label={`About ${typeof label === 'string' ? label.toLowerCase() : 'this setting'}`}>{info}</InfoTip>}</div>
    {children}
  </div>
);
const quietBtn = 'inline-flex h-7 items-center gap-1 rounded-md px-2 text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50';
// A label that looks like text until you hover it, then edits in place. Saves on Enter or when you leave it.
function QuietInput({ value, onSave, label, placeholder }) {
  const [v, setV] = useState(value || '');
  useEffect(() => setV(value || ''), [value]);
  const commit = () => { const t = v.trim(); if (t && t !== value) onSave(t); else setV(value || ''); };
  return <input value={v} onChange={e => setV(e.target.value)} onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { e.stopPropagation(); setV(value || ''); setTimeout(() => e.target.blur()); } }}
    aria-label={label} placeholder={placeholder} spellCheck={false}
    className="h-7 w-44 rounded-md border border-transparent px-2 text-right text-[13px] transition-colors hover:border-input focus:border-input focus:text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ui-quiet" />;
}
// The quick capture key: shows the keys; click to record new ones. Reset and Off appear on hover.
function ShortcutCell({ value, onChange, error }) {
  const [rec, setRec] = useState(false);
  const [msg, setMsg] = useState('');
  const keys = value === 'Off' ? null : showShortcut(value).split(' + ');
  return (
    <div className="grid justify-items-end gap-1">
      <div className="flex items-center gap-1">
        <button type="button" className={cn(quietBtn, 'opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100')} onClick={() => onChange(PREF_DEFAULTS.captureKey)} disabled={value === PREF_DEFAULTS.captureKey}>Reset</button>
        <button type="button" className={cn(quietBtn, 'opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100')} onClick={() => onChange('Off')} disabled={value === 'Off'}>Off</button>
        <button type="button" aria-label="Change the quick capture shortcut" title="Click, then press the keys" onClick={() => { setRec(true); setMsg(''); }} onBlur={() => setRec(false)}
          onKeyDown={e => {
            if (!rec) return;
            e.preventDefault(); e.stopPropagation();
            if (e.key === 'Escape') { setRec(false); return; }
            if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return;
            const r = shortcutFromEvent(e);
            if (!r) { setMsg('Try a letter, a number, Space or F1–F12.'); return; }
            if (!r.ok) { setMsg('Include Ctrl or Alt. Function keys work alone.'); return; }
            setRec(false); setMsg(''); onChange(r.combo);
          }}
          className={cn('flex h-7 items-center gap-1 rounded-md border border-transparent px-1.5 transition-colors hover:border-input focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ui-quiet', rec && 'border ring-1 ring-ring ui-quiet')}>
          {rec ? <span className="px-1 text-[13px] text-muted-foreground">Press keys…</span> : keys ? keys.map(k => <Kbd key={k} className="h-6 px-2 text-[11px]">{k}</Kbd>) : <span className="px-1 text-[13px] text-muted-foreground">Off</span>}
        </button>
      </div>
      {(msg || error) && <p className="text-xs text-destructive">{msg || error}</p>}
    </div>
  );
}

function SettingsDialog({ open, page: startPage = 'general', onClose, prefs, onPrefs, shortcutError, wsName, onRenameWorkspace, labels, onLabel, counts = {}, onEditStatuses, onEditBucketStatuses, onEditPlatforms,
  rules, onRules, projects, watch, onAddFolder, onRemoveFolder, onSubfolders, status, onOpenCloud, onBackup, onRestore, onOpenDataFolder, updater, onWhatsNew, prof, workspaces = [], ws, onSwitchWorkspace, onSignOut,
  teamsList = DEFAULT_TEAMS, rolesList = DEFAULT_ROLES, onSaveTeams = () => {}, onSaveRoles = () => {}, teamTaskCounts = {}, onMoveTasks = () => {} }) {
  const [page, setPage] = useState(startPage);
  const [allNotify, setAllNotify] = useState(false);
  useEffect(() => { if (open) setPage(startPage || 'general'); }, [open, startPage]);
  const th = useTheme();
  const c = useCloud();
  if (!open) return null;
  const notifyRules = (rules || []).filter(r => r.action === 'notify' && r.scope !== 'bucket');
  const notifyOn = id => notifyRules.some(r => r.trigger === id && r.enabled);
  const onCount = NOTIFY_TRIGGERS.filter(notifyOn).length;
  // The six most useful events show first; the rest fold away unless one of them is on.
  const shownTriggers = allNotify || NOTIFY_TRIGGERS.slice(6).some(notifyOn) ? NOTIFY_TRIGGERS : NOTIFY_TRIGGERS.slice(0, 6);
  const setNotify = (id, on) => {
    const mine = notifyRules.filter(r => r.trigger === id);
    if (mine.length) onRules(rules.map(r => r.action === 'notify' && r.trigger === id ? { ...r, enabled: on } : r));
    else if (on) onRules([...rules, { id: 'r-' + newId(), enabled: true, project: '', trigger: id, action: 'notify', target: '' }]);
  };
  // One project per event: picking one keeps the first notification for that event (and its message) and drops any others.
  const setNotifyProject = (id, project) => {
    const keep = notifyRules.find(r => r.trigger === id);
    onRules(rules.filter(r => !(r.action === 'notify' && r.trigger === id) || r === keep).map(r => r === keep ? { ...r, project } : r));
  };
  const projectOptions = [{ value: '', label: 'Any project' }, ...projects.map(p => ({ value: p, label: p, icon: <PIcon name={p} className="size-3.5 text-muted-foreground" /> }))];
  const tone = CLOUD_TONE[c.phase] || CLOUD_TONE.loading;
  const signedIn = !['off', 'signin', 'loading'].includes(c.phase);
  const navBtn = (p) => {
    const Icon = I[p.icon] || I.gear;
    const n = p.id === 'notifications' ? onCount : p.id === 'folders' ? watch.length : p.id === 'members' ? (c.access ? cloudTeamCount() : 1) : 0;
    return (
      <button key={p.id} type="button" onClick={() => setPage(p.id)} aria-current={page === p.id ? 'page' : undefined}
        className={cn('flex h-8 w-full items-center gap-2 rounded-md px-2.5 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
          page === p.id ? 'bg-accent font-medium text-foreground' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground')}>
        <Icon className="size-3.5 shrink-0" /><span className="min-w-0 flex-1 truncate">{p.label}</span>{n > 0 && <span className="tnum text-xs text-muted-foreground">{n}</span>}
      </button>
    );
  };
  const head = (t, extra) => <h3 className="mb-1.5 flex items-center gap-2 text-[15px] font-semibold">{t}{extra}</h3>;
  const link = (text, onClick, label) => <button type="button" onClick={onClick} aria-label={label} className={quietBtn}>{text}<I.external className="size-3" /></button>;
  let body;
  if (page === 'profile') body = <ProfilePage prof={prof} workspaces={workspaces} ws={ws} cloud={c} onManageWorkspace={() => setPage('workspace')}
    onSwitchWorkspace={id => { if (id !== ws) { onClose(); onSwitchWorkspace(id); } }} onSignOut={() => { onClose(); onSignOut(); }} />;
  else if (page === 'members') body = <MembersPage prof={prof} cloud={c} teamsList={teamsList} rolesList={rolesList} />;
  else if (page === 'teams') body = <RolesTeamsPage teamsList={teamsList} rolesList={rolesList} onSaveTeams={onSaveTeams} onSaveRoles={onSaveRoles} taskCounts={teamTaskCounts} onMoveTasks={onMoveTasks} />;
  else if (page === 'general') body = <>
    {head('General')}
    <SRow label="Keep running in the tray" info="Closing the window hides Tasks instead of quitting, so quick capture and watch folders keep working. Quit from the tray icon.">
      <Switch checked={!!prefs.keepInTray} onChange={v => onPrefs({ keepInTray: v })} label="Keep running in the system tray" />
    </SRow>
    <SRow label="One task at a time" info="Starting a timer pauses the others, and moving a task to In progress marks the one before it as Blocked. Turn off to run several timers at once.">
      <Switch checked={!!prefs.oneAtATime} onChange={v => onPrefs({ oneAtATime: v })} label="One task at a time" />
    </SRow>
    <SRow label="Ask about idle time" info="When a timer runs with no keyboard or mouse activity for this long, Tasks asks what to do with that time.">
      <Select variant="word" label="Ask about idle time after" value={String(prefs.idleMinutes)} onChange={v => onPrefs({ idleMinutes: Number(v) })} searchable={false}
        options={[['5', 'After 5 min'], ['10', 'After 10 min'], ['15', 'After 15 min'], ['20', 'After 20 min'], ['30', 'After 30 min'], ['60', 'After 1 hour'], ['0', 'Never']].map(([value, label]) => ({ value, label }))} />
    </SRow>
  </>;
  else if (page === 'appearance') body = <>
    {head('Appearance')}
    <SRow label="Theme" info="Shift + D switches between light and dark from anywhere in the app.">
      <ToggleGroup label="Theme" value={th.mode} onChange={th.choose} items={THEMES.map(t => ({ value: t.id, label: t.label, icon: t.id === 'light' ? <I.sun className="size-3.5" /> : t.id === 'dark' ? <I.moon className="size-3.5" /> : <I.monitor className="size-3.5" /> }))} />
    </SRow>
  </>;
  else if (page === 'notifications') body = <>
    {head('Notify me when a task', <InfoTip label="About notifications">Desktop notifications for {wsName}. Several at once arrive as one, like “12 tasks are overdue”.{c.access ? ' These are just yours, on this PC, and only cover your tasks and your teams’ tasks.' : ''}</InfoTip>)}
    {shownTriggers.map(id => {
      const on = notifyOn(id), r = notifyRules.find(x => x.trigger === id);
      return (
        <SRow key={id} label={TRIG[id].label}>
          {on && <Select variant="word" label={`Project for “${TRIG[id].label}”`} value={(r && r.project) || ''} onChange={v => setNotifyProject(id, v)} options={projectOptions} />}
          <Switch checked={on} onChange={v => setNotify(id, v)} label={`Notify me when a task ${TRIG[id].label}`} />
        </SRow>
      );
    })}
    {shownTriggers.length < NOTIFY_TRIGGERS.length && <button type="button" onClick={() => setAllNotify(true)} className={cn(quietBtn, 'w-fit -ml-2')}><I.down className="size-3.5" />{NOTIFY_TRIGGERS.length - shownTriggers.length} more</button>}
  </>;
  else if (page === 'shortcuts') body = <>
    {head('Shortcuts')}
    <SRow label="Quick capture, anywhere" info="Works in any app while Tasks is running. Click the keys to change them.">
      <ShortcutCell value={prefs.captureKey} onChange={v => onPrefs({ captureKey: v })} error={shortcutError} />
    </SRow>
    {SHORTCUTS.filter(([what]) => !/anywhere in Windows|Show this list/.test(what)).map(([what, key]) => (
      <SRow key={what} label={what}><span className="flex shrink-0 items-center gap-1">{key.split(' / ').map((k, i) => <React.Fragment key={k}>{i > 0 && <span className="text-xs text-muted-foreground">or</span>}<Kbd className="h-6 px-2 text-[11px]">{k.replace(/ \+ /g, ' ')}</Kbd></React.Fragment>)}</span></SRow>
    ))}
  </>;
  else if (page === 'workspace') body = <>
    {head('Workspace')}
    <SRow label="Name"><QuietInput value={wsName} onSave={onRenameWorkspace} label="Workspace name" /></SRow>
    <SRow label="Call buckets" info="What this workspace calls buckets, everywhere: the table, filters and the task panel."><QuietInput value={labels.bucket} onSave={v => onLabel('bucket', v)} label="Name for buckets" placeholder={LABEL_DEFAULTS.bucket} /></SRow>
    <SRow label="Call platforms"><QuietInput value={labels.platform} onSave={v => onLabel('platform', v)} label="Name for platforms" placeholder={LABEL_DEFAULTS.platform} /></SRow>
    <div className="my-2 h-px bg-border" />
    <SRow label="Task statuses">{link(`${counts.stages} statuses`, onEditStatuses, 'Edit task statuses')}</SRow>
    <SRow label={`${labels.bucket} statuses`}>{link(`${counts.bucketStatuses} statuses`, onEditBucketStatuses, `Edit ${labels.bucket.toLowerCase()} statuses`)}</SRow>
    <SRow label={plural(labels.platform)}>{link(`${counts.platforms} ${plural(labels.platform).toLowerCase()}`, onEditPlatforms, `Edit ${plural(labels.platform).toLowerCase()}`)}</SRow>
  </>;
  else if (page === 'folders') body = <>
    {head(<>Watch folders <span className="text-[13px] font-normal text-muted-foreground">for {wsName}</span></>, <InfoTip label="About watch folders">New PDF, Word, HTML and other supported files saved in these folders appear in the Documents Inbox. Your files stay where they are. Each PC keeps its own list.</InfoTip>)}
    <div className="grid gap-0.5">
      {watch.map(w => {
        const st = status[w.path] || {};
        return (
          <div key={w.path} className="group/f rounded-md px-2 py-1.5 transition-colors hover:bg-muted/50">
            <div className="flex items-center gap-2 text-[13px]">
              <I.folder className="size-3.5 shrink-0 text-muted-foreground" /><span className="min-w-0 flex-1 truncate">{w.path}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {st.error ? <span className="text-destructive">{st.error}</span>
                  : st.checkedAt ? <>{st.added ? `${st.added} added` : `Checked ${relTime(st.checkedAt).toLowerCase()}`}{st.skipped && st.skipped.length ? <> · <span title={st.skipped.map(x => `${x.name}: ${x.why}`).join('\n')} className="underline decoration-dotted underline-offset-2">{st.skipped.length} skipped</span></> : ''}</> : 'Not checked yet'}
              </span>
              <Button variant="ghost" size="icon-sm" className={cn('text-muted-foreground opacity-0 transition-opacity group-hover/f:opacity-100 focus-visible:opacity-100 hover:!bg-destructive/10', danger)} aria-label={`Stop watching ${w.path}`} title="Stop watching" onClick={() => onRemoveFolder(w.path)}><I.x className="size-3.5" /></Button>
            </div>
            <label className="ml-[22px] mt-1 flex w-fit items-center gap-2 text-xs text-muted-foreground"><Checkbox checked={!!w.subfolders} onChange={v => onSubfolders(w.path, v)} label="Include subfolders" />Include subfolders</label>
          </div>
        );
      })}
      <button type="button" onClick={onAddFolder} className={cn(quietBtn, 'h-8 w-fit gap-2 px-2')}><I.plus className="size-3.5" />Add a folder</button>
    </div>
  </>;
  else if (page === 'cloud') body = <>
    {head('Cloud sync', <InfoTip label="About cloud sync">Keeps every PC you sign in on in step, within a second or two. Your data stays on this PC too, so Tasks works offline.</InfoTip>)}
    <SRow label={<span className="flex items-center gap-2">{tone.dot && <span className={cn('size-2 shrink-0 rounded-full', tone.dot)} />}{tone.text}{c.phase === 'synced' && c.lastSync ? ` · ${ago(c.lastSync)}` : ''}{c.email && signedIn ? <span className="truncate text-xs text-muted-foreground">{c.email}</span> : null}</span>}>
      {signedIn ? <>
        <button type="button" className={quietBtn} onClick={cloudSyncNow}><I.refresh className="size-3.5" />Sync now</button>
        <button type="button" className={cn(quietBtn, 'hover:bg-destructive/10 hover:text-destructive')} onClick={() => cloudSignOut().catch(e => toast.error('Couldn’t sign out', String(e)))}>Sign out</button>
        <button type="button" className={quietBtn} onClick={onOpenCloud}>Details</button>
      </> : <Button variant="outline" size="sm" onClick={onOpenCloud}>{c.phase === 'signin' ? 'Sign in…' : 'Set up…'}</Button>}
    </SRow>
    <div className="my-2 h-px bg-border" />
    {head('Backups')}
    <SRow label="Back up data" info="Saves tasks, documents, automations and your profile to one .zip file."><Button variant="outline" size="sm" onClick={onBackup}><I.download className="size-3.5" />Back up…</Button></SRow>
    <SRow label="Restore from backup" info="Replaces everything in the app with the backup. Back up first if you might need what’s here now."><Button variant="outline" size="sm" onClick={onRestore}><I.upload className="size-3.5" />Restore…</Button></SRow>
    <SRow label="Data folder">{link('Open', onOpenDataFolder, 'Open data folder')}</SRow>
    <SRow label="Log folder">{link('Open', () => invoke('open_log_folder').catch(e => toast.error('Couldn’t open the folder', String(e))), 'Open log folder')}</SRow>
  </>;
  else if (page === 'about') body = <>
    <div className="mb-3 flex items-center gap-3">
      <span className="flex size-10 items-center justify-center rounded-[10px] bg-primary text-primary-foreground"><I.check className="size-5" /></span>
      <div><div className="font-semibold">Tasks</div><div className="text-xs text-muted-foreground">Version {updater.version || '…'}</div></div>
    </div>
    <SRow label="Updates">
      {updater.update ? <Button size="sm" onClick={updater.install} disabled={updater.progress !== null}>{updater.progress === null ? `Install ${updater.update.version}` : 'Installing…'}</Button>
        : <Button variant="outline" size="sm" onClick={() => updater.look(true)}><I.reset className="size-3.5" />Check now</Button>}
    </SRow>
    <SRow label="What’s new">{link(updater.version ? `See ${updater.version}` : 'See', onWhatsNew, 'See what’s new')}</SRow>
  </>;
  return (
    <Dialog open onClose={onClose} title="Settings" className="max-w-[680px]" footer={<Button onClick={onClose}>Done</Button>}>
      <div className="grid min-h-[380px] grid-cols-[176px_minmax(0,1fr)]">
        <nav aria-label="Settings pages" className="grid content-start gap-0.5 border-r pr-3">
          {SETTINGS_PAGES.map((p, i) => p.group
            ? <div key={'g' + i} className={cn('px-2.5 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/80', i === 0 ? 'pt-0.5' : 'pt-3')}>{p.group}</div>
            : navBtn(p))}
        </nav>
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-0.5 pl-6" data-testid={`settings-${page}`}>{body}</div>
      </div>
    </Dialog>
  );
}

/* Idle time: asks what to do with time spent away while a timer was running. */
function IdleDialog({ idle, onKeep, onRemove, onRemoveStop }) {
  if (!idle) return null;
  const mins = Math.max(1, Math.round((idle.end - idle.start) / 60000));
  const many = idle.titles && idle.titles.length > 1;
  const names = many ? idle.titles.map(x => `“${x || 'Untitled'}”`).join(idle.titles.length === 2 ? ' and ' : ', ') : `“${idle.title || 'Untitled'}”`;
  return (
    <Dialog open onClose={onKeep} title={`You were away for ${mins >= 60 ? `${Math.floor(mins / 60)} h ${mins % 60} min` : `${mins} min`}`} className="max-w-md"
      description={`The ${many ? 'timers' : 'timer'} for ${names} kept running while there was no activity, from ${new Date(idle.start).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}.`}
      footer={<>
        <Button variant="ghost" className="sm:mr-auto" onClick={onRemoveStop}>Remove and stop {many ? 'timers' : 'timer'}</Button>
        <Button variant="outline" onClick={onKeep}>Keep the time</Button>
        <Button onClick={onRemove}>Remove idle time</Button>
      </>} />
  );
}

/* Shown when Tasks opens again after closing (or the PC shutting down) with timers running. */
function PausedTimersDialog({ note, tasks, oneAtATime, onResume, onClose }) {
  const [resumed, setResumed] = useState([]);
  if (!note) return null;
  const list = note.ids.map(id => tasks[id]).filter(Boolean);
  if (!list.length) return null;
  const many = list.length > 1;
  const at = new Date(note.at), today = new Date().toDateString() === at.toDateString();
  const when = `${today ? 'today' : at.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })} at ${at.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
  const left = list.filter(t => !resumed.includes(t.id) && !t.timerStartedAt);
  const resume = ids => { onResume(ids); const all = [...resumed, ...ids]; setResumed(all); if (list.every(t => all.includes(t.id))) onClose(); };
  return (
    <Dialog open onClose={onClose} className="max-w-md"
      title={many ? `Timers on ${list.length} tasks were paused` : 'A timer was paused'}
      description={`${note.crash ? 'Tasks didn’t close normally (the PC may have shut down)' : 'Tasks was closed'}, so ${many ? 'these timers were' : 'this timer was'} stopped ${when}. Time up to then is saved. Do you want to resume?`}
      footer={<>
        <Button variant="outline" onClick={onClose}>{resumed.length ? 'Done' : 'Keep paused'}</Button>
        {left.length > 0 && !(oneAtATime && left.length > 1) && <Button onClick={() => resume(left.map(t => t.id))}><I.play className="size-3.5" />{left.length > 1 ? `Resume all ${left.length}` : 'Resume'}</Button>}
      </>}>
      <ul className="divide-y rounded-md border ui-inset" data-testid="paused-list">
        {list.map(t => {
          const on = resumed.includes(t.id) || !!t.timerStartedAt;
          return (
            <li key={t.id} className="flex items-center gap-3 px-3 py-2.5">
              <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-full', on ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground')}>{on ? <I.play className="size-3.5 translate-x-px" /> : <I.pause className="size-3.5" />}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{t.title || 'Untitled'}</span>
                <span className="tnum block text-xs text-muted-foreground">{<Elapsed task={t} />} tracked{t.bucket ? ` · ${t.bucket}` : ''}</span>
              </span>
              {on ? <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Running</span>
                : <Button variant="outline" size="sm" onClick={() => resume([t.id])} aria-label={`Resume timer for ${t.title || 'Untitled'}`}>Resume</Button>}
            </li>
          );
        })}
      </ul>
      {oneAtATime && left.length > 1 && <p className="-mt-2 text-xs text-muted-foreground">“One task at a time” is on, so you can resume one of them.</p>}
    </Dialog>
  );
}

async function openTaskWindow(id, title, ws = 'product') {
  const label = 'task-' + String(id).replace(/[^a-zA-Z0-9_-]/g, '');
  try {
    const existing = await WebviewWindow.getByLabel(label);
    if (existing) { await existing.setFocus(); return; }
    const w = new WebviewWindow(label, { url: 'index.html#task=' + encodeURIComponent(id) + '&ws=' + encodeURIComponent(ws), title: title || 'Task', width: 780, height: 880, minWidth: 480, minHeight: 480 });
    w.once('tauri://error', e => toast.error('Couldn’t open a new window', String(e && e.payload)));
  } catch (e) { toast.error('Couldn’t open a new window', String(e)); }
}

function useProfile() {
  const [state, setState] = useState({ loaded: false, data: {} });
  useEffect(() => {
    invoke('read_store', { name: 'profile' })
      .then(raw => setState({ loaded: true, data: raw ? JSON.parse(raw) : {} }))
      .catch(() => setState({ loaded: true, data: {} }));
  }, []);
  const update = useCallback(patch => setState(s => { const data = { ...s.data, ...patch }; persist('profile', data); return { ...s, data }; }), []);
  // Changes to your profile (0.19.13). Edits made here are stamped and sent to the cloud; ones from the cloud aren't.
  // 'quiet' (the time zone from this PC's clock) is saved and sent without a new stamp, so it never wins over a real edit.
  const updateUser = useCallback((patch, how) => setState(s => {
    if (!s.data.user) return s;
    const user = { ...s.data.user, ...patch, ...(how ? {} : { editedAt: Date.now() }) };
    const data = { ...s.data, user }; persist('profile', data);
    if (how !== true) setTimeout(cloudProfileNote);
    return { ...s, data };
  }), []);
  return { ...state, update, updateUser };
}

/* Timers per person (0.20). Each person's timer and time log live inside the task under their own
   field, "tm_<person>": { at, dev, spent, ss }, so two people timing the same task never clash and the
   cloud merges them field by field. Time logged before 0.20 stays in the old fields (timeSpent, sessions).
   In memory a task shows *your* timer in the usual fields (timerStartedAt, timerDevice), with everyone's
   time added up in timeSpent and sessions; it's turned back into the saved form before it's written. */
let personKey = (() => { try { return localStorage.getItem('tasks-person') || 'local'; } catch (e) { return 'local'; } })();
const setPersonKey = k => { if (!k || k === personKey) return; personKey = k; try { localStorage.setItem('tasks-person', k); } catch (e) {} };
const TM = 'tm_';
const sameSess = (a, b) => a.s === b.s && a.e === b.e;
function taskIn(st) {
  if (!st || typeof st !== 'object') return st;
  const mineK = TM + personKey, keys = Object.keys(st).filter(k => k.startsWith(TM));
  if (st._t0 !== undefined) return st;
  if (!keys.length && personKey === 'local') return st; // not in a team: the old fields are the whole story
  const t0 = { timeSpent: st.timeSpent, sessions: st.sessions, timerStartedAt: st.timerStartedAt, timerDevice: st.timerDevice };
  const mine = st[mineK] || {};
  let spent = t0.timeSpent || 0, sessions = [...(t0.sessions || [])];
  keys.forEach(k => { const x = st[k] || {}; spent += x.spent || 0; (x.ss || []).forEach(y => sessions.push(k === mineK ? y : { ...y, by: k.slice(TM.length) })); });
  const legacyMine = t0.timerStartedAt && timerHere(t0) && !mine.at;
  return { ...st, timeSpent: spent, sessions, timerStartedAt: legacyMine ? t0.timerStartedAt : (mine.at || null), timerDevice: legacyMine ? t0.timerDevice : (mine.dev || undefined), _t0: t0 };
}
function taskOut(v) {
  if (!v || typeof v !== 'object' || v._t0 === undefined) return v;
  const { _t0: t0, ...rest } = v, mineK = TM + personKey;
  const others = Object.keys(v).filter(k => k.startsWith(TM) && k !== mineK);
  const othersSpent = others.reduce((n, k) => n + ((v[k] || {}).spent || 0), 0);
  const known = [...(t0.sessions || []), ...others.flatMap(k => (v[k] || {}).ss || [])];
  const was = v[mineK] || {};
  const mineSs = (v.sessions || []).filter(x => !x.by && !known.some(y => sameSess(x, y)));
  const legacyMine = t0.timerStartedAt && timerHere(t0) && !was.at;
  let legacyAt = t0.timerStartedAt, legacyDev = t0.timerDevice, at = v.timerStartedAt || null;
  if (legacyMine) { if (at === t0.timerStartedAt) at = null; else { legacyAt = null; legacyDev = undefined; } }
  const spent = Math.max(0, (v.timeSpent || 0) - (t0.timeSpent || 0) - othersSpent);
  const mine = { at, dev: at ? (v.timerDevice || DEVICE_ID) : null, spent, ss: mineSs };
  const out = { ...rest, timeSpent: t0.timeSpent, sessions: t0.sessions, timerStartedAt: legacyAt, timerDevice: legacyDev };
  if (v[mineK] !== undefined || at || spent || mineSs.length) out[mineK] = mine;
  return out;
}
const tasksIn = m => { const n = {}; Object.entries(m || {}).forEach(([k, t]) => { n[k] = taskIn(t); }); return n; };
// The saved form of each task is kept until the task changes (0.20.3), so saving and syncing only
// do work for tasks that actually changed.
const outMemo = new WeakMap();
const taskOutMemo = t => {
  if (!t || typeof t !== 'object') return taskOut(t);
  const m = outMemo.get(t);
  if (m && m.pk === personKey) return m.out;
  const out = taskOut(t); outMemo.set(t, { pk: personKey, out }); return out;
};
const tasksOut = m => { const n = {}; Object.entries(m || {}).forEach(([k, t]) => { n[k] = taskOutMemo(t); }); return n; };
// A timer started on this PC (timers from before 0.19 have no PC and count as this one's).
const timerHere = t => !t.timerDevice || t.timerDevice === DEVICE_ID;
const elapsed = t => (t.timeSpent || 0) + (t.timerStartedAt ? Date.now() - t.timerStartedAt : 0);
/* A running timer's clock ticks by itself (0.20.3). Only these small pieces re-render every second;
   the rest of the app refreshes its totals once a minute. */
const useTick = (on, ms = 1000) => { const [, set] = useState(0); useEffect(() => { if (!on) return; const i = setInterval(() => set(x => x + 1), ms); return () => clearInterval(i); }, [on, ms]); };
const Elapsed = ({ task }) => { useTick(!!(task && task.timerStartedAt)); return task ? fmt(elapsed(task)) : null; };
// Stops a running timer and records the session, so time can be summed per day and week.
const stopT = t => t.timerStartedAt
  ? { ...t, timeSpent: elapsed(t), timerStartedAt: null, sessions: [...(t.sessions || []), { s: t.timerStartedAt, e: Date.now() }] }
  : t;
const overlap = (s, e, a, b) => Math.max(0, Math.min(e, b) - Math.max(s, a));
// Stops a timer at a given moment (when Tasks closed, or the last heartbeat after a hard shutdown).
const stopAt = (t, end) => {
  if (!t.timerStartedAt) return t;
  const e = Math.max(t.timerStartedAt, Math.min(end, Date.now()));
  return { ...t, timeSpent: (t.timeSpent || 0) + (e - t.timerStartedAt), timerStartedAt: null, sessions: [...(t.sessions || []), { s: t.timerStartedAt, e }] };
};
const trackedIn = (t, a, b) => (t.sessions || []).reduce((x, ss) => x + overlap(ss.s, ss.e, a, b), 0) + (t.timerStartedAt ? overlap(t.timerStartedAt, Date.now(), a, b) : 0);
const fmtShort = ms => { const m = Math.floor(ms / 60000), h = Math.floor(m / 60); return h ? `${h}h ${m % 60}m` : `${m}m`; };
const fmt = ms => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 3600)}:${pad(Math.floor(s % 3600 / 60))}:${pad(s % 60)}`; };
const dayDiff = iso => { const n = new Date(); n.setHours(0, 0, 0, 0); return Math.round((fromISO(iso) - n) / 864e5); };
function due(t) {
  if (!t.deadline) return { text: 'No deadline', tone: 'muted' };
  const nice = fromISO(t.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  if (t.status === 'done') return { text: nice, tone: 'muted' };
  const d = dayDiff(t.deadline);
  if (d < 0) return { text: `${-d} ${d === -1 ? 'day' : 'days'} overdue`, tone: 'late' };
  if (d === 0) return { text: 'Due today', tone: 'soon' };
  if (d === 1) return { text: 'Tomorrow', tone: 'soon' };
  return { text: nice, tone: 'normal' };
}
const dueCls = { muted: 'text-muted-foreground', late: 'text-destructive font-medium', soon: 'text-foreground font-medium', normal: 'text-foreground' };

/* =========================================================
   App
   ========================================================= */
/* =========================================================
   Documents
   ========================================================= */
const MAX_FILE = 200 * 1024 * 1024;
const ALLOWED = ['pdf', 'docx', 'html', 'htm', 'xlsx', 'csv', 'pptx', 'txt', 'md', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'zip', 'json'];
const RAW_TYPES = { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp' };
const MIME = { docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', html: 'text/html', htm: 'text/html', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', csv: 'text/csv', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', txt: 'text/plain', md: 'text/markdown', zip: 'application/zip', json: 'application/json' };
const KINDS = {
  pdf: { label: 'PDF', short: 'PDF', cls: 'border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400' },
  word: { label: 'Word document', short: 'DOC', cls: 'border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300' },
  html: { label: 'HTML page', short: 'HTML', cls: 'border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300' },
  image: { label: 'Image', short: 'IMG', cls: 'border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' },
  sheet: { label: 'Spreadsheet', short: 'XLS', cls: 'border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300' },
  slides: { label: 'Presentation', short: 'PPT', cls: 'border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300' },
  text: { label: 'Text file', short: 'TXT', cls: 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300' },
  other: { label: 'File', short: 'FILE', cls: 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300' },
};
const extOf = name => ((name || '').match(/\.([^.]+)$/) || [, ''])[1].toLowerCase();
const kindOf = name => {
  const e = extOf(name);
  if (e === 'pdf') return 'pdf';
  if (e === 'docx') return 'word';
  if (e === 'html' || e === 'htm') return 'html';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(e)) return 'image';
  if (e === 'xlsx' || e === 'csv') return 'sheet';
  if (e === 'pptx') return 'slides';
  if (['txt', 'md', 'json'].includes(e)) return 'text';
  return 'other';
};
const fmtSize = b => b < 1048576 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1048576).toFixed(1)} MB`;
const fmtDay = ms => new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: new Date(ms).getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });

let mammothP = null;
const loadMammoth = () => mammothP || (mammothP = import('mammoth/mammoth.browser.js').then(m => m.default || m).catch(e => { mammothP = null; throw e; }));
// Documents are copied into the app's own folder on this computer,
// so moving or deleting the original file later doesn't break anything.
async function importDoc(info) {
  const r = await invoke('import_document', { path: info.path });
  const e = extOf(info.name);
  return { id: r.id, file: r.file, name: info.name, size: r.size, kind: kindOf(info.name), mime: RAW_TYPES[e] || MIME[e] || 'application/octet-stream', addedAt: Date.now() };
}
// A document added on another PC may still be on its way here: fetch it from the cloud first.
async function readDoc(file) {
  try { return await invoke('read_document', { file }); }
  catch (e) { if (await cloudEnsureDoc(file)) return await invoke('read_document', { file }); throw e; }
}
// Is the file on this PC (fetching it from the cloud if not)? Asks Rust whether it exists (0.20.3)
// instead of reading the whole file just to find out.
const haveDoc = async file => {
  try {
    const missing = await invoke('missing_documents', { files: [file] });
    if (!missing.includes(file)) return true;
    return await cloudEnsureDoc(file);
  } catch (e) { logWarn('Could not check document ' + file, e); return false; }
};
async function fileBlob(f) {
  const buf = await readDoc(f.file);
  return new Blob([buf], { type: f.mime });
}
async function downloadFile(f) {
  try {
    const ext = extOf(f.name);
    const dest = await saveDialog({ defaultPath: f.name.replace(/\.htm$/i, '.html'), filters: ext ? [{ name: (KINDS[f.kind] || KINDS.other).label, extensions: [ext === 'htm' ? 'html' : ext] }] : [] });
    if (!dest) return;
    await haveDoc(f.file);
    await invoke('export_document', { file: f.file, dest });
    toast('Copy saved', dest);
  } catch (e) { toast.error(`Couldn’t save “${f.name}”`, String(e)); }
}
async function openExternal(f) {
  try { await haveDoc(f.file); await invoke('open_document', { file: f.file }); }
  catch (e) { toast.error(`Couldn’t open “${f.name}”`, 'There may be no app on this computer for this file type.'); }
}
async function deleteDoc(f) { try { await invoke('delete_document', { file: f.file }); } catch (e) { logWarn('Could not delete document ' + f.file, e); } cloudDeleteDoc(f.file); }
const fileInfos = paths => invoke('file_info', { paths });
async function pickFiles() {
  const sel = await openDialog({ multiple: true, filters: [{ name: 'Documents', extensions: ALLOWED }] });
  if (!sel) return [];
  return await fileInfos(Array.isArray(sel) ? sel : [sel]);
}

const FileBadge = ({ kind, className }) => {
  const k = KINDS[kind] || KINDS.other;
  const sized = /(^|\s)h-/.test(className || '');
  return <span className={cn('flex shrink-0 items-center justify-center border font-bold tracking-wide', sized ? '' : 'h-9 w-8 rounded-md text-[9px]', k.cls, className)} aria-hidden="true">{k.short}</span>;
};

function DropZone({ onFiles, compact, busy }) {
  const pick = async () => { const fs = await pickFiles(); if (fs.length) onFiles(fs); };
  return (
    <button type="button" onClick={pick} disabled={busy}
      className={cn('flex w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed bg-muted/30 text-center transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60', compact ? 'px-4 py-5' : 'px-6 py-10')}>
      <I.upload className="text-muted-foreground" />
      <div className="text-sm">
        {busy ? <span className="text-muted-foreground">Adding…</span>
          : <><span className="font-medium underline underline-offset-4">Choose files</span><span className="text-muted-foreground"> or drag them onto this window</span></>}
      </div>
      <div className="text-xs text-muted-foreground">PDF, Word, HTML, Excel and more</div>
    </button>
  );
}

function FileRow({ f, onPreview, onDownload, onRemove }) {
  return (
    <div className="flex items-center gap-3 rounded-md border px-3 py-2 ui-inset">
      <FileBadge kind={f.kind} />
      <button type="button" onClick={() => onPreview(f)} className="min-w-0 flex-1 text-left focus-visible:outline-none group">
        <div className="truncate text-sm font-medium group-hover:underline group-focus-visible:underline underline-offset-4">{f.name}</div>
        <div className="text-xs text-muted-foreground">{fmtSize(f.size)}, added {fmtDay(f.addedAt)}</div>
      </button>
      <Button variant="ghost" size="icon-sm" aria-label={`Save a copy of ${f.name}`} onClick={() => onDownload(f)}><I.download /></Button>
      <Button variant="ghost" size="icon-sm" className={danger} aria-label={`Remove ${f.name}`} onClick={() => onRemove(f)}><I.x /></Button>
    </div>
  );
}

const wrapDoc = body => `<!doctype html><html><head><meta charset="utf-8"><style>body{font:15px/1.65 system-ui,-apple-system,"Segoe UI",sans-serif;color:#18181b;max-width:760px;margin:32px auto;padding:0 24px}img{max-width:100%;height:auto}table{border-collapse:collapse;margin:12px 0}td,th{border:1px solid #e4e4e7;padding:6px 10px;vertical-align:top}h1,h2,h3{line-height:1.25}</style></head><body>${body}</body></html>`;

/* Text inside documents, for search. Pulled from the file on this computer (PDF, Word, HTML, text)
   and cached in this window's IndexedDB by file, so each file is read once. Pages of a PDF are split by \f. */
const DOC_TEXT_MAX = 600000;
const TEXT_KINDS = ['pdf', 'word', 'html', 'text'];
let pdfjsP = null;
const loadPdfjs = () => pdfjsP || (pdfjsP = Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')])
  .then(([m, w]) => { m.GlobalWorkerOptions.workerSrc = w.default; return m; }).catch(e => { pdfjsP = null; throw e; }));
let idbP = null;
const textDb = () => idbP || (idbP = new Promise((res, rej) => { const r = indexedDB.open('tasks-doc-text', 1); r.onupgradeneeded = () => r.result.createObjectStore('t'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }));
const idbGet = async k => { try { const db = await textDb(); return await new Promise(r => { const q = db.transaction('t').objectStore('t').get(k); q.onsuccess = () => r(q.result); q.onerror = () => r(undefined); }); } catch (e) { return undefined; } };
const idbPut = async (k, v) => { try { const db = await textDb(); db.transaction('t', 'readwrite').objectStore('t').put(v, k); } catch (e) { logWarn('Could not store document text', e); } };
async function extractText(f) {
  const blob = await fileBlob(f);
  if (f.kind === 'pdf') {
    const pdfjs = await loadPdfjs();
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()), isEvalSupported: false }).promise;
    const pages = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const c = await (await pdf.getPage(i)).getTextContent();
      pages.push(c.items.map(it => it.str + (it.hasEOL ? '\n' : '')).join(''));
      if (pages.join('').length > DOC_TEXT_MAX) break;
    }
    pdf.destroy();
    return pages.join('\f');
  }
  if (f.kind === 'word') { const m = await loadMammoth(); return (await m.extractRawText({ arrayBuffer: await blob.arrayBuffer() })).value; }
  const t = await blob.text();
  if (f.kind === 'html') { const d = new DOMParser().parseFromString(t, 'text/html'); d.querySelectorAll('script,style').forEach(e => e.remove()); d.querySelectorAll('p,div,li,h1,h2,h3,h4,h5,h6,tr,td,th,br,section,article,blockquote,pre').forEach(e => e.append('\n')); return d.body ? d.body.textContent.replace(/\n\s*\n+/g, '\n') : ''; }
  return t;
}
const textMem = new Map();
async function docText(f) {
  if (!f || !TEXT_KINDS.includes(f.kind)) return '';
  if (textMem.has(f.file)) return textMem.get(f.file);
  let t = await idbGet(f.file);
  if (typeof t !== 'string') { try { t = (await extractText(f)).slice(0, DOC_TEXT_MAX); } catch (e) { t = ''; } idbPut(f.file, t); }
  textMem.set(f.file, t);
  return t;
}
// Reads the text of every document in the background, one at a time; returns { [file]: text }.
function useDocTexts(docs) {
  const [texts, setTexts] = useState(() => Object.fromEntries(docs.filter(d => textMem.has(d.file)).map(d => [d.file, textMem.get(d.file)])));
  const key = docs.map(d => d.file).join('|');
  useEffect(() => {
    let dead = false;
    (async () => {
      for (const d of docs) {
        if (dead) return;
        if (!TEXT_KINDS.includes(d.kind) || texts[d.file] != null) continue;
        const t = await docText(d);
        if (!dead) setTexts(x => ({ ...x, [d.file]: t }));
      }
    })();
    return () => { dead = true; };
  }, [key]);
  return texts;
}
const countHits = (text, q) => { if (!text || !q) return 0; const t = text.toLowerCase(), n = q.toLowerCase(); let c = 0, i = t.indexOf(n); while (i >= 0 && c < 999) { c++; i = t.indexOf(n, i + n.length); } return c; };
// Every match in order (up to 60), each with its line and page (PDF pages are split by \f).
const snippetsAll = (text, q) => {
  const out = [], l = text.toLowerCase(), n = q.toLowerCase(), clean = x => x.replace(/\s+/g, ' ');
  let i = l.indexOf(n), page = 1, last = 0;
  while (i >= 0 && out.length < 60) {
    for (let k = text.indexOf('\f', last); k >= 0 && k < i; k = text.indexOf('\f', k + 1)) { page++; last = k + 1; }
    const a = Math.max(0, i - 40), b = Math.min(text.length, i + n.length + 60), lead = clean(text.slice(a, i)).trimStart();
    out.push({ page, pre: a > 0 ? '…' + lead.replace(/^\S*\s/, '') : lead, hit: text.slice(i, i + n.length), post: clean(text.slice(i + n.length, b)) + (b < text.length ? '…' : '') });
    i = l.indexOf(n, i + n.length);
  }
  return out;
};
const pageOfHits = (text, q) => { const pages = text.split('\f'), out = [], n = q.toLowerCase(); pages.forEach((p, pi) => { const c = countHits(p, n); for (let k = 0; k < c; k++) out.push(pi + 1); }); return out; };
// Highlights q inside an iframe's document (same origin, no scripts) and returns the marks in order.
function markFrame(doc, q) {
  if (!doc || !doc.body) return [];
  doc.querySelectorAll('mark[data-find]').forEach(m => { const t = doc.createTextNode(m.textContent); m.replaceWith(t); t.parentNode && t.parentNode.normalize(); });
  if (!q) return [];
  if (!doc.getElementById('find-style')) { const st = doc.createElement('style'); st.id = 'find-style'; st.textContent = 'mark[data-find]{background:#fde047;color:inherit;border-radius:2px}mark[data-find].cur{background:#f97316;color:#fff}'; doc.head.appendChild(st); }
  const n = q.toLowerCase(), marks = [];
  const walk = doc.createTreeWalker(doc.body, 4, { acceptNode: x => x.parentNode && /^(SCRIPT|STYLE)$/.test(x.parentNode.nodeName) ? 2 : 1 });
  const nodes = []; while (walk.nextNode()) nodes.push(walk.currentNode);
  nodes.forEach(node => {
    let t = node.nodeValue, i = t.toLowerCase().indexOf(n);
    while (i >= 0) {
      const hit = node.splitText(i); const after = hit.splitText(q.length);
      const m = doc.createElement('mark'); m.setAttribute('data-find', ''); hit.replaceWith(m); m.appendChild(hit); marks.push(m);
      node = after; t = node.nodeValue; i = t.toLowerCase().indexOf(n);
    }
  });
  return marks;
}
const HL = ({ text, q }) => { if (!q) return text; const out = []; const n = q.toLowerCase(), l = text.toLowerCase(); let i = 0, j = l.indexOf(n), k = 0; while (j >= 0) { out.push(text.slice(i, j), <mark key={k++} data-find="" className="rounded-sm bg-yellow-300 text-zinc-900">{text.slice(j, j + q.length)}</mark>); i = j + q.length; j = l.indexOf(n, i); } out.push(text.slice(i)); return out; };

function useDocPreview(file) {
  const [st, setSt] = useState(null);
  useEffect(() => {
    if (!file) { setSt(null); return; }
    let dead = false, url = null;
    setSt({ loading: true });
    (async () => {
      try {
        if (file.kind === 'pdf' || file.kind === 'image') {
          url = URL.createObjectURL(await fileBlob(file));
          if (!dead) setSt(file.kind === 'pdf' ? { pdf: url } : { img: url });
          return;
        }
        if (file.kind === 'html') { const t = await (await fileBlob(file)).text(); if (!dead) setSt({ html: t }); return; }
        if (file.kind === 'text' || extOf(file.name) === 'csv') { const t = await (await fileBlob(file)).text(); if (!dead) setSt({ text: t }); return; }
        if (file.kind === 'word') {
          const [m, b] = await Promise.all([loadMammoth(), fileBlob(file)]);
          const r = await m.convertToHtml({ arrayBuffer: await b.arrayBuffer() });
          if (!dead) setSt({ html: wrapDoc(r.value) });
          return;
        }
        if (!dead) setSt({ none: true });
      } catch (e) { if (!dead) setSt({ error: true }); }
    })();
    return () => { dead = true; if (url) URL.revokeObjectURL(url); };
  }, [file && file.id]);
  return st;
}
function DocPreview({ file, className, find, findIdx = 0, onFindCount }) {
  const st = useDocPreview(file);
  const frame = useRef(null), marks = useRef([]), pdfHits = useRef([]);
  const [frameReady, setFrameReady] = useState(0);
  const fq = (find || '').trim();
  // Highlight matches in HTML and Word previews; PDFs jump to the page of the match.
  useEffect(() => {
    if (!st) return;
    if (st.html) { marks.current = markFrame(frame.current && frame.current.contentDocument, fq.length > 1 ? fq : ''); onFindCount && onFindCount(marks.current.length, null); }
    else if (st.pdf) { if (fq.length < 2) { pdfHits.current = []; onFindCount && onFindCount(0, null); return; } let dead = false; docText(file).then(t => { if (dead) return; pdfHits.current = pageOfHits(t, fq); onFindCount && onFindCount(pdfHits.current.length, pdfHits.current); }); return () => { dead = true; }; }
    else if (st.text != null) { const c = fq.length > 1 ? countHits(st.text, fq) : 0; onFindCount && onFindCount(c, null); }
  }, [st, fq, frameReady]);
  useEffect(() => {
    if (st && st.html) { marks.current.forEach((m, i) => m.classList.toggle('cur', i === findIdx)); const m = marks.current[findIdx]; if (m) { const w = m.ownerDocument.defaultView; w.scrollBy(0, m.getBoundingClientRect().top - w.innerHeight / 2); } }
    if (st && st.text != null && frame.current) { const ms = frame.current.querySelectorAll('mark[data-find]'); ms.forEach((m, i) => { m.classList.toggle('!bg-orange-500', i === findIdx); m.classList.toggle('!text-white', i === findIdx); }); const m = ms[findIdx]; if (m) { const pre = frame.current; pre.scrollTop += m.getBoundingClientRect().top - pre.getBoundingClientRect().top - pre.clientHeight / 2; } }
  }, [findIdx, st, fq, frameReady]);
  const pdfPage = st && st.pdf && fq.length > 1 && pdfHits.current[findIdx];
  const msg = t => <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">{t}</div>;
  return (
    <div className={cn('overflow-hidden rounded-md border bg-muted/30 ui-inset', className)}>
      {!file ? msg('Select a document to preview it.')
        : !st || st.loading ? msg('Loading preview…')
        : st.error ? msg('Couldn’t show a preview of this file. Use “Open in its app” instead.')
        : st.none ? msg('There’s no preview for this file type. Use “Open in its app” to view it.')
        : st.pdf ? <iframe key={pdfPage || 0} title={file.name} src={pdfPage ? `${st.pdf}#page=${pdfPage}` : st.pdf} className="h-full w-full bg-white" />
        : st.img ? <img src={st.img} alt={file.name} className="h-full w-full object-contain" />
        : st.html ? <iframe ref={frame} title={file.name} sandbox="allow-same-origin" srcDoc={st.html} onLoad={() => setFrameReady(n => n + 1)} className="h-full w-full bg-white" />
        : st.text != null ? <pre ref={frame} className="h-full overflow-auto whitespace-pre-wrap p-4 font-mono text-xs"><HL text={st.text} q={fq.length > 1 ? fq : ''} /></pre>
        : null}
    </div>
  );
}
function PreviewDialog({ file, onClose, onDownload }) {
  if (!file) return null;
  return (
    <Dialog open={!!file} onClose={onClose} className="max-w-4xl" title={file.name}
      description={`${(KINDS[file.kind] || KINDS.other).label}, ${fmtSize(file.size)}`}
      footer={<>
        <Button variant="outline" onClick={() => onDownload(file)}><I.download />Save a copy</Button>
        <Button onClick={() => openExternal(file)}>Open in its app</Button>
      </>}>
      <DocPreview file={file} className="h-[60vh]" />
    </Dialog>
  );
}

function AddDocsDialog({ open, files, setFiles, tasks, projects, busy, onClose, onSubmit, library = [] }) {
  const [target, setTarget] = useState('__none');
  const [asVersion, setAsVersion] = useState({});
  const [project, setProject] = useState('');
  const openTasks = tasks.filter(t => t.status !== 'done').sort((a, b) => b.createdAt - a.createdAt);
  const doneTasks = tasks.filter(t => t.status === 'done').sort((a, b) => b.createdAt - a.createdAt);
  const n = files.length;
  return (
    <Dialog open={open} onClose={onClose} title="Add documents"
      description="Add files to Documents, and link them to a task if you like. You can drag files straight from WhatsApp or File Explorer onto this window."
      footer={<>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button disabled={!n || busy} onClick={() => onSubmit(files, { target, project, versions: Object.fromEntries(files.map((f, i) => { const m = findVersionTarget(f.name, library); return [i, m && asVersion[i] !== false ? m.id : null]; })) })}>{busy ? 'Uploading…' : n ? `Add ${n} ${n === 1 ? 'file' : 'files'}` : 'Add files'}</Button>
      </>}>
      <div className="grid gap-4">
        <DropZone compact onFiles={fs => setFiles(p => [...p, ...fs])} />
        {n > 0 && (
          <div className="grid gap-1.5">
            {files.map((f, i) => (
              <div key={i} className="flex flex-wrap items-center gap-3 rounded-md border px-3 py-1.5 ui-inset">
                <FileBadge kind={kindOf(f.name)} className="h-8 w-7" />
                <span className="min-w-0 flex-1 truncate text-sm">{f.name}</span>
                {(() => { const m = findVersionTarget(f.name, library); return m ? (
                  <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Checkbox checked={asVersion[i] !== false} onChange={v => setAsVersion(x => ({ ...x, [i]: v }))} label={`New version of ${m.name}`} />New version of “{m.name}”
                  </label>) : null; })()}
                <span className="text-xs text-muted-foreground tnum">{fmtSize(f.size)}</span>
                <Button variant="ghost" size="icon-sm" className="h-7 w-7" aria-label={`Remove ${f.name}`} onClick={() => setFiles(p => p.filter((_, j) => j !== i))}><I.x /></Button>
              </div>
            ))}
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Attach to" htmlFor="ad-target">
            <Select id="ad-target" value={target} onChange={setTarget} options={[
              { value: '__none', label: 'No task, just add to Documents', icon: <I.file className="size-3.5 text-muted-foreground" /> },
              ...openTasks.map(t => ({ value: t.id, label: t.title || 'Untitled', group: 'Open tasks' })),
              ...doneTasks.map(t => ({ value: t.id, label: t.title || 'Untitled', group: 'Complete' })),
            ]} />
          </Field>
          {false && (
            <Field label="Project" htmlFor="ad-project">
              <Select id="ad-project" value={project} onChange={setProject} options={[
                { value: '', label: 'No project', node: <span className="text-muted-foreground">No project</span> },
                ...projects.map(p => ({ value: p, label: p, icon: <PIcon name={p} className="size-3.5 text-muted-foreground" /> })),
              ]} />
            </Field>
          )}
        </div>
      </div>
    </Dialog>
  );
}

// "Spec v3.pdf", "Spec (1).pdf" and "Spec final.pdf" all count as versions of "Spec.pdf".
const docBase = name => { const ext = extOf(name); return ext + ':' + norm((name || '').replace(/\.[^.]+$/, '').replace(/([\s_-]*(v\d+|version\s*\d+|\(\d+\)|final|copy))+$/i, '')); };
const findVersionTarget = (name, docs, skipId) => docs.find(d => d.id !== skipId && !d.inbox && docBase(d.name) === docBase(name));
const versionCount = d => (d.versions || []).length + 1;

// Every document has a status. Documents saved before 0.15 read as Draft.
const DOC_STATUSES = [
  { id: 'draft', label: 'Draft', dot: 'bg-slate-400', key: '1' },
  { id: 'review', label: 'In review', dot: 'bg-amber-500', key: '2' },
  { id: 'approved', label: 'Approved', dot: 'bg-emerald-500', key: '3' },
  { id: 'outdated', label: 'Outdated', dot: 'bg-zinc-500', key: '4' },
];
const DSt = Object.fromEntries(DOC_STATUSES.map(s => [s.id, s]));
const docStatus = d => (d && DSt[d.status] ? d.status : 'draft');
const DocStatusPill = ({ status, className }) => (
  <span className={cn('inline-flex min-w-0 items-center gap-1.5', className)}><span className={cn('size-1.5 shrink-0 rounded-full', DSt[status].dot)} /><span className="truncate">{DSt[status].label}</span></span>
);
function DocStatusPicker({ doc, onSetStatus, compact, quiet }) {
  const st = docStatus(doc);
  return (
    <DropdownMenu align="start"
      trigger={p => <button {...p} type="button" title="Status (1–4)" className={cn('inline-flex shrink-0 items-center gap-1 rounded-md border hover:text-foreground', quiet ? 'group/st h-6 max-w-full px-1.5 text-xs text-muted-foreground ui-quiet' : 'text-muted-foreground ui-fill', !quiet && (compact ? 'h-5 px-1.5 text-[11px]' : 'h-6 px-2 text-xs'))}><DocStatusPill status={st} className={quiet && st === 'approved' ? 'font-medium text-emerald-700 dark:text-emerald-400' : undefined} /><I.down className={cn('size-3', quiet && 'opacity-0 group-hover/st:opacity-100')} /></button>}
      items={DOC_STATUSES.map(s => ({ label: s.label, icon: <span className={cn('mx-1 size-2 rounded-full', s.dot)} />, shortcut: s.key + (s.id === st ? ' ✓' : ''), onSelect: () => onSetStatus(doc, s.id) }))} />
  );
}

// Merge documents into versions: pick files, drag them into order (oldest at the top, the last row is the latest),
// then they become one document with a version history.
function MergeDocsDialog({ doc, docs, onClose, onMerge }) {
  const [q, setQ] = useState('');
  const [order, setOrder] = useState([]);
  const [drag, setDrag] = useState(null); // { id, over }
  const listRef = useRef(null);
  useEffect(() => { setQ(''); setOrder(doc ? [doc.id] : []); setDrag(null); }, [doc && doc.id]);
  if (!doc) return null;
  const byId = Object.fromEntries(docs.map(d => [d.id, d]));
  const nq = norm(q);
  const base = docBase(doc.name).split(':')[1];
  const similar = d => { const b = docBase(d.name).split(':')[1]; return b === base || (base.length > 3 && (b.includes(base) || base.includes(b))); };
  const cands = docs.filter(d => d.id !== doc.id && (!nq || norm(d.name).includes(nq)))
    .sort((a, b) => (similar(b) - similar(a)) || b.addedAt - a.addedAt);
  const sugg = nq ? [] : cands.filter(similar);
  const others = nq ? cands : cands.filter(d => !similar(d));
  const picked = order.map(id => byId[id]).filter(Boolean);
  // A newly picked file goes in by date; files already placed keep the order you dragged them into.
  const toggle = d => setOrder(o => { if (o.includes(d.id)) return o.filter(x => x !== d.id); const k = o.findIndex(x => byId[x].addedAt > d.addedAt); const n = [...o]; n.splice(k < 0 ? n.length : k, 0, d.id); return n; });
  const sortByDate = () => setOrder(o => [...o].sort((a, b) => byId[a].addedAt - byId[b].addedAt));
  const shift = (id, dir) => setOrder(o => { const i = o.indexOf(id), j = i + dir; if (j < 0 || j >= o.length) return o; const n = [...o]; [n[i], n[j]] = [n[j], n[i]]; return n; });
  // Pointer drag (the window's own file drop handling turns off HTML drag and drop).
  const startDrag = (e, id) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const rows = () => [...listRef.current.querySelectorAll('[data-ord]')];
    const overAt = y => { const rs = rows(); let k = rs.length; for (let i = 0; i < rs.length; i++) { const r = rs[i].getBoundingClientRect(); if (y < r.top + r.height / 2) { k = i; break; } } return k; };
    setDrag({ id, over: order.indexOf(id) });
    const mv = ev => setDrag({ id, over: overAt(ev.clientY) });
    const up = ev => {
      window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); document.body.style.cursor = '';
      const k = overAt(ev.clientY);
      setOrder(o => { const n = o.filter(x => x !== id); const from = o.indexOf(id); n.splice(k > from ? k - 1 : k, 0, id); return n; });
      setDrag(null);
    };
    document.body.style.cursor = 'grabbing';
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
  };
  const latest = picked[picked.length - 1];
  const candRow = d => (
    <label key={d.id} className="flex cursor-default items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-muted/50">
      <Checkbox checked={order.includes(d.id)} onChange={() => toggle(d)} label={d.name} />
      <FileBadge kind={d.kind} className="h-5 w-5 rounded text-[6px]" />
      <span className="min-w-0 flex-1 truncate text-[13px]">{d.name}</span>
      {(d.versions || []).length > 0 && <span className="shrink-0 rounded border px-1 text-[10px] text-muted-foreground ui-fill">v{versionCount(d)}</span>}
      <span className="shrink-0 text-[11px] text-muted-foreground">{fmtDay(d.addedAt)}</span>
    </label>
  );
  return (
    <Dialog open onClose={onClose} title="Merge documents into versions" className="max-w-3xl"
      description={`The files you pick become versions of “${doc.name}”. Its status stays, and their task links move over. The files stay in their folders.`}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={picked.length < 2} onClick={() => onMerge(doc, order)}>{picked.length < 2 ? 'Pick at least one more file' : `Merge ${picked.length} files into versions`}</Button></>}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex min-h-0 flex-col gap-2">
          <PageSearch value={q} onChange={setQ} placeholder="Search documents" />
          <div className="max-h-80 min-h-[12rem] overflow-y-auto rounded-md border p-1 ui-inset">
            {sugg.length > 0 && <div className="px-2 pb-1 pt-1.5 text-[11px] font-medium text-muted-foreground">Similar names</div>}
            {sugg.map(candRow)}
            {sugg.length > 0 && others.length > 0 && <div className="px-2 pb-1 pt-3 text-[11px] font-medium text-muted-foreground">Other documents</div>}
            {others.map(candRow)}
            {cands.length === 0 && <div className="p-3 text-sm text-muted-foreground">No other documents match.</div>}
          </div>
        </div>
        <div className="flex min-h-0 flex-col gap-2">
          <div className="flex h-8 items-center justify-between">
            <span className="text-xs font-medium">Version order <span className="font-normal text-muted-foreground">· drag to rearrange</span></span>
            <button type="button" onClick={sortByDate} className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">Sort by date</button>
          </div>
          <div ref={listRef} className="relative max-h-80 overflow-y-auto rounded-md border p-1 ui-inset">
            {picked.map((d, i) => (
              <div key={d.id}>
                {drag && drag.over === i && drag.id !== d.id && <div className="mx-1 h-0.5 rounded bg-primary" />}
                <div data-ord={d.id} tabIndex={0}
                  onKeyDown={e => { if (e.altKey && e.key === 'ArrowUp') { e.preventDefault(); shift(d.id, -1); setTimeout(() => e.target.focus(), 0); } if (e.altKey && e.key === 'ArrowDown') { e.preventDefault(); shift(d.id, 1); setTimeout(() => e.target.focus(), 0); } }}
                  className={cn('flex select-none items-center gap-2 rounded-md px-1.5 py-1.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring', drag && drag.id === d.id ? 'bg-muted opacity-60' : 'hover:bg-muted/50', i === picked.length - 1 && 'bg-primary/5')}>
                  <button type="button" aria-label={`Drag ${d.name}`} title="Drag to reorder (Alt+↑/↓)" onPointerDown={e => startDrag(e, d.id)} className="flex h-6 w-5 cursor-grab items-center justify-center text-muted-foreground hover:text-foreground"><I.grip className="size-3.5" /></button>
                  <span className="w-6 shrink-0 text-[11px] font-medium text-muted-foreground tnum">v{picked.slice(0, i).reduce((n, x) => n + versionCount(x), 0) + versionCount(d)}</span>
                  <FileBadge kind={d.kind} className="h-5 w-5 rounded text-[6px]" />
                  <span className="min-w-0 flex-1"><span className="block truncate text-[13px]">{d.name}</span><span className="block text-[11px] text-muted-foreground">{fmtDay(d.addedAt)}, {fmtSize(d.size)}{d.links.length ? `, ${d.links.length} ${d.links.length === 1 ? 'task' : 'tasks'}` : ''}</span></span>
                  {i === picked.length - 1 && <span className="shrink-0 rounded-full bg-primary px-1.5 text-[10px] font-medium text-primary-foreground">Latest</span>}
                  {d.id !== doc.id && <button type="button" aria-label={`Remove ${d.name}`} onClick={() => toggle(d)} className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"><I.x className="size-3" /></button>}
                </div>
              </div>
            ))}
            {drag && drag.over >= picked.length && <div className="mx-1 h-0.5 rounded bg-primary" />}
          </div>
          <p className="text-[11px] text-muted-foreground">The oldest is at the top. {latest ? `“${latest.name}” will show as the current version.` : ''}</p>
        </div>
      </div>
    </Dialog>
  );
}

const DOC_FILTERS = [{ value: 'all', label: 'All' }, { value: 'pdf', label: 'PDF' }, { value: 'word', label: 'Word' }, { value: 'html', label: 'HTML' }, { value: 'other', label: 'Other' }];

// Clean titles (0.20.2): "68-kaufes-sow-item-verification-EN.pdf" shows as "SOW · Item Verification".
// Only the label changes; the file name is untouched, shows in the tooltip and in the details panel, and is what search and sync use.
const DOC_ACRONYMS = new Set(['sow', 'srs', 'api', 'faq', 'ui', 'ux', 'sla', 'nda', 'kpi', 'qa', 'vat', 'gdpr', 'b2b', 'b2c', 'crm', 'erp', 'sdk', 'mvp', 'prd', 'rfp', 'hr', 'pdf', 'html', 'csv', 'iban', 'ios']);
const DOC_SMALL = new Set(['and', 'or', 'of', 'for', 'the', 'a', 'an', 'to', 'in', 'on', 'at', 'by', 'with', 'vs', 'via', 'per']);
const docWords = name => {
  const s = (name || '').replace(/\.[^.]+$/, '').replace(/^\s*\d+[\s._-]+(?=\D)/, '');
  // Spaces or underscores separate words when the name has them; then hyphens stay part of a word ("Post-Purchase").
  const sep = /[\s_]/.test(s) ? /[\s_]+/ : /[\s_-]+/;
  return s.split(sep).filter(w => w && !/^[-–·.]+$/.test(w));
};
// The word most file names start with (often the client or project name), stripped when it is on at least 40% of them.
const docCommonPrefix = docs => {
  const n = {};
  docs.forEach(d => { const w = norm(docWords(d.name)[0]); if (w && !DOC_ACRONYMS.has(w) && /[a-z]/.test(w)) n[w] = (n[w] || 0) + 1; });
  const [w, c] = Object.entries(n).sort((a, b) => b[1] - a[1])[0] || [];
  return w && c >= 3 && c >= docs.length * 0.4 ? w : '';
};
const docTitle = (name, prefix) => {
  let w = docWords(name);
  if (prefix && w.length > 1 && norm(w[0]) === prefix) w = w.slice(1);
  const tail = x => /^(en|de|fr|it|es|nl|pt|ur|ar)$/i.test(x) || /^v\d+([.,]\d+)*$/i.test(x) || /^(final|copy|\(\d+\))$/i.test(x) || /^\d{1,2}$/.test(x);
  while (w.length > 1 && tail(w[w.length - 1])) w.pop();
  if (!w.length) return (name || '').replace(/\.[^.]+$/, '');
  const fix = (x, i) => {
    const l = x.toLowerCase();
    if (DOC_ACRONYMS.has(l)) return x.toUpperCase();
    if (/[A-Z]/.test(x.slice(1)) || /[A-Z]/.test(x[0])) return x;
    if (i > 0 && DOC_SMALL.has(l)) return l;
    return x.split('-').map(p => p ? p[0].toUpperCase() + p.slice(1) : p).join('-');
  };
  const out = w.map(fix);
  if (out.length > 1 && DOC_ACRONYMS.has(out[0].toLowerCase())) return out[0] + ' · ' + out.slice(1).join(' ');
  return out.join(' ');
};
// The order groups show in, in the library and in the reader's list.
const DOC_GROUP_ORDER = ['approved', 'review', 'draft', 'outdated'];
const readPref = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } };
const writePref = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

function DocumentsView({ onRefresh, hasWatch, docs, tasks, onAdd, onDownload, onRemove, onDelete, onOpenTask, onAttach, onAddVersion, onUploadVersion, onMakeCurrent, onSetStatus, onSeen, onMerge, dragOver, focusId }) {
  const [q, setQ] = useState('');
  const texts = useDocTexts(docs);
  const [findOpen, setFindOpen] = useState(false), [findQ, setFindQ] = useState(''), [findIdx, setFindIdx] = useState(0), [findN, setFindN] = useState(0), [findPages, setFindPages] = useState(null);
  const findIn = useRef(null);
  const [kind, setKind] = useState('all');
  const [stF, setStF] = useState('all');
  const [sort, setSort] = useState('new');
  const [selKey, setSelKey] = useState(null);
  const [viewVer, setViewVer] = useState(null); // an older version being previewed
  const [spin, setSpin] = useState(false);
  // 0.20.2: the page opens as a library table; clicking a document opens it in the reader. These are view settings on this PC only.
  const [mode, setMode] = useState('table');
  const [shut, setShutRaw] = useState(() => readPref('taskit.docs.shut', {}));
  const setShut = id => setShutRaw(s => { const n = { ...s, [id]: !s[id] }; writePref('taskit.docs.shut', n); return n; });
  const [details, setDetailsRaw] = useState(() => readPref('taskit.docs.details', false));
  const setDetails = v => { setDetailsRaw(v); writePref('taskit.docs.details', v); };
  const [railed, setRailedRaw] = useState(() => readPref('taskit.docs.rail', false));
  const setRailed = v => { setRailedRaw(v); writePref('taskit.docs.rail', v); };
  const wrap = useRef(null), listRef = useRef(null), tableRef = useRef(null);
  const [height, setHeight] = useState(600);
  // The page fits the window: the preview stretches to the bottom edge.
  useLayoutEffect(() => {
    const fit = () => { if (wrap.current) setHeight(Math.max(420, window.innerHeight - wrap.current.getBoundingClientRect().top - 20)); };
    fit(); window.addEventListener('resize', fit); return () => window.removeEventListener('resize', fit);
  }, []);
  useEffect(() => { if (focusId) { setSelKey(focusId); setMode('reader'); } }, [focusId]);
  const prefix = useMemo(() => docCommonPrefix(docs), [docs]);
  const titleOf = d => docTitle(d.name, prefix);
  const nq = norm(q);
  const isOther = d => !['pdf', 'word', 'html'].includes(d.kind);
  const counts = { all: docs.length, pdf: docs.filter(d => d.kind === 'pdf').length, word: docs.filter(d => d.kind === 'word').length, html: docs.filter(d => d.kind === 'html').length, other: docs.filter(isOther).length };
  // File type tabs only show when there is more than one type.
  const mixed = ['pdf', 'word', 'html', 'other'].filter(k => counts[k] > 0).length > 1;
  useEffect(() => { if (!mixed && kind !== 'all') setKind('all'); }, [mixed]);
  const sorter = { new: (a, b) => b.addedAt - a.addedAt, name: (a, b) => titleOf(a).localeCompare(titleOf(b)), size: (a, b) => b.size - a.size }[sort];
  // Search also looks inside documents (2+ letters). hits: how many times the text appears in the file.
  const tq = q.trim().length > 1 ? q.trim() : '';
  const inText = d => !!tq && countHits(texts[d.file], tq) > 0;
  const indexing = docs.some(d => TEXT_KINDS.includes(d.kind) && texts[d.file] == null);
  const nameFields = d => [d.name, titleOf(d), ...d.links.map(l => l.task.title), ...d.links.map(l => l.task.bucket)];
  const filt = d => (kind === 'all' || (kind === 'other' ? isOther(d) : d.kind === kind)) && (stF === 'all' || docStatus(d) === stF);
  const match = d => filt(d) && (!nq || inText(d) || nameFields(d).some(v => norm(v).includes(nq)));
  const inbox = docs.filter(d => d.inbox && match(d)).sort((a, b) => b.addedAt - a.addedAt);
  // Not searching: the documents are grouped by status (Approved, In review, Draft, Outdated). Each group folds away.
  const groups = DOC_GROUP_ORDER.map(id => ({ id, label: DSt[id].label, dot: DSt[id].dot, docs: docs.filter(d => !d.inbox && match(d) && docStatus(d) === id).sort(sorter) })).filter(g => g.docs.length);
  // While searching, results come in two groups: names (and linked tasks) and text inside documents.
  const nameHit = d => !!tq && nameFields(d).some(v => norm(v).includes(nq));
  const byName = tq ? docs.filter(d => filt(d) && nameHit(d)).sort(sorter) : [];
  const byText = tq ? docs.filter(d => filt(d) && inText(d)).sort((a, b) => countHits(texts[b.file], tq) - countHits(texts[a.file], tq) || sorter(a, b)) : [];
  const textTotal = byText.reduce((n, d) => n + countHits(texts[d.file], tq), 0);
  const [moreOf, setMoreOf] = useState({});
  const flat = tq ? [...byName, ...byText.filter(d => !byName.includes(d))] : [...(shut.inbox ? [] : inbox), ...groups.flatMap(g => shut[g.id] ? [] : g.docs)];
  const sel = docs.find(d => d.id === selKey && flat.includes(d)) || flat[0] || null;
  const pendingIdx = useRef(null);
  useEffect(() => { setViewVer(null); setFindIdx(pendingIdx.current ?? 0); pendingIdx.current = null; }, [sel && sel.id]);
  const jumpTo = (d, i) => { if (sel && sel.id === d.id) { setFindOpen(true); setFindQ(tq); setFindIdx(i); } else { pendingIdx.current = i; pick(d); } };
  useEffect(() => { setFindQ(tq); setFindOpen(!!tq); setFindIdx(0); }, [tq]);
  const [focusTick, setFocusTick] = useState(0);
  useLayoutEffect(() => { if (focusTick && findIn.current) { findIn.current.focus(); findIn.current.select(); } }, [focusTick]);
  const openFind = () => { setFindOpen(true); setFocusTick(n => n + 1); };
  const stepFind = dir => setFindIdx(i => findN ? (i + dir + findN) % findN : 0);
  useEffect(() => {
    const k = e => { if (mode === 'reader' && (e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'f' && sel) { e.preventDefault(); e.stopPropagation(); openFind(); } };
    window.addEventListener('keydown', k, true); return () => window.removeEventListener('keydown', k, true);
  }, [sel && sel.id, mode]);
  // Esc in the reader goes back to the library (unless a menu, dialog or the find bar has it).
  useEffect(() => {
    if (mode !== 'reader') return;
    const k = e => {
      if (e.key !== 'Escape' || e.defaultPrevented || e.ctrlKey || e.altKey || e.metaKey) return;
      if (document.querySelector('[role=dialog],[role=menu],[role=listbox][data-open]')) return;
      const t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      setMode('table');
    };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [mode]);
  // Back in the library, the document you were reading stays highlighted and in view.
  useEffect(() => { if (mode === 'table' && sel && tableRef.current) { const el = tableRef.current.querySelector(`[data-doc="${sel.id}"]`); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' }); } }, [mode]);
  const total = docs.reduce((n, d) => n + (d.size || 0), 0);
  const move = (dir, box) => { const i = flat.findIndex(d => sel && d.id === sel.id); const n = flat[Math.min(flat.length - 1, Math.max(0, i + dir))]; if (n) { setSelKey(n.id); const el = box && box.querySelector(`[data-doc="${n.id}"],[data-doc-in="${n.id}"]`); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' }); } };
  // Clicking a new document marks it as seen: it leaves the Inbox and stays selected.
  const viewerRef = useRef(null);
  const pick = (d, focusViewer) => { setSelKey(d.id); if (d.inbox) onSeen(d); if (focusViewer && viewerRef.current) viewerRef.current.focus(); };
  const open = d => { pick(d); setMode('reader'); };
  const shownFile = sel && viewVer ? { ...sel, ...viewVer, id: sel.id + '@' + viewVer.file } : sel;
  const listKeys = box => e => {
    if (e.target !== e.currentTarget) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1, box()); }
    if (e.key === 'ArrowUp') { e.preventDefault(); move(-1, box()); }
    if (e.key === 'Enter' && sel) { e.preventDefault(); if (mode === 'table') open(sel); else pick(sel, true); }
    const ds = DOC_STATUSES.find(s => s.key === e.key); if (ds && sel && !e.ctrlKey && !e.altKey && !e.metaKey) { e.preventDefault(); onSetStatus(sel, ds.id); }
    if (e.key === 'U' && e.shiftKey && sel) { e.preventDefault(); onMerge(sel); }
  };
  const verChip = d => (d.versions || []).length > 0 && <span className="shrink-0 rounded px-1 font-mono text-[10px] text-muted-foreground ui-fill">v{versionCount(d)}</span>;
  const inboxActs = (d, target) => (
    <>
      {target && <button type="button" title={`Add as v${versionCount(target) + 1} of ${titleOf(target)}`} onClick={e => { e.stopPropagation(); onAddVersion(target, d); }} className="flex h-6 items-center rounded px-1.5 text-[11px] ui-fill">New version</button>}
      <button type="button" title="Link to a task" aria-label={`Link ${d.name} to a task`} onClick={e => { e.stopPropagation(); onAttach(d); }} className="flex size-6 items-center justify-center rounded text-muted-foreground hover:text-foreground ui-quiet"><I.paperclip className="size-3.5" /></button>
      <button type="button" title="Dismiss" aria-label={`Dismiss ${d.name}`} onClick={e => { e.stopPropagation(); onDelete(d, true); }} className={cn('flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10', danger)}><I.x className="size-3.5" /></button>
    </>
  );
  const groupHead = (id, label, count, dot, badge) => (
    <button type="button" onClick={() => setShut(id)} aria-expanded={!shut[id]}
      className="flex min-w-0 items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[.05em] text-muted-foreground hover:text-foreground">
      <I.down className={cn('size-3 shrink-0 transition-transform', shut[id] && '-rotate-90')} />
      {dot && <span className={cn('size-1.5 shrink-0 rounded-full', dot)} />}
      <span className="truncate">{label}</span>
      {badge ? <span className="rounded-full bg-blue-500 px-1.5 text-[10px] font-medium normal-case tracking-normal text-white">{count} new</span> : <span className="tnum font-mono font-normal tracking-normal">{count}</span>}
    </button>
  );

  /* ---------- Library table ---------- */
  const linkCell = d => {
    if (!d.links.length) return <span className="text-xs text-muted-foreground/70">None</span>;
    const l = d.links[0];
    return (
      <span className="flex min-w-0 items-center gap-1.5" title={d.links.length > 1 ? d.links.map(x => x.task.title || 'Untitled').join(', ') : undefined}>
        <button type="button" onClick={e => { e.stopPropagation(); onOpenTask(l.task.id, l.archived); }} className="inline-flex h-6 min-w-0 items-center gap-1.5 rounded-md px-2 text-xs font-medium ui-fill">
          <span className={cn('size-1.5 shrink-0 rounded-full', (S[l.task.status] || S.todo).dot)} /><span className="truncate">{l.task.title || 'Untitled'}{l.archived ? ' (archived)' : ''}</span>
        </button>
        {d.links.length > 1 && <span className="tnum shrink-0 font-mono text-[11px] text-muted-foreground">+{d.links.length - 1}</span>}
      </span>
    );
  };
  const tRow = (d, hits) => {
    const on = sel && sel.id === d.id;
    const target = d.inbox ? findVersionTarget(d.name, docs, d.id) : null;
    return (
      <div key={(hits != null ? 't-' : '') + d.id} data-doc={hits != null ? undefined : d.id} role="option" aria-selected={on} onClick={() => open(d)}
        className={cn('dg-row dg-body group cursor-default text-[13px]', on ? 'bg-muted/70' : 'hover:bg-muted/50')}>
        <div className="pl-2.5">
          {d.inbox && <span className="size-1.5 shrink-0 rounded-full bg-blue-500" />}
          <FileBadge kind={d.kind} className="h-5 w-5 shrink-0 rounded text-[6px]" />
          <span className="min-w-0 truncate font-medium" title={d.name}>{tq ? <HL text={titleOf(d)} q={tq} /> : titleOf(d)}</span>
          {verChip(d)}
          {hits != null && <span className="shrink-0 font-mono text-[11px] text-amber-600 dark:text-amber-400">{hits}×</span>}
        </div>
        <div onClick={e => e.stopPropagation()}><DocStatusPicker doc={d} onSetStatus={onSetStatus} quiet /></div>
        <div>{linkCell(d)}</div>
        <div><span className="tnum font-mono text-xs text-muted-foreground">{fmtSize(d.size)}</span></div>
        <div><span className="truncate font-mono text-xs text-muted-foreground" title={fmtDay(d.addedAt)}>{relTime(d.addedAt)}</span></div>
        <div className="dg-acts">
          {d.inbox ? inboxActs(d, target) : <>
            <button type="button" title="Open in its Windows app" aria-label={`Open ${d.name} in its Windows app`} onClick={e => { e.stopPropagation(); openExternal(d); }} className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground ui-quiet"><I.external className="size-3.5" /></button>
            <button type="button" title="Save a copy" aria-label={`Save a copy of ${d.name}`} onClick={e => { e.stopPropagation(); onDownload(d); }} className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground ui-quiet"><I.download className="size-3.5" /></button>
            <button type="button" title="Delete document" aria-label={`Delete ${d.name}`} onClick={e => { e.stopPropagation(); onDelete(d, false); }} className={cn('flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10', danger)}><I.trash className="size-3.5" /></button>
          </>}
        </div>
      </div>
    );
  };
  const tHead = (id, label, count, dot, badge) => (
    <div key={'h-' + id} className="dg-row dg-group"><div className="pl-2.5">{groupHead(id, label, count, dot, badge)}</div><div /><div /><div /><div /><div /></div>
  );
  const tSub = (label, n) => (
    <div className="dg-row dg-group"><div className="pl-2.5 text-[11px] font-semibold uppercase tracking-[.05em] text-muted-foreground">{label}<span className="ml-1.5 font-mono font-normal normal-case tracking-normal">{n}</span></div><div /><div /><div /><div /><div /></div>
  );
  const table = (
    <div ref={tableRef} role="listbox" tabIndex={0} aria-label="Documents" onKeyDown={listKeys(() => tableRef.current)}
      className={cn('doc-grid mt-3 min-h-0 flex-1 overflow-auto rounded-lg pb-2 focus-visible:outline-none', dragOver && 'ring-2 ring-ring')}>
      <div className="min-w-[760px]">
        <div className="dg-row dg-headrow sticky top-0 z-[1] bg-[hsl(var(--page))]">
          <div className="pl-[38px]">Document</div><div>Status</div><div>Linked tasks</div><div>Size</div><div>Updated</div><div />
        </div>
        {tq ? (
          <>
            {tSub('Names', byName.length)}
            {byName.map(d => tRow(d))}
            {byName.length === 0 && <div className="px-10 py-2 text-xs text-muted-foreground/70">No names match.</div>}
            {tSub('Inside documents', `${textTotal} ${textTotal === 1 ? 'match' : 'matches'} in ${byText.length}`)}
            {byText.map(d => tRow(d, countHits(texts[d.file], tq)))}
            {byText.length === 0 && <div className="px-10 py-2 text-xs text-muted-foreground/70">{indexing ? 'Still reading your documents…' : 'No document contains this text.'}</div>}
          </>
        ) : (
          <>
            {inbox.length > 0 && <>{tHead('inbox', 'Inbox', inbox.length, null, true)}{!shut.inbox && inbox.map(d => tRow(d))}</>}
            {groups.map(g => <React.Fragment key={g.id}>{tHead(g.id, g.label, g.docs.length, g.dot)}{!shut[g.id] && g.docs.map(d => tRow(d))}</React.Fragment>)}
            {flat.length === 0 && inbox.length === 0 && groups.length === 0 && <div className="px-3 py-8 text-center text-sm text-muted-foreground">No documents match.</div>}
          </>
        )}
      </div>
    </div>
  );

  /* ---------- Reader ---------- */
  const rRow = (d, inside) => {
    const on = sel && sel.id === d.id;
    const target = d.inbox ? findVersionTarget(d.name, docs, d.id) : null;
    const hits = inside ? countHits(texts[d.file], tq) : 0;
    const snips = inside ? snippetsAll(texts[d.file], tq) : [];
    const shown = moreOf[d.id] ? snips : snips.slice(0, 3);
    return (
      <div key={(inside ? 't-' : '') + d.id} data-doc={inside ? undefined : d.id} data-doc-in={inside ? d.id : undefined} role="option" aria-selected={on} onClick={() => pick(d)} onDoubleClick={() => pick(d, true)}
        className={cn('group cursor-default rounded-md px-2 text-[13px]', on ? 'bg-muted' : 'hover:bg-muted/50')}>
        <div className="flex h-8 items-center gap-2">
          {d.inbox ? <span className="size-1.5 shrink-0 rounded-full bg-blue-500" /> : <span className={cn('size-1.5 shrink-0 rounded-full', DSt[docStatus(d)].dot)} />}
          <span className={cn('min-w-0 flex-1 truncate', on && 'font-semibold')} title={d.name}>{inside || !tq ? titleOf(d) : <HL text={titleOf(d)} q={tq} />}</span>
          {inside && <span className="shrink-0 font-mono text-[11px] text-amber-600 dark:text-amber-400">{hits}×</span>}
          {d.inbox ? (
            <span className="flex shrink-0 items-center gap-0.5">
              <span className="text-[11px] text-muted-foreground group-hover:hidden">{relTime(d.addedAt)}</span>
              <span className="hidden gap-0.5 group-hover:flex [@media(hover:none)]:flex">{inboxActs(d, target)}</span>
            </span>
          ) : d.links.length > 0 && <span className="inline-flex shrink-0 items-center gap-0.5 font-mono text-[11px] text-muted-foreground" title={d.links.map(l => l.task.title || 'Untitled').join(', ')}><I.paperclip className="size-3" />{d.links.length}</span>}
        </div>
        {inside && (
          <div className="-mt-1 grid pb-1.5 pl-3.5">
            {shown.map((m, i) => (
              <button key={i} type="button" onClick={e => { e.stopPropagation(); jumpTo(d, i); }} title={`Go to match ${i + 1}`}
                className={cn('flex min-w-0 items-baseline gap-1.5 rounded px-1.5 py-0.5 text-left text-xs hover:bg-background/60 hover:text-foreground', on && findOpen && findIdx === i ? 'bg-background/70 text-foreground' : 'text-muted-foreground')}>
                {d.kind === 'pdf' && <span className="tnum w-7 shrink-0 font-mono text-[10px] text-muted-foreground/70">p.{m.page}</span>}
                <span className="min-w-0 truncate">{m.pre}<mark className="rounded-sm bg-amber-400/25 px-px text-amber-700 dark:text-amber-300">{m.hit}</mark>{m.post}</span>
              </button>
            ))}
            {snips.length > 3 && <button type="button" onClick={e => { e.stopPropagation(); setMoreOf(x => ({ ...x, [d.id]: !x[d.id] })); }} className="w-fit rounded px-1.5 py-0.5 text-left text-xs text-muted-foreground/80 hover:text-foreground">{moreOf[d.id] ? 'Show fewer' : `${snips.length - 3} more`}</button>}
          </div>
        )}
      </div>
    );
  };
  const rHead = (id, label, count, dot, badge) => <div key={'h-' + id} className="flex h-8 items-center px-2 pt-1">{groupHead(id, label, count, dot, badge)}<span className="ml-2 h-px flex-1 bg-border" /></div>;
  const readerList = railed ? (
    <div className="flex w-11 shrink-0 flex-col items-center gap-1">
      <button type="button" onClick={() => setRailed(false)} aria-label="Show the document list" title="Show the document list" className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground ui-quiet"><I.panelLeft className="size-4" /></button>
      <div ref={listRef} role="listbox" tabIndex={0} aria-label="Documents" onKeyDown={listKeys(() => listRef.current)} className="flex min-h-0 w-full flex-1 flex-col items-center gap-1 overflow-y-auto py-1 focus-visible:outline-none">
        {flat.map(d => (
          <button key={d.id} data-doc={d.id} type="button" role="option" aria-selected={sel && sel.id === d.id} aria-label={titleOf(d)} title={`${titleOf(d)}\n${d.name}`} onClick={() => pick(d)}
            className={cn('relative flex size-8 shrink-0 items-center justify-center rounded-md', sel && sel.id === d.id ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground')}>
            <I.file className="size-4" />
            <span className={cn('absolute bottom-1 right-1 size-1.5 rounded-full ring-2 ring-[hsl(var(--page))]', d.inbox ? 'bg-blue-500' : DSt[docStatus(d)].dot)} />
          </button>
        ))}
      </div>
    </div>
  ) : (
    <div className={cn('flex w-full shrink-0 flex-col gap-2 lg:w-[clamp(260px,24%,340px)]', 'max-h-[40%] lg:max-h-none')}>
      <div className="flex items-center gap-1.5">
        <PageSearch value={q} onChange={setQ} placeholder="Search documents" />
        <button type="button" onClick={() => setRailed(true)} aria-label="Fold the list into a rail" title="Fold the list into a rail" className="hidden size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-foreground ui-fill lg:flex"><I.panelLeft className="size-4" /></button>
      </div>
      <div ref={listRef} role="listbox" tabIndex={0} aria-label="Documents" onKeyDown={listKeys(() => listRef.current)} className={cn('min-h-0 flex-1 overflow-y-auto pb-1 focus-visible:outline-none', dragOver && 'rounded-md ring-2 ring-ring')}>
        {tq ? (
          <>
            <div className="flex items-center gap-1.5 px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[.05em] text-muted-foreground">Names<span className="font-mono font-normal normal-case tracking-normal">{byName.length}</span></div>
            {byName.map(d => rRow(d, false))}
            {byName.length === 0 && <div className="px-2 py-1.5 text-xs text-muted-foreground/70">No names match.</div>}
            <div className="flex items-center gap-1.5 px-2 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-[.05em] text-muted-foreground">Inside documents<span className="font-mono font-normal normal-case tracking-normal">{textTotal} in {byText.length}</span></div>
            {byText.map(d => rRow(d, true))}
            {byText.length === 0 && <div className="px-2 py-1.5 text-xs text-muted-foreground/70">{indexing ? 'Still reading your documents…' : 'No document contains this text.'}</div>}
          </>
        ) : (
          <>
            {inbox.length > 0 && <>{rHead('inbox', 'Inbox', inbox.length, null, true)}{!shut.inbox && inbox.map(d => rRow(d, false))}</>}
            {groups.map(g => <React.Fragment key={g.id}>{rHead(g.id, g.label, g.docs.length, g.dot)}{!shut[g.id] && g.docs.map(d => rRow(d, false))}</React.Fragment>)}
            {inbox.length === 0 && groups.length === 0 && <div className="px-3 py-6 text-center text-sm text-muted-foreground">No documents match.</div>}
          </>
        )}
      </div>
    </div>
  );
  const ib = (icon, label, fn, on) => <button type="button" aria-label={label} title={label} onClick={fn} aria-pressed={on} className={cn('flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-foreground', on ? 'bg-muted text-foreground' : 'ui-quiet')}>{icon}</button>;
  const cur = viewVer || sel;
  const detailsPanel = sel && (
    <aside aria-label="Document details" className="hidden w-64 shrink-0 flex-col gap-5 overflow-y-auto pb-2 pt-1 lg:flex">
      <section className="flex flex-col gap-1.5">
        <div className="text-[11px] font-medium uppercase tracking-[.05em] text-muted-foreground">Linked tasks</div>
        {sel.links.map(l => (
          <div key={l.task.id} className="group flex h-8 items-center gap-2 rounded-md pl-2 pr-1 ui-fill">
            <span className={cn('size-1.5 shrink-0 rounded-full', (S[l.task.status] || S.todo).dot)} />
            <button type="button" onClick={() => onOpenTask(l.task.id, l.archived)} className="min-w-0 flex-1 truncate text-left text-[13px] font-medium hover:underline underline-offset-2">{l.task.title || 'Untitled'}{l.archived ? ' (archived)' : ''}</button>
            {!l.archived && <button type="button" onClick={() => onRemove(sel, l.task.id)} aria-label={`Unlink from ${l.task.title || 'Untitled'}`} title="Unlink" className={cn('flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground opacity-60 hover:bg-destructive/10 hover:opacity-100', danger)}><I.x className="size-3" /></button>}
          </div>
        ))}
        <button type="button" onClick={() => onAttach(sel)} className="flex h-8 items-center gap-2 rounded-md px-2 text-[13px] text-muted-foreground hover:text-foreground ui-quiet"><I.plus className="size-3.5" />Link a task</button>
      </section>
      <section className="flex flex-col gap-1.5">
        <div className="text-[11px] font-medium uppercase tracking-[.05em] text-muted-foreground">Details</div>
        <dl className="m-0 grid grid-cols-[4.5rem_minmax(0,1fr)] gap-y-1.5 text-[13px]">
          <dt className="text-muted-foreground">File</dt><dd className="m-0 truncate font-mono text-xs leading-5">{cur.name}</dd>
          <dt className="text-muted-foreground">Type</dt><dd className="m-0 truncate">{(extOf(cur.name) || sel.kind || '').toUpperCase()}</dd>
          <dt className="text-muted-foreground">Size</dt><dd className="m-0 font-mono text-xs leading-5">{fmtSize(cur.size)}</dd>
          <dt className="text-muted-foreground">Added</dt><dd className="m-0 truncate" title={new Date(cur.addedAt).toLocaleString()}>{fmtDay(cur.addedAt)}</dd>
        </dl>
      </section>
      <section className="flex flex-col gap-1">
        <div className="mb-0.5 text-[11px] font-medium uppercase tracking-[.05em] text-muted-foreground">Versions</div>
        <button type="button" onClick={() => setViewVer(null)} className={cn('flex h-8 items-center gap-2 rounded-md px-2 text-left text-[13px]', !viewVer ? 'bg-muted' : 'hover:bg-muted/50')}>
          <span className="flex-1 truncate">v{versionCount(sel)} · current</span><span className="font-mono text-[11px] text-muted-foreground">{fmtDay(sel.addedAt)}</span>
        </button>
        {(sel.versions || []).map((v, i) => ({ v, i })).reverse().map(({ v, i }) => (
          <button key={v.file} type="button" onClick={() => setViewVer(v)} className={cn('flex h-8 items-center gap-2 rounded-md px-2 text-left text-[13px]', viewVer === v ? 'bg-muted' : 'hover:bg-muted/50')}>
            <span className="flex-1 truncate text-muted-foreground">v{i + 1}</span><span className="font-mono text-[11px] text-muted-foreground">{fmtDay(v.addedAt)}</span>
          </button>
        ))}
        <button type="button" onClick={() => onUploadVersion(sel)} className="flex h-8 items-center gap-2 rounded-md px-2 text-[13px] text-muted-foreground hover:text-foreground ui-quiet"><I.upload className="size-3.5" />Upload new version</button>
      </section>
      <section>
        <button type="button" onClick={() => onDelete(sel, !!sel.inbox)} className={cn('flex h-8 items-center gap-2 rounded-md px-2 text-[13px] text-muted-foreground hover:bg-destructive/10', danger)}><I.trash className="size-3.5" />{sel.inbox ? 'Dismiss' : 'Delete document'}</button>
      </section>
    </aside>
  );
  const viewer = (
    <div ref={viewerRef} tabIndex={-1} className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border text-card-foreground focus-visible:outline-none ui-card">
      {sel ? (
        <>
          <div className="flex h-11 shrink-0 items-center gap-2 pl-3 pr-1.5">
            <span className="tnum min-w-0 truncate font-mono text-xs text-muted-foreground">{fmtSize(cur.size)} · {relTime(cur.addedAt)}</span>
            {(sel.versions || []).length > 0 && (
              <DropdownMenu align="start"
                trigger={p => <button {...p} type="button" className="inline-flex h-6 shrink-0 items-center gap-1 rounded-md px-1.5 font-mono text-[11px] text-muted-foreground hover:text-foreground ui-fill">{viewVer ? `v${sel.versions.indexOf(viewVer) + 1}` : `v${versionCount(sel)}`} of {versionCount(sel)}<I.down className="size-3" /></button>}
                items={[
                  { label: `v${versionCount(sel)} (current), ${fmtDay(sel.addedAt)}`, icon: <I.check />, onSelect: () => setViewVer(null) },
                  ...sel.versions.map((v, i) => ({ label: `v${i + 1}, ${fmtDay(v.addedAt)}`, icon: <I.file />, onSelect: () => setViewVer(v) })).reverse(),
                  'sep',
                  { label: 'Upload new version…', icon: <I.upload />, onSelect: () => onUploadVersion(sel) },
                  { label: 'Merge existing documents…', icon: <I.layers />, shortcut: '⇧U', onSelect: () => onMerge(sel) },
                ]} />
            )}
            {!details && sel.links.length > 0 && <span className="hidden shrink-0 items-center gap-1 font-mono text-[11px] text-muted-foreground xl:inline-flex" title={sel.links.map(l => l.task.title || 'Untitled').join(', ')}><I.paperclip className="size-3" />{sel.links.length}</span>}
            <div className="ml-auto flex shrink-0 items-center gap-0.5">
              {ib(<I.search className="size-4" />, 'Find in document (Ctrl+F)', openFind)}
              {ib(<I.external className="size-4" />, 'Open in its Windows app', () => openExternal(shownFile))}
              {ib(<I.download className="size-4" />, 'Save a copy', () => onDownload(shownFile))}
              {ib(<I.paperclip className="size-4" />, 'Link to a task', () => onAttach(sel))}
              <DropdownMenu trigger={p => <button {...p} type="button" aria-label={`More for ${sel.name}`} className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground ui-quiet"><I.more className="size-4" /></button>}
                items={[
                  { label: 'Upload new version…', icon: <I.upload />, onSelect: () => onUploadVersion(sel) },
                  { label: 'Merge into versions…', icon: <I.layers />, shortcut: '⇧U', onSelect: () => onMerge(sel) },
                  'sep',
                  { label: sel.inbox ? 'Dismiss' : 'Delete document', icon: <I.trash />, destructive: true, onSelect: () => onDelete(sel, !!sel.inbox) },
                ]} />
              <span className="mx-1 h-4 w-px bg-border" />
              {ib(<I.panelRight className="size-4" />, details ? 'Hide details' : 'Show details', () => setDetails(!details), details)}
            </div>
          </div>
          {viewVer && (
            <div className="flex items-center gap-3 bg-muted/50 px-3 py-1.5 text-xs">
              <span className="text-muted-foreground">You’re looking at an older version.</span>
              <button type="button" className="font-medium underline underline-offset-2" onClick={() => { onMakeCurrent(sel, viewVer); setViewVer(null); }}>Make it current</button>
              <button type="button" className="text-muted-foreground underline underline-offset-2 hover:text-foreground" onClick={() => setViewVer(null)}>Back to the latest</button>
            </div>
          )}
          {findOpen && (
            <div className="flex flex-wrap items-center gap-2 bg-muted/40 px-3 py-1.5 text-xs">
              <div className="relative w-56">
                <I.search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <input ref={findIn} value={findQ} onChange={e => { setFindQ(e.target.value); setFindIdx(0); }} placeholder="Find in document" aria-label="Find in document"
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); stepFind(e.shiftKey ? -1 : 1); } if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setFindOpen(false); setFindQ(''); } }}
                  className="h-7 w-full rounded-md border pl-7 pr-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ui-field" />
              </div>
              <span className="tnum min-w-[4.5rem] text-muted-foreground">{findQ.trim().length < 2 ? '' : findN ? `${Math.min(findIdx + 1, findN)} of ${findN}${findPages ? `, page ${findPages[findIdx]}` : ''}` : 'No matches'}</span>
              <Button variant="outline" size="icon-sm" className="h-7 w-7 shadow-none" aria-label="Previous match" title="Previous (Shift+Enter)" disabled={!findN} onClick={() => stepFind(-1)}><I.up /></Button>
              <Button variant="outline" size="icon-sm" className="h-7 w-7 shadow-none" aria-label="Next match" title="Next (Enter)" disabled={!findN} onClick={() => stepFind(1)}><I.down /></Button>
              {findPages && findN > 0 && <span className="text-muted-foreground">Jumps to the page in PDFs</span>}
              <button type="button" aria-label="Close find" onClick={() => { setFindOpen(false); setFindQ(''); }} className="ml-auto flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"><I.x className="size-3.5" /></button>
            </div>
          )}
          <DocPreview file={shownFile} className="min-h-0 flex-1 rounded-none border-0" find={findOpen ? findQ : ''} findIdx={findIdx} onFindCount={(n, pages) => { setFindN(n); setFindPages(pages); }} />
        </>
      ) : <DocPreview file={null} className="flex-1 rounded-none border-0" />}
    </div>
  );
  const viewSwitch = (
    <div role="tablist" aria-label="View" className="inline-flex h-9 shrink-0 items-center rounded-lg bg-muted p-1 text-muted-foreground">
      {[['table', 'Library', I.rows], ['reader', 'Reader', I.panelLeft]].map(([id, label, Ic]) => (
        <button key={id} role="tab" type="button" aria-selected={mode === id} aria-label={label} title={label + (id === 'table' ? ' (Esc from the reader)' : '')} disabled={id === 'reader' && !sel}
          onClick={() => { if (id === 'reader' && sel) pick(sel); setMode(id); }}
          className={cn('inline-flex h-7 items-center justify-center rounded-md px-2 transition-colors disabled:opacity-40', mode === id ? 'bg-background text-foreground shadow' : 'hover:text-foreground')}><Ic className="size-4" /></button>
      ))}
    </div>
  );
  const statusFilter = (
    <Select variant="chip" label="Filter by status" value={stF} onChange={setStF} searchable={false}
      renderValue={o => <span>{o.value === 'all' ? 'Status' : `Status: ${o.label}`}</span>} options={[{ value: 'all', label: 'All' }, ...DOC_STATUSES.map(s => ({ value: s.id, label: s.label, icon: <span className={cn('size-2 rounded-full', s.dot)} /> }))]} />
  );
  const sortPick = (
    <Select variant="chip" label="Sort documents" value={sort} onChange={setSort} searchable={false} icon={<I.updown className="size-3.5 shrink-0" />}
      renderValue={o => <span>{o.label}</span>} options={[{ value: 'new', label: 'Newest' }, { value: 'name', label: 'Name' }, { value: 'size', label: 'Size' }]} />
  );
  const refreshBtn = (
    <Button variant="outline" size="icon-sm" className="shadow-none" onClick={async () => { setSpin(true); try { await onRefresh(); } finally { setSpin(false); } }}
      aria-label="Check watch folders now" title={hasWatch ? 'Check watch folders now' : 'Check watch folders now (add one in Settings)'}>
      <I.refresh className={cn(spin && 'animate-spin')} />
    </Button>
  );
  return (
    <div ref={wrap} className="flex flex-col" style={{ height }}>
      {mode !== 'reader' || docs.length === 0 ? (
        <>
          <PageHead title="Documents" sub={`${docs.length} ${docs.length === 1 ? 'file' : 'files'}${total ? `, ${fmtSize(total)}` : ''}`} />
          <PageBar>
            <PageSearch value={q} onChange={setQ} placeholder="Search documents" />
            {statusFilter}
            {mixed && <FilterTabs label="File type" value={kind} onChange={setKind}
              items={[['all', 'All'], ['pdf', 'PDF'], ['word', 'Word'], ['html', 'HTML'], ['other', 'Other']].filter(([id]) => id === 'all' || counts[id] > 0).map(([id, label]) => ({ id, label, count: counts[id] }))} />}
            <div className="ml-auto flex items-center gap-1.5">
              {refreshBtn}
              {sortPick}
              {docs.length > 0 && viewSwitch}
            </div>
          </PageBar>
          {docs.length === 0 ? (
            <Card className={cn('mt-3 flex flex-1 items-center justify-center', dragOver && 'ring-2 ring-ring')}>
              <Empty icon={<I.file />} title="No documents yet"
                description="Drag files from WhatsApp or File Explorer onto this window, or add a watch folder in Settings so new files arrive here by themselves.">
                <Button variant="outline" size="sm" onClick={() => onAdd([])}><I.upload />Add documents</Button>
              </Empty>
            </Card>
          ) : table}
        </>
      ) : (
        <>
          <div className="flex min-h-9 shrink-0 items-center gap-2.5">
            <Button variant="outline" size="sm" className="shrink-0 shadow-none" onClick={() => setMode('table')} title="Back to the library (Esc)"><I.left />Library</Button>
            <span className="shrink-0 text-muted-foreground/60">/</span>
            <h1 className="m-0 min-w-0 truncate text-xl font-semibold tracking-tight" title={sel ? sel.name : undefined}>{sel ? titleOf(sel) : 'Documents'}</h1>
            {sel && <DocStatusPicker doc={sel} onSetStatus={onSetStatus} />}
            <div className="ml-auto flex shrink-0 items-center gap-1.5">{viewSwitch}</div>
          </div>
          <div className="mt-3 flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
            {readerList}
            {viewer}
            {details && detailsPanel}
          </div>
        </>
      )}
    </div>
  );
}

function LinkDocsDialog({ taskId, library, linkedIds, onClose, onLink }) {
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState([]);
  useEffect(() => { setQ(''); setPicked([]); }, [taskId]);
  if (!taskId) return null;
  const nq = norm(q);
  const list = library.filter(d => !linkedIds.includes(d.id) && (!nq || norm(d.name).includes(nq))).sort((a, b) => b.addedAt - a.addedAt);
  const toggle = id => setPicked(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  return (
    <Dialog open onClose={onClose} title="Choose from Documents" className="max-w-lg"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={!picked.length} onClick={() => onLink(taskId, library.filter(d => picked.includes(d.id)))}>Link {picked.length || ''} {picked.length === 1 ? 'document' : 'documents'}</Button></>}>
      <div className="relative">
        <I.search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search documents" aria-label="Search documents" className="pl-9" />
      </div>
      <div className="max-h-80 overflow-y-auto rounded-md border ui-inset">
        {list.length === 0 && <div className="p-4 text-sm text-muted-foreground">{library.length ? 'No other documents match.' : 'There are no documents yet.'}</div>}
        {list.map(d => (
          <label key={d.id} className="flex cursor-default items-center gap-3 border-b px-3 py-2 last:border-0 hover:bg-muted/50">
            <Checkbox checked={picked.includes(d.id)} onChange={() => toggle(d.id)} label={d.name} />
            <FileBadge kind={d.kind} className="h-7 w-6" />
            <span className="min-w-0 flex-1"><span className="block truncate text-sm">{d.name}</span><span className="block text-xs text-muted-foreground">{fmtSize(d.size)}, {d.links.length ? `linked to ${d.links.length} ${d.links.length === 1 ? 'task' : 'tasks'}` : 'not linked'}</span></span>
          </label>
        ))}
      </div>
    </Dialog>
  );
}

function AttachDocDialog({ file, tasks, onClose, onAttach }) {
  const [target, setTarget] = useState('');
  const linked = new Set(((file && file.links) || []).map(l => l.task.id));
  useEffect(() => { setTarget(''); }, [file && file.id]);
  if (!file) return null;
  return (
    <Dialog open={!!file} onClose={onClose} title="Link to a task" description={file.name} className="max-w-md"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={!target} onClick={() => onAttach(file, target)}>Link</Button></>}>
      <Field label="Task" htmlFor="att-t">
        <Select id="att-t" value={target} onChange={setTarget} placeholder="Choose a task…"
          options={tasks.filter(t => !linked.has(t.id)).sort((a, b) => b.createdAt - a.createdAt).map(t => ({ value: t.id, label: t.title || 'Untitled', group: t.status === 'done' ? 'Complete' : 'Open' }))} />
      </Field>
    </Dialog>
  );
}

function StatusBadge({ status, className }) {
  const s = S[status] || S.todo;
  const Ico = I[s.icon];
  return (
    <span className={cn('inline-flex items-center gap-2 whitespace-nowrap text-[13px]', className)}>
      <span className={cn('flex size-5 shrink-0 items-center justify-center rounded-full', s.tone)}><Ico className="size-3" /></span>{s.label}
    </span>
  );
}
// Priority reads by shape, not color: 3 bars for High, 2 for Medium, 1 for Low.
// Only High gets color, so urgent work stands out and Medium never looks like "To do".
const PriorityBars = ({ priority, className }) => {
  const n = { high: 3, normal: 2, low: 1 }[priority || 'normal'];
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true" className={cn('size-2.5 shrink-0', className)}>
      {[0, 1, 2].map(i => <rect key={i} x={1 + i * 3.75} y={8 - i * 3} width="2.5" height={3 + i * 3} rx="0.75" fill="currentColor" opacity={i < n ? 1 : 0.25} />)}
    </svg>
  );
};
// Only High is filled; Medium and Low stay outlined like the other tags.
const PRI_CHIP = {
  high: 'border border-transparent bg-red-500/15 text-red-700 dark:bg-red-500/20 dark:text-red-300 font-medium',
  normal: 'border ui-fill text-foreground/80',
  low: 'border ui-fill text-muted-foreground',
};
const PriorityPill = ({ priority, className }) => (
  <span className={cn('inline-flex h-5 items-center gap-1 whitespace-nowrap rounded-md px-1.5 text-xs', PRI_CHIP[priority || 'normal'], className)}>
    <PriorityBars priority={priority} />{P[priority || 'normal'].label}
  </span>
);
// Subtle outlined chips, like a database table.
// Custom statuses ("Ready for design", "In review"…) belong to one of the four built-in groups,
// which is what filters, automations and blocking use. The task keeps the group in `status`
// and the custom one in `stage`.
const STATUS_COLORS = {
  gray: 'bg-zinc-400', brown: 'bg-amber-700', orange: 'bg-orange-500', yellow: 'bg-yellow-500', green: 'bg-emerald-500',
  blue: 'bg-blue-500', purple: 'bg-violet-500', pink: 'bg-pink-500', red: 'bg-red-500',
};
/* Table columns: standard widths and the narrowest each can be. The Task column takes the rest. */
const TABLE_COLS = [
  { key: 'task', min: 200, icon: 'task' },
  { key: 'status', w: 150, min: 90 },
  { key: 'bucket', w: 150, min: 90 },
  { key: 'assignee', w: 140, min: 90 },
  { key: 'deadline', w: 112, min: 80 },
  { key: 'priority', w: 92, min: 72 },
  { key: 'time', w: 96, min: 80 },
];
const STATUS_HEX = { gray: '#a1a1aa', brown: '#b45309', orange: '#f97316', yellow: '#eab308', green: '#10b981', blue: '#3b82f6', purple: '#8b5cf6', pink: '#ec4899', red: '#ef4444' };
const GROUP_HEAD = { todo: 'To-do', doing: 'In progress', blocked: 'Blocked', done: 'Complete' };
const BUILTIN_COLOR = { todo: 'orange', doing: 'blue', blocked: 'red', done: 'green' };
const NEW_COLOR = { todo: 'gray', doing: 'blue', blocked: 'red', done: 'green' };
// Every status, in order, grouped. Each group has a main status (its id is the group's id,
// it can be renamed and recolored but not deleted) plus any number of your own.
const statusList = stages => STATUSES.flatMap(g => {
  const inGroup = stages.filter(x => x.group === g.id);
  const list = inGroup.some(x => x.id === g.id) ? inGroup : [{ id: g.id, group: g.id }, ...inGroup];
  return list.map(x => x.id === g.id
    ? { name: g.label, color: BUILTIN_COLOR[g.id], ...x, builtin: true }
    : { color: NEW_COLOR[g.id], ...x });
});
const statusDef = (t, stages) => {
  const all = statusList(stages), group = S[t.status] ? t.status : 'todo';
  return (t.stage && all.find(x => x.id === t.stage && x.group === group && !x.builtin)) || all.find(x => x.id === group);
};
// Status keeps the outlined chip; its text takes the status color (mixed toward the text color so
// it stays readable in light and dark), so it no longer looks like the platform and bucket tags.
const StatusPill = ({ status, label, color, className }) => {
  const st = S[status] || S.todo;
  const hex = STATUS_HEX[color || BUILTIN_COLOR[st.id]] || STATUS_HEX.gray;
  return (
    <span className={cn('inline-flex h-5 max-w-full items-center gap-1.5 whitespace-nowrap rounded-md border px-1.5 text-xs font-medium ui-fill', className)}
      style={{ color: `color-mix(in srgb, ${hex} 78%, hsl(var(--foreground)))` }}>
      <span className="size-1.5 shrink-0 rounded-full" style={{ background: hex }} /><span className="truncate">{label || st.label}</span>
    </span>
  );
};
const DefPill = ({ def, className }) => <StatusPill status={def.group} label={def.name || '…'} color={def.color} className={className} />;
const stageOf = (t, stages) => { const d = statusDef(t, stages); return d && !d.builtin ? d : null; };
const statusLabel = (t, stages) => statusDef(t, stages).name;
const Tag = ({ color, children }) => (
  <span className={cn('inline-flex h-5 max-w-full items-center rounded px-1.5 text-xs font-medium', (PROJECT_COLORS[color] || PROJECT_COLORS.slate).soft)}><span className="truncate">{children}</span></span>
);
const relTime = ms => {
  if (!ms) return '';
  const m = Math.round((Date.now() - ms) / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  const d0 = new Date(); d0.setHours(0, 0, 0, 0);
  if (ms >= d0.getTime()) return `${h} ${h === 1 ? 'hour' : 'hours'} ago`;
  if (ms >= d0.getTime() - 864e5) return 'Yesterday';
  return fmtDay(ms);
};

function TimerButton({ task, onToggle }) {
  const on = !!task.timerStartedAt;
  return (
    <Button size="sm" variant={on ? 'default' : 'outline'} onClick={e => { e.stopPropagation(); onToggle(task.id); }}
      aria-label={`${on ? 'Pause' : 'Start'} timer for ${task.title}`} className="tnum w-[6.5rem] justify-start">
      {on ? <I.pause className="size-3.5" /> : <I.play className="size-3.5" />}{<Elapsed task={task} />}
    </Button>
  );
}

/* ---------- Inline cell editing ---------- */
// Opens under a table cell. Lists show values exactly as they appear in the row,
// and typing a name that doesn't exist yet offers to create it.
/* A task in a bucket with a timeline is due when the timeline ends, by default. You can pick an earlier
   date, never a later one. A task that follows the bucket moves with the timeline. */
const dueDate = iso => fromISO(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
const lockText = (lock, noun, own) => own
  ? `Earlier than the ${lock.name} end (${dueDate(lock.end)}). It can't be later than that.`
  : `From the ${lock.name} timeline. It moves when the ${noun.toLowerCase()}'s dates change. You can pick an earlier date.`;
const lockNote = (lock, noun) => `${lock.name} ends ${dueDate(lock.end)}. Pick that day or earlier. Later days are greyed out.`;
function BucketDeadline({ task, lock, noun = 'Bucket', onSet }) {
  const today = toISO(new Date()), tmr = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return toISO(d); })();
  return (
    <div data-bucket-deadline="">
      <div className="max-w-[17rem] border-b px-3 py-2 text-xs leading-relaxed text-muted-foreground"><span className="font-medium text-foreground">{lock.name} ends {dueDate(lock.end)}.</span> Pick that day or earlier. Later days are greyed out.</div>
      <Calendar selected={task.deadline} max={lock.end} onSelect={v => onSet(v)} />
      <div className="flex gap-1 border-t p-1">
        <Button size="sm" variant="ghost" className="flex-1" disabled={today > lock.end} onClick={() => onSet(today)}>Today</Button>
        <Button size="sm" variant="ghost" className="flex-1" disabled={tmr > lock.end} onClick={() => onSet(tmr)}>Tomorrow</Button>
        <Button size="sm" variant="ghost" className="flex-1" disabled={task.deadline === lock.end} onClick={() => onSet('')}>{noun} end</Button>
      </div>
    </div>
  );
}
function CellEditor({ edit, task, ctx, onClose }) {
  const a = useRef(edit.el), p = useRef(null), inp = useRef(null);
  a.current = edit.el;
  useDismiss(true, v => { if (!v) onClose(); }, [a, p]);
  const [q, setQ] = useState('');
  const [hi, setHi] = useState(0);
  useEffect(() => { setTimeout(() => inp.current && inp.current.focus(), 0); }, []);
  const set = patch => { ctx.update(task.id, patch); onClose(); };
  const nq = norm(q), name = q.trim();
  let items = [], creates = [], placeholder = '';
  const check = on => on ? <I.check className="ml-auto size-3.5 shrink-0 text-muted-foreground" /> : null;

  if (edit.field === 'status') {
    placeholder = 'Search or create…';
    const cur = statusDef(task, ctx.stages);
    items = statusList(ctx.stages).map(x => ({
      key: x.id, text: x.name, section: GROUP_HEAD[x.group], node: <DefPill def={x} />, on: cur.id === x.id,
      pick: () => set({ status: x.group, stage: x.builtin ? '' : x.id }),
    }));
    creates = STATUSES.map(g => ({ key: 'new-' + g.id, text: name, node: <span className="flex min-w-0 items-center gap-2"><span className="shrink-0 text-muted-foreground">Create</span><DefPill def={{ group: g.id, name, color: NEW_COLOR[g.id] }} /><span className="truncate text-xs text-muted-foreground">in {GROUP_HEAD[g.id]}</span></span>,
      pick: () => { const id = ctx.addStage(name, g.id); set({ status: g.id, stage: id }); } }));
  } else if (edit.field === 'bucket') {
    const L = ctx.labels.bucket;
    placeholder = `Search or create a ${L.toLowerCase()}…`;
    items = [
      { key: '', text: `No ${L.toLowerCase()}`, node: <span className="text-muted-foreground">No {L.toLowerCase()}</span>, on: !task.bucket, pick: () => set({ bucket: '' }) },
      ...ctx.buckets.map(n => ({ key: n, text: n, info: (ctx.bucketInfo || {})[norm(n)], node: <span className="flex min-w-0 items-center gap-1.5"><I.layers className="size-3.5 shrink-0 text-muted-foreground/70" /><span className="truncate">{n}</span></span>, on: norm(task.bucket) === norm(n), pick: () => set({ bucket: n }) })),
    ];
    creates = [{ key: 'new', text: name, node: <span className="flex min-w-0 items-center gap-1.5"><I.plus className="size-3.5 shrink-0 text-muted-foreground" /><span className="text-muted-foreground">Create {L.toLowerCase()}</span><span className="truncate font-medium">{name}</span></span>,
      pick: () => { ctx.ensureBucket(name); set({ bucket: name }); } }];
  } else if (edit.field === 'project') {
    placeholder = `Search or create a ${ctx.labels.platform.toLowerCase()}…`;
    items = [
      { key: '', text: `No ${ctx.labels.platform.toLowerCase()}`, node: <span className="text-muted-foreground">No {ctx.labels.platform.toLowerCase()}</span>, on: !task.project, pick: () => set({ project: '' }) },
      ...ctx.projects.map(n => ({ key: n, text: n, node: <span className="flex min-w-0 items-center gap-1.5"><PIcon name={n} className="size-3.5 shrink-0 text-muted-foreground/70" /><span className="truncate">{n}</span></span>, on: norm(task.project) === norm(n), pick: () => set({ project: n }) })),
    ];
    creates = [{ key: 'new', text: name, node: <span className="flex min-w-0 items-center gap-1.5"><I.plus className="size-3.5 shrink-0 text-muted-foreground" /><span className="text-muted-foreground">Create {ctx.labels.platform.toLowerCase()}</span><I.folder className="size-3.5 shrink-0 text-muted-foreground/70" /><span className="truncate font-medium">{name}</span></span>,
      pick: () => { ctx.ensureProject(name); set({ project: name }); } }];
  } else if (edit.field === 'assignee') {
    placeholder = 'Search or add a person…';
    items = [
      { key: '', text: 'Unassigned', node: <span className="text-muted-foreground">Unassigned</span>, on: !task.assignee, pick: () => set({ assignee: '' }) },
      ...ctx.people.map(n => ({ key: n, text: n, search: peopleMeta[n] || '', node: <span className="flex min-w-0 items-center gap-1.5"><Avatar name={n} className="h-5 w-5 [&_span]:text-[9px]" /><span className="truncate">{n}</span>{peopleMeta[n] && <span className="ml-auto truncate pl-2 text-xs text-muted-foreground">{peopleMeta[n].split(' · ')[0]}</span>}</span>, on: norm(task.assignee) === norm(n), pick: () => set({ assignee: n }) })),
    ];
    creates = teamMode ? [] : [{ key: 'new', text: name, node: <span className="flex min-w-0 items-center gap-1.5"><I.plus className="size-3.5 shrink-0 text-muted-foreground" /><span className="text-muted-foreground">Assign to</span><Avatar name={name} className="h-5 w-5 [&_span]:text-[9px]" /><span className="truncate font-medium">{name}</span></span>,
      pick: () => set({ assignee: name }) }];
  } else if (edit.field === 'priority') {
    items = ['high', 'normal', 'low'].map(x => ({ key: x, text: P[x].label, node: <PriorityPill priority={x} />, on: (task.priority || 'normal') === x, pick: () => set({ priority: x }) }));
  }

  const searchable = edit.field !== 'priority' && edit.field !== 'deadline';
  const shown = items.filter(i => !nq || norm(i.text).includes(nq) || (i.search && norm(i.search).includes(nq)));
  const list = [...shown, ...(name && !items.some(i => norm(i.text) === nq) ? creates : [])];
  const onKey = e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi(h => Math.min(h + 1, list.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi(h => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (list[hi]) list[hi].pick(); }
  };
  // Start with the current value highlighted.
  useEffect(() => { const i = list.findIndex(x => x.on); if (i > 0) setHi(i); }, []);
  // In the bucket picker, the highlighted bucket shows its description and status beside the menu.
  const tip = edit.field === 'bucket' && list[hi] && list[hi].info;
  const [tipPos, setTipPos] = useState(null);
  useLayoutEffect(() => {
    if (!tip || !p.current) { setTipPos(null); return; }
    const r = p.current.getBoundingClientRect(), o = p.current.querySelector(`[data-ci="${hi}"]`), or = o ? o.getBoundingClientRect() : r, w = 272;
    setTipPos({ top: Math.max(8, Math.min(or.top - 8, window.innerHeight - 180)), left: r.right + 8 + w <= window.innerWidth - 8 ? r.right + 8 : Math.max(8, r.left - 8 - w) });
  }, [hi, tip && tip.name, q]);
  let lastSection = null;
  return (
    <>
    {tip && tipPos && createPortal(
      <div role="tooltip" style={{ position: 'fixed', top: tipPos.top, left: tipPos.left, width: 272 }}
        className="pointer-events-none z-[81] rounded-md border bg-popover p-4 text-popover-foreground anim-pop ui-float">
        <div className="flex items-start gap-2"><I.layers className="mt-0.5 size-4 shrink-0 text-muted-foreground" /><span className="min-w-0 break-words text-sm font-semibold">{tip.name}</span></div>
        <p className={cn('mt-1.5 line-clamp-5 whitespace-pre-wrap text-sm', !tip.description && 'text-muted-foreground')}>{tip.description || 'No description yet.'}</p>
        <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground"><BucketStatusPill status={tip.status} /><span className="tnum">{tip.open} open {tip.open === 1 ? 'task' : 'tasks'}</span></div>
      </div>, document.body)}
    <Floating anchorRef={a} panelRef={p} open className={cn('p-1', edit.field === 'deadline' ? 'w-auto' : 'w-80')}>
      {edit.field === 'deadline' && ctx.deadlineLock && ctx.deadlineLock(task) ? (
        <BucketDeadline task={task} lock={ctx.deadlineLock(task)} noun={ctx.labels.bucket} onSet={v => set({ deadline: v })} />
      ) : edit.field === 'deadline' ? (
        <div>
          <Calendar selected={task.deadline} onSelect={v => set({ deadline: v })} />
          <div className="flex gap-1 border-t p-1">
            <Button size="sm" variant="ghost" className="flex-1" onClick={() => set({ deadline: toISO(new Date()) })}>Today</Button>
            <Button size="sm" variant="ghost" className="flex-1" onClick={() => { const d = new Date(); d.setDate(d.getDate() + 1); set({ deadline: toISO(d) }); }}>Tomorrow</Button>
            <Button size="sm" variant="ghost" className="flex-1" disabled={!task.deadline} onClick={() => set({ deadline: '' })}>Clear</Button>
          </div>
        </div>
      ) : (
        <div onKeyDown={onKey}>
          {edit.field === 'status' ? (
            // Like a tag field: the current status sits in front of the cursor.
            <div className="mb-1 flex min-h-9 flex-wrap items-center gap-1.5 border-b px-2 py-1">
              <DefPill def={statusDef(task, ctx.stages)} />
              <input ref={inp} value={q} onChange={e => { setQ(e.target.value); setHi(0); }} aria-label={placeholder} placeholder={q ? '' : 'Search or create…'}
                className="h-6 min-w-[6rem] flex-1 bg-transparent text-sm placeholder:text-muted-foreground/70 focus-visible:outline-none" />
            </div>
          ) : searchable
            ? <input ref={inp} value={q} onChange={e => { setQ(e.target.value); setHi(0); }} placeholder={placeholder} aria-label={placeholder}
                className="mb-1 h-8 w-full rounded-md border-b bg-transparent px-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none" />
            : <input ref={inp} readOnly aria-label="Choose" className="sr-only" />}
          <div role="listbox" className="max-h-[min(26rem,60vh)] overflow-y-auto">
            {list.map((it, i) => {
              const head = !nq && it.section && it.section !== lastSection ? it.section : null;
              if (it.section) lastSection = it.section;
              return (
                <React.Fragment key={it.key + i}>
                  {head && i > 0 && <div className="mx-1 my-1 h-px bg-border" />}
                  {head && edit.field === 'status' && <div className="px-2 pb-0.5 pt-1.5 text-xs text-muted-foreground">{head}</div>}
                  <div role="option" data-ci={i} aria-selected={!!it.on} onMouseEnter={() => setHi(i)} onMouseDown={e => e.preventDefault()} onClick={it.pick}
                    className={cn('group/opt flex h-8 cursor-default items-center gap-2 rounded-sm px-2 text-sm', i === hi && 'bg-accent')}>
                    <span className="flex min-w-0 flex-1 items-center">{it.node}</span>
                    {check(it.on)}
                    {it.remove && (
                      <button type="button" aria-label={`Delete status ${it.text}`} title="Delete this status"
                        onClick={e => { e.stopPropagation(); it.remove(); }}
                        className={cn("hidden size-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted group-hover/opt:flex", danger)}><I.trash className="size-3.5" /></button>
                    )}
                  </div>
                </React.Fragment>
              );
            })}
            {list.length === 0 && <div className="px-2 py-2 text-sm text-muted-foreground">Nothing found</div>}
          </div>
          {edit.field === 'status' && (
            <>
              <div className="mx-1 my-1 h-px bg-border" />
              <button type="button" onClick={() => { onClose(); ctx.editStatuses(); }}
                className="flex h-8 w-full items-center gap-2 rounded-sm px-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground">
                <I.sliders className="size-3.5" />Edit property
              </button>
            </>
          )}
        </div>
      )}
    </Floating>
    </>
  );
}

/* ---------- Edit the Status property ---------- */
// 0.19.13: a quieter layout. Each group has a + by its name, counts are plain numbers, and the
// arrows, lock and delete show on the row you point at. How groups behave sits behind the (i) icon.
const GROUP_HELP = [
  ['todo', 'Not started yet.'],
  ['doing', 'Being worked on. Starting a timer moves a to-do here. With “One task at a time” on, the task that was in progress becomes Blocked.'],
  ['blocked', 'Waiting on something. Its timer stops.'],
  ['done', 'Counts as done. Its timer stops and it’s crossed off.'],
];
// Row buttons stay hidden until you point at the row or tab into it. One that can't be used shows faintly.
const rowAct = (off = false) => cn('flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
  off ? 'group-hover/row:opacity-30 group-focus-within/row:opacity-30 [@media(hover:none)]:opacity-30' : 'hover:bg-muted hover:text-foreground focus-visible:opacity-100 group-hover/row:opacity-100 group-focus-within/row:opacity-100 [@media(hover:none)]:opacity-100');
function StatusesDialog({ open, stages, tasks, onClose, onSave }) {
  const [draft, setDraft] = useState([]);
  const [help, setHelp] = useState(false);
  const [added, setAdded] = useState(null);
  useEffect(() => { if (open) { setDraft(statusList(stages)); setHelp(false); setAdded(null); } }, [open]);
  const upd = (id, patch) => setDraft(d => d.map(x => x.id === id ? { ...x, ...patch } : x));
  const move = (id, dir) => setDraft(d => {
    const i = d.findIndex(x => x.id === id), j = i + dir;
    if (j < 0 || j >= d.length || d[j].group !== d[i].group) return d;
    const n = [...d]; [n[i], n[j]] = [n[j], n[i]]; return n;
  });
  const add = g => {
    const id = 'st-' + newId();
    setAdded(id);
    setDraft(d => {
      const at = d.map(y => y.group).lastIndexOf(g) + 1;
      return [...d.slice(0, at), { id, name: '', group: g, color: NEW_COLOR[g] }, ...d.slice(at)];
    });
  };
  const used = x => tasks.filter(t => (S[t.status] ? t.status : 'todo') === x.group && (x.builtin ? !t.stage || !draft.some(y => y.id === t.stage) : t.stage === x.id)).length;
  const dupes = new Set(draft.map(x => norm(x.name)).filter((n, i, a) => n && a.indexOf(n) !== i));
  const valid = draft.every(x => x.name.trim() && !dupes.has(norm(x.name)));
  const mainName = g => (draft.find(y => y.id === g) || {}).name || GROUP_HEAD[g];
  return (
    <>
    <Dialog open={open} onClose={help ? () => setHelp(false) : onClose} className="max-w-[460px]"
      title={<span className="inline-flex items-center gap-1">Edit statuses
        <button type="button" onClick={() => setHelp(true)} aria-label="How status groups work" title="How status groups work"
          className="-my-1 flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"><I.info className="size-3.5" /></button>
      </span>}
      description="Rename, recolor or reorder. Add your own to any group."
      footer={<>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button disabled={!valid} onClick={() => onSave(draft.map(({ builtin, ...x }) => ({ ...x, name: x.name.trim() })))}>Save</Button>
      </>}>
      <div className="grid gap-2.5">
        {STATUSES.map(g => {
          const rows = draft.filter(x => x.group === g.id);
          return (
            <div key={g.id}>
              <div className="flex h-7 items-center justify-between pl-1.5">
                <span className="text-xs font-medium text-muted-foreground">{GROUP_HEAD[g.id]}</span>
                <button type="button" onClick={() => add(g.id)} aria-label={`Add a status to ${GROUP_HEAD[g.id]}`} title="Add a status"
                  className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"><I.plus className="size-3.5" /></button>
              </div>
              {rows.map((x, i) => {
                const n = used(x), clash = dupes.has(norm(x.name));
                return (
                  <div key={x.id} className="group/row flex h-8 items-center gap-1.5 rounded-md pl-0.5 pr-1 hover:bg-muted/50 focus-within:bg-muted/50">
                    <Popover className="p-2"
                      trigger={p => <button {...p} type="button" aria-label={`Color of ${x.name || 'status'}`} className="flex size-7 shrink-0 items-center justify-center rounded-md hover:bg-muted"><span className={cn('size-2.5 rounded-full', STATUS_COLORS[x.color])} /></button>}>
                      <div className="grid grid-cols-3 gap-1">
                        {Object.keys(STATUS_COLORS).map(c => (
                          <button key={c} type="button" onClick={() => upd(x.id, { color: c })}
                            className={cn('flex h-7 items-center gap-2 rounded px-2 text-xs capitalize hover:bg-accent', x.color === c && 'bg-accent font-medium')}>
                            <span className={cn('size-2.5 rounded-full', STATUS_COLORS[c])} />{c}
                          </button>
                        ))}
                      </div>
                    </Popover>
                    <Input value={x.name} onChange={e => upd(x.id, { name: e.target.value })} placeholder="Status name" aria-label="Status name" autoFocus={x.id === added}
                      className={cn('h-7 flex-1 border-transparent bg-transparent px-1.5 font-medium !shadow-none hover:border-input focus-visible:border-input focus-visible:ring-0 focus-visible:bg-background', clash && 'border-destructive')} />
                    <span className="min-w-[1.5rem] shrink-0 text-right text-xs text-muted-foreground tnum" title={n ? `${n} ${n === 1 ? 'task' : 'tasks'}` : undefined}>{n || ''}</span>
                    <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(x.id, -1)} className={rowAct(i === 0)}><I.up className="size-3.5" /></button>
                    <button type="button" aria-label="Move down" disabled={i === rows.length - 1} onClick={() => move(x.id, 1)} className={rowAct(i === rows.length - 1)}><I.down className="size-3.5" /></button>
                    {x.builtin
                      ? <span title="Main status. Rename or recolor it, but it can’t be deleted." className="flex size-7 shrink-0 items-center justify-center text-muted-foreground opacity-0 transition-opacity group-hover/row:opacity-50 group-focus-within/row:opacity-50 [@media(hover:none)]:opacity-50"><I.lock className="size-3.5" /></span>
                      : <button type="button" aria-label={`Delete ${x.name || 'status'}`} title={n ? `Its ${n} ${n === 1 ? 'task moves' : 'tasks move'} to ${mainName(g.id)}` : 'Delete'}
                          onClick={() => setDraft(d => d.filter(y => y.id !== x.id))}
                          className={cn(rowAct(), danger)}><I.trash className="size-3.5" /></button>}
                  </div>
                );
              })}
            </div>
          );
        })}
        {dupes.size > 0 && <p className="text-[0.8rem] text-destructive">Two statuses can’t have the same name.</p>}
      </div>
    </Dialog>
    <Dialog open={open && help} onClose={() => setHelp(false)} title="How status groups work" className="max-w-[420px]"
      description="Every status sits in one of four groups. The group decides how its tasks behave."
      footer={<Button onClick={() => setHelp(false)}>Got it</Button>}>
      <div className="grid gap-3">
        {GROUP_HELP.map(([g, text]) => (
          <div key={g} className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-baseline gap-2.5 text-sm">
            <span className="flex items-center gap-2 font-medium"><span className={cn('size-2 shrink-0 rounded-full', STATUS_COLORS[(draft.find(y => y.id === g) || {}).color || BUILTIN_COLOR[g]])} />{GROUP_HEAD[g]}</span>
            <span className="text-muted-foreground">{text}</span>
          </div>
        ))}
        <div className="grid gap-2 rounded-lg bg-muted/60 p-3 text-[0.8rem] text-muted-foreground">
          <div className="flex gap-2"><I.lock className="mt-0.5 size-3.5 shrink-0" />Each group keeps one main status. You can rename and recolor it, but not delete it.</div>
          <div className="flex gap-2"><I.trash className="mt-0.5 size-3.5 shrink-0" />Deleting a status moves its tasks to the group’s main status.</div>
        </div>
      </div>
    </Dialog>
    </>
  );
}

/* ---------- Compact task sheet ---------- */
const ghostField = 'h-8 w-full rounded-md border border-transparent px-2 text-sm !shadow-none transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-0 focus-visible:border-input focus-visible:bg-background placeholder:text-muted-foreground ui-quiet';
const hoverAct = 'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition hover:bg-muted hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring group-hover:opacity-100 [@media(hover:none)]:opacity-100';
const PropRow = ({ label, htmlFor, children }) => (
  <div className="grid min-h-8 grid-cols-[88px_minmax(0,1fr)] items-center gap-2">
    <label htmlFor={htmlFor} className="text-[13px] text-muted-foreground">{label}</label>
    <div className="min-w-0">{children}</div>
  </div>
);
const SectionHead = ({ children, right }) => (
  <div className="flex h-7 items-center justify-between px-2">
    <div className="text-[13px] font-medium text-muted-foreground">{children}</div>
    {right}
  </div>
);
const Note = ({ tone, children }) => (
  <div className={cn('flex items-start gap-2 rounded-md px-2.5 py-1.5 text-xs leading-relaxed', tone === 'amber' ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200' : tone === 'red' ? 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300' : 'bg-muted text-muted-foreground')}>
    {children}
  </div>
);
const MiniLink = ({ t, tone, onOpen }) => (
  <button type="button" onClick={() => onOpen(t.id)}
    className={cn('group flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring', tone === 'red' && 'text-red-700 dark:text-red-400')}>
    <span className={cn('size-2 shrink-0 rounded-full', S[t.status].dot)} title={S[t.status].label} />
    <span className="truncate">{t.title}</span>
    <I.right className="ml-auto size-3.5 shrink-0 text-muted-foreground opacity-60 group-hover:opacity-100" />
  </button>
);
const CompactFile = ({ f, onPreview, onDownload, onRemove }) => (
  <div className="group flex h-9 items-center gap-2.5 rounded-md px-2 hover:bg-muted/60">
    <FileBadge kind={f.kind} className="h-6 w-5 rounded text-[7px]" />
    <button type="button" onClick={() => onPreview(f)} className="min-w-0 flex-1 truncate text-left text-sm hover:underline underline-offset-4 focus-visible:outline-none focus-visible:underline">{f.name}</button>
    <span className="tnum text-xs text-muted-foreground">{fmtSize(f.size)}</span>
    <button type="button" className={hoverAct} aria-label={`Download ${f.name}`} onClick={() => onDownload(f)}><I.download className="size-3.5" /></button>
    <button type="button" className={cn(hoverAct, danger)} aria-label={`Remove ${f.name}`} onClick={() => onRemove(f)}><I.x className="size-3.5" /></button>
  </div>
);

/* Where a task opens: a side panel, a centered window, full screen, or its own window. */
const OPEN_MODES = [
  { id: 'side', label: 'Side panel', icon: <I.panelRight className="size-3.5" /> },
  { id: 'center', label: 'Centered', icon: <I.panelCenter className="size-3.5" /> },
  { id: 'full', label: 'Full screen', icon: <I.maximize className="size-3.5" /> },
];
function SheetFrame({ mode, open, onClose, children, onPick }) {
  if (mode === 'window') return <div className="flex h-screen flex-col bg-background" role="main" aria-labelledby="sheet-title">{children}</div>;
  return <Sheet open={open} onClose={onClose} labelledBy="sheet-title" variant={mode} onPick={onPick}>{children}</Sheet>;
}

const FORM_KEYS = ['title', 'project', 'bucket', 'status', 'stage', 'assignee', 'deadline', 'description', 'priority', 'checklist'];
const formFrom = (task, stages) => ({
  title: task.title || '', project: task.project || '', bucket: task.bucket || '', status: S[task.status] ? task.status : 'todo', stage: stageOf(task, stages) ? task.stage : '',
  assignee: task.assignee || '', deadline: task.deadline || '', description: task.description || '', priority: task.priority || 'normal', checklist: task.checklist || [],
});

// Every change is saved automatically: choices right away, typing after a short pause.
function TaskSheet({ bucketMap = {}, bucketEnds = {}, oneAtATime, onPick, onAccept, onLinkExisting, labels = LABEL_DEFAULTS, buckets = [], mode = 'side', onMode, onPopOut, open, task, people, projects, stages = [], rules, defaultProject, defaultAssignee, dropRef, allTasks, onOpen, onPatch, onClose, onSave, onDelete, onDiscardEmpty, onToggle, onReset, storageOk, busy, onUpload, onAttach, onPreview, onDownload, onRemoveFile, onDiscard, members = null, teams = null }) {
  const [form, setForm] = useState(null);
  const titleRef = useRef(null);
  const pending = useRef({}), pendingId = useRef(null), timer = useRef(null), saveRef = useRef(onSave);
  saveRef.current = onSave;
  const commit = () => {
    clearTimeout(timer.current);
    const patch = pending.current; pending.current = {};
    if (Object.keys(patch).length && pendingId.current) saveRef.current(pendingId.current, patch);
  };
  useEffect(() => {
    commit(); // save anything still waiting for the task you were on
    if (open && task) {
      setForm(formFrom(task, stages));
      if (!task.title) setTimeout(() => titleRef.current && titleRef.current.focus(), 50);
    }
  }, [open, task?.id]);
  // Keep fields you're not editing in step with changes made elsewhere (automations, the table, the timer).
  useEffect(() => {
    if (!open || !task) return;
    const fresh = formFrom(task, stages);
    setForm(f => {
      if (!f) return f;
      const n = { ...f };
      FORM_KEYS.forEach(k => { if (!(k in pending.current)) n[k] = fresh[k]; });
      return n;
    });
  }, [task, stages]);
  useEffect(() => () => commit(), []);
  // Closed: still rendered (but not shown) so the panel can play its closing animation (0.19.14).
  if (!form || !task || (!open && mode === 'window')) return null;
  const change = (patch, debounce) => {
    setForm(f => ({ ...f, ...patch }));
    pendingId.current = task.id;
    Object.assign(pending.current, patch);
    clearTimeout(timer.current);
    if (debounce) timer.current = setTimeout(commit, 500); else commit();
  };
  const TYPED = ['title', 'description', 'bucket', 'project', 'assignee'];
  const set = k => v => change({ [k]: v && v.target ? v.target.value : v }, TYPED.includes(k));
  const isEmpty = () => !form.title.trim() && !form.description.trim() && !form.checklist.length && !(task.files || []).length;
  const close = () => {
    if (isEmpty()) { clearTimeout(timer.current); pending.current = {}; onDiscardEmpty(task.id); onClose(); return; }
    commit(); onClose();
  };
  const submit = e => { e && e.preventDefault(); close(); };
  const on = task && !!task.timerStartedAt;
  // Documents on a saved task are stored right away; on a new task they wait in the form until Save.
  const files = task ? (task.files || []) : (form.files || []);
  const addFiles = async fs => {
    const metas = await onUpload(fs);
    if (!metas.length) return;
    if (task) onAttach(task.id, metas); else setForm(f => ({ ...f, files: [...(f.files || []), ...metas] }));
  };
  const removeFile = f => {
    if (task) onRemoveFile(f, task.id);
    else { setForm(x => ({ ...x, files: x.files.filter(y => y.id !== f.id) })); onDiscard([f]); }
  };
  const cancel = close;
  // Files dropped onto the window while this sheet is open get attached here.
  if (dropRef) dropRef.current = addFiles;
  const chooseFiles = () => pickFiles().then(fs => { if (fs.length) addFiles(fs); });
  const inProgress = oneAtATime ? allTasks.filter(o => o.status === 'doing' && o.id !== task?.id) : [];
  const blocker = task?.status === 'blocked' && task.blockedBy ? allTasks.find(o => o.id === task.blockedBy) : null;
  const blocking = task ? allTasks.filter(o => o.status === 'blocked' && o.blockedBy === task.id) : [];
  const generatedFrom = task?.generatedFrom ? allTasks.find(o => o.id === task.generatedFrom) : null;
  const followUps = task ? allTasks.filter(o => o.generatedFrom === task.id) : [];
  const autoRules = rules.filter(r => r.enabled && r.project && norm(r.project) === norm(form.project) && r.trigger !== 'created' && !(r.action === 'copy' && (task?.followUps || {})[r.id]));
  const overdue = form.deadline && form.status !== 'done' && dayDiff(form.deadline) < 0;
  const doneCount = form.checklist.filter(c => c.done).length;
  const canUpload = storageOk !== false;

  return (
    <SheetFrame mode={mode} open={open} onClose={cancel} onPick={onPick && (id => { if (id === task.id) return; if (isEmpty()) { clearTimeout(timer.current); pending.current = {}; onDiscardEmpty(task.id); } else commit(); onPick(id); })}>
      <form onSubmit={submit} className="flex h-full min-h-0 flex-col" autoComplete="off"
        onKeyDown={e => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit(); return; }
          // Alt + a letter jumps to a field: Status, Bucket, platForm, deadLine, Priority, Assignee.
          const fid = e.altKey && !e.ctrlKey && !e.metaKey && { s: 't-status', b: 't-bucket', f: 't-project', l: 't-deadline', p: 't-priority', a: 't-assignee' }[e.code.replace('Key', '').toLowerCase()];
          const el = fid && document.getElementById(fid);
          if (!el) return;
          e.preventDefault(); e.stopPropagation(); el.focus();
          if (el.tagName === 'BUTTON' && fid !== 't-priority') el.click();
        }}>
        {/* Header */}
        <div className={cn('flex h-12 shrink-0 items-center gap-2 border-b px-3 text-xs text-muted-foreground', mode !== 'window' && 'pr-12')}>
          {mode !== 'window' && (
            <>
              <DropdownMenu align="start"
                trigger={p => <button {...p} type="button" aria-label="How tasks open" title="How tasks open" className="flex size-7 items-center justify-center rounded-md hover:bg-muted hover:text-foreground">{(OPEN_MODES.find(m => m.id === mode) || OPEN_MODES[0]).icon}</button>}
                items={[
                  { label: 'Open in new window', icon: <I.external />, onSelect: () => { commit(); onPopOut(); } },
                  'sep',
                  ...OPEN_MODES.map(m => ({ label: m.label, icon: m.icon, shortcut: mode === m.id ? '✓' : undefined, onSelect: () => onMode(m.id) })),
                ]} />
              <button type="button" onClick={() => { commit(); onPopOut(); }} aria-label="Open in new window" title="Open in new window"
                className="flex size-7 items-center justify-center rounded-md hover:bg-muted hover:text-foreground"><I.external className="size-3.5" /></button>
              <span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />
            </>
          )}
          <span id="sheet-title" className="text-sm font-medium text-foreground">{task.title || form.title ? 'Task' : 'New task'}</span>
          {task && <span className="shrink-0">Created {fmtDay(task.createdAt)}</span>}
          {generatedFrom && <span className="inline-flex shrink-0 items-center gap-1"><I.zap className="size-3" />Auto</span>}
        </div>

        {/* Body */}
        <div className={cn('relative flex-1 overflow-y-auto py-4', mode === 'side' ? 'px-3' : 'px-6')}>
          <div className={cn(mode !== 'side' && 'mx-auto w-full max-w-3xl')}>

          {task.inbox && (
            <div className="mx-2 mb-3 flex items-center gap-3 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-sm">
              <I.inbox className="size-4 shrink-0 text-blue-600 dark:text-blue-400" />
              <span className="min-w-0 flex-1">In your Inbox from quick capture. Accept it, or give it a {labels.platform.toLowerCase()}, to move it to Open.</span>
              {onAccept && <Button type="button" size="sm" onClick={() => { commit(); onAccept(task.id); }}>Accept</Button>}
            </div>
          )}

          <textarea ref={titleRef} rows={1} value={form.title} onChange={set('title')} placeholder="Task title" aria-label="Task title"
            onKeyDown={e => { if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) e.preventDefault(); }}
            style={{ fieldSizing: 'content' }}
            className="block w-full resize-none rounded-md border border-transparent px-2 py-1 text-lg font-semibold leading-snug placeholder:text-muted-foreground/60 hover:bg-muted/60 focus-visible:outline-none focus-visible:border-input focus-visible:bg-background ui-quiet" />

          {/* Properties */}
          <div className="mt-3 grid gap-0.5 px-2">
            <PropRow label={labels.status} htmlFor="t-status">
              <Select id="t-status" variant="ghost" value={form.stage ? `${form.status}|${form.stage}` : form.status}
                onChange={v => { const [st, sg] = v.split('|'); change({ status: st, stage: sg || '' }); }}
                options={statusList(stages).map(x => ({ value: x.builtin ? x.group : `${x.group}|${x.id}`, label: x.name, group: GROUP_HEAD[x.group], node: <DefPill def={x} /> }))} />
            </PropRow>
            <PropRow label={labels.priority}>
              <div role="radiogroup" aria-label="Priority" className="inline-flex rounded-md bg-muted p-0.5 ml-1">
                {['low', 'normal', 'high'].map(pid => (
                  <button key={pid} id={form.priority === pid ? 't-priority' : undefined} type="button" role="radio" aria-checked={form.priority === pid} onClick={() => set('priority')(pid)}
                    className={cn('inline-flex h-7 items-center gap-1 rounded px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                      form.priority === pid ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                    {pid === 'high' && <I.flag className={cn('size-3', form.priority === 'high' && 'text-red-600 dark:text-red-400')} />}{P[pid].label}
                  </button>
                ))}
              </div>
            </PropRow>
            <PropRow label={labels.assignee} htmlFor="t-assignee">
              {members ? (
                // In a team (0.20): pick a member. Type to find someone by name, role or team.
                <Select id="t-assignee" variant="ghost" value={(memberFor(form.assignee, members) || {}).name || form.assignee} placeholder="Add assignee" searchable
                  onChange={v => change({ assignee: v })}
                  options={[{ value: '', label: 'Unassigned' }, ...(form.assignee && !memberFor(form.assignee, members) ? [{ value: form.assignee, label: form.assignee }] : []),
                    ...members.map(m => ({ value: m.name, label: m.name, search: peopleMeta[m.name] || '', icon: <Avatar name={m.name} className="h-5 w-5 [&_span]:text-[9px]" /> }))]} />
              ) : <Combobox id="t-assignee" value={form.assignee} onChange={set('assignee')} options={people} placeholder="Add assignee" hideIcon inputClassName={ghostField} />}
            </PropRow>
            {teams && (
              <PropRow label="Teams" htmlFor="t-teams">
                <Select id="t-teams" variant="ghost" multiple value={(task && task.teams) || []} placeholder="Add teams" searchable={false} renderValue={sel => <span className="truncate">{sel.map(o => o.label).join(', ')}</span>}
                  onChange={v => change({ teams: v })} options={teams.map(t => ({ value: t.id, label: t.name }))} />
              </PropRow>
            )}
            <PropRow label={labels.bucket} htmlFor="t-bucket">
              <Combobox id="t-bucket" value={form.bucket} onChange={set('bucket')} options={buckets} placeholder={`Add ${labels.bucket.toLowerCase()}`} hideIcon inputClassName={ghostField}
                createLabel={v => `Use “${v}”`} icon={() => <I.layers className="text-muted-foreground" />} />
            </PropRow>
            {task && task.bucket && joinedLate(task, bucketMap[norm(task.bucket)]) && (() => {
              const b = bucketMap[norm(task.bucket)], cur = task.addedReason === 'planned' ? 'planned' : (AR[task.addedReason] ? task.addedReason : '');
              return (
                <PropRow label="Added later" htmlFor="t-reason">
                  <div className="flex min-w-0 items-center gap-2">
                    <Select id="t-reason" variant="ghost" value={cur} onChange={v => change({ addedReason: v })} searchable={false} className="!w-auto shrink-0"
                      renderValue={o => o.value ? o.node : <span className="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-300"><I.alert className="size-3.5" />Why was it added?</span>}
                      options={[
                        { value: '', label: 'No reason yet', node: <span className="text-muted-foreground">No reason yet</span> },
                        ...ADD_REASONS.map(r => ({ value: r.id, label: r.label, group: 'Reason', node: <span className="inline-flex items-center gap-1.5"><span className={cn('size-2 rounded-full', r.dot)} />{r.label}</span> })),
                        { value: 'planned', label: 'Part of the plan', group: 'Not added scope', node: <span className="inline-flex items-center gap-1.5 text-muted-foreground"><I.check className="size-3.5" />Part of the plan</span> },
                      ]} />
                    <span className="truncate text-xs text-muted-foreground" title={`Joined ${b.name} on ${fmtDay(joinedAt(task))}, after it started on ${shortDate(b.start)}`}>
                      {cur === 'planned' ? 'Not counted as added' : `joined ${fmtDay(joinedAt(task))}, after ${b.name} started`}
                    </span>
                  </div>
                </PropRow>
              );
            })()}
            <PropRow label={labels.platform} htmlFor="t-project">
              <Combobox id="t-project" value={form.project} onChange={set('project')} options={projects} placeholder={`Add ${labels.platform.toLowerCase()}`} hideIcon inputClassName={ghostField}
                createLabel={v => `Use “${v}”`} icon={v => <PIcon name={v} className="text-muted-foreground" />} />
            </PropRow>
            <PropRow label={labels.deadline} htmlFor="t-deadline">
              {bucketEnds[norm(form.bucket)] ? (() => {
                const lock = bucketEnds[norm(form.bucket)], val = form.deadline && form.deadline <= lock.end ? form.deadline : lock.end, own = val !== lock.end;
                return (
                  <div className="flex min-w-0 items-center gap-1" title={lockText(lock, labels.bucket, own)}>
                    <DatePicker id="t-deadline" value={val} onChange={set('deadline')} variant="ghost" icon={false} max={lock.end}
                      note={lockNote(lock, labels.bucket)} resetLabel={`${labels.bucket} end`} onReset={() => set('deadline')('')}
                      format={{ weekday: 'short', month: 'short', day: 'numeric' }}
                      className={cn('h-8 !w-auto shrink-0 px-2 hover:bg-muted', overdue && 'text-red-600 dark:text-red-400 font-medium')} />
                    <span className="truncate text-xs text-muted-foreground">{own ? `before ${form.bucket} ends ${dueDate(lock.end)}` : `${form.bucket} end`}</span>
                  </div>
                );
              })() : (
              <DatePicker id="t-deadline" value={form.deadline} onChange={set('deadline')} variant="ghost" icon={false} placeholder="Add deadline"
                format={{ weekday: 'short', month: 'short', day: 'numeric' }}
                className={cn('h-8 px-2 hover:bg-muted', overdue && 'text-red-600 dark:text-red-400 font-medium')} />
              )}
            </PropRow>
            {task && (
              <PropRow label={labels.time}>
                <div className="flex items-center gap-1 pl-2">
                  <span className={cn('tnum min-w-[4.5rem] text-sm font-medium', on && 'text-emerald-600 dark:text-emerald-400')}>{<Elapsed task={task} />}</span>
                  <Button size="sm" variant={on ? 'default' : 'outline'} className="h-7 px-2.5" onClick={() => onToggle(task.id)}>
                    {on ? <><I.pause className="size-3" />Pause</> : <><I.play className="size-3" />Start</>}
                  </Button>
                  {elapsed(task) > 0 && <button type="button" onClick={() => onReset(task.id)} aria-label="Reset timer" className={cn(hoverAct, 'opacity-100')}><I.reset className="size-3.5" /></button>}
                </div>
              </PropRow>
            )}
            {blocker && <PropRow label="Blocked by"><MiniLink t={blocker} tone="red" onOpen={onOpen} /></PropRow>}
            {blocking.length > 0 && <PropRow label="Blocking"><div className="grid">{blocking.map(b => <MiniLink key={b.id} t={b} onOpen={onOpen} />)}</div></PropRow>}
            {generatedFrom && <PropRow label="Copied from"><MiniLink t={generatedFrom} onOpen={onOpen} /></PropRow>}
            {followUps.length > 0 && <PropRow label="Follow-ups"><div className="grid">{followUps.map(f => <MiniLink key={f.id} t={f} onOpen={onOpen} />)}</div></PropRow>}
          </div>

          {/* Heads-ups */}
          {((form.status === 'doing' && task?.status !== 'doing' && inProgress.length > 0) || (blocker && form.status !== 'blocked') || (autoRules.length > 0 && form.status !== 'done')) && (
            <div className="mt-3 grid gap-1.5 px-2">
              {form.status === 'doing' && task?.status !== 'doing' && inProgress.length > 0 && (
                <Note tone="amber"><I.flag className="mt-0.5 size-3 shrink-0" />
                  <span>This blocks {inProgress.length === 1 ? `“${inProgress[0].title}”` : `${inProgress.length} in-progress tasks`}.</span></Note>
              )}
              {blocker && form.status !== 'blocked' && <Note><I.x className="mt-0.5 size-3 shrink-0" /><span>This removes the blocker.</span></Note>}
              {autoRules.length > 0 && form.status !== 'done' && (
                <Note><I.zap className="mt-0.5 size-3 shrink-0" /><span>{autoRules.slice(0, 2).map(r => `${(TRIG[r.trigger] || { short: 'Automation' }).short}: ${(ACT[r.action] || { label: '' }).label} ${targetText(r)}.`).join(' ')}{autoRules.length > 2 ? ` And ${autoRules.length - 2} more.` : ''}</span></Note>
              )}
            </div>
          )}

          {/* Description */}
          <div className="mt-5">
            <SectionHead>Description</SectionHead>
            <textarea id="t-desc" value={form.description} onChange={set('description')} placeholder="Add details, links or acceptance criteria…" aria-label="Description"
              style={{ fieldSizing: 'content', minHeight: '4.5rem', maxHeight: '45vh' }}
              className="block w-full resize-none rounded-md border border-transparent px-2 py-1.5 text-sm leading-relaxed placeholder:text-muted-foreground hover:bg-muted/60 focus-visible:outline-none focus-visible:border-input focus-visible:bg-background ui-quiet" />
          </div>

          {/* Checklist */}
          <div className="mt-4">
            <SectionHead right={form.checklist.length > 0 && <span className="tnum text-xs text-muted-foreground">{doneCount}/{form.checklist.length}</span>}>Checklist</SectionHead>
            <Checklist items={form.checklist} onChange={list => { setForm(f => ({ ...f, checklist: list })); if (task) onPatch(task.id, { checklist: list }); }} />
          </div>

          {/* Documents */}
          <div className="mt-4">
            <SectionHead right={canUpload && (
              <DropdownMenu
                trigger={p => (
                  <button {...p} type="button" disabled={busy}
                    className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50">
                    <I.paperclip className="size-3.5" />{busy ? 'Adding…' : 'Attach'}<I.down className="size-3" />
                  </button>
                )}
                items={[
                  { label: 'Upload new files', icon: <I.upload />, onSelect: chooseFiles },
                  { label: 'Choose from Documents', icon: <I.file />, onSelect: () => { if (task) onLinkExisting(task.id); } },
                ]} />
            )}>Documents{files.length > 0 && <span className="ml-1 font-normal">({files.length})</span>}</SectionHead>
            {files.map(f => <CompactFile key={f.id} f={f} onPreview={onPreview} onDownload={onDownload} onRemove={removeFile} />)}
            {files.length === 0 && (canUpload
              ? <button type="button" onClick={chooseFiles} className="flex h-9 w-full items-center gap-2 rounded-md border border-dashed px-3 text-left text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground">
                  <I.upload className="size-3.5" />Drag files here, or choose files
                </button>
              : <p className="px-2 text-xs text-muted-foreground">File storage isn’t available in this view.</p>)}
          </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center gap-2 border-t px-4 py-2.5">
          {task && <Button variant="ghost" size="icon-sm" className={cn("text-muted-foreground", danger)} onClick={onDelete} aria-label="Delete task"><I.trash /></Button>}
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><I.check className="size-3.5" />Changes save automatically</span>
          <div className="flex-1" />
          <Button type="submit" variant="outline" size="sm">Close</Button>
        </div>
      </form>
    </SheetFrame>
  );
}

function Checklist({ items, onChange }) {
  const [text, setText] = useState('');
  const [editing, setEditing] = useState(null); // { id, value }
  const add = () => { const v = text.trim(); if (!v) return; onChange([...items, { id: newId(), text: v, done: false }]); setText(''); };
  // Click an item's text to edit it. Enter or clicking away saves, Esc cancels, and clearing it removes the item.
  const saveEdit = () => {
    if (!editing) return;
    const v = editing.value.trim(), cur = items.find(x => x.id === editing.id);
    setEditing(null);
    if (!cur || v === cur.text) return;
    onChange(v ? items.map(x => x.id === editing.id ? { ...x, text: v } : x) : items.filter(x => x.id !== editing.id));
  };
  return (
    <div className="grid">
      {items.map(it => (
        <div key={it.id} className="group flex min-h-8 items-center gap-2.5 rounded-md px-2 hover:bg-muted/60">
          <Checkbox checked={it.done} label={it.text} onChange={v => onChange(items.map(x => x.id === it.id ? { ...x, done: v } : x))} />
          {editing && editing.id === it.id ? (
            <input autoFocus value={editing.value} aria-label="Edit checklist item"
              onChange={e => setEditing({ id: it.id, value: e.target.value })}
              onFocus={e => { const n = e.target.value.length; e.target.setSelectionRange(n, n); }}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); saveEdit(); }
                if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setEditing(null); }
              }}
              onBlur={saveEdit}
              className="-mx-1 h-7 min-w-0 flex-1 rounded border px-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ui-field" />
          ) : (
            <span role="button" tabIndex={0} title="Click to edit"
              onClick={() => setEditing({ id: it.id, value: it.text })}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); setEditing({ id: it.id, value: it.text }); } }}
              className={cn('-mx-1 flex-1 cursor-text rounded px-1 py-1 text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring', it.done && 'text-muted-foreground line-through')}>{it.text}</span>
          )}
          <button type="button" className={cn(hoverAct, 'h-6 w-6', danger)} aria-label={`Remove ${it.text}`}
            onClick={() => onChange(items.filter(x => x.id !== it.id))}><I.x className="size-3.5" /></button>
        </div>
      ))}
      <div className="flex h-8 items-center gap-2.5 px-2">
        <I.plus className="text-muted-foreground" />
        <input value={text} onChange={e => setText(e.target.value)} placeholder="Add item" aria-label="Add checklist item"
          className="h-8 min-w-0 flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus-visible:outline-none"
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} onBlur={add} />
      </div>
    </div>
  );
}

function TimeSummary({ tasks, onHide }) {
  const now = Date.now();
  const d0 = new Date(); d0.setHours(0, 0, 0, 0);
  const today = d0.getTime();
  const w = new Date(d0); w.setDate(w.getDate() - ((w.getDay() + 6) % 7));
  const week = w.getTime();
  let todayMs = 0, weekMs = 0; const byProject = {};
  tasks.forEach(t => {
    todayMs += trackedIn(t, today, now);
    const wm = trackedIn(t, week, now);
    weekMs += wm;
    if (wm) { const k = t.project || 'No project'; byProject[k] = (byProject[k] || 0) + wm; }
  });
  const rows = Object.entries(byProject).sort((a, b) => b[1] - a[1]);
  const tile = 'flex min-w-0 flex-col gap-3 rounded-xl border px-4 py-3.5 ui-card';
  const big = 'tnum text-[22px] font-semibold leading-tight tracking-tight';
  const btn = 'flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';
  return (
    <div className="mt-6 grid grid-cols-[repeat(auto-fit,minmax(14rem,1fr))] gap-2.5">
      <div className={cn(tile, 'justify-between')}>
        <div className="-my-1 -mr-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <I.timer className="size-3.5" /><span className="flex-1">Tracked</span>
          <span className="group/tip relative flex">
            <button type="button" aria-label="About the time summary" className={btn}><I.info className="size-3.5" /></button>
            <span role="tooltip" className="pointer-events-none absolute right-0 top-full z-10 mt-1.5 w-56 rounded-md bg-foreground px-2.5 py-1.5 text-xs leading-snug text-background opacity-0 transition-opacity group-hover/tip:opacity-100 group-focus-within/tip:opacity-100">
              Time from your timers. Each tile shows this week for one platform.
            </span>
          </span>
          <button type="button" onClick={onHide} aria-label="Hide time summary" title="Hide time summary" className={btn}><I.x className="size-3.5" /></button>
        </div>
        <div className="flex gap-6">
          <div><div className="text-xs text-muted-foreground">Today</div><div className={big}>{fmtShort(todayMs)}</div></div>
          <div><div className="text-xs text-muted-foreground">This week</div><div className={big}>{fmtShort(weekMs)}</div></div>
        </div>
      </div>
      {rows.map(([name, ms]) => {
        const pct = weekMs ? Math.round(ms / weekMs * 100) : 0;
        return (
          <div key={name} className={tile}>
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex size-[26px] shrink-0 items-center justify-center rounded-md bg-muted text-foreground"><PIcon name={name} className="size-3.5" /></span>
              <span className="truncate text-sm font-medium">{name}</span>
              <span className="tnum ml-auto text-xs text-muted-foreground">{pct}%</span>
            </div>
            <div className={big}>{fmtShort(ms)}</div>
            <div className="h-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(3, pct)}%` }} /></div>
          </div>
        );
      })}
      {rows.length === 0 && (
        <div className={cn(tile, 'justify-center text-sm text-muted-foreground')}>Start a timer on any task to see time per platform.</div>
      )}
    </div>
  );
}

const SHORTCUTS = [['Command palette', 'Ctrl + K'], ['Quick add (in the app)', '`'], ['Quick capture (anywhere in Windows)', 'Ctrl + Shift + Space'], ['Undo / redo', 'Ctrl + Z / Ctrl + Shift + Z'], ['New task, bucket or document (on that page)', 'N'], ['Search tasks', '/'], ['Switch light and dark mode', 'Shift + D'], ['Clear search or close a panel', 'Esc'], ['Show this list', '?']];
function ShortcutsDialog({ open, onClose }) {
  return (
    <Dialog open={open} onClose={onClose} title="Keyboard shortcuts">
      <div className="grid">
        {SHORTCUTS.map(([what, key]) => (
          <div key={key} className="flex items-center justify-between border-b py-2.5 text-sm last:border-0">
            <span>{what}</span><Kbd className="h-6 px-2 text-xs">{key}</Kbd>
          </div>
        ))}
      </div>
    </Dialog>
  );
}

/* Automations (0.19.12): grouped by what sets them off. Each group's heading is the event
   ("When a task in Any project becomes overdue"), and each thing it does is a line under it.
   Every word in a box is a dropdown. Grouping is only how the list is shown: rules are stored
   and synced exactly as before, one rule per action. Changing a heading changes every rule in it.
   0.19.14: the heading can carry the trigger's own words (statuses, hours, days…) and "Only if" lines,
   which belong to the heading too, so they're kept on every rule of the group. */
const TRIGGER_ICON = { created: 'plus', started: 'play', blocked: 'ban', unblocked: 'refresh', done: 'check', reopened: 'reset', due_soon: 'calendar', overdue: 'alert', checklist: 'listCheck', assigned: 'user', high: 'flag', file_added: 'paperclip', moved: 'arrowRight',
  timer_started: 'play', timer_paused: 'pause', timer_long: 'timer', status_to: 'circleDot', status_from: 'circleDot', priority_to: 'flag', assigned_to: 'user', deadline_changed: 'calendar', bucket_added: 'layers', due_in: 'calendar', stale: 'loader', bucket_moved: 'layers' };
const ruleGroupKey = r => r.scope === 'bucket' ? `b|${r.status}` : `t|${norm(r.project)}|${r.trigger}|${JSON.stringify(r.when || null)}|${JSON.stringify(r.only || [])}`;
// A box you can type in, sized to its text, that sits in a sentence next to the dropdown words.
const WordInput = ({ value, onChange, placeholder, label, className }) => (
  <input value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} aria-label={label}
    style={{ width: `calc(${Math.min(Math.max(String(value || '').length, (placeholder || '').length, 4), 30)}ch + 1.25rem)` }}
    className={cn('h-7 max-w-full rounded-md border border-border px-2 text-[13px] text-foreground placeholder:text-muted-foreground transition-colors hover:border-foreground/20 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ui-fill', className)} />
);
const MULTI_WORD = 'h-auto min-h-7 max-w-full py-[3px]';
function AutomationsDialog({ open, onClose, rules, projects, people, me, stages = [], buckets = [], onSave, onOpenNotifications, bucketNoun = 'Bucket' }) {
  // Notifications live in Settings since 0.19.13. They're still rules, kept out of this list and saved back untouched.
  const isNote = r => r.action === 'notify' && r.scope !== 'bucket';
  const [draft, setDraft] = useState(() => rules.filter(r => !isNote(r)));
  useEffect(() => { if (open) setDraft(rules.filter(r => !isNote(r))); }, [open]);
  const bnoun = bucketNoun.toLowerCase();
  const upd = (id, patch) => setDraft(d => d.map(r => r.id === id ? { ...r, ...patch } : r));
  const updGroup = (g, patch) => { const ids = new Set(g.rules.map(r => r.id)); setDraft(d => d.map(r => ids.has(r.id) ? { ...r, ...patch } : r)); };
  const removeIds = ids => setDraft(d => d.filter(r => !ids.includes(r.id)));
  const problem = r => {
    if (r.scope === 'bucket') return (r.title || '').trim() ? null : 'Type a title for the task.';
    const a = ACT[r.action] || {};
    if (a.target !== 'none' && !a.optional && (!r.target || !String(r.target).trim())) return a.target === 'text' ? 'Type the checklist items.' : 'Choose what to set.';
    if ((r.action === 'copy' || r.action === 'move') && r.project && norm(r.project) === norm(r.target)) return 'Pick a different project than the one the task is in.';
    return null;
  };
  // Problems with the heading or its "Only if" lines, shown once under the heading.
  const groupProblem = f => {
    if (f.scope === 'bucket') return null;
    const arg = (TRIG[f.trigger] || {}).arg, w = f.when || {};
    if (arg === 'statuses' && !(w.statuses || []).length) return 'Pick at least one status.';
    if ((f.only || []).some(c => c.field === 'status' && !(c.value || []).length)) return 'Pick a status for “Only if”, or remove it.';
    return null;
  };
  const valid = draft.every(r => !problem(r) && !groupProblem(r));
  const helpPlatform = projects.find(p => /help/i.test(p)) || '';
  const bucketRule = (status = 'ready') => ({ scope: 'bucket', trigger: 'bucket_status', status, action: 'create', title: '{bucket}', target: helpPlatform, assignee: '', days: '7' });
  const statusOptions = statusList(stages).map(x => ({ value: statusKeyOf(x), label: x.name, group: GROUP_HEAD[x.group], node: <DefPill def={x} /> }));
  // "Waiting" statuses for the idea: Blocked plus your own review or ready ones.
  const waiting = ['blocked', ...statusList(stages).filter(x => !x.builtin && /review|ready|wait/i.test(x.name || '')).map(statusKeyOf)];
  const ideas = [
    { title: 'In progress when the timer starts', text: 'Move a To do task to In progress when you start its timer.', rule: { trigger: 'timer_started', action: 'status', target: 'doing', only: [{ field: 'status', op: 'is', value: ['todo'] }] } },
    { title: 'Pause the timer while waiting', text: 'Pause the timer when a task moves to Blocked or a review status.', rule: { trigger: 'status_to', when: { statuses: waiting }, action: 'stop_timer', target: '' } },
    { title: 'Catch forgotten timers', text: 'Pause a timer that has run for 4 hours.', rule: { trigger: 'timer_long', when: { hours: '4' }, action: 'stop_timer', target: '' } },
    { title: 'Nudge stuck work', text: 'Make a task High priority when it has been In progress for 3 days.', rule: { trigger: 'stale', when: { status: 'doing', days: '3' }, action: 'priority', target: 'high' } },
    { title: `Hand off when ${bnoun} is ready`, text: `Create a task for the ${bnoun} when it moves to ${BS.ready ? BS.ready.label : 'Ready for dev'}.`, rule: bucketRule('ready') },
    { title: 'Finish tasks automatically', text: 'Mark a task done when its checklist is finished.', rule: { trigger: 'checklist', action: 'status', target: 'done' } },
    { title: 'Flag overdue work', text: 'Make a task High priority when it becomes overdue.', rule: { trigger: 'overdue', action: 'priority', target: 'high' } },
    { title: 'Assign new tasks to me', text: 'Every new task starts assigned to you.', rule: { trigger: 'created', action: 'assign', target: me } },
    { title: 'Claim what you start', text: 'Assign a task to you when its timer starts.', rule: { trigger: 'timer_started', action: 'assign', target: me } },
    { title: 'Give new tasks a deadline', text: 'New tasks without a date are due in a week.', rule: { trigger: 'created', action: 'deadline', target: '7' } },
    { title: 'Start with a checklist', text: 'Add Brief, Design and Review to every new task.', rule: { trigger: 'created', action: 'checklist', target: 'Brief, Design, Review' } },
    { title: 'Reopened work goes to the top', text: 'Make a task High priority when it’s reopened.', rule: { trigger: 'reopened', action: 'priority', target: 'high' } },
  ].filter(i => !draft.some(r => !r.project && r.trigger === i.rule.trigger && r.action === i.rule.action && (i.rule.scope === 'bucket' ? r.status === i.rule.status : r.target === i.rule.target)));
  const add = (rule = {}) => setDraft(d => [...d, { id: 'r-' + newId(), enabled: true, project: '', trigger: 'done', action: 'copy', target: '', ...rule }]);
  // Groups, in the order their first rule appears.
  const groups = [];
  { const byKey = {}; draft.forEach(r => { const k = ruleGroupKey(r); if (!byKey[k]) groups.push(byKey[k] = { key: k, rules: [] }); byKey[k].rules.push(r); }); }
  const usedTrigger = id => draft.some(r => r.scope !== 'bucket' && !r.project && r.trigger === id);
  const usedGroup = k => groups.some(g => g.key === k);
  // A new task automation starts on an event that isn't in the list yet, so it gets its own group.
  const addTask = () => { const t = TRIGGERS.find(x => !x.hidden && !usedTrigger(x.id)) || TRIGGERS[0]; add({ trigger: t.id, when: defaultWhen(t.id), action: 'priority', target: 'high' }); };
  const addBucket = () => { const s = BUCKET_STATUSES.find(x => !usedGroup(`b|${x.id}`)) || BUCKET_STATUSES[0]; add(bucketRule(s.id)); };
  const addToGroup = g => {
    const f = g.rules[0];
    if (f.scope === 'bucket') return add(bucketRule(f.status));
    const free = ACTIONS.find(a => a.id !== 'notify' && !g.rules.some(r => r.action === a.id)) || ACTIONS[0];
    add({ project: f.project, trigger: f.trigger, ...(f.when ? { when: f.when } : {}), ...(f.only && f.only.length ? { only: f.only } : {}), action: free.id, target: '' });
  };
  const projectOptions = (none = 'Any project') => [
    { value: '', label: none },
    ...projects.map(p => ({ value: p, label: p, icon: <PIcon name={p} className="size-3.5 text-muted-foreground" /> })),
  ];
  // Typing a name that isn't on any task yet offers it, as the old person box did.
  const newPerson = v => ({ value: v, label: `Assign to “${v}”`, icon: <Avatar name={v} className="h-5 w-5" /> });
  const peopleOptions = v => [...new Set([...(people || []), ...(v ? [v] : [])])].map(p => ({ value: p, label: p, icon: <Avatar name={p} className="h-5 w-5" /> }));
  const priorityOptions = ['high', 'normal', 'low'].map(x => ({ value: x, label: P[x].label, node: <PriorityPill priority={x} /> }));
  const bucketOptions = v => [...new Set([...buckets, ...(v ? [v] : [])])].map(b => ({ value: b, label: b, icon: <I.layers className="size-3.5 text-muted-foreground" /> }));
  const targetField = r => {
    const kind = (ACT[r.action] || ACT.copy).target;
    const setT = v => upd(r.id, { target: v });
    if (kind === 'project') return <Select variant="word" label="Project" value={r.target} onChange={setT} placeholder="a project" options={projectOptions().slice(1)} />;
    if (kind === 'status') return <Select variant="word" label="Status" value={r.target} onChange={setT} placeholder="a status" searchable={false} options={statusOptions} />;
    if (kind === 'priority') return <Select variant="word" label="Priority" value={r.target} onChange={setT} placeholder="a priority" searchable={false} options={priorityOptions} />;
    if (kind === 'days') return <Select variant="word" label="Deadline" value={r.target} onChange={setT} placeholder="a date" searchable={false}
      options={DEADLINE_OPTIONS.map(([v, l]) => ({ value: v, label: l }))} />;
    if (kind === 'bucket') return <Select variant="word" label={bucketNoun} value={r.target} onChange={setT} placeholder={`a ${bnoun}`} searchable options={bucketOptions(r.target)}
      creatable={v => ({ value: v, label: `Move to “${v}”`, icon: <I.plus className="size-3.5 text-muted-foreground" /> })} />;
    if (kind === 'text') return <WordInput value={r.target} onChange={setT} placeholder={r.action === 'notify' ? 'Message (optional)' : 'Brief, Design, Review'} label={r.action === 'notify' ? 'Message' : 'Checklist items'} />;
    if (kind === 'none') return null;
    return <Select variant="word" label="Person" value={r.target} onChange={setT} placeholder="someone" searchable options={peopleOptions(r.target)} creatable={newPerson} />;
  };
  // The trigger's own words, after it in the heading.
  const whenFields = (g, f) => {
    const arg = (TRIG[f.trigger] || {}).arg; if (!arg) return null;
    const w = f.when || defaultWhen(f.trigger) || {};
    const setW = patch => updGroup(g, { when: { ...w, ...patch } });
    const opts = list => list.map(([v, l]) => ({ value: v, label: l }));
    if (arg === 'statuses') return <Select variant="word" multiple className={MULTI_WORD} label="Statuses" value={w.statuses || []} onChange={v => setW({ statuses: v })} placeholder="a status" searchable={false}
      options={statusOptions} footer={() => <div className="px-2 py-1 text-xs text-muted-foreground">Pick one or more.</div>} />;
    if (arg === 'hours') return <Select variant="word" label="Hours" value={w.hours} onChange={v => setW({ hours: v })} searchable={false} options={opts(HOUR_OPTIONS)} />;
    if (arg === 'days') return <Select variant="word" label="Days" value={w.days} onChange={v => setW({ days: v })} searchable={false} options={opts(DUE_IN_OPTIONS)} />;
    if (arg === 'stale') return <>
      <Select variant="word" label="Status" value={w.status} onChange={v => setW({ status: v })} placeholder="a status" searchable={false} options={statusOptions} />
      <span>for</span>
      <Select variant="word" label="Days" value={w.days} onChange={v => setW({ days: v })} searchable={false} options={opts(STALE_OPTIONS)} />
    </>;
    if (arg === 'priority') return <Select variant="word" label="Priority" value={w.priority} onChange={v => setW({ priority: v })} searchable={false} options={priorityOptions} />;
    if (arg === 'person') return <Select variant="word" label="Person" value={w.person || ''} onChange={v => setW({ person: v })} searchable creatable={newPerson}
      options={[{ value: '', label: 'anyone' }, ...peopleOptions(w.person)]} />;
    if (arg === 'bstatus') return <Select variant="word" label={`${bucketNoun} status`} value={w.bstatus} onChange={v => setW({ bstatus: v })} searchable={false}
      options={BUCKET_STATUSES.map(x => ({ value: x.id, label: x.label, node: <BucketStatusPill status={x.id} /> }))} />;
    return null;
  };
  const condValue = (c, setC) => {
    if (c.field === 'timer') return null;
    if (c.field === 'status') return <Select variant="word" multiple className={MULTI_WORD} label="Statuses" value={Array.isArray(c.value) ? c.value : []} onChange={v => setC({ value: v })} placeholder="a status" searchable={false}
      options={statusOptions} footer={() => <div className="px-2 py-1 text-xs text-muted-foreground">Pick one or more.</div>} />;
    if (c.field === 'priority') return <Select variant="word" label="Priority" value={c.value} onChange={v => setC({ value: v })} searchable={false} options={priorityOptions} />;
    return <Select variant="word" label="Person" value={c.value || ''} onChange={v => setC({ value: v })} searchable creatable={newPerson}
      options={[{ value: '', label: 'nobody' }, ...peopleOptions(c.value)]} />;
  };
  const rowBtn = 'flex items-center gap-2 py-2 text-[13px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring';
  const onCount = draft.filter(r => r.enabled).length;
  return (
    <Dialog open={open} onClose={onClose} title="Automations" className="max-w-3xl"
      description={<>Click any word in a box to change it. Notifications are in <button type="button" onClick={onOpenNotifications} className="underline underline-offset-4 hover:text-foreground">Settings</button>.</>}
      footer={<>
        {draft.length > 0 && <span className="mr-auto self-center text-sm text-muted-foreground">{onCount} of {draft.length} on</span>}
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button disabled={!valid} onClick={() => onSave([...draft.map(r => ({ ...r, target: String(r.target || '').trim(), ...(r.only && !r.only.length ? { only: undefined } : {}) })), ...rules.filter(isNote)])}>Save automations</Button>
      </>}>
      <div className="grid gap-3">
        {draft.length === 0 && <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No automations yet. Add one, or start from an idea below.</p>}
        {groups.map(g => {
          const f = g.rules[0], isBucket = f.scope === 'bucket';
          const Icon = isBucket ? I.layers : (I[TRIGGER_ICON[f.trigger]] || I.zap);
          const only = f.only || [], gErr = groupProblem(f);
          const setOnly = list => updGroup(g, { only: list.length ? list : undefined });
          return (
            <div key={g.key} className="overflow-hidden rounded-lg border ui-inset">
              <div className="flex items-center gap-3 bg-muted/50 py-2 pl-3.5 pr-2">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent text-muted-foreground"><Icon className="size-3.5" /></span>
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
                  {isBucket ? <>
                    <span>When a {bnoun} moves to</span>
                    <Select variant="word" label={`${bucketNoun} status`} value={f.status} onChange={v => updGroup(g, { status: v })} searchable={false}
                      options={BUCKET_STATUSES.map(x => ({ value: x.id, label: x.label, node: <BucketStatusPill status={x.id} /> }))} />
                  </> : <>
                    <span>When a task in</span>
                    <Select variant="word" label="Project" value={f.project} onChange={v => updGroup(g, { project: v })} options={projectOptions()} />
                    <Select variant="word" label="When the task" value={f.trigger} onChange={v => updGroup(g, { trigger: v, when: defaultWhen(v) })} searchable={false} menuClassName="min-w-[16rem]"
                      options={TRIGGERS.filter(t => !t.hidden || t.id === f.trigger).map(t => ({ value: t.id, label: (t.menu || t.label) + (t.arg ? ' …' : ''), group: t.group }))}
                      renderValue={o => <span className="truncate">{(TRIG[o.value] || {}).label || o.label}</span>} />
                    {whenFields(g, f)}
                  </>}
                </div>
                <Button variant="ghost" size="icon-sm" className={cn("text-muted-foreground", danger)} aria-label={g.rules.length > 1 ? `Delete these ${g.rules.length} automations` : 'Delete automation'} title="Delete" onClick={() => removeIds(g.rules.map(r => r.id))}><I.trash /></Button>
              </div>
              {gErr && <p className="border-t px-3.5 py-1.5 pl-[3.25rem] text-[0.8rem] text-destructive">{gErr}</p>}
              {only.map((c, i) => {
                const setC = patch => setOnly(only.map((x, j) => j === i ? { ...x, ...patch } : x));
                const def = COND[c.field] || COND_FIELDS[0];
                return (
                  <div key={i} className="flex items-center gap-3 border-t bg-muted/25 py-2 pl-3.5 pr-2">
                    <span className="w-7 shrink-0 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{i ? 'and' : 'if'}</span>
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-muted-foreground">
                      <span>{def.label}</span>
                      <Select variant="word" label="Is or is not" value={c.op} onChange={v => setC({ op: v })} searchable={false} options={def.ops.map(([v, l]) => ({ value: v, label: l }))} />
                      {condValue(c, setC)}
                    </div>
                    <Button variant="ghost" size="icon-sm" className={cn("text-muted-foreground", danger)} aria-label="Remove this condition" title="Remove" onClick={() => setOnly(only.filter((_, j) => j !== i))}><I.x /></Button>
                  </div>
                );
              })}
              {g.rules.map(r => {
                const err = problem(r);
                return (
                  <div key={r.id} className="border-t py-2 pl-3.5 pr-2">
                    <div className="flex items-center gap-3">
                      <span aria-hidden="true" className="w-7 shrink-0 text-center text-sm text-muted-foreground/60">↳</span>
                      <div className={cn('flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-muted-foreground transition-opacity', !r.enabled && 'opacity-50')}>
                        {isBucket ? <>
                          <span>create</span>
                          <WordInput value={r.title} onChange={v => upd(r.id, { title: v })} placeholder="{bucket}" label="Task title" />
                          <span>in</span>
                          <Select variant="word" label="Platform" value={r.target || ''} onChange={v => upd(r.id, { target: v })} options={projectOptions('No platform')} />
                          <span>for</span>
                          <Select variant="word" label="Assign to" value={r.assignee || ''} onChange={v => upd(r.id, { assignee: v })} searchable creatable={newPerson}
                            options={[{ value: '', label: 'Nobody' }, ...peopleOptions(r.assignee)]} />
                          <span>due</span>
                          <Select variant="word" label="Due" value={r.days || 'none'} onChange={v => upd(r.id, { days: v })} searchable={false}
                            options={DEADLINE_OPTIONS.map(([v, l]) => ({ value: v, label: l }))} />
                        </> : <>
                          <Select variant="word" label="Then" value={r.action} onChange={v => upd(r.id, { action: v, target: '' })} searchable={false}
                            options={ACTIONS.filter(a => a.id !== 'notify').map(a => ({ value: a.id, label: a.label, divider: a.divider }))} />
                          {targetField(r)}
                        </>}
                      </div>
                      <Switch checked={r.enabled} onChange={v => upd(r.id, { enabled: v })} label="Turn automation on or off" />
                      <Button variant="ghost" size="icon-sm" className={cn("text-muted-foreground", danger)} aria-label="Remove this action" title="Remove" onClick={() => removeIds([r.id])}><I.x /></Button>
                    </div>
                    {err && <p className="ml-10 mt-1 text-[0.8rem] text-destructive">{err}</p>}
                  </div>
                );
              })}
              {isBucket && <p className="border-t px-3.5 py-2 pl-[3.25rem] text-xs text-muted-foreground">{'{bucket}'} becomes the {bnoun}’s name. The task gets the {bnoun}’s description, starts in To do, and is created once per {bnoun}.</p>}
              <div className="flex items-center gap-6 border-t pl-[3.25rem] pr-3">
                <button type="button" onClick={() => addToGroup(g)} className={rowBtn}>
                  <I.plus className="size-3.5" />{isBucket ? 'Also create another task' : 'Also do something else'}
                </button>
                {!isBucket && <DropdownMenu align="start" quiet trigger={t => <button type="button" {...t} className={rowBtn}><I.plus className="size-3.5" />Only if…</button>}
                  items={COND_FIELDS.map(c => ({ label: c.label, onSelect: () => setOnly([...only, condDefault(c.id)]) }))} />}
              </div>
            </div>
          );
        })}
        <div className="flex flex-wrap gap-1">
          <Button variant="ghost" className="text-muted-foreground" onClick={addTask}><I.plus />Task automation</Button>
          <Button variant="ghost" className="text-muted-foreground" onClick={addBucket}><I.layers />{bucketNoun} automation</Button>
        </div>
        {ideas.length > 0 && (
          <div className="mt-1">
            <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Ideas</div>
            <div className="flex flex-wrap gap-2">
              {ideas.map(i => (
                <button key={i.title} type="button" title={i.text} onClick={() => add(i.rule)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ui-fill">
                  <I.plus className="size-3.5 text-muted-foreground" />{i.title}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}

/* ---------- Projects ---------- */
function ProjectDialog({ open, project, names, onClose, onSave, noun = 'project' }) {
  const [name, setName] = useState('');
  useEffect(() => { if (open) setName(project ? project.name : ''); }, [open]);
  const clash = names.some(n => norm(n) === norm(name) && (!project || norm(n) !== norm(project.name)));
  const ok = name.trim() && !clash;
  const color = (project && project.color) || autoColor(name);
  const lower = noun.toLowerCase();
  return (
    <Dialog open={open} onClose={onClose} title={project ? `Rename ${lower}` : `New ${lower}`} className="max-w-md"
      footer={<>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button disabled={!ok} onClick={() => onSave({ name: name.trim(), color })}>{project ? 'Save' : `Create ${lower}`}</Button>
      </>}>
      <form className="grid gap-4" onSubmit={e => { e.preventDefault(); if (ok) onSave({ name: name.trim(), color }); }}>
        <Field label="Name" htmlFor="pj-name" hint={clash ? `A ${lower} with this name already exists.` : project ? `Renaming updates every task${noun === 'bucket' ? '' : ' and automation'} that uses it.` : undefined}>
          <Input id="pj-name" value={name} onChange={e => setName(e.target.value)} autoFocus />
        </Field>
      </form>
    </Dialog>
  );
}

/* A small dialog to rename something: a column, a workspace. */
function NameDialog({ open, title, value, hint, defaultValue, onClose, onSave }) {
  const [v, setV] = useState('');
  useEffect(() => { if (open) setV(value || ''); }, [open]);
  return (
    <Dialog open={open} onClose={onClose} title={title} className="max-w-sm"
      footer={<>
        {defaultValue && v !== defaultValue && <Button variant="ghost" className="sm:mr-auto" onClick={() => onSave(defaultValue)}>Reset to “{defaultValue}”</Button>}
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button disabled={!v.trim()} onClick={() => onSave(v.trim())}>Save</Button>
      </>}>
      <form onSubmit={e => { e.preventDefault(); if (v.trim()) onSave(v.trim()); }}>
        <Field label="Name" htmlFor="nm-v" hint={hint}><Input id="nm-v" value={v} onChange={e => setV(e.target.value)} autoFocus /></Field>
      </form>
    </Dialog>
  );
}

/* Manage platforms: rarely needed, so it lives in a small window.
   0.19.13: names are renamed right in the list (Enter or leaving the field saves, Esc undoes).
   The count sits flush right; pointing at a row swaps it for the bin. How it works sits behind (i). */
// The icon grid for one platform. Search filters by name; the reset button in the search box puts the folder back.
function PlatformIconPicker({ p, noun, onPick }) {
  const [q, setQ] = useState('');
  const cur = p.icon || 'folder';
  const t = q.trim().toLowerCase();
  const list = PLATFORM_ICONS.filter(([k, label, words]) => !t || label.toLowerCase().includes(t) || words.includes(t));
  return (
    <Popover className="w-[232px] p-2"
      trigger={tp => <button {...tp} type="button" aria-label={`Icon for ${p.name}`} title="Change icon"
        onClick={e => { setQ(''); tp.onClick(e); }}
        className={cn('flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring', tp.open && 'bg-muted text-foreground ring-1 ring-input')}>
        <PIcon icon={cur} className="size-4" />
      </button>}>
      {close => <div data-picking="1">
      <div className="mb-1.5 flex h-8 items-center gap-1.5 rounded-md border border-input pl-2 pr-0.5 focus-within:border-ring/60 ui-field">
        <I.search className="size-3.5 shrink-0 text-muted-foreground" />
        <input value={q} onChange={e => setQ(e.target.value)} autoFocus placeholder="Search icons" aria-label="Search icons"
          className="h-full min-w-0 flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus-visible:outline-none" />
        <span className="group/tip relative flex">
          <button type="button" aria-label={`Reset to the default folder icon`} disabled={cur === 'folder'} onClick={() => { onPick(p, 'folder'); close(); }}
            className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-40 disabled:hover:bg-transparent"><I.reset className="size-3.5" /></button>
          <span role="tooltip" className="pointer-events-none absolute bottom-full right-0 z-10 mb-1.5 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs text-background opacity-0 transition-opacity group-hover/tip:opacity-100">
            {cur === 'folder' ? 'Already the default folder icon' : 'Reset to the default folder icon'}
          </span>
        </span>
      </div>
      <div className="grid grid-cols-6 gap-0.5">
        {list.map(([k, label]) => (
          <button key={k} type="button" title={label} aria-label={label} aria-pressed={k === cur} onClick={() => { onPick(p, k); close(); }}
            className={cn('flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring', k === cur && 'bg-accent text-foreground ring-1 ring-inset ring-input')}>
            <PIcon icon={k} className="size-4" />
          </button>
        ))}
      </div>
      {list.length === 0 && <p className="px-1 py-2 text-sm text-muted-foreground">No icons match.</p>}
      </div>}
    </Popover>
  );
}
function PlatformRow({ p, n, noun, names, fresh, onRename, onCreate, onDelete, onDrop, onClash, onIcon }) {
  const [v, setV] = useState(p ? p.name : '');
  const ref = useRef(null);
  useEffect(() => { if (p) setV(p.name); }, [p && p.name]);
  const clash = !!v.trim() && names.some(x => norm(x) === norm(v) && (!p || norm(x) !== norm(p.name)));
  useEffect(() => { onClash(clash); return () => onClash(false); }, [clash]);
  const commit = () => {
    const name = v.trim();
    if (!p) { if (name && !clash) onCreate(name); else onDrop(); return; }
    if (!name || clash) { setV(p.name); return; }
    if (name !== p.name) onRename(p, name);
  };
  return (
    <div className="group/row flex h-9 items-center gap-1 rounded-md pl-1 pr-1 hover:bg-muted/50 focus-within:bg-muted/50">
      {p && onIcon ? <PlatformIconPicker p={p} noun={noun} onPick={onIcon} /> : <span className="flex size-7 shrink-0 items-center justify-center text-muted-foreground"><I.folder className="size-4" /></span>}
      <Input ref={ref} value={v} onChange={e => setV(e.target.value)} onBlur={commit} autoFocus={fresh}
        data-picking={!p || v !== p.name ? '1' : undefined}
        placeholder={`${noun} name`} aria-label={p ? `Rename ${p.name}` : `New ${noun.toLowerCase()} name`}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); }
          else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); if (p) { setV(p.name); requestAnimationFrame(() => ref.current && ref.current.blur()); } else onDrop(); }
        }}
        className={cn('h-7 min-w-0 flex-1 border-transparent bg-transparent px-1.5 font-medium !shadow-none hover:border-input focus-visible:border-input focus-visible:ring-0 focus-visible:bg-background', clash && '!border-destructive')} />
      <div className="relative flex h-7 min-w-[1.75rem] shrink-0 items-center justify-end">
        {p && <span className="pr-1.5 text-xs text-muted-foreground tnum transition-opacity group-hover/row:opacity-0 group-focus-within/row:opacity-0 [@media(hover:none)]:opacity-0" title={n ? `${n} ${n === 1 ? 'task' : 'tasks'}` : 'No tasks'}>{n || ''}</span>}
        {p && <button type="button" aria-label={`Delete ${p.name}`} title="Delete" onMouseDown={e => e.preventDefault()} onClick={() => onDelete(p)}
          className="absolute right-0 flex size-7 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:!text-destructive focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring group-hover/row:opacity-100 group-focus-within/row:opacity-100 [@media(hover:none)]:opacity-100"><I.trash className="size-3.5" /></button>}
      </div>
    </div>
  );
}
function PlatformsDialog({ open, onClose, list, tasks, noun, onRename, onCreate, onDelete, onIcon }) {
  const [help, setHelp] = useState(false);
  const [adding, setAdding] = useState(false);
  const [clashes, setClashes] = useState({});
  useEffect(() => { if (open) { setHelp(false); setAdding(false); setClashes({}); } }, [open]);
  const many = plural(noun).toLowerCase(), one = noun.toLowerCase();
  const names = list.map(p => p.name);
  const clashFor = key => on => setClashes(c => (!!c[key] === on ? c : { ...c, [key]: on }));
  const iconBtn = 'flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';
  return (
    <>
    <Dialog open={open} onClose={help ? () => setHelp(false) : onClose} className="max-w-md"
      title={<span className="inline-flex items-center gap-1">Manage {many}
        <button type="button" onClick={() => setHelp(true)} aria-label={`How ${many} work`} title={`How ${many} work`} className={cn('-my-1', iconBtn)}><I.info className="size-3.5" /></button>
      </span>}
      description="Click a name to rename it, or its icon to change it."
      footer={<Button variant="outline" onClick={onClose}>Done</Button>}>
      <div className="grid gap-0.5">
        {list.length === 0 && !adding && <p className="px-2 pb-1 text-sm text-muted-foreground">No {many} yet.</p>}
        {list.map(p => (
          <PlatformRow key={p.id || p.name} p={p} noun={noun} names={names} n={tasks.filter(t => norm(t.project) === norm(p.name)).length}
            onRename={onRename} onDelete={onDelete} onIcon={onIcon} onClash={clashFor(p.id || p.name)} />
        ))}
        {adding
          ? <PlatformRow fresh noun={noun} names={names} onClash={clashFor('new')}
              onCreate={name => { setAdding(false); onCreate(name); }} onDrop={() => setAdding(false)} />
          : <button type="button" onClick={() => setAdding(true)} className="flex h-9 items-center gap-2 rounded-md px-2 text-left text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"><I.plus className="size-3.5" />Add {one}</button>}
        {Object.values(clashes).some(Boolean) && <p className="px-2 pt-1 text-[0.8rem] text-destructive">A {one} with this name already exists.</p>}
      </div>
    </Dialog>
    <Dialog open={open && help} onClose={() => setHelp(false)} title={`How ${many} work`} className="max-w-[420px]"
      description={`Every task can belong to one ${one}.`}
      footer={<Button onClick={() => setHelp(false)}>Got it</Button>}>
      <div className="grid gap-3 text-sm">
        <div className="flex gap-2.5"><I.folder className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" /><span><span className="font-medium">Icon</span> <span className="text-muted-foreground">shows wherever the {one} appears. Folder is the default.</span></span></div>
        <div className="flex gap-2.5"><I.pencil className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" /><span><span className="font-medium">Rename</span> <span className="text-muted-foreground">updates its tasks and automations too.</span></span></div>
        <div className="flex gap-2.5"><I.trash className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" /><span><span className="font-medium">Delete</span> <span className="text-muted-foreground">keeps the tasks. They move to “No {one}”.</span></span></div>
        <div className="flex gap-2.5"><I.zap className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" /><span><span className="font-medium">Automations</span> <span className="text-muted-foreground">that use a deleted {one} are removed.</span></span></div>
      </div>
    </Dialog>
    </>
  );
}

// Home is a command center: one box to find a task, bucket or document, start a timer, or capture
// something to the Inbox. It stays a plain search bar until you type. Three tiles sit underneath.
function HomeView({ tasks, archived, buckets, docs, onOpenTask, onToggle, onCapture, onGo, onOpenBucket, onOpenDoc }) {
  const [q, setQ] = useState('');
  const [hi, setHi] = useState(0);
  const inRef = useRef(null);
  useEffect(() => {
    const k = e => {
      if (e.ctrlKey || e.metaKey || e.altKey || !['q', 'Q'].includes(e.key)) return;
      const el = document.activeElement;
      if (el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable) || document.querySelector('[role=dialog],[role=alertdialog]')) return;
      e.preventDefault(); inRef.current && inRef.current.focus();
    };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, []);
  const open = tasks.filter(t => !t.inbox && t.status !== 'done');
  const overdue = open.filter(t => t.deadline && dayDiff(t.deadline) < 0).sort((a, b) => a.deadline.localeCompare(b.deadline));
  const dueToday = open.filter(t => t.deadline && dayDiff(t.deadline) === 0).length;
  const inbox = tasks.filter(t => t.inbox).sort((a, b) => b.createdAt - a.createdAt);
  const runs = tasks.filter(t => t.timerStartedAt).sort((a, b) => a.timerStartedAt - b.timerStartedAt), running = runs[0];
  const d0 = new Date(); d0.setHours(0, 0, 0, 0);
  const todayMs = [...tasks, ...archived].reduce((x, t) => x + trackedIn(t, d0.getTime(), d0.getTime() + 864e5), 0);

  const term = q.trim().toLowerCase();
  const hit = s => (s || '').toLowerCase().includes(term);
  const items = [];
  if (term) {
    tasks.filter(t => hit(t.title)).sort((a, b) => (a.status === 'done') - (b.status === 'done')).slice(0, 5).forEach(t => {
      const d = t.deadline ? due(t) : null;
      items.push({ group: 'Tasks', kind: 'task', t, label: t.title || 'Untitled', key: 'Shift ↵',
        hint: t.inbox ? 'In Inbox' : t.status === 'done' ? 'Complete' : [t.bucket, d && d.text].filter(Boolean).join(' · '),
        tone: t.timerStartedAt ? 'run' : d && d.tone === 'late' ? 'late' : '' });
    });
    buckets.filter(b => hit(b.name)).slice(0, 2).forEach(b => {
      const ts = tasks.filter(t => norm(t.bucket) === norm(b.name)), pc = ts.length ? Math.round(ts.filter(t => t.status === 'done').length / ts.length * 100) : 0;
      items.push({ group: 'Buckets and documents', kind: 'bucket', b, label: b.name, key: '↵', hint: `Bucket · ${pc}%` });
    });
    docs.filter(d => hit(d.name)).slice(0, 2).forEach(d => items.push({ group: 'Buckets and documents', kind: 'doc', d, label: d.name, key: '↵', hint: d.addedAt ? `Document · ${fmtDay(d.addedAt)}` : 'Document' }));
    items.push({ group: 'Create', kind: 'capture', label: `Capture “${q.trim()}” to Inbox`, key: 'Tab', hint: '', tone: 'blue' });
  }
  const sel = Math.min(hi, Math.max(0, items.length - 1));
  const capture = () => { const v = q.trim(); if (!v) return; onCapture(v); setQ(''); setHi(0); };
  const run = (it, shift) => {
    if (!it) return;
    if (it.kind === 'task') { if (shift) onToggle(it.t.id); else onOpenTask(it.t.id); return; }
    if (it.kind === 'bucket') return onOpenBucket(it.b.name);
    if (it.kind === 'doc') return onOpenDoc(it.d.id);
    if (it.kind === 'capture') capture();
  };
  const onKey = e => {
    if (e.key === 'Escape') { e.stopPropagation(); if (q) { setQ(''); setHi(0); } else e.currentTarget.blur(); return; }
    if (!items.length) { if (e.key === 'Enter') e.preventDefault(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi((sel + 1) % items.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((sel - 1 + items.length) % items.length); }
    else if (e.key === 'Enter') { e.preventDefault(); run(items[sel], e.shiftKey); }
    else if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); capture(); }
  };
  const iconFor = it => it.kind === 'task' ? (it.t.timerStartedAt ? <I.pause /> : <I.play className="translate-x-px" />)
    : it.kind === 'bucket' ? <I.layers /> : it.kind === 'doc' ? <I.file /> : <I.plus />;
  const toneCls = { run: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400', late: 'bg-amber-500/15 text-amber-600 dark:text-amber-400', blue: 'bg-blue-500/15 text-blue-600 dark:text-blue-400' };
  const tile = (onClick, label, labelCls, title, sub) => (
    <button type="button" onClick={onClick} className="flex min-w-0 flex-col gap-1 rounded-xl border px-4 py-3.5 text-left transition-colors ui-card ui-hover">
      <span className={cn('text-xs font-medium', labelCls)}>{label}</span>
      <span className="truncate text-[15px] font-medium">{title}</span>
      <span className="truncate text-xs text-muted-foreground">{sub}</span>
    </button>
  );
  let lastGroup = '';
  return (
    <div className="mx-auto grid w-full max-w-[760px] gap-6 pt-6 sm:pt-12">
      <div className="grid gap-2 text-center">
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
          {' · '}{dueToday} due today
          {overdue.length > 0 && <> · <span className="font-medium text-amber-600 dark:text-amber-400">{overdue.length} overdue</span></>}
          {' · '}{inbox.length ? <span className="font-medium text-blue-600 dark:text-blue-400">{inbox.length} in Inbox</span> : 'Inbox clear'}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">What next?</h1>
      </div>

      <div className="overflow-hidden rounded-2xl border transition-shadow focus-within:ring-2 focus-within:ring-blue-500/40 ui-card">
        <label className="flex items-center gap-3 px-4">
          <I.search className="size-[18px] shrink-0 text-muted-foreground" />
          <input ref={inRef} id="home-cmd-in" value={q} onChange={e => { setQ(e.target.value); setHi(0); }} onKeyDown={onKey} autoComplete="off" spellCheck={false}
            role="combobox" aria-expanded={items.length > 0} aria-controls="home-cmd" aria-activedescendant={items.length ? `home-cmd-${sel}` : undefined}
            placeholder="Find a task, start a timer, or type anything to capture it" aria-label="Search, start a timer or capture"
            className="h-14 min-w-0 flex-1 bg-transparent text-lg text-foreground placeholder:text-muted-foreground focus-visible:outline-none" />
          <Kbd>/</Kbd>
        </label>
        {items.length > 0 && (
          <>
            <div id="home-cmd" role="listbox" aria-label="Results" className="grid max-h-[22rem] gap-0.5 overflow-auto border-t px-2 pb-2 pt-1">
              {items.map((it, i) => {
                const head = it.group !== lastGroup ? (lastGroup = it.group) : null;
                return (
                  <React.Fragment key={i}>
                    {head && <div className="px-3 pb-1 pt-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{head}</div>}
                    <button type="button" id={`home-cmd-${i}`} role="option" aria-selected={i === sel} onMouseMove={() => i !== sel && setHi(i)}
                      onMouseDown={e => e.preventDefault()} onClick={e => run(it, e.shiftKey)}
                      className={cn('flex min-h-[2.75rem] w-full items-center gap-3 rounded-lg px-3 text-left text-sm', i === sel && 'bg-accent')}>
                      <span className={cn('flex size-[26px] shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground [&_svg]:size-3.5', toneCls[it.tone])}>{iconFor(it)}</span>
                      <span className="min-w-0 flex-1 truncate">{it.label}</span>
                      {it.hint && <span className="hidden max-w-[45%] truncate text-xs text-muted-foreground sm:block">{it.hint}</span>}
                      <Kbd>{it.key}</Kbd>
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-4 border-t px-4 py-2.5 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><Kbd>↑↓</Kbd>move</span>
              <span className="inline-flex items-center gap-1.5"><Kbd>↵</Kbd>open</span>
              <span className="inline-flex items-center gap-1.5"><Kbd>Shift ↵</Kbd>start timer</span>
              <span className="inline-flex items-center gap-1.5"><Kbd>Tab</Kbd>capture to Inbox</span>
              <span className="inline-flex items-center gap-1.5"><Kbd>Esc</Kbd>clear</span>
            </div>
          </>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {overdue.length
          ? tile(() => onOpenTask(overdue[0].id), `Overdue${overdue.length > 1 ? ` · ${overdue.length}` : ''}`, 'text-amber-600 dark:text-amber-400', overdue[0].title || 'Untitled', [overdue[0].bucket || overdue[0].project, due(overdue[0]).text].filter(Boolean).join(' · '))
          : tile(() => onGo('tasks', 'open'), 'Overdue', 'text-emerald-600 dark:text-emerald-400', 'Nothing overdue', `${dueToday} due today`)}
        {tile(() => onGo('tasks', 'inbox'), 'Inbox', 'text-blue-600 dark:text-blue-400', inbox.length ? `${inbox.length} capture${inbox.length > 1 ? 's' : ''} to sort` : 'All sorted',
          inbox.length ? `Latest ${fmtDay(inbox[0].createdAt)}, ${new Date(inbox[0].createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Quick captures land here')}
        {tile(() => onGo('time'), 'Today', 'text-emerald-600 dark:text-emerald-400', `${fmtShort(todayMs)} tracked`, running ? (runs.length > 1 ? `Now: ${runs.length} timers · ${runs.map(t => t.title || 'Untitled').join(', ')}` : `Now: ${running.title || 'Untitled'}`) : 'No timer running')}
      </div>
    </div>
  );
}

/* Create or edit a bucket: name, an optional description, and its status. */
function BucketDialog({ open, bucket, names, onClose, onSave, noun = 'Bucket', handoffs = () => 0 }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState(BUCKET_STATUSES[0].id);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [baseEnd, setBaseEnd] = useState('');
  useEffect(() => {
    if (!open) return;
    setBaseEnd(bucket && bucket.baseEnd || '');
    setName(bucket ? bucket.name : ''); setDescription(bucket ? bucket.description || '' : ''); setStatus(bucket ? bucketStatus(bucket) : BUCKET_STATUSES[0].id);
    setStart(bucket && bucket.start || ''); setEnd(bucket && bucket.end || '');
  }, [open]);
  // Picking a start fills in a two week plan; an end before the start moves the start back.
  const pickStart = v => { setStart(v); if (v && (!end || end < v)) setEnd(toISO(addDays(fromISO(v), 13))); if (!v) setEnd(''); };
  const pickEnd = v => { setEnd(v); if (v && (!start || start > v)) setStart(toISO(addDays(fromISO(v), -13))); if (!v) setStart(''); };
  const clash = names.some(n => norm(n) === norm(name) && (!bucket || norm(n) !== norm(bucket.name)));
  const ok = name.trim() && !clash;
  const lower = noun.toLowerCase();
  const n = bucket && bucketStatus(bucket) === status ? 0 : handoffs(status);
  const save = () => { if (ok) onSave({ name: name.trim(), description: description.trim(), status, start, end, ...(baseEnd ? { baseEnd } : {}) }); };
  return (
    <Dialog open={open} onClose={onClose} title={bucket ? `Edit ${lower}` : `New ${lower}`} className="max-w-md"
      footer={<>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button disabled={!ok} onClick={save}>{bucket ? 'Save' : `Create ${lower}`}</Button>
      </>}>
      <form className="grid gap-4" onSubmit={e => { e.preventDefault(); save(); }}>
        <Field label="Name" htmlFor="bk-name" hint={clash ? `A ${lower} with this name already exists.` : bucket && norm(bucket.name) !== norm(name) ? 'Renaming updates every task in it.' : undefined}>
          <Input id="bk-name" value={name} onChange={e => setName(e.target.value)} autoFocus />
        </Field>
        <div className="grid gap-2">
          <Label htmlFor="bk-desc">Description <span className="font-normal text-muted-foreground">(optional)</span></Label>
          <Textarea id="bk-desc" value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder={`What this ${lower} covers`}
            onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); save(); } }} />
        </div>
        <Field label="Status" htmlFor="bk-status" hint={n ? `Saving creates ${n} ${n === 1 ? 'task' : 'tasks'} from your ${lower} automations.` : undefined}>
          <Select id="bk-status" value={status} onChange={setStatus} searchable={false}
            options={BUCKET_STATUSES.map(x => ({ value: x.id, label: x.label, node: <BucketStatusPill status={x.id} /> }))} />
        </Field>
        <div className="grid gap-2">
          <Label htmlFor="bk-start">Planned <span className="font-normal text-muted-foreground">(sets its place on the timeline)</span></Label>
          {end && <p className="-mt-1 text-xs text-muted-foreground">Tasks in this {lower} are due on the end date by default. A task can be due earlier, but not later.</p>}
          <div className="grid grid-cols-2 gap-2">
            <DatePicker id="bk-start" value={start} onChange={pickStart} placeholder="Start" format={{ day: 'numeric', month: 'short', year: 'numeric' }} />
            <DatePicker id="bk-end" value={end} onChange={pickEnd} placeholder="End" format={{ day: 'numeric', month: 'short', year: 'numeric' }} />
          </div>
        </div>
        {bucket && bucket.baseEnd && start && end && (
          <Field label="Original end" htmlFor="bk-base" hint={`The end date when this ${lower} started. Moves of the end are measured from it.${baseEnd && end > baseEnd ? ` Now ${nDays(daysBetween(fromISO(baseEnd), fromISO(end)))} later.` : ''}`}>
            <DatePicker id="bk-base" value={baseEnd} onChange={v => setBaseEnd(v || end)} format={{ day: 'numeric', month: 'short', year: 'numeric' }} />
          </Field>
        )}
      </form>
    </Dialog>
  );
}

/* ---------- Edit bucket statuses (0.17) ---------- */
function BucketStatusesDialog({ open, buckets, noun = 'Bucket', onClose, onSave }) {
  const [draft, setDraft] = useState([]);
  useEffect(() => { if (open) setDraft(BUCKET_STATUSES.map(({ id, label, color }) => ({ id, label, color }))); }, [open]);
  const upd = (id, patch) => setDraft(d => d.map(x => x.id === id ? { ...x, ...patch } : x));
  const move = (id, dir) => setDraft(d => {
    const i = d.findIndex(x => x.id === id), j = i + dir;
    if (j < 0 || j >= d.length) return d;
    const n = [...d]; [n[i], n[j]] = [n[j], n[i]]; return n;
  });
  const lower = noun.toLowerCase();
  const used = x => buckets.filter(b => bucketStatus(b) === x.id).length;
  const fallback = draft.find(x => x.id !== 'done') || draft[0];
  const dupes = new Set(draft.map(x => norm(x.label)).filter((n, i, a) => n && a.indexOf(n) !== i));
  const valid = draft.length > 1 && draft.every(x => x.label.trim() && !dupes.has(norm(x.label)));
  return (
    <Dialog open={open} onClose={onClose} title={`Edit ${lower} statuses`} className="max-w-lg"
      description={`Rename, recolor and reorder the statuses a ${lower} can have, or add your own. The order is the order of the tabs and menus. Done always stays: it marks a ${lower} as finished.`}
      footer={<>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button disabled={!valid} onClick={() => onSave(draft.map(x => ({ ...x, label: x.label.trim() })))}>Save</Button>
      </>}>
      <div className="grid gap-1" data-bucket-statuses="">
        {draft.map((x, i) => {
          const n = used(x), clash = dupes.has(norm(x.label)), c = BUCKET_COLORS[x.color] || BUCKET_COLORS.gray;
          return (
            <div key={x.id} className="group/row flex items-center gap-2 rounded-md px-1 py-0.5 hover:bg-muted/50">
              <Popover className="p-2"
                trigger={p => <button {...p} type="button" aria-label={`Color of ${x.label || 'status'}`} className="flex size-7 shrink-0 items-center justify-center rounded-md hover:bg-muted"><span className={cn('size-2.5 rounded-full', c.dot)} /></button>}>
                <div className="grid grid-cols-3 gap-1">
                  {Object.keys(BUCKET_COLORS).map(k => (
                    <button key={k} type="button" onClick={() => upd(x.id, { color: k })}
                      className={cn('flex h-7 items-center gap-2 rounded px-2 text-xs capitalize hover:bg-accent', x.color === k && 'bg-accent font-medium')}>
                      <span className={cn('size-2.5 rounded-full', BUCKET_COLORS[k].dot)} />{k}
                    </button>
                  ))}
                </div>
              </Popover>
              <Input value={x.label} onChange={e => upd(x.id, { label: e.target.value })} placeholder="Status name" aria-label="Status name" autoFocus={!x.label}
                className={cn('h-8 flex-1 border-transparent bg-transparent shadow-none hover:border-input focus-visible:border-input', clash && 'border-destructive')} />
              <span className="w-20 shrink-0 text-right text-xs text-muted-foreground tnum">{n ? `${n} ${n === 1 ? lower : plural(lower)}` : ''}</span>
              <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(x.id, -1)}
                className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted disabled:opacity-30"><I.up className="size-3.5" /></button>
              <button type="button" aria-label="Move down" disabled={i === draft.length - 1} onClick={() => move(x.id, 1)}
                className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted disabled:opacity-30"><I.down className="size-3.5" /></button>
              {x.id === 'done'
                ? <span title={`Done always stays. You can rename and recolor it.`} className="flex size-7 items-center justify-center text-muted-foreground/50"><I.lock className="size-3.5" /></span>
                : <button type="button" aria-label={`Delete ${x.label || 'status'}`}
                    title={n ? `Its ${n} ${n === 1 ? lower + ' moves' : plural(lower) + ' move'} to ${((draft.find(y => y.id !== x.id && y.id !== 'done') || {}).label) || 'the first status'}` : 'Delete'}
                    disabled={draft.length <= 2}
                    onClick={() => setDraft(d => d.filter(y => y.id !== x.id))}
                    className={cn("flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted disabled:opacity-30", danger)}><I.trash className="size-3.5" /></button>}
            </div>
          );
        })}
        <button type="button" onClick={() => setDraft(d => { const at = Math.max(0, d.findIndex(y => y.id === 'done')); return [...d.slice(0, at), { id: 'bs-' + newId(), label: '', color: 'blue' }, ...d.slice(at)]; })}
          className="flex h-8 items-center gap-2 rounded-md px-2 text-left text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground">
          <I.plus className="size-3.5" />Add a status
        </button>
        {dupes.size > 0 && <p className="mt-2 text-[0.8rem] text-destructive">Two statuses can’t have the same name.</p>}
      </div>
    </Dialog>
  );
}

/* Buckets page: a compact list (name and description, status, progress). Click a bucket for its details. */
/* Every page uses the same header: a title with a short summary, then one bar with filter tabs on
   the left and the page's own controls on the right. */
// The Tasks title doubles as the switch between your tasks, everyone's, or one team's (0.20).
function ScopeMenu({ scope, onScope, teams, myTeams }) {
  const [open, setOpen] = useState(false);
  const a = useRef(null), p = useRef(null);
  useDismiss(open, setOpen, [a, p]);
  const tid = scope.startsWith('team:') ? scope.slice(5) : null;
  const title = scope === 'all' ? 'Everyone’s tasks' : tid ? `${(teams.find(t => t.id === tid) || {}).name || 'Team'} tasks` : 'Tasks for me';
  const pick = v => { onScope(v); setOpen(false); };
  const row = 'flex w-full cursor-default select-none items-center gap-2.5 rounded-md px-2 text-left outline-none transition-colors hover:bg-accent focus-visible:bg-accent';
  const check = on => <span className="flex w-3.5 shrink-0 justify-center">{on && <I.check className="size-3.5" />}</span>;
  return (
    <>
      <button ref={a} type="button" aria-haspopup="menu" aria-expanded={open} onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        className="-ml-2 inline-flex items-center gap-1.5 rounded-lg px-2 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {title}<I.down className={cn('size-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      <Floating anchorRef={a} panelRef={p} open={open} align="start" className="w-[280px] p-1">
        <div role="menu" aria-label="Show tasks" onClick={e => e.stopPropagation()} className="text-sm font-normal tracking-normal">
          <button type="button" role="menuitemradio" aria-checked={scope === 'me'} onClick={() => pick('me')} className={cn(row, 'py-2')}>
            <span className="min-w-0 flex-1"><span className="block">For me</span><span className="block truncate text-xs text-muted-foreground">{myTeams.length ? `${myTeams.join(', ')} and anything that’s yours` : 'Anything assigned to you or made by you'}</span></span>{check(scope === 'me')}
          </button>
          <button type="button" role="menuitemradio" aria-checked={scope === 'all'} onClick={() => pick('all')} className={cn(row, 'py-2')}>
            <span className="min-w-0 flex-1"><span className="block">Everyone</span><span className="block text-xs text-muted-foreground">Every task across all teams</span></span>{check(scope === 'all')}
          </button>
          <div className="-mx-1 my-1 h-px bg-muted" />
          <div className="px-2 pb-0.5 pt-1 text-xs text-muted-foreground">Just one team</div>
          {teams.map(t => (
            <button key={t.id} type="button" role="menuitemradio" aria-checked={tid === t.id} onClick={() => pick('team:' + t.id)} className={cn(row, 'h-[30px]')}>
              <span className="min-w-0 flex-1 truncate">{t.name}</span>{check(tid === t.id)}
            </button>
          ))}
          <div className="px-2 pb-1.5 pt-1 text-xs text-muted-foreground">Ctrl + 1 and Ctrl + 2 switch for you</div>
        </div>
      </Floating>
    </>
  );
}
const PageTitle = ({ title, children }) => (
  <div className="flex min-w-0 flex-wrap items-baseline gap-x-3.5 gap-y-1">
    <h1 className="shrink-0 text-[28px] font-semibold leading-9 tracking-tight">{title}</h1>
    {children}
  </div>
);
function PageHead({ title, sub }) {
  const slot = useHeadSlot();
  const head = <PageTitle title={title}>{sub && <span className="min-w-0 truncate text-sm text-muted-foreground">{sub}</span>}</PageTitle>;
  return slot ? createPortal(head, slot) : <div className="mt-6">{head}</div>;
}
const PageBar = ({ children, className }) => <div className={cn('mt-3 flex min-h-8 flex-wrap items-center gap-1.5', className)}>{children}</div>;
function FilterTabs({ items, value, onChange, label }) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex h-9 max-w-full items-center overflow-x-auto rounded-lg bg-muted p-1 text-muted-foreground">
      {items.map(c => (
        <button key={c.id} role="tab" type="button" aria-selected={value === c.id} onClick={() => onChange(c.id)}
          className={cn('inline-flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
            value === c.id ? 'bg-background text-foreground shadow' : 'hover:text-foreground')}>
          {c.dot && <span className={cn('size-2 rounded-full', c.dot)} />}{c.icon}{c.label}
          {c.count === undefined || c.count === null ? null : c.badge && c.count > 0
            ? <span className="tnum rounded-full bg-blue-500 px-1.5 text-[10px] font-medium leading-4 text-white">{c.count}</span>
            : <span className="tnum text-xs font-normal opacity-70">{c.count}</span>}
        </button>
      ))}
    </div>
  );
}
const PageSearch = ({ value, onChange, placeholder }) => (
  <div className="relative w-full sm:w-56">
    <I.search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
    <Input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} className="h-9 bg-card pl-8 text-sm shadow-none"
      onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); onChange(''); e.currentTarget.blur(); } }} />
  </div>
);

/* Buckets timeline: one row per bucket in planned order, a bar from its planned start to end.
   Drag a bar to move it, drag an edge to change its length; click an empty lane to plan a bucket. */
const DAY = 86400000;
const mondayOf = d => { const x = startOfDay(d); return addDays(x, -((x.getDay() + 6) % 7)); };
const daysBetween = (a, b) => Math.round((startOfDay(b) - startOfDay(a)) / DAY);
const shortDate = iso => fromISO(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
const planLabel = b => b.start && b.end ? `${shortDate(b.start)} – ${shortDate(b.end)}` : '';
function BucketTimeline({ rows, sel, onSelect, onPlan, lower, progress }) {
  const [drag, setDrag] = useState(null);
  const today = startOfDay(new Date());
  const planned = rows.filter(r => r.b.start && r.b.end);
  let first = addDays(mondayOf(today), -7), last = addDays(mondayOf(today), 8 * 7);
  planned.forEach(({ b }) => {
    const s = mondayOf(fromISO(b.start)), e = addDays(mondayOf(fromISO(b.end)), 14);
    if (s < first) first = s; if (e > last) last = e;
  });
  const weeks = Math.round(daysBetween(first, last) / 7), days = weeks * 7;
  const pct = n => `${(n / days) * 100}%`;
  const todayAt = daysBetween(first, today);
  const shown = r => (drag && drag.name === r.b.name ? drag : r.b);
  const begin = (e, r, kind) => {
    if (e.button !== 0) return;
    e.preventDefault(); e.stopPropagation();
    const lane = e.currentTarget.closest('[data-lane]').getBoundingClientRect();
    const o = { name: r.b.name, start: r.b.start, end: r.b.end, x: e.clientX, w: lane.width, kind, moved: false };
    const move = ev => {
      const d = Math.round(((ev.clientX - o.x) / o.w) * days);
      if (d) o.moved = true;
      let s = fromISO(r.b.start), en = fromISO(r.b.end);
      if (kind === 'move') { s = addDays(s, d); en = addDays(en, d); }
      else if (kind === 'start') { s = addDays(s, d); if (s > en) s = en; }
      else { en = addDays(en, d); if (en < s) en = s; }
      o.start = toISO(s); o.end = toISO(en);
      setDrag({ name: o.name, start: o.start, end: o.end });
    };
    const up = () => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
      setDrag(null);
      if (o.moved) onPlan(o.name, o.start, o.end); else if (kind === 'move') onSelect(o.name);
    };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
  };
  const planAt = (e, r) => {
    if (r.b.start || e.button !== 0) return;
    const lane = e.currentTarget.getBoundingClientRect();
    const day = Math.floor(((e.clientX - lane.left) / lane.width) * days);
    const s = addDays(first, Math.floor(day / 7) * 7);
    onPlan(r.b.name, toISO(s), toISO(addDays(s, 13)));
  };
  const keys = (e, r) => {
    const step = e.shiftKey ? 7 : 1;
    const d = e.key === 'ArrowRight' ? step : e.key === 'ArrowLeft' ? -step : 0;
    if (!d) { if (e.key === 'Enter') onSelect(r.b.name); return; }
    e.preventDefault();
    const s = fromISO(r.b.start), en = fromISO(r.b.end);
    if (e.altKey) { const ne = addDays(en, d); if (ne >= s) onPlan(r.b.name, r.b.start, toISO(ne)); }
    else onPlan(r.b.name, toISO(addDays(s, d)), toISO(addDays(en, d)));
  };
  let n = 0;
  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: `calc(16rem + ${weeks * 6}rem)` }}>
        <div className="flex border-b text-xs font-medium text-muted-foreground">
          <div className="sticky left-0 z-20 flex w-64 shrink-0 items-center border-r bg-card px-4 py-2">{lower[0].toUpperCase() + lower.slice(1)}</div>
          <div className="grid flex-1" style={{ gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))` }}>
            {Array.from({ length: weeks }, (_, i) => {
              const d = addDays(first, i * 7), now = todayAt >= i * 7 && todayAt < i * 7 + 7;
              return <div key={i} className={cn('truncate border-l px-2 py-2', now && 'font-semibold text-foreground')}>{d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</div>;
            })}
          </div>
        </div>
        <div className="relative">
          <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-64 right-0 grid" style={{ gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))` }}>
            {Array.from({ length: weeks }, (_, i) => <div key={i} className="border-l border-border/60" />)}
          </div>
          <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-64 right-0 z-10">
            <div className="absolute inset-y-0 w-0.5 bg-red-500/80" style={{ left: pct(todayAt + 0.5) }} />
          </div>
          {rows.map(r => {
            const b = shown(r), on = sel === r.b.name, has = b.start && b.end;
            const st = bucketStatus(r.b), s0 = has ? daysBetween(first, fromISO(b.start)) : 0, len = has ? daysBetween(fromISO(b.start), fromISO(b.end)) + 1 : 0;
            const dragging = drag && drag.name === r.b.name;
            return (
              <div key={r.b.name} data-bucket={r.b.name} className={cn('group/row flex h-14 border-b last:border-b-0', on && 'bg-muted/60')}>
                <button type="button" onClick={() => onSelect(r.b.name)} aria-pressed={on}
                  className={cn('sticky left-0 z-20 flex w-64 shrink-0 items-center gap-3 border-r px-4 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring', on ? 'bg-muted' : 'bg-card')}>
                  <span className="tnum w-5 shrink-0 text-xs font-semibold text-muted-foreground">{has ? ++n : '–'}</span>
                  <span className="min-w-0">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate text-sm font-medium">{r.b.name}</span>
                      {r.sc && r.sc.warn && <span title={r.sc.warn} className="shrink-0 text-amber-600 dark:text-amber-400"><I.alert className="size-3.5" /><span className="sr-only">{r.sc.warn}</span></span>}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">{has ? planLabel(b) : 'Not planned'} · {r.st.total ? `${r.st.open.length} of ${r.st.total} open` : 'No tasks'}{r.sc && r.sc.added.length ? <span className="text-amber-700 dark:text-amber-300"> · +{r.sc.added.length} added</span> : null}</span>
                  </span>
                </button>
                <div data-lane="" className={cn('relative flex-1', !has && 'cursor-copy')} onPointerDown={e => planAt(e, r)}>
                  {has ? (
                    <div className={cn('absolute top-3 flex h-8 select-none items-center rounded-md border text-xs font-medium shadow-sm', BS[st].bar, dragging ? 'z-30 ring-2 ring-primary/60' : 'z-10')}
                      style={{ left: `calc(${pct(s0)} + 2px)`, width: `calc(${pct(len)} - 4px)` }}>
                      <span onPointerDown={e => begin(e, r, 'start')} className="absolute inset-y-0 left-0 w-2 cursor-ew-resize rounded-l-md hover:bg-foreground/20" />
                      <button type="button" onPointerDown={e => begin(e, r, 'move')} onKeyDown={e => keys(e, r)}
                        aria-label={`${r.b.name}, planned ${planLabel(b)}. Arrow keys move it, Shift moves a week, Alt changes the end.`} title={`${r.b.name} · ${planLabel(b)}`}
                        className="flex h-full min-w-0 flex-1 cursor-grab items-center gap-1.5 px-3 text-left active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md">
                        <span className={cn('size-2 shrink-0 rounded-full', BS[st].dot)} />
                        <span className="truncate">{dragging ? planLabel(b) : BS[st].label}</span>
                      </button>
                      <span onPointerDown={e => begin(e, r, 'end')} className="absolute inset-y-0 right-0 w-2 cursor-ew-resize rounded-r-md hover:bg-foreground/20" />
                    </div>
                  ) : null}
                  {has && r.b.baseEnd && (() => {
                    // Drift: the part of the bar past the original end, and a dashed line where the bucket was meant to end.
                    const base = daysBetween(first, fromISO(r.b.baseEnd)) + 1, endAt = s0 + len, slip = endAt - base;
                    if (slip <= 0 || base <= s0) return null;
                    const tip = `Original end ${shortDate(r.b.baseEnd)}. Now ends ${nDays(slip)} later${r.sc && r.sc.added.length ? `, with ${nTasks(r.sc.added.length)} added after the start` : ''}.`;
                    return (
                      <>
                        <div aria-hidden="true" className="pointer-events-none absolute top-3 z-20 h-8 rounded-r-md border border-l-0 border-amber-500/70"
                          style={{ left: pct(base), width: `calc(${pct(slip)} - 2px)`, backgroundImage: 'repeating-linear-gradient(135deg, rgba(245,158,11,.35) 0 4px, transparent 4px 9px)' }} />
                        <div aria-hidden="true" className="pointer-events-none absolute top-1.5 z-20 h-11 border-l-2 border-dashed border-amber-500" style={{ left: pct(base) }} />
                        <span title={tip} className="absolute top-1/2 z-20 ml-1.5 -translate-y-1/2 whitespace-nowrap rounded bg-amber-500/15 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300" style={{ left: pct(endAt) }}>
                          +{slip}d<span className="sr-only"> {tip}</span>
                        </span>
                      </>
                    );
                  })()}
                  {has ? null : (
                    <span className="pointer-events-none absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-md border border-dashed bg-card px-2.5 py-1 text-xs text-muted-foreground opacity-80 group-hover/row:opacity-100">Not planned · click a week to plan it</span>
                  )}
                </div>
              </div>
            );
          })}
          {!rows.length && <div className="px-4 py-10 text-center text-sm text-muted-foreground">Nothing to show.</div>}
        </div>
      </div>
    </div>
  );
}

/* ---------- Scope: tasks added after a bucket started (0.19.3) ---------- */
const ScopeChip = ({ sc }) => (
  <span title={sc.warn || `${nTasks(sc.added.length)} added after it started`}
    className={cn('inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-px text-[11px] font-medium', sc.warn ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300' : 'bg-muted text-muted-foreground')}>
    {sc.warn ? <I.alert className="size-3" /> : <I.plus className="size-3" />}{sc.added.length} added{sc.slip > 0 ? ` · +${sc.slip}d` : ''}
  </span>
);
function ReasonPicker({ t, onSet }) {
  const r = reasonOf(t);
  return (
    <DropdownMenu align="end" trigger={pp => (
      <button {...pp} type="button" aria-label={`Reason for adding ${t.title || 'this task'}: ${r.label}. Change`}
        className={cn('inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2 text-[11px] font-medium hover:opacity-80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring', r.pill)}>
        {r.id === 'none' ? 'Why?' : r.label}<I.down className="size-3 opacity-60" />
      </button>
    )} items={[...ADD_REASONS.map(x => ({ label: x.label, icon: <span className={cn('ml-0.5 mr-0.5 size-2 rounded-full', x.dot)} />, shortcut: x.id === r.id ? '✓' : undefined, onSelect: () => onSet(t.id, x.id) })),
      'sep', { label: 'Part of the plan (don’t count)', icon: <I.check className="size-3.5" />, onSelect: () => onSet(t.id, 'planned') },
      ...(r.id !== 'none' ? [{ label: 'Clear reason', icon: <I.x className="size-3.5" />, onSelect: () => onSet(t.id, '') }] : [])]} />
  );
}
// A stacked bar of the added tasks by reason.
const ReasonBar = ({ reasons, total }) => (
  <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
    {reasons.map(r => <div key={r.id} className={r.dot} style={{ width: `${(r.n / total) * 100}%` }} />)}
  </div>
);
function ScopePanel({ b, sc, lower, onOpenTask, onSetReason, onEdit, onMoveEnd }) {
  const [all, setAll] = useState(false);
  if (!sc) return (
    <div className="mt-4 rounded-lg border border-dashed px-3 py-2.5 text-xs text-muted-foreground">
      <div className="mb-0.5 font-medium text-foreground">Scope</div>
      Plan its dates to track tasks added after it starts. <button type="button" className="underline underline-offset-4 hover:text-foreground" onClick={onEdit}>Set dates</button>
    </div>
  );
  const list = all ? sc.added : sc.added.slice(0, 6);
  return (
    <div className="mt-4" aria-label="Scope">
      <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-muted-foreground">
        <span className="flex items-center gap-1.5"><I.trendUp className="size-3.5" />Scope</span>
        {!sc.started && <span>Starts {shortDate(b.start)}</span>}
      </div>
      {sc.warn && <div className="mb-2"><Note tone="amber"><I.alert className="mt-0.5 size-3 shrink-0" /><span>{sc.warn}</span></Note></div>}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg border px-2.5 py-2 ui-inset"><div className="tnum text-base font-semibold">{sc.planned}</div><div className="text-[11px] text-muted-foreground">Planned at start</div></div>
        <div className={cn('rounded-lg border px-2.5 py-2 ui-inset', sc.added.length && 'border-amber-500/40 bg-amber-500/5')}><div className="tnum text-base font-semibold">{sc.added.length ? `+${sc.added.length}` : 0}</div><div className="text-[11px] text-muted-foreground">Added later</div></div>
        <div className={cn('rounded-lg border px-2.5 py-2 ui-inset', sc.slip > 0 && 'border-amber-500/40 bg-amber-500/5')}><div className="tnum text-base font-semibold">{sc.slip > 0 ? `+${sc.slip}d` : sc.slip < 0 ? `${sc.slip}d` : b.baseEnd ? 'On plan' : '–'}</div><div className="text-[11px] text-muted-foreground">{b.baseEnd ? `Was ${shortDate(b.baseEnd)}` : 'End not moved'}</div></div>
      </div>
      {sc.added.length > 0 && (
        <div className="mt-2.5">
          <ReasonBar reasons={sc.reasons} total={sc.added.length} />
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {sc.reasons.map(r => <span key={r.id} className="inline-flex items-center gap-1.5"><span className={cn('size-2 rounded-full', r.dot)} />{r.label} <span className="tnum font-medium text-foreground">{r.n}</span></span>)}
          </div>
        </div>
      )}
      {sc.time >= 60000 && <div className="mt-2 text-xs text-muted-foreground">{fmtShort(sc.time)} spent on added tasks{sc.total >= 60000 ? `, ${Math.round(sc.time / sc.total * 100)}% of this ${lower}’s time` : ''}</div>}
      {sc.need > 0 && (
        <div className={cn('mt-2 rounded-lg border px-2.5 py-2 text-xs ui-inset', sc.extra ? 'border-amber-500/40 bg-amber-500/5' : '')} aria-label="Impact">
          <div className="text-foreground">Added tasks took {fmtShort(sc.time)}, {fmtWorkDays(sc.time)}.</div>
          <div className="mt-0.5 text-muted-foreground">
            {sc.extra
              ? (sc.covered ? `The end has moved ${nDays(sc.covered)} for it so far, ${sc.extra} short.` : 'The end hasn’t moved for it.') + ` Counting ${DAY_HOURS}h a day, Monday to Friday.`
              : `The end has already moved ${nDays(sc.covered)}, which covers it.`}
          </div>
          {sc.extra > 0 && onMoveEnd && (
            <div className="mt-2 flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => onMoveEnd(b, sc.suggestEnd)}>Move end to {shortDate(sc.suggestEnd)}</Button>
              <span className="text-muted-foreground">+{nDays(sc.extra)}, from {shortDate(b.end)}</span>
            </div>
          )}
        </div>
      )}
      {sc.moves.length > 0 && (
        <div className="mt-1 text-xs text-muted-foreground">
          End moved {sc.moves.length === 1 ? 'once' : `${sc.moves.length} times`}: {sc.moves.slice(-3).map(m => `${shortDate(m.from)} → ${shortDate(m.to)}`).join(', ')}{sc.moves.length > 3 ? ', …' : ''}
        </div>
      )}
      {sc.added.length > 0 ? (
        <div className="mt-2.5">
          <div className="mb-1 text-xs font-medium text-muted-foreground">Added after it started · {sc.added.length}</div>
          <div className="grid">
            {list.map(t => (
              <div key={t.id} className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-muted">
                <button type="button" onClick={() => onOpenTask(t.id)} className={cn('min-w-0 flex-1 truncate text-left text-sm', t.status === 'done' && 'text-muted-foreground line-through decoration-muted-foreground/40')}>{t.title || 'Untitled'}</button>
                <span className="shrink-0 text-[11px] text-muted-foreground">{fmtDay(joinedAt(t))}</span>
                <ReasonPicker t={t} onSet={onSetReason} />
              </div>
            ))}
          </div>
          {sc.added.length > 6 && <button type="button" onClick={() => setAll(v => !v)} className="mt-1 px-2 text-xs text-muted-foreground hover:text-foreground">{all ? 'Show fewer' : `Show all ${sc.added.length}`}</button>}
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">{sc.started ? `Nothing added since it started on ${shortDate(b.start)}.` : `Tasks added from ${shortDate(toISO(addDays(fromISO(b.start), 1)))} on count as added later.`}</p>
      )}
    </div>
  );
}

function BucketsView({ list, tasks, scopeTasks, onSetReason, onMoveEnd, noun, onNew, onEdit, onDelete, onOpen, onStatus, onPlan, onOpenTask, onAddTask, focus, onEditStatuses }) {
  const [tab0, setTab] = useState('active');
  const tab = tab0 === 'active' || BS[tab0] ? tab0 : 'active';
  const [mode, setModeRaw] = useState(() => { try { return localStorage.getItem('tasks-buckets-view') || 'list'; } catch (e) { return 'list'; } });
  const setMode = m => { setModeRaw(m); try { localStorage.setItem('tasks-buckets-view', m); } catch (e) {} };
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(focus || null);
  const [showDone, setShowDone] = useState(false);
  const lower = noun.toLowerCase();
  const stats = name => {
    const ts = tasks.filter(t => (name === null ? !t.bucket : norm(t.bucket) === norm(name)));
    const open = ts.filter(t => t.status !== 'done');
    const next = open.filter(t => t.deadline).sort((a, b) => a.deadline.localeCompare(b.deadline))[0];
    const people = [...new Set(ts.map(t => t.assignee).filter(Boolean))];
    return { ts, total: ts.length, done: ts.length - open.length, open, next, people };
  };
  const count = id => list.filter(b => (id === 'active' ? bucketStatus(b) !== 'done' : bucketStatus(b) === id)).length;
  const nq = norm(q);
  const rows = list
    .filter(b => (tab === 'active' ? bucketStatus(b) !== 'done' : bucketStatus(b) === tab))
    .filter(b => !nq || norm(b.name).includes(nq) || norm(b.description).includes(nq))
    .sort((a, b) => (a.start || '9999').localeCompare(b.start || '9999') || (a.end || '').localeCompare(b.end || '') || a.name.localeCompare(b.name))
    .map(b => ({ b, st: stats(b.name), sc: bucketScope(b, scopeTasks || tasks) }));
  const none = stats(null);
  const showNone = tab === 'active' && none.total > 0 && (!nq || norm(`No ${lower}`).includes(nq));
  const cur = sel && (sel === 'none' ? (showNone ? { b: { name: 'none', label: `No ${lower}` }, st: none, none: true } : null) : rows.find(r => r.b.name === sel));
  useEffect(() => {
    if (!cur) return;
    const k = e => { if (e.key === 'Escape' && !e.defaultPrevented) setSel(null); };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [!!cur]);
  const statusMenu = b => (
    <DropdownMenu align="start" trigger={pp => (
      <button {...pp} type="button" aria-label={`Status of ${b.name}: ${BS[bucketStatus(b)].label}. Change`}
        className="inline-flex h-7 max-w-full items-center gap-1 rounded-md px-1.5 text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
        <BucketStatusPill status={bucketStatus(b)} /><I.down className="size-3.5 shrink-0 opacity-50" />
      </button>
    )} items={BUCKET_STATUSES.map(x => ({ label: x.label, icon: <span className={cn('ml-0.5 mr-0.5 size-2 rounded-full', x.dot)} />, shortcut: x.id === bucketStatus(b) ? '✓' : undefined, onSelect: () => onStatus(b.name, x.id) })).concat(onEditStatuses ? ['sep', { label: 'Edit statuses…', icon: <I.sliders className="size-3.5" />, onSelect: onEditStatuses }] : [])} />
  );
  const progress = (st, wide) => {
    const pct = st.total ? Math.round(st.done / st.total * 100) : 0;
    return (
      <div className={cn('flex items-center gap-3', wide && 'w-full')}>
        <div className={cn('h-1.5 rounded-full bg-muted', wide ? 'flex-1' : 'w-20 shrink-0')}><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} /></div>
        <span className="tnum whitespace-nowrap text-xs text-muted-foreground">{st.total ? `${st.open.length} of ${st.total} open` : 'No tasks'}</span>
      </div>
    );
  };
  const row = ({ b, st, sc }, isNone) => {
    const on = cur && cur.b.name === b.name;
    return (
      <div key={b.name} role="row" tabIndex={0} aria-selected={on} onClick={() => setSel(on ? null : b.name)}
        onKeyDown={e => { if (e.key === 'Enter' && e.target === e.currentTarget) setSel(on ? null : b.name); }}
        className={cn('grid cursor-default grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 border-b px-4 py-3 last:border-b-0 hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none md:grid-cols-[minmax(0,1fr)_9.5rem_13rem_2rem]', on && 'bg-muted/60')}>
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-semibold">{isNone ? '–' : (b.name.trim().charAt(0).toUpperCase() || '?')}</span>
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <span className={cn('truncate text-sm font-medium', isNone && 'text-muted-foreground')}>{b.label || b.name}</span>
              {sc && sc.added.length > 0 && <ScopeChip sc={sc} />}
            </div>
            {b.description ? <div className="truncate text-xs text-muted-foreground">{b.description}</div>
              : !isNone && <div className="text-xs text-muted-foreground/60">No description</div>}
          </div>
        </div>
        <div className="hidden md:block" onClick={e => e.stopPropagation()}>{isNone ? null : statusMenu(b)}</div>
        <div className="col-span-2 md:col-span-1">{progress(st)}</div>
        <div className="row-start-1 col-start-2 md:col-start-4" onClick={e => e.stopPropagation()}>
          {!isNone && (
            <DropdownMenu trigger={pp => <Button {...pp} variant="ghost" size="icon-sm" aria-label={`Options for ${b.name}`}><I.more /></Button>}
              items={[{ label: `Edit ${lower}`, icon: <I.pencil />, onSelect: () => onEdit(b) }, { label: 'Show its tasks', icon: <I.listCheck />, onSelect: () => onOpen(b.name) }, 'sep', { label: `Delete ${lower}`, icon: <I.trash />, destructive: true, onSelect: () => onDelete(b) }]} />
          )}
        </div>
      </div>
    );
  };
  const panel = () => {
    const { b, st } = cur;
    const doneList = st.ts.filter(t => t.status === 'done');
    const created = b.createdAt ? new Date(b.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : null;
    const prop = (label, children) => (
      <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-2 py-1 text-sm"><span className="text-muted-foreground">{label}</span><div className="min-w-0">{children}</div></div>
    );
    const taskRow = t => (
      <button key={t.id} type="button" onClick={() => onOpenTask(t.id)} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted">
        <span className="min-w-0 flex-1 truncate">{t.title || 'Untitled'}</span>
        {t.deadline && <span className={cn('shrink-0 text-xs', dueCls[due(t).tone])}>{due(t).text}</span>}
      </button>
    );
    return (
      <Card className="w-full shrink-0 self-start p-4 lg:sticky lg:top-4 lg:w-[clamp(20rem,28%,30rem)]" aria-label={`${b.label || b.name} details`}>
        <div className="flex items-start gap-2">
          <h3 className="min-w-0 flex-1 break-words text-base font-semibold">{b.label || b.name}</h3>
          <Button variant="ghost" size="icon-sm" aria-label="Close details (Esc)" title="Close  Esc" onClick={() => setSel(null)}><I.x /></Button>
        </div>
        {b.description && <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{b.description}</p>}
        <div className="mt-3 grid">
          {!cur.none && prop('Status', statusMenu(b))}
          {!cur.none && prop('Planned', b.start && b.end ? <span>{planLabel(b)} <span className="text-muted-foreground">· {(n => n % 7 ? `${n} days` : `${n / 7} ${n === 7 ? 'week' : 'weeks'}`)(daysBetween(fromISO(b.start), fromISO(b.end)) + 1)}</span></span> : <button type="button" className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline" onClick={() => onEdit(b)}>Not planned. Set dates</button>)}
          {prop('Next due', st.next ? <button type="button" onClick={() => onOpenTask(st.next.id)} className="flex min-w-0 max-w-full items-center gap-1.5 text-left hover:underline underline-offset-4"><span className={cn('shrink-0', dueCls[due(st.next).tone])}>{due(st.next).text}</span><span className="truncate text-muted-foreground">{st.next.title}</span></button> : <span className="text-muted-foreground">Nothing scheduled</span>)}
          {prop('People', st.people.length ? <div className="flex flex-wrap gap-x-3 gap-y-1">{st.people.map(n => <span key={n} className="flex min-w-0 items-center gap-1.5"><Avatar name={n} className="h-5 w-5 [&_span]:text-[9px]" /><span className="truncate">{n}</span></span>)}</div> : <span className="text-muted-foreground">Nobody yet</span>)}
          {prop('Progress', progress(st, true))}
          {created && prop('Created', created)}
        </div>
        {!cur.none && <ScopePanel b={b} sc={cur.sc} lower={lower} onOpenTask={onOpenTask} onSetReason={onSetReason} onEdit={() => onEdit(b)} onMoveEnd={onMoveEnd} />}
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-xs font-medium text-muted-foreground"><span>Open tasks · {st.open.length}</span>{!cur.none && <button type="button" className="hover:text-foreground" onClick={() => onOpen(b.name)}>Show in Tasks</button>}</div>
          {st.open.length ? <div className="grid max-h-72 overflow-y-auto">{st.open.slice().sort((x, y) => (x.deadline || '9999').localeCompare(y.deadline || '9999')).map(taskRow)}</div>
            : <p className="px-2 py-1.5 text-sm text-muted-foreground">No open tasks.</p>}
          {doneList.length > 0 && (
            <>
              <button type="button" onClick={() => setShowDone(v => !v)} aria-expanded={showDone} className="mt-2 flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
                <I.right className={cn('size-3.5 transition-transform', showDone && 'rotate-90')} />Done · {doneList.length}
              </button>
              {showDone && <div className="mt-1 grid opacity-70">{doneList.map(taskRow)}</div>}
            </>
          )}
        </div>
        {!cur.none && (
          <div className="mt-4 flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onEdit(b)}><I.pencil className="size-3.5" />Edit {lower}</Button>
            <Button variant="outline" size="sm" onClick={() => onAddTask(b.name)}><I.plus className="size-3.5" />Add task</Button>
          </div>
        )}
      </Card>
    );
  };
  const tabs = [['active', 'Active'], ...BUCKET_STATUSES.map(x => [x.id, x.label])];
  return (
    <div>
      <PageHead title={plural(noun)} sub={`${count('active')} active${count('done') ? `, ${count('done')} done` : ''}`} />
      <PageBar className="mb-3">
        <FilterTabs label={`${noun} status`} value={tab} onChange={id => { setTab(id); setSel(null); }}
          items={tabs.map(([id, label]) => ({ id, label, count: count(id), dot: id !== 'active' ? BS[id].dot : null }))} />
        {onEditStatuses && <Button variant="ghost" size="sm" className="h-9 px-2 text-muted-foreground" onClick={onEditStatuses} title={`Edit ${lower} statuses`} aria-label={`Edit ${lower} statuses`}><I.sliders className="size-4" /></Button>}
        <div className="ml-auto flex w-full items-center gap-1.5 sm:w-auto">
          <FilterTabs label="Layout" value={mode} onChange={setMode}
            items={[{ id: 'list', label: 'List', icon: <I.listCheck className="size-3.5" /> }, { id: 'timeline', label: 'Timeline', icon: <I.calendar className="size-3.5" /> }]} />
          <PageSearch value={q} onChange={setQ} placeholder={`Search ${plural(lower)}`} />
        </div>
      </PageBar>
      <div className="flex flex-col items-start gap-4 lg:flex-row">
 {mode === 'timeline' ? (
        <Card className="w-full min-w-0 flex-1 overflow-hidden" aria-label={`${plural(noun)} timeline`}>
          <BucketTimeline rows={rows} sel={cur && cur.b.name} onSelect={name => setSel(s => s === name ? null : name)} onPlan={onPlan} lower={lower} />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t px-4 py-2 text-xs text-muted-foreground">
            <span>Sorted by planned start</span><span>Drag a bar to move it, drag an edge to change its length</span><span><kbd>←</kbd> <kbd>→</kbd> move · <kbd>Shift</kbd> a week · <kbd>Alt</kbd> the end</span>
            <button type="button" onClick={onNew} className="ml-auto inline-flex items-center gap-1 hover:text-foreground"><I.plus className="size-3.5" />New {lower}</button>
          </div>
        </Card>
        ) : (
        <Card className="w-full min-w-0 flex-1 overflow-hidden" role="grid" aria-label={plural(noun)}>
          <div role="row" className="hidden grid-cols-[minmax(0,1fr)_9.5rem_13rem_2rem] gap-x-4 border-b px-4 py-2 text-xs font-medium text-muted-foreground md:grid">
            <span>{noun}</span><span>Status</span><span>Progress</span><span />
          </div>
          {rows.map(r => row(r, false))}
          {showNone && row({ b: { name: 'none', label: `No ${lower}` }, st: none }, true)}
          {!rows.length && !showNone && (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              {nq ? `No ${plural(lower)} match “${q}”.` : tab === 'active' ? `No active ${plural(lower)}.` : `No ${plural(lower)} are ${BS[tab].label}.`}
            </div>
          )}
          <button type="button" onClick={onNew} className="flex h-11 w-full items-center gap-2 border-t px-4 text-left text-sm text-muted-foreground hover:bg-muted/40 hover:text-foreground"><I.plus className="size-4" />New {lower}</button>
        </Card>
        )}
        {cur && panel()}
      </div>
    </div>
  );
}

/* List view: tasks grouped into cards (by platform unless you pick something else). */
const GROUP_OPTIONS = ['project', 'bucket', 'status', 'assignee', 'priority'];
function groupTasks(tasks, by, stages, labels) {
  const key = t => by === 'status' ? statusDef(t, stages).id : by === 'priority' ? (t.priority || 'normal') : (t[by] || '').trim();
  const groups = new Map();
  tasks.forEach(t => { const k = key(t); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(t); });
  let order;
  if (by === 'status') order = statusList(stages).map(x => x.id).filter(id => groups.has(id));
  else if (by === 'priority') order = ['high', 'normal', 'low'].filter(k => groups.has(k));
  else order = [...groups.keys()].filter(Boolean).sort((a, b) => a.localeCompare(b)).concat(groups.has('') ? [''] : []);
  const name = k => {
    if (by === 'status') { const d = statusList(stages).find(x => x.id === k); return d ? d.name : k; }
    if (by === 'priority') return P[k].label;
    if (!k) return by === 'assignee' ? 'Unassigned' : `No ${(labels[by === 'project' ? 'platform' : by] || by).toLowerCase()}`;
    return k;
  };
  return order.map(k => ({ key: k, name: name(k), tasks: groups.get(k) }));
}

const TaskTimer = ({ t, onToggle, className }) => {
  const on = !!t.timerStartedAt;
  return (
    <button type="button" onClick={e => { e.stopPropagation(); onToggle(t.id); }} aria-label={`${on ? 'Pause' : 'Start'} timer for ${t.title || 'Untitled'}`}
      className={cn('tnum inline-flex h-6 items-center gap-1 rounded px-1 text-xs transition-colors hover:bg-muted', on ? 'font-semibold text-foreground' : 'text-muted-foreground', className)}>
      {on ? <I.pause className="size-3" /> : <I.play className="size-3" />}{<Elapsed task={t} />}
    </button>
  );
};
const MiniTag = ({ icon, children }) => (
  <span className="inline-flex h-5 max-w-[10rem] shrink-0 items-center gap-1 rounded-md border px-1.5 text-[11px] text-foreground/75 ui-fill">{icon}<span className="truncate">{children}</span></span>
);

function ListView({ tasks, stages, labels, groupBy, onOpen, onToggle, onAdd }) {
  const groups = groupTasks(tasks, groupBy, stages, labels);
  const presetFor = g => groupBy === 'status' ? (() => { const d = statusList(stages).find(x => x.id === g.key); return d ? { status: d.group, stage: d.builtin ? '' : d.id } : {}; })()
    : groupBy === 'priority' ? { priority: g.key } : { [groupBy]: g.key };
  return (
    <div className="mt-3 gap-3 [column-width:30rem]">
      {groups.map(g => (
        <Card key={g.key || '_none'} className="mb-3 break-inside-avoid overflow-hidden">
          <div className="flex h-12 items-center gap-2 px-4 text-sm font-semibold">
            {groupBy === 'status' ? <DefPill def={statusList(stages).find(x => x.id === g.key)} /> : groupBy === 'priority' ? <PriorityPill priority={g.key} />
              : <>{groupBy === 'project' ? <PIcon name={g.key} className="size-3.5 text-muted-foreground" /> : groupBy === 'bucket' ? <I.layers className="size-3.5 text-muted-foreground" /> : groupBy === 'assignee' ? <Avatar name={g.key} className="h-5 w-5 [&_span]:text-[9px]" /> : <I.flag className="size-3.5 text-muted-foreground" />}<span className="truncate">{g.name}</span></>}
            <span className="font-normal text-muted-foreground">{g.tasks.length}</span>
            <button type="button" onClick={() => onAdd(presetFor(g))} className="ml-auto inline-flex h-7 items-center gap-1 rounded-md px-2 font-normal text-muted-foreground hover:bg-muted hover:text-foreground"><I.plus className="size-3.5" />Add</button>
          </div>
          {g.tasks.map(t => {
            const def = statusDef(t, stages), d = due(t), done = t.status === 'done', on = !!t.timerStartedAt;
            return (
              <div key={t.id} data-task-id={t.id} className="group flex gap-3 border-t border-border/60 px-4 py-3 hover:bg-muted/40">
                {done
                  ? <span title={def.name} aria-label={def.name} className="mt-px flex size-[26px] shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white [&_svg]:size-3"><I.check /></span>
                  : <button type="button" onClick={() => onToggle(t.id)} aria-label={`${on ? 'Stop' : 'Start'} timer for ${t.title || 'Untitled'}`} title={on ? 'Stop timer' : 'Start timer'}
                      className={cn('mt-px flex size-[26px] shrink-0 items-center justify-center rounded-full border transition-colors [&_svg]:size-3', on ? 'border-emerald-500 bg-emerald-500 text-white' : 'text-muted-foreground hover:text-foreground')}>
                      {on ? <I.pause /> : <I.play className="translate-x-px" />}
                    </button>}
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <div className="flex items-baseline gap-3">
                    <button type="button" onClick={e => onOpen(t.id, e)} onAuxClick={e => { if (e.button === 1) { e.preventDefault(); onOpen(t.id, { ctrlKey: true }); } }}
                      className={cn('min-w-0 flex-1 text-left text-sm font-medium leading-snug hover:underline underline-offset-4', done && 'text-muted-foreground line-through', !t.title && 'font-normal text-muted-foreground')}>{t.title || 'Untitled'}</button>
                    {t.deadline && !done && <span className={cn('shrink-0 whitespace-nowrap text-xs', dueCls[d.tone])}>{d.text}</span>}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-[11.5px]">
                    {groupBy !== 'status' && <DefPill def={def} className="h-[22px] text-[11.5px]" />}
                    {groupBy !== 'project' && t.project && <span className="inline-flex h-[22px] items-center gap-1 rounded-md border px-1.5 text-foreground/85 ui-fill"><PIcon name={t.project} className="size-3 text-muted-foreground" />{t.project}</span>}
                    {groupBy !== 'bucket' && t.bucket && <span className="inline-flex h-[22px] items-center gap-1 rounded-md border px-1.5 text-foreground/85 ui-fill"><I.layers className="size-3 text-muted-foreground" />{t.bucket}</span>}
                    {groupBy !== 'priority' && <PriorityPill priority={t.priority} className="h-[22px] text-[11.5px]" />}
                    <span className="ml-auto flex items-center gap-2.5 text-muted-foreground">
                      <span className={cn('tnum font-mono', on && 'text-emerald-600 dark:text-emerald-400')}>{<Elapsed task={t} />}</span>
                      {groupBy !== 'assignee' && t.assignee && <PersonHover name={t.assignee}><Avatar name={t.assignee} className="h-5 w-5 [&_span]:text-[9px]" /></PersonHover>}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </Card>
      ))}
      {groups.length === 0 && <Card><Empty icon={<I.clipboard />} title="Nothing here" description="Try another filter, or add a task." /></Card>}
    </div>
  );
}

/* Board view: a column per status. Drag a card to change its status. */
function BoardView({ tasks, stages, labels, onOpen, onToggle, onMove, onAdd }) {
  const [doneOpen, setDoneOpen] = useState(false);
  const [drag, setDrag] = useState(null);
  const justDragged = useRef(false);
  const cols = statusList(stages);
  const byCol = id => tasks.filter(t => statusDef(t, stages).id === id);
  const startDrag = (e, t) => {
    if (e.button !== 0 || e.target.closest('button[data-nodrag]')) return;
    const sx = e.clientX, sy = e.clientY; let moved = false;
    const over = ev => { const el = document.elementFromPoint(ev.clientX, ev.clientY); const c = el && el.closest('[data-col]'); return c ? c.getAttribute('data-col') : null; };
    const move = ev => {
      if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return;
      moved = true;
      setDrag({ id: t.id, title: t.title || 'Untitled', x: ev.clientX, y: ev.clientY, over: over(ev) });
    };
    const up = ev => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
      if (moved) { const c = over(ev); if (c) onMove(t.id, c); justDragged.current = true; setTimeout(() => { justDragged.current = false; }, 0); }
      setDrag(null);
    };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
  };
  const card = t => {
    const d = due(t), on = !!t.timerStartedAt;
    return (
      <div key={t.id} data-task-id={t.id} role="button" tabIndex={0} onPointerDown={e => startDrag(e, t)}
        onClick={e => { if (!justDragged.current) onOpen(t.id, e); }}
        onKeyDown={e => { if (e.key === 'Enter') onOpen(t.id, e); }}
        className={cn('flex cursor-grab select-none flex-col gap-2.5 rounded-lg border p-3 text-left transition-shadow hover:shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring active:cursor-grabbing ui-card', drag && drag.id === t.id && 'opacity-40', on && 'ring-1 ring-foreground/20')}>
        <div className={cn('text-[13px] font-medium leading-snug', t.status === 'done' && 'text-muted-foreground line-through', !t.title && 'font-normal text-muted-foreground')}>{t.title || 'Untitled'}</div>
        <div className="flex flex-wrap gap-1.5">
          {t.project && <MiniTag icon={<PIcon name={t.project} className="size-3 text-muted-foreground" />}>{t.project}</MiniTag>}
          {t.bucket && <MiniTag icon={<I.layers className="size-3 text-muted-foreground" />}>{t.bucket}</MiniTag>}
          <PriorityPill priority={t.priority} />
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          {t.assignee && <PersonHover name={t.assignee}><Avatar name={t.assignee} className="h-5 w-5 [&_span]:text-[8px]" /></PersonHover>}
          {t.deadline && <span className={cn('inline-flex items-center gap-1', dueCls[d.tone])}><I.calendar className="size-3" />{d.text}</span>}
          {(t.checklist || []).length > 0 && <span className="tnum inline-flex items-center gap-0.5"><I.listCheck className="size-3" />{t.checklist.filter(c => c.done).length}/{t.checklist.length}</span>}
          <span data-nodrag className="ml-auto"><TaskTimer t={t} onToggle={onToggle} /></span>
        </div>
      </div>
    );
  };
  const doneCols = cols.filter(c => c.group === 'done');
  const doneCount = doneCols.reduce((n, c) => n + byCol(c.id).length, 0);
  return (
    <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
      {cols.filter(c => c.group !== 'done' || doneOpen).map(c => {
        const list = byCol(c.id);
        return (
          <div key={c.id} data-col={c.id} className={cn('flex min-w-[17rem] flex-1 basis-72 flex-col gap-2 rounded-xl bg-muted/60 p-2 transition-colors', drag && drag.over === c.id && 'bg-muted ring-1 ring-foreground/20')}>
            <div className="flex h-7 items-center gap-2 px-1.5 text-[13px] font-medium">
              <span className={cn('size-2 rounded-full', STATUS_COLORS[c.color])} />{c.name}<span className="font-normal text-muted-foreground">{list.length}</span>
              {c.group === 'done' && <button type="button" onClick={() => setDoneOpen(false)} className="ml-auto text-xs font-normal text-muted-foreground hover:text-foreground">Collapse</button>}
            </div>
            {list.map(card)}
            <button type="button" onClick={() => onAdd({ status: c.group, stage: c.builtin ? '' : c.id })}
              className="flex h-8 items-center gap-1.5 rounded-md px-2 text-left text-xs text-muted-foreground hover:bg-background/60 hover:text-foreground"><I.plus className="size-3.5" />New</button>
          </div>
        );
      })}
      {!doneOpen && (
        <button type="button" data-col={(doneCols[0] || {}).id || 'done'} onClick={() => setDoneOpen(true)} title={`Show ${GROUP_HEAD.done}`}
          className={cn('flex w-12 shrink-0 flex-col items-center gap-2 rounded-xl bg-muted/60 py-3 text-xs text-muted-foreground transition-colors hover:text-foreground', drag && drag.over === ((doneCols[0] || {}).id || 'done') && 'bg-muted ring-1 ring-foreground/20')}>
          <span className="size-2 rounded-full bg-emerald-500" />
          <span className="tnum font-medium">{doneCount}</span>
          <span className="[writing-mode:vertical-rl]">{GROUP_HEAD.done}</span>
        </button>
      )}
      {drag && (
        <div className="pointer-events-none fixed z-[90] w-64 rounded-lg border bg-card p-3 text-[13px] font-medium ui-float" style={{ left: drag.x + 8, top: drag.y + 8 }}>{drag.title}</div>
      )}
    </div>
  );
}

/* Timesheet: tracked time per day (or per week for a month), grouped how you like. */
const fmtHM = ms => { const m = Math.round(ms / 60000); return m ? `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}` : ''; };
const startOfDay = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
function timesheetRange(unit, offset) {
  const today = startOfDay(new Date());
  if (unit === 'week') {
    const mon = addDays(today, -((today.getDay() + 6) % 7) + offset * 7);
    return { start: mon, end: addDays(mon, 7), cols: Array.from({ length: 7 }, (_, i) => { const d = addDays(mon, i); return { s: +d, e: +addDays(d, 1), label: d.toLocaleDateString(undefined, { weekday: 'short' }), sub: String(d.getDate()) }; }) };
  }
  const first = new Date(today.getFullYear(), today.getMonth() + offset, 1), next = new Date(first.getFullYear(), first.getMonth() + 1, 1);
  const cols = []; let c = first;
  while (c < next) { const wEnd = addDays(c, 7 - ((c.getDay() + 6) % 7)); const e = wEnd < next ? wEnd : next; cols.push({ s: +c, e: +e, label: `${c.getDate()}–${addDays(e, -1).getDate()}`, sub: c.toLocaleDateString(undefined, { month: 'short' }) }); c = e; }
  return { start: first, end: next, cols };
}
function TimesheetView({ tasks, stages, labels, onAddTime, onDeleteSession, onOpenTask, onExportCsv, onPrint }) {
  const [unit, setUnit] = useState('week');
  const [offset, setOffset] = useState(0);
  const [group, setGroup] = useState('task');
  const [cell, setCell] = useState(null);
  const now = Date.now();
  const R = timesheetRange(unit, offset);
  const sessionsOf = t => [...(t.sessions || []), ...(t.timerStartedAt ? [{ s: t.timerStartedAt, e: now, running: true }] : [])];
  const keyOf = t => group === 'task' ? t.id : group === 'bucket' ? (t.bucket || '') : group === 'platform' ? (t.project || '') : (t.assignee || '');
  const nameOf = (k, t) => group === 'task' ? (t.title || 'Untitled') : k || (group === 'bucket' ? `No ${labels.bucket.toLowerCase()}` : group === 'platform' ? `No ${labels.platform.toLowerCase()}` : 'Unassigned');
  const rows = new Map();
  tasks.forEach(t => {
    const ss = sessionsOf(t); if (!ss.length) return;
    const vals = R.cols.map(c => ss.reduce((n, x) => n + overlap(x.s, x.e, c.s, c.e), 0));
    const total = vals.reduce((a, b) => a + b, 0); if (!total) return;
    const k = keyOf(t);
    if (!rows.has(k)) rows.set(k, { key: k, name: nameOf(k, t), task: group === 'task' ? t : null, vals: R.cols.map(() => 0), total: 0 });
    const r = rows.get(k); vals.forEach((v, i) => { r.vals[i] += v; }); r.total += total;
  });
  const list = [...rows.values()].sort((a, b) => b.total - a.total);
  const colTotals = R.cols.map((_, i) => list.reduce((n, r) => n + r.vals[i], 0));
  const grand = colTotals.reduce((a, b) => a + b, 0);
  const undated = tasks.reduce((n, t) => n + Math.max(0, (t.timeSpent || 0) - (t.sessions || []).reduce((a, x) => a + (x.e - x.s), 0)), 0);
  const label = unit === 'week' ? `${R.start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${addDays(R.end, -1).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
    : R.start.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const preset = unit === 'week' && offset === 0 ? 'w0' : unit === 'week' && offset === -1 ? 'w1' : unit === 'month' && offset === 0 ? 'm0' : unit === 'month' && offset === -1 ? 'm1' : 'custom';
  const groupLabel = { task: labels.task, bucket: labels.bucket, platform: labels.platform, person: labels.assignee }[group];
  const exportData = { title: `Timesheet, ${label}`, cols: R.cols.map(c => `${c.label} ${c.sub}`.trim()), groupLabel, rows: list.map(r => ({ name: r.name, vals: r.vals, total: r.total })), colTotals, grand };
  return (
    <div>
      <PageHead title="Timesheet" sub={`${label}, ${fmtShort(grand)} tracked`} />
      <PageBar>
        <FilterTabs label="Period" value={preset} onChange={v => { if (v === 'w0') { setUnit('week'); setOffset(0); } if (v === 'w1') { setUnit('week'); setOffset(-1); } if (v === 'm0') { setUnit('month'); setOffset(0); } if (v === 'm1') { setUnit('month'); setOffset(-1); } }}
          items={[{ id: 'w0', label: 'This week' }, { id: 'w1', label: 'Last week' }, { id: 'm0', label: 'This month' }, { id: 'm1', label: 'Last month' }]} />
        <div className="ml-auto flex items-center gap-1.5">
          <div className="flex items-center">
            <Button variant="ghost" size="icon-sm" aria-label={unit === 'week' ? 'Previous week' : 'Previous month'} title={unit === 'week' ? 'Previous week' : 'Previous month'} onClick={() => setOffset(o => o - 1)}><I.left /></Button>
            <span className="min-w-[9.5rem] text-center text-xs font-medium">{label}</span>
            <Button variant="ghost" size="icon-sm" aria-label={unit === 'week' ? 'Next week' : 'Next month'} title={unit === 'week' ? 'Next week' : 'Next month'} onClick={() => setOffset(o => o + 1)}><I.right /></Button>
          </div>
          <Select variant="chip" label="Group by" value={group} onChange={setGroup} searchable={false} icon={<I.rows className="size-3.5 shrink-0" />} renderValue={o => <span>By {o.label.toLowerCase()}</span>}
            options={[{ value: 'task', label: labels.task }, { value: 'bucket', label: labels.bucket }, { value: 'platform', label: labels.platform }, { value: 'person', label: labels.assignee }]} />
          <DropdownMenu align="end" trigger={p => <Button {...p} variant="outline" size="sm" className="h-8 bg-card shadow-none"><I.download />Export<I.down className="size-3" /></Button>}
            items={[{ label: 'CSV for Excel…', icon: <I.table />, onSelect: () => onExportCsv(exportData) }, { label: 'Print or save as PDF…', icon: <I.file />, onSelect: () => onPrint(exportData) }]} />
        </div>
      </PageBar>
      <Card className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-[13px]">
          <thead>
            <tr className="border-b text-xs text-muted-foreground">
              <th className="h-10 px-3 text-left font-normal">{groupLabel}</th>
              {R.cols.map(c => (
                <th key={c.s} className={cn('h-10 w-[84px] px-2 text-right font-normal', startOfDay(new Date()).getTime() >= c.s && startOfDay(new Date()).getTime() < c.e && unit === 'week' && 'text-foreground')}>
                  <div>{c.label}</div><div className="text-[11px] opacity-70">{c.sub}</div>
                </th>
              ))}
              <th className="h-10 w-[90px] px-3 text-right font-medium text-foreground">Total</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={R.cols.length + 2} className="px-3 py-10 text-center text-sm text-muted-foreground">No time tracked in this period. Start a timer on a task, or use Add time.</td></tr>}
            {list.map(r => (
              <tr key={r.key || '_none'} className="border-b last:border-0 hover:bg-muted/40">
                <td className="h-9 max-w-0 px-3">
                  {r.task ? (
                    <button type="button" onClick={() => onOpenTask(r.task.id)} className="flex max-w-full items-center gap-2 text-left hover:underline underline-offset-4">
                      <span className={cn('size-2 shrink-0 rounded-full', STATUS_COLORS[statusDef(r.task, stages).color])} /><span className="truncate">{r.name}</span>
                    </button>
                  ) : <span className="block truncate">{r.name}</span>}
                </td>
                {r.vals.map((v, i) => (
                  <td key={i} className="h-9 p-0 text-right">
                    {r.task ? (
                      <button type="button" onClick={e => setCell({ task: r.task, col: R.cols[i], el: e.currentTarget })}
                        className={cn('tnum h-9 w-full px-2 text-right hover:bg-muted/70', !v && 'text-muted-foreground/40')}>{fmtHM(v) || '·'}</button>
                    ) : <span className={cn('tnum block px-2', !v && 'text-muted-foreground/40')}>{fmtHM(v) || '·'}</span>}
                  </td>
                ))}
                <td className="tnum h-9 px-3 text-right font-medium">{fmtHM(r.total)}</td>
              </tr>
            ))}
          </tbody>
          {list.length > 0 && (
            <tfoot>
              <tr className="border-t bg-muted/40 text-xs">
                <td className="h-9 px-3 font-medium">Total</td>
                {colTotals.map((v, i) => <td key={i} className="tnum px-2 text-right">{fmtHM(v)}</td>)}
                <td className="tnum px-3 text-right text-sm font-semibold">{fmtHM(grand)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </Card>
      <p className="mt-2 text-xs text-muted-foreground">Times are hours:minutes. Click a cell to see or remove its time entries.{undated > 60000 ? ` ${fmtShort(undated)} tracked before daily records began isn’t dated, so it isn’t shown here.` : ''}</p>
      {cell && <TimeCellPopover cell={cell} onClose={() => setCell(null)} onDelete={(t, x) => { onDeleteSession(t, x); }} onAdd={() => { const c = cell; setCell(null); onAddTime({ taskId: c.task.id, date: toISO(new Date(c.col.s)) }); }} />}
    </div>
  );
}
function TimeCellPopover({ cell, onClose, onDelete, onAdd }) {
  const a = useRef(cell.el), p = useRef(null);
  useDismiss(true, v => { if (!v) onClose(); }, [a, p]);
  const now = Date.now();
  const list = [...(cell.task.sessions || []), ...(cell.task.timerStartedAt ? [{ s: cell.task.timerStartedAt, e: now, running: true }] : [])]
    .filter(x => overlap(x.s, x.e, cell.col.s, cell.col.e) > 0).sort((x, y) => x.s - y.s);
  const hm = ms => new Date(ms).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return (
    <Floating anchorRef={a} panelRef={p} open className="w-72 p-1">
      <div className="px-2 pb-1 pt-1.5 text-xs font-medium text-muted-foreground">{cell.task.title || 'Untitled'}</div>
      {list.length === 0 && <div className="px-2 py-2 text-sm text-muted-foreground">No time here yet.</div>}
      {list.map((x, i) => (
        <div key={i} className="group flex h-8 items-center gap-2 rounded-sm px-2 text-sm hover:bg-accent">
          <span className="tnum flex-1">{new Date(x.s).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })}, {hm(x.s)}–{x.running ? 'now' : hm(x.e)}</span>
          {x.manual && <span className="text-[10px] text-muted-foreground">added</span>}
          <span className="tnum text-xs text-muted-foreground">{fmtShort(x.e - x.s)}</span>
          {!x.running && <button type="button" aria-label="Remove this entry" title="Remove" onClick={() => onDelete(cell.task, x)} className={cn("flex size-6 items-center justify-center rounded opacity-0 hover:bg-muted group-hover:opacity-100", danger)}><I.trash className="size-3.5" /></button>}
        </div>
      ))}
      <div className="mx-1 my-1 h-px bg-border" />
      <button type="button" onClick={onAdd} className="flex h-8 w-full items-center gap-2 rounded-sm px-2 text-left text-sm text-muted-foreground hover:bg-accent hover:text-foreground"><I.plus className="size-3.5" />Add time on this day</button>
    </Floating>
  );
}
function AddTimeDialog({ init, tasks, onClose, onSave }) {
  const [taskId, setTaskId] = useState('');
  const [date, setDate] = useState('');
  const [start, setStart] = useState('09:00');
  const [h, setH] = useState('1'), [m, setM] = useState('0');
  useEffect(() => { if (init) { setTaskId(init.taskId || ''); setDate(init.date || toISO(new Date())); setStart('09:00'); setH('1'); setM('0'); } }, [init]);
  if (!init) return null;
  const dur = (Number(h) || 0) * 3600e3 + (Number(m) || 0) * 60e3;
  const ok = taskId && date && dur > 0;
  return (
    <Dialog open onClose={onClose} title="Add time" description="For time you worked but didn’t track with the timer." className="max-w-md"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={!ok} onClick={() => { const [hh, mm] = start.split(':').map(Number); const s0 = fromISO(date); s0.setHours(hh || 0, mm || 0, 0, 0); onSave(taskId, +s0, +s0 + dur); }}>Add {fmtShort(dur) || ''}</Button></>}>
      <div className="grid gap-4">
        <Field label="Task" htmlFor="at-task">
          <Select id="at-task" value={taskId} onChange={setTaskId} placeholder="Choose a task…" options={tasks.slice().sort((a, b) => b.createdAt - a.createdAt).map(t => ({ value: t.id, label: t.title || 'Untitled', group: t.status === 'done' ? 'Complete' : 'Open' }))} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Day" htmlFor="at-day"><DatePicker id="at-day" value={date} onChange={setDate} /></Field>
          <Field label="Started at" htmlFor="at-start"><Input id="at-start" type="time" value={start} onChange={e => setStart(e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Hours" htmlFor="at-h"><Input id="at-h" type="number" min="0" max="24" value={h} onChange={e => setH(e.target.value)} /></Field>
          <Field label="Minutes" htmlFor="at-m"><Input id="at-m" type="number" min="0" max="59" step="5" value={m} onChange={e => setM(e.target.value)} /></Field>
        </div>
      </div>
    </Dialog>
  );
}

/* Command palette (Ctrl+K): jump to anything, or run an action, by typing. */
function CommandPalette({ open, onClose, items }) {
  const [q, setQ] = useState('');
  const [hi, setHi] = useState(0);
  const lst = useRef(null);
  useEffect(() => { if (open) { setQ(''); setHi(0); } }, [open]);
  useLockScroll(open);
  useEffect(() => {
    if (!open) return;
    const k = e => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    document.addEventListener('keydown', k, true);
    return () => document.removeEventListener('keydown', k, true);
  }, [open, onClose]);
  useEffect(() => { const el = lst.current && lst.current.querySelector(`[data-i="${hi}"]`); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' }); }, [hi]);
  if (!open) return null;
  const words = norm(q).split(/\s+/).filter(Boolean);
  const match = it => words.every(w => norm(`${it.label} ${it.hint || ''} ${it.keywords || ''}`).includes(w));
  const groups = ['Actions', 'Tasks', 'Buckets', 'Documents'];
  const shown = [];
  groups.forEach(g => { shown.push(...items.filter(it => it.group === g && match(it)).slice(0, g === 'Actions' && !q ? 8 : 8)); });
  const run = it => { onClose(); setTimeout(() => it.run(), 0); };
  const onKey = e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi(h => Math.min(h + 1, shown.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi(h => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (shown[hi]) run(shown[hi]); }
  };
  let last = null;
  return createPortal(
    <>
      <div className="fixed inset-0 z-[85] bg-black/40 anim-fade" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label="Command palette"
        className="fixed left-1/2 top-[14vh] z-[86] w-[min(640px,calc(100%-2rem))] -translate-x-1/2 overflow-hidden rounded-xl border bg-popover text-popover-foreground anim-pop ui-float">
        <div className="flex items-center gap-2 border-b px-4">
          <I.search className="text-muted-foreground" />
          <input autoFocus value={q} onChange={e => { setQ(e.target.value); setHi(0); }} onKeyDown={onKey} placeholder="Type a command, or search tasks, buckets and documents…" aria-label="Command"
            className="h-12 flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus-visible:outline-none" />
          <Kbd>Esc</Kbd>
        </div>
        <div ref={lst} role="listbox" className="max-h-[min(26rem,60vh)] overflow-y-auto p-1.5">
          {shown.length === 0 && <div className="px-3 py-6 text-center text-sm text-muted-foreground">Nothing matches “{q}”.</div>}
          {shown.map((it, i) => {
            const head = it.group !== last ? it.group : null; last = it.group;
            return (
              <React.Fragment key={it.id}>
                {head && <div className="px-2.5 pb-1 pt-2 text-[11px] font-medium text-muted-foreground">{head === 'Buckets' && it.groupLabel ? it.groupLabel : head}</div>}
                <div role="option" aria-selected={i === hi} data-i={i} onMouseEnter={() => setHi(i)} onClick={() => run(it)}
                  className={cn('flex h-9 cursor-default items-center gap-2.5 rounded-md px-2.5 text-sm [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground', i === hi && 'bg-accent')}>
                  {it.icon}<span className="min-w-0 flex-1 truncate">{it.label}</span>
                  {it.hint && <span className="shrink-0 truncate text-xs text-muted-foreground">{it.hint}</span>}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </>, document.body);
}

/* Archive: finished tasks moved out of the way after a while. Searchable, restorable. */
const ARCHIVE_DAY_OPTIONS = [['7', 'After 7 days'], ['30', 'After 30 days'], ['90', 'After 90 days'], ['0', 'Never']];
function ArchiveView({ items, labels, days, onDays, onRestore, onTrash, onCleanUp }) {
  const [q, setQ] = useState('');
  const nq = norm(q);
  const list = Object.values(items).filter(t => !nq || [t.title, t.project, t.bucket].some(v => norm(v).includes(nq)))
    .sort((a, b) => (b.doneAt || b.archivedAt || 0) - (a.doneAt || a.archivedAt || 0));
  return (
    <div className="mt-6">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="text-base font-semibold">Archive</h2>
        <span className="text-sm text-muted-foreground">{Object.keys(items).length} {Object.keys(items).length === 1 ? 'task' : 'tasks'}</span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Archive finished tasks</span>
          <Select variant="chip" label="When to archive" value={String(days)} onChange={v => onDays(Number(v))} searchable={false}
            options={ARCHIVE_DAY_OPTIONS.map(([value, label]) => ({ value, label }))} />
          <Button size="sm" variant="outline" className={danger} onClick={onCleanUp} disabled={!Object.keys(items).length}><I.trash />Clean up…</Button>
        </div>
      </div>
      <div className="relative mb-3 max-w-sm">
        <I.search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search the archive" aria-label="Search the archive" className="h-9 bg-card pl-9 shadow-none" />
      </div>
      <Card className="overflow-hidden">
        {list.length === 0 ? (
          <Empty icon={<I.clipboard />} title={q ? 'Nothing matches' : 'The archive is empty'}
            description={days ? `Finished tasks move here ${days} days after they’re completed.` : 'Archiving is turned off.'} />
        ) : (
          <div className="divide-y">
            {list.map(t => (
              <div key={t.id} className="flex h-11 items-center gap-3 px-4 text-[13px]">
                <I.check className="size-3.5 shrink-0 text-emerald-600" />
                <span className="min-w-0 flex-1 truncate font-medium">{t.title || 'Untitled'}</span>
                {t.project && <span className="hidden max-w-[10rem] truncate text-xs text-muted-foreground md:block">{t.project}</span>}
                {t.bucket && <span className="hidden max-w-[10rem] truncate text-xs text-muted-foreground lg:block">{t.bucket}</span>}
                <span className="w-28 shrink-0 text-right text-xs text-muted-foreground">Done {fmtDay(t.doneAt || t.archivedAt)}</span>
                <Button size="sm" variant="ghost" className="h-7" onClick={() => onRestore(t.id)}><I.reset className="size-3.5" />Restore</Button>
                <Button size="icon-sm" variant="ghost" className={danger} aria-label={`Move ${t.title || 'Untitled'} to the Trash`} title="Move to Trash" onClick={() => onTrash(t.id)}><I.trash className="size-3.5" /></Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function TrashView({ items, onRestore, onDeleteNow, onEmpty }) {
  const now = Date.now();
  const list = Object.values(items).sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0));
  return (
    <div className="mt-6">
      <div className="mb-1 flex flex-wrap items-center gap-3">
        <h2 className="text-base font-semibold">Trash</h2>
        <span className="text-sm text-muted-foreground">{list.length} {list.length === 1 ? 'task' : 'tasks'}</span>
        <Button size="sm" variant="outline" className="ml-auto" disabled={!list.length} onClick={onEmpty}>Empty Trash…</Button>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">Tasks here are deleted for good after {TRASH_DAYS} days. Their documents stay in Documents.</p>
      <Card className="overflow-hidden">
        {list.length === 0 ? <Empty icon={<I.trash />} title="The Trash is empty" description="Deleted tasks wait here before they’re gone for good." /> : (
          <div className="divide-y">
            {list.map(t => {
              const left = Math.max(0, TRASH_DAYS - Math.floor((now - (t.deletedAt || now)) / 864e5));
              return (
                <div key={t.id} className="flex h-11 items-center gap-3 px-4 text-[13px]">
                  <I.file className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate font-medium">{t.title || 'Untitled'}</span>
                  <span className="w-40 shrink-0 text-right text-xs text-muted-foreground">Deleted {fmtDay(t.deletedAt)}, {left} {left === 1 ? 'day' : 'days'} left</span>
                  <Button size="sm" variant="ghost" className="h-7" onClick={() => onRestore(t.id)}><I.reset className="size-3.5" />Restore</Button>
                  <Button size="sm" variant="ghost" className="h-7 text-destructive hover:text-destructive" onClick={() => onDeleteNow(t)}>Delete now</Button>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

function CleanUpDialog({ open, items, onClose, onConfirm }) {
  const [months, setMonths] = useState('6');
  const cutoff = Date.now() - Number(months) * 30.4 * 864e5;
  const matches = Object.values(items).filter(t => (t.doneAt || t.archivedAt || 0) < cutoff);
  return (
    <Dialog open={open} onClose={onClose} title="Clean up the archive" className="max-w-md"
      description={`Archived tasks completed before the date you pick move to the Trash. You can still restore them there for ${TRASH_DAYS} days. Documents are kept.`}
      footer={<>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button disabled={!matches.length} onClick={() => onConfirm(matches.map(t => t.id))}>Move {matches.length} {matches.length === 1 ? 'task' : 'tasks'} to Trash</Button>
      </>}>
      <Field label="Completed more than" htmlFor="cu-m">
        <Select id="cu-m" value={months} onChange={setMonths} searchable={false}
          options={[['1', '1 month ago'], ['3', '3 months ago'], ['6', '6 months ago'], ['12', '12 months ago']].map(([value, label]) => ({ value, label }))} />
      </Field>
      <p className="text-sm text-muted-foreground">{matches.length ? `${matches.length} of ${Object.keys(items).length} archived tasks match.` : 'No archived tasks are that old.'}</p>
    </Dialog>
  );
}

function ProjectsView({ list, tasks, onNew, onEdit, onDelete, onOpen }) {
  const now = Date.now();
  const stats = name => {
    const ts = tasks.filter(t => (name === null ? !t.project : norm(t.project) === norm(name)));
    const done = ts.filter(t => t.status === 'done').length;
    return {
      total: ts.length, done, open: ts.length - done, todo: ts.filter(t => t.status === 'todo' || t.status === 'blocked').length,
      doing: ts.filter(t => t.status === 'doing').length,
      blocked: ts.filter(t => t.status === 'blocked').length,
      overdue: ts.filter(t => t.status !== 'done' && t.deadline && dayDiff(t.deadline) < 0).length,
      time: ts.reduce((x, t) => x + elapsed(t), 0),
    };
  };
  const unassigned = stats(null);
  const ProjectCard = ({ p, st, editable }) => {
    const c = PROJECT_COLORS[p.color] || PROJECT_COLORS.slate;
    const pct = st.total ? Math.round(st.done / st.total * 100) : 0;
    return (
      <Card className="group flex flex-col p-5 transition-shadow hover:shadow-md">
        <div className="flex items-start gap-3">
          <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', c.soft)}><PIcon name={p.name} icon={p.icon} /></span>
          <div className="min-w-0 flex-1">
            <button type="button" onClick={() => onOpen(p.name)} className="block max-w-full truncate text-left font-semibold hover:underline underline-offset-4">{p.label || p.name}</button>
            <div className="text-xs text-muted-foreground">{st.total} {st.total === 1 ? 'task' : 'tasks'}{st.time ? `, ${fmtShort(st.time)} tracked` : ''}</div>
          </div>
          {editable && (
            <DropdownMenu
              trigger={pp => <Button {...pp} variant="ghost" size="icon-sm" aria-label={`Options for ${p.name}`}><I.more /></Button>}
              items={[
                { label: 'Rename or recolor', icon: <I.pencil />, onSelect: () => onEdit(p) },
                'sep',
                { label: 'Delete project', icon: <I.trash />, destructive: true, onSelect: () => onDelete(p) },
              ]} />
          )}
        </div>
        <div className="mt-5 flex items-end justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="tnum font-medium">{pct}%</span>
        </div>
        <div className="mt-1.5 h-1.5 rounded-full bg-muted"><div className={cn('h-full rounded-full transition-all', c.bar)} style={{ width: `${pct}%` }} /></div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          {[['To do', st.todo], ['In progress', st.doing], ['Done', st.done]].map(([l, v]) => (
            <div key={l} className="rounded-lg bg-muted/60 px-2 py-2">
              <div className="tnum text-lg font-semibold leading-none">{v}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">{l}</div>
            </div>
          ))}
        </div>
        {(st.overdue > 0 || st.blocked > 0) && (
          <div className="mt-3 flex flex-wrap gap-3 text-xs">
            {st.overdue > 0 && <span className="text-red-600 dark:text-red-400">{st.overdue} overdue</span>}
            {st.blocked > 0 && <span className="text-muted-foreground">{st.blocked} blocked</span>}
          </div>
        )}
        <div className="mt-auto pt-4"><Button variant="ghost" size="sm" className="-mb-1 w-full justify-between px-2" onClick={() => onOpen(p.name)}>View tasks<I.right /></Button></div>
      </Card>
    );
  };
  return (
    <div className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(min(100%,19rem),1fr))] gap-4">
      {list.map(p => <ProjectCard key={p.name} p={p} st={stats(p.name)} editable />)}
      {unassigned.total > 0 && <ProjectCard p={{ name: 'none', label: 'No project', color: 'slate' }} st={unassigned} />}
      <button type="button" onClick={onNew}
        className="flex min-h-[15rem] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed text-muted-foreground transition-colors hover:border-primary/40 hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
        <span className="flex size-10 items-center justify-center rounded-full bg-accent text-accent-foreground"><I.plus /></span>
        <span className="text-sm font-medium">New project</span>
      </button>
    </div>
  );
}

/* =========================================================
   Weekly report: what was done this week, what's in progress, and next week's plan,
   grouped by bucket. Built from tasks and timers; every line can be edited, removed or added to,
   and the result is copied as text, Markdown or formatted for email. Edits are kept per week on this PC.
   ========================================================= */
const REPORT_SECTIONS = [
  { id: 'done', title: 'Done this week', pastTitle: 'Done that week', empty: 'Nothing was marked done in this week.' },
  { id: 'doing', title: 'In progress', empty: 'Nothing is in progress.' },
  { id: 'next', title: 'Next week', empty: 'No deadlines next week, and no bucket is planned to start.' },
];
const weekStart = offset => addDays(startOfDay(new Date()), -((new Date().getDay() + 6) % 7) + offset * 7);
const fmtMD = d => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const fmtRange = (a, b) => a.getMonth() === b.getMonth() ? `${fmtMD(a)} – ${b.getDate()}, ${b.getFullYear()}` : `${fmtMD(a)} – ${fmtMD(b)}, ${b.getFullYear()}`;
async function copyToClipboard(text, html) {
  try {
    if (html && window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) {
      await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([text], { type: 'text/plain' }) })]);
      return true;
    }
    await navigator.clipboard.writeText(text); return true;
  } catch (e) {
    try {
      const ta = document.createElement('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;left:-9999px;opacity:0';
      document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); return ok;
    } catch (e2) { return false; }
  }
}
// Builds the report's content from the tasks. Each item: { key, task, bucket, title, meta: [..] }.
function buildReport({ tasks, buckets, stages, start, includeTime, noun }) {
  const end = addDays(start, 7), nextEnd = addDays(start, 14);
  const S0 = +start, E0 = +end, todayISO = toISO(new Date());
  const live = tasks.filter(t => !t.inbox);
  const bmap = Object.fromEntries(buckets.map(b => [norm(b.name), b]));
  const due = iso => { const d = fromISO(iso); return iso < todayISO && +d < E0 ? `overdue since ${fmtMD(d)}` : `due ${fmtMD(d)}`; };
  const steps = t => { const c = t.checklist || []; if (!c.length) return []; const n = c.filter(x => x.done).length; return [`${Math.round(n / c.length * 100)}% done`, `${n} of ${c.length} steps`]; };
  // Done: marked done inside the week (tasks done before doneAt existed use their last change).
  const done = live.filter(t => t.status === 'done' && (t.doneAt || t.updatedAt || 0) >= S0 && (t.doneAt || t.updatedAt || 0) < E0)
    .sort((a, b) => (a.doneAt || a.updatedAt || 0) - (b.doneAt || b.updatedAt || 0))
    .map(t => ({ task: t, meta: [includeTime && elapsed(t) >= 60000 ? fmtShort(elapsed(t)) : null] }));
  // In progress: In progress or Blocked now, or not done but worked on (timer) during the week.
  const doing = live.filter(t => t.status !== 'done' && !t.archivedAt && (t.status === 'doing' || t.status === 'blocked' || trackedIn(t, S0, E0) >= 60000))
    .sort((a, b) => (S[a.status].i - S[b.status].i) || (a.deadline || '9999').localeCompare(b.deadline || '9999'))
    .map(t => {
      const st = statusDef(t, stages), wk = trackedIn(t, S0, E0);
      return { task: t, meta: [
        t.status === 'blocked' ? (st.builtin ? 'blocked' : `blocked: ${st.name}`) : t.status === 'todo' ? null : !st.builtin ? st.name : null,
        ...steps(t),
        includeTime && wk >= 60000 ? `${fmtShort(wk)} this week` : null,
        t.deadline ? due(t.deadline) : null,
      ] };
    });
  const taken = new Set(doing.map(x => x.task.id));
  // Next week: open tasks due by the end of next week (overdue ones too) that aren't already in progress.
  const nextEndISO = toISO(nextEnd);
  const next = live.filter(t => t.status !== 'done' && !t.archivedAt && !taken.has(t.id) && t.deadline && t.deadline < nextEndISO)
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
    .map(t => ({ task: t, meta: [t.deadline ? due(t.deadline) : null] }));
  // The next bucket in sequence: any bucket planned to start next week, or else the first one planned after that.
  const nsISO = toISO(end);
  const planned = buckets.filter(b => bucketStatus(b) !== 'done' && b.start && b.start >= nsISO).sort((a, b) => a.start.localeCompare(b.start) || a.name.localeCompare(b.name));
  const nextBuckets = planned.filter(b => b.start < nextEndISO);
  if (!nextBuckets.length && planned[0]) nextBuckets.push(planned[0]);
  const listed = new Set([...taken, ...next.map(x => x.task.id)]);
  nextBuckets.forEach(b => live.filter(t => t.status !== 'done' && !t.archivedAt && norm(t.bucket) === norm(b.name) && !listed.has(t.id))
    .forEach(t => { listed.add(t.id); next.push({ task: t, meta: [t.deadline ? due(t.deadline) : null] }); }));
  const groupMeta = (name, sec) => {
    const b = bmap[norm(name)]; if (!b) return '';
    if (sec === 'next' && nextBuckets.includes(b)) return `starts ${fmtMD(fromISO(b.start))}${b.end ? `, ends ${fmtMD(fromISO(b.end))}` : ''}`;
    const ts = tasks.filter(t => norm(t.bucket) === norm(name)), d = ts.filter(t => t.status === 'done').length;
    return [ts.length ? `${d} of ${ts.length} done` : '', b.end ? `${b.end < todayISO && d < ts.length ? 'was due' : 'ends'} ${fmtMD(fromISO(b.end))}` : ''].filter(Boolean).join(', ');
  };
  const order = name => { const b = bmap[norm(name)]; return b && b.start ? b.start : '9999'; };
  const group = (items, sec) => {
    const m = new Map();
    items.forEach(x => { const k = norm(x.task.bucket); if (!m.has(k)) m.set(k, { key: k, name: k ? ((bmap[k] || {}).name || x.task.bucket.trim()) : '', items: [] }); m.get(k).items.push({ ...x, key: `${sec}:${x.task.id}`, meta: x.meta.filter(Boolean) }); });
    if (sec === 'next') nextBuckets.forEach(b => { const k = norm(b.name); if (!m.has(k)) m.set(k, { key: k, name: b.name, items: [] }); });
    return [...m.values()].map(g => ({ ...g, status: g.name && bmap[g.key] ? bucketStatus(bmap[g.key]) : null, meta: g.name ? groupMeta(g.name, sec) : '' }))
      .sort((a, b) => (!a.name) - (!b.name) || order(a.name).localeCompare(order(b.name)) || a.name.localeCompare(b.name));
  };
  const total = tasks.reduce((n, t) => n + trackedIn(t, S0, E0), 0);
  return { start, end, sections: { done: group(done, 'done'), doing: group(doing, 'doing'), next: group(next, 'next') }, total, nextStart: end, scope: buildScope({ tasks: live, buckets, S0, E0, includeTime, noun }) };
}
// Scope changes for the report: what was added to buckets already under way this week, how far
// their ends moved, and over every tracked bucket, which reason brings the most added work.
function buildScope({ tasks, buckets, S0, E0, includeTime, noun }) {
  const tracked = buckets.map(b => ({ b, sc: bucketScope(b, tasks) })).filter(x => x.sc && x.sc.started);
  const lower = (noun || 'Bucket').toLowerCase();
  const rshort = r => (r.n === 1 || r.id === 'none' ? r.short : plural(r.short));
  const reasonText = rs => rs.map(r => `${r.n} ${rshort(r)}`).join(', ');
  const lines = [];
  tracked.forEach(({ b, sc }) => {
    const wk = sc.added.filter(t => joinedAt(t) >= S0 && joinedAt(t) < E0);
    const movedWk = sc.moves.filter(m => m.at >= S0 && m.at < E0);
    const active = bucketStatus(b) !== 'done' && ((b.end || '') >= toISO(new Date(S0)) || sc.late);
    if (!wk.length && !movedWk.length && !(active && sc.added.length)) return;
    const parts = [];
    if (sc.added.length) parts.push(`${nTasks(sc.added.length)} added after it started${wk.length && wk.length !== sc.added.length ? ` (${wk.length} this week)` : wk.length ? ' (all this week)' : ''}: ${reasonText(sc.reasons)}`);
    if (includeTime && sc.time >= 60000) parts.push(`${fmtShort(sc.time)} spent on them${sc.total >= 60000 ? ` (${Math.round(sc.time / sc.total * 100)}% of its time)` : ''}${sc.need ? `, ${fmtWorkDays(sc.time)}` : ''}`);
    if (sc.slip > 0) parts.push(`ends ${fmtMD(fromISO(b.end))}, ${nDays(sc.slip)} later than the original ${fmtMD(fromISO(b.baseEnd))}${sc.moves.length > 1 ? ` (moved ${sc.moves.length} times)` : ''}`);
    else if (sc.late) parts.push(`past its end date (${fmtMD(fromISO(b.end))}) with ${nTasks(sc.open.length)} open`);
    else if (b.baseEnd && b.end) parts.push(`still ends ${fmtMD(fromISO(b.end))} as planned`);
    lines.push({ key: b.name, name: b.name, status: bucketStatus(b), text: parts.join('; '), warn: !!sc.warn, added: sc.added.length, week: wk.length, slip: sc.slip });
  });
  // The pattern, over every bucket that has started (done ones too).
  const added = tracked.flatMap(x => x.sc.added);
  const slipped = tracked.filter(x => x.sc.slip > 0);
  const by = [...ADD_REASONS, NO_REASON].map(r => {
    const ts = added.filter(t => reasonOf(t).id === r.id);
    return { ...r, n: ts.length, time: ts.reduce((n, t) => n + elapsed(t), 0), inSlipped: slipped.reduce((n, x) => n + x.sc.added.filter(t => reasonOf(t).id === r.id).length, 0) };
  }).filter(r => r.n);
  const named = by.filter(r => r.id !== 'none').sort((a, b) => b.inSlipped - a.inSlipped || b.n - a.n || b.time - a.time);
  let pattern = '';
  if (added.length) {
    const top = named[0];
    pattern = `Across ${tracked.length} ${tracked.length === 1 ? lower : plural(lower)}, ${nTasks(added.length)} ${added.length === 1 ? 'was' : 'were'} added after the start: ${by.slice().sort((a, b) => b.n - a.n).map(r => `${r.n} ${rshort(r)}${includeTime && r.time >= 60000 ? ` (${fmtShort(r.time)})` : ''}`).join(', ')}.`;
    if (slipped.length) pattern += ` ${slipped.length} of those ${plural(lower)} ended later than planned, by ${nDays(Math.round(slipped.reduce((n, x) => n + x.sc.slip, 0) / slipped.length))} on average.`;
    if (top && (top.inSlipped || top.n) && added.length >= 2) pattern += ` ${top.label === 'Other' ? 'Other reasons' : plural(top.label)} ${top.inSlipped ? `are behind most of the work added to ${plural(lower)} that slipped (${top.inSlipped} of ${slipped.reduce((n, x) => n + x.sc.added.length, 0)})` : `are the most common reason (${top.n} of ${added.length})`}.`;
  }
  const weekAdded = added.filter(t => joinedAt(t) >= S0 && joinedAt(t) < E0).length;
  return { lines, pattern, by, total: added.length, weekAdded, buckets: tracked.length };
}
const REPORT_EMPTY = { summary: '', hidden: [], titles: {}, notes: {}, extra: { done: [], doing: [], next: [] } };
function useReportEdits(ws, startISO) {
  const key = `tasks-report-${ws}-${startISO}`;
  const read = () => { try { const v = JSON.parse(localStorage.getItem(key)); return v ? { ...REPORT_EMPTY, ...v, extra: { ...REPORT_EMPTY.extra, ...(v.extra || {}) } } : REPORT_EMPTY; } catch (e) { return REPORT_EMPTY; } };
  const [state, setState] = useState(read);
  useEffect(() => { setState(read()); }, [key]);
  const set = fn => setState(cur => { const v = typeof fn === 'function' ? fn(cur) : fn; try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) {} return v; });
  const reset = () => { try { localStorage.removeItem(key); } catch (e) {} setState(REPORT_EMPTY); };
  return [state, set, reset];
}
// Click to edit one line of text. Enter or leaving the field saves, Esc cancels.
function InlineEdit({ value, onSave, placeholder, className, multiline, autoEdit, onDone, label }) {
  const [edit, setEdit] = useState(!!autoEdit);
  const [v, setV] = useState(value);
  useEffect(() => { if (!edit) setV(value); }, [value, edit]);
  const done = commit => { setEdit(false); if (commit && v !== value) onSave(v); else setV(value); onDone && onDone(); };
  if (!edit) return (
    <button type="button" onClick={() => setEdit(true)} title="Click to edit" className={cn('min-w-0 rounded-sm text-left hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring', !value && 'text-muted-foreground', className)}>
      {value || placeholder}
    </button>
  );
  const P = { autoFocus: true, value: v, 'aria-label': label || placeholder, placeholder, onChange: e => setV(e.target.value), onBlur: () => done(true),
    onKeyDown: e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); done(false); } if (e.key === 'Enter' && (!multiline || !e.shiftKey)) { e.preventDefault(); done(true); } } };
  return multiline
    ? <Textarea {...P} rows={2} className={cn('min-h-0 resize-none bg-background py-1 text-[13px]', className)} />
    : <Input {...P} className={cn('h-7 bg-background px-2 text-[13px]', className)} />;
}
function reportOutput(R, E, { title, includeTime, noun, includeScope }) {
  const sc = includeScope ? R.scope : null;
  const secs = REPORT_SECTIONS.map(s => {
    const groups = R.sections[s.id].map(g => ({ ...g, items: g.items.filter(x => !E.hidden.includes(x.key)).map(x => ({ text: E.titles[x.key] ?? (x.task.title || 'Untitled'), meta: x.meta, note: E.notes[x.key] || '' })) }))
      .filter(g => g.items.length || (s.id === 'next' && g.meta.startsWith('starts')));
    const extra = (E.extra[s.id] || []).filter(x => x.text.trim()).map(x => ({ text: x.text, meta: [], note: '' }));
    return { title: s.title, groups, extra };
  });
  const tail = x => x.meta.length ? ` (${x.meta.join(', ')})` : '';
  const gname = g => g.name || `No ${noun.toLowerCase()}`;
  const gTail = g => g.meta ? ` (${g.meta}${g.items.length ? '' : ', no tasks yet'})` : '';
  const timeLine = includeTime && R.total >= 60000 ? `Time tracked this week: ${fmtShort(R.total)}` : '';
  // Plain text
  const tx = [title, ''];
  if (E.summary.trim()) tx.push(E.summary.trim(), '');
  if (timeLine) tx.push(timeLine, '');
  secs.forEach(s => {
    tx.push(s.title.toUpperCase());
    if (!s.groups.length && !s.extra.length) tx.push('• Nothing to report');
    s.groups.forEach(g => { tx.push(`${gname(g)}${gTail(g)}`); g.items.forEach(x => { tx.push(`  • ${x.text}${tail(x)}`); if (x.note) x.note.split('\n').forEach(l => tx.push(`    ${l}`)); }); });
    s.extra.forEach(x => tx.push(`• ${x.text}`));
    tx.push('');
  });
  if (sc) {
    tx.push('SCOPE CHANGES');
    sc.lines.forEach(l => tx.push(`• ${l.name}: ${l.text}`));
    if (sc.pattern) tx.push(sc.pattern);
    tx.push('');
  }
  // Markdown
  const esc = s => s.replace(/([*_`[\]])/g, '\\$1');
  const md = [`## ${title}`, ''];
  if (E.summary.trim()) md.push(E.summary.trim(), '');
  if (timeLine) md.push(`_${timeLine}_`, '');
  secs.forEach(s => {
    md.push(`### ${s.title}`, '');
    if (!s.groups.length && !s.extra.length) md.push('- Nothing to report');
    s.groups.forEach(g => { md.push(`**${esc(gname(g))}**${gTail(g)}`, ''); g.items.forEach(x => { md.push(`- ${esc(x.text)}${tail(x)}`); if (x.note) x.note.split('\n').forEach(l => md.push(`  - ${esc(l)}`)); }); md.push(''); });
    s.extra.forEach(x => md.push(`- ${esc(x.text)}`));
    if (s.extra.length) md.push('');
  });
  if (sc) {
    md.push('### Scope changes', '');
    sc.lines.forEach(l => md.push(`- **${esc(l.name)}**: ${esc(l.text)}`));
    if (sc.lines.length) md.push('');
    if (sc.pattern) md.push(esc(sc.pattern), '');
  }
  // HTML (pastes with formatting into Outlook, Teams or Word)
  const h = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const li = x => `<li>${h(x.text)}${x.meta.length ? ` <span style="color:#6b7280">(${h(x.meta.join(', '))})</span>` : ''}${x.note ? `<br><span style="color:#374151">${h(x.note).replace(/\n/g, '<br>')}</span>` : ''}</li>`;
  let html = `<div style="font-family:Segoe UI,Arial,sans-serif;font-size:14px"><h2 style="margin:0 0 8px">${h(title)}</h2>`;
  if (E.summary.trim()) html += `<p>${h(E.summary.trim()).replace(/\n/g, '<br>')}</p>`;
  if (timeLine) html += `<p style="color:#6b7280">${h(timeLine)}</p>`;
  secs.forEach(s => {
    html += `<h3 style="margin:16px 0 4px">${h(s.title)}</h3>`;
    if (!s.groups.length && !s.extra.length) html += '<ul><li>Nothing to report</li></ul>';
    s.groups.forEach(g => { html += `<p style="margin:8px 0 2px"><b>${h(gname(g))}</b>${g.meta ? ` <span style="color:#6b7280">${h(gTail(g).trim())}</span>` : ''}</p><ul style="margin:0">${g.items.map(li).join('')}</ul>`; });
    if (s.extra.length) html += `<ul>${s.extra.map(li).join('')}</ul>`;
  });
  if (sc) {
    html += `<h3 style="margin:16px 0 4px">Scope changes</h3>`;
    if (sc.lines.length) html += `<ul style="margin:0">${sc.lines.map(l => `<li><b>${h(l.name)}</b>: ${h(l.text)}</li>`).join('')}</ul>`;
    if (sc.pattern) html += `<p style="margin:8px 0 0">${h(sc.pattern)}</p>`;
  }
  html += '</div>';
  return { text: tx.join('\n').trimEnd() + '\n', md: md.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n', html };
}
function WeeklyReportView({ ws, wsName, tasks, buckets, stages, labels, onOpenTask, onOpenBucket }) {
  const [offset, setOffset] = useState(0);
  const [includeTime, setIncludeTimeRaw] = useState(() => { try { return localStorage.getItem('tasks-report-time') !== '0'; } catch (e) { return true; } });
  const setIncludeTime = v => { setIncludeTimeRaw(v); try { localStorage.setItem('tasks-report-time', v ? '1' : '0'); } catch (e) {} };
  const start = weekStart(offset), startISO = toISO(start);
  const [E, setE, resetE] = useReportEdits(ws, startISO);
  const [adding, setAdding] = useState(null);
  const noun = labels.bucket;
  const R = useMemo(() => buildReport({ tasks, buckets, stages, start, includeTime, noun }), [tasks, buckets, stages, startISO, includeTime, noun]);
  const [includeScope, setIncludeScopeRaw] = useState(() => { try { return localStorage.getItem('tasks-report-scope') !== '0'; } catch (e) { return true; } });
  const setIncludeScope = v => { setIncludeScopeRaw(v); try { localStorage.setItem('tasks-report-scope', v ? '1' : '0'); } catch (e) {} };
  const hasScope = R.scope.lines.length > 0 || !!R.scope.pattern;
  const range = fmtRange(R.start, addDays(R.end, -1));
  const title = `Weekly update: ${range}`;
  const edited = E.summary || E.hidden.length || Object.keys(E.titles).length || Object.keys(E.notes).length || Object.values(E.extra).some(l => l.length);
  const visible = id => R.sections[id].reduce((n, g) => n + g.items.filter(x => !E.hidden.includes(x.key)).length, 0) + E.extra[id].filter(x => x.text.trim()).length;
  const out = () => reportOutput(R, E, { title, includeTime, noun, includeScope: includeScope && hasScope });
  const copy = async kind => {
    const o = out();
    const ok = await copyToClipboard(kind === 'md' ? o.md : o.text, kind === 'rich' ? o.html : null);
    (ok ? toast : toast.error)(ok ? (kind === 'md' ? 'Copied as Markdown' : kind === 'rich' ? 'Copied with formatting' : 'Copied as text') : 'Couldn’t copy the report', ok ? (kind === 'rich' ? 'Paste it into an email, Teams or Word.' : 'Paste it wherever you send your update.') : undefined);
  };
  const saveMd = async () => {
    const dest = await saveDialog({ defaultPath: `Weekly update ${startISO}.md`, filters: [{ name: 'Markdown', extensions: ['md'] }, { name: 'Text', extensions: ['txt'] }] });
    if (!dest) return;
    const o = out();
    try { await invoke('write_text_file', { dest, content: /\.txt$/i.test(dest) ? o.text : o.md }); toast('Report saved', dest); } catch (e) { toast.error('Couldn’t save the report', String(e)); }
  };
  const hide = k => setE(x => ({ ...x, hidden: [...x.hidden, k] }));
  const unhide = sec => setE(x => ({ ...x, hidden: x.hidden.filter(k => !k.startsWith(sec + ':')) }));
  const setTitle = (k, v, orig) => setE(x => { const titles = { ...x.titles }; if (!v.trim() || v === orig) delete titles[k]; else titles[k] = v; return { ...x, titles }; });
  const setNote = (k, v) => setE(x => { const notes = { ...x.notes }; if (!v.trim()) delete notes[k]; else notes[k] = v; return { ...x, notes }; });
  const [noteOpen, setNoteOpen] = useState(null);
  const addExtra = (sec, text) => { if (!text.trim()) return; setE(x => ({ ...x, extra: { ...x.extra, [sec]: [...x.extra[sec], { id: newId(), text }] } })); };
  const setExtra = (sec, id, text) => setE(x => ({ ...x, extra: { ...x.extra, [sec]: text.trim() ? x.extra[sec].map(y => y.id === id ? { ...y, text } : y) : x.extra[sec].filter(y => y.id !== id) } }));
  const [askReset, setAskReset] = useState(false);
  const doReset = () => { setAskReset(false); resetE(); toast('Report rebuilt', 'Your edits for this week were removed.'); };
  const sub = `${range} · ${visible('done')} done, ${visible('doing')} in progress, ${visible('next')} planned${includeTime && R.total >= 60000 ? ` · ${fmtShort(R.total)} tracked` : ''}`;
  return (
    <div className="mx-auto max-w-[920px]">
      <PageHead title="Weekly report" sub={sub} />
      <PageBar>
        <FilterTabs label="Week" value={offset === 0 ? 'w0' : offset === -1 ? 'w1' : 'other'} onChange={v => setOffset(v === 'w0' ? 0 : -1)}
          items={[{ id: 'w0', label: 'This week' }, { id: 'w1', label: 'Last week' }]} />
        <div className="flex items-center">
          <Button variant="ghost" size="icon-sm" aria-label="Previous week" title="Previous week" onClick={() => setOffset(o => o - 1)}><I.left /></Button>
          <span className="min-w-[9.5rem] text-center text-xs font-medium">{range}</span>
          <Button variant="ghost" size="icon-sm" aria-label="Next week" title="Next week" disabled={offset >= 0} onClick={() => setOffset(o => Math.min(0, o + 1))}><I.right /></Button>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-muted-foreground"><Switch checked={includeTime} onChange={setIncludeTime} label="Include time" />Time</label>
          {edited ? <Button variant="ghost" size="sm" className="h-8 text-muted-foreground" onClick={() => setAskReset(true)} title="Remove your edits and rebuild the report from your tasks"><I.reset />Reset</Button> : null}
          <DropdownMenu align="end" trigger={p => <Button {...p} size="sm" className="h-8 shadow-none"><I.copy />Copy<I.down className="size-3" /></Button>}
            items={[
              { label: 'Copy for email or Teams', icon: <I.copy />, onSelect: () => copy('rich') },
              { label: 'Copy as text', icon: <I.file />, onSelect: () => copy('text') },
              { label: 'Copy as Markdown', icon: <I.listCheck />, onSelect: () => copy('md') },
              'sep',
              { label: 'Save as file…', icon: <I.download />, onSelect: saveMd },
            ]} />
        </div>
      </PageBar>
      <Card className="mt-3 px-5 py-5 sm:px-7">
        <div className="text-base font-semibold tracking-tight">{title}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">{wsName}{includeTime && R.total >= 60000 ? ` · Time tracked this week: ${fmtShort(R.total)}` : ''}</div>
        <InlineEdit multiline value={E.summary} onSave={v => setE(x => ({ ...x, summary: v }))} placeholder="Add a short summary for your product owner (optional)" label="Summary"
          className="mt-3 block w-full px-1 py-1 text-sm leading-relaxed whitespace-pre-wrap" />
        {REPORT_SECTIONS.map(s => {
          const groups = R.sections[s.id], hiddenN = groups.reduce((n, g) => n + g.items.filter(x => E.hidden.includes(x.key)).length, 0);
          const shown = groups.map(g => ({ ...g, items: g.items.filter(x => !E.hidden.includes(x.key)) })).filter(g => g.items.length || (s.id === 'next' && g.meta.startsWith('starts')));
          const tone = s.id === 'done' ? 'bg-emerald-500' : s.id === 'doing' ? 'bg-blue-500' : 'bg-violet-500';
          return (
            <section key={s.id} aria-label={s.title} className="mt-6">
              <div className="flex items-center gap-2 border-b pb-1.5">
                <span className={cn('size-2 rounded-full', tone)} />
                <h2 className="text-sm font-semibold">{offset < 0 && s.pastTitle ? s.pastTitle : s.title}</h2>
                <span className="tnum text-xs text-muted-foreground">{visible(s.id)}</span>
                {s.id === 'next' && <span className="text-xs text-muted-foreground">{fmtRange(R.nextStart, addDays(R.nextStart, 6))}</span>}
                {hiddenN > 0 && <button type="button" onClick={() => unhide(s.id)} className="ml-auto text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">{hiddenN} removed · Show again</button>}
              </div>
              {!shown.length && !E.extra[s.id].length && <p className="mt-2 px-1 text-sm text-muted-foreground">{s.empty}</p>}
              {shown.map(g => (
                <div key={g.key || '_none'} className="mt-3">
                  <div className="flex min-w-0 items-baseline gap-2 px-1">
                    {g.name ? (
                      <button type="button" onClick={() => onOpenBucket(g.name)} className="flex min-w-0 items-center gap-1.5 text-[13px] font-medium underline-offset-4 hover:underline" title={`Open ${noun.toLowerCase()}`}>
                        {g.status && <span className={cn('size-2 shrink-0 rounded-full', BS[g.status].dot)} />}<span className="truncate">{g.name}</span>
                      </button>
                    ) : <span className="text-[13px] font-medium text-muted-foreground">No {noun.toLowerCase()}</span>}
                    {g.meta && <span className="truncate text-xs text-muted-foreground">{g.meta}</span>}
                  </div>
                  <ul className="mt-1">
                    {!g.items.length && <li className="py-1 pl-6 text-[13px] text-muted-foreground">No tasks yet</li>}
                    {g.items.map(x => {
                      const orig = x.task.title || 'Untitled', note = E.notes[x.key];
                      return (
                        <li key={x.key} className="group rounded-md px-1 hover:bg-muted/30">
                          <div className="flex min-h-7 items-start gap-2 py-0.5">
                            <span className="mt-[11px] size-1 shrink-0 rounded-full bg-muted-foreground/60" />
                            <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2">
                              <InlineEdit value={E.titles[x.key] ?? orig} onSave={v => setTitle(x.key, v, orig)} label="Edit line" className="px-1 py-0.5 text-[13px] leading-5" />
                              {x.meta.length > 0 && <span className="text-xs text-muted-foreground">{x.meta.join(' · ')}</span>}
                            </div>
                            <div className="flex shrink-0 items-center opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                              <Button variant="ghost" size="icon-sm" className="size-6" aria-label="Add a note" title="Add a note" onClick={() => setNoteOpen(x.key)}><I.pencil className="size-3.5" /></Button>
                              <Button variant="ghost" size="icon-sm" className="size-6" aria-label="Open task" title="Open task" onClick={() => onOpenTask(x.task.id)}><I.external className="size-3.5" /></Button>
                              <Button variant="ghost" size="icon-sm" className="size-6" aria-label="Remove from report" title="Remove from report" onClick={() => hide(x.key)}><I.x className="size-3.5" /></Button>
                            </div>
                          </div>
                          {(note || noteOpen === x.key) && (
                            <div className="pb-1.5 pl-[18px] pr-2">
                              <InlineEdit multiline autoEdit={noteOpen === x.key && !note} onDone={() => setNoteOpen(null)} value={note || ''} onSave={v => setNote(x.key, v)} placeholder="Add a note" label="Note"
                                className="block w-full px-1 py-0.5 text-xs leading-5 text-muted-foreground whitespace-pre-wrap" />
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
              {E.extra[s.id].length > 0 && (
                <ul className="mt-3">
                  {E.extra[s.id].map(x => (
                    <li key={x.id} className="flex min-h-8 items-start gap-2 rounded-md px-1 py-1 hover:bg-muted/30">
                      <span className="mt-[11px] size-1 shrink-0 rounded-full bg-muted-foreground/60" />
                      <InlineEdit value={x.text} onSave={v => setExtra(s.id, x.id, v)} label="Edit line" className="px-1 py-0.5 text-[13px] leading-5" />
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-1 pl-1">
                {adding === s.id
                  ? <div className="pl-3"><InlineEdit autoEdit value="" placeholder="Type a line and press Enter" label={`Add a line to ${s.title}`} onSave={v => addExtra(s.id, v)} onDone={() => setAdding(null)} className="w-full" /></div>
                  : <button type="button" onClick={() => setAdding(s.id)} className="inline-flex items-center gap-1.5 rounded-sm px-1 py-1 text-xs text-muted-foreground hover:text-foreground"><I.plus className="size-3.5" />Add a line</button>}
              </div>
            </section>
          );
        })}
        {hasScope && (
          <section aria-label="Scope changes" className={cn('mt-6', !includeScope && 'opacity-60')}>
            <div className="flex items-center gap-2 border-b pb-1.5">
              <span className="size-2 rounded-full bg-amber-500" />
              <h2 className="text-sm font-semibold">Scope changes</h2>
              {R.scope.weekAdded > 0 && <span className="tnum text-xs text-muted-foreground">{R.scope.weekAdded} added {offset < 0 ? 'that' : 'this'} week</span>}
              <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground" title="Include scope changes when you copy or save the report"><Switch checked={includeScope} onChange={setIncludeScope} label="Include scope changes" />In the report</label>
            </div>
            <ul className="mt-2">
              {R.scope.lines.map(l => (
                <li key={l.key} className="flex items-start gap-2 rounded-md px-1 py-1">
                  {l.warn ? <I.alert className="mt-[3px] size-3.5 shrink-0 text-amber-600 dark:text-amber-400" /> : <span className={cn('mt-[7px] size-2 shrink-0 rounded-full', BS[l.status].dot)} />}
                  <div className="min-w-0 text-[13px] leading-5">
                    <button type="button" onClick={() => onOpenBucket(l.name, true)} className="font-medium underline-offset-4 hover:underline" title={`Open ${noun.toLowerCase()}`}>{l.name}</button>
                    <span className="text-muted-foreground">: {l.text}</span>
                  </div>
                </li>
              ))}
            </ul>
            {R.scope.pattern && (
              <div className="mt-2 rounded-lg border bg-muted/30 px-3 py-2.5 ui-inset">
                <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><I.trendUp className="size-3.5" />Pattern</div>
                <ReasonBar reasons={R.scope.by} total={R.scope.total} />
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {R.scope.by.slice().sort((a, b) => b.n - a.n).map(r => <span key={r.id} className="inline-flex items-center gap-1.5"><span className={cn('size-2 rounded-full', r.dot)} />{r.label} <span className="tnum font-medium text-foreground">{r.n}</span></span>)}
                </div>
                <p className="mt-2 text-[13px] leading-5">{R.scope.pattern}</p>
              </div>
            )}
          </section>
        )}
      </Card>
      <AlertDialog open={askReset} title="Reset this week’s report?" description="Your summary, notes, changed lines, added lines and removed lines for this week are cleared, and the report is rebuilt from your tasks." confirmLabel="Reset" onConfirm={doReset} onCancel={() => setAskReset(false)} />
      <p className="mt-2 text-xs text-muted-foreground">Built from your tasks and timers. Click any line to change it, hover a line to add a note or remove it. Your edits are kept for each week on this PC; Reset rebuilds the report.</p>
    </div>
  );
}

/* ---------- What's new (0.19.5) ----------
   After an update, a short tour of what changed since the version you used last opens once.
   It can be opened again from the ⋯ menu or the command palette. Pictures are in public/whats-new.
   0.20.3: a release of fixes gets one short slide marked brief (no picture, just an icon and a line or two).
   Slides move on by themselves after 6 seconds while the bar at the top fills; holding the mouse down pauses. */
const WHATS_NEW = [
  { v: '0.20.3', title: 'Tune-up day', brief: true, icon: 'sparkles',
    points: ['No shiny new buttons this time. We popped the hood instead: your tasks are safer, long lists feel snappier, and sync is a lot less dramatic.', 'Nothing to set up. Carry on!'] },
  { v: '0.20.2', title: 'Documents, as a library', img: 'docs-library.webp',
    points: ['Documents opens as a table grouped by status: Approved, In review, Draft and Outdated. Click a group to fold it.', 'Each row has a clean title, its status, the tasks it’s linked to, size and date. Point at a title to see the real file name, and at a row for Open, Save and Delete.'] },
  { v: '0.20.2', title: 'Read with more room', img: 'docs-reader.webp',
    points: ['Click a document to read it. The list stays on the left, grouped the same way, and one slim bar holds find, open, save and link.', 'Library or Esc takes you back. The panel button next to search folds the list into a narrow rail.'] },
  { v: '0.20.2', title: 'Details when you want them', img: 'docs-details.webp',
    points: ['The panel button at the right of the viewer bar opens linked tasks, the file name, size, versions and Delete.', 'It stays hidden until you open it, and the app remembers your choice on this PC.'] },
  { v: '0.20.2', title: 'A cleaner, borderless look', img: 'borderless.webp',
    points: ['Outlines are gone across the app. Cards, buttons, fields and chips are told apart by soft fills, and menus and dialogs float on a shadow.', 'The task table keeps only faint row lines and one solid line between columns. Text is now set in Inter, with numbers in Geist Mono.'] },
  { v: '0.20.2', title: 'A softer dark mode', img: 'softer-dark.webp',
    points: ['Dark mode is a soft charcoal (#1A1A1A) instead of near-black, so cards, chips and menus stand out more clearly.', 'White documents glare less, and everything else in dark mode moved up by the same step.'] },
  { v: '0.20.1', title: 'Taskit is a team app now', img: 'members.webp',
    points: ['Everyone shares one team workspace: the same tasks, buckets, documents and automations, synced live. Your watch folders, theme, sidebar and notification choices stay yours.', 'Settings › Members shows who’s on the team, their role, teams and access (Owner, Admin or Member).'] },
  { v: '0.20.1', title: 'Invite people', img: 'invite-people.webp',
    points: ['Invite people opens a small window: add their emails, pick a role and teams, and choose Member or Admin. Only invited emails can sign in.', 'We don’t send any email, so give them a quick heads-up. The ⋯ next to an invite copies a ready-made message.'] },
  { v: '0.20.1', title: 'Tasks for me, or everyone’s', img: 'team-scope.webp',
    points: ['Click the title on Tasks to switch between Tasks for me (your teams plus anything that’s yours), Everyone, or just one team.', 'Ctrl + 1 and Ctrl + 2 switch between For me and Everyone. Tag a task with teams in its panel so the right people see it.'] },
  { v: '0.20.1', title: 'Roles and teams, your way', img: 'roles-teams.webp',
    points: ['Settings › Roles & teams lists your teams and job titles. The Owner and Admins can add, rename or delete them, and a rename updates everyone at once.', 'Deleting one that’s in use asks where its people and tasks should go.'] },
  { v: '0.20.1', title: 'A friendly first run', img: 'welcome.webp',
    points: ['New teammates sign in with Google, check their name, photo and time zone, and they’re in.', 'People who weren’t invited get a kind note and a message they can copy for their admin.'] },
  { v: '0.20.1', title: 'A quick tour for each team', img: 'team-tour.webp',
    points: ['Right after the first run, a three-step tour shows what matters for their team: designers, developers, QA, marketing or leads.', 'Skip it anytime, and replay it from ⋯ › Team tour.'] },
  { v: '0.19.15', title: 'What added tasks cost', img: 'scope-impact.webp',
    points: ['A bucket’s Scope section turns the time spent on added tasks into working days, at 8 hours a day, Monday to Friday.', 'If the end hasn’t moved enough to cover it, Move end suggests a new date. Nothing moves until you press it, and the move is logged against the original end. The weekly report shows the working days too.'] },
  { v: '0.19.14', title: 'A new top of the window', img: 'title-bar.webp',
    points: ['The Windows title bar is gone. A slim top row shows where you are and the cloud status, with the app’s own minimize, maximize and close buttons. Close turns red when you point at it.', 'Each page has a big title, with search, the theme button, ⋯ and Create task on the right. Drag the top row to move the window, and double-click it to maximize.'] },
  { v: '0.19.14', title: 'Running timers, up top', img: 'timers-topbar.webp',
    points: ['Running timers sit in a green pill next to search, so the time is never cut off. With one timer it shows the task’s name.', 'Click the pill to pause one timer or all of them.'] },
  { v: '0.19.14', title: 'A new Filter menu', img: 'filters.webp',
    points: ['Filter opens a search box with Bucket, Platform and Deadline below it. Each opens a list with checkboxes and counts, and typing searches all three.', 'Filters of the same kind share one chip, like “Checkout v2 +1”. Deadline has a new choice, No deadline.'] },
  { v: '0.19.14', title: 'Sort works like Filter', img: 'sort-chips.webp',
    points: ['Sort sits next to Filter. Once you change the sort, the button turns blue with a count, and each rule shows as a chip under the toolbar.', 'Click a chip to change its field or direction, or Reset to go back to Deadline.'] },
  { v: '0.19.14', title: 'Move your columns', img: 'move-columns.webp',
    points: ['Drag any heading in the task table left or right. A line shows where it will land, and Esc cancels.', 'Each heading’s menu also has Move left and Move right. The order stays on this PC.'] },
  { v: '0.19.14', title: 'More ways to start an automation', img: 'automation-triggers.webp',
    points: ['Automations can now start when a timer starts, when a task has stayed in a status for some days, or when a timer has run too long. They can pause a timer or set the priority.', 'Add “Only if…” to a rule so it runs only for tasks that match, like only when the status is To do.'] },
  { v: '0.19.14', title: 'See the full text', img: 'full-text.webp',
    points: ['Any text cut off with “…” shows in full when you point at it, after a short pause.', 'It works everywhere: task titles, buckets, platforms, chips, menus and documents.'] },
  { v: '0.19.14', title: 'Smaller platform chips', img: 'platform-chip.webp',
    points: ['In the task table, a platform is now just its icon, which leaves more room for the title.', 'Point at the icon and it opens to show the name.'] },
  { v: '0.19.14', title: 'Smoother everywhere', img: 'motion.webp',
    points: ['Menus, windows and the task panel now ease in and out instead of vanishing, always within a fifth of a second.', 'Typing, dragging and scrolling stay instant. If Windows is set to reduce motion, nothing animates.'] },
  { v: '0.19.13', title: 'Your profile', img: 'profile.webp',
    points: ['Settings has a new Profile page with your photo, display name, role, phone and status. Your time zone comes from this PC’s clock.', 'Your profile syncs to your other PCs. Members, next to it, lists everyone in your workspaces, which for now is just you.'] },
  { v: '0.19.13', title: 'Set your status', img: 'avatar-menu.webp',
    points: ['Click your photo at the bottom of the sidebar for a new menu: your status, Profile, Settings, switching workspace and Sign out.', 'Pick Available, Busy, Do not disturb or Away, add a short note, and choose when it clears. Do not disturb mutes alerts.'] },
  { v: '0.19.13', title: 'A card when you point at a person', img: 'hover-card.webp',
    points: ['Point at your photo next to a task to see a small card with your name, role, status, local time and email.'] },
  { v: '0.19.13', title: 'A new Settings', img: 'settings-pages.webp',
    points: ['Settings has pages down the left: General, Appearance, Notifications, Shortcuts, Workspace, Watch folders, Cloud & backups and About.', 'Each setting is one short line, with the longer explanation behind the ⓘ. Notifications moved here from Automations, and work just as before.'] },
  { v: '0.19.13', title: 'A cleaner Edit statuses window', img: 'statuses-window.webp',
    points: ['Each group has a + by its name, and counts are plain numbers.', 'The arrows, lock and delete only show on the row you point at. How each group behaves sits behind the ⓘ.'] },
  { v: '0.19.13', title: 'Rename platforms in the list', img: 'platforms-rename.webp',
    points: ['In Manage platforms, click a name to rename it right there. Enter or clicking away saves, and Esc undoes.', 'Each row shows how many tasks use it, and the bin appears when you point at the row.'] },
  { v: '0.19.13', title: 'An icon for each platform', img: 'platform-icons.webp',
    points: ['Click a platform’s icon to pick a new one from the grid, or search for one, like “mobile” or “payment”.', 'The icon shows wherever the platform does. Platforms you haven’t changed keep the folder.'] },
  { v: '0.19.13', title: 'Delete turns red', img: 'delete-red.webp',
    points: ['Every delete, remove and trash button in the app turns red when you point at it, so you always know before you click.'] },
  { v: '0.19.13', title: 'Time summary as tiles', img: 'time-summary-tiles.webp',
    points: ['The time summary on Tasks is a row of tiles: time tracked today and this week, then your top platforms with their share of the week.', 'Hide it with the ×, or turn it back on from the ⋯ menu.'] },
  { v: '0.19.13', title: 'Light and dark, in a circle', img: 'theme-circle.webp',
    points: ['Switching between light and dark now spreads as a circle from the button you clicked.', 'It works from the moon button, from Settings › Appearance, and with Shift + D.'] },
  { v: '0.19.12', title: 'Status and priority at a glance', img: 'status-priority.webp',
    points: ['Status and priority are now colored chips in every view: a dot for the status, and bars for the priority, with High in red.', 'They look the same in the table, the list and the board.'] },
  { v: '0.19.12', title: 'A sidebar that gets out of the way', img: 'sidebar-hover.webp',
    points: ['The sidebar is a slim row of icons. Point at it and it opens with the page names, then closes when you move away.', 'Click the panel button at the top to keep it open. That choice stays on this PC.'] },
  { v: '0.19.12', title: 'No more tabs', img: 'task-panel.webp',
    points: ['The tab bar is gone, so pages get more room. A task opens in the side panel, and Ctrl+click or middle-click does the same.', 'If you had tasks set to open in a new tab, they now open in the panel.'] },
  { v: '0.19.12', title: 'Sync status by the page title', img: 'sync-note.webp',
    points: ['A quiet note beside the page title says when your work was last saved to the cloud, or if you are offline.', 'Point at it to sync again now, and click it to open cloud sync.'] },
  { v: '0.19.12', title: 'A tidier ⋯ menu', img: 'more-menu.webp',
    points: ['The ⋯ menu is grouped: Automations, Statuses and Platforms first, then Time summary, Archive and Trash, then Settings and help.', 'Automations shows how many are on, and Time summary is a switch.'] },
  { v: '0.19.12', title: 'Automations, grouped by event', img: 'automations.webp',
    points: ['Automations read like a sentence and are grouped by what sets them off. One event can do several things.', 'Click any word in a box to change it, switch single steps on or off, or start from an idea at the bottom.'] },
  { v: '0.19.12', title: 'Notifications come grouped', img: 'notif-grouped.webp',
    points: ['When several tasks need you at once, you get one notification instead of a pile: “12 tasks are overdue”, with the first few named.', 'Each kind of event, such as overdue, due tomorrow or marked done, gets its own.'] },
  { v: '0.19.12', title: 'Smoother messages', img: 'toasts.webp',
    points: ['Messages at the bottom right slide in and stack neatly when several arrive. They look just like before.', 'Undo is still on the message, and the update card keeps its own spot at the bottom left.'] },
  { v: '0.19.12', title: 'Slim scroll bars', img: 'scrollbars.webp',
    points: ['Scroll bars are a thin, faint line that follows the theme. They widen a little while you scroll, and more when you point at them.', 'Long windows fade softly at the edge when there is more to see.'] },
  { v: '0.19.12', title: 'Fixes', img: 'assign-new.webp',
    points: ['Automations can assign to anyone again: type a new name and pick Assign to it.', 'The time summary shows once on Tasks, a scroll bar no longer stays bright after the pointer leaves the window, and a PC that comes back online no longer keeps an old copy of a task or setting.'] },
  { v: '0.19.11', title: 'Quick capture, plain and simple', img: 'capture-solid.webp',
    points: ['Quick capture is a plain solid panel again: no glass, no blur, readable over anything.', 'Bucket and Platform buttons, the Inbox or Open hint and Enter to save all work the same. The Frostiness and Translucency sliders are gone from Settings.'] },
  { v: '0.19.10', title: 'Frostiness you can see', img: 'capture-frost.webp',
    points: ['The Frostiness slider now clearly changes quick capture: at 0 the glass is clear, and higher adds a milky haze and grain.', 'From 50% Windows switches to its heavier, grainier blur behind the glass.'] },
  { v: '0.19.9', title: 'Glass you can read on any background', img: 'capture-glass-readable.webp',
    points: ['Quick capture stays readable over a window of the opposite brightness: the glass is a little denser and the grey text is brighter.', 'The rounded corners line up cleanly, with no lighter sliver. Press Reset under Quick capture glass in Settings to get the new default.'] },
  { v: '0.19.8', title: 'Quick capture glass, fixed', img: 'capture-glass-fix.webp',
    points: ['The rounded glass bar no longer sits on a dark square, with no white outline and no stray title bar.', 'The blur behind the glass now works on Windows 10 too. Frostiness at 0 turns it off.'] },
  { v: '0.19.7', title: 'Quick capture is made of glass', img: 'capture-glass.webp',
    points: ['The quick capture window is frosted glass now, so you can see the app behind it, blurred, on Windows 11.', 'Bigger text, and Bucket and Platform buttons you can click instead of typing @ or #. It tells you if the task lands in the Inbox or in Open.'] },
  { v: '0.19.7', title: 'Make the glass your own', img: 'capture-glass-settings.webp',
    points: ['Settings has Frostiness and Translucency sliders for quick capture, with a live preview.', 'Frostiness goes from clear glass to frosted. Translucency goes from solid to see-through.'] },
  { v: '0.19.4', title: 'Cloud sync keeps every change', img: null, icon: 'cloud',
    points: ['Buckets, automations, statuses, platforms and settings now sync one item at a time, like tasks.', 'Two PCs changing different buckets or settings at the same moment both keep their change.', 'Nothing to set up. Update all your PCs so every change is kept.'] },
  { v: '0.19.3', title: 'See why buckets keep growing', img: 'scope-panel.webp',
    points: ['Tasks added after a bucket starts are marked “added later”, with a count and the time spent on them.', 'Open a bucket to see what was planned, what was added, and how many days its end moved.'] },
  { v: '0.19.3', title: 'Say why a task was added', img: 'scope-reason.webp',
    points: ['Pick a reason in the task: bug, change request or missed requirement.', 'Or “Part of the plan” if it shouldn’t count. A heads-up appears when you add to a bucket that already started.'] },
  { v: '0.19.3', title: 'Drift on the timeline', img: 'scope-timeline.webp',
    points: ['The days past a bucket’s original end are striped amber, with a dashed line where it was meant to end.', 'A warning sign shows on buckets where added tasks pushed the end out.'] },
  { v: '0.19.3', title: 'Evidence for your product owner', img: 'scope-report.webp',
    points: ['The weekly report has a Scope changes section: what was added to each bucket, why, and how far its end moved.', 'Pattern shows which reason brings the most added work across all your buckets.'] },
  { v: '0.19.2', title: 'Weekly report', img: 'report.webp', icon: 'clipboard',
    points: ['Report on the rail builds this week’s update: done, in progress and next week, grouped by bucket.', 'Edit any line, add notes, then copy it for email or Teams, as text or as Markdown.'] },
  { v: '0.19.1', title: 'Quick capture picks buckets and platforms', img: 'capture.webp',
    points: ['Type @ to pick a bucket and # to pick a platform while you capture a task.', 'With a platform it goes straight to Open instead of the Inbox.'] },
];
const vNum = v => String(v || '0').split('.').map(Number).reduce((n, x) => n * 1000 + (x || 0), 0);
const whatsNewSince = (seen, cur) => WHATS_NEW.filter(x => vNum(x.v) > vNum(seen) && vNum(x.v) <= vNum(cur));
function WhatsNewDialog({ open, items, onClose }) {
  const [i, setI] = useState(0);
  const [held, setHeld] = useState(false);
  useLockScroll(open);
  useEffect(() => { if (open) { setI(0); setHeld(false); } }, [open]);
  useEffect(() => {
    if (!open) return;
    const k = e => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
      if (e.key === 'ArrowRight') setI(x => Math.min(items.length - 1, x + 1));
      if (e.key === 'ArrowLeft') setI(x => Math.max(0, x - 1));
    };
    const up = () => setHeld(false);
    document.addEventListener('keydown', k, true); window.addEventListener('pointerup', up); window.addEventListener('blur', up);
    return () => { document.removeEventListener('keydown', k, true); window.removeEventListener('pointerup', up); window.removeEventListener('blur', up); };
  }, [open, items.length, onClose]);
  if (!open || !items.length) return null;
  const it = items[Math.min(i, items.length - 1)], last = i >= items.length - 1;
  const Ico = it.icon && I[it.icon];
  const title = /[.!?]$/.test(it.title) ? it.title : it.title + '.';
  const small = items.every(x => x.brief); // only short notes: a smaller window
  const buttons = (
    <div className={cn('flex items-center gap-2 pt-6', it.brief ? 'mt-auto w-full' : 'mt-auto')}>
      <span className="tnum mr-auto text-sm text-muted-foreground">{items.length > 1 ? `${i + 1} of ${items.length}` : ''}</span>
      {i > 0 && <Button variant="outline" onClick={() => setI(i - 1)}>Back</Button>}
      {last
        ? <Button autoFocus onClick={onClose}>Got it</Button>
        : <Button autoFocus onClick={() => setI(i + 1)}>Next</Button>}
    </div>);
  // Layout C: the title and text on the left, the screenshot on the right, tilted and running off the edge.
  // A brief slide has no picture: an icon, the title and a line or two, centred.
  return createPortal(
    <>
      <div className="fixed inset-0 z-[70] bg-black/80 anim-fade" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-labelledby="wn-title" onPointerDown={e => { if (!e.target.closest('button')) setHeld(true); }}
        className={cn('fixed left-1/2 top-1/2 z-[70] overflow-hidden rounded-[14px] border bg-background text-foreground anim-zoom ui-float',
          small ? 'h-[min(430px,calc(100%-2rem))] w-[min(520px,calc(100%-2rem))]' : 'h-[min(600px,calc(100%-2rem))] w-[min(1040px,calc(100%-2rem))]')}
        style={{ transform: 'translate(-50%,-50%)' }}>
        <div className="absolute inset-x-0 top-0 z-[3] flex h-[3px] gap-1" aria-hidden="true">
          {items.map((_, j) => (
            <span key={j} className="relative flex-1 overflow-hidden bg-border">
              {j < i && <span className="absolute inset-0 bg-foreground" />}
              {j === i && <span key={i} className={cn('wn-seek absolute inset-0 bg-foreground', last && 'wn-seek-done')}
                style={{ animationPlayState: held ? 'paused' : 'running' }}
                onAnimationEnd={() => setI(x => Math.min(items.length - 1, x + 1))} />}
            </span>))}
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="absolute right-4 top-4 z-[2] rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"><I.x /></button>
        {it.brief ? (
          <div className="absolute inset-0 z-[1] flex flex-col items-center px-10 pb-8 pt-12 text-center">
            <div className="text-[13px] text-muted-foreground">What’s new · <span className="text-foreground">{it.v}</span></div>
            <div key={i} className="anim-fade flex flex-1 flex-col items-center justify-center">
              {Ico && <span className="mb-5 flex size-14 items-center justify-center rounded-full bg-muted"><Ico className="size-6" /></span>}
              <h2 id="wn-title" className="text-[32px] font-extrabold leading-[1.05] tracking-[-0.035em]">{title}</h2>
              <p className="mt-4 max-w-[400px] text-base leading-relaxed text-muted-foreground">{it.points[0]}</p>
              {it.points.slice(1).map((p, j) => <p key={j} className="mt-2 max-w-[400px] text-sm leading-relaxed text-muted-foreground">{p}</p>)}
            </div>
            {buttons}
          </div>
        ) : (<>
        <div className="absolute inset-y-0 left-0 z-[1] flex w-[min(470px,48%)] flex-col py-12 pb-9 pl-12 pr-2">
          <div className="text-[13px] text-muted-foreground">What’s new · <span className="text-foreground">{it.v}</span></div>
          <h2 id="wn-title" className="mt-9 text-[40px] font-extrabold leading-[1.05] tracking-[-0.035em]">{title}</h2>
          <p className="mr-10 mt-5 text-base leading-relaxed text-muted-foreground">{it.points[0]}</p>
          {it.points.slice(1).map((p, j) => <p key={j} className="mr-10 mt-2.5 text-sm leading-relaxed text-muted-foreground">{p}</p>)}
          {buttons}
        </div>
        <div key={i} className="anim-fade absolute left-[52%] top-16 w-[56%] -rotate-2">
          {it.img ? <img src={`/whats-new/${it.img}`} alt={it.title} className="block w-full rounded-[14px] border shadow-[0_30px_80px_rgba(0,0,0,.45)]" />
            : <div className="flex aspect-[4/3] flex-col items-center justify-center gap-4 rounded-[14px] border bg-[#0b0b0c] p-6 text-zinc-300 shadow-[0_30px_80px_rgba(0,0,0,.45)]">
                {Ico && <Ico className="size-12" />}
                <div className="flex flex-col items-start gap-2 text-sm">
                  <span className="rounded-md border border-zinc-700 px-2.5 py-1">PC 1 edits Checkout v2</span>
                  <span className="rounded-md border border-zinc-700 px-2.5 py-1">PC 2 edits Refunds</span>
                  <span className="rounded-md border border-emerald-600/60 bg-emerald-500/10 px-2.5 py-1 text-emerald-300">Both changes kept</span>
                </div>
              </div>}
        </div>
        </>)}
      </div>
    </>, document.body);
}

/* Filters (0.19.14): the Filter button opens a search over every filter, with Bucket, Platform and Deadline
   rows that open a side list. Active filters show as chips under the toolbar; picks of the same kind share
   one chip ("Homepage +2"), and a chip opens its own list. Buckets and platforms take several picks.
   Filters are a per-PC view setting (like before); nothing here syncs. */
const DUE_OPTS = [{ v: 'overdue', label: 'Overdue', icon: 'alert' }, { v: 'week', label: 'Next 7 days', icon: 'calendar' }, { v: 'none', label: 'No deadline', muted: true }];
const FILTER_KINDS = ['bucket', 'project', 'due'];
const onlyPick = f => f.length === 1 && f[0] !== 'none' ? f[0] : ''; // the one bucket or platform picked, for new tasks
const filterNoun = (kind, labels) => kind === 'bucket' ? labels.bucket : kind === 'project' ? labels.platform : labels.deadline;
const filterIcon = { bucket: 'layers', project: 'folder', due: 'calendar' };
function filterOptions(kind, f) {
  const none = n => `No ${n.toLowerCase()}`;
  if (kind === 'bucket') return [...f.buckets.map(b => ({ v: b, label: b, n: f.counts.bucket[norm(b)] || 0 })), { v: 'none', label: none(f.labels.bucket), n: f.counts.bucket[''] || 0, muted: true }];
  if (kind === 'project') return [...f.projects.map(p => ({ v: p, label: p, n: f.counts.project[norm(p)] || 0, icon: <PIcon name={p} className="size-3.5" /> })), { v: 'none', label: none(f.labels.platform), n: f.counts.project[''] || 0, muted: true }];
  return DUE_OPTS.map(o => ({ ...o, n: f.counts.due[o.v] || 0, icon: o.icon ? React.createElement(I[o.icon], { className: 'size-3.5' }) : null }));
}
const filterSel = (kind, f) => kind === 'bucket' ? f.bucketSel : kind === 'project' ? f.projSel : (f.due ? [f.due] : []);
const filterToggle = (kind, v, f) => {
  if (kind === 'due') return f.setDue(d => d === v ? '' : v);
  const set = kind === 'bucket' ? f.setBucketSel : f.setProjSel;
  set(s => s.includes(v) ? s.filter(x => x !== v) : [...s, v]);
};
const filterClear = (kind, f) => kind === 'bucket' ? f.setBucketSel([]) : kind === 'project' ? f.setProjSel([]) : f.setDue('');
// "Homepage", "Homepage +2", "No bucket"
function filterSummary(kind, f) {
  const sel = filterSel(kind, f); if (!sel.length) return null;
  const opts = filterOptions(kind, f); const first = opts.find(o => o.v === sel[0]) || { label: sel[0] };
  return { first, more: sel.length - 1 };
}

function FilterRow({ o, on, multi, active, onPick }) {
  return (
    <button type="button" role={multi ? 'menuitemcheckbox' : 'menuitemradio'} aria-checked={on} onClick={onPick}
      className={cn('flex h-8 w-full items-center gap-2 rounded-sm px-2 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none', active && 'bg-accent', !multi && on && 'font-medium')}>
      {multi && <span className={cn('flex size-4 shrink-0 items-center justify-center rounded-[4px] border', on ? 'border-primary bg-primary text-primary-foreground' : 'border-input')}>{on && <I.check className="size-3" />}</span>}
      {o.icon && <span className="shrink-0 text-muted-foreground">{o.icon}</span>}
      <span className={cn('min-w-0 flex-1 truncate', o.muted && 'text-muted-foreground')}>{o.label}</span>
      <span className="tnum shrink-0 text-xs text-muted-foreground">{o.n}</span>
      {!multi && on && <I.check className="size-3.5 shrink-0" />}
    </button>
  );
}

// One field's list: search, options with counts, Clear. Used by the side menus and by the chips.
function FilterList({ kind, f, className }) {
  const [q, setQ] = useState('');
  const multi = kind !== 'due', noun = filterNoun(kind, f.labels);
  const sel = filterSel(kind, f), nq = norm(q);
  const opts = filterOptions(kind, f), list = opts.filter(o => !nq || norm(o.label).includes(nq));
  return (
    <div className={cn('flex flex-col', className)}>
      {opts.length > 6 && <>
        <div className="flex h-9 items-center gap-2 px-2 text-muted-foreground"><I.search className="size-3.5 shrink-0" />
          <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder={`Search ${plural(noun).toLowerCase()}`} aria-label={`Search ${plural(noun).toLowerCase()}`}
            onKeyDown={e => { if (e.key === 'Enter' && list[0]) filterToggle(kind, list[0].v, f); }}
            className="h-full min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground" /></div>
        <div className="-mx-1 my-1 h-px bg-border" /></>}
      <div role="menu" aria-label={noun} className="max-h-72 overflow-y-auto">
        {list.length ? list.map(o => <FilterRow key={o.v} o={o} multi={multi} on={sel.includes(o.v)} onPick={() => filterToggle(kind, o.v, f)} />)
          : <div className="px-2 py-1.5 text-sm text-muted-foreground">No matches</div>}
      </div>
      {sel.length > 0 && <><div className="-mx-1 my-1 h-px bg-border" />
        <div className="flex h-8 items-center px-2 text-xs text-muted-foreground">
          <span className="tnum">{multi ? `${sel.length} picked` : 'Picked'}</span>
          <button type="button" onClick={() => filterClear(kind, f)} className="ml-auto rounded-sm px-1 hover:text-foreground hover:underline underline-offset-4">Clear</button>
        </div></>}
    </div>
  );
}

// The menu behind the Filter button (side = 'left') and behind "+ Filter" (side = 'right', only unused kinds).
function FilterMenu({ f, kinds = FILTER_KINDS, side = 'left' }) {
  const [q, setQ] = useState('');
  const [sub, setSub] = useState(null);
  const nq = norm(q);
  const hits = nq ? kinds.map(k => ({ k, list: filterOptions(k, f).filter(o => norm(o.label).includes(nq)) })) : [];
  const flat = hits.flatMap(h => h.list.map(o => ({ k: h.k, o })));
  return (
    <div className="relative" onKeyDown={e => { if (e.key === 'ArrowLeft' && side === 'left' && !sub) setSub(kinds[0]); }}>
      <div className="flex h-9 items-center gap-2 px-2 text-muted-foreground"><I.search className="size-3.5 shrink-0" />
        <input autoFocus value={q} onChange={e => { setQ(e.target.value); setSub(null); }} aria-label="Search filters"
          placeholder={side === 'left' ? `Filter by ${f.labels.bucket.toLowerCase()}, ${f.labels.platform.toLowerCase()}…` : 'Add a filter…'}
          onKeyDown={e => { if (e.key === 'Enter' && flat[0]) filterToggle(flat[0].k, flat[0].o.v, f); }}
          className="h-full min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground" />
      </div>
      <div className="-mx-1 my-1 h-px bg-border" />
      {nq ? (
        <div role="menu" aria-label="Matching filters" className="max-h-80 overflow-y-auto">
          {hits.map(({ k, list }) => (
            <div key={k}>
              <div className="px-2 pb-1 pt-2 text-xs font-medium text-muted-foreground">{filterNoun(k, f.labels)}</div>
              {list.length ? list.map((o, i) => <FilterRow key={o.v} o={o} multi={k !== 'due'} active={flat[0] && flat[0].k === k && i === 0} on={filterSel(k, f).includes(o.v)} onPick={() => filterToggle(k, o.v, f)} />)
                : <div className="px-2 py-1 text-sm text-muted-foreground">No matches</div>}
            </div>
          ))}
        </div>
      ) : kinds.map(k => {
        const s = filterSummary(k, f), open = sub === k;
        return (
          <div key={k} className="relative" onMouseEnter={() => setSub(k)}>
            <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setSub(open ? null : k)}
              onKeyDown={e => { if (e.key === (side === 'left' ? 'ArrowLeft' : 'ArrowRight')) { e.stopPropagation(); setSub(k); } }}
              className={cn('flex h-8 w-full items-center gap-2 rounded-sm px-2 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none', open && 'bg-accent')}>
              {side === 'left' && <I.left className="size-3.5 shrink-0 text-muted-foreground" />}
              {React.createElement(I[filterIcon[k]], { className: 'size-3.5 shrink-0 text-muted-foreground' })}
              <span className="flex-1">{filterNoun(k, f.labels)}</span>
              {side === 'left' && <span className={cn('max-w-[120px] truncate text-xs', s ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                {s ? <>{s.first.label}{s.more > 0 && <span className="font-normal text-muted-foreground"> +{s.more}</span>}</> : 'Any'}</span>}
              {side === 'right' && <I.right className="size-3.5 shrink-0 text-muted-foreground" />}
            </button>
            {open && <div className={cn('absolute -top-1 z-10 w-72 rounded-md border bg-popover p-1 text-popover-foreground anim-pop ui-float', side === 'left' ? 'right-full mr-2' : 'left-full ml-2')}>
              <FilterList key={k} kind={k} f={f} />
            </div>}
          </div>
        );
      })}
    </div>
  );
}

/* Sorting (0.19.14): a list of rules, each a field and an order. The first rule wins, the next breaks ties.
   Saved with the view on this PC only (tasks-view-v1), like the old single sort, so it never touches sync. */
const SORT_KEYS = ['deadline', 'priority', 'created', 'status', 'bucket', 'assignee', 'project'];
const SORT_DEFAULT = [{ key: 'deadline', desc: false }];
const SORT_ORDER_WORDS = { deadline: ['Soonest first', 'Latest first'], priority: ['Highest first', 'Lowest first'], created: ['Newest first', 'Oldest first'], status: ['Workflow order', 'Reverse order'] };
const sortOrderWord = r => (SORT_ORDER_WORDS[r.key] || ['A to Z', 'Z to A'])[r.desc ? 1 : 0];
const sortName = (key, labels) => ({ deadline: labels.deadline, priority: labels.priority, created: 'Created', status: labels.status, bucket: labels.bucket, assignee: labels.assignee, project: labels.platform })[key] || key;
const readSorts = v => {
  const ok = Array.isArray(v.sorts) ? v.sorts.filter((r, i, a) => r && SORT_KEYS.includes(r.key) && a.findIndex(x => x && x.key === r.key) === i).map(r => ({ key: r.key, desc: !!r.desc })) : [];
  return ok.length ? ok : SORT_KEYS.includes(v.sortBy) ? [{ key: v.sortBy, desc: false }] : SORT_DEFAULT;
};
const sortIsDefault = sorts => sorts.length === 1 && sorts[0].key === 'deadline' && !sorts[0].desc;
// Rule list edits shared by the Sort menu and the sort chips. Removing the last rule goes back to the default.
const sortSet = (sorts, i, patch) => sorts.map((r, j) => (j === i ? { ...r, ...patch } : r));
const sortDrop = (sorts, i) => { const n = sorts.filter((_, j) => j !== i); return n.length ? n : SORT_DEFAULT; };
const rank = (map, k, fallback) => (map[k] || map[fallback] || { i: 99 }).i;

// Builds the comparer for a list of rules. Empty values (no deadline, no bucket…) stay at the bottom
// whichever way a rule points.
function sortComparer(rules, stages) {
  const statusOrder = statusList(stages).map(x => x.id);
  const byRule = (r, a, b) => {
    if (r.key === 'created') return (b.createdAt || 0) - (a.createdAt || 0);
    if (r.key === 'priority') return rank(P, a.priority, 'normal') - rank(P, b.priority, 'normal');
    if (r.key === 'status') return rank(S, a.status) - rank(S, b.status) || statusOrder.indexOf(statusDef(a, stages).id) - statusOrder.indexOf(statusDef(b, stages).id);
    return String(a[r.key]).localeCompare(String(b[r.key]), undefined, { sensitivity: 'base', numeric: true }); // deadline (ISO dates), bucket, assignee, platform
  };
  const hasEmpty = r => r.key !== 'created' && r.key !== 'priority' && r.key !== 'status';
  return (a, b) => {
    for (const r of rules) {
      if (hasEmpty(r) && !a[r.key] !== !b[r.key]) return a[r.key] ? -1 : 1;
      if (hasEmpty(r) && !a[r.key]) continue;
      const n = byRule(r, a, b);
      if (n) return r.desc ? -n : n;
    }
    return 0;
  };
}

// The rule editor behind the Sort button: one row per rule (field, order, remove), then Add sort and Reset.
function SortEditor({ sorts, setSorts, labels }) {
  const set = (i, patch) => setSorts(sortSet(sorts, i, patch)), drop = i => setSorts(sortDrop(sorts, i));
  const unused = SORT_KEYS.filter(k => !sorts.some(r => r.key === k));
  return (
    <div role="group" aria-label="Sort">
      <div className="px-2 pb-1 pt-2 text-xs font-medium text-muted-foreground">Sort</div>
      {sorts.map((r, i) => {
        const D = r.desc ? I.arrowDown : I.arrowUp;
        const opts = SORT_KEYS.filter(k => k === r.key || unused.includes(k)).map(k => ({ value: k, label: sortName(k, labels) }));
        return (
          <div key={i} className="flex items-center gap-1.5 px-1 py-[3px]">
            <span className="tnum w-4 shrink-0 text-center text-xs text-muted-foreground">{i + 1}</span>
            <Select variant="word" value={r.key} onChange={k => set(i, { key: k, desc: false })} options={opts} searchable={false} label={`Sort ${i + 1} field`}
              className="w-[7.5rem] max-w-none justify-between bg-background" menuClassName="min-w-[10rem]" />
            <button type="button" onClick={() => set(i, { desc: !r.desc })} title="Flip the order" aria-label={`${sortName(r.key, labels)}: ${sortOrderWord(r)}. Flip the order`}
              className="inline-flex h-7 min-w-0 flex-1 items-center gap-1.5 rounded-md border px-2 text-left text-[13px] transition-colors hover:border-foreground/20 hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ui-field">
              <D className="size-3.5 shrink-0 text-muted-foreground" /><span className="truncate">{sortOrderWord(r)}</span>
            </button>
            {sortIsDefault(sorts) ? <span className="size-7 shrink-0" />
              : <button type="button" onClick={() => drop(i)} title="Remove" aria-label={`Remove ${sortName(r.key, labels).toLowerCase()} sort`}
                  className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"><I.x className="size-3.5" /></button>}
          </div>
        );
      })}
      {unused.length > 0 && <button type="button" onClick={() => setSorts([...sorts, { key: unused[0], desc: false }])}
        className="mt-0.5 flex h-8 w-full items-center gap-2 rounded-sm px-2 text-left text-sm text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:bg-accent focus-visible:outline-none">
        <I.plus className="size-3.5" />Add sort</button>}
      {!sortIsDefault(sorts) && <><div className="-mx-1 my-1 h-px bg-border" />
        <button type="button" onClick={() => setSorts(SORT_DEFAULT)}
          className="flex h-8 w-full items-center rounded-sm px-2 text-left text-sm text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:bg-accent focus-visible:outline-none">Reset to {sortName('deadline', labels)}</button></>}
    </div>
  );
}

// The Sort button beside Filter. Like Filter it turns blue with a count once you change the sort from the default.
function SortButton({ sorts, setSorts, labels }) {
  const custom = !sortIsDefault(sorts);
  const said = sorts.map(r => `${sortName(r.key, labels)}, ${sortOrderWord(r).toLowerCase()}`).join(', then ');
  return (
    <Popover align="end" className="w-[22rem] p-1"
      trigger={({ open: isOpen, ...p }) => <button {...p} type="button" title={`Sorted by ${said}`} aria-label={`Sort. Sorted by ${said}`}
        className={cn('inline-flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ui-control',
          custom ? 'border-blue-500/40 bg-blue-50 text-blue-700 dark:border-blue-500/50 dark:bg-blue-950/60 dark:text-blue-200' : 'text-muted-foreground hover:text-foreground')}>
        <I.updown className="size-3.5" />Sort{custom ? <span className="tnum">· {sorts.length}</span> : null}</button>}>
      <SortEditor sorts={sorts} setSorts={setSorts} labels={labels} />
    </Popover>
  );
}

// The sort chips in the row under the toolbar, one per rule (FilterChips shows them once the sort differs from the default).
// Click a chip to change its field or order; the × removes it.
function SortChips({ sorts, setSorts, labels }) {
  const set = (i, patch) => setSorts(sortSet(sorts, i, patch)), drop = i => setSorts(sortDrop(sorts, i));
  const row = (on, onPick, children) => (
    <button type="button" role="menuitemradio" aria-checked={on} onClick={onPick}
      className={cn('flex h-8 w-full items-center gap-2 rounded-sm px-2 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none', on && 'font-medium')}>
      {children}{on && <I.check className="ml-auto size-3.5 shrink-0" />}
    </button>
  );
  return sorts.map((r, i) => {
    const A = r.desc ? I.arrowDown : I.arrowUp, name = sortName(r.key, labels);
    const free = SORT_KEYS.filter(k => k === r.key || !sorts.some(x => x.key === k));
    return (
      <div key={r.key} className="group inline-flex h-7 items-center rounded-md border text-sm font-medium ui-control">
        <Popover align="start" className="w-52 p-1"
          trigger={({ open: isOpen, ...p }) => <button {...p} type="button" title={`Sort ${i + 1}: ${name}, ${sortOrderWord(r).toLowerCase()}`} aria-label={`Sort ${i + 1}: ${name}, ${sortOrderWord(r).toLowerCase()}. Change`}
            className={cn('inline-flex h-full max-w-[200px] items-center gap-1.5 rounded-md pl-2 pr-2.5 group-hover:pr-1 group-focus-within:pr-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', isOpen && 'bg-accent')}>
            <A className="size-3.5 shrink-0 text-muted-foreground" /><span className="truncate">{name}</span>
          </button>}>
          {close => <div role="menu" aria-label={`Sort ${i + 1}`}>
            {row(!r.desc, () => { set(i, { desc: false }); close(); }, <><I.arrowUp className="size-3.5 shrink-0 text-muted-foreground" />{sortOrderWord({ ...r, desc: false })}</>)}
            {row(r.desc, () => { set(i, { desc: true }); close(); }, <><I.arrowDown className="size-3.5 shrink-0 text-muted-foreground" />{sortOrderWord({ ...r, desc: true })}</>)}
            <div className="-mx-1 my-1 h-px bg-border" />
            {free.map(k => <React.Fragment key={k}>{row(k === r.key, () => { if (k !== r.key) set(i, { key: k, desc: false }); close(); }, sortName(k, labels))}</React.Fragment>)}
          </div>}
        </Popover>
        <button type="button" onClick={() => drop(i)} aria-label={`Remove ${name.toLowerCase()} sort`} title="Remove"
          className="mr-1 hidden size-5 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none group-hover:flex group-focus-within:flex"><I.x className="size-3" /></button>
      </div>
    );
  });
}

// The chips row under the toolbar.
function FilterChips({ f, sort }) {
  const on = FILTER_KINDS.filter(k => filterSel(k, f).length);
  const sorting = sort && !sortIsDefault(sort.sorts);
  if (!on.length && !sorting) return null;
  const unused = FILTER_KINDS.filter(k => !on.includes(k));
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {on.map(k => {
        const s = filterSummary(k, f), noun = filterNoun(k, f.labels);
        const names = filterSel(k, f).map(v => (filterOptions(k, f).find(o => o.v === v) || { label: v }).label).join(', ');
        return (
          <div key={k} className="group inline-flex h-7 items-center rounded-md border text-sm font-medium ui-control">
            <Popover align="start" className="w-72 p-1"
              trigger={({ open: isOpen, ...p }) => <button {...p} type="button" title={`${noun}: ${names}`} aria-label={`${noun}: ${names}. Change`}
                className={cn('inline-flex h-full max-w-[220px] items-center gap-1.5 rounded-md pl-2.5 pr-2.5 group-hover:pr-1 group-focus-within:pr-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', isOpen && 'bg-accent')}>
                {k === 'project' && s.first.icon && <span className="shrink-0 text-muted-foreground">{s.first.icon}</span>}
                <span className="truncate">{s.first.label}</span>
                {s.more > 0 && <span className="tnum shrink-0 font-normal text-muted-foreground">+{s.more}</span>}
              </button>}>
              <FilterList kind={k} f={f} />
            </Popover>
            <button type="button" onClick={() => filterClear(k, f)} aria-label={`Remove ${noun.toLowerCase()} filter`} title="Remove"
              className="mr-1 hidden size-5 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none group-hover:flex group-focus-within:flex"><I.x className="size-3" /></button>
          </div>
        );
      })}
      {on.length > 0 && unused.length > 0 && <Popover align="start" className="w-60 p-1"
        trigger={({ open: isOpen, ...p }) => <button {...p} type="button" className={cn('inline-flex h-7 items-center gap-1 rounded-md border border-dashed px-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', isOpen && 'bg-muted text-foreground')}>
          <I.plus className="size-3.5" />Filter</button>}>
        <FilterMenu f={f} kinds={unused} side="right" />
      </Popover>}
      {on.length > 0 && <button type="button" onClick={() => FILTER_KINDS.forEach(k => filterClear(k, f))} className="ml-1 rounded-sm px-1 text-sm text-muted-foreground hover:text-foreground hover:underline underline-offset-4">Clear</button>}
      {on.length > 0 && sorting && <span aria-hidden="true" className="mx-1 h-4 w-px bg-border" />}
      {sorting && <SortChips {...sort} />}
      {sorting && <button type="button" onClick={() => sort.setSorts(SORT_DEFAULT)} className="ml-1 rounded-sm px-1 text-sm text-muted-foreground hover:text-foreground hover:underline underline-offset-4">Reset</button>}
    </div>
  );
}

/* Time-based automations for one workspace (0.20.3: shared by the open workspace and the ones running in
   the background). Returns the tasks to save; claims runs in a team so only one PC does each. */
async function scanTimeRules(eng, rules, getTasks, prefs) {
  const list = rules.filter(r => r.enabled && r.scope !== 'bucket' && TIME_TRIGGERS.includes(r.trigger));
  if (!list.length) return { quiet: [], updates: [], made: [], notes: [] };
  const now = Date.now();
  const updates = [], made = [], notes = [], pending = [], quiet = [];
  Object.values(getTasks()).forEach(t => {
    if (t.inbox) return;
    const days = t.deadline ? dayDiff(t.deadline) : null, open = t.status !== 'done';
    const fire = [], keys = {};
    list.forEach(r => {
      if (!eng.ruleMatches(r, t) || !eng.condOk(r, t)) return;
      const w = r.when || {};
      let key = r.id, hit = false, legacy = null;
      // Deadline automations are keyed by the deadline too (0.20.3), so moving the deadline lets them run
      // again in a team as well (the claim for the old deadline used to block them for good). A key from
      // before 0.20.3 still counts for the deadline it fired on: changing the deadline clears it.
      if (['overdue', 'due_soon', 'due_in'].includes(r.trigger)) { key = `${r.id}@${t.deadline}`; legacy = r.id; }
      if (r.trigger === 'overdue') hit = open && days != null && days < 0;
      else if (r.trigger === 'due_soon') hit = open && days != null && days >= 0 && days <= 1;
      else if (r.trigger === 'due_in') hit = open && days != null && days >= 0 && days <= Number(w.days || 1);
      else if (r.trigger === 'stale') {
        const since = t.statusAt || t.updatedAt || t.createdAt || now;
        hit = !!w.status && eng.sKey(t) === w.status && now - since >= Number(w.days || 3) * 864e5;
        key = `${r.id}@${since}`;
      } else if (r.trigger === 'timer_long') {
        hit = !!t.timerStartedAt && timerHere(t) && now - t.timerStartedAt >= Number(w.hours || 4) * 36e5;
        key = `${r.id}@${t.timerStartedAt}`;
      }
      if (r.personal) { key += '~' + personKey; if (legacy) legacy += '~' + personKey; } // your own notifications: one per person
      const fired = t.autoFired || {};
      if (hit && !fired[key] && !(legacy && fired[legacy])) { fire.push({ r, key }); keys[key] = true; }
    });
    if (fire.length) pending.push({ t, fire, keys });
  });
  // In a team, the first PC to claim a run does it, so a "make a copy" never happens twice.
  const ready = [];
  {
    for (const p of pending) {
      const ok = [], keys = { ...p.keys };
      for (const f of p.fire) {
        const c = f.r.personal || f.r.action === 'notify' ? true : await cloudClaim(p.t.id, f.key);
        if (c === true) ok.push(f.r);
        else if (c === null) delete keys[f.key]; // couldn't reach the cloud: try again next minute
      }
      if (Object.keys(keys).length) ready.push({ ...p, fire: ok, keys });
    }
  }
  ready.forEach(({ t: t0, fire, keys }) => {
    const t = getTasks()[t0.id]; if (!t) return;
    if (!fire.length) { quiet.push({ ...t, autoFired: { ...(t.autoFired || {}), ...keys } }); return; } // another PC ran it
    const res = eng.runActions(t, fire, { noStart: !!prefs.oneAtATime });
    // What the change sets off ("timer is paused", "status changes to"…) runs too.
    const sub = eng.automate(res.task, t, { depth: 1 });
    updates.push({ ...sub.task, autoFired: { ...(sub.task.autoFired || {}), ...keys } });
    made.push(...res.created, ...sub.created); notes.push(...res.notes, ...sub.notes);
  });
  return { quiet, updates, made, notes };
}

/* The automation engine (0.20.3: moved out of App so every workspace's time-based automations can run,
   not just the open one's). ctx gives the current rules, statuses, preferences, team and tasks. */
function makeEngine(ctx) {
  // Automations. Each rule: for tasks in [project], when the task [trigger], [action] [target].
  const ruleMatches = (r, t) => r.enabled && r.scope !== 'bucket' && (!r.project || norm(r.project) === norm(t.project));
  const sKey = t => taskStatusKey(t, ctx.stages());
  // "Only if" lines: all must hold.
  const condOk = (r, t) => (r.only || []).every(c => condHolds(c, t, ctx.stages()));
  const triggered = (r, next, prev) => {
    const trigger = r.trigger, w = r.when || {};
    if (trigger === 'created') return !prev;
    if (trigger === 'started') return next.status === 'doing' && (!prev || prev.status !== 'doing');
    if (trigger === 'blocked') return next.status === 'blocked' && (!prev || prev.status !== 'blocked');
    if (trigger === 'done') return next.status === 'done' && (!prev || prev.status !== 'done');
    if (trigger === 'unblocked') return !!prev && prev.status === 'blocked' && next.status !== 'blocked';
    if (trigger === 'reopened') return !!prev && prev.status === 'done' && next.status !== 'done';
    if (trigger === 'assigned' || (trigger === 'assigned_to' && !w.person)) return !!(next.assignee || '').trim() && (!prev || norm(prev.assignee) !== norm(next.assignee));
    if (trigger === 'assigned_to') return norm(next.assignee) === norm(w.person) && (!prev || norm(prev.assignee) !== norm(w.person));
    if (trigger === 'high') return next.priority === 'high' && (!prev || prev.priority !== 'high');
    if (trigger === 'priority_to') { const v = w.priority || 'high'; return (next.priority || 'normal') === v && (!prev || (prev.priority || 'normal') !== v); }
    if (trigger === 'file_added') return (next.files || []).length > ((prev && prev.files) || []).length;
    if (trigger === 'moved') return !!prev && !!next.project && norm(prev.project) !== norm(next.project);
    if (trigger === 'timer_started') return !!next.timerStartedAt && !(prev && prev.timerStartedAt);
    if (trigger === 'timer_paused') return !!prev && !!prev.timerStartedAt && !next.timerStartedAt;
    if (trigger === 'status_to') { const k = sKey(next); return (w.statuses || []).includes(k) && (!prev || sKey(prev) !== k); }
    if (trigger === 'status_from') return !!prev && (w.statuses || []).includes(sKey(prev)) && sKey(next) !== sKey(prev);
    if (trigger === 'deadline_changed') return !!prev && !!next.deadline && next.deadline !== (prev.deadline || '');
    if (trigger === 'bucket_added') return !!(next.bucket || '').trim() && (!prev || norm(prev.bucket) !== norm(next.bucket));
    if (trigger === 'checklist') {
      const c = next.checklist || [], pc = (prev && prev.checklist) || [];
      return c.length > 0 && c.every(x => x.done) && !(pc.length > 0 && pc.every(x => x.done));
    }
    return false;
  };
  // opts.noStart: don't start timers (used for tasks paused by "One task at a time", so they can't restart).
  const runActions = (task, list, opts = {}) => {
    let t = { ...task }; const created = [], notes = [];
    for (const r of list) {
      if (r.action === 'copy') {
        if (!r.target || norm(r.target) === norm(t.project) || (t.followUps || {})[r.id]) continue;
        const c = {
          id: newId(), title: t.title, description: t.description || '', assignee: t.assignee || '', deadline: t.deadline || '',
          files: t.files || [], priority: t.priority || 'normal', checklist: (t.checklist || []).map(x => ({ ...x, id: newId(), done: false })),
          bucket: t.bucket || '', project: r.target, status: 'todo', createdAt: Date.now(), timeSpent: 0, timerStartedAt: null, blockedBy: null,
          generatedFrom: t.id, generatedBy: r.id,
          // A copy belongs to the same piece of scope as its original.
          ...(t.bucket ? { bucketJoin: { name: norm(t.bucket), at: joinedAt(t) } } : {}), ...(t.addedReason ? { addedReason: t.addedReason } : {}),
        };
        created.push(c);
        t = { ...t, followUps: { ...(t.followUps || {}), [r.id]: c.id } };
      } else if (r.action === 'move' && r.target) t = { ...t, project: r.target };
      else if (r.action === 'status' && r.target) {
        // "doing" is the main In progress status; "doing|review" is one of your own in that group.
        const [group, stage] = String(r.target).split('|');
        if (!S[group]) continue;
        t = { ...t, status: group, stage: stage || '' };
        if (group === 'done' || group === 'blocked') t = stopT(t);
        if (group !== 'blocked') t.blockedBy = null;
      } else if (r.action === 'priority' && P[r.target]) t = { ...t, priority: r.target };
      else if (r.action === 'assign' && r.target) t = { ...t, assignee: r.target };
      else if (r.action === 'unassign') t = { ...t, assignee: '' };
      else if (r.action === 'stop_timer') t = stopT(t);
      else if (r.action === 'start_timer') {
        if (opts.noStart || t.timerStartedAt || t.status === 'done') continue;
        t = { ...t, status: t.status === 'todo' ? 'doing' : t.status, timerStartedAt: Date.now() };
      } else if (r.action === 'bucket' && r.target) t = { ...t, bucket: r.target };
      else if (r.action === 'unblock') t = { ...t, blockedBy: null };
      else if (r.action === 'deadline' && r.target) {
        // On "is created", only fill in a missing date; never overwrite one you chose.
        if (r.trigger === 'created' && t.deadline) continue;
        if (r.target === 'none') t = { ...t, deadline: '' };
        else { const d = new Date(); d.setDate(d.getDate() + Number(r.target)); t = { ...t, deadline: toISO(d), autoFired: {} }; }
      } else if (r.action === 'checklist' && r.target) {
        const have = new Set((t.checklist || []).map(c => norm(c.text)));
        const add = r.target.split(/[,\n]/).map(x => x.trim()).filter(x => x && !have.has(norm(x))).map(text => ({ id: newId(), text, done: false }));
        if (add.length) t = { ...t, checklist: [...(t.checklist || []), ...add] };
      } else if (r.action === 'notify') { if (!r.personal || isForMe(t, ctx.team())) notes.push({ kind: r.trigger, message: r.target || '', taskId: t.id, taskTitle: t.title }); }
    }
    return { task: t, created, notes };
  };
  // A change made by one automation can set off others (a finished checklist marks the task done,
  // which then copies it), but each automation runs at most once per change, so nothing can loop.
  // "Only if" lines are checked on the task as it was just before the change.
  // With "One task at a time", a timer that starts here (by hand or by an automation) pauses the others;
  // those tasks, and any that blockOthers() marked Blocked (opts.blocked), run their own automations
  // once more, one level deep, and are returned in `others`. They can't start timers.
  const automate = (next, prev, opts = {}) => {
    const depth = opts.depth || 0;
    let task = next, before = prev;
    const created = [], fired = [], notes = [], others = [];
    for (let pass = 0; pass < 3; pass++) {
      const list = ctx.rules().filter(r => !TIME_TRIGGERS.includes(r.trigger) && !fired.includes(r) && ruleMatches(r, task) && triggered(r, task, before) && condOk(r, before || task));
      if (!list.length) break;
      const res = runActions(task, list, { noStart: depth > 0 });
      before = task; task = res.task;
      created.push(...res.created); fired.push(...list); notes.push(...res.notes);
    }
    if (depth === 0) {
      const pre = Object.fromEntries((opts.blocked || []).map(o => [o.id, o]));
      const ids = new Set(Object.keys(pre));
      if (ctx.prefs().oneAtATime && task.timerStartedAt && !(prev && prev.timerStartedAt))
        Object.values(ctx.tasks()).forEach(o => { if (o.id !== task.id && o.timerStartedAt) ids.add(o.id); });
      ids.forEach(id => {
        const was = ctx.tasks()[id]; if (!was) return;
        const sub = automate(stopT(pre[id] || was), was, { depth: 1 });
        others.push(sub.task, ...sub.created); fired.push(...sub.fired); notes.push(...sub.notes);
      });
    }
    return { task, created, fired, notes, others };
  };
  return { ruleMatches, sKey, condOk, triggered, runActions, automate };
}

function App({ prof, standaloneId, ws = 'product', workspaces = [], onSwitchWorkspace = () => {}, onRenameWorkspace = () => {}, openOnLoad = null,
  teamsList = DEFAULT_TEAMS, rolesList = DEFAULT_ROLES, onSaveTeams = () => {}, onSaveRoles = () => {}, onReplayTour = () => {} }) {
  const me = prof.data.user;
  const team = useTeam();
  const canAdmin = !team.on || team.admin;
  const canAdminRef = useRef(canAdmin); canAdminRef.current = canAdmin;
  // Statuses, buckets, platforms, automations, column names and team settings: Owner and Admins only (0.20).
  const denied = () => toast('That one’s for admins', 'Only the Owner and Admins can change team settings. Ask one of them if it needs a tweak.');
  const guard = f => (...a) => { if (!canAdminRef.current) { denied(); return; } return f(...a); };
  const {
    tasks, saveMany, remove, rules: storedRules, saveRules: storeRules0, projects: storedProjects, saveProjects: saveProjects0, stages, saveStages: saveStages0, loaded,
    buckets: storedBuckets, saveBuckets: saveBuckets0, labels, saveLabels: saveLabels0, settings, saveSettings, looseDocs, saveLooseDocs,
    archived, trash, trashTasks: trashTasks0, restoreTask, purgeTrash, deleteDocEverywhere, updateDocEverywhere, replaceDocsEverywhere, undo, redo, damaged,
  } = useTasks(ws);
  const storeRules = guard(storeRules0), saveProjects = guard(saveProjects0), saveStages = guard(saveStages0), saveBuckets = guard(saveBuckets0), saveLabels = guard(saveLabels0);
  const saveTeamSettings = guard(saveSettings);
  // Members delete only tasks they made; the Owner and Admins can delete any.
  const trashTasks = ids => {
    const all0 = { ...tasksRef.current, ...archived };
    const ok = ids.filter(id => canDelete(all0[id], team));
    if (ok.length < ids.length) toast(ok.length ? `${ids.length - ok.length} of those aren’t yours to delete` : 'That one isn’t yours to delete', 'You can delete tasks you made. The Owner and Admins can delete any task.');
    if (ok.length) trashTasks0(ok);
  };
  const askDelete = id => { const t = tasksRef.current[id]; if (!canDelete(t, team)) { toast('That one isn’t yours to delete', 'You can delete tasks you made. The Owner and Admins can delete any task.'); return; } setConfirmId(id); };
  applyBucketStatuses(settings.bucketStatuses);
  STAGES_NOW = stages;
  // Automations as this version reads them (see ruleIn / ruleOut); saved back in a form older PCs skip safely.
  const rules = useMemo(() => (storedRules || []).map(ruleIn), [storedRules]);
  const saveRules = list => storeRules(list.map(ruleOut));
  const teamRef = useRef(team); teamRef.current = team;
  const doUndo = () => { if (undo()) toast('Undone'); else toast('Nothing to undo'); };
  const doRedo = () => { if (redo()) toast('Redone'); else toast('Nothing to redo'); };
  undoHook.current = undo;
  // Ctrl+Z undoes, Ctrl+Shift+Z or Ctrl+Y redoes (text fields keep their own undo while you type).
  const undoKeys = useRef(null); undoKeys.current = { doUndo, doRedo };
  useEffect(() => {
    const k = e => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const el = document.activeElement;
      if (el && (/^(INPUT|TEXTAREA)$/.test(el.tagName) || el.isContentEditable)) return;
      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) { e.preventDefault(); undoKeys.current.doUndo(); }
      else if ((key === 'z' && e.shiftKey) || key === 'y') { e.preventDefault(); undoKeys.current.doRedo(); }
    };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, []);
  const wsName = (workspaces.find(w => w.id === ws) || {}).name || 'Product';
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [prefs, setPrefs] = useState(readPrefs);
  const savePrefs = p => setPrefs(x => { const n = { ...x, ...p }; try { localStorage.setItem('tasks-prefs', JSON.stringify(n)); } catch (e) {} return n; });
  /* Notifications are personal in a team (0.20): yours live on this PC, start from the team's old ones,
     and only cover your tasks and your teams' tasks. The team's own notify automations are set aside. */
  const isNote = r => r.action === 'notify' && r.scope !== 'bucket';
  const notifyKey = 'notify-' + ws;
  useEffect(() => {
    if (team.on && !Array.isArray(prefs[notifyKey]) && rules.length) savePrefs({ [notifyKey]: rules.filter(isNote).map(r => ({ ...r, id: 'pn-' + r.id })) });
  }, [team.on, rules.length]);
  const myNotes = useMemo(() => (team.on ? (prefs[notifyKey] || []) : null), [team.on, prefs[notifyKey]]);
  const teamTaskCounts = useMemo(() => { const c = {}; Object.values(tasks).forEach(t => (t.teams || []).forEach(x => { c[x] = (c[x] || 0) + 1; })); return c; }, [tasks]);
  const runRules = useMemo(() => team.on ? [...rules.filter(r => !isNote(r)), ...(myNotes || []).map(r => ({ ...normalizeRule(r), personal: true }))] : rules, [rules, team.on, myNotes]);
  const [quickAdd, setQuickAdd] = useState(false);
  const [shortcutError, setShortcutError] = useState('');
  const [addTime, setAddTime] = useState(null);
  const [idle, setIdle] = useState(null);
  const [cellEdit, setCellEdit] = useState(null); // { id, field, el }
  const [renaming, setRenaming] = useState(null);
  const [statusesOpen, setStatusesOpen] = useState(false);
  const up = useUpdater();
  // Update available: the bottom-left snackbar, shown through its own Sonner toaster. It stays until you act on it.
  const upRef = useRef(up); upRef.current = up;
  useEffect(() => {
    if (!up.update) { sonner.dismiss('update'); return; }
    sonner.custom(() => <UpdateCard up={upRef.current} />, { id: 'update', toasterId: 'update', duration: Infinity, dismissible: false });
  }, [up.update, up.progress]);
  // What's new: opens once after an update. A brand-new install starts from the current version.
  const [whatsNew, setWhatsNew] = useState(null);
  useEffect(() => {
    if (standaloneId || !up.version || !loaded) return;
    let seen = null; try { seen = localStorage.getItem('tasks-seen-version'); } catch (e) {}
    try { localStorage.setItem('tasks-seen-version', up.version); } catch (e) {}
    if (seen === up.version) return;
    // No record: either a new install (no tasks yet, nothing to show) or an update from before 0.19.5.
    const items = seen ? whatsNewSince(seen, up.version) : Object.keys(tasks).length ? whatsNewSince('0.19.0', up.version) : [];
    if (items.length) setWhatsNew(items);
  }, [up.version, loaded]);
  const openWhatsNew = () => setWhatsNew(whatsNewSince('0.19.0', up.version || '9.9.9'));
  const savedView = useMemo(() => { try { return JSON.parse(localStorage.getItem(LS_VIEW)) || {}; } catch (e) { return {}; } }, []);
  // 0.19.14: bucket and platform filters are lists (empty = any). An older saved single platform still loads.
  const [projectFilter, setProjectFilter] = useState(() => { const v = savedView.projectFilter; return Array.isArray(v) ? v : v && v !== 'all' ? [v] : []; });
  // The app opens on Home.
  const [view, setView] = useState(standaloneId ? 'tasks' : 'home');
  const [bucketFocus, setBucketFocus] = useState(null);
  useEffect(() => { if (view !== 'projects') setBucketFocus(null); }, [view]);
  const [projectEdit, setProjectEdit] = useState(null); // { project } | { project: null } for new
  const [projectDelete, setProjectDelete] = useState(null);
  const [showSummary, setShowSummary] = useState(!!savedView.showSummary);
  const [query, setQuery] = useState('');
  const [rulesOpen, setRulesOpen] = useState(false);
  const [keysOpen, setKeysOpen] = useState(false);
  const searchRef = useRef(null);
  const [, setNow] = useState(0);
  const [filter, setFilter] = useState('open'); // the app always starts on Open
  const [sorts, setSorts] = useState(() => readSorts(savedView));
  // sortBy is still written so an older version opening this PC's settings keeps the main sort.
  useEffect(() => { try { localStorage.setItem(LS_VIEW, JSON.stringify({ projectFilter, sortBy: sorts[0].key, sorts, showSummary, view })); } catch (e) {} }, [projectFilter, sorts, showSummary, view]);
  const [quick, setQuick] = useState('');
  const [sheet, setSheet] = useState(standaloneId ? { open: true, id: standaloneId } : { open: false, id: null });
  const [openMode, setOpenMode] = useState(() => { try { const m = localStorage.getItem('tasks-open-mode'); return m && m !== 'tab' ? m : 'side'; } catch (e) { return 'side'; } });
  const chooseMode = m => { setOpenMode(m); try { localStorage.setItem('tasks-open-mode', m); } catch (e) {} };
  // The tab system was removed: everything stays on the main window, and a task opens in the panel you chose.
  // A Ctrl+click or middle-click that used to open a tab now just opens the task. Old saved tabs are cleared.
  useEffect(() => { try { localStorage.removeItem('tasks-tabs'); localStorage.removeItem('tasks-tabs-' + ws); } catch (e) {} }, []);
  // Opens a task the way you chose: side panel, centered or full screen.
  const openTask = id => setSheet({ open: true, id });
  const [confirmId, setConfirmId] = useState(null);
  const storageOk = true;
  const [cloudOpen, setCloudOpen] = useState(false);
  // Sidebar: a slim rail that opens over the page on hover. Pinning keeps it open (remembered on this PC only).
  const [railPinned, setRailPinned] = useState(() => { try { return localStorage.getItem('tasks-rail-pinned') === '1'; } catch (e) { return false; } });
  const [railHover, setRailHover] = useState(false);
  const railTimer = useRef(null);
  const railOpen = railPinned || railHover;
  const railEnter = () => { clearTimeout(railTimer.current); railTimer.current = setTimeout(() => setRailHover(true), 120); };
  const railLeave = () => { clearTimeout(railTimer.current); setRailHover(false); };
  const toggleRailPin = () => setRailPinned(p => { const n = !p; try { localStorage.setItem('tasks-rail-pinned', n ? '1' : '0'); } catch (e) {} if (!n) setRailHover(false); return n; });
  const [restoreSrc, setRestoreSrc] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const sheetDrop = useRef(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null);
  const [addDocs, setAddDocs] = useState({ open: false, files: [] });
  const [fileConfirm, setFileConfirm] = useState(null);
  const tasksRef = useRef(tasks); tasksRef.current = tasks;

  const all = useMemo(() => Object.values(tasks).map(t => ({ createdAt: Date.now(), ...t, status: S[t.status] ? t.status : 'todo' })), [tasks]);
  const runs = all.filter(t => t.timerStartedAt).sort((a, b) => a.timerStartedAt - b.timerStartedAt), running = runs[0];
  // Totals (today, this week, buckets) refresh once a minute while a timer runs; the clocks themselves tick in <Elapsed> (0.20.3).
  useEffect(() => { if (!running) return; const i = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(i); }, [!!running]);

  // In a team, people are the members (typed names from before stay until they're linked to someone).
  teamMode = team.on;
  nameClash = useMemo(() => { const seen = new Set(), twice = new Set(); team.members.forEach(m => { const n = norm(m.name); if (seen.has(n)) twice.add(n); seen.add(n); }); return twice; }, [team.members]);
  peopleMeta = useMemo(() => Object.fromEntries(team.members.map(m => [m.name, [roleName(m.role, rolesList), ...teamNames(m.teams, teamsList), m.email].filter(Boolean).join(' · ')])), [team.members, rolesList, teamsList]);
  const people = useMemo(() => team.on
    ? [...new Set([...team.members.map(m => m.name), ...all.map(t => (t.assignee || '').trim()).filter(n => n && !memberFor(n, team.members))].filter(Boolean))].sort((a, b) => a.localeCompare(b))
    : [...new Set([me.name, ...all.map(t => (t.assignee || '').trim())].filter(Boolean))].sort((a, b) => a.localeCompare(b)), [all, me.name, team.on, team.members]);
  // Managed projects, plus any project name still used by a task or automation.
  const projectList = useMemo(() => {
    const list = storedProjects.map(namedItem).filter(Boolean);
    const have = new Set(list.map(p => norm(p.name)));
    const extra = [...(storedProjects.length || ws !== 'product' ? [] : DEFAULT_PROJECTS), ...all.map(t => t.project), ...rules.flatMap(r => [r.project, (r.action === 'copy' || r.action === 'move') ? r.target : ''])];
    extra.map(x => (x || '').trim()).filter(Boolean).forEach(name => {
      if (!have.has(norm(name))) { have.add(norm(name)); list.push({ id: 'auto-' + norm(name), name, color: autoColor(name) }); }
    });
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [storedProjects, all, rules]);
  platformIconMap.current = Object.fromEntries(projectList.filter(p => p.icon).map(p => [norm(p.name), p.icon]));
  const projects = useMemo(() => projectList.map(p => p.name), [projectList]);
  const colorOf = name => PROJECT_COLORS[(projectList.find(p => norm(p.name) === norm(name)) || {}).color || autoColor(name)] || PROJECT_COLORS.slate;
  // Renames or creates a platform. Used by the rename window and by the in-place rename in Manage platforms.
  const writeProject = (old, { name, color, icon }) => {
    const list = projectList.filter(p => !old || norm(p.name) !== norm(old.name));
    const next = { ...(old || {}), id: old ? old.id : 'p-' + newId(), name, color: color || (old && old.color) || autoColor(name) };
    if (icon !== undefined) { if (icon) next.icon = icon; else delete next.icon; } // null puts the folder back
    saveProjects([...list, next]);
    if (old && old.name !== name) {
      const moved = Object.values(tasksRef.current).filter(t => norm(t.project) === norm(old.name)).map(t => ({ ...t, project: name }));
      if (moved.length) saveMany(moved);
      saveRules(rules.map(r => ({ ...r,
        project: norm(r.project) === norm(old.name) ? name : r.project,
        target: (r.action === 'copy' || r.action === 'move' || r.action === 'create') && norm(r.target) === norm(old.name) ? name : r.target })));
      setProjectFilter(f => f.map(x => x === old.name ? name : x));
    }
    if (icon === undefined) toast(old ? `${labels.platform} renamed` : `${labels.platform} created`, name);
  };
  const saveProject = ({ name, color }) => { writeProject(projectEdit && projectEdit.project, { name, color }); setProjectEdit(null); };
  const deleteProject = () => {
    const p = projectDelete; setProjectDelete(null);
    const n = norm(p.name);
    const moved = Object.values(tasksRef.current).filter(t => norm(t.project) === n).map(t => ({ ...t, project: '' }));
    if (moved.length) saveMany(moved);
    saveRules(rules.filter(r => norm(r.project) !== n && !((r.action === 'copy' || r.action === 'move') && norm(r.target) === n))
      .map(r => (r.action === 'create' && norm(r.target) === n ? { ...r, target: '' } : r)));
    saveProjects(projectList.filter(x => norm(x.name) !== n));
    setProjectFilter(f => f.filter(x => x !== p.name));
    toast(`${labels.platform} deleted`, p.name, { undo: true });
  };
  const ensureProject = name => {
    if (!name || projectList.some(p => norm(p.name) === norm(name))) return;
    saveProjects([...projectList, { id: 'p-' + newId(), name, color: autoColor(name) }]);
    toast(`${labels.platform} created`, name);
  };
  const addStage = (name, group) => {
    const found = stages.find(x => norm(x.name) === norm(name) && x.group === group);
    if (found) return found.id;
    const id = 'st-' + newId();
    const all = statusList(stages).map(({ builtin, ...x }) => x);
    const at = all.map(x => x.group).lastIndexOf(group) + 1;
    saveStages([...all.slice(0, at), { id, name, group, color: NEW_COLOR[group] }, ...all.slice(at)]);
    toast('Status created', `${name} (${GROUP_HEAD[group]})`);
    return id;
  };
  const deleteStage = id => {
    const sg = stages.find(x => x.id === id);
    saveStages(stages.filter(x => x.id !== id));
    if (sg) toast('Status deleted', `Tasks with “${sg.name}” now show ${S[sg.group].label}.`);
  };
  const openProject = name => { setProjectFilter([name]); setFilter('all'); setView('tasks'); };
  // Buckets (what the work is for): one per task, managed on the Buckets page.
  const bucketList = useMemo(() => {
    const list = storedBuckets.map(namedItem).filter(Boolean);
    const have = new Set(list.map(b => norm(b.name)));
    all.forEach(t => { const n = (t.bucket || '').trim(); if (n && !have.has(norm(n))) { have.add(norm(n)); list.push({ id: 'auto-' + norm(n), name: n }); } });
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [storedBuckets, all]);
  const bucketNames = useMemo(() => bucketList.map(b => b.name), [bucketList]);
  const bucketInfo = useMemo(() => {
    const m = {};
    bucketList.forEach(b => { m[norm(b.name)] = { name: b.name, description: b.description || '', status: bucketStatus(b), open: 0 }; });
    all.forEach(t => { const x = m[norm(t.bucket)]; if (x && t.status !== 'done') x.open++; });
    return m;
  }, [bucketList, all]);
  const [bucketFilter, setBucketFilter] = useState([]);
  const [dueFilter, setDueFilter] = useState('');
  // "Tasks for me" (0.20): 'me', 'all', or 'team:<id>'. Remembered on this PC.
  const [scope, setScope0] = useState(() => { try { return localStorage.getItem('tasks-scope') || 'me'; } catch (e) { return 'me'; } });
  const setScope = v => { setScope0(v); try { localStorage.setItem('tasks-scope', v); } catch (e) {} };
  const inScope = t => !team.on || scope === 'all' || (scope.startsWith('team:') ? (t.teams || []).includes(scope.slice(5)) : isForMe(t, team));
  useEffect(() => {
    if (!team.on) return;
    const k = e => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return;
      if (e.key === '1' || e.key === '2') { e.preventDefault(); setScope(e.key === '1' ? 'me' : 'all'); setView('tasks'); }
    };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [team.on]);
  const [cleanUpOpen, setCleanUpOpen] = useState(false);
  const COLS_KEY = 'tasks-cols-' + ws;
  // Column widths, hidden columns and (0.19.14) column order are kept on this PC, like before.
  const [cols, setCols] = useState(() => { try { const v = JSON.parse(localStorage.getItem(COLS_KEY)); return { widths: (v && v.widths) || {}, hidden: (v && v.hidden) || [], order: (v && v.order) || [] }; } catch (e) { return { widths: {}, hidden: [], order: [] }; } });
  useEffect(() => { try { localStorage.setItem(COLS_KEY, JSON.stringify(cols)); } catch (e) {} }, [cols]);
  // Task always comes first; the rest follow the saved order, and any column not in it yet goes at the end.
  const movableKeys = (() => { const all = TABLE_COLS.filter(c => c.key !== 'task').map(c => c.key); return [...(cols.order || []).filter(k => all.includes(k)), ...all.filter(k => !(cols.order || []).includes(k))]; })();
  const orderedCols = [TABLE_COLS[0], ...movableKeys.map(k => TABLE_COLS.find(c => c.key === k))];
  const visibleCols = orderedCols.filter(c => c.key === 'task' || !cols.hidden.includes(c.key));
  const colW = c => cols.widths[c.key] || c.w;
  const setColWidth = (key, w) => setCols(c => { const widths = { ...c.widths }; if (w == null) delete widths[key]; else widths[key] = w; return { ...c, widths }; });
  const hideCol = (key, hide) => setCols(c => ({ ...c, hidden: hide ? [...new Set([...c.hidden, key])] : c.hidden.filter(k => k !== key) }));
  // Drag the line between two headings to resize a column; double-click it to reset.
  const startResize = (e, c) => {
    e.preventDefault(); e.stopPropagation();
    const x0 = e.clientX, w0 = colW(c);
    const move = ev => setColWidth(c.key, Math.max(c.min, Math.round(w0 + ev.clientX - x0)));
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); document.body.style.cursor = ''; };
    document.body.style.cursor = 'col-resize';
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
  };
  /* Rearrange columns (0.19.14): drag a heading left or right; a line shows where it will land.
     A press without a drag still opens the heading's menu, which also has Move left / Move right. */
  const tableWrap = useRef(null);
  const [colDrag, setColDrag] = useState(null); // { key, label, x, y, line, at }
  const [movedCol, setMovedCol] = useState(null);
  const moveColTo = (key, at) => setCols(c => {
    // `at` is the place among the visible movable columns; hidden ones keep their spots.
    const vis = movableKeys.filter(k => !c.hidden.includes(k) && k !== key);
    const before = vis[at];
    const rest = movableKeys.filter(k => k !== key);
    const i = before ? rest.indexOf(before) : rest.length;
    return { ...c, order: [...rest.slice(0, i), key, ...rest.slice(i)] };
  });
  const flashMoved = key => { setMovedCol(key); setTimeout(() => setMovedCol(m => (m === key ? null : m)), 450); };
  const nudgeCol = (key, dir) => {
    const vis = movableKeys.filter(k => !cols.hidden.includes(k));
    const i = vis.indexOf(key), j = i + dir;
    if (i < 0 || j < 0 || j >= vis.length) return;
    moveColTo(key, j); flashMoved(key);
  };
  const startColDrag = (e, c) => {
    if (c.key === 'task' || e.button !== 0 || !tableWrap.current) return;
    const x0 = e.clientX, y0 = e.clientY;
    let on = false, at = null;
    const wrap = tableWrap.current;
    const heads = () => [...wrap.querySelectorAll('th[data-col]')].filter(th => th.dataset.col !== 'task');
    const move = ev => {
      if (!on) { if (Math.abs(ev.clientX - x0) < 5 && Math.abs(ev.clientY - y0) < 5) return; on = true; document.body.style.cursor = 'grabbing'; }
      const ths = heads(), wr = wrap.getBoundingClientRect();
      const others = ths.filter(th => th.dataset.col !== c.key);
      at = others.filter(th => { const r = th.getBoundingClientRect(); return ev.clientX > r.left + r.width / 2; }).length;
      // The line sits on the edge between the two columns it will land between.
      const edge = at < others.length ? others[at].getBoundingClientRect().left : others.length ? others[others.length - 1].getBoundingClientRect().right : ths[0].getBoundingClientRect().left;
      setColDrag({ key: c.key, label: labels[c.key], x: ev.clientX, y: ev.clientY, line: edge - wr.left + wrap.scrollLeft, at });
    };
    const end = () => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel); window.removeEventListener('keydown', esc, true);
      document.body.style.cursor = '';
    };
    // Esc, or the pointer being taken away (e.g. the window losing focus), drops the drag without moving anything.
    // Swallows the click that ends a drag, so the heading's menu doesn't open.
    const swallowClick = () => {
      const stop = ev => { ev.stopPropagation(); ev.preventDefault(); };
      window.addEventListener('click', stop, true); setTimeout(() => window.removeEventListener('click', stop, true), 0);
    };
    const cancel = () => { end(); setColDrag(null); };
    const esc = ev => {
      if (ev.key !== 'Escape' || !on) return;
      ev.stopPropagation(); cancel();
      window.addEventListener('pointerup', swallowClick, { once: true }); // the mouse button is still down
    };
    const up = () => {
      end();
      if (!on) return;
      swallowClick();
      setColDrag(null);
      if (at != null) { moveColTo(c.key, at); flashMoved(c.key); }
    };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel); window.addEventListener('keydown', esc, true);
  };
  const VM_KEY = 'tasks-view-mode-' + ws, GB_KEY = 'tasks-group-by-' + ws;
  const [viewMode, setViewMode] = useState(() => { try { return localStorage.getItem(VM_KEY) || 'table'; } catch (e) { return 'table'; } });
  const [groupBy, setGroupBy] = useState(() => { try { return localStorage.getItem(GB_KEY) || 'project'; } catch (e) { return 'project'; } });
  useEffect(() => { try { localStorage.setItem(VM_KEY, viewMode); localStorage.setItem(GB_KEY, groupBy); } catch (e) {} }, [viewMode, groupBy]);
  const openFromView = id => openTask(id);
  const moveToColumn = (id, colId) => {
    const d = statusList(stages).find(x => x.id === colId); if (!d) return;
    const t = tasksRef.current[id]; if (!t || statusDef(t, stages).id === colId) return;
    updateTask(id, { status: d.group, stage: d.builtin ? '' : d.id });
  };
  const [purgeConfirm, setPurgeConfirm] = useState(null);
  const [bucketEdit, setBucketEdit] = useState(null);
  const [bucketDelete, setBucketDelete] = useState(null);
  const [platformsOpen, setPlatformsOpen] = useState(false);
  const [labelEdit, setLabelEdit] = useState(null); // a column key
  const [wsRename, setWsRename] = useState(false);
  const ensureBucket = name => {
    if (!name || bucketList.some(b => norm(b.name) === norm(name))) return;
    saveBuckets([...bucketList, { id: 'b-' + newId(), name, description: '', status: BUCKET_STATUSES[0].id, createdAt: Date.now() }]);
    toast(`${labels.bucket} created`, name);
  };
  // Bucket automations whose status a bucket has just reached, and that haven't run for it yet.
  const pendingHandoffs = (b, status) => rules.filter(r => r.enabled && r.scope === 'bucket' && r.status === status && !(b.fired || {})[r.id]);
  // Moving a bucket to a status runs its bucket automations: each creates one task in the bucket, once.
  const handoff = (b, status) => {
    const fired = { ...(b.fired || {}) }, made = [];
    pendingHandoffs(b, status).forEach(r => {
      let deadline = '';
      if (r.days && r.days !== 'none') { const d = new Date(); d.setDate(d.getDate() + Number(r.days)); deadline = toISO(d); }
      const auto = automate({
        id: newId(), title: fillBucket(r.title, b), description: b.description || '', status: 'todo', assignee: r.assignee || '', deadline, priority: 'normal', checklist: [],
        project: r.target || '', bucket: b.name, createdAt: Date.now(), timeSpent: 0, timerStartedAt: null, generatedBy: r.id,
      }, null);
      made.push(auto.task, ...auto.created, ...auto.others); fired[r.id] = auto.task.id;
    });
    made.push(...bucketTaskRules(b, status));
    return { fired, made };
  };
  const bucketRecord = (old, patch) => ({ ...(old || {}), ...patch, id: old && !String(old.id).startsWith('auto-') ? old.id : 'b-' + newId() });
  const setBucketStatus = (name, status) => {
    const b = bucketList.find(x => norm(x.name) === norm(name)); if (!b || bucketStatus(b) === status) return;
    const { fired, made } = handoff(b, status);
    saveBuckets([...bucketList.filter(x => x !== b), bucketRecord(b, { status, fired })]);
    if (made.length) saveMany(made);
    toast(`${b.name}: ${BS[status].label}`, made.length ? `${made.length === 1 ? `“${made[0].title}” was` : `${made.length} tasks were`} created.` : undefined, { undo: true });
  };
  // Timeline: set (or clear) a bucket's planned start and end dates.
  // From the Scope section's suggestion: the move is logged against the original end like any other.
  const moveBucketEnd = (b, end) => {
    const cur = bucketList.find(x => norm(x.name) === norm(b.name)); if (!cur || !end || cur.end === end) return;
    const from = cur.end;
    saveBuckets([...bucketList.filter(x => x !== cur), bucketRecord(cur, { end })]);
    toast(`${cur.name} now ends ${shortDate(end)}`, `Moved from ${shortDate(from)} for the added tasks.`, { undo: true });
  };
  const planBucket = (name, start, end) => {
    const b = bucketList.find(x => norm(x.name) === norm(name)); if (!b || (b.start === start && b.end === end)) return;
    saveBuckets([...bucketList.filter(x => x !== b), bucketRecord(b, { start, end })]);
  };
  const saveBucket = ({ name, description, status, start, end, baseEnd }) => {
    const old = bucketEdit && bucketEdit.bucket;
    const list = bucketList.filter(b => !old || norm(b.name) !== norm(old.name));
    const base = old ? { ...old, name, description, start, end, ...(baseEnd && old.baseEnd ? { baseEnd } : {}) } : { name, description, start, end, createdAt: Date.now() };
    const moving = !old || bucketStatus(old) !== status;
    const { fired, made } = moving ? handoff(base, status) : { fired: base.fired, made: [] };
    saveBuckets([...list, bucketRecord(old, { ...base, status, ...(fired ? { fired } : {}) })]);
    if (old && old.name !== name) {
      const moved = Object.values(tasksRef.current).filter(t => norm(t.bucket) === norm(old.name)).map(t => ({ ...t, bucket: name, bucketJoin: { name: norm(name), at: joinedAt(t) } }));
      if (moved.length) saveMany(moved);
      setBucketFilter(f => f.map(x => x === old.name ? name : x));
    }
    if (made.length) saveMany(made);
    setBucketEdit(null);
    toast(old ? `${labels.bucket} saved` : `${labels.bucket} created`, made.length ? `${name}. ${made.length} ${made.length === 1 ? 'task' : 'tasks'} created.` : name);
  };
  // Scope tracking: when a bucket's start day arrives, its end date becomes the original end, and every
  // later change of the end is logged (changes within 10 minutes of each other count as one move).
  // A bucket moved to start in the future again is back in planning, so its record starts over.
  const [dayKey, setDayKey] = useState(() => toISO(new Date()));
  useEffect(() => { const i = setInterval(() => setDayKey(toISO(new Date())), 600000); return () => clearInterval(i); }, []);
  const scopeTasks = useMemo(() => [...all, ...Object.values(archived)], [all, archived]);
  const scopeRef = useRef(scopeTasks); scopeRef.current = scopeTasks;
  useEffect(() => {
    if (!loaded || standaloneId) return;
    const now = Date.now(); let changed = false;
    const next = storedBuckets.map(b => {
      if (!b.start || !b.end) return b;
      if (b.start > dayKey) {
        if (!b.baseEnd) return b;
        changed = true; const { baseEnd, baseAt, trackedEnd, moves, ...rest } = b; return rest;
      }
      if (!b.baseEnd) { changed = true; return { ...b, baseEnd: b.end, baseAt: now, trackedEnd: b.end }; }
      if (b.trackedEnd === b.end) return b;
      changed = true;
      const moves = [...(b.moves || [])], last = moves[moves.length - 1];
      if (last && now - last.at < 600000) { moves[moves.length - 1] = { ...last, to: b.end, at: now }; if (b.end === last.from) moves.pop(); }
      else moves.push({ at: now, from: b.trackedEnd || b.baseEnd, to: b.end, added: scopeRef.current.filter(t => norm(t.bucket) === norm(b.name) && isAddedLater(t, b)).length });
      return { ...b, trackedEnd: b.end, moves };
    });
    if (changed && canAdminRef.current) saveBuckets0(next);
  }, [storedBuckets, loaded, dayKey]);
  // A heads-up when a task is added to a bucket that has already started.
  const lateSeen = useRef(null);
  useEffect(() => {
    if (!loaded || standaloneId) return;
    const bm = Object.fromEntries(bucketList.map(b => [norm(b.name), b]));
    const ids = new Set(all.filter(t => (t.title || '').trim() && t.bucket && joinedLate(t, bm[norm(t.bucket)])).map(t => t.id));
    const prev = lateSeen.current; lateSeen.current = ids;
    if (!prev) return;
    const fresh = all.find(t => ids.has(t.id) && !prev.has(t.id) && Date.now() - joinedAt(t) < 120000 && t.addedReason !== 'planned');
    if (!fresh) return;
    const b = bm[norm(fresh.bucket)], sc = bucketScope(b, scopeRef.current);
    toast(`Added after ${b.name} started`, sc && sc.warn ? sc.warn : `${sc ? nTasks(sc.added.length) : 'This task'} added since it started. Open the task to say why: bug, change request or missed requirement.`);
  }, [all, bucketList, loaded]);
  const setAddedReason = (id, reason) => {
    const t = tasksRef.current[id]; if (!t) return;
    const n = { ...t }; if (reason) n.addedReason = reason; else delete n.addedReason;
    saveMany([n]);
  };
  // When the last open task in a bucket is finished, offer to move the bucket to Ready for dev.
  const [readyAsk, setReadyAsk] = useState(null);
  const bucketCounts = useRef(null);
  useEffect(() => {
    if (!loaded || standaloneId) return;
    const counts = {};
    all.forEach(t => { const k = norm(t.bucket); if (!k) return; const c = counts[k] || (counts[k] = { open: 0, total: 0 }); c.total++; if (t.status !== 'done') c.open++; });
    const prev = bucketCounts.current; bucketCounts.current = counts;
    if (!prev) return;
    const hit = bucketList.find(b => {
      const c = counts[norm(b.name)], p = prev[norm(b.name)];
      // Only when a task was finished, not when the last open one was deleted.
      return c && p && c.open === 0 && p.open > 0 && c.total >= p.total && BS.ready && BUCKET_STATUSES.indexOf(BS[bucketStatus(b)]) < BUCKET_STATUSES.indexOf(BS.ready);
    });
    if (hit) setReadyAsk({ name: hit.name, total: counts[norm(hit.name)].total, handoffs: pendingHandoffs(hit, 'ready').length });
  }, [all, loaded]);
  const deleteBucket = () => {
    const b = bucketDelete; setBucketDelete(null);
    const moved = Object.values(tasksRef.current).filter(t => norm(t.bucket) === norm(b.name)).map(t => ({ ...t, bucket: '' }));
    if (moved.length) saveMany(moved);
    saveBuckets(bucketList.filter(x => norm(x.name) !== norm(b.name)));
    setBucketFilter(f => f.filter(x => x !== b.name));
    toast(`${labels.bucket} deleted`, b.name, { undo: true });
  };
  const openBucket = name => { setBucketFilter([name]); setFilter('all'); setView('tasks'); };
  // Bucket statuses can be edited. Buckets whose status is deleted move to the first one left.
  const [bucketStatusesOpen, setBucketStatusesOpen] = useState(false);
  const saveBucketStatuses = list => {
    const ids = new Set(list.map(x => x.id)), first = (list.find(x => x.id !== 'done') || list[0]).id;
    const moved = bucketList.filter(b => !ids.has(bucketStatus(b)));
    saveTeamSettings(x => ({ ...x, bucketStatuses: list }));
    if (moved.length) saveBuckets(bucketList.map(b => moved.includes(b) ? bucketRecord(b, { status: first }) : b));
    setBucketStatusesOpen(false);
    toast(`${labels.bucket} statuses saved`, moved.length ? `${moved.length} ${moved.length === 1 ? labels.bucket.toLowerCase() + ' moved' : plural(labels.bucket.toLowerCase()) + ' moved'} to ${list.find(x => x.id === first).label}.` : undefined, { undo: true });
  };
  // A bucket with a timeline sets the deadline of every task in it to the timeline's end date.
  // While the task stays in that bucket the deadline is locked; it moves with the timeline.
  const bucketEnds = useMemo(() => {
    const m = {};
    bucketList.forEach(b => { if (b.start && b.end) m[norm(b.name)] = { name: b.name, end: b.end }; });
    return m;
  }, [bucketList]);
  const bucketMap = useMemo(() => Object.fromEntries(bucketList.map(b => [norm(b.name), b])), [bucketList]);
  const deadlineLock = t => (t && t.bucket && bucketEnds[norm(t.bucket)]) || null;
  // A task follows the bucket's end unless you picked an earlier date while it was in this bucket
  // (deadlineCustom holds that bucket). A date after the end is pulled back to the end.
  const bucketDeadline = (t, l) => (t.deadlineCustom === norm(t.bucket) && t.deadline && t.deadline < l.end ? t.deadline : l.end);
  const fitDeadline = (t, v) => {
    const l = deadlineLock(t); if (!l) return { deadline: v };
    return !v || v >= l.end ? { deadline: l.end, deadlineCustom: null } : { deadline: v, deadlineCustom: norm(t.bucket) };
  };
  useEffect(() => {
    if (!loaded || standaloneId) return;
    const fix = Object.values(tasks).map(t => {
      const l = deadlineLock(t); if (!l) return null;
      const want = bucketDeadline(t, l), custom = want === l.end ? null : norm(t.bucket);
      if (t.deadline === want && (t.deadlineCustom || null) === custom) return null;
      return { ...t, deadline: want, deadlineCustom: custom, ...(t.deadline !== want ? { autoFired: {} } : {}) };
    }).filter(Boolean);
    if (fix.length) saveMany(fix);
  }, [bucketEnds, tasks, loaded]);
  const scoped = useMemo(() => {
    const q = norm(query);
    return all.filter(t => inScope(t) && (!projectFilter.length || projectFilter.some(v => v === 'none' ? !t.project : t.project === v))
      && (!bucketFilter.length || bucketFilter.some(v => v === 'none' ? !t.bucket : norm(t.bucket) === norm(v)))
      && (!q || [t.title, t.description, t.assignee, t.project, t.bucket, statusLabel(t, stages), ...(t.checklist || []).map(c => c.text), ...(t.files || []).map(f => f.name)].some(v => norm(v).includes(q))));
  }, [all, projectFilter, bucketFilter, query, scope, team.on, team.me, team.members]);
  // Counts beside each filter option: open tasks in this workspace.
  const filterCounts = useMemo(() => {
    const c = { bucket: {}, project: {}, due: {} };
    all.forEach(t => {
      if (t.status === 'done') return;
      const b = norm(t.bucket), p = norm(t.project);
      c.bucket[b] = (c.bucket[b] || 0) + 1; c.project[p] = (c.project[p] || 0) + 1;
      const k = !t.deadline ? 'none' : dayDiff(t.deadline) < 0 ? 'overdue' : dayDiff(t.deadline) < 7 ? 'week' : null;
      if (k) c.due[k] = (c.due[k] || 0) + 1;
    });
    return c;
  }, [all]);
  const filterCtx = { labels, buckets: bucketNames, projects, counts: filterCounts, bucketSel: bucketFilter, setBucketSel: setBucketFilter, projSel: projectFilter, setProjSel: setProjectFilter, due: dueFilter, setDue: setDueFilter };
  // Quick captures wait in the Inbox (inbox: true) and stay out of Open and the status tabs until accepted.
  const sorted = useMemo(() => scoped.filter(t => !t.inbox), [scoped]);
  const counts = useMemo(() => { const c = { all: scoped.length, inbox: scoped.length - sorted.length, open: sorted.filter(t => t.status !== 'done').length }; STATUSES.forEach(s => { c[s.id] = sorted.filter(t => t.status === s.id).length; }); return c; }, [scoped, sorted]);
  const inboxCount = useMemo(() => all.filter(t => t.inbox).length, [all]);
  const overview = useMemo(() => {
    const open = sorted.filter(t => t.status !== 'done');
    return {
      open: open.length,
      week: open.filter(t => t.deadline && dayDiff(t.deadline) >= 0 && dayDiff(t.deadline) < 7).length,
      overdue: open.filter(t => t.deadline && dayDiff(t.deadline) < 0).length,
    };
  }, [sorted]);

  const shown = useMemo(() => {
    // Each rule in turn, then the deadline and the newest as quiet tie-breakers.
    const tail = [{ key: 'deadline', desc: false }, { key: 'created', desc: false }].filter(t => !sorts.some(r => r.key === t.key));
    const by = sortComparer([...sorts, ...tail], stages);
    // While searching, look through every task (finished ones too, in any project).
    const q = norm(query);
    const base = q ? all.filter(t => [t.title, t.description, t.assignee, t.project, t.bucket, statusLabel(t, stages), ...(t.checklist || []).map(c => c.text), ...(t.files || []).map(f => f.name)].some(v => norm(v).includes(q)))
      : scoped.filter(t => filter === 'all' || (filter === 'inbox' ? t.inbox : !t.inbox && (filter === 'open' ? t.status !== 'done' : t.status === filter)))
        .filter(t => !dueFilter || (dueFilter === 'none' ? !t.deadline : t.deadline && t.status !== 'done' && (dueFilter === 'overdue' ? dayDiff(t.deadline) < 0 : dayDiff(t.deadline) >= 0 && dayDiff(t.deadline) < 7)));
    return base.sort((a, b) => {
      if (sorts[0].key !== 'status' && (a.status === 'done') !== (b.status === 'done')) return a.status === 'done' ? 1 : -1;
      return by(a, b);
    });
  }, [scoped, all, query, filter, sorts, stages, dueFilter]);
  // The table draws its rows a batch at a time (0.20.3): the first 150, then more as you scroll near
  // the end. A long list used to be drawn in full on every keystroke of a search, which made typing lag.
  const ROW_BATCH = 150;
  const [rowLimit, setRowLimit] = useState(ROW_BATCH);
  useEffect(() => { setRowLimit(ROW_BATCH); }, [query, filter, sorts, dueFilter, projectFilter, bucketFilter, scope, view, ws]);
  const moreRows = useRef(null);
  const hasMoreRows = shown.length > rowLimit;
  useEffect(() => {
    const el = moreRows.current;
    if (!el || !hasMoreRows || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) setRowLimit(l => l + ROW_BATCH); }, { rootMargin: '800px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMoreRows, rowLimit, view, viewMode]);

  // When a task moves into In progress, whatever was in progress before becomes Blocked by it.
  const blockOthers = (next, prev) => {
    if (!prefsRef.current.oneAtATime || next.status !== 'doing' || (prev && prev.status === 'doing')) return [];
    // In a team it only touches your own tasks (assigned to you, or unassigned ones you made).
    const tm = teamRef.current, mine = o => { if (!tm.on) return true; const m = memberFor(o.assignee, tm.members); return m ? m.id === tm.uid : !o.assignee && o.createdBy === tm.uid; };
    return Object.values(tasks).filter(o => o.id !== next.id && o.status === 'doing' && mine(o))
      .map(o => ({ ...stopT(o), status: 'blocked', blockedBy: next.id }));
  };
  const merge = list => Object.values(list.reduce((m, t) => { m[t.id] = { ...(m[t.id] || {}), ...t }; return m; }, {}));
  const notifyBlocked = (list, by) => {
    if (!list.length) return;
    toast(list.length === 1 ? `“${list[0].title}” is now blocked` : `${list.length} tasks are now blocked`, `Blocked by “${by.title}”`);
  };
  const { ruleMatches, sKey, condOk, triggered, runActions, automate } = makeEngine({
    rules: () => runRules, stages: () => stages, prefs: () => prefsRef.current, team: () => teamRef.current, tasks: () => tasksRef.current,
  });
  // "Its bucket moves to [status]": run those automations on every task in the bucket.
  const bucketTaskRules = (b, status) => {
    const list = runRules.filter(r => r.enabled && r.scope !== 'bucket' && r.trigger === 'bucket_moved' && (r.when || {}).bstatus === status);
    if (!list.length) return [];
    return Object.values(tasksRef.current).filter(t => !t.inbox && norm(t.bucket) === norm(b.name)).flatMap(t => {
      const fire = list.filter(r => ruleMatches(r, t) && condOk(r, t));
      if (!fire.length) return [];
      const res = runActions(t, fire, { noStart: !!prefsRef.current.oneAtATime });
      const sub = automate(res.task, t, { depth: 1 });
      return [sub.task, ...res.created, ...sub.created];
    });
  };
  // Returns true if it showed a message about the automation.
  const notifyAuto = auto => {
    (auto.notes || []).forEach(queueNote);
    if (auto.created.length) {
      toast(auto.created.length === 1 ? `Follow-up created in ${auto.created[0].project}` : `${auto.created.length} follow-up tasks created`, `“${auto.created[0].title}” is waiting in To do.`);
      return true;
    }
    const visible = auto.fired.filter(r => r.trigger !== 'created' && r.action !== 'notify');
    if (visible.length) { toast('Automation ran', describeRule(visible[0]) + '.'); return true; }
    return false;
  };
  // Time-based automations ("is due in", "becomes overdue", "has been in a status for", "timer runs longer than")
  // are checked when the app opens and every minute after. Each fires once per task: deadline ones again only
  // if you change the deadline, "has been in" again after the status changes, "timer runs longer" once per run.
  useEffect(() => {
    if (!loaded || standaloneId) return; // only the main window runs time-based automations
    let busy = false;
    const scan = async () => {
      if (busy) return;
      busy = true;
      let res;
      try { res = await scanTimeRules({ ruleMatches, condOk, sKey, runActions, automate }, runRules, () => tasksRef.current, prefsRef.current); }
      finally { busy = false; }
      const { quiet, updates, made, notes } = res;
      if (quiet.length) saveMany(quiet);
      if (updates.length) {
        saveMany([...updates, ...made]);
        notes.forEach(queueNote);
        if (!notes.length) toast(updates.length === 1 ? `Automation ran for “${updates[0].title}”` : `Automations ran for ${updates.length} tasks`, 'Because of their dates or timers.');
      }
    };
    scan();
    const i = setInterval(scan, 60000);
    return () => clearInterval(i);
  }, [loaded, runRules, stages]);
  // Changes made directly in the table go through the same rules as the task panel.
  const updateTask = (id, p) => {
    const t = tasksRef.current[id]; if (!t) return;
    let next = { ...t, ...p };
    if ('deadline' in p && deadlineLock(next)) next = { ...next, ...fitDeadline(next, p.deadline) };
    if ('status' in p && p.status !== t.status) {
      if (next.status !== 'blocked') next.blockedBy = null;
      if ((next.status === 'done' || next.status === 'blocked') && next.timerStartedAt) next = stopT(next);
    }
    if ('deadline' in p && p.deadline !== t.deadline) next.autoFired = {};
    if (t.inbox && 'project' in p && p.project) next.inbox = false;
    const blocked = blockOthers(next, t);
    const auto = automate(next, t, { blocked });
    saveMany(merge([...blocked, auto.task, ...auto.created, ...auto.others]));
    if (!notifyAuto(auto) && blocked.length) notifyBlocked(blocked, auto.task);
  };
  const openCell = (id, field, el) => setCellEdit(c => (c && c.id === id && c.field === field ? null : { id, field, el }));
  const toggleTimer = id => {
    const t = tasks[id]; if (!t) return;
    if (t.timerStartedAt) { const auto = automate(stopT(t), t); saveMany([auto.task, ...auto.created, ...auto.others]); notifyAuto(auto); return; }
    // With "One task at a time", automate() pauses the other timers and runs their automations too.
    const next = { ...t, status: t.status === 'todo' ? 'doing' : t.status, timerStartedAt: Date.now() };
    const blocked = blockOthers(next, t);
    const auto = automate(next, t, { blocked });
    saveMany(merge([...blocked, auto.task, ...auto.created, ...auto.others]));
    if (!notifyAuto(auto)) notifyBlocked(blocked, next);
  };
  const pauseAll = () => { const list = Object.values(tasksRef.current).filter(t => t.timerStartedAt); if (list.length) { const autos = list.map(t => automate(stopT(t), t, { depth: 1 })); saveMany(merge(autos.flatMap(x => [x.task, ...x.created]))); autos.forEach(x => (x.notes || []).forEach(queueNote)); toast(list.length === 1 ? 'Timer paused' : `${list.length} timers paused`, list.map(t => t.title || 'Untitled').join(', ')); } };
  const resetTimer = id => { const t = tasks[id]; if (t) saveMany([{ ...t, timeSpent: 0, timerStartedAt: null, sessions: [] }]); };
  const markDone = id => {
    const t = tasks[id]; if (!t) return;
    const auto = automate({ ...stopT(t), status: 'done', blockedBy: null }, t);
    saveMany([auto.task, ...auto.created, ...auto.others]);
    if (!notifyAuto(auto)) toast('Marked as done', t.title);
  };
  const addQuick = e => {
    e.preventDefault();
    const v = quick.trim();
    if (!v) { createTask(); return; }
    const auto = automate({ id: newId(), title: v, status: 'todo', assignee: me.name || '', deadline: '', description: '', priority: 'normal',
      project: onlyPick(projectFilter), createdAt: Date.now(), timeSpent: 0, timerStartedAt: null }, null);
    saveMany([auto.task, ...auto.created, ...auto.others]);
    setQuick('');
  };
  // The task panel saves each change as you make it, through the same rules as the table.
  const saveSheet = (id, patch) => { if (patch.project) { try { localStorage.setItem('tasks-last-platform', patch.project); } catch (e) {} } updateTask(id, patch); };
  // "Create task" and N make a real task straight away and open it, ready for a title. Every change
  // saves automatically, and a new task you close without typing anything is removed again.
  // It's prefilled from where you are: the status tab, the platform and bucket filters, or the
  // Board column / group you added from. With no platform filter it uses the last platform you picked.
  const createTask = (opts = {}) => {
    let lastPlat = ''; try { lastPlat = localStorage.getItem('tasks-last-platform') || ''; } catch (e) {}
    const auto = automate({
      id: newId(), title: '', status: S[filter] && filter !== 'done' ? filter : 'todo', assignee: me.name || '', deadline: '', description: '', priority: 'normal', checklist: [],
      project: onlyPick(projectFilter) || lastPlat, bucket: onlyPick(bucketFilter),
      ...(opts && opts.preset ? opts.preset : {}), createdAt: Date.now(), timeSpent: 0, timerStartedAt: null,
    }, null);
    saveMany([auto.task, ...auto.created, ...auto.others]);
    openTask(auto.task.id);
  };
  const createRef = useRef(createTask); createRef.current = createTask;
  // A new task you close without typing anything is removed again.
  const discardEmpty = id => remove(id);
  const doDelete = () => {
    const t = tasks[confirmId]; trashTasks([confirmId]); setConfirmId(null); setSheet({ open: false, id: null });
    toast('Moved to Trash', `You can restore “${(t && t.title) || 'Untitled'}” from the Trash for ${TRASH_DAYS} days.`, { undo: true });
  };
  const closeSheet = useCallback(() => setSheet(s => ({ open: false, id: s.id })), []); // keeps the id so the panel can animate closed (0.19.14)
  // Closing the window keeps Tasks running in the tray (unless turned off in Settings).
  const prefsRef = useRef(prefs); prefsRef.current = prefs;
  // Closing Tasks (the window, Quit in the tray, or an update) always stops every running timer, and
  // remembers which ones so it can offer to resume them next time.
  const [pausedNote, setPausedNote] = useState(null);
  const pauseForClose = async () => {
    const list = Object.values(tasksRef.current).filter(t => t.timerStartedAt && timerHere(t));
    if (!list.length) return;
    const now = Date.now();
    saveMany(list.map(t => stopAt(t, now)));
    await loadSession();
    const prev = ((sessionData.paused || {})[ws] || {}).ids || [];
    const note = { at: now, ids: [...new Set([...prev, ...list.map(t => t.id)])] };
    saveSession({ heartbeat: now, paused: { ...(sessionData.paused || {}), [ws]: note } });
    setPausedNote(note); // shows when the window is opened again from the tray
    await sleep(150); await flushAll();
  };
  const pauseRef = useRef(pauseForClose); pauseRef.current = pauseForClose;
  useEffect(() => {
    if (standaloneId) return;
    let un = null, un2 = null, dead = false;
    beforeQuit = () => pauseRef.current();
    getCurrentWindow().onCloseRequested(async e => {
      if (prefsRef.current.keepInTray) e.preventDefault();
      await pauseRef.current(); await flushAll(); await cloudFlush();
      if (prefsRef.current.keepInTray) getCurrentWindow().hide().catch(() => {});
    }).then(f => { if (dead) f(); else un = f; }).catch(() => {});
    // Quit in the tray asks the window to stop the timers first.
    listen('app-quit', async () => { try { await pauseRef.current(); await flushAll(); await cloudFlush(); } finally { invoke('quit_app').catch(() => {}); } })
      .then(f => { if (dead) f(); else un2 = f; }).catch(() => {});
    return () => { dead = true; try { un && un(); un2 && un2(); } catch (e) {} };
  }, []);
  // Heartbeat: the last moment Tasks was known to be open.
  useEffect(() => {
    if (standaloneId) return;
    const beat = () => loadSession().then(() => saveSession({ heartbeat: Date.now() }));
    const i = setInterval(beat, 30000);
    return () => clearInterval(i);
  }, []);
  // On launch: timers still marked running were left over from a crash or a hard shutdown.
  // Stop them at the last heartbeat and show them together with the ones paused on a normal close.
  useEffect(() => {
    if (standaloneId || !loaded || checkedWs.has(ws)) return;
    checkedWs.add(ws);
    loadSession().then(s => {
      const cur = tasksRef.current, hb = lastHeartbeat;
      const stale = Object.values(cur).filter(t => t.timerStartedAt && t.timerStartedAt < SESSION_START && timerHere(t));
      const ends = stale.map(t => (hb > t.timerStartedAt ? hb : Math.max(t.timerStartedAt, t.updatedAt || 0)));
      if (stale.length) saveMany(stale.map((t, i) => stopAt(t, ends[i])));
      const prev = (s.paused || {})[ws];
      const ids = [...new Set([...(prev ? prev.ids : []), ...stale.map(t => t.id)])].filter(id => cur[id]);
      saveSession({ heartbeat: Date.now() });
      if (!ids.length) return;
      const note = { ids, at: stale.length ? Math.max(...ends) : prev.at, crash: stale.length > 0 };
      saveSession({ paused: { ...(s.paused || {}), [ws]: note } });
      setPausedNote(note);
    });
  }, [loaded]);
  const closePausedNote = () => {
    setPausedNote(null);
    loadSession().then(s => { const paused = { ...(s.paused || {}) }; delete paused[ws]; saveSession({ paused }); });
  };
  const resumeTimers = ids => {
    if (prefsRef.current.oneAtATime) { const t = tasksRef.current[ids[0]]; if (t && !t.timerStartedAt) toggleTimer(t.id); return; }
    const now = Date.now();
    const list = ids.map(id => tasksRef.current[id]).filter(t => t && !t.timerStartedAt)
      .map(t => ({ ...t, status: t.status === 'todo' || t.status === 'done' ? 'doing' : t.status, timerStartedAt: now }));
    if (list.length) saveMany(merge(list.flatMap(t => { const x = automate(t, tasksRef.current[t.id], { depth: 1 }); return [x.task, ...x.created]; })));
  };
  // The global quick capture shortcut, and tasks typed into the quick capture window.
  useEffect(() => {
    if (standaloneId || prefs.captureKey === 'Off') return;
    const key = accel(prefs.captureKey);
    setShortcutError('');
    registerShortcut(key, ev => { if (!ev || ev.state === 'Pressed') openCaptureWindow(); })
      .catch(() => { setShortcutError(`${showShortcut(prefs.captureKey)} is already used by Windows or another app. Choose another.`); toast.error('Couldn’t set the quick capture shortcut', `${showShortcut(prefs.captureKey)} is already in use.`); });
    return () => { unregisterShortcut(key).catch(() => {}); };
  }, [prefs.captureKey]);
  const captureRef = useRef(null);
  // Quick capture (the Windows shortcut, ` in the app, or the box on Home) saves just a title into the Inbox.
  // @bucket and #platform picked in quick capture come along. A platform accepts the task, so it goes straight to Open.
  captureRef.current = (title, extra = {}) => {
    const bucket = (extra.bucket || '').trim(), project = (extra.project || '').trim();
    const auto = automate({ id: newId(), title, status: 'todo', assignee: me.name || '', deadline: '', description: '', priority: 'normal', checklist: [], project, bucket, createdAt: Date.now(), timeSpent: 0, timerStartedAt: null, inbox: !project }, null);
    saveMany([auto.task, ...auto.created, ...auto.others]);
    toast(project ? 'Saved to Open' : 'Saved to Inbox', [title, bucket && `@${bucket}`, project && `#${project}`].filter(Boolean).join('  '));
  };
  // Keep the quick capture window's @ and # lists current.
  useEffect(() => {
    if (standaloneId) return;
    try {
      localStorage.setItem(captureListsKey(ws), JSON.stringify({
        labels: { bucket: labels.bucket, platform: labels.platform },
        buckets: bucketList.map(b => { const st = BS[bucketStatus(b)] || {}; return { name: b.name, dot: st.dot, note: st.label, done: bucketStatus(b) === 'done' }; }),
        platforms: projectList.map(p => ({ name: p.name, dot: (PROJECT_COLORS[p.color || autoColor(p.name)] || PROJECT_COLORS.slate).dot })),
      }));
    } catch (e) {}
  }, [bucketList, projectList, labels.bucket, labels.platform, ws]);
  // Accepting moves a captured task into Open. Giving it a platform accepts it too.
  const acceptTask = id => {
    const t = tasksRef.current[id]; if (!t || !t.inbox) return;
    saveMany([{ ...t, inbox: false }]);
    toast('Moved to Open', t.title || 'Untitled', { undo: true });
  };
  useEffect(() => {
    if (standaloneId) return;
    let a = null, b = null, dead = false;
    listen('capture-task', e => { if (e.payload && (e.payload.ws || 'product') === ws && e.payload.title) captureRef.current(e.payload.title, e.payload); }).then(f => { if (dead) f(); else a = f; }).catch(() => {});
    listen('tray-capture', () => openCaptureWindow()).then(f => { if (dead) f(); else b = f; }).catch(() => {});
    return () => { dead = true; try { a && a(); b && b(); } catch (e) {} };
  }, []);
  // ` opens quick add inside the app.
  useEffect(() => {
    if (standaloneId) return;
    const k = e => {
      if (e.key !== '`' || e.ctrlKey || e.metaKey || e.altKey) return;
      const el = document.activeElement;
      if (el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable)) return;
      if (document.querySelector('[role=dialog],[role=alertdialog]')) return;
      e.preventDefault(); setQuickAdd(true);
    };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, []);
  // Idle detection: while a timer runs, check Windows' idle time every 30 seconds.
  const idleRef = useRef(null);
  useEffect(() => {
    if (standaloneId) return;
    const i = setInterval(async () => {
      const mins = prefsRef.current.idleMinutes;
      const runs = Object.values(tasksRef.current).filter(t => t.timerStartedAt);
      if (!mins || !runs.length) { idleRef.current = null; return; }
      let secs = 0; try { secs = await invoke('idle_seconds'); } catch (e) { return; }
      const now = Date.now();
      if (secs >= mins * 60) { if (!idleRef.current) idleRef.current = { ids: runs.map(t => t.id), start: now - secs * 1000 }; }
      else if (idleRef.current && secs < 60) {
        const x = idleRef.current; idleRef.current = null;
        const live = x.ids.map(id => tasksRef.current[id]).filter(t => t && t.timerStartedAt && t.timerStartedAt < now - secs * 1000);
        if (live.length) setIdle({ ids: live.map(t => t.id), start: Math.max(x.start, Math.min(...live.map(t => t.timerStartedAt))), end: now - secs * 1000, title: live[0].title, titles: live.map(t => t.title) });
      }
    }, 30000);
    return () => clearInterval(i);
  }, []);
  const resolveIdle = mode => {
    const x = idle; setIdle(null); if (!x || mode === 'keep') return;
    const list = (x.ids || []).map(id => tasksRef.current[id]).filter(t => t && t.timerStartedAt); if (!list.length) return;
    saveMany(list.map(t => {
      const s0 = t.timerStartedAt, cut = Math.max(s0, x.start);
      const sessions = [...(t.sessions || []), ...(cut > s0 ? [{ s: s0, e: cut }] : [])];
      return { ...t, sessions, timeSpent: (t.timeSpent || 0) + (cut - s0), timerStartedAt: mode === 'stop' ? null : Date.now() };
    }));
    toast(mode === 'stop' ? `Idle time removed and ${list.length > 1 ? 'timers' : 'timer'} stopped` : 'Idle time removed', list.map(t => t.title || 'Untitled').join(', '), { undo: true });
  };

  // Ctrl+K opens the command palette from anywhere.
  useEffect(() => {
    if (standaloneId) return;
    const k = e => { if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'k') { e.preventDefault(); setPaletteOpen(o => !o); } };
    document.addEventListener('keydown', k, true);
    return () => document.removeEventListener('keydown', k, true);
  }, []);
  const patch = (id, p) => {
    const t = tasksRef.current[id]; if (!t) return;
    const auto = automate({ ...t, ...p }, t);
    saveMany([auto.task, ...auto.created, ...auto.others]);
    notifyAuto(auto);
  };

  /* ---- documents ---- */
  // Documents: from tasks, archived tasks, and files whose task is gone ("No task").
  // The document library: every file once, with the tasks it's linked to (many to many).
  const docs = useMemo(() => {
    const map = new Map();
    const add = (f, link) => { if (!map.has(f.id)) map.set(f.id, { ...f, links: [] }); if (link) map.get(f.id).links.push(link); };
    all.forEach(t => (t.files || []).forEach(f => add(f, { task: t })));
    Object.values(archived).forEach(t => (t.files || []).forEach(f => add(f, { task: t, archived: true })));
    looseDocs.forEach(f => add(f, null));
    return [...map.values()];
  }, [all, archived, looseDocs]);
  const settingsRef = useRef(settings); settingsRef.current = settings;
  // Versions: the newest file becomes the document; the older ones are kept in its history.
  const VKEYS = ['file', 'name', 'size', 'kind', 'mime', 'addedAt'];
  const pickV = f => Object.fromEntries(VKEYS.map(k => [k, f[k]]));
  const addVersion = (target, src) => {
    const fresh = { ...pickV(src), addedAt: Date.now() };
    updateDocEverywhere(target.id, x => ({ ...x, ...fresh, versions: [...(x.versions || []), pickV(x)] }));
    if (src.id !== target.id) saveLooseDocs(l => l.filter(x => x.id !== src.id));
    toast(`Saved as version ${versionCount(target) + 1}`, target.name, { undo: true });
  };
  const uploadVersion = async target => {
    const fs = await pickFiles(); if (!fs.length) return;
    const [meta] = await uploadMany([fs[0]]); if (meta) addVersion(target, meta);
  };
  const makeCurrent = (doc, v) => {
    updateDocEverywhere(doc.id, x => ({ ...x, ...pickV(v), versions: [...(x.versions || []).filter(y => y.file !== v.file), pickV(x)].sort((a, b) => a.addedAt - b.addedAt) }));
    toast('Version restored', v.name, { undo: true });
  };
  const setDocStatus = (d, status) => {
    if (docStatus(d) === status) return;
    updateDocEverywhere(d.id, x => ({ ...x, status }));
    toast(`Marked ${DSt[status].label}`, d.name, { undo: true });
  };
  const markDocSeen = d => saveLooseDocs(l => l.map(x => x.id === d.id ? (({ inbox, ...m }) => m)(x) : x));
  const [mergeFor, setMergeFor] = useState(null);
  // order: document ids, oldest first. The last becomes the current file; the record keeps the id, status and links of `doc`.
  const mergeDocs = (doc, order) => {
    const byId = Object.fromEntries(docs.map(d => [d.id, d]));
    const list = order.map(id => byId[id]).filter(Boolean);
    if (list.length < 2) return;
    const hist = list.flatMap(d => [...(d.versions || []).map(pickV), pickV(d)]);
    const cur = hist.pop();
    const me0 = stripMeta(byId[doc.id]); delete me0.inbox;
    const merged = { ...me0, ...cur, versions: hist, status: docStatus(byId[doc.id]) };
    replaceDocsEverywhere(order, merged);
    setMergeFor(null);
    toast(`Merged into ${hist.length + 1} versions`, merged.name, { undo: true });
  };
  // Watch folders: any file that wasn't in the folder before is new, whatever its date says.
  // This computer remembers which files it has seen per folder, and why it skipped any.
  const SEEN_KEY = 'tasks-watch-seen-v2', STATUS_KEY = 'tasks-watch-status';
  const readJSON = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } };
  const [watchStatus, setWatchStatus] = useState(() => readJSON(STATUS_KEY, {}));
  const [watchOffer, setWatchOffer] = useState(null); // { path, files, why }
  const stableRef = useRef({});
  const scanBusy = useRef(false);
  const skipReason = f => {
    if (/^~\$|\.(tmp|crdownload|part|partial|download)$/i.test(f.name)) return 'still downloading';
    if (!ALLOWED.includes(extOf(f.name))) return 'unsupported type';
    if (f.size === 0) return 'empty file';
    return null;
  };
  const importToInbox = async (w, f) => {
    const meta = await importDoc({ path: f.path, name: f.name, size: f.size });
    saveLooseDocs(l => [...l, { ...meta, inbox: true, source: w.path }]);
  };
  // manual: from the refresh button; waits briefly to be sure files have finished downloading.
  const scanFolders = async (manual = false) => {
    const folders = settingsRef.current.watchFolders || [];
    if (scanBusy.current) return null;
    if (!folders.length) { if (manual) toast('No watch folders yet', 'Add one in Settings (⋯ menu).'); return null; }
    scanBusy.current = true;
    const seen = readJSON(SEEN_KEY, {}), status = readJSON(STATUS_KEY, {});
    let added = 0;
    try {
      for (const w of folders) {
        const list = async () => invoke('list_folder', { path: w.path, recursive: !!w.subfolders });
        let files;
        try { files = await list(); } catch (e) { status[w.path] = { checkedAt: Date.now(), error: String(e) }; continue; }
        if (manual) { files.forEach(f => { stableRef.current[f.path] = f.size; }); await new Promise(r => setTimeout(r, 1500)); try { files = await list(); } catch (e) { logWarn('Watch folder not listed: ' + w.path, e); } }
        const known = seen[w.path];
        // A folder added before this version: offer the files it missed instead of importing silently.
        if (!known) {
          const missed = files.filter(f => !skipReason(f) && !docs.some(d => d.name === f.name && d.size === f.size));
          seen[w.path] = Object.fromEntries(files.map(f => [f.path, f.modified]));
          if (missed.length) setWatchOffer({ path: w.path, files: missed, why: 'missed' });
          status[w.path] = { checkedAt: Date.now(), added: 0, skipped: [] };
          continue;
        }
        const skipped = [];
        for (const f of files) {
          if (known[f.path] === f.modified) continue;
          const why = skipReason(f);
          if (why) { if (why !== 'still downloading') { skipped.push({ name: f.name, why }); known[f.path] = f.modified; } continue; }
          const prev = stableRef.current[f.path]; stableRef.current[f.path] = f.size;
          if (prev !== f.size) { skipped.push({ name: f.name, why: 'still downloading' }); continue; }
          try { await importToInbox(w, f); added++; known[f.path] = f.modified; }
          catch (e) { logWarn('Could not import ' + f.name, e); skipped.push({ name: f.name, why: 'couldn’t be copied' }); }
        }
        const present = new Set(files.map(f => f.path));
        Object.keys(known).forEach(k => { if (!present.has(k)) delete known[k]; });
        const prevSt = status[w.path] || {};
        status[w.path] = { checkedAt: Date.now(), added: (prevSt.added || 0) + added, skipped: [...skipped, ...(prevSt.skipped || []).filter(x => !skipped.some(y => y.name === x.name))].slice(0, 20) };
      }
    } finally {
      try { localStorage.setItem(SEEN_KEY, JSON.stringify(seen)); localStorage.setItem(STATUS_KEY, JSON.stringify(status)); } catch (e) {}
      // Only what changed re-draws the app (0.20.3): the time of the check alone doesn't.
      const gist = st => JSON.stringify(Object.entries(st).map(([k, v]) => [k, v.error || '', v.added || 0, v.skipped || []]));
      setWatchStatus(prev => (gist(prev) === gist(status) ? prev : status));
      scanBusy.current = false;
      // A file that was still arriving is looked at again shortly, without waiting for the next check.
      if (Object.values(status).some(v => (v.skipped || []).some(x => x.why === 'still downloading'))) { clearTimeout(rescan.current); rescan.current = setTimeout(() => scanRef.current(false), 4000); }
    }
    if (added) toast(added === 1 ? 'New document in the Inbox' : `${added} new documents in the Inbox`);
    else if (manual) toast('No new files', 'Your watch folders are up to date.');
    return added;
  };
  const scanRef = useRef(scanFolders); scanRef.current = scanFolders;
  const rescan = useRef(null);
  // Windows says when a file appears in a watch folder (0.20.3), so the folders are no longer listed
  // every 8 seconds. A check once a minute stays for network drives, which don't send these messages.
  useEffect(() => {
    if (standaloneId) return;
    let un = null, dead = false, soon = null;
    const t = setTimeout(() => scanRef.current(false), 1500);
    const i = setInterval(() => scanRef.current(false), 60000);
    listen('watch-folder-changed', () => { clearTimeout(soon); soon = setTimeout(() => scanRef.current(false), 1500); })
      .then(f => { if (dead) f(); else un = f; }).catch(e => logWarn('Watch folder messages unavailable', e));
    return () => { dead = true; clearTimeout(t); clearTimeout(soon); clearTimeout(rescan.current); clearInterval(i); try { un && un(); } catch (e) {} };
  }, []);
  const watchKey = JSON.stringify((settings.watchFolders || []).map(w => [w.path, !!w.subfolders]));
  useEffect(() => {
    if (standaloneId) return;
    invoke('watch_folders', { folders: (settingsRef.current.watchFolders || []).map(w => ({ path: w.path, subfolders: !!w.subfolders })) })
      .catch(e => logWarn('Watch folders not watched', e));
  }, [watchKey]);
  // Adding a folder: note what's already there, and offer to bring those files in too.
  const addWatchFolder = async () => {
    const sel = await openDialog({ directory: true, multiple: false });
    const dir = Array.isArray(sel) ? sel[0] : sel; if (!dir) return;
    let files = []; try { files = await invoke('list_folder', { path: dir, recursive: false }); } catch (e) { toast.error('Couldn’t open that folder', String(e)); return; }
    const seen = readJSON(SEEN_KEY, {}); seen[dir] = Object.fromEntries(files.map(f => [f.path, f.modified]));
    try { localStorage.setItem(SEEN_KEY, JSON.stringify(seen)); } catch (e) {}
    saveSettings(x => ({ ...x, watchFolders: [...(x.watchFolders || []).filter(w => w.path !== dir), { path: dir, subfolders: false, added: Date.now() }] }));
    const existing = files.filter(f => !skipReason(f));
    if (existing.length) setWatchOffer({ path: dir, files: existing, why: 'existing' });
    else toast('Watching folder', dir);
  };
  const setFolderSubfolders = async (path, on) => {
    saveSettings(x => ({ ...x, watchFolders: (x.watchFolders || []).map(w => w.path === path ? { ...w, subfolders: on } : w) }));
    if (on) {
      // Files already in subfolders count as seen; only new ones arrive in the Inbox.
      let files = []; try { files = await invoke('list_folder', { path, recursive: true }); } catch (e) { logWarn('Watch folder not listed: ' + path, e); }
      const seen = readJSON(SEEN_KEY, {}); seen[path] = { ...(seen[path] || {}), ...Object.fromEntries(files.map(f => [f.path, f.modified])) };
      try { localStorage.setItem(SEEN_KEY, JSON.stringify(seen)); } catch (e) {}
    }
  };
  const acceptOffer = async () => {
    const o = watchOffer; setWatchOffer(null); if (!o) return;
    const w = { path: o.path }; let n = 0;
    for (const f of o.files) { try { await importToInbox(w, f); n++; } catch (e) { logWarn('Could not import ' + f.name, e); } }
    toast(`${n} ${n === 1 ? 'file' : 'files'} added to the Inbox`, o.path);
  };
  const [linkFor, setLinkFor] = useState(null);
  const [docDelete, setDocDelete] = useState(null);
  const stripMeta = f => { const { links, task, archived: _a, ...meta } = f; return meta; };
  // Removing a document from a task only unlinks it; if nothing else uses it, it stays in Documents as "Not linked".
  const unlinkDoc = (file, taskId) => {
    const t = tasksRef.current[taskId]; if (!t) return;
    saveMany([{ ...t, files: (t.files || []).filter(x => x.id !== file.id) }]);
    const elsewhere = [...Object.values(tasksRef.current).filter(o => o.id !== taskId), ...Object.values(archived), ...Object.values(trash)].some(o => (o.files || []).some(x => x.id === file.id));
    if (!elsewhere) saveLooseDocs(l => l.some(x => x.id === file.id) ? l : [...l, stripMeta(file)]);
    toast('Document unlinked', `“${file.name}” stays in Documents.`, { undo: true });
  };
  const [attachDoc, setAttachDoc] = useState(null);
  // Search extras: archived tasks, and tasks in your other workspaces.
  const [incArchived, setIncArchived] = useState(false);
  const [allWs, setAllWs] = useState(false);
  const [otherWs, setOtherWs] = useState({});
  useEffect(() => {
    if (!allWs) return;
    workspaces.filter(w => w.id !== ws && !otherWs[w.id]).forEach(w => {
      invoke('read_store', { name: storeFor('data', w.id) })
        .then(raw => setOtherWs(o => ({ ...o, [w.id]: raw ? Object.values(JSON.parse(raw).tasks || {}) : [] })))
        .catch(() => setOtherWs(o => ({ ...o, [w.id]: [] })));
    });
  }, [allWs]);
  const matchQ = t => { const q = norm(query); return q && [t.title, t.description, t.assignee, t.project, t.bucket, ...(t.checklist || []).map(c => c.text), ...(t.files || []).map(f => f.name)].some(v => norm(v).includes(q)); };
  const extraResults = query ? [
    ...(incArchived ? [{ key: 'archive', title: 'In the archive', items: Object.values(archived).filter(matchQ), onPick: () => setView('archive') }] : []),
    ...(allWs ? workspaces.filter(w => w.id !== ws).map(w => ({ key: w.id, title: `In ${w.name}`, items: (otherWs[w.id] || []).filter(matchQ), onPick: t => onSwitchWorkspace(w.id, t.id) })) : []),
  ] : [];
  // Opening a task found in another workspace: switch, then open it.
  useEffect(() => { if (loaded && openOnLoad && tasksRef.current[openOnLoad]) openTask(openOnLoad); }, [loaded]);
  // A file can be shared by a task and its automatic follow-up, so it's only deleted when no task uses it.
  const deleteIfUnused = (id, excludeIds) => { // id: the document record
    const used = [...Object.values(tasksRef.current), ...Object.values(archived), ...Object.values(trash)].some(o => !excludeIds.includes(o.id) && (o.files || []).some(x => x.id === id.id))
      || looseDocs.some(x => x.id === id.id && excludeIds.length);
    if (!used) deleteDoc(id);
  };
  const uploadMany = async files => {
    const bad = files.filter(f => !ALLOWED.includes(extOf(f.name)));
    const big = files.filter(f => ALLOWED.includes(extOf(f.name)) && f.size > MAX_FILE);
    const ok = files.filter(f => ALLOWED.includes(extOf(f.name)) && f.size <= MAX_FILE);
    if (bad.length) toast.error(bad.length === 1 ? `“${bad[0].name}” isn’t a supported file type` : `${bad.length} files aren’t a supported type`, 'Use PDF, Word (.docx), HTML, Excel, PowerPoint, images, text or zip. Save old .doc files as .docx first.');
    if (big.length) toast.error(big.length === 1 ? `“${big[0].name}” is too large` : `${big.length} files are too large`, 'Each file can be up to 200 MB.');
    if (!ok.length) return [];
    setBusy(true);
    const metas = [];
    for (const f of ok) {
      try { metas.push(await importDoc(f)); }
      catch (e) { toast.error(`Couldn’t add “${f.name}”`, String(e)); }
    }
    setBusy(false);
    return metas;
  };
  const attach = (taskId, metas) => {
    const t = tasksRef.current[taskId]; if (!t) return;
    const auto = automate({ ...t, files: [...(t.files || []), ...metas] }, t);
    saveMany([auto.task, ...auto.created, ...auto.others]);
    notifyAuto(auto);
    toast(metas.length === 1 ? 'Document linked' : `${metas.length} documents linked`, t.title);
  };
  const submitDocs = async (files, { target, project, versions = {} }) => {
    const verIdx = Object.keys(versions).filter(i => versions[i]);
    for (const i of verIdx) { const [m] = await uploadMany([files[i]]); const t = docs.find(d => d.id === versions[i]); if (m && t) addVersion(t, m); }
    const rest = files.filter((_, i) => !versions[i]);
    if (!rest.length) { setAddDocs({ open: false, files: [] }); return; }
    const metas = await uploadMany(rest);
    if (!metas.length) return;
    if (target === '__new') {
      const now = Date.now();
      saveMany(metas.flatMap((m, i) => {
        const auto = automate({
          id: newId(), title: m.name.replace(/\.[^.]+$/, ''), status: 'todo', assignee: me.name || '', deadline: '', description: '',
          project, priority: 'normal', checklist: [], files: [m], createdAt: now + i, timeSpent: 0, timerStartedAt: null,
        }, null);
        return [auto.task, ...auto.created, ...auto.others];
      }));
      toast(metas.length === 1 ? 'Document added as a new task' : `${metas.length} documents added as new tasks`, 'Open a task to add details.');
    } else if (target === '__none') {
      saveLooseDocs(l => [...l, ...metas]);
      toast(metas.length === 1 ? 'Document added' : `${metas.length} documents added`, 'Link them to tasks from Documents.');
    } else attach(target, metas);
    setAddDocs({ open: false, files: [] });
  };
  const doRemoveFile = () => {
    const { file, taskId } = fileConfirm; setFileConfirm(null);
    if (!taskId) { saveLooseDocs(l => l.filter(x => x.id !== file.id)); deleteIfUnused(file, []); toast('Document deleted', file.name); return; }
    const t = tasksRef.current[taskId]; if (!t) return;
    saveMany([{ ...t, files: (t.files || []).filter(x => x.id !== file.id) }]);
    deleteIfUnused(file, [taskId]);
    toast('Document removed', file.name);
  };
  // Files dragged onto the window (from WhatsApp, File Explorer…) arrive as file paths.
  const dropState = useRef({}); dropState.current = { sheetOpen: sheet.open, addOpen: addDocs.open };
  useEffect(() => {
    let un = null, dead = false;
    getCurrentWebview().onDragDropEvent(async ev => {
      const p = ev.payload;
      if (p.type === 'enter' || p.type === 'over') setDragOver(true);
      else if (p.type === 'leave') setDragOver(false);
      else if (p.type === 'drop') {
        setDragOver(false);
        if (!p.paths || !p.paths.length) return;
        let infos = [];
        try { infos = await fileInfos(p.paths); } catch (e) { logWarn('Dropped files not read', e); }
        if (!infos.length) return;
        const s = dropState.current;
        if (s.addOpen) setAddDocs(a => ({ ...a, files: [...a.files, ...infos] }));
        else if (s.sheetOpen && sheetDrop.current) sheetDrop.current(infos);
        else setAddDocs({ open: true, files: infos });
      }
    }).then(f => { if (dead) f(); else un = f; });
    return () => { dead = true; try { un && un(); } catch (e) {} };
  }, []);

  /* ---- account & data ---- */
  const backup = async () => {
    const dest = await saveDialog({ defaultPath: `Tasks backup ${toISO(new Date())}.zip`, filters: [{ name: 'Backup', extensions: ['zip'] }] });
    if (!dest) return;
    try { await flushAll(); await invoke('backup', { dest }); toast('Backup saved', dest); }
    catch (e) { toast.error('Backup failed', String(e)); }
  };
  const chooseRestore = async () => {
    const src = await openDialog({ multiple: false, filters: [{ name: 'Backup', extensions: ['zip'] }] });
    if (src) setRestoreSrc(Array.isArray(src) ? src[0] : src);
  };
  const doRestore = () => { const src = restoreSrc; setRestoreSrc(null); runRestore(src); };
  // Nothing is saved or synced while the files are swapped, and afterwards this PC asks again how to
  // line up with the team's cloud, so an old backup never overwrites newer team changes (0.20.3).
  const runRestore = async src => {
    savesFrozen = true;
    emit('tasks-restoring', {}).catch(() => {});
    try {
      await flushAll(); await cloudPause();
      await invoke('restore', { src });
      await cloudForgetSyncState();
      window.location.reload();
    } catch (e) { savesFrozen = false; cloudResume(); toast.error('Restore failed', String(e)); }
  };

  const duplicate = id => {
    const t = tasks[id]; if (!t) return;
    const c = {
      id: newId(), title: `${t.title} (copy)`, description: t.description || '', assignee: t.assignee || '', deadline: t.deadline || '',
      project: t.project || '', bucket: t.bucket || '', files: t.files || [], priority: t.priority || 'normal', checklist: (t.checklist || []).map(i => ({ ...i, id: newId(), done: false })),
      status: 'todo', createdAt: Date.now(), timeSpent: 0, timerStartedAt: null,
    };
    const auto = automate(c, null);
    saveMany([auto.task, ...auto.created, ...auto.others]); openTask(c.id); toast('Task duplicated', 'Edit the copy, then save.');
  };
  useEffect(() => {
    const k = e => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement;
      if (el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable)) return;
      if (document.querySelector('[role=dialog],[role=alertdialog]') || standaloneId) return;
      if (e.key === 'n' || e.key === 'N') { e.preventDefault(); if (primaryRef.current) primaryRef.current.run(); }
      else if (e.key === '/' && document.getElementById('home-cmd-in')) { e.preventDefault(); document.getElementById('home-cmd-in').focus(); }
      else if (e.key === '/') { e.preventDefault(); setSearchOpen(true); setTimeout(() => searchRef.current && searchRef.current.focus(), 0); }
      else if (e.key === '?') { e.preventDefault(); setSettingsOpen('shortcuts'); }
    };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, []);
  const sheetTask = sheet.id ? all.find(t => t.id === sheet.id) : null;
  const [searchOpen, setSearchOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [docFocus, setDocFocus] = useState(null);
  const paletteItems = !paletteOpen ? [] : [
    { id: 'a-task', group: 'Actions', label: 'Create task', hint: 'N', icon: <I.plus />, run: () => { setView('tasks'); createTask(); } },
    { id: 'a-bucket', group: 'Actions', label: `Create ${labels.bucket.toLowerCase()}`, icon: <I.layers />, run: () => { setView('projects'); setBucketEdit({ bucket: null }); } },
    { id: 'a-docs', group: 'Actions', label: 'Add documents', icon: <I.upload />, run: () => setAddDocs({ open: true, files: [] }) },
    ...runs.map(t => ({ id: 'a-pause-' + t.id, group: 'Actions', label: `Pause timer: ${t.title || 'Untitled'}`, icon: <I.pause />, run: () => toggleTimer(t.id) })),
    ...(runs.length > 1 ? [{ id: 'a-pause-all', group: 'Actions', label: `Pause all ${runs.length} timers`, icon: <I.pause />, run: pauseAll }] : []),
    { id: 'v-home', group: 'Actions', label: 'Go to Home', icon: <I.home />, run: () => { setView('home'); } },
    { id: 'v-tasks', group: 'Actions', label: 'Go to Tasks', icon: <I.listCheck />, run: () => { setView('tasks'); } },
    { id: 'v-buckets', group: 'Actions', label: `Go to ${plural(labels.bucket)}`, icon: <I.layers />, run: () => { setView('projects'); } },
    { id: 'v-docs', group: 'Actions', label: 'Go to Documents', icon: <I.file />, run: () => { setView('docs'); } },
    { id: 'v-time', group: 'Actions', label: 'Go to Timesheet', icon: <I.timer />, run: () => { setView('time'); } },
    { id: 'a-whatsnew', group: 'Actions', label: 'What’s new', keywords: 'release notes changes update version', icon: <I.zap />, run: openWhatsNew },
    { id: 'v-report', group: 'Actions', label: 'Go to Weekly report', keywords: 'status update product owner', icon: <I.clipboard />, run: () => { setView('report'); } },
    { id: 'a-addtime', group: 'Actions', label: 'Add time', icon: <I.timer />, run: () => setAddTime({}) },
    { id: 'v-table', group: 'Actions', label: 'Table view', icon: <I.table />, run: () => { setView('tasks'); setViewMode('table'); } },
    { id: 'v-list', group: 'Actions', label: 'List view', icon: <I.rows />, run: () => { setView('tasks'); setViewMode('list'); } },
    { id: 'v-board', group: 'Actions', label: 'Board view', icon: <I.kanban />, run: () => { setView('tasks'); setViewMode('board'); } },
    ...workspaces.filter(w => w.id !== ws).map(w => ({ id: 'ws-' + w.id, group: 'Actions', label: `Switch to ${w.name}`, keywords: 'workspace', icon: <I.layers />, run: () => onSwitchWorkspace(w.id) })),
    { id: 'a-archive', group: 'Actions', label: 'Open Archive', icon: <I.clipboard />, run: () => setView('archive') },
    { id: 'a-trash', group: 'Actions', label: 'Open Trash', icon: <I.trash />, run: () => setView('trash') },
    { id: 'a-auto', group: 'Actions', label: 'Automations', icon: <I.zap />, run: () => setRulesOpen(true) },
    { id: 'a-status', group: 'Actions', label: 'Edit statuses', icon: <I.sliders />, run: () => setStatusesOpen(true) },
    { id: 'a-plat', group: 'Actions', label: `Manage ${plural(labels.platform).toLowerCase()}`, icon: <I.folder />, run: () => setPlatformsOpen(true) },
    { id: 'a-theme', group: 'Actions', label: 'Switch light and dark mode', hint: 'Shift+D', icon: <I.moon />, run: () => toggleTheme() },
    { id: 'a-undo', group: 'Actions', label: 'Undo', hint: 'Ctrl+Z', icon: <I.reset />, run: doUndo },
    { id: 'a-redo', group: 'Actions', label: 'Redo', hint: 'Ctrl+Shift+Z', icon: <I.reset />, run: doRedo },
    { id: 'a-backup', group: 'Actions', label: 'Back up data…', icon: <I.download />, run: backup },
    { id: 'a-keys', group: 'Actions', label: 'Keyboard shortcuts', hint: '?', icon: <I.keyboard />, run: () => setSettingsOpen('shortcuts') },
    { id: 'a-settings', group: 'Actions', label: 'Settings', icon: <I.sliders />, run: () => setSettingsOpen(true) },
    { id: 'a-quick', group: 'Actions', label: 'Quick add a task', hint: '`', icon: <I.plus />, run: () => setQuickAdd(true) },
    ...all.map(t => ({ id: 't-' + t.id, group: 'Tasks', label: t.title || 'Untitled', hint: [statusLabel(t, stages), t.bucket, t.project].filter(Boolean).join(', '), keywords: t.assignee, icon: <span className={cn('ml-1 mr-1 size-2 rounded-full', STATUS_COLORS[statusDef(t, stages).color])} />, run: () => openTask(t.id) })),
    ...bucketList.map(b => ({ id: 'b-' + b.name, group: 'Buckets', groupLabel: plural(labels.bucket), label: b.name, icon: <I.layers />, run: () => openBucket(b.name) })),
    ...docs.map(d => ({ id: 'd-' + d.id, group: 'Documents', label: d.name, hint: d.links.length ? d.links.map(l => l.task.title).filter(Boolean).slice(0, 2).join(', ') : 'Not linked', icon: <I.file />, run: () => { setView('docs'); setDocFocus(d.id); } })),
  ];
  const pageName = { home: 'Home', tasks: filter === 'inbox' && !query ? 'Inbox' : 'Tasks', projects: plural(labels.bucket), docs: 'Documents', time: 'Timesheet', report: 'Weekly report', archive: 'Archive', trash: 'Trash' }[view] || '';
  const primary = view === 'tasks' || view === 'home' ? { label: 'Create task', run: () => createTask() }
    : view === 'projects' ? { label: `Create ${labels.bucket.toLowerCase()}`, run: () => setBucketEdit({ bucket: null }) }
    : view === 'docs' ? { label: 'Add documents', run: () => setAddDocs({ open: true, files: [] }) }
    : view === 'time' ? { label: 'Add time', run: () => setAddTime({}) } : null;
  const primaryRef = useRef(primary); primaryRef.current = primary;
  const popOut = () => { const t = sheetTask; setSheet({ open: false, id: null }); if (t) openTaskWindow(t.id, t.title || 'Untitled', ws); };
  const onSheetMode = m => chooseMode(m);
  // In a task's own window: keep the title bar in step, and close the window when the task is closed or deleted.
  useEffect(() => {
    if (!standaloneId) return;
    if (loaded && (!sheet.open || !sheetTask)) { flushAll().then(() => getCurrentWindow().close()).catch(() => {}); return; }
    if (sheetTask) getCurrentWindow().setTitle(sheetTask.title || 'Untitled').catch(() => {});
  }, [standaloneId, loaded, sheet.open, sheetTask && sheetTask.title, !!sheetTask]);
  if (damaged) return <DamagedStore damaged={damaged} onRestore={async () => { const src = await openDialog({ multiple: false, filters: [{ name: 'Backup', extensions: ['zip'] }] }); if (src) runRestore(Array.isArray(src) ? src[0] : src); }} />;
  if (!loaded) return <div className="p-8 text-sm text-muted-foreground">Loading your tasks…</div>;

  if (standaloneId) return (
    <>
      <TaskSheet bucketMap={bucketMap} bucketEnds={bucketEnds} oneAtATime={!!prefs.oneAtATime} onPick={id => setSheet({ open: true, id })} onAccept={acceptTask} mode={standaloneId ? 'window' : openMode} onMode={onSheetMode} onPopOut={popOut} open={sheet.open} task={sheetTask} people={people} members={team.on ? team.members : null} teams={team.on ? teamsList : null} stages={stages} labels={labels} buckets={bucketNames} defaultAssignee={me.name} dropRef={sheetDrop} projects={projects} rules={rules} defaultProject={onlyPick(projectFilter)} allTasks={all} onOpen={id => openTask(id)} onPatch={patch} onClose={closeSheet}
        onSave={saveSheet} onDiscardEmpty={discardEmpty} onDelete={() => askDelete(sheet.id)} onToggle={toggleTimer} onReset={resetTimer}
        storageOk={storageOk} busy={busy} onUpload={uploadMany} onAttach={attach} onPreview={setPreview} onDownload={downloadFile}
        onRemoveFile={(file, taskId) => unlinkDoc(file, taskId)} onLinkExisting={id => setLinkFor(id)} onDiscard={fs => fs.forEach(f => deleteIfUnused(f, []))} />
      <PreviewDialog file={preview} onClose={() => setPreview(null)} onDownload={downloadFile} />
      <AlertDialog open={!!confirmId} title="Move this task to the Trash?"
        description={`“${(tasks[confirmId] || {}).title || 'Untitled'}” goes to the Trash, where you can restore it for ${TRASH_DAYS} days. After that it’s deleted for good. Its documents are kept.`}
        confirmLabel="Move to Trash" onConfirm={doDelete} onCancel={() => setConfirmId(null)} />
      <AlertDialog open={!!fileConfirm} title="Remove this document?"
        description={fileConfirm ? (fileConfirm.taskId ? `“${fileConfirm.file.name}” will be removed from this task.` : `“${fileConfirm.file.name}” will be deleted from this computer’s copy of your documents.`) : ''}
        confirmLabel={fileConfirm && !fileConfirm.taskId ? 'Delete document' : 'Remove document'} onConfirm={doRemoveFile} onCancel={() => setFileConfirm(null)} />
      {cellEdit && null}
    </>
  );

  return (
    <div className="flex h-screen flex-col">
      <>
      {/* Sidebar: slim icon rail; hover (or keyboard focus) opens it over the page with labels, the pin keeps it open */}
      <div className="flex min-h-0 flex-1">
      <div className={cn('relative shrink-0 transition-[width] duration-200 ease-out', railPinned ? 'w-[236px]' : 'w-[60px]')}>
      <nav aria-label="Pages" onMouseEnter={railEnter} onMouseLeave={railLeave}
        onFocus={e => { if (e.target.matches && e.target.matches(':focus-visible')) setRailHover(true); }}
        onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setRailHover(false); }}
        className={cn('no-scrollbar absolute inset-y-0 left-0 z-40 flex flex-col gap-1 overflow-y-auto overflow-x-hidden bg-card px-[10px] py-2.5 transition-[width,box-shadow] duration-200 ease-out',
          railOpen ? 'w-[236px]' : 'w-[60px]', railOpen && !railPinned && 'shadow-[0_16px_40px_rgba(0,0,0,.16)] dark:shadow-[0_16px_40px_rgba(0,0,0,.6)]')}>
        <div className="mb-2 flex h-[34px] shrink-0 items-center gap-2.5 pl-[3px]">
          <DropdownMenu align="start"
            trigger={p => (
              <button {...p} type="button" aria-label={`Switch workspace (${wsName})`} title={wsName} className="flex size-[34px] shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
                <I.check className="size-[15px]" />
              </button>
            )}
          items={[
              ...workspaces.map(w => ({ label: w.name, icon: <I.layers />, shortcut: w.id === ws ? '✓' : undefined, onSelect: () => { if (w.id !== ws) onSwitchWorkspace(w.id); } })),
              'sep',
              { label: 'Rename workspace…', icon: <I.pencil />, onSelect: () => setWsRename(true) },
            ]} />
          <span aria-hidden={!railOpen} className={cn('min-w-0 flex-1 truncate whitespace-nowrap text-sm font-semibold transition-opacity duration-150', railOpen ? 'opacity-100' : 'opacity-0')}>{wsName}</span>
          <button type="button" onClick={toggleRailPin} aria-pressed={railPinned} tabIndex={railOpen ? 0 : -1} aria-label={railPinned ? 'Let the sidebar close' : 'Keep the sidebar open'} title={railPinned ? 'Let the sidebar close' : 'Keep the sidebar open'}
            className={cn('flex size-[30px] shrink-0 items-center justify-center rounded-md transition-opacity hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', railPinned ? 'bg-muted text-foreground' : 'text-muted-foreground', railOpen ? 'opacity-100' : 'pointer-events-none opacity-0')}>
            <I.panelLeft className="size-4" />
          </button>
        </div>
        {[
          { id: 'home', label: 'Home', icon: I.home, on: view === 'home', go: () => setView('home') },
          { id: 'inbox', label: 'Inbox', icon: I.inbox, badge: inboxCount, badgeTitle: `${inboxCount} quick ${inboxCount === 1 ? 'capture' : 'captures'} to sort`, on: view === 'tasks' && filter === 'inbox' && !query, go: () => { setView('tasks'); setFilter('inbox'); setQuery(''); } },
          { id: 'tasks', label: 'Tasks', icon: I.listCheck, on: view === 'tasks' && (filter !== 'inbox' || !!query), go: () => { setView('tasks'); if (filter === 'inbox') setFilter('open'); } },
          { id: 'projects', label: plural(labels.bucket), icon: I.layers, on: view === 'projects', go: () => setView('projects') },
          { id: 'docs', label: 'Documents', icon: I.file, badge: docs.filter(d => d.inbox).length, badgeTitle: 'new documents', on: view === 'docs', go: () => setView('docs') },
          { id: 'time', label: 'Timesheet', icon: I.timer, on: view === 'time', go: () => setView('time') },
          { id: 'report', label: 'Weekly report', icon: I.clipboard, on: view === 'report', go: () => setView('report') },
        ].map(v => (
          <button key={v.id} type="button" onClick={v.go} aria-current={v.on ? 'page' : undefined} aria-label={v.badge ? `${v.label}, ${v.badge} ${v.badgeTitle}` : v.label} title={railOpen ? undefined : v.label}
            className={cn('flex h-10 w-full shrink-0 items-center gap-3 rounded-[9px] pl-[10.5px] pr-2.5 text-left text-[13.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              v.on ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>
            <span className="relative shrink-0">
              <v.icon className="size-[19px]" />
              {v.badge > 0 && !railOpen && <span className="tnum absolute -right-2.5 -top-2 h-[15px] min-w-[15px] rounded-full bg-blue-600 px-1 text-center text-[9.5px] font-semibold leading-[15px] text-white ring-2 ring-card">{v.badge}</span>}
            </span>
            <span className={cn('min-w-0 flex-1 truncate whitespace-nowrap transition-opacity duration-150', railOpen ? 'opacity-100' : 'opacity-0')}>{v.label}</span>
            {v.badge > 0 && railOpen && <span className="tnum shrink-0 rounded-full bg-blue-600 px-1.5 text-center text-[11px] font-medium leading-[18px] text-white">{v.id === 'docs' ? `${v.badge} new` : v.badge}</span>}
          </button>
        ))}
        <div className="flex-1" />
        <AccountMenu me={me} wsName={wsName} workspaces={workspaces} ws={ws} railOpen={railOpen} onStatus={patch => prof.updateUser(patch)}
          onProfile={() => setSettingsOpen('profile')} onSettings={() => setSettingsOpen(true)} onSwitchWorkspace={id => onSwitchWorkspace(id)} onSignOut={() => prof.update({ user: null })} />
      </nav>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
      <header className="shrink-0">
        {/* Slim top row (0.19.14): where you are, cloud sync and the window buttons. Drag it to move the window,
            double-click to maximize. Page actions stay in the page header below, away from Close. */}
        <div data-tauri-drag-region className="flex h-10 items-center pl-4 md:pl-6">
          <div data-tauri-drag-region className="flex min-w-0 flex-1 items-center gap-1.5 text-xs">
            <span className="pointer-events-none truncate text-muted-foreground">{wsName}</span>
            <span className="pointer-events-none text-muted-foreground/50">/</span>
            <span className="pointer-events-none shrink-0 truncate text-foreground/80">{pageName}</span>
          </div>
          <div className="mr-2 flex min-w-0 shrink items-center"><CloudNote onOpen={() => setCloudOpen(true)} /></div>
          <WindowControls />
        </div>
        <div data-tauri-drag-region className="flex min-h-[60px] items-center gap-4 px-4 pb-4 pt-1 md:px-6">
          <div data-tauri-drag-region className="min-w-[8rem] flex-1">
            <div ref={setHeadSlot} className="min-w-0" />
            {view === 'tasks' && (
              <PageTitle title={team.on && !(filter === 'inbox' && !query) ? <ScopeMenu scope={scope} onScope={setScope} teams={teamsList} myTeams={teamNames((team.me && team.me.teams) || [], teamsList)} /> : pageName}>
                <span className="text-sm text-muted-foreground">{query ? `Searching for “${query}”` : `${overview.open} open${viewMode === 'list' ? `, grouped by ${(labels[groupBy === 'project' ? 'platform' : groupBy] || '').toLowerCase()}` : ''}`}</span>
          {!query && overview.overdue > 0 && <button type="button" aria-pressed={dueFilter === 'overdue'} onClick={() => setDueFilter(d => d === 'overdue' ? '' : 'overdue')} title="Show only overdue tasks"
            className={cn('rounded-sm text-sm text-red-600 underline-offset-4 hover:underline dark:text-red-400', dueFilter === 'overdue' && 'font-medium underline')}>{overview.overdue} overdue</button>}
          {!query && overview.week > 0 && <button type="button" aria-pressed={dueFilter === 'week'} onClick={() => setDueFilter(d => d === 'week' ? '' : 'week')} title="Show only tasks due in the next 7 days"
            className={cn('rounded-sm text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline', dueFilter === 'week' && 'font-medium text-foreground underline')}>{overview.week} due this week</button>}
              </PageTitle>
            )}
            {(view === 'home' || view === 'archive' || view === 'trash') && <PageTitle title={pageName} />}
          </div>
          <div className="flex min-w-0 items-center gap-2">
          {/* Running timers live in the top bar (0.19.13). The old sidebar circle was too small for long times like 134h05. */}
          {running && (() => {
            const longest = runs.reduce((x, t) => elapsed(t) > elapsed(x) ? t : x, running);
            const one = runs.length === 1, name = running.title || 'Untitled';
            return (
              <DropdownMenu align="end" quiet className="w-72"
                trigger={p => (
                  <button {...p} type="button" onContextMenu={one ? e => { e.preventDefault(); openTask(running.id); } : undefined}
                    aria-label={one ? `Timer running: ${name}, ${fmt(elapsed(running))}` : `${runs.length} timers running, longest ${fmt(elapsed(longest))}`}
                    className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 pl-3 pr-2 text-emerald-700 transition-colors hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:border-emerald-800 dark:bg-[#052e22] dark:text-emerald-300 dark:hover:bg-emerald-950">
                    <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-emerald-500 ring-[3px] ring-emerald-200 dark:ring-emerald-800" />
                    <span className="hidden min-w-0 max-w-[12rem] truncate text-[13px] font-medium lg:inline">{one ? name : `${runs.length} timers`}</span>
                    <span aria-hidden="true" className="hidden h-4 w-px shrink-0 bg-emerald-300 dark:bg-emerald-800 lg:block" />
                    <span className="tnum shrink-0 font-mono text-[13px]">{<Elapsed task={one ? running : longest} />}</span>
                    <I.down className="size-3.5 shrink-0 opacity-70" />
                  </button>
                )}
                items={[
                  ...runs.map(t => ({ icon: <I.pause className="size-3.5 text-emerald-600 dark:text-emerald-400" />, label: <span className="flex min-w-0 flex-1 items-center gap-3"><span className="min-w-0 truncate">{t.title || 'Untitled'}</span><span className="tnum ml-auto shrink-0 font-mono text-xs text-muted-foreground">{<Elapsed task={t} />}</span></span>, onSelect: () => toggleTimer(t.id) })),
                  'sep',
                  one ? { icon: <I.arrowRight className="size-3.5" />, label: 'Open task', onSelect: () => openTask(running.id) }
                      : { icon: <I.pause className="size-3.5" />, label: `Pause all ${runs.length}`, onSelect: pauseAll },
                ]} />
            );
          })()}
          {searchOpen || query ? (
            <div className="relative w-56">
              <I.search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input ref={searchRef} autoFocus value={query} onChange={e => { setQuery(e.target.value); if (view !== 'tasks') setView('tasks'); }} placeholder="Search all tasks" aria-label="Search all tasks"
                className="h-9 rounded-lg bg-card pl-9 pr-9 text-sm shadow-none"
                onBlur={() => { if (!query) setSearchOpen(false); }}
                onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); setQuery(''); setSearchOpen(false); e.currentTarget.blur(); } }} />
              {query && <button type="button" onClick={() => { setQuery(''); setSearchOpen(false); }} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-sm opacity-60 hover:opacity-100"><I.x /></button>}
            </div>
          ) : (
            <button type="button" onClick={() => setSearchOpen(true)} aria-label="Search all tasks (/)"
              className="hidden h-9 w-56 min-w-[8.5rem] items-center gap-2 whitespace-nowrap rounded-lg border px-3 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:inline-flex ui-control">
              <I.search className="size-4 shrink-0" /><span className="min-w-0 flex-1 truncate text-left">Search tasks</span><kbd className="font-mono text-[11px]">/</kbd>
            </button>
          )}
          <ThemeToggle />
          <DropdownMenu
            trigger={p => <Button {...p} variant="outline" size="icon" className="rounded-lg bg-card shadow-none" aria-label="More tools"><I.more /></Button>}
            quiet className="w-60"
            items={[
              { label: 'Automations', icon: <I.zap />, shortcut: rules.some(r => r.enabled) ? <span className="inline-flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-green-500" />{rules.filter(r => r.enabled).length} on</span> : 'Off', onSelect: () => setRulesOpen(true) },
              { label: 'Statuses', icon: <I.circleDot />, onSelect: () => setStatusesOpen(true) },
              { label: plural(labels.platform), icon: <I.folder />, onSelect: () => setPlatformsOpen(true) },
              'sep',
              { label: 'Time summary', icon: <I.chart />, toggle: showSummary, onSelect: () => setShowSummary(v => !v) },
              { label: 'Archive', icon: <I.archive />, shortcut: Object.keys(archived).length || '', onSelect: () => setView('archive') },
              { label: 'Trash', icon: <I.trash />, shortcut: Object.keys(trash).length || '', onSelect: () => setView('trash') },
              'sep',
              { label: 'Settings', icon: <I.gear />, onSelect: () => setSettingsOpen(true) },
              { label: 'Keyboard shortcuts', icon: <I.keyboard />, shortcut: '?', onSelect: () => setSettingsOpen('shortcuts') },
              { label: 'What’s new', icon: <I.sparkles />, onSelect: openWhatsNew },
              ...(team.on ? [{ label: 'Team tour', icon: <I.info />, onSelect: onReplayTour }] : []),
            ]} />
          {primary && <Button className="shrink-0 shadow-none" onClick={primary.run}><I.plus />{primary.label}</Button>}
          </div>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="w-full px-4 pb-10 md:px-6">

      {view === 'projects' ? (
        <BucketsView list={bucketList} tasks={all} scopeTasks={scopeTasks} onSetReason={setAddedReason} onMoveEnd={moveBucketEnd} noun={labels.bucket} onNew={() => setBucketEdit({ bucket: null })} onEdit={b => setBucketEdit({ bucket: b })}
          onDelete={b => setBucketDelete(b)} onOpen={n => openBucket(n === 'none' ? 'none' : n)} onStatus={setBucketStatus} onPlan={planBucket}
          onOpenTask={id => openTask(id)} onAddTask={n => createTask({ preset: { bucket: n === 'none' ? '' : n } })} focus={bucketFocus} onEditStatuses={() => setBucketStatusesOpen(true)} />
      ) : view === 'home' ? (
        <HomeView tasks={all} archived={Object.values(archived)} buckets={bucketList} docs={docs} onOpenTask={id => openTask(id)} onToggle={toggleTimer}
          onCapture={title => captureRef.current(title)} onGo={(v, f) => { setView(v); if (f) { setFilter(f); setQuery(''); } }}
          onOpenBucket={n => { setBucketFocus(n); setView('projects'); }} onOpenDoc={id => { setView('docs'); setDocFocus(id); }} />
      ) : view === 'report' ? (
        <WeeklyReportView ws={ws} wsName={wsName} tasks={[...all, ...Object.values(archived)]} buckets={bucketList} stages={stages} labels={labels}
          onOpenTask={id => openTask(id)} onOpenBucket={n => { setBucketFocus(n); setView('projects'); }} />
      ) : view === 'time' ? (
        <TimesheetView tasks={[...all, ...Object.values(archived)]} stages={stages} labels={labels} onOpenTask={id => openTask(id)} onAddTime={init => setAddTime(init)}
          onDeleteSession={(t, x) => {
            const cur = tasksRef.current[t.id];
            if (!cur) { toast('This task is archived', 'Restore it to change its time.'); return; }
            saveMany([{ ...cur, sessions: (cur.sessions || []).filter(y => !(y.s === x.s && y.e === x.e)), timeSpent: Math.max(0, (cur.timeSpent || 0) - (x.e - x.s)) }]);
            toast('Time entry removed', `${fmtShort(x.e - x.s)} from “${cur.title || 'Untitled'}”`, { undo: true });
          }}
          onExportCsv={async d => {
            const esc = v => /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
            const hrs = ms => (ms / 3600e3).toFixed(2);
            const lines = [[d.groupLabel, ...d.cols, 'Total (hours)'], ...d.rows.map(r => [r.name, ...r.vals.map(hrs), hrs(r.total)]), ['Total', ...d.colTotals.map(hrs), hrs(d.grand)]];
            const dest = await saveDialog({ defaultPath: `${d.title.replace(/[\\/:*?"<>|]/g, '-')}.csv`, filters: [{ name: 'CSV', extensions: ['csv'] }] });
            if (!dest) return;
            try { await invoke('write_text_file', { dest, content: '\ufeff' + lines.map(l => l.map(esc).join(',')).join('\r\n') }); toast('Timesheet saved', dest); } catch (e) { toast.error('Couldn’t save the timesheet', String(e)); }
          }}
          onPrint={d => {
            const h = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
            const html = `<!doctype html><html><head><meta charset="utf-8"><title>${h(d.title)}</title><style>body{font:12px system-ui,-apple-system,"Segoe UI",sans-serif;color:#111;margin:32px}h1{font-size:18px;margin:0 0 4px}p{color:#666;margin:0 0 16px}table{border-collapse:collapse;width:100%}th,td{border-bottom:1px solid #ddd;padding:6px 8px;text-align:right}th:first-child,td:first-child{text-align:left}tfoot td{font-weight:600;border-top:2px solid #111}</style></head><body><h1>${h(d.title)}</h1><p>${h(wsName)}, hours:minutes</p><table><thead><tr><th>${h(d.groupLabel)}</th>${d.cols.map(c => `<th>${h(c)}</th>`).join('')}<th>Total</th></tr></thead><tbody>${d.rows.map(r => `<tr><td>${h(r.name)}</td>${r.vals.map(v => `<td>${fmtHM(v)}</td>`).join('')}<td>${fmtHM(r.total)}</td></tr>`).join('')}</tbody><tfoot><tr><td>Total</td>${d.colTotals.map(v => `<td>${fmtHM(v)}</td>`).join('')}<td>${fmtHM(d.grand)}</td></tr></tfoot></table></body></html>`;
            const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;width:0;height:0;border:0;right:0;bottom:0';
            f.srcdoc = html; document.body.appendChild(f);
            f.onload = () => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { toast.error('Couldn’t open printing', String(e)); } setTimeout(() => f.remove(), 60000); };
          }} />
      ) : view === 'archive' ? (
        <ArchiveView items={archived} labels={labels} days={settings.archiveDays} onDays={d => saveTeamSettings(x => ({ ...x, archiveDays: d }))}
          onRestore={id => { restoreTask(id); toast('Task restored'); }} onTrash={id => { trashTasks([id]); toast('Moved to Trash', undefined, { undo: true }); }} onCleanUp={() => setCleanUpOpen(true)} />
      ) : view === 'trash' ? (
        <TrashView items={trash} onRestore={id => { restoreTask(id); toast('Task restored'); }} onDeleteNow={t => setPurgeConfirm([t.id])} onEmpty={() => setPurgeConfirm(Object.keys(trash))} />
      ) : view === 'docs' ? (
        <DocumentsView onRefresh={() => scanFolders(true)} hasWatch={(settings.watchFolders || []).length > 0} docs={docs} tasks={all} focusId={docFocus} dragOver={dragOver && !sheet.open && !addDocs.open} onAdd={fs => setAddDocs({ open: true, files: fs })} onDownload={downloadFile}
          onRemove={(file, taskId) => unlinkDoc(file, taskId)} onDelete={(f, dismiss) => { if (dismiss) { deleteDocEverywhere(stripMeta(f)); toast('Dismissed', f.name, { undo: true }); } else setDocDelete(f); }} onOpenTask={(id, isArchived) => { if (isArchived) setView('archive'); else openTask(id); }}
          onAttach={f => setAttachDoc(f)} onSetStatus={setDocStatus} onSeen={markDocSeen} onMerge={d => setMergeFor(d)} onAddVersion={addVersion} onUploadVersion={uploadVersion} onMakeCurrent={makeCurrent} />
      ) : (<>
      {showSummary && <TimeSummary tasks={all} onHide={() => setShowSummary(false)} />}

      {/* One row: status tabs, then Filter, Sort, the view switch and Columns (or Group by). Active filters and a changed sort show as chips below. */}
      <div className="mt-3 flex min-h-9 flex-wrap items-center gap-1.5">
        <FilterTabs label="Task status" value={query ? null : filter} onChange={id => { setFilter(id); if (query) setQuery(''); }}
          items={[{ id: 'inbox', label: 'Inbox', count: counts.inbox, badge: true, icon: <I.inbox className="size-3.5" /> }, { id: 'open', label: 'Open', count: counts.open }, ...STATUSES.map(st => ({ id: st.id, label: GROUP_HEAD[st.id], count: counts[st.id], dot: st.dot })), { id: 'all', label: 'All', count: counts.all }]} />
        <div className="ml-auto flex items-center gap-1.5">
          {(() => {
            const nOn = (bucketFilter.length > 0) + (projectFilter.length > 0) + !!dueFilter;
            return (<>
              <Popover align="end" className="w-64 p-1"
                trigger={({ open: isOpen, ...p }) => <button {...p} type="button" title={`Filter by ${labels.bucket.toLowerCase()}, ${labels.platform.toLowerCase()} or ${labels.deadline.toLowerCase()}`}
                  className={cn('inline-flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ui-control',
                    nOn ? 'border-blue-500/40 bg-blue-50 text-blue-700 dark:border-blue-500/50 dark:bg-blue-950/60 dark:text-blue-200' : 'text-muted-foreground hover:text-foreground')}>
                  <I.sliders className="size-3.5" />Filter{nOn ? <span className="tnum">· {nOn}</span> : null}</button>}>
                <FilterMenu f={filterCtx} />
              </Popover>
              <SortButton sorts={sorts} setSorts={setSorts} labels={labels} />
            </>);
          })()}
          <div role="group" aria-label="View" className="flex h-9 items-center gap-0.5 rounded-lg bg-muted p-1">
          {[['table', 'Table', <I.table />], ['list', 'Grouped', <I.rows />], ['board', 'Board', <I.kanban />]].map(([id, label, icon]) => (
            <button key={id} type="button" aria-pressed={viewMode === id} aria-label={`${id === 'list' ? 'List' : label} view`} title={label} onClick={() => setViewMode(id)}
              className={cn('flex h-7 w-8 items-center justify-center rounded-md transition-colors [&_svg]:size-3.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                viewMode === id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>{icon}</button>
          ))}
          </div>
          {/* Columns (table) or Group by (grouped) sit beside the view switch; sorting moved to the chip row. */}
          {viewMode !== 'board' && (() => {
            const isTable = viewMode === 'table';
            const shownCols = TABLE_COLS.filter(c => c.key !== 'task' && !cols.hidden.includes(c.key)).length;
            const tip = isTable ? 'Columns' : `Group by ${labels[groupBy === 'project' ? 'platform' : groupBy].toLowerCase()}`;
            return (
              <Popover align="end" className="w-56 p-1"
                trigger={({ open: isOpen, ...p }) => <button {...p} type="button" title={tip} aria-label={isTable ? `Columns, ${shownCols} shown` : tip}
                  className={cn('inline-flex size-9 items-center justify-center rounded-lg border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ui-control', isOpen && 'bg-muted text-foreground')}>
                  {isTable ? <I.columns className="size-4" /> : <I.layers className="size-4" />}</button>}>
                {isTable ? (
                  <div role="group" aria-label="Columns">
                    <div className="px-2 pb-1 pt-2 text-xs font-medium text-muted-foreground">Columns</div>
                    {orderedCols.filter(c => c.key !== 'task').map(c => (
                      <label key={c.key} className="flex h-8 cursor-default items-center gap-2.5 rounded-sm px-2 text-sm hover:bg-accent">
                        <Checkbox checked={!cols.hidden.includes(c.key)} onChange={v => hideCol(c.key, !v)} label={labels[c.key]} />{labels[c.key]}
                      </label>
                    ))}
                    <div className="-mx-1 my-1 h-px bg-border" />
                    <button type="button" onClick={() => setCols({ widths: {}, hidden: [], order: [] })} className="flex h-8 w-full items-center rounded-sm px-2 text-left text-sm text-muted-foreground hover:bg-accent hover:text-foreground">Show all, reset widths and order</button>
                  </div>
                ) : (
                  <div role="menu" aria-label="Group by">
                    <div className="px-2 pb-1 pt-2 text-xs font-medium text-muted-foreground">Group by</div>
                    {GROUP_OPTIONS.map(k => (
                      <button key={k} type="button" role="menuitemradio" aria-checked={groupBy === k} onClick={() => setGroupBy(k)}
                        className={cn('flex h-8 w-full items-center gap-2 rounded-sm px-2 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none', groupBy === k && 'font-medium')}>
                        <span className="min-w-0 flex-1 truncate">{labels[k === 'project' ? 'platform' : k]}</span>{groupBy === k && <I.check className="size-3.5 shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
              </Popover>
            );
          })()}
        </div>
      </div>
      {!query && <FilterChips f={filterCtx} sort={{ sorts, setSorts, labels }} />}
      {query && (() => {
        return (
          <div className="mt-2 flex min-h-9 flex-wrap items-center gap-1.5 rounded-lg border border-dashed px-3 py-1.5 text-xs text-muted-foreground">
            {query ? (
              <span className="inline-flex flex-wrap items-center gap-3">
                <span className="font-medium text-foreground">{shown.length} found</span>
                <label className="inline-flex items-center gap-1.5"><Checkbox checked={incArchived} onChange={setIncArchived} label="Include archived" />Include archived</label>
                {workspaces.length > 1 && <label className="inline-flex items-center gap-1.5"><Checkbox checked={allWs} onChange={setAllWs} label="All workspaces" />All workspaces</label>}
              </span>
            ) : null}
          </div>
        );
      })()}

      {viewMode === 'list' && all.length > 0 ? (
        <ListView tasks={shown} stages={stages} labels={labels} groupBy={groupBy} onOpen={openFromView} onToggle={toggleTimer} onAdd={preset => createTask({ preset })} />
      ) : viewMode === 'board' && all.length > 0 ? (
        <BoardView tasks={!query && filter === 'open' ? sorted : shown} stages={stages} labels={labels} onOpen={openFromView} onToggle={toggleTimer} onMove={moveToColumn} onAdd={preset => createTask({ preset })} />
      ) : (
      <div className="mt-3">
        {all.length === 0 ? (
          <Empty icon={<I.clipboard />} title="No tasks yet" description="Add one in the last row of the table, or use Create task to add an assignee, deadline and description.">
            <Button variant="outline" size="sm" onClick={createTask}><I.plus />Create task</Button>
          </Empty>
        ) : shown.length === 0 && query ? (
          <Empty icon={<I.search />} title={`No tasks match “${query}”`} description="Try a different word, or clear the search to see everything.">
            <Button variant="outline" size="sm" onClick={() => setQuery('')}>Clear search</Button>
          </Empty>
        ) : shown.length === 0 ? (
          <Empty icon={<I.clipboard />} title={filter === 'all' ? 'Nothing here yet' : filter === 'inbox' ? 'Inbox is empty' : filter === 'open' ? 'Nothing open' : `Nothing in ${GROUP_HEAD[filter].toLowerCase()}`} description="Try another filter or project to see the rest of your tasks.">
            <Button variant="outline" size="sm" onClick={() => { setFilter('all'); setProjectFilter([]); setBucketFilter([]); setDueFilter(''); }}>Show all tasks</Button>
          </Empty>
        ) : (
          <div ref={tableWrap} className="relative overflow-x-auto">
            {colDrag && <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 z-20 w-0.5 -translate-x-1/2 rounded-full bg-foreground/60 transition-[left] duration-150 ease-in-out" style={{ left: colDrag.line }} />}
            {colDrag && <div aria-hidden="true" className="pointer-events-none fixed z-[90] inline-flex h-7 items-center rounded-md border bg-popover px-2.5 text-xs font-medium text-popover-foreground ui-float" style={{ left: colDrag.x + 12, top: colDrag.y + 10 }}>{colDrag.label}</div>}
            <table className="task-grid w-full table-fixed border-collapse text-[13px]" style={{ minWidth: visibleCols.reduce((n, c) => n + (c.key === 'task' ? 320 : colW(c)), 36) }}>
              <colgroup>
                {visibleCols.map(c => <col key={c.key} style={c.key === 'task' ? undefined : { width: colW(c) }} />)}
                <col style={{ width: 36 }} />
              </colgroup>
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  {visibleCols.map(c => {
                                        const icon = { task: <span className="text-[11px] font-semibold">Aa</span>, status: <I.loader />, bucket: <I.layers />, assignee: <I.user />, deadline: <I.calendar />, priority: <I.flag />, time: <I.timer /> }[c.key];
                    return (
                      <th key={c.key} data-col={c.key} className={cn('relative h-8 p-0 font-normal transition-[background-color,opacity] duration-200 ease-in-out', colDrag && colDrag.key === c.key && 'bg-muted opacity-50', movedCol === c.key && 'bg-muted text-foreground')}>
                        <DropdownMenu align="start"
                          trigger={p => (
                            <button {...p} type="button" title={c.key === 'task' ? `${labels[c.key]}: rename` : `${labels[c.key]}: drag to move, click to rename, hide or resize`}
                              onPointerDown={e => startColDrag(e, c)}
                              className={cn('flex h-8 w-full items-center gap-1.5 px-2.5 text-left hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:bg-muted/60 [&_svg]:size-3.5', c.key !== 'task' && 'active:cursor-grabbing')}>
                              {icon}<span className="truncate">{labels[c.key]}</span>
                            </button>
                          )}
                          items={[
                            { label: 'Rename', icon: <I.pencil />, onSelect: () => setLabelEdit(c.key) },
                            ...(c.key === 'task' ? [] : (() => {
                              const vis = movableKeys.filter(k => !cols.hidden.includes(k)), i = vis.indexOf(c.key);
                              return [
                                ...(i > 0 ? [{ label: 'Move left', icon: <I.left />, onSelect: () => nudgeCol(c.key, -1) }] : []),
                                ...(i < vis.length - 1 ? [{ label: 'Move right', icon: <I.right />, onSelect: () => nudgeCol(c.key, 1) }] : []),
                              ];
                            })()),
                            ...(c.key === 'task' ? [] : [
                              { label: 'Hide column', icon: <I.eye />, onSelect: () => hideCol(c.key, true) },
                              ...(cols.widths[c.key] ? [{ label: 'Reset width', icon: <I.reset />, onSelect: () => setColWidth(c.key, null) }] : []),
                            ]),
                          ]} />
                        {c.key !== 'task' && (
                          <span role="separator" aria-orientation="vertical" aria-label={`Resize ${labels[c.key]}`} title="Drag to resize, double-click to reset"
                            onPointerDown={e => startResize(e, c)} onDoubleClick={() => setColWidth(c.key, null)}
                            className="absolute -right-1 top-0 z-10 h-full w-2 cursor-col-resize after:absolute after:inset-y-1 after:left-[3px] after:w-0.5 after:rounded after:bg-transparent hover:after:bg-foreground/30" />
                        )}
                      </th>
                    );
                  })}
                  <th className="h-8"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {(hasMoreRows ? shown.slice(0, rowLimit) : shown).map(t => {
                  const d = due(t), on = !!t.timerStartedAt, done = t.status === 'done';
                  const blocker = t.status === 'blocked' && tasks[t.blockedBy];
                  const cell = 'h-10 px-2.5 align-middle';
                  return (
                    <tr key={t.id} data-task-id={t.id} className={cn('group transition-colors hover:bg-muted/40', on && 'bg-accent/60')}>
                      <td className={cn(cell, 'group/title')}>
                        {renaming === t.id ? (
                          <input autoFocus defaultValue={t.title} aria-label="Task title"
                            className="h-7 w-full rounded-md border px-1.5 text-[13px] font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ui-field"
                            onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { e.stopPropagation(); setRenaming(null); } }}
                            onBlur={e => { const v = e.target.value.trim(); if (v && v !== t.title) updateTask(t.id, { title: v }); setRenaming(null); }} />
                        ) : (
                          <div className="flex min-w-0 items-center gap-2">
                            {done ? <span className="size-6 shrink-0" aria-hidden="true" /> : (
                              <button type="button" onClick={() => toggleTimer(t.id)} aria-label={`${on ? 'Stop' : 'Start'} timer for ${t.title || 'Untitled'}`} title={on ? 'Stop timer' : 'Start timer'} data-on={on ? '' : undefined}
                                className={cn('row-play flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring [&_svg]:size-3',
                                  on ? 'border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-600' : 'text-muted-foreground hover:border-foreground/30 hover:text-foreground')}>
                                {on ? <I.pause /> : <I.play className="translate-x-px" />}
                              </button>
                            )}
                            <button type="button"
                              onClick={() => openTask(t.id)}
                              onAuxClick={e => { if (e.button === 1) { e.preventDefault(); openTask(t.id); } }}
                              onMouseDown={e => { if (e.button === 1) e.preventDefault(); }}
                              className={cn('min-w-[5rem] truncate text-left font-medium hover:underline underline-offset-4 focus-visible:outline-none focus-visible:underline', done && 'text-muted-foreground line-through', !t.title && 'font-normal text-muted-foreground')}>{t.title || 'Untitled'}</button>
                            {(() => {
                              const editing = cellEdit && cellEdit.id === t.id && cellEdit.field === 'project';
                              return t.project ? (
                                // 0.19.14: icon only. The name floats open over the row on hover or focus (see .pchip in index.css).
                                <span className="pchip-slot">
                                  <button type="button" onClick={e => openCell(t.id, 'project', e.currentTarget)} title={`Change ${labels.platform.toLowerCase()}`} aria-label={`${labels.platform}: ${t.project}`} data-open={editing ? '' : undefined}
                                    className={cn('pchip inline-flex h-5 items-center rounded-md border px-1 text-[11px] text-foreground/75 hover:border-foreground/25 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ui-field', editing && 'border-foreground/30 text-foreground')}>
                                    <PIcon name={t.project} className="size-3 shrink-0 text-muted-foreground" /><span className="pchip-name"><span><span>{t.project}</span></span></span>
                                  </button>
                                </span>
                              ) : t.inbox ? null : (
                                <button type="button" onClick={e => openCell(t.id, 'project', e.currentTarget)} title={`Add a ${labels.platform.toLowerCase()}`}
                                  className={cn('inline-flex h-5 shrink-0 items-center rounded-md border border-dashed px-1.5 text-[11px] text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none group-hover:opacity-100 [@media(hover:none)]:opacity-100', editing && 'opacity-100')}>
                                  + {labels.platform}
                                </button>
                              );
                            })()}
                            <span className="flex shrink-0 items-center gap-2 text-[11px] text-muted-foreground">
                              {blocker && <button type="button" title={`Blocked by “${blocker.title}”`} onClick={() => openTask(t.blockedBy)} className="text-red-600 dark:text-red-400"><I.ban className="size-3" /></button>}
                              {(t.checklist || []).length > 0 && <span className="tnum inline-flex items-center gap-0.5" title="Checklist"><I.listCheck className="size-3" />{t.checklist.filter(c => c.done).length}/{t.checklist.length}</span>}
                              {(t.files || []).length > 0 && <span className="tnum inline-flex items-center gap-0.5" title="Documents"><I.paperclip className="size-3" />{t.files.length}</span>}
                              {t.generatedFrom && <span title="Created by an automation"><I.zap className="size-3" /></span>}
                            </span>
                            {t.inbox && (
                              <button type="button" onClick={() => acceptTask(t.id)} title="Move to Open"
                                className="inline-flex h-5 shrink-0 items-center rounded-full border px-2 text-[11px] font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ui-fill">Accept</button>
                            )}
                            <button type="button" onClick={() => setRenaming(t.id)} aria-label={`Rename ${t.title}`} title="Rename"
                              className="ml-auto inline-flex size-6 shrink-0 items-center justify-center rounded-md border text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none group-hover/title:opacity-100 [@media(hover:none)]:opacity-100 ui-fill">
                              <I.pencil className="size-3" />
                            </button>
                          </div>
                        )}
                      </td>
                      {[
                        ['status', <DefPill def={statusDef(t, stages)} />],
                        ['bucket', t.bucket
                          ? <span className="flex min-w-0 items-center gap-1.5"><I.layers className="size-3.5 shrink-0 text-muted-foreground/70" /><span className="truncate">{t.bucket}</span></span>
                          : <span className="text-muted-foreground/60">Empty</span>],
                        ['assignee', t.assignee
                          ? <span className="flex min-w-0 items-center gap-1.5"><PersonHover name={t.assignee}><Avatar name={t.assignee} className="h-5 w-5 [&_span]:text-[9px]" /></PersonHover><span className="truncate">{t.assignee}</span></span>
                          : <span className="text-muted-foreground/60">Empty</span>],
                        ['deadline', t.deadline ? <span className={cn('inline-flex items-center gap-1 whitespace-nowrap', dueCls[d.tone])} title={deadlineLock(t) ? lockText(deadlineLock(t), labels.bucket, t.deadline !== deadlineLock(t).end) : undefined}>{d.text}{deadlineLock(t) && t.deadline === deadlineLock(t).end && <I.layers className="size-3 shrink-0 opacity-50" aria-label={`${labels.bucket} end date`} />}</span> : <span className="text-muted-foreground/60">Empty</span>],
                        ['priority', <span className={cn(done && 'opacity-50')}><PriorityPill priority={t.priority} /></span>],
                        ['time', null],
                      ].filter(([field]) => !cols.hidden.includes(field)).sort((a, b) => movableKeys.indexOf(a[0]) - movableKeys.indexOf(b[0])).map(([field, content]) => {
                        const dim = colDrag && colDrag.key === field && 'opacity-50';
                        if (field === 'time') return (
                          <td key="time" className={cn(cell, 'px-1 transition-opacity duration-150', dim)}>
                            <span className={cn('tnum inline-flex h-6 w-full items-center px-1.5 text-xs', on ? 'font-semibold text-emerald-600 dark:text-emerald-400' : elapsed(t) ? 'text-foreground/80' : 'text-muted-foreground/60')}>{<Elapsed task={t} />}</span>
                          </td>
                        );
                        const active = cellEdit && cellEdit.id === t.id && cellEdit.field === field;
                        return (
                          <td key={field} tabIndex={0} role="button" aria-label={`Change ${(labels[field] || field).toLowerCase()} of ${t.title || 'Untitled'}`}
                            onClick={e => openCell(t.id, field, e.currentTarget)}
                            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCell(t.id, field, e.currentTarget); } }}
                            className={cn(cell, 'cursor-pointer transition-[background-color,opacity] duration-150 hover:bg-muted/60 focus-visible:outline-none focus-visible:shadow-[inset_0_0_0_1px_hsl(var(--ring))]', active && 'bg-muted/60 shadow-[inset_0_0_0_1px_hsl(var(--ring))]', dim)}>
                            <div className="flex min-w-0 items-center">{content}</div>
                          </td>
                        );
                      })}
                      <td className="h-10 px-0.5 text-center">
                        <div className="opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
                          <DropdownMenu
                            trigger={p => <Button {...p} variant="ghost" size="icon-sm" className="h-7 w-7" aria-label={`Actions for ${t.title}`}><I.more /></Button>}
                            items={[
                              { label: 'Open', icon: <I.pencil />, onSelect: () => openTask(t.id) },
                              { label: on ? 'Pause timer' : 'Start timer', icon: on ? <I.pause /> : <I.play />, onSelect: () => toggleTimer(t.id) },
                              ...(done ? [] : [{ label: 'Mark as done', icon: <I.check />, onSelect: () => markDone(t.id) }]),
                              { label: 'Duplicate', icon: <I.copy />, onSelect: () => duplicate(t.id) },
                              'sep',
                              { label: 'Delete', icon: <I.trash />, destructive: true, onSelect: () => askDelete(t.id) },
                            ]} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {hasMoreRows && <div ref={moreRows} aria-hidden="true" className="h-px" />}
          </div>
        )}
        <form onSubmit={addQuick} className="flex h-9 items-center gap-2 px-2.5 text-[13px]" autoComplete="off">
          <I.plus className="size-3.5 text-muted-foreground" />
          <input value={quick} onChange={e => setQuick(e.target.value)} placeholder="New task" aria-label="New task title"
            className="h-8 min-w-0 flex-1 bg-transparent placeholder:text-muted-foreground focus-visible:outline-none" />
          {quick && <Kbd>Enter ↵</Kbd>}
        </form>
      </div>
      )}
      {extraResults.map(r => (
        <div key={r.key} className="mt-4">
          <div className="mb-1.5 text-xs font-medium text-muted-foreground">{r.title} ({r.items.length})</div>
          {r.items.length > 0 && (
            <Card className="divide-y overflow-hidden">
              {r.items.slice(0, 30).map(t => (
                <button key={t.id} type="button" onClick={() => r.onPick(t)} className="flex h-10 w-full items-center gap-3 px-4 text-left text-[13px] hover:bg-muted/50">
                  <span className={cn('size-2 shrink-0 rounded-full', STATUS_COLORS[statusDef(t, r.key === 'archive' ? stages : []).color])} />
                  <span className="min-w-0 flex-1 truncate font-medium">{t.title || 'Untitled'}</span>
                  {t.project && <span className="max-w-[10rem] truncate text-xs text-muted-foreground">{t.project}</span>}
                  <I.right className="size-3.5 text-muted-foreground" />
                </button>
              ))}
            </Card>
          )}
        </div>
      ))}
      </>)}

      </div>
      </div>
      </div>
      </div>
      </>

      <TaskSheet bucketMap={bucketMap} bucketEnds={bucketEnds} oneAtATime={!!prefs.oneAtATime} onPick={id => setSheet({ open: true, id })} onAccept={acceptTask} mode={standaloneId ? 'window' : openMode} onMode={onSheetMode} onPopOut={popOut} open={sheet.open} task={sheetTask} people={people} members={team.on ? team.members : null} teams={team.on ? teamsList : null} stages={stages} labels={labels} buckets={bucketNames} defaultAssignee={me.name} dropRef={sheetDrop} projects={projects} rules={rules} defaultProject={onlyPick(projectFilter)} allTasks={all} onOpen={id => openTask(id)} onPatch={patch} onClose={closeSheet}
        onSave={saveSheet} onDiscardEmpty={discardEmpty} onDelete={() => askDelete(sheet.id)} onToggle={toggleTimer} onReset={resetTimer}
        storageOk={storageOk} busy={busy} onUpload={uploadMany} onAttach={attach} onPreview={setPreview} onDownload={downloadFile}
        onRemoveFile={(file, taskId) => unlinkDoc(file, taskId)} onLinkExisting={id => setLinkFor(id)} onDiscard={fs => fs.forEach(f => deleteIfUnused(f, []))} />
      <AlertDialog open={!!confirmId} title="Move this task to the Trash?"
        description={`“${(tasks[confirmId] || {}).title || 'Untitled'}” goes to the Trash, where you can restore it for ${TRASH_DAYS} days. After that it’s deleted for good. Its documents are kept.`}
        confirmLabel="Move to Trash" onConfirm={doDelete} onCancel={() => setConfirmId(null)} />
      {cellEdit && tasks[cellEdit.id] && (
        <CellEditor key={cellEdit.id + cellEdit.field} edit={cellEdit} task={{ ...tasks[cellEdit.id], status: S[tasks[cellEdit.id].status] ? tasks[cellEdit.id].status : 'todo' }}
          ctx={{ update: updateTask, deadlineLock, people, projects, buckets: bucketNames, bucketInfo, ensureBucket, labels, stages, ensureProject, addStage, deleteStage, editStatuses: () => setStatusesOpen(true) }} onClose={() => setCellEdit(null)} />
      )}
      <BucketStatusesDialog open={bucketStatusesOpen} buckets={bucketList} noun={labels.bucket} onClose={() => setBucketStatusesOpen(false)} onSave={saveBucketStatuses} />
      <StatusesDialog open={statusesOpen} stages={stages} tasks={all} onClose={() => setStatusesOpen(false)}
        onSave={list => { saveStages(list); setStatusesOpen(false); if (canAdmin) toast('Statuses saved'); }} />
      <ProjectDialog open={!!projectEdit} noun={labels.platform} project={projectEdit && projectEdit.project} names={projects} onClose={() => setProjectEdit(null)} onSave={saveProject} />
      <BucketDialog open={!!bucketEdit} noun={labels.bucket} bucket={bucketEdit && bucketEdit.bucket} names={bucketNames} onClose={() => setBucketEdit(null)} onSave={saveBucket}
        handoffs={st => pendingHandoffs(bucketEdit && bucketEdit.bucket ? bucketEdit.bucket : {}, st).length} />
      <AlertDialog open={!!readyAsk} destructive={false} cancelLabel="Not now" confirmLabel={`Move to ${BS.ready ? BS.ready.label : 'Ready for dev'}`}
        title={readyAsk ? `All ${readyAsk.total} ${readyAsk.total === 1 ? 'task' : 'tasks'} in ${readyAsk.name} are done` : ''}
        description={readyAsk ? `Move ${readyAsk.name} to ${BS.ready ? BS.ready.label : 'Ready for dev'}?${readyAsk.handoffs ? ` That creates its ${readyAsk.handoffs} handoff ${readyAsk.handoffs === 1 ? 'task' : 'tasks'}.` : ''}` : ''}
        onConfirm={() => { const n = readyAsk.name; setReadyAsk(null); setBucketStatus(n, 'ready'); }} onCancel={() => setReadyAsk(null)} />
      <AlertDialog open={!!bucketDelete} title={`Delete “${bucketDelete ? bucketDelete.name : ''}”?`}
        description={`The tasks stay; they just won’t have a ${labels.bucket.toLowerCase()} anymore.`}
        confirmLabel={`Delete ${labels.bucket.toLowerCase()}`} onConfirm={deleteBucket} onCancel={() => setBucketDelete(null)} />
      <PlatformsDialog open={platformsOpen} onClose={() => setPlatformsOpen(false)} list={projectList} tasks={all} noun={labels.platform}
        onCreate={name => writeProject(null, { name })} onRename={(p, name) => writeProject(p, { name, color: p.color })} onIcon={(p, icon) => writeProject(p, { name: p.name, color: p.color, icon: icon === 'folder' ? null : icon })} onDelete={p => setProjectDelete(p)} />
      <NameDialog open={!!labelEdit} title="Rename column" value={labelEdit ? labels[labelEdit] : ''}
        defaultValue={labelEdit ? ({ ...LABEL_DEFAULTS, ...(WS_LABELS[ws] || {}) })[labelEdit] : ''}
        hint={`Used everywhere in ${wsName}: the table, filters and the task panel.`}
        onClose={() => setLabelEdit(null)} onSave={v => { saveLabels(l => ({ ...l, [labelEdit]: v })); setLabelEdit(null); }} />
      <NameDialog open={wsRename} title="Rename workspace" value={wsName} onClose={() => setWsRename(false)}
        onSave={v => { onRenameWorkspace(ws, v); setWsRename(false); }} />
      <CleanUpDialog open={cleanUpOpen} items={archived} onClose={() => setCleanUpOpen(false)}
        onConfirm={ids => { trashTasks(ids); setCleanUpOpen(false); toast(`${ids.length} ${ids.length === 1 ? 'task' : 'tasks'} moved to Trash`, `They’re deleted for good after ${TRASH_DAYS} days.`); }} />
      <AlertDialog open={!!purgeConfirm} title={purgeConfirm && purgeConfirm.length > 1 ? `Delete ${purgeConfirm.length} tasks for good?` : 'Delete this task for good?'}
        description="This can’t be undone. Their documents stay in Documents, marked “No task”."
        confirmLabel="Delete for good" onConfirm={() => { purgeTrash(purgeConfirm); setPurgeConfirm(null); toast('Deleted for good'); }} onCancel={() => setPurgeConfirm(null)} />
      <AlertDialog open={!!projectDelete} title={`Delete “${projectDelete ? projectDelete.name : ''}”?`}
        description={projectDelete ? (() => {
          const n = norm(projectDelete.name);
          const tc = all.filter(t => norm(t.project) === n).length;
          const rc = rules.filter(r => norm(r.project) === n || ((r.action === 'copy' || r.action === 'move') && norm(r.target) === n)).length;
          return `The tasks stay. ${tc ? `${tc} ${tc === 1 ? 'task moves' : 'tasks move'} to “No ${labels.platform.toLowerCase()}”. ` : ''}${rc ? `${rc} ${rc === 1 ? 'automation that uses' : 'automations that use'} this ${labels.platform.toLowerCase()} will be removed.` : ''}`;
        })() : ''}
        confirmLabel={`Delete ${labels.platform.toLowerCase()}`} onConfirm={deleteProject} onCancel={() => setProjectDelete(null)} />
      <AutomationsDialog open={rulesOpen} onClose={() => setRulesOpen(false)} onOpenNotifications={() => { setRulesOpen(false); setSettingsOpen('notifications'); }} rules={rules} projects={projects} people={people} me={me.name} bucketNoun={labels.bucket} stages={stages} buckets={bucketNames}
        onSave={list => { saveRules(list); setRulesOpen(false); if (canAdmin) toast('Automations saved'); }} />
      <ShortcutsDialog open={false} onClose={() => setKeysOpen(false)} />
      {paletteOpen && <CommandPalette open onClose={() => setPaletteOpen(false)} items={paletteItems} />}
      <WhatsNewDialog open={!!whatsNew} items={whatsNew || []} onClose={() => setWhatsNew(null)} />
      <SettingsDialog open={!!settingsOpen} page={typeof settingsOpen === 'string' ? settingsOpen : 'general'} onClose={() => setSettingsOpen(false)} prefs={prefs} onPrefs={savePrefs} wsName={wsName} shortcutError={shortcutError}
        onRenameWorkspace={v => onRenameWorkspace(ws, v)} labels={labels} onLabel={(k, v) => saveLabels(l => ({ ...l, [k]: v }))}
        counts={{ stages: statusList(stages).length, bucketStatuses: BUCKET_STATUSES.length, platforms: projectList.length }}
        onEditStatuses={() => { setSettingsOpen(false); setStatusesOpen(true); }} onEditBucketStatuses={() => { setSettingsOpen(false); setBucketStatusesOpen(true); }} onEditPlatforms={() => { setSettingsOpen(false); setPlatformsOpen(true); }}
        teamsList={teamsList} rolesList={rolesList} onSaveTeams={guard(onSaveTeams)} onSaveRoles={guard(onSaveRoles)} teamTaskCounts={teamTaskCounts}
        onMoveTasks={(from, to) => { const moved = Object.values(tasksRef.current).filter(t => (t.teams || []).includes(from)).map(t => ({ ...t, teams: [...new Set(t.teams.filter(x => x !== from).concat(to ? [to] : []))] })); if (moved.length) saveMany(moved); }}
        rules={myNotes || rules} onRules={myNotes ? list => savePrefs({ [notifyKey]: list.filter(isNote) }) : saveRules} projects={projects}
        onOpenCloud={() => setCloudOpen(true)} onBackup={backup} onRestore={chooseRestore} onOpenDataFolder={() => invoke('open_data_folder').catch(e => toast.error('Couldn’t open the folder', String(e)))}
        updater={up} onWhatsNew={() => { setSettingsOpen(false); openWhatsNew(); }}
        watch={settings.watchFolders || []} status={watchStatus} onAddFolder={addWatchFolder} onSubfolders={setFolderSubfolders}
        onRemoveFolder={path => saveSettings(x => ({ ...x, watchFolders: (x.watchFolders || []).filter(w => w.path !== path) }))}
        prof={prof} workspaces={workspaces} ws={ws} onSwitchWorkspace={id => onSwitchWorkspace(id)} onSignOut={() => prof.update({ user: null })} />
      <AlertDialog open={!!watchOffer} title={watchOffer ? (watchOffer.why === 'missed' ? `${watchOffer.files.length} ${watchOffer.files.length === 1 ? 'file wasn’t' : 'files weren’t'} picked up` : `Add the ${watchOffer.files.length} ${watchOffer.files.length === 1 ? 'file' : 'files'} already in this folder?`) : ''}
        description={watchOffer ? `${watchOffer.path}: ${watchOffer.files.slice(0, 4).map(f => f.name).join(', ')}${watchOffer.files.length > 4 ? ` and ${watchOffer.files.length - 4} more` : ''}. ${watchOffer.why === 'missed' ? 'Add them to the Documents Inbox now?' : 'From now on, new files arrive in the Inbox by themselves.'}` : ''}
        confirmLabel="Add to Inbox" cancelLabel="Only new files" destructive={false} onConfirm={acceptOffer} onCancel={() => { const o = watchOffer; setWatchOffer(null); if (o && o.why === 'existing') toast('Watching folder', o.path); }} />
      <AddTimeDialog init={addTime} tasks={all} onClose={() => setAddTime(null)}
        onSave={(taskId, s0, e0) => {
          const t = tasksRef.current[taskId]; if (!t) return;
          saveMany([{ ...t, sessions: [...(t.sessions || []), { s: s0, e: e0, manual: true }].sort((a, b) => a.s - b.s), timeSpent: (t.timeSpent || 0) + (e0 - s0) }]);
          setAddTime(null); toast('Time added', `${fmtShort(e0 - s0)} to “${t.title || 'Untitled'}”`, { undo: true });
        }} />
      {!idle && <PausedTimersDialog note={pausedNote} tasks={tasks} oneAtATime={prefs.oneAtATime} onResume={resumeTimers} onClose={closePausedNote} />}
      <IdleDialog idle={idle} onKeep={() => resolveIdle('keep')} onRemove={() => resolveIdle('remove')} onRemoveStop={() => resolveIdle('stop')} />
      {quickAdd && (
        <Dialog open onClose={() => setQuickAdd(false)} title="Quick add" className="max-w-2xl">
          <CaptureBox compact lists={{
              labels: { bucket: labels.bucket, platform: labels.platform },
              buckets: bucketList.map(b => { const st = BS[bucketStatus(b)] || {}; return { name: b.name, dot: st.dot, note: st.label, done: bucketStatus(b) === 'done' }; }),
              platforms: projectList.map(p => ({ name: p.name, dot: colorOf(p.name).dot })) }}
            maxHeight={Math.max(72, Math.round(window.innerHeight * 0.3))}
            onCancel={() => setQuickAdd(false)}
            onSave={({ title, bucket, project }) => { if (title) captureRef.current(title, { bucket, project }); setQuickAdd(false); }} />
          <p className="-mt-2 text-xs text-muted-foreground">Enter saves. Type @ to pick a {labels.bucket.toLowerCase()} and # to pick a {labels.platform.toLowerCase()}.</p>
        </Dialog>
      )}
      <MergeDocsDialog doc={mergeFor} docs={docs} onClose={() => setMergeFor(null)} onMerge={mergeDocs} />
      <AddDocsDialog library={docs} open={addDocs.open} files={addDocs.files} setFiles={fn => setAddDocs(a => ({ ...a, files: typeof fn === 'function' ? fn(a.files) : fn }))} tasks={all} projects={projects} busy={busy}
        onClose={() => setAddDocs({ open: false, files: [] })} onSubmit={submitDocs} />
      <PreviewDialog file={preview} onClose={() => setPreview(null)} onDownload={downloadFile} />
      <AttachDocDialog file={attachDoc} tasks={all} onClose={() => setAttachDoc(null)}
        onAttach={(f, taskId) => { const m = stripMeta(f); delete m.inbox; delete m.source; attach(taskId, [m]); saveLooseDocs(l => l.filter(x => x.id !== f.id)); setAttachDoc(null); }} />
      <LinkDocsDialog taskId={linkFor} library={docs} linkedIds={linkFor && tasks[linkFor] ? (tasks[linkFor].files || []).map(f => f.id) : []} onClose={() => setLinkFor(null)}
        onLink={(taskId, picked) => { attach(taskId, picked.map(stripMeta)); const ids = picked.map(d => d.id); saveLooseDocs(l => l.filter(x => !ids.includes(x.id))); setLinkFor(null); }} />
      <AlertDialog open={!!docDelete} title={`Delete “${docDelete ? docDelete.name : ''}”?`}
        description={docDelete ? (docDelete.links.length ? `It will be removed from ${docDelete.links.length === 1 ? 'this task' : `these ${docDelete.links.length} tasks`}: ${docDelete.links.slice(0, 5).map(l => `“${l.task.title || 'Untitled'}”`).join(', ')}${docDelete.links.length > 5 ? ' and more' : ''}.` : 'It isn’t linked to any task.') : ''}
        confirmLabel="Delete document" onConfirm={() => { const f = docDelete; setDocDelete(null); deleteDocEverywhere(stripMeta(f)); toast('Document deleted', f.name, { undo: true }); }} onCancel={() => setDocDelete(null)} />
      <AlertDialog open={!!fileConfirm} title="Remove this document?"
        description={fileConfirm ? (fileConfirm.taskId ? `“${fileConfirm.file.name}” will be removed from this task.` : `“${fileConfirm.file.name}” will be deleted from this computer’s copy of your documents.`) : ''}
        confirmLabel={fileConfirm && !fileConfirm.taskId ? 'Delete document' : 'Remove document'} onConfirm={doRemoveFile} onCancel={() => setFileConfirm(null)} />
      <CloudDialog open={cloudOpen} onClose={() => setCloudOpen(false)} prof={prof} />
      <AlertDialog open={!!restoreSrc} title="Restore from this backup?"
        description={'Everything currently in the app (tasks, documents, automations and profile) will be replaced with the contents of the backup. Consider backing up first.' + (cloudStatus().email ? ' Your team’s data in the cloud isn’t replaced: afterwards you choose whether this PC uses the cloud’s data or combines both.' : '')}
        confirmLabel="Replace and restore" onConfirm={doRestore} onCancel={() => setRestoreSrc(null)} />
      {dragOver && (
        <div className="pointer-events-none fixed inset-3 z-[95] flex items-center justify-center rounded-xl border-2 border-dashed border-primary bg-background/70 anim-fade">
          <div className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg">
            {sheet.open ? 'Drop to attach to this task' : addDocs.open ? 'Drop to add to the list' : 'Drop to add documents'}
          </div>
        </div>
      )}
    </div>
  );
}

function UpdateCard({ up }) {
  if (!up.update) return null;
  return (
    <div role="status" className="flex w-[var(--width)] max-w-[calc(100vw-2rem)] items-start gap-3 rounded-lg border bg-popover p-3 text-sm text-popover-foreground ui-float">
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted"><I.download className="size-3.5" /></span>
      <div className="min-w-0 flex-1">
        <div className="font-medium">Version {up.update.version} is ready</div>
        {up.update.body && <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{up.update.body}</div>}
        {up.progress === null ? (
          <div className="mt-2 flex gap-2">
            <Button size="sm" className="h-7 px-2.5" onClick={up.install}>Install and restart</Button>
            <Button variant="ghost" size="sm" className="h-7 px-2.5" onClick={up.dismiss}>Later</Button>
          </div>
        ) : (
          <div className="mt-2">
            <div className="h-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${up.progress === 'installing' ? 100 : up.progress === -1 ? 30 : up.progress}%` }} /></div>
            <div className="tnum mt-1 text-xs text-muted-foreground">{up.progress === 'installing' ? 'Installing…' : up.progress === -1 ? 'Downloading…' : `Downloading ${up.progress}%`}</div>
          </div>
        )}
      </div>
      {up.progress === null && <button type="button" onClick={up.dismiss} aria-label="Dismiss" className="rounded-sm p-0.5 text-muted-foreground hover:text-foreground"><I.x className="size-3.5" /></button>}
    </div>
  );
}

/* =========================================================
   Sign-in & profile
   ========================================================= */
// The Google client built into the app (cloud-config.js), else the one pasted on this PC.
const googleClient = prof => (GOOGLE_CLIENT_ID ? { clientId: GOOGLE_CLIENT_ID, clientSecret: GOOGLE_CLIENT_SECRET } : prof.data.google || {});
const GoogleMark = () => (
  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.5c2.1-1.9 3.3-4.7 3.3-8z" /><path fill="#34A853" d="M12 23c3 0 5.5-1 7.2-2.7l-3.5-2.7c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.2v2.8A11 11 0 0 0 12 23z" /><path fill="#FBBC05" d="M5.8 14.2a6.6 6.6 0 0 1 0-4.3V7.1H2.2a11 11 0 0 0 0 9.9l3.6-2.8z" /><path fill="#EA4335" d="M12 5.4c1.6 0 3 .6 4.2 1.6l3.1-3.1A11 11 0 0 0 2.2 7.1l3.6 2.8C6.7 7.3 9.1 5.4 12 5.4z" /></svg>
);
// Signs in with Google and, when the app has a cloud, hands that sign-in to Supabase too (0.20), so the
// same Google account is your Taskit account. Returns { user } or { notInvited: email }. The ID token is never saved.
async function googleSignIn(prof) {
  const g = googleClient(prof);
  const { id_token, ...u } = await invoke('google_sign_in', { clientId: g.clientId, clientSecret: g.clientSecret });
  const c = cloudStatus();
  if (c.phase !== 'off' && c.url && id_token) {
    try { await cloudSignInGoogle(id_token); }
    catch (e) { toast.error('Signed in, but cloud sync didn’t connect', String((e && e.message) || e)); }
    if (cloudStatus().phase === 'notinvited') return { notInvited: u.email || '' };
  }
  const access = cloudStatus().access;
  return { user: { ...u, via: 'google', signedInAt: Date.now(), ...(access && access !== 'owner' ? { welcome: 'pending' } : {}) } };
}
function SignIn({ prof }) {
  const g = googleClient(prof);
  const [setup, setSetup] = useState(!g.clientId);
  const [cid, setCid] = useState(g.clientId || '');
  const [secret, setSecret] = useState(g.clientSecret || '');
  const [busy, setBusy] = useState(false);
  const [manual, setManual] = useState(false);
  const [name, setName] = useState('');
  const [notInvited, setNotInvited] = useState(null);
  const signIn = async () => {
    setBusy(true);
    try {
      const r = await googleSignIn(prof);
      if (r.notInvited !== undefined) setNotInvited(r.notInvited);
      else prof.update({ user: r.user });
    } catch (e) { toast.error('Sign-in didn’t finish', String(e)); }
    setBusy(false);
  };
  const saveSetup = e => {
    e.preventDefault();
    if (!cid.trim() || !secret.trim()) { toast.error('Paste both the Client ID and the Client secret'); return; }
    prof.update({ google: { clientId: cid.trim(), clientSecret: secret.trim() } });
    setSetup(false);
  };
  if (notInvited !== null) return (
    <div className="flex min-h-full items-center justify-center p-6">
      <Card className="w-full max-w-sm p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground"><I.user className="size-6" /></div>
          <h1 className="text-xl font-semibold tracking-tight">Hmm, we don’t know this account yet</h1>
          <p className="mt-2 text-sm text-muted-foreground"><b className="font-medium text-foreground">{notInvited || 'This Google account'}</b> isn’t on your team’s invite list. Try your work account, or ask your admin to add this one.</p>
        </div>
        <div className="grid gap-3">
          <Button className="h-10" variant="outline" onClick={() => { setNotInvited(null); signIn(); }} disabled={busy}>Try another Google account</Button>
          <button type="button" className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
            onClick={() => copyText(`Hey! Could you invite ${notInvited || 'me'} to our Taskit team? Settings › Members › Invite people. Thanks!`).then(() => toast('Copied', 'Paste it to your admin in a chat or email.'))}>Copy a quick note for your admin</button>
        </div>
      </Card>
    </div>
  );
  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <Card className="w-full max-w-sm p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground"><I.check className="size-6" /></div>
          <h1 className="text-xl font-semibold tracking-tight">Welcome to Taskit</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in with the Google account your team invited, and you’re in.</p>
        </div>
        {manual ? (
          <form className="grid gap-4" onSubmit={e => { e.preventDefault(); if (name.trim()) prof.update({ user: { name: name.trim(), email: '', picture: '', via: 'local', signedInAt: Date.now() } }); }}>
            <Field label="Your name" htmlFor="m-name"><Input id="m-name" value={name} onChange={e => setName(e.target.value)} autoFocus /></Field>
            <Button type="submit" disabled={!name.trim()}>Continue</Button>
            <Button variant="ghost" onClick={() => setManual(false)}>Back</Button>
          </form>
        ) : setup ? (
          <form className="grid gap-4" onSubmit={saveSetup}>
            <p className="text-sm text-muted-foreground">One-time setup: paste the two values from your Google Cloud project. Step 2 of SETUP-GUIDE.md shows where to find them.</p>
            <Field label="Client ID" htmlFor="g-id"><Input id="g-id" value={cid} onChange={e => setCid(e.target.value)} placeholder="…apps.googleusercontent.com" /></Field>
            <Field label="Client secret" htmlFor="g-secret"><Input id="g-secret" type="password" value={secret} onChange={e => setSecret(e.target.value)} /></Field>
            <Button type="submit">Save</Button>
            {g.clientId && <Button variant="ghost" onClick={() => setSetup(false)}>Cancel</Button>}
          </form>
        ) : (
          <div className="grid gap-3">
            <Button className="h-10 gap-2.5" onClick={signIn} disabled={busy}>{!busy && <GoogleMark />}{busy ? 'Waiting for Google in your browser…' : 'Continue with Google'}</Button>
            <p className="text-center text-xs text-muted-foreground">{busy ? 'Finish signing in there, then hop back here.' : 'We’ll pop open your browser. Sign in there, then hop back here.'}</p>
            {!GOOGLE_CLIENT_ID && <Button variant="ghost" size="sm" onClick={() => setSetup(true)} disabled={busy}>Change Google settings</Button>}
          </div>
        )}
        {!manual && (
          <div className="mt-6 border-t pt-4 text-center">
            <button type="button" onClick={() => setManual(true)} className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground">Use without Google</button>
          </div>
        )}
      </Card>
    </div>
  );
}

// First run for a teammate (0.20), step 1 of 2: how the team will see you. Step 2 is the team tour.
function Welcome({ prof, team, rolesList, teamsList, onDone }) {
  const u = prof.data.user || {};
  const [name, setName] = useState(u.name || '');
  const [photo, setPhoto] = useState(photoOf(u));
  const fileRef = useRef(null);
  const owner = team.members.find(m => m.access === 'owner');
  const ownerName = owner ? (owner.name || owner.email).split(' ')[0] : 'your admin';
  const first = (name || u.name || '').trim().split(' ')[0];
  const pick = async e => { const f = e.target.files && e.target.files[0]; e.target.value = ''; if (!f) return; try { setPhoto(await squarePhoto(f)); } catch (x) { toast.error('Couldn’t use that photo', x.message); } };
  const done = () => {
    if (!name.trim()) { toast.error('Add the name you’d like to go by'); return; }
    prof.updateUser({ name: name.trim(), photo: photo || '', timeZone: myZone(), welcome: 'tour' });
    onDone();
  };
  const row = (k, v) => <><dt className="text-muted-foreground">{k}</dt><dd className="min-w-0 truncate">{v}</dd></>;
  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <Card className="w-full max-w-md p-8">
        <div className="text-xs text-muted-foreground">Step 1 of 2</div>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">Hey{first ? ` ${first}` : ''}, welcome aboard!</h1>
        <p className="mt-1 text-sm text-muted-foreground">Quick check before you dive in: this is how the team will see you. You can tweak your name and photo anytime in Settings.</p>
        <div className="mt-6 flex items-center gap-4">
          <Avatar name={name} picture={photo || undefined} className="h-14 w-14 [&_span]:text-base" />
          <div className="grid gap-1.5">
            <span className="text-xs text-muted-foreground">{photo && photo === photoOf(u) && u.picture ? 'We grabbed this from your Google account' : photo ? 'Looking good' : 'No photo yet'}</span>
            <Button size="sm" variant="outline" onClick={() => fileRef.current && fileRef.current.click()}>{photo ? 'Pick another' : 'Pick a photo'}</Button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pick} />
          </div>
        </div>
        <Field label="What should we call you?" htmlFor="w-name" className="mt-5"><Input id="w-name" value={name} onChange={e => setName(e.target.value)} /></Field>
        <dl className="mt-5 grid grid-cols-[6rem_1fr] gap-x-3 gap-y-2 text-sm">
          {row('Role', roleName(team.me && team.me.role, rolesList) || 'Not set yet')}
          {row('Teams', teamNames((team.me && team.me.teams) || [], teamsList).join(', ') || 'Not set yet')}
          {row('Time zone', `${myZone() || 'Unknown'} (from this PC)`)}
        </dl>
        <p className="mt-4 text-xs text-muted-foreground">{owner && team.me && owner.id === team.me.id ? 'You set these up in Settings › Members.' : `${ownerName} set up your role and teams when inviting you. Something off? Just ping ${ownerName}.`}</p>
        <div className="mt-6 flex justify-end"><Button onClick={done}>All good, let’s go</Button></div>
      </Card>
    </div>
  );
}

// A short tour for your team (0.20), three steps, skippable, replayable from the menu.
const TOURS = {
  everyone: { name: 'Quick', steps: [
    ['These are your tasks', 'Tasks for me shows your teams’ tasks, plus anything assigned to you or made by you. Want the full picture? Pick Everyone from the title, or press Ctrl + 2.'],
    ['Tag tasks with teams', 'Open a task and add teams under Teams. Everyone on those teams sees it under For me right away.'],
    ['It all syncs on its own', 'Changes pop up on everyone’s PC within a second or two. If two people edit the same task at once, both changes are kept.'],
  ] },
  design: { name: 'Designer', steps: [
    ['Design requests come to you', 'Whenever marketing, web, mobile or backend need something designed, they tag the task with Design and it shows up in Tasks for me, right next to yours. Want the full picture? Switch to Everyone.'],
    ['Ready for feedback? Set it to In review', 'Whoever asked can see it’s their turn. Drop your files on the task so they’ve got everything in one place.'],
    ['Your timer is yours', 'Start the timer on a task and it only tracks your time, even if a teammate times the same task.'],
  ] },
  dev: { name: 'Developer', steps: [
    ['Your team’s tasks, all in one place', 'Tasks tagged with your team show up under For me, plus anything assigned to you.'],
    ['Need a design? Tag Design', 'Add Design under Teams on a task and the designers see it right away. Attach files and links so they’ve got the full story.'],
    ['One task at a time', 'Switch it on in Settings › General and starting a timer pauses your other ones. It only ever touches your own tasks.'],
  ] },
  qa: { name: 'QA', steps: [
    ['Stuff to test lands here', 'Tasks tagged QA show up under For me, plus anything assigned to you.'],
    ['Found something? Tag who fixes it', 'Add their team under Teams, like Web or Mobile, and it pops up for them right away.'],
    ['Your timer is yours', 'Start the timer on a task and it only tracks your time, even if a teammate times the same task.'],
  ] },
  marketing: { name: 'Marketing', steps: [
    ['Campaign tasks live here', 'Tasks tagged Marketing show up under For me, plus anything assigned to you.'],
    ['Need a graphic? Tag Design', 'Add Design under Teams on a task and the designers see it right away. Drop in the brief so they’ve got everything.'],
    ['Pings are just for you', 'Pick what notifies you in Settings › Notifications. It only covers your tasks and your teams’ tasks.'],
  ] },
  lead: { name: 'Team lead', steps: [
    ['See it all with Everyone', 'Ctrl + 2 shows every task across all teams, and Ctrl + 1 brings you back to yours.'],
    ['Zoom in on one team', 'Open the title menu and pick a team to see just its tasks.'],
    ['Pings are just for you', 'Pick what notifies you in Settings › Notifications. It only covers your tasks and your teams’ tasks.'],
  ] },
};
const tourFor = (team, rolesList) => {
  const t = (team.me && team.me.teams) || [], role = rolesList.find(r => r.id === (team.me && team.me.role)) || {};
  if (role.group === 'Management') return TOURS.lead;
  if (t.includes('design')) return TOURS.design;
  if (t.includes('marketing')) return TOURS.marketing;
  if (t.includes('qa')) return TOURS.qa;
  if (t.some(x => ['web', 'mobile', 'backend', 'wordpress'].includes(x))) return TOURS.dev;
  return TOURS.everyone;
};
function TeamTour({ tour, onClose }) {
  const [i, setI] = useState(0);
  useEffect(() => { const k = e => { if (e.key === 'Escape') onClose(); }; document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k); }, []);
  const [title, text] = tour.steps[i], last = i === tour.steps.length - 1;
  return createPortal(
    <section role="dialog" aria-label={`Tour, step ${i + 1} of ${tour.steps.length}`} className="fixed bottom-6 right-6 z-[60] w-[360px] max-w-[calc(100vw-2rem)] rounded-xl border bg-background p-5 anim-zoom ui-float">
      <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>{tour.name} tour · {i + 1} of {tour.steps.length}</span>
        <span className="flex gap-1" aria-hidden="true">{tour.steps.map((_, j) => <span key={j} className={cn('h-1.5 w-4 rounded-full', j <= i ? 'bg-foreground' : 'bg-muted')} />)}</span>
      </div>
      <h2 className="text-[15px] font-semibold">{title}</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">{text}</p>
      <div className="mt-4 flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={onClose}>{last ? 'Close' : 'Skip for now'}</Button>
        <span className="flex gap-2">
          {i > 0 && <Button variant="outline" size="sm" onClick={() => setI(i - 1)}>Back</Button>}
          <Button size="sm" onClick={() => (last ? onClose() : setI(i + 1))}>{last ? 'Got it' : 'Next'}</Button>
        </span>
      </div>
      {!last && <p className="mt-3 text-[11px] text-muted-foreground">Replay it anytime from the ⋯ menu › Team tour.</p>}
    </section>, document.body);
}

/* =========================================================
   The team (0.20): members, their access, job roles and teams
   ========================================================= */
const DEFAULT_TEAMS = ['Design', 'Web', 'Mobile', 'Backend', 'QA', 'Marketing', 'WordPress'].map(name => ({ id: name.toLowerCase(), name }));
const DEFAULT_ROLES = [
  ['Product Designer', 'Design'], ['Graphics Designer', 'Design'],
  ['Web Frontend Developer', 'Development'], ['Mobile Frontend Developer', 'Development'], ['Backend Developer', 'Development'], ['QA', 'Development'], ['WordPress Developer', 'Development'],
  ['SM Marketing & SEO', 'Marketing'], ['Email Marketing', 'Marketing'],
  ['Product Owner', 'Management'], ['Project Manager', 'Management'],
].map(([name, group]) => ({ id: norm(name).replace(/[^a-z0-9]+/g, '-'), name, group }));
const ACCESS_LABEL = { owner: 'Owner', admin: 'Admin', member: 'Member' };
// Who you are in the team. Not in a team (cloud sync off, or a Supabase project without the teams
// update): on is false and everything works as before.
function useTeam() {
  const [t, setT] = useState({ members: [], invites: [] });
  const c = useCloud();
  useEffect(() => onCloudTeam(x => setT({ ...x })), []);
  const signedIn = !['off', 'signin', 'loading', 'notinvited', 'removed'].includes(c.phase);
  const access = signedIn ? c.access || null : null;
  const uid = cloudMe();
  useEffect(() => { if (access && uid) setPersonKey(uid); }, [access, uid]);
  const me = t.members.find(m => m.id === uid) || null;
  return { on: !!access, access, admin: access === 'owner' || access === 'admin', owner: access === 'owner', me, uid, members: t.members, invites: t.invites };
}
const teamNames = (ids, teams) => (ids || []).map(id => (teams.find(x => x.id === id) || {}).name || id);
const roleName = (id, roles) => (roles.find(r => r.id === id || norm(r.name) === norm(id)) || {}).name || id || '';
// A typed assignee from before teams ("Ayesha") belongs to the member with that name, or that first name.
function memberFor(name, members) {
  const n = norm(name); if (!n) return null;
  return members.find(m => norm(m.name) === n) || (members.filter(m => norm(m.name).split(' ')[0] === n).length === 1 ? members.find(m => norm(m.name).split(' ')[0] === n) : null);
}
// "For me": your teams' tasks, plus ones assigned to you or made by you. Tasks not tagged with a team
// yet show to the Owner and Admins, so they can be sorted out.
const isForMe = (t, team) => {
  if (!team.on) return true;
  const mine = (team.me && team.me.teams) || [];
  if ((t.teams || []).some(x => mine.includes(x))) return true;
  if (t.createdBy && t.createdBy === team.uid) return true;
  const m = memberFor(t.assignee, team.members);
  if (m && m.id === team.uid) return true;
  return !(t.teams || []).length && team.admin;
};
const canDelete = (t, team) => !team.on || team.admin || (t && t.createdBy === team.uid);
// Searching people by name, role or team (filled in by the app while you're in a team).
let peopleMeta = {}, teamMode = false;
// Names that more than one teammate has (0.20.3): your photo isn't shown for those, since it may be the other person.
let nameClash = new Set();
const cloudTeamCount = () => { const t = cloudTeamNow(); return t.members.length + t.invites.length; };

/* =========================================================
   Cloud sync (Supabase)
   ========================================================= */
/* A data file that couldn't be read (0.20.3). The workspace stays closed, so nothing is saved over the file
   or deleted from the cloud, until it's recovered: from the team's cloud, from a backup, or by hand. */
function DamagedStore({ damaged, onRestore }) {
  useCloud(); // shows the cloud option as soon as sync connects
  const [busy, setBusy] = useState(false);
  const canCloud = cloudCanRecover();
  const fromCloud = async () => {
    setBusy(true);
    try { await cloudRecoverStore(damaged.store); window.location.reload(); }
    catch (e) { setBusy(false); toast.error('Couldn’t get your tasks from the cloud', String(e && (e.message || e))); }
  };
  return (
    <div className="flex h-full flex-col">
      {/* The same slim top row as the app, so the window can still be moved and closed. */}
      <div data-tauri-drag-region className="flex h-10 shrink-0 items-center pl-4 md:pl-6">
        <div data-tauri-drag-region className="min-w-0 flex-1" />
        <WindowControls />
      </div>
      <div className="flex flex-1 items-center justify-center">
      <Empty icon={<I.alert />} title="Your tasks couldn’t be opened"
        description={`The file that holds them can’t be read (${damaged.error}). Nothing has been changed or deleted, here or in the cloud. ${canCloud ? 'Get your team’s copy from the cloud, or restore a backup.' : 'Restore a backup, or open the data folder to look at the file.'}`}>
        <div className="flex flex-wrap justify-center gap-2">
          {canCloud && <Button disabled={busy} onClick={fromCloud}>{busy ? 'Getting your tasks…' : 'Get them from the cloud'}</Button>}
          <Button variant="outline" disabled={busy} onClick={onRestore}>Restore a backup…</Button>
          <Button variant="ghost" disabled={busy} onClick={() => invoke('open_data_folder').catch(() => {})}>Open data folder</Button>
        </div>
      </Empty>
      </div>
    </div>
  );
}
function useCloud() {
  const [st, setSt] = useState({ phase: 'loading' });
  useEffect(() => onCloudStatus(x => setSt({ ...x })), []);
  return st;
}
const CLOUD_TONE = {
  synced: { dot: 'bg-emerald-500', text: 'Up to date' },
  syncing: { dot: 'bg-sky-500 animate-pulse', text: 'Syncing…' },
  first: { dot: 'bg-sky-500 animate-pulse', text: 'Copying your data…' },
  connecting: { dot: 'bg-sky-500 animate-pulse', text: 'Connecting…' },
  checking: { dot: 'bg-sky-500 animate-pulse', text: 'Connecting…' },
  loading: { dot: 'bg-zinc-400', text: 'Starting…' },
  offline: { dot: 'bg-amber-500', text: 'Offline' },
  error: { dot: 'bg-red-500', text: 'Not syncing' },
  choose: { dot: 'bg-amber-500', text: 'Needs your choice' },
  signin: { dot: 'bg-zinc-400', text: 'Signed out' },
  notinvited: { dot: 'bg-amber-500', text: 'Not on the invite list' },
  removed: { dot: 'bg-amber-500', text: 'Not on the team anymore' },
  off: { dot: '', text: 'Off' },
};
// While these run, the cloud icon drifts gently.
const CLOUD_BUSY = new Set(['syncing', 'first', 'connecting', 'checking']);
const ago = ms => { if (!ms) return ''; const m = Math.round((Date.now() - ms) / 60000); return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : fmtDay(ms); };

// A quiet note beside the page title: "Saved to cloud · 2 min ago". Click it for the cloud sync window;
// hover it for a button that syncs right away.
function CloudNote({ onOpen }) {
  const c = useCloud();
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick(x => x + 1), 30000); return () => clearInterval(t); }, []);
  const [spin, setSpin] = useState(false);
  const busy = CLOUD_BUSY.has(c.phase);
  const waiting = c.pending ? `${c.pending} ${c.pending === 1 ? 'change' : 'changes'} waiting` : '';
  const tone = CLOUD_TONE[c.phase] || CLOUD_TONE.loading;
  let text = tone.text, Ico = I.cloud, color = 'text-muted-foreground';
  if (c.phase === 'synced') { Ico = I.cloudCheck; text = `Saved to cloud${c.lastSync ? ` · ${ago(c.lastSync)}` : ''}${waiting ? ` · ${waiting}` : ''}`; }
  else if (c.phase === 'offline') { Ico = I.cloudOff; text = `Offline · ${waiting || 'saved on this PC'}`; color = 'text-amber-600 dark:text-amber-400'; }
  else if (c.phase === 'error') { Ico = I.cloudOff; text = 'Not syncing · Fix'; color = 'text-destructive'; }
  else if (c.phase === 'choose') { text = 'Cloud sync needs your choice'; color = 'text-amber-600 dark:text-amber-400'; }
  else if (c.phase === 'signin') text = 'Signed out of cloud sync';
  else if (c.phase === 'off') { Ico = I.cloudOff; text = 'Cloud sync off'; }
  const canSync = c.phase === 'synced' || c.phase === 'offline' || c.phase === 'error';
  const syncNow = () => { setSpin(true); cloudSyncNow(); setTimeout(() => setSpin(false), 900); };
  return (
    <div className="group/cloud ml-1.5 flex min-w-0 items-center">
      <button type="button" onClick={onOpen} title={`${text}\nClick for cloud sync settings`} aria-label={`Cloud sync: ${text}. Open cloud sync`}
        className={cn('flex h-7 min-w-0 items-center gap-1.5 rounded-md px-2 text-[12.5px] transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', color)}>
        <Ico className={cn('size-[15px] shrink-0', busy && 'anim-cloud-sync')} />
        <span className="truncate whitespace-nowrap">{text}</span>
      </button>
      {canSync && (
        <button type="button" onClick={syncNow} aria-label="Sync now" title="Sync now"
          className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover/cloud:opacity-100">
          <I.refresh className={cn('size-3.5', spin && 'animate-spin')} />
        </button>
      )}
    </div>
  );
}

function CloudDialog({ open, onClose, prof }) {
  const [withEmail, setWithEmail] = useState(false);
  const google = () => run(async () => {
    const g = googleClient(prof);
    if (!g.clientId) throw new Error('Google sign-in isn’t set up on this PC yet. Sign in with email instead.');
    const { id_token } = await invoke('google_sign_in', { clientId: g.clientId, clientSecret: g.clientSecret });
    await cloudSignInGoogle(id_token);
  });
  const c = useCloud();
  const [url, setUrl] = useState(''); const [key, setKey] = useState('');
  const [email, setEmail] = useState(''); const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const [editProject, setEditProject] = useState(false);
  useEffect(() => { if (open) { setErr(''); setPw(''); setEditProject(false); setUrl(c.url || ''); if (!email && c.email) setEmail(c.email); } }, [open]);
  const run = async f => { setBusy(true); setErr(''); try { await f(); } catch (e) { setErr(String((e && e.message) || e)); } setBusy(false); };
  const tone = CLOUD_TONE[c.phase] || CLOUD_TONE.loading;
  const phase = editProject ? 'off' : c.phase;
  let body, footer;
  if (phase === 'off') {
    body = (
      <form id="cloud-setup" className="grid gap-4" onSubmit={e => { e.preventDefault(); run(async () => { await cloudConfigure(url, key); setEditProject(false); }); }}>
        <p className="text-sm text-muted-foreground">Keep your tasks and documents in your own free Supabase project, so every PC you sign in on has the same data and changes show up on the others within seconds. Your data stays on this PC too, so Tasks keeps working offline.</p>
        <Field label="Project URL" htmlFor="cl-url" hint="Supabase → Project Settings → Data API."><Input id="cl-url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://abcdefgh.supabase.co" autoFocus spellCheck={false} /></Field>
        <Field label="Publishable key" htmlFor="cl-key" hint="Supabase → Project Settings → API Keys. Use the publishable (anon) key, never the secret one."><Input id="cl-key" value={key} onChange={e => setKey(e.target.value)} placeholder="sb_publishable_… or eyJ…" spellCheck={false} /></Field>
        <p className="text-xs text-muted-foreground">First time? CLOUD-SETUP.md has the five steps to create the project (about 10 minutes).</p>
      </form>
    );
    footer = <>{editProject && <Button variant="outline" onClick={() => setEditProject(false)}>Cancel</Button>}<Button type="submit" form="cloud-setup" disabled={busy || !url.trim() || !key.trim()}>{busy ? 'Checking…' : 'Next'}</Button></>;
  } else if (phase === 'notinvited' || phase === 'removed') {
    body = <div className="grid gap-3 text-sm">
      <p className="font-medium">{phase === 'removed' ? 'You’re no longer on this team' : 'Hmm, we don’t know this account yet'}</p>
      <p className="text-muted-foreground">{phase === 'removed' ? 'An admin took you off the team, so this PC stopped syncing. Your tasks are still here on this PC.' : `${c.email || 'That Google account'} isn’t on your team’s invite list. Try your work account, or ask your admin to add this one.`}</p>
    </div>;
    footer = <><Button variant="outline" onClick={onClose}>Close</Button><Button onClick={google} disabled={busy}>{busy ? 'Waiting for Google…' : 'Try another Google account'}</Button></>;
  } else if (phase === 'signin' && !withEmail) {
    body = <div className="grid gap-3">
      <p className="text-sm text-muted-foreground">Sign in with the Google account your team invited, and your tasks and documents sync across every PC and teammate.</p>
      <Button className="h-10 gap-2.5" onClick={google} disabled={busy}>{!busy && <GoogleMark />}{busy ? 'Waiting for Google in your browser…' : 'Continue with Google'}</Button>
      <div className="flex justify-between gap-3">
        <button type="button" onClick={() => setWithEmail(true)} className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground">Sign in with email and password</button>
        <button type="button" onClick={() => setEditProject(true)} className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground">Use a different Supabase project</button>
      </div>
    </div>;
  } else if (phase === 'signin') {
    body = (
      <form id="cloud-signin" className="grid gap-4" onSubmit={e => { e.preventDefault(); run(() => cloudSignIn(email, pw)); }}>
        <p className="text-sm text-muted-foreground">Sign in with the email and password you set up for cloud sync. <button type="button" onClick={() => setWithEmail(false)} className="underline underline-offset-4 hover:text-foreground">Use Google instead</button></p>
        <Field label="Email" htmlFor="cl-email"><Input id="cl-email" type="email" value={email} onChange={e => setEmail(e.target.value)} autoFocus={!email} autoComplete="username" /></Field>
        <Field label="Password" htmlFor="cl-pw"><Input id="cl-pw" type="password" value={pw} onChange={e => setPw(e.target.value)} autoFocus={!!email} autoComplete="current-password" /></Field>
        <button type="button" onClick={() => setEditProject(true)} className="justify-self-start text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground">Use a different Supabase project</button>
      </form>
    );
    footer = <Button type="submit" form="cloud-signin" disabled={busy || !email.trim() || !pw}>{busy ? 'Signing in…' : 'Sign in'}</Button>;
  } else if (phase === 'choose') {
    const opt = (mode, title, text, rec) => (
      <button type="button" disabled={busy} onClick={() => run(() => cloudFirstSync(mode))}
        className="grid gap-1 rounded-lg border p-4 text-left transition-colors hover:border-foreground/30 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 ui-inset">
        <span className="flex items-center gap-2 text-sm font-medium">{title}{rec && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">Recommended for a second PC</span>}</span>
        <span className="text-sm text-muted-foreground">{text}</span>
      </button>
    );
    body = (
      <div className="grid gap-3">
        <p className="text-sm text-muted-foreground">Your cloud already has <b className="font-medium text-foreground">{c.remoteCount} tasks</b>, and this PC has <b className="font-medium text-foreground">{c.localCount}</b> of its own. What should this PC do? A backup of this PC’s data is saved in the data folder first.</p>
        {opt('replace', 'Use the cloud’s data', 'This PC shows exactly what’s in the cloud. Tasks that only exist on this PC are removed (they stay in the backup).', true)}
        {opt('combine', 'Combine both', 'Keep everything from both. Where the same task differs, the newer edit wins.')}
      </div>
    );
  } else if (phase === 'checking' || phase === 'first' || phase === 'loading' || (phase === 'connecting' && !c.lastSync)) {
    body = <div className="flex items-center gap-3 py-2 text-sm text-muted-foreground"><span className={cn('size-2 rounded-full', tone.dot)} />{phase === 'first' ? (c.mode === 'upload' ? 'Uploading this PC’s tasks and documents…' : c.mode === 'replace' ? 'Copying your cloud data to this PC…' : 'Combining this PC with your cloud…') : 'Connecting to your cloud…'}</div>;
  } else {
    const row = (k, v) => <div className="flex items-start justify-between gap-4 py-2.5 text-sm"><span className="text-muted-foreground">{k}</span><span className="min-w-0 text-right">{v}</span></div>;
    body = (
      <div className="grid gap-4">
        <div className="divide-y rounded-lg border px-4 ui-inset">
          {row('Account', <span className="truncate">{c.email || '—'}</span>)}
          {row('Status', <span className="inline-flex items-center gap-2"><span className={cn('size-2 rounded-full', tone.dot)} />{tone.text}{c.phase === 'synced' && c.lastSync ? <span className="text-muted-foreground">· {ago(c.lastSync)}</span> : null}</span>)}
          {c.pending > 0 && row('Waiting to send', `${c.pending} ${c.pending === 1 ? 'change' : 'changes'}`)}
          {row('Documents in the cloud', String(c.docs || 0))}
        </div>
        {c.phase === 'offline' && <p className="text-sm text-muted-foreground">You’re offline. Your changes are saved on this PC and sent as soon as you’re back online.</p>}
        {c.phase === 'error' && <p className="text-sm text-destructive break-words">{c.error}</p>}
        <p className="text-xs text-muted-foreground">{c.access ? 'Everyone on the team sees changes within a second or two. If two people change the same task at once, both changes are kept; if they change the same field, the newer one wins. Your timer is yours alone, and belongs to the PC that started it.' : 'Sign in with the same account on your other PCs. Changes show up there within a second or two. If the same task is changed on two PCs at once, the newer edit is kept and you’ll see a notice. A timer belongs to the PC that started it, so closing one PC never stops a timer running on another.'}</p>
      </div>
    );
    footer = <>
      <Button variant="ghost" className="sm:mr-auto text-destructive hover:text-destructive" disabled={busy} onClick={() => run(cloudSignOut)}>Sign out</Button>
      <Button variant="outline" disabled={busy} onClick={cloudSyncNow}>Sync now</Button>
      <Button onClick={onClose}>Done</Button>
    </>;
  }
  return (
    <Dialog open={open} onClose={onClose} title="Cloud sync" className="max-w-lg" footer={footer}>
      {body}
      {err && <p className="text-sm text-destructive break-words">{err}</p>}
    </Dialog>
  );
}

/* =========================================================
   Profile (0.19.13): lives in Settings › Account, with Members beside it.
   Name, photo, role, phone, status and time zone sync through the `profiles` table.
   ========================================================= */
// A status with a "clear after" time reads as Available once that time passes.
const PRESENCE = [
  { id: 'available', label: 'Available', dot: 'bg-emerald-500' },
  { id: 'busy', label: 'Busy', dot: 'bg-amber-500' },
  { id: 'dnd', label: 'Do not disturb', dot: 'bg-red-500', hint: 'Mutes alerts' },
  { id: 'away', label: 'Away', dot: 'bg-background ring-[1.5px] ring-inset ring-muted-foreground' },
];
const statusOf = u => {
  const on = !!(u && u.status && (!u.statusUntil || u.statusUntil > Date.now()));
  const s = PRESENCE.find(x => x.id === (on ? u.status : 'available')) || PRESENCE[0];
  return { ...s, note: on || (u && !u.status) ? ((u && u.statusNote) || '') : '' };
};
const CLEAR_AFTER = [
  { id: 'never', label: 'Never', until: () => null },
  { id: '1h', label: '1 h', until: () => Date.now() + 3600000 },
  { id: '4h', label: '4 h', until: () => Date.now() + 4 * 3600000 },
  { id: 'today', label: 'Today', until: () => { const d = new Date(); d.setHours(23, 59, 59, 0); return d.getTime(); } },
];
const myZone = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { return ''; } };
const zoneCity = z => (z || '').split('/').pop().replace(/_/g, ' ');
const zoneTime = z => { try { return new Date().toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', timeZone: z || undefined }); } catch (e) { return new Date().toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }); } };
// A workspace's little square: a steady color from its id.
const WS_COLORS = ['#4f46e5', '#be185d', '#0e7490', '#4d7c0f', '#b45309', '#7c3aed'];
const WsSquare = ({ w, className }) => {
  const n = [...String(w.id)].reduce((a, c) => a + c.charCodeAt(0), 0);
  return <span aria-hidden="true" className={cn('flex size-[22px] shrink-0 items-center justify-center rounded-md text-[11px] font-semibold text-white', className)} style={{ background: WS_COLORS[n % WS_COLORS.length] }}>{(w.name || '?').slice(0, 1).toUpperCase()}</span>;
};

// Your photo with your status dot on its corner.
function StatusAvatar({ u, className, dot = 'size-3' }) {
  const s = statusOf(u);
  return (
    <span className="relative inline-flex shrink-0">
      <Avatar name={u && u.name} picture={photoOf(u)} className={className} />
      <span aria-label={s.label} role="img" className={cn('absolute -bottom-px -right-px rounded-full ring-2 ring-background', dot, s.dot)} />
    </span>
  );
}

// A bordered field that saves when you leave it or press Enter (Esc puts it back).
function ProfileInput({ value, onSave, label, placeholder, type = 'text', required, id }) {
  const [v, setV] = useState(value || '');
  useEffect(() => setV(value || ''), [value]);
  const commit = () => { const t = v.trim(); if (required && !t) { setV(value || ''); return; } if (t !== (value || '')) onSave(t); };
  return <input id={id} type={type} value={v} onChange={e => setV(e.target.value)} onBlur={commit} aria-label={label} placeholder={placeholder} spellCheck={false}
    onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { e.stopPropagation(); setV(value || ''); setTimeout(() => e.target.blur()); } }}
    className="h-8 w-[230px] shrink-0 rounded-md border border-input px-2.5 text-sm transition-colors placeholder:text-muted-foreground hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ui-field" />;
}

// The status list, the note and "clear after". Used in the picker and in the avatar menu.
function StatusPanel({ u, onChange, onDone }) {
  const s = statusOf(u);
  const [note, setNote] = useState(s.note);
  useEffect(() => setNote(s.note), [s.note]);
  const saveNote = () => { const t = note.trim(); if (t !== s.note) onChange({ status: s.id, statusNote: t }); };
  const clearId = !u.statusUntil ? 'never' : null;
  return (
    <div className="grid gap-0.5">
      {PRESENCE.map(x => (
        <button key={x.id} type="button" role="menuitemradio" aria-checked={s.id === x.id}
          onClick={() => { onChange({ status: x.id, statusNote: note.trim(), statusUntil: s.id === x.id ? u.statusUntil || null : null }); onDone && onDone(); }}
          className={cn('flex h-[30px] w-full items-center gap-2 rounded-md px-2 text-left text-[13px] outline-none transition-colors hover:bg-accent focus-visible:bg-accent', s.id === x.id && 'bg-accent')}>
          <span className={cn('size-2 shrink-0 rounded-full', x.dot)} />{x.label}
          {x.hint && <span className="ml-auto text-xs text-muted-foreground">{x.hint}</span>}
          {s.id === x.id && <I.check className={cn('size-3.5', !x.hint && 'ml-auto')} />}
        </button>
      ))}
      <div className="-mx-1 my-1 h-px bg-muted" />
      <label className="px-2 pt-0.5 text-[11px] text-muted-foreground" htmlFor="status-note">Note</label>
      <input id="status-note" value={note} onChange={e => setNote(e.target.value)} onBlur={saveNote} placeholder="What are you up to?" maxLength={80}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); saveNote(); onDone && onDone(); } }}
        className="mx-1 h-[30px] rounded-md border border-input px-2 text-[13px] placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ui-field" />
      <div className="flex items-center gap-1 px-2 pb-0.5 pt-1.5 text-xs text-muted-foreground">
        <I.timer className="size-3.5 shrink-0" /><span className="mr-auto whitespace-nowrap">Clear after</span>
        {CLEAR_AFTER.map(c => {
          const on = c.id === clearId || (c.id !== 'never' && u.statusUntil && u.clearAfter === c.id);
          return <button key={c.id} type="button" aria-pressed={!!on} onClick={() => onChange({ status: s.id, statusNote: note.trim(), statusUntil: c.until(), clearAfter: c.id })}
            className={cn('h-6 whitespace-nowrap rounded-md px-1.5 text-xs transition-colors hover:bg-accent hover:text-foreground', on && 'bg-accent font-medium text-foreground')}>{c.label}</button>;
        })}
      </div>
    </div>
  );
}

// Profile › Status: a field that opens the status panel.
function StatusPicker({ u, onChange }) {
  const [open, setOpen] = useState(false);
  const a = useRef(null), p = useRef(null);
  useDismiss(open, setOpen, [a, p]);
  const s = statusOf(u);
  return (
    <>
      <button ref={a} type="button" onClick={() => setOpen(o => !o)} aria-haspopup="menu" aria-expanded={open} aria-label={`Status: ${s.label}${s.note ? `, ${s.note}` : ''}`}
        className={cn('flex h-8 w-[230px] shrink-0 items-center gap-2 rounded-md border border-input px-2.5 text-sm transition-colors hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ui-field', open && 'border-foreground/40')}>
        <span className={cn('size-2 shrink-0 rounded-full', s.dot)} /><span className="shrink-0">{s.label}</span>
        {s.note && <span className="min-w-0 truncate text-[13px] text-muted-foreground">· {s.note}</span>}
        <I.down className="ml-auto size-3.5 shrink-0 text-muted-foreground" />
      </button>
      <Floating anchorRef={a} panelRef={p} open={open} align="end" className="w-[260px] p-1">
        <div role="menu" aria-label="Status" data-picking="1"><StatusPanel u={u} onChange={onChange} onDone={() => setOpen(false)} /></div>
      </Floating>
    </>
  );
}

// What a teammate sees when they point at your photo on a task. Only your own profile is known for now.
function PersonHover({ name, children }) {
  const me = useContext(MeContext);
  const [open, setOpen] = useState(false);
  const a = useRef(null), p = useRef(null), t = useRef(null);
  useEffect(() => () => clearTimeout(t.current), []);
  if (!me || !name || norm(name) !== norm(me.name)) return children;
  const s = statusOf(me);
  const show = () => { clearTimeout(t.current); t.current = setTimeout(() => setOpen(true), 350); };
  const hide = () => { clearTimeout(t.current); setOpen(false); };
  return (
    <span ref={a} className="inline-flex" onMouseEnter={show} onMouseLeave={hide}>
      {children}
      <Floating anchorRef={a} panelRef={p} open={open} align="end" className="pointer-events-none w-[280px] rounded-lg p-3.5">
        <div className="grid gap-2.5 text-[13px]">
          <div className="flex items-center gap-3">
            <StatusAvatar u={me} className="h-10 w-10 [&_span]:text-sm" />
            <div className="min-w-0"><div className="truncate text-sm font-semibold">{me.name}</div>{me.role && <div className="truncate text-muted-foreground">{me.role}</div>}</div>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground"><span className={cn('size-2 shrink-0 rounded-full', s.dot)} /><span className="text-foreground">{s.label}</span>{s.note && <span className="truncate">· {s.note}</span>}</div>
          <div className="flex items-center gap-2 text-muted-foreground"><I.timer className="size-3.5 shrink-0" />{zoneTime(me.timeZone)} local time</div>
          {me.email && <div className="flex items-center gap-2 text-muted-foreground"><I.mail className="size-3.5 shrink-0" /><span className="truncate">{me.email}</span></div>}
        </div>
      </Floating>
    </span>
  );
}

// Reads a picked image, crops it square and shrinks it to 192 px, so it stays small enough to sync.
function squarePhoto(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error('Couldn’t read that file'));
    r.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('That file isn’t an image Tasks can read'));
      img.onload = () => {
        const n = Math.min(img.width, img.height), size = 192, c = document.createElement('canvas');
        c.width = size; c.height = size;
        c.getContext('2d').drawImage(img, (img.width - n) / 2, (img.height - n) / 2, n, n, 0, 0, size, size);
        resolve(c.toDataURL('image/jpeg', 0.85));
      };
      img.src = r.result;
    };
    r.readAsDataURL(file);
  });
}

// Settings › Profile.
function ProfilePage({ prof, workspaces, ws, onSwitchWorkspace, onManageWorkspace, onSignOut, cloud }) {
  const u = prof.data.user || {};
  const fileRef = useRef(null);
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick(x => x + 1), 30000); return () => clearInterval(t); }, []);
  const set = patch => prof.updateUser(patch);
  const pick = async e => {
    const f = e.target.files && e.target.files[0]; e.target.value = '';
    if (!f) return;
    try { set({ photo: await squarePhoto(f) }); toast('Photo updated'); } catch (err) { toast.error('Couldn’t use that photo', String(err.message || err)); }
  };
  const email = u.email || (cloud.email && !['off', 'signin', 'loading'].includes(cloud.phase) ? cloud.email : '');
  return <>
    <div className="mb-2 flex items-center gap-3.5">
      <StatusAvatar u={u} className="h-[60px] w-[60px] [&_span]:text-xl" dot="size-3.5" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[17px] font-semibold">{u.name}</div>
        <div className="truncate text-[13px] text-muted-foreground">{email || 'No email'}</div>
      </div>
      <Button variant="outline" size="sm" onClick={() => fileRef.current && fileRef.current.click()}>Change photo</Button>
      {photoOf(u) && <Button variant="ghost" size="sm" className={cn('text-muted-foreground hover:!bg-destructive/10', danger)} onClick={() => set({ photo: '' })}>Remove</Button>}
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={pick} />
    </div>
    <SRow label="Status"><StatusPicker u={u} onChange={set} /></SRow>
    <SRow label="Display name" info="Your name in the Assignee list. Tasks already assigned to your old name keep it."><ProfileInput value={u.name} onSave={v => set({ name: v })} label="Display name" required /></SRow>
    <SRow label="Role"><ProfileInput value={u.role} onSave={v => set({ role: v })} label="Role" placeholder="e.g. Designer" /></SRow>
    <SRow label="Phone" info="Saved with your profile and synced to your other PCs."><ProfileInput value={u.phone} onSave={v => set({ phone: v })} label="Phone number" type="tel" placeholder="+92 …" /></SRow>
    <SRow label="Time zone" info="Taken from this PC’s clock, so others can see your local time."><span className="w-[230px] shrink-0 truncate px-2.5 text-[13px] text-muted-foreground">{zoneCity(myZone() || u.timeZone)} · {zoneTime(myZone() || u.timeZone)}</span></SRow>
    {cloud.profileMissing && <p className="mt-1 rounded-md bg-amber-500/10 px-2.5 py-2 text-xs text-amber-700 dark:text-amber-300">Your profile is saved on this PC. To sync it, run setup.sql once more in Supabase (CLOUD-SETUP.md has the step).</p>}
    <div className="my-2 h-px bg-border" />
    <div className="flex items-center justify-between pb-1">
      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/80">Your workspaces</span>
      <button type="button" className={quietBtn} onClick={onManageWorkspace}>Manage<I.right className="size-3" /></button>
    </div>
    {workspaces.map(w => (
      <button key={w.id} type="button" onClick={() => onSwitchWorkspace(w.id)} aria-current={w.id === ws ? 'true' : undefined}
        className={cn('flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-sm transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring', w.id === ws && 'bg-accent hover:bg-accent')}>
        <WsSquare w={w} /><span className="min-w-0 flex-1 truncate">{w.name}</span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">Owner</span>
        <span className="flex w-3.5 justify-center">{w.id === ws && <I.check className="size-3.5" />}</span>
      </button>
    ))}
    <div className="my-2 h-px bg-border" />
    <SRow label={u.via === 'google' ? 'Signed in with Google' : 'Using Tasks without Google'} info="Sign out takes you back to the sign-in screen on this PC. Your tasks stay here. Cloud sync has its own sign-in, under Cloud & backups.">
      <button type="button" className={cn(quietBtn, 'hover:!bg-destructive/10', danger)} onClick={onSignOut}><I.logout className="size-3.5" />Sign out</button>
    </SRow>
  </>;
}

// Settings › Members (0.20). Everyone on the team, and the people invited who haven't signed in yet.
// The Owner and Admins invite people, change their role, access and teams, and remove them.
function MembersPage({ prof, cloud, teamsList = DEFAULT_TEAMS, rolesList = DEFAULT_ROLES }) {
  const team = useTeam();
  const u = prof.data.user || {};
  const [dlg, setDlg] = useState(null); // { kind: 'invite' } | { kind: 'member', m } | { kind: 'invite-edit', inv }
  const [removing, setRemoving] = useState(null);
  if (!team.on) {
    const email = u.email || (cloud.email && !['off', 'signin', 'loading'].includes(cloud.phase) ? cloud.email : '');
    return <>
      <h3 className="mb-1.5 flex items-center gap-2 text-[15px] font-semibold">Members<InfoTip label="About members">Your teammates show up here once cloud sync is on and your Supabase project has the teams update.</InfoTip></h3>
      <div className="flex min-h-12 items-center gap-3 rounded-md px-2 text-sm">
        <StatusAvatar u={u} className="h-[30px] w-[30px] [&_span]:text-xs" dot="size-2.5" />
        <div className="min-w-0 flex-1"><div className="truncate">{u.name} <span className="text-muted-foreground">(you)</span></div><div className="truncate text-xs text-muted-foreground">{[u.role, email].filter(Boolean).join(' · ') || 'No email'}</div></div>
        <span className="px-2 text-[13px] text-muted-foreground">Owner</span>
      </div>
    </>;
  }
  const teamsText = ids => (ids && ids.length ? (ids.length === teamsList.length ? 'All teams' : teamNames(ids, teamsList).join(', ')) : 'No team yet');
  const n = team.members.length, ni = team.invites.length;
  const canEdit = m => team.admin && m.id !== team.uid && m.access !== 'owner';
  const remove = async () => {
    const m = removing; setRemoving(null);
    try { await cloudRemoveMember(m.id); toast(`${m.name || m.email} is off the team`, 'Their tasks stay right where they are.'); }
    catch (e) { toast.error('Couldn’t remove them', e.message); }
  };
  const cancelInvite = async inv => {
    try { await cloudCancelInvite(inv.email); toast('Invite cancelled', inv.email); }
    catch (e) { toast.error('Couldn’t cancel the invite', e.message); }
  };
  return <>
    <div className="mb-3 flex items-start justify-between gap-3">
      <div>
        <h3 className="text-[15px] font-semibold">Members</h3>
        <p className="text-xs text-muted-foreground">{n} {n === 1 ? 'member' : 'members'}{ni ? ` · ${ni} invited` : ''}</p>
      </div>
      {team.admin && <Button size="sm" onClick={() => setDlg({ kind: 'invite' })}><I.plus className="size-3.5" />Invite people</Button>}
    </div>
    <div className="grid gap-0.5">
      {team.members.map(m => (
        <div key={m.id} className="group/row flex min-w-0 min-h-12 items-center gap-3 rounded-md px-2 text-sm hover:bg-muted/50">
          {m.id === team.uid ? <StatusAvatar u={u} className="h-[30px] w-[30px] [&_span]:text-xs" dot="size-2.5" /> : <Avatar name={m.name || m.email} picture={m.photo || undefined} className="h-[30px] w-[30px] [&_span]:text-xs" />}
          <div className="min-w-0 flex-1">
            <div className="truncate">{m.name || m.email || 'New teammate'}{m.id === team.uid && <span className="text-muted-foreground"> (you)</span>}</div>
            <div className="truncate text-xs text-muted-foreground">{[roleName(m.role, rolesList), m.email].filter(Boolean).join(' · ')}</div>
          </div>
          <span className="hidden max-w-32 shrink-0 truncate text-right text-xs text-muted-foreground sm:block">{teamsText(m.teams)}</span>
          <span className="w-16 text-right text-[13px] text-muted-foreground">{ACCESS_LABEL[m.access] || 'Member'}</span>
          <span className="flex w-7 justify-end">
            {canEdit(m) && <DropdownMenu align="end" trigger={p => <button {...p} type="button" aria-label={`Options for ${m.name || m.email}`} className="flex size-7 items-center justify-center rounded-md text-muted-foreground opacity-0 hover:bg-muted hover:text-foreground focus-visible:opacity-100 group-hover/row:opacity-100 aria-expanded:opacity-100"><I.more className="size-3.5" /></button>}
              items={[
                { icon: <I.pencil className="size-3.5" />, label: 'Change role, access or teams', onSelect: () => setDlg({ kind: 'member', m }) },
                'sep',
                { icon: <I.logout className="size-3.5" />, label: 'Remove from team', destructive: true, onSelect: () => setRemoving(m) },
              ]} />}
          </span>
        </div>
      ))}
    </div>
    {ni > 0 && <>
      <div className="mb-1 mt-5 text-xs text-muted-foreground">Invited, not signed in yet</div>
      <div className="grid gap-0.5">
        {team.invites.map(inv => (
          <div key={inv.email} className="group/row flex min-w-0 min-h-11 items-center gap-3 rounded-md px-2 text-sm hover:bg-muted/50">
            <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border border-dashed text-muted-foreground"><I.mail className="size-3.5" /></span>
            <div className="min-w-0 flex-1"><div className="truncate">{inv.email}</div><div className="truncate text-xs text-muted-foreground">{roleName(inv.role, rolesList) || 'No role yet'}</div></div>
            <span className="hidden max-w-32 shrink-0 truncate text-right text-xs text-muted-foreground sm:block">{teamsText(inv.teams)}</span>
            <span className="w-16 text-right text-[13px] text-muted-foreground">{ACCESS_LABEL[inv.access] || 'Member'}</span>
            <span className="flex w-7 justify-end">
              {team.admin && <DropdownMenu align="end" trigger={p => <button {...p} type="button" aria-label={`Options for ${inv.email}`} className="flex size-7 items-center justify-center rounded-md text-muted-foreground opacity-0 hover:bg-muted hover:text-foreground focus-visible:opacity-100 group-hover/row:opacity-100 aria-expanded:opacity-100"><I.more className="size-3.5" /></button>}
                items={[
                  { icon: <I.pencil className="size-3.5" />, label: 'Change role, access or teams', onSelect: () => setDlg({ kind: 'invite-edit', inv }) },
                  { icon: <I.copy className="size-3.5" />, label: 'Copy a heads-up message', onSelect: () => copyText(inviteNote(inv.email, u.name)).then(() => toast('Copied', 'Paste it in a chat or email to them.')) },
                  'sep',
                  { icon: <I.x className="size-3.5" />, label: 'Cancel invite', destructive: true, onSelect: () => cancelInvite(inv) },
                ]} />}
            </span>
          </div>
        ))}
      </div>
    </>}
    {!team.admin && <p className="mt-4 text-xs text-muted-foreground">The Owner and Admins invite people and set their roles and teams.</p>}
    <InviteDialog state={dlg} onClose={() => setDlg(null)} teamsList={teamsList} rolesList={rolesList} inviter={u.name} />
    <AlertDialog open={!!removing} title={`Remove ${removing ? (removing.name || removing.email) : ''} from the team?`}
      description="They won’t be able to sign in or see the team’s tasks anymore. Tasks they made or worked on stay put. You can invite them again anytime."
      confirmLabel="Remove" onConfirm={remove} onCancel={() => setRemoving(null)} />
  </>;
}
const copyText = t => (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject(new Error('no clipboard'))).catch(() => {});
const inviteNote = (email, from) => `Hey! ${from ? `${from} added` : 'You’re on'} you to our Taskit team. Install Taskit, click “Continue with Google” and sign in with ${email}. That’s it, you’re in.`;

// Invite people, or change someone's role, access and teams.
function InviteDialog({ state, onClose, teamsList, rolesList, inviter }) {
  const open = !!state;
  const kind = state && state.kind, cur = state && (state.m || state.inv);
  const [emails, setEmails] = useState([]); const [typed, setTyped] = useState('');
  const [role, setRole] = useState(''); const [access, setAccess] = useState('member'); const [teams, setTeams] = useState([]);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  useEffect(() => {
    if (!open) return;
    setErr(''); setTyped(''); setEmails([]);
    setRole(cur ? (rolesList.find(r => r.id === cur.role || norm(r.name) === norm(cur.role)) || {}).id || cur.role || '' : '');
    setAccess(cur ? (cur.access === 'admin' ? 'admin' : 'member') : 'member');
    setTeams(cur ? cur.teams || [] : []);
  }, [open]);
  const take = text => {
    const parts = String(text).split(/[\s,;]+/).map(x => x.trim().toLowerCase()).filter(Boolean);
    const bad = parts.filter(x => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x));
    setEmails(l => [...new Set([...l, ...parts.filter(x => !bad.includes(x))])]);
    setTyped(bad.join(', '));
    setErr(bad.length ? `${bad.length === 1 ? 'That doesn’t' : 'Those don’t'} look like an email: ${bad.join(', ')}` : '');
  };
  const save = async () => {
    setBusy(true); setErr('');
    try {
      if (kind === 'invite') {
        const list = [...emails]; if (typed.trim()) { take(typed); setBusy(false); return; }
        const failed = [];
        for (const email of list) { try { await cloudInvite({ email, access, role, teams }); } catch (e) { failed.push(`${email}: ${e.message}`); } }
        if (failed.length) { setErr(failed.join('\n')); setEmails(list.filter(e => failed.some(f => f.startsWith(e + ':')))); setBusy(false); return; }
        toast(list.length === 1 ? `${list[0]} is invited` : `${list.length} people invited`, 'Give them a quick heads-up so they know to sign in with Google.');
      } else if (kind === 'member') { await cloudUpdateMember(cur.id, { access, role, teams }); toast(`${cur.name || cur.email} is updated`); }
      else { await cloudUpdateInvite(cur.email, { access, role, teams }); toast('Invite updated', cur.email); }
      onClose();
    } catch (e) { setErr(e.message); }
    setBusy(false);
  };
  const count = kind === 'invite' ? emails.length : 1;
  const roleOptions = [{ value: '', label: 'No role' }, ...rolesList.map(r => ({ value: r.id, label: r.name, group: r.group || 'Other' }))];
  const title = kind === 'invite' ? 'Invite people' : `Update ${cur ? (cur.name || cur.email) : ''}`;
  return (
    <Dialog open={open} onClose={onClose} title={title} className="max-w-lg"
      description={kind === 'invite' ? 'They’ll sign in with Google using this email. We don’t send anything, so give them a quick heads-up.' : 'Changes show up for them right away.'}
      footer={<>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={save} disabled={busy || (kind === 'invite' && !emails.length && !typed.trim())}>
          {busy ? 'Saving…' : kind === 'invite' ? `Invite ${count > 1 ? `${count} people` : count === 1 ? '1 person' : 'people'}` : 'Save'}
        </Button>
      </>}>
      {kind === 'invite' && (
        <Field label="Emails" htmlFor="inv-emails">
          <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-input px-2 py-1.5 focus-within:ring-1 focus-within:ring-ring ui-field">
            {emails.map(e => (
              <span key={e} className="inline-flex h-6 max-w-full items-center gap-1 rounded-full bg-muted pl-2.5 pr-1 text-xs">
                <span className="truncate">{e}</span>
                <button type="button" aria-label={`Remove ${e}`} onClick={() => setEmails(l => l.filter(x => x !== e))} className={cn('flex size-4 items-center justify-center rounded-full text-muted-foreground', danger)}><I.x className="size-3" /></button>
              </span>
            ))}
            <input id="inv-emails" autoFocus value={typed} onChange={e => { const v = e.target.value; if (/[,;\s]$/.test(v)) take(v); else setTyped(v); }}
              onKeyDown={e => { if (e.key === 'Enter' && typed.trim()) { e.preventDefault(); take(typed); } if (e.key === 'Backspace' && !typed && emails.length) setEmails(l => l.slice(0, -1)); }}
              onBlur={() => typed.trim() && take(typed)} onPaste={e => { e.preventDefault(); take(typed + ' ' + e.clipboardData.getData('text')); }}
              placeholder={emails.length ? 'Add more, comma separated' : 'name@company.com, another@company.com'} className="min-w-[10rem] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
          </div>
        </Field>
      )}
      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <Field label="Role" htmlFor="inv-role"><Select id="inv-role" value={role} onChange={setRole} options={roleOptions} placeholder="Pick a role" searchable /></Field>
        <div className="grid gap-2">
          <Label>Access</Label>
          <ToggleGroup label="Access" value={access} onChange={setAccess} items={[{ value: 'member', label: 'Member' }, { value: 'admin', label: 'Admin' }]} />
        </div>
      </div>
      <p className="-mt-3 text-xs text-muted-foreground">{access === 'admin' ? 'Admins can also invite people and change statuses, buckets, automations, platforms, roles and teams.' : 'Members can add and edit any task, and delete the ones they made.'}</p>
      <div className="grid gap-2">
        <Label>Teams <span className="font-normal text-muted-foreground">· they’ll see these teams’ tasks under For me</span></Label>
        <div className="flex flex-wrap gap-1.5">
          {teamsList.map(t => {
            const on = teams.includes(t.id);
            return <button key={t.id} type="button" aria-pressed={on} onClick={() => setTeams(l => on ? l.filter(x => x !== t.id) : [...l, t.id])}
              className={cn('h-7 rounded-full border px-3 text-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring', on ? 'border-primary bg-primary text-primary-foreground' : 'border-input text-foreground hover:bg-muted')}>{t.name}</button>;
          })}
        </div>
      </div>
      {err && <p className="whitespace-pre-line break-words text-sm text-destructive">{err}</p>}
    </Dialog>
  );
}

// Settings › Roles & teams (0.20). Owner and Admins add, rename and remove; everyone else can look.
function RolesTeamsPage({ teamsList, rolesList, onSaveTeams, onSaveRoles, taskCounts = {}, onMoveTasks }) {
  const team = useTeam();
  const can = !team.on || team.admin;
  const [edit, setEdit] = useState(null); // { kind, id, name, group }
  const [del, setDel] = useState(null); // { kind, item, to }
  const people = (kind, id) => (kind === 'team' ? team.members.filter(m => (m.teams || []).includes(id)) : team.members.filter(m => m.role === id || norm(m.role) === norm((rolesList.find(r => r.id === id) || {}).name)));
  const countText = (kind, id) => {
    const p = people(kind, id).length, t = kind === 'team' ? taskCounts[id] || 0 : 0;
    return [team.on ? `${p} ${p === 1 ? 'person' : 'people'}` : '', kind === 'team' ? `${t} ${t === 1 ? 'task' : 'tasks'}` : ''].filter(Boolean).join(' · ');
  };
  const saveEdit = () => {
    const name = (edit.name || '').trim();
    if (!name) { setEdit(null); return; }
    const list = edit.kind === 'team' ? teamsList : rolesList;
    if (list.some(x => x.id !== edit.id && norm(x.name) === norm(name))) { toast.error(`There’s already a ${edit.kind} called “${name}”`); return; }
    if (edit.kind === 'team') onSaveTeams(edit.id ? teamsList.map(t => t.id === edit.id ? { ...t, name } : t) : [...teamsList, { id: 't-' + newId(), name }]);
    else onSaveRoles(edit.id ? rolesList.map(r => r.id === edit.id ? { ...r, name, group: (edit.group || '').trim() || r.group } : r) : [...rolesList, { id: 'r-' + newId(), name, group: (edit.group || '').trim() || 'Other' }]);
    setEdit(null);
  };
  const askDelete = (kind, item) => {
    const used = people(kind, item.id).length + (kind === 'team' ? taskCounts[item.id] || 0 : 0);
    if (!used) { doDelete(kind, item, ''); return; }
    setDel({ kind, item, to: '' });
  };
  const doDelete = async (kind, item, to) => {
    setDel(null);
    const failed = [];
    for (const m of people(kind, item.id)) {
      try {
        if (kind === 'team') await cloudUpdateMember(m.id, { teams: [...new Set((m.teams || []).filter(x => x !== item.id).concat(to ? [to] : []))] });
        else await cloudUpdateMember(m.id, { role: to });
      } catch (e) { failed.push(m.name || m.email); }
    }
    if (kind === 'team') { onMoveTasks(item.id, to); onSaveTeams(teamsList.filter(t => t.id !== item.id)); }
    else onSaveRoles(rolesList.filter(r => r.id !== item.id));
    toast(`${item.name} is gone`, failed.length ? `Couldn’t update ${failed.join(', ')}. Change them by hand in Members.` : to ? 'Its people and tasks moved over.' : undefined);
  };
  const row = (kind, x) => (
    <div key={x.id} className="group/row flex min-w-0 min-h-10 items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50">
      {edit && edit.kind === kind && edit.id === x.id ? (
        <form className="flex min-w-0 flex-1 items-center gap-2" onSubmit={e => { e.preventDefault(); saveEdit(); }}>
          <Input autoFocus value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })} onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); setEdit(null); } }} className="h-8" aria-label={`${kind === 'team' ? 'Team' : 'Role'} name`} />
          {kind === 'role' && <Input value={edit.group || ''} onChange={e => setEdit({ ...edit, group: e.target.value })} className="h-8 w-36" placeholder="Group" aria-label="Group" />}
          <Button size="sm" type="submit">Save</Button>
        </form>
      ) : <>
        <span className="min-w-0 flex-1">
          <span className="block truncate">{x.name}</span>
          {kind === 'role' && x.group && <span className="block truncate text-xs text-muted-foreground">{x.group}</span>}
        </span>
        <span className="relative flex shrink-0 items-center justify-end">
          <span className={cn('truncate text-right text-xs text-muted-foreground', can && 'transition-opacity group-focus-within/row:opacity-0 group-hover/row:opacity-0')}>{countText(kind, x.id)}</span>
          {can && <span className="absolute right-0 flex gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover/row:opacity-100">
            <button type="button" className={quietBtn} onClick={() => setEdit({ kind, id: x.id, name: x.name, group: x.group })}>Rename</button>
            <button type="button" className={cn(quietBtn, 'hover:!bg-destructive/10', danger)} onClick={() => askDelete(kind, x)}>Delete</button>
          </span>}
        </span>
      </>}
    </div>
  );
  const addRow = kind => edit && edit.kind === kind && !edit.id && (
    <form className="flex items-center gap-2 px-2 py-1" onSubmit={e => { e.preventDefault(); saveEdit(); }}>
      <Input autoFocus value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })} onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); setEdit(null); } }} className="h-8" placeholder={kind === 'team' ? 'Team name' : 'Role name'} aria-label={kind === 'team' ? 'Team name' : 'Role name'} />
      {kind === 'role' && <Input value={edit.group || ''} onChange={e => setEdit({ ...edit, group: e.target.value })} className="h-8 w-36" placeholder="Group" aria-label="Group" />}
      <Button size="sm" type="submit">Add</Button>
      <Button size="sm" variant="ghost" onClick={() => setEdit(null)}>Cancel</Button>
    </form>
  );
  const others = del ? (del.kind === 'team' ? teamsList : rolesList).filter(x => x.id !== del.item.id) : [];
  return <>
    <h3 className="text-[15px] font-semibold">Roles &amp; teams</h3>
    <p className="mb-4 text-xs text-muted-foreground">Shape how your team is set up. {can ? 'Only the Owner and Admins can change these, and a rename updates everyone at once.' : 'The Owner and Admins look after these.'}</p>
    <div className="mb-1 flex items-center justify-between gap-2">
      <h4 className="text-sm font-medium">Teams <span className="font-normal text-muted-foreground">· tasks are tagged with these</span></h4>
      {can && <button type="button" className={quietBtn} onClick={() => setEdit({ kind: 'team', id: null, name: '' })}><I.plus className="size-3.5" />Add team</button>}
    </div>
    <div className="mb-6 grid gap-0.5">{teamsList.map(t => row('team', t))}{addRow('team')}</div>
    <div className="mb-1 flex items-center justify-between gap-2">
      <h4 className="text-sm font-medium">Roles <span className="font-normal text-muted-foreground">· job titles, grouped</span></h4>
      {can && <button type="button" className={quietBtn} onClick={() => setEdit({ kind: 'role', id: null, name: '', group: '' })}><I.plus className="size-3.5" />Add role</button>}
    </div>
    <div className="grid gap-0.5">{rolesList.map(r => row('role', r))}{addRow('role')}</div>
    {can && <p className="mt-3 text-xs text-muted-foreground">Removing one that’s in use? We’ll ask where its people{' '}and tasks should go first, so nothing gets lost.</p>}
    <Dialog open={!!del} onClose={() => setDel(null)} title={del ? `Where should ${del.item.name}’s ${del.kind === 'team' ? 'people and tasks' : 'people'} go?` : ''} className="max-w-md"
      description={del ? (del.kind === 'team' ? `${countText('team', del.item.id)} use ${del.item.name}. Pick a team to move them to, or just drop the tag.` : `${countText('role', del.item.id)} ${people('role', del.item.id).length === 1 ? 'has' : 'have'} this role. Pick a new one for them.`) : ''}
      footer={<>
        <Button variant="outline" onClick={() => setDel(null)}>Cancel</Button>
        <Button variant="destructive" onClick={() => doDelete(del.kind, del.item, del.to)}>Delete {del ? del.item.name : ''}</Button>
      </>}>
      {del && <Field label={del.kind === 'team' ? 'Move to' : 'New role'} htmlFor="del-to">
        <Select id="del-to" value={del.to} onChange={v => setDel(d => ({ ...d, to: v }))} options={[{ value: '', label: del.kind === 'team' ? 'No team, just drop the tag' : 'No role' }, ...others.map(x => ({ value: x.id, label: x.name }))]} />
      </Field>}
    </Dialog>
  </>;
}

// The menu on your photo at the bottom of the rail.
function AccountMenu({ me, wsName, workspaces, ws, railOpen, onStatus, onProfile, onSettings, onSwitchWorkspace, onSignOut }) {
  const [open, setOpen] = useState(false), [statusOpen, setStatusOpen] = useState(false);
  const a = useRef(null), p = useRef(null);
  useDismiss(open, setOpen, [a, p]);
  useEffect(() => { if (!open) setStatusOpen(false); }, [open]);
  const s = statusOf(me);
  const item = 'flex h-[30px] w-full items-center gap-2.5 rounded-md px-2 text-left text-sm outline-none transition-colors hover:bg-accent focus-visible:bg-accent [&>svg]:size-3.5 [&>svg]:text-muted-foreground';
  const go = f => () => { setOpen(false); f(); };
  return (
    <>
      <button ref={a} type="button" aria-label="Your account" aria-haspopup="menu" aria-expanded={open} onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        className="flex w-full shrink-0 items-center gap-3 rounded-[9px] p-[5px] text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <StatusAvatar u={me} className="h-[30px] w-[30px] bg-card ring-1 ring-border" dot="size-2.5" />
        <span className={cn('min-w-0 flex-1 truncate whitespace-nowrap text-[13px] font-medium transition-opacity duration-150', railOpen ? 'opacity-100' : 'opacity-0')}>{me.name || 'Your account'}</span>
      </button>
      <Floating anchorRef={a} panelRef={p} open={open} className="w-[264px] p-1">
        <div role="menu" aria-label="Your account" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-2.5 p-2">
            <StatusAvatar u={me} className="h-[34px] w-[34px] [&_span]:text-xs" dot="size-2.5" />
            <div className="min-w-0"><div className="truncate text-sm font-semibold">{me.name}</div><div className="truncate text-xs text-muted-foreground">{[me.role, wsName].filter(Boolean).join(' · ')}</div></div>
          </div>
          <button type="button" aria-expanded={statusOpen} onClick={() => setStatusOpen(o => !o)}
            className="mx-1 mb-1 flex h-8 w-[calc(100%-8px)] items-center gap-2 rounded-md border border-input px-2 text-left text-[13px] transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ui-field">
            <span className={cn('size-2 shrink-0 rounded-full', s.dot)} />{s.label}
            {s.note && <span className="min-w-0 flex-1 truncate text-right text-xs text-muted-foreground">{s.note}</span>}
            <I.down className={cn('size-3 shrink-0 text-muted-foreground transition-transform', !s.note && 'ml-auto', statusOpen && 'rotate-180')} />
          </button>
          {statusOpen ? <div className="pb-1"><StatusPanel u={me} onChange={onStatus} onDone={() => setStatusOpen(false)} /></div> : <>
          <div className="-mx-1 my-1 h-px bg-muted" />
          <button type="button" role="menuitem" className={item} onClick={go(onProfile)}><I.user />Profile</button>
          <button type="button" role="menuitem" className={item} onClick={go(onSettings)}><I.gear />Settings</button>
          {workspaces.length > 1 && <>
            <div className="-mx-1 my-1 h-px bg-muted" />
            <div className="px-2 pb-0.5 pt-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/80">Switch workspace</div>
            {workspaces.map(w => (
              <button key={w.id} type="button" role="menuitemradio" aria-checked={w.id === ws} className={item} onClick={go(() => { if (w.id !== ws) onSwitchWorkspace(w.id); })}>
                <WsSquare w={w} className="size-[18px] rounded-[5px] text-[10px]" /><span className="min-w-0 flex-1 truncate">{w.name}</span>{w.id === ws && <I.check className="!text-foreground" />}
              </button>
            ))}
          </>}
          <div className="-mx-1 my-1 h-px bg-muted" />
          <button type="button" role="menuitem" className={cn(item, 'hover:!bg-destructive/10 hover:!text-destructive focus-visible:!bg-destructive/10 focus-visible:!text-destructive [&:hover>svg]:!text-destructive')} onClick={go(onSignOut)}><I.logout />Sign out</button>
          </>}
        </div>
      </Floating>
    </>
  );
}

const HASH = new URLSearchParams((window.location.hash || '').replace(/^#/, ''));
const STANDALONE_ID = HASH.get('task');
const STANDALONE_WS = HASH.get('ws') || 'product';
const DEFAULT_WORKSPACES = [{ id: 'product', name: 'Product' }, { id: 'marketing', name: 'Marketing' }];

// Product and Marketing (and any you add later): each has its own tasks, statuses and settings.
// The same file holds the team's teams and job roles (0.20), which are shared by every workspace.
function useWorkspaces() {
  const [doc, setDoc] = useState(null);
  const docRef = useRef(null); docRef.current = doc;
  const [active, setActive] = useState(() => { try { return STANDALONE_ID ? STANDALONE_WS : (localStorage.getItem('tasks-ws') || 'product'); } catch (e) { return 'product'; } });
  const save = n => { setDoc(n); persist('workspaces', n); };
  useEffect(() => {
    let un = () => {};
    invoke('read_store', { name: 'workspaces' }).then(raw => {
      const v = raw ? JSON.parse(raw) : null;
      if (v && Array.isArray(v.list) && v.list.length) setDoc({ version: 1, ...v });
      else save({ version: 1, ...(v || {}), list: DEFAULT_WORKSPACES });
      // A workspace, team or role added or renamed on another PC.
      un = cloudLive('workspaces', patch => {
        const cur = docRef.current || { version: 1, list: DEFAULT_WORKSPACES }, n = { ...cur };
        if (Array.isArray(patch['m/list']) && patch['m/list'].length) n.list = patch['m/list'];
        ['teams', 'roles'].forEach(f => { if (`m/${f}` in patch) { if (Array.isArray(patch[`m/${f}`])) n[f] = patch[`m/${f}`]; else delete n[f]; } });
        save(n);
      }, v);
    }).catch(() => setDoc({ version: 1, list: DEFAULT_WORKSPACES }));
    // Task windows hear about changes from the main window.
    const l = listen('tasks-workspaces', e => { if (e.payload && e.payload.from !== WINDOW_LABEL) setDoc(e.payload.doc); });
    return () => { un(); l.then(f => f()).catch(() => {}); };
  }, []);
  const update = f => { const cur = docRef.current || { version: 1, list: DEFAULT_WORKSPACES }; const n = { ...cur, ...f(cur) }; save(n); emit('tasks-workspaces', { from: WINDOW_LABEL, doc: n }).catch(() => {}); };
  const list = (doc && doc.list) || DEFAULT_WORKSPACES;
  const switchTo = id => { setActive(id); if (!STANDALONE_ID) { try { localStorage.setItem('tasks-ws', id); } catch (e) {} } };
  const rename = (id, name) => update(d => ({ list: d.list.map(w => w.id === id ? { ...w, name } : w) }));
  return {
    list, ready: !!doc, active: list.some(w => w.id === active) ? active : 'product', switchTo, rename,
    teams: (doc && Array.isArray(doc.teams)) ? doc.teams : DEFAULT_TEAMS,
    roles: (doc && Array.isArray(doc.roles)) ? doc.roles : DEFAULT_ROLES,
    saveTeams: t => update(() => ({ teams: t })), saveRoles: r => update(() => ({ roles: r })),
  };
}

export default function Root() {
  if (HASH.get('capture')) return <QuickCaptureWindow />;
  return <MainRoot />;
}

// What the cloud's profiles table holds about you (0.19.13).
const profileOf = u => (u ? { name: u.name || '', role: u.role || '', phone: u.phone || '', photo: photoOf(u) || '', status: u.status || '', statusNote: u.statusNote || '', statusUntil: u.statusUntil || null, timeZone: u.timeZone || '', editedAt: u.editedAt || 0 } : null);

/* Workspaces that aren't open (0.20.3). Their time-based automations run every minute and their archiving
   and Trash cleanup every hour, as they do for the open workspace, so a deadline in Marketing still fires
   while you work in Product. Only the main window does this. */
const sameJ = (a, b) => JSON.stringify(a) === JSON.stringify(b);
// The fields a background run changed, laid over the task as it is now (someone may have edited it meanwhile).
const replay = (base, after, cur) => {
  if (!base) return after; // a new task
  if (!cur) return null; // deleted meanwhile
  const x = { ...cur };
  new Set([...Object.keys(base), ...Object.keys(after)]).forEach(k => { if (!sameJ(base[k], after[k])) { if (after[k] === undefined) delete x[k]; else x[k] = after[k]; } });
  return x;
};
async function runBackgroundWorkspace(ws, team, house) {
  const dname = storeFor('data', ws), aname = storeFor('archive', ws);
  const d = await cloudReadStore(dname);
  if (!d) return; // not created yet, or its file can't be read
  const prefs = readPrefs();
  const rules = (Array.isArray(d.rules) ? d.rules : ws === 'product' ? DEFAULT_RULES : []).map(normalizeRule).map(ruleIn);
  const isNote = r => r.action === 'notify' && r.scope !== 'bucket';
  const mine = Array.isArray(prefs['notify-' + ws]) ? prefs['notify-' + ws] : rules.filter(isNote).map(r => ({ ...r, id: 'pn-' + r.id }));
  const runRules = team.on ? [...rules.filter(r => !isNote(r)), ...mine.map(r => ({ ...normalizeRule(r), personal: true }))] : rules;
  const stages = Array.isArray(d.stages) ? d.stages : [];
  const tasks = tasksIn(d.tasks || {});
  const eng = makeEngine({ rules: () => runRules, stages: () => stages, prefs: () => prefs, team: () => team, tasks: () => tasks });
  const { quiet, updates, made, notes } = await scanTimeRules(eng, runRules, () => tasks, prefs);
  const changed = [...quiet, ...updates, ...made];
  if (changed.length) {
    await cloudEditStore(dname, cur => {
      const now = Date.now(), curIn = tasksIn(cur.tasks || {}), n = { ...(cur.tasks || {}) };
      changed.forEach(t => { const x = replay(tasks[t.id], t, curIn[t.id]); if (x) n[t.id] = taskOut(stampTask(x, curIn[t.id], now)); });
      return { ...cur, tasks: n };
    });
    notes.forEach(queueNote);
  }
  // Archiving and the Trash: once an hour per workspace.
  const now = Date.now();
  if (now - (house[ws] || 0) < 3600e3) return;
  house[ws] = now;
  const turn = await houseTurn(ws);
  if (turn === null) house[ws] = 0; // couldn't ask: try again at the next pass
  if (!turn) return;
  const days = Number({ archiveDays: ARCHIVE_DAYS_DEFAULT, ...(d.settings || {}) }.archiveDays) || 0;
  if (days > 0) {
    const cutoff = now - days * 864e5;
    const old = Object.values(tasks).filter(t => t.status === 'done' && !t.timerStartedAt && (t.doneAt || t.updatedAt || t.createdAt || now) < cutoff).map(t => t.id);
    if (old.length) {
      const stored = await cloudReadStore(dname);
      const moving = old.map(id => stored && stored.tasks && stored.tasks[id]).filter(Boolean);
      // Into the Archive first, then out of the list, so a failure in between never loses a task.
      if (moving.length && await cloudEditStore(aname, a => ({ version: 1, ...(a || {}), archived: { ...((a || {}).archived || {}), ...Object.fromEntries(moving.map(t => [t.id, { ...t, archivedAt: now }])) }, trash: (a || {}).trash || {} })))
        await cloudEditStore(dname, cur => { const n = { ...(cur.tasks || {}) }; moving.forEach(t => delete n[t.id]); return { ...cur, tasks: n }; });
    }
  }
  const a = await cloudReadStore(aname);
  const trash = (a && a.trash) || {};
  const expired = Object.values(trash).filter(t => now - (t.deletedAt || now) > TRASH_DAYS * 864e5).map(t => t.id);
  if (!expired.length) return;
  // Documents only the purged tasks used stay in Documents as "No task", as in the open workspace.
  const d2 = (await cloudReadStore(dname)) || {};
  const rest = [...Object.values(d2.tasks || {}), ...Object.values((a && a.archived) || {}), ...Object.values(trash).filter(t => !expired.includes(t.id))];
  const free = expired.flatMap(id => trash[id].files || []).filter(f => !rest.some(t => (t.files || []).some(x => x.id === f.id)));
  if (free.length) await cloudEditStore(dname, cur => { const l = Array.isArray(cur.looseDocs) ? cur.looseDocs : []; const add = free.filter(f => !l.some(x => x.id === f.id)); return add.length ? { ...cur, looseDocs: [...l, ...add] } : null; });
  await cloudEditStore(aname, cur => { const t = { ...(cur.trash || {}) }; expired.forEach(id => delete t[id]); return { ...cur, trash: t }; });
}
function useBackgroundWorkspaces(list, active, team) {
  const ref = useRef(null); ref.current = { list, active, team };
  useEffect(() => {
    if (WINDOW_LABEL !== 'main' || STANDALONE_ID) return;
    let busy = false;
    const house = {};
    const run = async () => {
      if (busy) return;
      busy = true;
      try {
        await flushAll(); // a workspace just switched away from may still have a save waiting
        const { list: ws, active: open, team: tm } = ref.current;
        for (const w of ws) {
          if (w.id === open) continue;
          try { await runBackgroundWorkspace(w.id, tm, house); } catch (e) { logWarn('Background run failed for ' + w.id, e); }
        }
      } finally { busy = false; }
    };
    const t = setTimeout(run, 20000), i = setInterval(run, 60000);
    return () => { clearTimeout(t); clearInterval(i); };
  }, []);
}

function MainRoot() {
  const prof = useProfile();
  const wsp = useWorkspaces();
  const userRef = useRef(null);
  userRef.current = prof.data.user || null;
  meNow = userRef.current;
  // Your profile from other PCs, and yours sent up when it changes here.
  useEffect(() => cloudProfileLive(p => prof.updateUser(p, true), () => profileOf(userRef.current)), []);
  // Time zone comes from this PC's clock; it's saved when it changes (a trip, or a new PC).
  const signedInHere = !!prof.data.user;
  useEffect(() => {
    if (!signedInHere || STANDALONE_ID) return;
    const z = myZone(); let last = null;
    try { last = localStorage.getItem('tasks-zone'); } catch (e) {}
    if (z && (z !== last || !prof.data.user.timeZone)) { try { localStorage.setItem('tasks-zone', z); } catch (e) {} if (prof.data.user.timeZone !== z) prof.updateUser({ timeZone: z }, 'quiet'); }
  }, [signedInHere]);
  // Cloud sync runs in the main window only; task windows get changes from it.
  useEffect(() => {
    if (WINDOW_LABEL !== 'main') return;
    cloudStart();
    return onCloudNotice(n => {
      if (n.kind === 'conflict') queueNote({ kind: 'conflict', taskTitle: n.title, kept: n.kept });
      else toast(n.title, n.detail);
    });
  }, []);
  const [openOnLoad, setOpenOnLoad] = useState(null);
  // First run in a team (0.20): confirm your profile, then a short tour for your team.
  const team = useTeam();
  useBackgroundWorkspaces(wsp.list, wsp.active, team);
  const welcome = prof.data.user && prof.data.user.welcome;
  const [tourOpen, setTourOpen] = useState(false);
  useEffect(() => { if (welcome === 'tour' && team.on && !STANDALONE_ID) setTourOpen(true); }, [welcome, team.on]);
  const closeTour = () => { setTourOpen(false); if (welcome === 'tour') prof.updateUser({ welcome: 'done' }, true); };
  return (
    <MeContext.Provider value={prof.data.user || null}>
      {!prof.loaded ? <div className="p-8 text-sm text-muted-foreground">Loading…</div>
        : !prof.data.user ? <SignIn prof={prof} />
        : !wsp.ready ? <div className="p-8 text-sm text-muted-foreground">Loading…</div>
        : welcome === 'pending' && team.on && team.me && !STANDALONE_ID ? <Welcome prof={prof} team={team} rolesList={wsp.roles} teamsList={wsp.teams} onDone={() => {}} />
        : <App key={wsp.active} prof={prof} standaloneId={STANDALONE_ID} ws={wsp.active} workspaces={wsp.list} openOnLoad={openOnLoad}
            onRenameWorkspace={wsp.rename}
            teamsList={wsp.teams} rolesList={wsp.roles} onSaveTeams={wsp.saveTeams} onSaveRoles={wsp.saveRoles} onReplayTour={() => setTourOpen(true)}
            onSwitchWorkspace={(id, taskId) => { setOpenOnLoad(taskId || null); wsp.switchTo(id); }} />}
      {tourOpen && team.on && <TeamTour tour={tourFor(team, wsp.roles)} onClose={closeTour} />}
      <Toaster />
      <Toaster id="update" position="bottom-left" style={{ '--width': '384px' }} />
    </MeContext.Provider>
  );
}

// For the unit tests (src/automations.test.jsx) only.
export const _appTest = { closeStep, houseTurn, makeEngine, scanTimeRules, stampTask, stopT, stopAt, taskIn, taskOut, replay };
