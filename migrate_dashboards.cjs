const fs = require('fs');
const files = ['src/pages/Dashboard.jsx', 'src/pages/AdminDashboard.jsx'];
files.forEach(p => {
  if (!fs.existsSync(p)) return;
  let c = fs.readFileSync(p, 'utf8');
  
  // Only replace if not already replaced
  if (c.includes('dark:bg-slate-900')) {
      console.log('Already processed ' + p);
      return;
  }

  // Main background elements
  c = c.replace(/bg-white\/70/g, 'bg-white/70 dark:bg-slate-900/70');
  c = c.replace(/bg-white\/80/g, 'bg-white/80 dark:bg-slate-900/80');
  c = c.replace(/bg-white\/50/g, 'bg-white/50 dark:bg-slate-900/50');
  c = c.replace(/bg-white\b/g, 'bg-white dark:bg-slate-900 transition-colors');
  
  // Text colors
  c = c.replace(/text-slate-800/g, 'text-slate-800 dark:text-slate-100');
  c = c.replace(/text-slate-900/g, 'text-slate-900 dark:text-white');
  c = c.replace(/text-slate-700/g, 'text-slate-700 dark:text-slate-200');
  c = c.replace(/text-slate-600/g, 'text-slate-600 dark:text-slate-300');
  c = c.replace(/text-slate-500/g, 'text-slate-500 dark:text-slate-400');
  
  // Borders
  c = c.replace(/border-slate-100/g, 'border-slate-100 dark:border-slate-800');
  c = c.replace(/border-slate-200/g, 'border-slate-200 dark:border-slate-700');
  c = c.replace(/border-slate-300/g, 'border-slate-300 dark:border-slate-600');
  
  // Common backgrounds
  c = c.replace(/bg-slate-50\b/g, 'bg-slate-50 dark:bg-slate-800');
  c = c.replace(/bg-slate-100\b/g, 'bg-slate-100 dark:bg-slate-700');
  
  fs.writeFileSync(p, c);
  console.log('Successfully processed ' + p);
});
